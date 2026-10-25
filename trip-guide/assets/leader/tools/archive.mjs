#!/usr/bin/env node
/* 旅程結束一鍵封存
   用法：
     node tools/archive.mjs --dry-run   只在電腦上產生封存檔（不上傳、不改網站、不刪資料庫），先看看長什麼樣子
     node tools/archive.mjs --local     同上，但資料來自本機預覽（tools/dev.sh），測試用
     node tools/archive.mjs             正式封存：備份 → 上傳 Google Drive → 網站換成紀念版 → 輸入專案名稱確認後才刪資料庫
     node tools/archive.mjs --no-drive  正式封存但不上傳 Google Drive（沒裝 gws 的人用；封存檔留在 archive/ 資料夾，自己拖到雲端硬碟）
   每一步都會先檢查成功才往下走；任何一步失敗就停下，資料庫不會被刪。 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync, statSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { createRequire } from "node:module";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");
// 基本版（沒有領隊後台）：只備份團員資料與紀念版，跳過領隊帳本、收據、Excel
const BASIC = !existsSync(join(SRC, "functions", "api", "admin"));
let ExcelJS = null, L = null;
if (!BASIC) {
  ExcelJS = createRequire(join(SRC, "tools", "package.json"))("exceljs");
  vm.runInThisContext(readFileSync(join(SRC, "site", "leader-lib.js"), "utf8"));
  L = globalThis.LeaderLib;
}

const args = process.argv.slice(2);
const LOCAL = args.includes("--local");
const DRY = LOCAL || args.includes("--dry-run");
const NO_DRIVE = args.includes("--no-drive");

const say = (...m) => console.log(...m);
const fail = m => { console.error("\n❌ " + m + "\n（已停止，資料庫沒有被刪除）"); process.exit(1); };
const run = (cmd, a, opt = {}) => execFileSync(cmd, a, { cwd: SRC, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28, ...opt });
const wrangler = (...a) => run("npx", ["wrangler", ...a]);

/* ---------- 0. 讀設定 ---------- */
const toml = readFileSync(join(SRC, "wrangler.toml"), "utf8");
const PROJECT = toml.match(/^name\s*=\s*"([^"]+)"/m)?.[1];
const DB = toml.match(/database_name\s*=\s*"([^"]+)"/)?.[1];
const COMPAT = toml.match(/compatibility_date\s*=\s*"([^"]+)"/)?.[1] || "2026-09-01";
if (!PROJECT || !DB) fail("wrangler.toml 裡找不到專案名稱或資料庫名稱");
if (existsSync(join(SRC, "ARCHIVED.md"))) fail("這個專案已經封存過了（見 ARCHIVED.md）。要還原請用 tools/restore.sh");
const KEY = existsSync(join(SRC, "admin.key")) ? readFileSync(join(SRC, "admin.key"), "utf8").trim() : "";
if (!BASIC && !KEY) fail("找不到 admin.key（領隊密碼）");
const BASE = LOCAL ? "http://localhost:8788" : `https://${PROJECT}.pages.dev`;

say(`\n📦 旅程封存：${PROJECT}（資料庫 ${DB}）${BASIC ? "・基本版（沒有領隊後台）" : "・進階領隊版"}`);
say(DRY ? `🧪 試跑模式：只在電腦上產生檔案，不上傳、不改網站、不刪資料庫${LOCAL ? "（資料來自本機預覽）" : ""}\n` : "⚠️ 正式封存模式\n");

const api = async (path, { admin = false, raw = false } = {}) => {
  const r = await fetch(BASE + path, { headers: admin ? { "X-Admin-Key": KEY } : {} });
  if (!r.ok) fail(`讀取 ${path} 失敗（${r.status}）${r.status === 401 ? "：admin.key 跟網站上的密碼對不起來" : ""}`);
  return raw ? Buffer.from(await r.arrayBuffer()) : r.json();
};

/* ---------- 1. 讀資料 ---------- */
say("1️⃣  讀取網站資料…");
const tripTitle = (readFileSync(join(SRC, "site", "index.html"), "utf8").match(/<title>([^<]+)<\/title>/) || [])[1] || PROJECT;
const [set, ledger, receipts, days] = BASIC ? [{ trip_name: tripTitle }, [], [], []] : await Promise.all([
  api("/api/admin/settings", { admin: true }), api("/api/admin/ledger", { admin: true }),
  api("/api/admin/receipts", { admin: true }), api("/days.json")
]);
const ctx = { set, ledger, receipts, days };
const drafts = ledger.filter(r => r.status === "draft").length;
const s = BASIC ? null : L.settle(ctx);
if (!BASIC) say(`   帳本 ${ledger.length} 筆（待確認 ${drafts}）、收據 ${receipts.length} 張、結餘 ${L.fmt(s.balance)} 元`);

