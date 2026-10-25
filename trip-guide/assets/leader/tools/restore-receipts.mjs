// 還原收據照片：依「收據對照.json」把照片一張張傳回網站，並掛回原本那筆帳
// 用法：node tools/restore-receipts.mjs <封存資料夾> [--local]
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = process.argv[2], LOCAL = process.argv.includes("--local");
const PROJECT = readFileSync(join(SRC, "wrangler.toml"), "utf8").match(/^name\s*=\s*"([^"]+)"/m)[1];
const BASE = process.env.BASE_URL || (LOCAL ? "http://localhost:8788" : `https://${PROJECT}.pages.dev`);
const KEY = readFileSync(join(SRC, "admin.key"), "utf8").trim();
const list = JSON.parse(readFileSync(join(DIR, "收據對照.json"), "utf8"));
let ok = 0;
for (const r of list) {
  const fd = new FormData();
  fd.append("file", new Blob([readFileSync(join(DIR, "收據照片", r.file))], { type: r.mime }), r.file);
  if (r.ledger_id) fd.append("ledger_id", r.ledger_id);
  fd.append("manual", "1");
  const res = await fetch(BASE + "/api/admin/receipts", { method: "POST", headers: { "X-Admin-Key": KEY }, body: fd });
  if (res.ok) ok++; else console.error(`❌ ${r.file}：${res.status} ${await res.text()}`);
}
console.log(`   ✅ 收據照片還原 ${ok}／${list.length} 張`);
if (ok !== list.length) process.exit(1);
