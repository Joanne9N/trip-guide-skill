// 登入：POST {password} → 發 7 天通行證 Cookie；同 IP 15 分鐘錯 5 次就鎖。GET 查是否登入中。DELETE 登出
import { json, makeToken, isAuthed, safeEqual, COOKIE, TTL } from "../../_lib/auth.js";

const WINDOW = 15 * 60 * 1000, MAX_FAIL = 5;
const cookie = (v, maxAge) => `${COOKIE}=${v}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;

export async function onRequestGet({ request, env }) {
  return json({ authed: await isAuthed(request, env) });
}

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_KEY) return json({ error: "伺服器還沒設定管理密碼" }, 500);
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const since = Date.now() - WINDOW;
  await env.DB.prepare("DELETE FROM login_attempts WHERE at < ?").bind(since).run();
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ?").bind(ip).first();
  if (n >= MAX_FAIL) return json({ error: "錯太多次了，請 15 分鐘後再試" }, 429);
  let data;
  try { data = await request.json(); } catch { return json({ error: "格式錯誤" }, 400); }
  if (!safeEqual(String(data.password || "").trim(), env.ADMIN_KEY)) {
    await env.DB.prepare("INSERT INTO login_attempts (ip, at) VALUES (?, ?)").bind(ip, Date.now()).run();
    return json({ error: `密碼不對（還可以試 ${MAX_FAIL - n - 1} 次）` }, 403);
  }
  await env.DB.prepare("DELETE FROM login_attempts WHERE ip = ?").bind(ip).run();
  return json({ ok: true }, 200, { "Set-Cookie": cookie(await makeToken(env), TTL / 1000) });
}

export async function onRequestDelete() {
  return json({ ok: true }, 200, { "Set-Cookie": cookie("", 0) });
}