const rl = createInterface({ input: process.stdin, output: process.stdout });
if (drafts && !DRY) {
  const a = await rl.question(`⚠️  還有 ${drafts} 筆收據草稿沒確認，它們不會列入結算。確定要繼續封存嗎？(y/N) `);
  if (a.trim().toLowerCase() !== "y") fail("先去後台把草稿確認完再封存");
}

/* ---------- 2. 在電腦上產生封存檔 ---------- */
const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });
const OUT = join(SRC, "archive", `${today.replace(/-/g, "")}_${PROJECT}${DRY ? "_試跑" : ""}`);
mkdirSync(join(OUT, "收據照片"), { recursive: true });
say(`2️⃣  產生封存檔到 ${OUT.replace(SRC + "/", "")}/`);

let XLSX = null, nPhotos = 0;
if (!BASIC) {
// 2-1 收據照片
for (const rc of receipts) writeFileSync(join(OUT, "收據照片", L.receiptFileName(ctx, rc)), await api(`/api/admin/receipts?id=${rc.id}`, { admin: true, raw: true }));
nPhotos = readdirSync(join(OUT, "收據照片")).length;
if (nPhotos !== receipts.length) fail(`收據照片只存到 ${nPhotos}／${receipts.length} 張`);
say(`   ✅ 收據照片 ${nPhotos} 張`);

// 2-2 Excel（收據縮圖直接用原圖縮小顯示）
function jpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) return null;
    const m = buf[i + 1], len = buf.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return null;
}
const exportedAt = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false }) + "（封存）";
const wb = await L.buildWorkbook(ExcelJS, ctx, {
  exportedAt,
  thumb: async rc => {
    if (rc.mime !== "image/jpeg") return null;
    const buf = readFileSync(join(OUT, "收據照片", L.receiptFileName(ctx, rc)));
    const sz = jpegSize(buf); if (!sz) return null;
    return { buffer: buf, extension: "jpeg", width: 240, height: Math.round(sz.h * 240 / sz.w) };
  }
});
XLSX = `${set.trip_name}_領隊結算.xlsx`;
await wb.xlsx.writeFile(join(OUT, XLSX));
say(`   ✅ ${XLSX}`);
}

