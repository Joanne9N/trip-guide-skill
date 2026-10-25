// ✅ 結算確認：每個人（跟結算人對帳那一筆）有沒有已付款／已退款；任何人都可以勾、再按一次取消
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT name, amount, dir, paid_at FROM settle_paid").all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  let d;
  try { d = await request.json(); } catch { return json({ error: "格式錯誤" }, 400); }
  const name = String(d.name || "").trim().slice(0, 20);
  const amount = Math.round(Number(d.amount));
  const dir = d.dir === "refund" ? "refund" : "pay";
  if (!name || !Number.isFinite(amount)) return json({ error: "資料不對" }, 400);
  if (d.paid === false) await env.DB.prepare("DELETE FROM settle_paid WHERE name = ?").bind(name).run();
  else await env.DB.prepare("INSERT OR REPLACE INTO settle_paid (name, amount, dir, paid_at) VALUES (?, ?, ?, ?)").bind(name, amount, dir, Date.now()).run();
  return json({ ok: true });
}
