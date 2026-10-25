// 👍 +1：同一支手機（voter）對同一個推薦按一次加讚、再按一次收回
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });

export async function onRequestPost({ request, env }) {
  let d;
  try { d = await request.json(); } catch { return json({ error: "格式錯誤" }, 400); }
  const rec = Number(d.rec), voter = String(d.voter || "").slice(0, 64);
  if (!rec || voter.length < 8) return json({ error: "資料不對" }, 400);
  const had = await env.DB.prepare("SELECT 1 FROM rec_likes WHERE rec_id = ? AND voter = ?").bind(rec, voter).first();
  if (had) await env.DB.prepare("DELETE FROM rec_likes WHERE rec_id = ? AND voter = ?").bind(rec, voter).run();
  else await env.DB.prepare("INSERT OR IGNORE INTO rec_likes (rec_id, voter, created_at) SELECT id, ?, ? FROM recs WHERE id = ?").bind(voter, Date.now(), rec).run();
  const { n } = await env.DB.prepare("SELECT count(*) AS n FROM rec_likes WHERE rec_id = ?").bind(rec).first();
  const mine = await env.DB.prepare("SELECT 1 FROM rec_likes WHERE rec_id = ? AND voter = ?").bind(rec, voter).first();
  return json({ likes: n, liked: !!mine });
}
