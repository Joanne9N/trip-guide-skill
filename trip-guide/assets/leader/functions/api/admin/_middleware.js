// /api/admin/* 全部要先登入（login 本身除外）
import { json, isAuthed } from "../../_lib/auth.js";

export async function onRequest(ctx) {
  const path = new URL(ctx.request.url).pathname;
  if (path === "/api/admin/login") return ctx.next();
  if (!(await isAuthed(ctx.request, ctx.env))) return json({ error: "請先登入" }, 401);
  return ctx.next();
}
