// 結算設定：領款、零用金、匯率、撥款單位…（key-value）
import { json } from "../../_lib/auth.js";

export const DEFAULTS = {
  trip_name: "我們的旅程", company: "撥款單位", leader: "", guide: "",
  currency: "JPY", currency_name: "日幣",
  rate_dir: "twd_per_local",   // 畫面上怎麼講匯率：twd_per_local「1 日幣 = ? 台幣」／local_per_twd「1 台幣 = ? 當地幣」
  guide_rate: String(1 / 0.98), // 一律存「1 台幣 = ? 當地幣」
  cash_rate: String(1 / 0.95),
  advance: "0", petty_cash: "0",
  categories: "餐飲,飲料酒水,門票,交通,住宿,小費,招待,雜支"
};
const KEYS = Object.keys(DEFAULTS);

export async function readSettings(env) {
  const { results } = await env.DB.prepare("SELECT key, value FROM leader_settings").all();
  const out = { ...DEFAULTS };
  for (const r of results) if (KEYS.includes(r.key)) out[r.key] = r.value;
  return out;
}

export async function onRequestGet({ env }) {
  return json(await readSettings(env));
}

export async function onRequestPut({ request, env }) {
  let d; try { d = await request.json(); } catch { return json({ error: "格式錯誤" }, 400); }
  for (const k of ["guide_rate", "cash_rate"]) if (k in d && !(Number(d[k]) > 0)) return json({ error: "匯率要大於 0" }, 400);
  for (const k of ["advance", "petty_cash"]) if (k in d && !(Number(d[k]) >= 0)) return json({ error: "金額不能是負數" }, 400);
  const stmts = Object.entries(d).filter(([k]) => KEYS.includes(k)).map(([k, v]) =>
    env.DB.prepare("INSERT INTO leader_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .bind(k, String(v).slice(0, 300)));
  // 導遊結算匯率改了：所有「導遊匯率結台幣」且沒手改台幣的帳一起重算
  if ("guide_rate" in d) stmts.push(env.DB.prepare(
    "UPDATE leader_ledger SET rate = ?1, amount_twd = amount_local / ?1, updated_at = ?2 WHERE method = 'guide_rate' AND currency != 'TWD' AND twd_manual = 0")
    .bind(Number(d.guide_rate), Date.now()));
  if (stmts.length) await env.DB.batch(stmts);
  return json({ ok: true });
}
