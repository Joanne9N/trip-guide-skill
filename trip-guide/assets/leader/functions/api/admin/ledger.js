// 領隊帳本：GET 列出（?status=draft 只看待確認）、POST 新增、PUT 修改、DELETE 刪除
import { json } from "../../_lib/auth.js";

const PAYERS = ["guide", "leader"];
const METHODS = { guide: ["guide_rate", "cash"], leader: ["card", "cash"] };
const s = (v, n) => String(v ?? "").trim().slice(0, n);
const num = v => (v === "" || v == null ? null : Number(v));

// 驗證並整理一筆帳；回傳 {row} 或 {error}
function clean(d, partialDraft) {
  const r = {
    day: num(d.day), item: num(d.item),
    spent_on: /^\d{4}-\d{2}-\d{2}$/.test(d.spent_on || "") ? d.spent_on : null,
    category: s(d.category, 20) || "雜支",
    vendor: s(d.vendor, 80), place: s(d.place, 120), content: s(d.content, 300),
    currency: s(d.currency, 3).toUpperCase() || "TWD",
    amount_local: Number(d.amount_local),
    rate: d.currency === "TWD" ? 1 : Number(d.rate),
    twd_manual: d.twd_manual ? 1 : 0,
    amount_twd: Number(d.amount_twd),
    payer: d.payer || "", method: d.method || "",
    note: s(d.note, 300),
    status: d.status === "draft" ? "draft" : "confirmed"
  };
  if (!/^[A-Z]{3}$/.test(r.currency)) return { error: "幣別格式不對" };
  if (!(r.amount_local > 0)) return { error: "金額要大於 0" };
  if (!(r.rate > 0)) return { error: "匯率要大於 0" };
  if (!r.twd_manual) r.amount_twd = r.amount_local / r.rate; // 保留小數，結算時才四捨五入
  if (!(r.amount_twd > 0)) return { error: "台幣金額不對" };
  // 草稿（AI 判讀產生）可以先缺店家、付款人；確認入帳時才嚴格檢查
  if (r.status === "confirmed" || !partialDraft) {
    if (!r.vendor) return { error: "店家要填" };
    if (!PAYERS.includes(r.payer)) return { error: "請選付款人" };
    if (!METHODS[r.payer].includes(r.method)) return { error: "付款人和付款方式對不起來" };
  }
  return { row: r };
}

const COLS = ["day", "item", "spent_on", "category", "vendor", "place", "content", "currency", "amount_local", "rate", "amount_twd", "twd_manual", "payer", "method", "note", "status"];

export async function onRequestGet({ request, env }) {
  const st = new URL(request.url).searchParams.get("status");
  const where = st === "draft" || st === "confirmed" ? "WHERE l.status = ?" : "";
  const q = env.DB.prepare(
    `SELECT l.*, (SELECT COUNT(*) FROM receipts r WHERE r.ledger_id = l.id) AS receipts,
            (SELECT GROUP_CONCAT(r.id) FROM receipts r WHERE r.ledger_id = l.id) AS receipt_ids
     FROM leader_ledger l ${where} ORDER BY COALESCE(l.day, 99), COALESCE(l.spent_on, ''), l.id`);
  const { results } = await (where ? q.bind(st) : q).all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  let d; try { d = await request.json(); } catch { return json({ error: "格式錯誤" }, 400); }
  const { row, error } = clean(d, true);
  if (error) return json({ error }, 400);
  const now = Date.now();
  const res = await env.DB.prepare(
    `INSERT INTO leader_ledger (${COLS.join(",")}, created_at, updated_at) VALUES (${COLS.map(() => "?").join(",")}, ?, ?)`)
    .bind(...COLS.map(c => row[c]), now, now).run();
  const id = res.meta.last_row_id;
  // 一起附上的收據
  for (const rid of (d.receipt_ids || []).map(Number).filter(Boolean))
    await env.DB.prepare("UPDATE receipts SET ledger_id = ? WHERE id = ?").bind(id, rid).run();
  return json({ ok: true, id });
}

export async function onRequestPut({ request, env }) {
  let d; try { d = await request.json(); } catch { return json({ error: "格式錯誤" }, 400); }
  const id = Number(d.id);
  if (!id) return json({ error: "缺少編號" }, 400);
  const { row, error } = clean(d, true);
  if (error) return json({ error }, 400);
  const res = await env.DB.prepare(
    `UPDATE leader_ledger SET ${COLS.map(c => c + " = ?").join(", ")}, updated_at = ? WHERE id = ?`)
    .bind(...COLS.map(c => row[c]), Date.now(), id).run();
  if (!res.meta.changes) return json({ error: "找不到這筆" }, 404);
  for (const rid of (d.receipt_ids || []).map(Number).filter(Boolean))
    await env.DB.prepare("UPDATE receipts SET ledger_id = ? WHERE id = ?").bind(id, rid).run();
  return json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return json({ error: "缺少編號" }, 400);
  // 收據不刪，只是解除關聯，回到收據牆
  await env.DB.prepare("UPDATE receipts SET ledger_id = NULL WHERE ledger_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM leader_ledger WHERE id = ?").bind(id).run();
  return json({ ok: true });
}
