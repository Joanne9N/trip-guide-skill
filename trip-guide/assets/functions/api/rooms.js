// 分房清單 API：GET 讀全部分配、POST 一次設定某間房的成員（朋友間互相信任，不需密碼）
// 每個人只會在一間房：把人放進某間房時，會自動從原本的房間移走
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT name, room FROM room_assign ORDER BY room, updated_at").all();
  return json(results);
}

// { room: 3, names: ["小明", "小美"] } → 這間房就是這些人（原本在這間、但沒被選到的人會變成未分房）
export async function onRequestPost({ request, env }) {
  let d;
  try { d = await request.json(); } catch { return json({ error: "格式錯誤" }, 400); }
  const room = Number(d.room);
  if (!Number.isInteger(room) || room < 1 || room > 20) return json({ error: "房間編號不對" }, 400);
  const names = Array.isArray(d.names) ? [...new Set(d.names.map(n => String(n).trim().slice(0, 20)).filter(Boolean))].slice(0, 20) : [];
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM room_assign WHERE room = ?").bind(room),
    ...names.map((n, i) => env.DB
      .prepare("INSERT INTO room_assign (name, room, updated_at) VALUES (?, ?, ?) ON CONFLICT(name) DO UPDATE SET room = excluded.room, updated_at = excluded.updated_at")
      .bind(n, room, now + i))
  ]);
  return json({ ok: true });
}