// 2-3 資料庫完整備份
const SQL = join(OUT, "完整備份.sql");
try { wrangler("d1", "export", DB, LOCAL ? "--local" : "--remote", "--output", SQL); }
catch (e) { fail("資料庫備份失敗：" + (e.stderr || e.message).slice(-300)); }
// 收據照片太大，放在 SQL 裡會超過資料庫單一指令長度上限而無法還原 → 照片另外存（收據照片/），SQL 只留其他資料
let sqlText = readFileSync(SQL, "utf8");
const isReceiptInsert = line => /^INSERT INTO "?receipts"?[ (]/.test(line);
const nImgRows = sqlText.split("\n").filter(isReceiptInsert).length;
if (nImgRows !== receipts.length) fail(`備份裡的收據筆數（${nImgRows}）跟網站上（${receipts.length}）不一樣`);
sqlText = sqlText.split("\n").filter(l => !isReceiptInsert(l)).join("\n");
writeFileSync(SQL, sqlText);
writeFileSync(join(OUT, "收據對照.json"), JSON.stringify(receipts.map(rc => ({
  id: rc.id, ledger_id: rc.ledger_id, file: L?.receiptFileName(ctx, rc), mime: rc.mime,
  ai_status: rc.ai_status, ai_json: rc.ai_json, created_at: rc.created_at
})), null, 1));
for (const t of BASIC ? ["expenses", "messages"] : ["leader_ledger", "receipts", "expenses", "messages"])
  if (!sqlText.includes(`CREATE TABLE`) || !sqlText.includes(t)) fail(`備份檔裡找不到資料表 ${t}，備份可能不完整`);
say(`   ✅ 完整備份.sql（${(statSync(SQL).size / 1024).toFixed(0)} KB）＋ 收據對照.json`);

// 2-4 紀念版網站：只放團員看的資料；領隊帳本、收據、領款金額都不放（紀念版是公開的，沒有密碼保護）
const SITE = join(OUT, "紀念版網站");
cpSync(join(SRC, "site"), SITE, { recursive: true, filter: p => !/wrangler\.jsonc$|leader-lib\.js$/.test(p) });
const snapshot = {
  archived_at: today,
  messages: await api("/api/messages"),
  expenses: await api("/api/expenses"),
  recs: await api("/api/recs?voter=archive"),
  rooms: await api("/api/rooms")
};
writeFileSync(join(SITE, "archive.json"), JSON.stringify(snapshot));
cpSync(join(SRC, "tools", "archive-template", "archive-mode.js"), join(SITE, "archive-mode.js"));
if (!BASIC) cpSync(join(SRC, "tools", "archive-template", "admin.html"), join(SITE, "admin.html"));
let html = readFileSync(join(SITE, "index.html"), "utf8");
if (!html.includes('<meta charset="UTF-8">')) fail("index.html 格式跟預期不同，無法加上紀念版模式");
html = html.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n<script src="/archive-mode.js"></script>');
writeFileSync(join(SITE, "index.html"), html);
const leak = readFileSync(join(SITE, "archive.json"), "utf8");
if (/amount_twd|leader_ledger|advance/.test(leak)) fail("紀念版資料裡混到領隊帳本，已停止");
say(`   ✅ 紀念版網站（留言 ${snapshot.messages.length}、團員記帳 ${snapshot.expenses.length}、推薦 ${snapshot.recs.length}）`);

// 2-5 說明檔
writeFileSync(join(OUT, "說明.txt"), [
  `${set.trip_name}　封存於 ${today}`,
  ``,
  `網站：${BASE}（已改成唯讀紀念版）`,
  ...(BASIC ? [] : [`結算：總支出 ${L.fmt(s.total)} 元、領款 ${L.fmt(s.advance)}＋零用金 ${L.fmt(s.petty)}、結餘 ${L.fmt(s.balance)} 元（${L.balanceText(ctx, s.balance)}）`]),
  ``,
  `檔案說明`,
  ...(BASIC ? [] : [`・${XLSX}：領隊結算表（結算總表、支出明細、依行程彙總、收據）`]),
  `・收據照片/：檔名開頭是 Excel「支出明細」的 No.`,
  `・完整備份.sql＋收據對照.json＋收據照片/：三個一起才是完整備份。要還原成可以編輯的網站，把整個資料夾交給 Claude，或在專案資料夾執行 tools/restore.sh <這個資料夾>`,
  `・紀念版網站/：目前線上紀念版的原始檔`
].join("\n"));

if (DRY) {
  rl.close();
  say(`\n🧪 試跑完成！檔案都在 ${OUT}\n   正式封存時會再：上傳 Google Drive → 網站換成紀念版 → 確認後刪除資料庫`);
  process.exit(0);
}

/* ---------- 3. 上傳 Google Drive ---------- */
let DRIVE = "（沒有上傳，請自己把 archive 資料夾備份到雲端硬碟）";
if (NO_DRIVE) {
  say("3️⃣  跳過 Google Drive（--no-drive）");
  const a = await rl.question(`   請先把這個資料夾複製到雲端硬碟或隨身碟：\n   ${OUT}\n   複製好了嗎？(y/N) `);
  if (a.trim().toLowerCase() !== "y") fail("請先備份封存資料夾，再重新執行");
} else {
say("3️⃣  上傳 Google Drive…");
const gws = (...a) => { const o = run("gws", a); return o ? JSON.parse(o.slice(o.indexOf("{"))) : {}; };
try { gws("drive", "about", "get", "--params", JSON.stringify({ fields: "user" })); }
catch { fail("Google Drive 還沒登入或登入過期了。請先在終端機執行：gws auth login -s drive\n   （沒有安裝 gws 的話，改用：node tools/archive.mjs --no-drive）"); }
const q = (name, parent) => `name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and '${parent}' in parents`;
function folder(name, parent = "root") {
  const found = gws("drive", "files", "list", "--params", JSON.stringify({ q: q(name, parent), fields: "files(id,name)" })).files?.[0];
  if (found) return found.id;
  return gws("drive", "files", "create", "--json", JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: [parent] })).id;
}
const upload = (file, parent) => gws("drive", "+upload", file, "--parent", parent).id;
let topId, tripId, photoId;
try {
  topId = folder("旅遊手冊封存");
  tripId = folder(`${today.slice(0, 7)} ${set.trip_name}`, topId);
  photoId = folder("收據照片", tripId);
  for (const f of [XLSX, "完整備份.sql", "收據對照.json", "說明.txt"].filter(Boolean)) if (!upload(join(OUT, f), tripId)) fail(`${f} 上傳失敗`);
  for (const f of readdirSync(join(OUT, "收據照片"))) if (!upload(join(OUT, "收據照片", f), photoId)) fail(`收據 ${f} 上傳失敗`);
} catch (e) { fail("上傳 Google Drive 失敗：" + (e.stderr || e.message).slice(-300)); }
const upCount = (gws("drive", "files", "list", "--params", JSON.stringify({ q: `'${photoId}' in parents and trashed = false`, fields: "files(id)", pageSize: 1000 })).files || []).length;
if (upCount < nPhotos) fail(`Google Drive 上只有 ${upCount}／${nPhotos} 張收據`);
DRIVE = `https://drive.google.com/drive/folders/${tripId}`;
say(`   ✅ 已上傳：${DRIVE}`);
}

