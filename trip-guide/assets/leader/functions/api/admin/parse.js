// 收據 AI 判讀：POST {receipt_id} → Workers AI 讀圖 → 存原始結果 → 自動建一筆「待確認」草稿帳
import { json } from "../../_lib/auth.js";
import { readSettings } from "./settings.js";

const MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";
// 免費額度保險絲：Cloudflare 每天送 10,000 neurons（台灣時間早上 8 點重置＝UTC 0 點）
// 這裡自己再設上限，保證不會超過免費額度
const DAILY_NEURON_CAP = 8000;
const DAILY_CALL_CAP = 150; // 實測一張約 35 neurons，150 張約 5,300，仍在免費額度內
const NEURONS_IN = 24545 / 1e6, NEURONS_OUT = 77273 / 1e6; // 每個 token 換算 neurons（官方價目表）
const EST_PER_CALL = 400; // 拿不到實際用量時的保守估計
const PROMPT = `You are reading a shop receipt photo for a tour leader's expense report.
Return ONLY a JSON object, no other text:
{"vendor":"shop name as printed (keep original language)","date":"YYYY-MM-DD or null","currency":"3-letter code like THB, IDR, TWD","total":number (the final amount paid, after tax/service, no thousands separators),"items":[{"name":"item","qty":number,"amount":number}],"place":"branch or address if printed, else null","confidence":"high|medium|low"}
Rules: never include credit card numbers, phone numbers or member IDs. If a value is unreadable use null. Use "low" confidence if the photo is blurry or handwritten.`;

function b64(buf) {
  const bytes = new Uint8Array(buf); let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function pickJson(out) {
  if (out && typeof out === "object") return out;
  const t = String(out || "");
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; }
}

export async function onRequestPost({ request, env }) {
  let d; try { d = await request.json(); } catch { return json({ error: "格式錯誤" }, 400); }
  const id = Number(d.receipt_id);
  const rec = await env.DB.prepare("SELECT id, img, mime, ledger_id FROM receipts WHERE id = ?").bind(id).first();
  if (!rec) return json({ error: "找不到收據" }, 404);
  if (!env.AI) return json({ error: "這個網站沒有開 AI 判讀" }, 500);

  // 今天（UTC）用了多少
  const today = new Date().toISOString().slice(0, 10);
  const use = await env.DB.prepare("SELECT calls, neurons FROM ai_usage WHERE day = ?").bind(today).first() || { calls: 0, neurons: 0 };
  if (use.calls >= DAILY_CALL_CAP || use.neurons + EST_PER_CALL > DAILY_NEURON_CAP)
    return json({ ok: false, quota: true, error: "今天的免費判讀額度用完了（台灣時間早上 8 點重置）。收據已存好，可以先手動填，或明天再按「再判讀一次」" });

  let parsed = null, raw = "", neurons = EST_PER_CALL;
  try {
    const out = await env.AI.run(MODEL, {
      messages: [{ role: "user", content: [
        { type: "text", text: PROMPT },
        { type: "image_url", image_url: { url: `data:${rec.mime};base64,${b64(rec.img)}` } }
      ] }],
      max_tokens: 700, temperature: 0
    });
    raw = typeof out.response === "string" ? out.response : JSON.stringify(out.response);
    if (out.usage?.prompt_tokens) neurons = out.usage.prompt_tokens * NEURONS_IN + (out.usage.completion_tokens || 0) * NEURONS_OUT;
    parsed = pickJson(out.response);
  } catch (e) {
    raw = "AI 呼叫失敗：" + (e.message || e);
  }

  await env.DB.prepare(
    "INSERT INTO ai_usage (day, calls, neurons) VALUES (?, 1, ?) ON CONFLICT(day) DO UPDATE SET calls = calls + 1, neurons = neurons + excluded.neurons")
    .bind(today, neurons).run();

  const total = Number(parsed?.total);
  if (!parsed || !(total > 0)) {
    await env.DB.prepare("UPDATE receipts SET ai_status = 'failed', ai_json = ? WHERE id = ?").bind(raw.slice(0, 4000), id).run();
    return json({ ok: false, error: "讀不出金額，請手動填寫", raw: raw.slice(0, 500) });
  }

  // 整理 AI 結果（只留需要的欄位，不存卡號等）
  const items = Array.isArray(parsed.items) ? parsed.items.slice(0, 30).map(i => ({
    name: String(i?.name || "").slice(0, 60), qty: Number(i?.qty) || null, amount: Number(i?.amount) || null })) : [];
  const ai = {
    vendor: String(parsed.vendor || "").slice(0, 80),
    date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.date || "") ? parsed.date : null,
    currency: /^[A-Z]{3}$/.test(String(parsed.currency || "").toUpperCase()) ? String(parsed.currency).toUpperCase() : null,
    total, items, place: parsed.place ? String(parsed.place).slice(0, 120) : null,
    confidence: ["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "medium"
  };
  await env.DB.prepare("UPDATE receipts SET ai_status = 'done', ai_json = ? WHERE id = ?").bind(JSON.stringify(ai), id).run();

  // 已經掛在某筆帳上的收據，不另外建草稿
  if (rec.ledger_id) return json({ ok: true, ai, ledger_id: rec.ledger_id });

  const set = await readSettings(env);
  const currency = ai.currency || set.currency;
  const rate = currency === "TWD" ? 1 : Number(set.cash_rate);
  // 用日期自動對到 Day
  let day = null;
  try {
    const days = await (await env.ASSETS.fetch(new URL("/days.json", request.url))).json();
    const hit = days.find(x => x.date === ai.date);
    if (hit) day = hit.day;
  } catch {}
  const content = items.map(i => i.name + (i.qty > 1 ? `×${i.qty}` : "")).filter(Boolean).join("、").slice(0, 300);
  const now = Date.now();
  const res = await env.DB.prepare(
    `INSERT INTO leader_ledger (day, item, spent_on, category, vendor, place, content, currency, amount_local, rate, amount_twd, twd_manual, payer, method, note, status, created_at, updated_at)
     VALUES (?, NULL, ?, '雜支', ?, ?, ?, ?, ?, ?, ?, 0, '', '', ?, 'draft', ?, ?)`)
    .bind(day, ai.date, ai.vendor, ai.place, content, currency, total, rate, total / rate,
          ai.confidence === "low" ? "⚠️ AI 不太確定，請仔細核對" : "", now, now).run();
  const lid = res.meta.last_row_id;
  await env.DB.prepare("UPDATE receipts SET ledger_id = ? WHERE id = ?").bind(lid, id).run();
  return json({ ok: true, ai, ledger_id: lid });
}

// 今天的免費額度用量（後台收據頁顯示用）
export async function onRequestGet({ env }) {
  const today = new Date().toISOString().slice(0, 10);
  const use = await env.DB.prepare("SELECT calls, neurons FROM ai_usage WHERE day = ?").bind(today).first() || { calls: 0, neurons: 0 };
  return json({ calls: use.calls, neurons: Math.round(use.neurons), call_cap: DAILY_CALL_CAP, neuron_cap: DAILY_NEURON_CAP, free: 10000 });
}
