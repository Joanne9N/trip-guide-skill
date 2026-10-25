// 收據：GET 列表（不含圖）、GET ?id= 回圖片本體、POST 上傳一張、PUT 改關聯、DELETE 刪除
import { json } from "../../_lib/auth.js";

const MAX = 1024 * 1024; // 前端已壓縮，超過 1MB 不收（D1 單筆上限 2MB）
const TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function onRequestGet({ request, env }) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (id) {
    const r = await env.DB.prepare("SELECT img, mime FROM receipts WHERE id = ?").bind(id).first();
    if (!r) return new Response("not found", { status: 404 });
    return new Response(new Uint8Array(r.img), { headers: { "Content-Type": r.mime, "Cache-Control": "private, max-age=86400" } });
  }
  const { results } = await env.DB.prepare(
    "SELECT id, ledger_id, mime, size, ai_status, ai_json, created_at FROM receipts ORDER BY id DESC").all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  let form; try { form = await request.formData(); } catch { return json({ error: "格式錯誤" }, 400); }
  const f = form.get("file");
  if (!f || typeof f === "string") return json({ error: "沒有收到圖片" }, 400);
  if (!TYPES.includes(f.type)) return json({ error: "只收 JPG／PNG／WebP" }, 400);
  if (f.size > MAX) return json({ error: "圖片太大（超過 1MB），請重新選一次讓網頁壓縮" }, 400);
  const ledger = Number(form.get("ledger_id")) || null;
  const manual = form.get("manual") === "1";
  const res = await env.DB.prepare(
    "INSERT INTO receipts (ledger_id, img, mime, size, ai_status, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(ledger, await f.arrayBuffer(), f.type, f.size, manual ? "skipped" : "pending", Date.now()).run();
  return json({ ok: true, id: res.meta.last_row_id });
}

export async function onRequestPut({ request, env }) {
  let d; try { d = await request.json(); } catch { return json({ error: "格式錯誤" }, 400); }
  const id = Number(d.id);
  if (!id) return json({ error: "缺少編號" }, 400);
  await env.DB.prepare("UPDATE receipts SET ledger_id = ? WHERE id = ?").bind(Number(d.ledger_id) || null, id).run();
  return json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return json({ error: "缺少編號" }, 400);
  await env.DB.prepare("DELETE FROM receipts WHERE id = ?").bind(id).run();
  return json({ ok: true });
}
