// 伴手禮推薦 API：GET 讀全部、POST 新增、PUT 修改、DELETE 刪除（朋友間互相信任，不需密碼）
// 分類代號由網頁的 REC_CATS 決定，這裡只檢查格式（2–12 個小寫英文字母），換旅程不用改這支
const isCat = c => /^[a-z]{2,12}$/.test(String(c || ""));
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });

// ?voter=裝置編號：一併回傳這支手機按過哪些讚
export async function onRequestGet({ request, env }) {
  const voter = new URL(request.url).searchParams.get("voter") || "";
  const { results } = await env.DB
    .prepare(`SELECT id, cat, name, en, why, warn, shops, place, author,
      (SELECT count(*) FROM rec_likes l WHERE l.rec_id = recs.id) AS likes,
      EXISTS(SELECT 1 FROM rec_likes l WHERE l.rec_id = recs.id AND l.voter = ?) AS liked
      FROM recs ORDER BY id`)
    .bind(voter)
    .all();
  return json(results.map(r => ({ ...r, shops: JSON.parse(r.shops) })));
}

// 檢查並整理送來的資料；有問題回傳錯誤訊息字串
function clean(d) {
  const t = (v, n) => String(v || "").trim().slice(0, n);
  const cat = isCat(d.cat) ? d.cat : "";
  const name = t(d.name, 40), why = t(d.why, 300), author = t(d.author, 20);
  if (!cat || !name || !author) return "名稱、分類、你的暱稱都要填喔";
  const shops = Array.isArray(d.shops) ? d.shops.map(s => t(s, 20)).filter(Boolean).slice(0, 10) : [];
  return [cat, name, t(d.en, 40), why, t(d.warn, 100), JSON.stringify(shops), t(d.place, 40), author];
}

async function body(request) {
  try { return await request.json(); } catch { return null; }
}

export async function onRequestPost({ request, env }) {
  const d = await body(request);
  if (!d) return json({ error: "格式錯誤" }, 400);
  const v = clean(d);
  if (typeof v === "string") return json({ error: v }, 400);
  await env.DB
    .prepare("INSERT INTO recs (cat, name, en, why, warn, shops, place, author, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(...v, Date.now())
    .run();
  return json({ ok: true });
}

export async function onRequestPut({ request, env }) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return json({ error: "缺少編號" }, 400);
  const d = await body(request);
  if (!d) return json({ error: "格式錯誤" }, 400);
  const v = clean(d);
  if (typeof v === "string") return json({ error: v }, 400);
  await env.DB
    .prepare("UPDATE recs SET cat = ?, name = ?, en = ?, why = ?, warn = ?, shops = ?, place = ?, author = ? WHERE id = ?")
    .bind(...v, id)
    .run();
  return json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return json({ error: "缺少編號" }, 400);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM rec_likes WHERE rec_id = ?").bind(id),
    env.DB.prepare("DELETE FROM recs WHERE id = ?").bind(id)
  ]);
  return json({ ok: true });
}
