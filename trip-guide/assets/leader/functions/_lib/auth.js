// 領隊後台共用工具：JSON 回應、登入通行證（HMAC 簽章 Cookie）
export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers }
  });

export const COOKIE = "lead";
export const TTL = 7 * 24 * 3600 * 1000; // 7 天

const enc = new TextEncoder();
async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/[+/=]/g, c => ({ "+": "-", "/": "_", "=": "" })[c]);
}

// 不洩漏比對時間差的字串比較
export function safeEqual(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export async function makeToken(env) {
  const exp = Date.now() + TTL;
  return exp + "." + await hmac(env.ADMIN_KEY, "lead:" + exp);
}

export async function isAuthed(request, env) {
  if (!env.ADMIN_KEY) return false;
  // 給 Claude Code 批次判讀用：header 直接帶管理密碼
  const hk = request.headers.get("X-Admin-Key");
  if (hk) return safeEqual(hk, env.ADMIN_KEY);
  const m = (request.headers.get("Cookie") || "").match(/(?:^|;\s*)lead=([^;]+)/);
  if (!m) return false;
  const [exp, sig] = m[1].split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(env.ADMIN_KEY, "lead:" + exp));
}
