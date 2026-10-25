// 把 assets/themes/themes.css 同步進各版本網頁的 THEMES 區塊
// 用法：node tools/sync-themes.mjs [其他 html 路徑...]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "assets/themes/themes.css"), "utf8").trim();
const START = /\/\* ===== THEMES START[^\n]*\*\//, END = "/* ===== THEMES END ===== */";
const targets = process.argv.length > 2 ? process.argv.slice(2) : ["assets/lite/index.html", "assets/group/index.html", "assets/leader/site/admin.html"].map(p => join(root, p));

for (const file of targets) {
  if (!existsSync(file)) { console.log("略過（找不到）", file); continue; }
  const html = readFileSync(file, "utf8");
  const m = html.match(START), e = html.indexOf(END);
  if (!m || e < 0) { console.log("略過（沒有 THEMES 標記）", file); continue; }
  const out = html.slice(0, m.index + m[0].length) + "\n" + css + "\n" + html.slice(e);
  if (out !== html) { writeFileSync(file, out); console.log("已同步", file); } else console.log("沒有變動", file);
}
