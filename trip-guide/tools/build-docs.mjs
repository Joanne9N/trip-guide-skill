// 產生 GitHub Pages 用的風格預覽網站（repo 根目錄的 docs/）
// 用法：node trip-guide/tools/build-docs.mjs（改了模板或 themes.css 後重跑一次）
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const skill = join(dirname(fileURLToPath(import.meta.url)), "..");
const docs = join(skill, "..", "docs");
mkdirSync(docs, { recursive: true });

// 預覽版：打開風格切換列；團體版放在 github.io 會自動進入示範模式（不讀寫雲端）
const preview = (src, out) => {
  let html = readFileSync(join(skill, src), "utf8");
  const before = html;
  html = html.replace('const SHOW_SWITCHER = false;', 'const SHOW_SWITCHER = true; ');
  if (html === before) throw new Error(src + " 找不到 SHOW_SWITCHER");
  // 預覽站永遠是示範模式（團體版才有這一行，輕量版沒有雲端資料）
  html = html.replace(/^const DEMO = .*$/m, "const DEMO = true; // 預覽站：一律用示範資料");
  writeFileSync(join(docs, out), html);
  console.log("已產生 docs/" + out);
};
preview("assets/lite/index.html", "lite.html");
preview("assets/group/index.html", "group.html");
copyFileSync(join(skill, "assets/themes/themes.css"), join(docs, "themes.css"));
console.log("已複製 docs/themes.css");