/* ---------- 4. 網站換成紀念版 ---------- */
say("4️⃣  網站換成唯讀紀念版…");
const TMP = join(tmpdir(), "archive-" + Date.now());
mkdirSync(TMP);
cpSync(SITE, join(TMP, "site"), { recursive: true });
writeFileSync(join(TMP, "wrangler.toml"), `name = "${PROJECT}"\npages_build_output_dir = "./site"\ncompatibility_date = "${COMPAT}"\n`);
try { run("npx", ["wrangler", "pages", "deploy", "--branch", "main", "--commit-dirty=true"], { cwd: TMP }); }
catch (e) { fail("紀念版上線失敗：" + (e.stderr || e.message).slice(-300)); }
await new Promise(r => setTimeout(r, 5000));
// 注意：Pages 找不到檔案時會回首頁（也是 200），所以要確認真的讀到封存資料
const chk = await fetch(`${BASE}/archive.json?v=${Date.now()}`).then(r => r.json()).catch(() => null);
if (chk?.archived_at !== today) fail("紀念版上線後讀不到正確的 archive.json，請檢查網站（資料庫還沒刪）");
const chk2 = await fetch(`${BASE}/api/admin/ledger`, { headers: { "X-Admin-Key": KEY } });
if (chk2.ok && (await chk2.text()).includes("amount_twd")) fail("後台 API 還開著，紀念版可能沒有生效");
say(`   ✅ 紀念版上線：${BASE}`);

/* ---------- 5. 刪除資料庫（最後一步，一定要再確認） ---------- */
say(`\n5️⃣  最後一步：刪除線上資料庫「${DB}」，釋放免費額度（10 個上限）`);
say(NO_DRIVE ? `   備份在電腦（${OUT}）和你自己複製的那一份。` : `   備份已經在電腦（${OUT}）和 Google Drive 各一份。`);
const typed = await rl.question(`   確定要刪除的話，請輸入專案名稱「${PROJECT}」：`);
rl.close();
if (typed.trim() !== PROJECT) {
  say("\n⏸️  沒有刪除資料庫。網站已經是紀念版，資料庫還留著；之後想刪可以到 Cloudflare 後台刪，或再跑一次這個腳本。");
} else {
  try { wrangler("d1", "delete", DB, "-y"); say("   ✅ 資料庫已刪除"); }
  catch (e) { fail("刪除資料庫失敗：" + (e.stderr || e.message).slice(-300)); }
}
writeFileSync(join(SRC, "ARCHIVED.md"), `# 已封存（${today}）\n\n- 紀念版網站：${BASE}\n- Google Drive：${DRIVE}\n- 電腦備份：${OUT}\n- 資料庫 ${DB}：${typed.trim() === PROJECT ? "已刪除" : "保留中"}\n\n要還原成可以編輯的網站：\`tools/restore.sh "${OUT}"\`（Google Drive 那份下載下來也可以）\n`);
say(`\n🎉 封存完成！${NO_DRIVE ? "封存檔：" + OUT : "Google Drive：" + DRIVE}\n`);
