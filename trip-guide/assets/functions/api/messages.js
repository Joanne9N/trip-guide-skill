// 留言板 API：GET 讀留言、POST 新增留言、DELETE 刪留言（需管理密碼）
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });

export async function onRequestGet({ env }) {
  const { results } = await env.DB
    .prepare("SELECT id, name, body, created_at FROM messages ORDER BY id DESC LIMIT 300")
    .all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  let data;
  try { data = await request.json(); } catch { return json({ error: "格式錯誤" }, 400); }
  if (data.website) return json({ ok: true }); // 防機器人：隱藏欄位有值就假裝成功
  const name = String(data.name || "").trim().slice(0, 20);
  const body = String(data.body || "").trim().slice(0, 500);
  if (!name || !body) return json({ error: "暱稱和留言都要填喔" }, 400);
  await env.DB
    .prepare("INSERT INTO messages (name, body, created_at) VALUES (?, ?, ?)")
    .bind(name, body, Date.now())
    .run();
  return json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  if (!env.ADMIN_KEY || request.headers.get("X-Admin-Key") !== env.ADMIN_KEY)
    return json({ error: "管理密碼不對" }, 403);
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return json({ error: "缺少留言編號" }, 400);
  await env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(id).run();
  return json({ ok: true });
}
