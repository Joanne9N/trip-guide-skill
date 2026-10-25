// 記帳 API：GET 讀全部花費、POST 新增一筆、PUT 修改一筆、DELETE 刪除一筆（朋友間互相信任，不需密碼）
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });

export async function onRequestGet({ env }) {
  const { results } = await env.DB
    .prepare("SELECT id, day, item, title, amount, currency, payer, split, created_at FROM expenses ORDER BY id")
    .all();
  return json(results.map(r => ({ ...r, split: JSON.parse(r.split) })));
}

// 檢查並整理送來的資料；有問題回傳錯誤訊息字串
function clean(d) {
  const day = Number(d.day), item = Number(d.item), amount = Number(d.amount);
  const title = String(d.title || "").trim().slice(0, 40);
  const payer = String(d.payer || "").trim().slice(0, 20);
  // TWD＝台幣；其他一律當作「當地貨幣」（舊資料的 THB 也算當地貨幣）
  const currency = d.currency === "TWD" ? "TWD" : "LOC";
  const split = Array.isArray(d.split) ? d.split.map(s => String(s).slice(0, 20)).slice(0, 30) : [];
  if (!Number.isInteger(day) || day < 0 || day > 9 || !Number.isInteger(item)) return "行程資料不對";
  if (!title || !payer || !(amount > 0) || amount > 10000000 || !split.length)
    return "項目、金額、付款人、分帳的人都要填喔";
  return [day, item, title, Math.round(amount * 100) / 100, currency, payer, JSON.stringify(split)];
}

export async function onRequestPost({ request, env }) {
  let d;
  try { d = await request.json(); } catch { return json({ error: "格式錯誤" }, 400); }
  const v = clean(d);
  if (typeof v === "string") return json({ error: v }, 400);
  await env.DB
    .prepare("INSERT INTO expenses (day, item, title, amount, currency, payer, split, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(...v, Date.now())
    .run();
  return json({ ok: true });
}

export async function onRequestPut({ request, env }) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return json({ error: "缺少編號" }, 400);
  let d;
  try { d = await request.json(); } catch { return json({ error: "格式錯誤" }, 400); }
  const v = clean(d);
  if (typeof v === "string") return json({ error: v }, 400);
  await env.DB
    .prepare("UPDATE expenses SET day = ?, item = ?, title = ?, amount = ?, currency = ?, payer = ?, split = ? WHERE id = ?")
    .bind(...v, id)
    .run();
  return json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return json({ error: "缺少編號" }, 400);
  await env.DB.prepare("DELETE FROM expenses WHERE id = ?").bind(id).run();
  return json({ ok: true });
}
