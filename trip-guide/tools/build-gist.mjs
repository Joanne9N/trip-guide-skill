// 把 4 份規格書合併成一份「單檔模板」，給不想安裝 skill、想直接丟檔案給 AI 的人（放在 GitHub Gist）
// 用法：node trip-guide/tools/build-gist.mjs [輸出路徑]（預設 ./旅遊手冊網頁模板.md）
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ref = join(dirname(fileURLToPath(import.meta.url)), "..", "references");
const body = f => readFileSync(join(ref, f), "utf8").trim().split("\n").slice(1).join("\n").trim(); // 去掉原本的大標
const out = process.argv[2] || "旅遊手冊網頁模板.md";
const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });

const head = `# 🧳 旅遊手冊網頁模板（v3）

> 版本：${today}（v3：6 種風格、個人輕量版、團體版、領隊版通用模板）
> 適用：1–40 人的旅行（自己或情侶出遊、朋友、家族、公司旅遊，也適用領隊／導遊帶團）
>
> 🆕 **最新版、現成模板都在 GitHub**：https://github.com/Joanne9N/trip-guide-skill
> 🎨 **先看 6 種風格長什麼樣**：https://joanne9n.github.io/trip-guide-skill/
>
> **最推薦的用法是安裝成 Claude skill**（安裝步驟見 GitHub 的 README），之後跟 Claude 說「幫我們做旅遊手冊網頁」就好。
> 這份 Gist 是給**不想安裝、想直接把一份檔案交給 AI** 的人：內容和 skill 的規格書一樣，合併成一份。

---

## 📖 這份檔案怎麼用

1. 把整份檔案交給 AI 寫程式工具（例如 Claude Code），並貼上這段指令：

   > 請依照這份規格書幫我做一個旅遊手冊網頁。先照「給 AI 的開場規則」問我問題，再輸出簡要計畫讓我確認，然後才開始做。

2. AI 會問你：要哪個版本、哪種風格、行程資料（可以丟行程表、截圖，或照 Part C「第三部分」的資料表填）
3. 需要你親自按的授權（註冊、登入、設定密碼），AI 會停下來請你操作
4. 拿到網址丟到群組，請大家「加到手機主畫面」
5. 卡住了：先查 Part C、Part D 最後的錯誤訊息對照表

💰 **全部免費**：輕量版放 GitHub Pages；團體版、領隊版放 Cloudflare 免費方案（不用買網域、不用伺服器、不用綁信用卡）。

## 🤖 給 AI 的開場規則（讀到這份檔案時請先照做）

1. **先拿現成模板，不要從零寫**：\`git clone https://github.com/Joanne9N/trip-guide-skill.git\`，模板在 \`trip-guide/assets/\`（\`lite/\` 輕量版、\`group/\` 團體版、\`leader/\` 領隊後台、\`themes/\` 風格、\`functions/\` 雲端 API）。換旅程只改每個 \`index.html\` 開頭的設定區
2. **問版本**：
   - 🌿 **個人輕量版**：1–4 人，不需要一起記帳（看 Part A）
   - 👥 **團體基本版**：5–20 人，大家一起記帳分帳、分房、推薦、留言（看 Part C）
   - 🧭 **進階領隊版**：領隊／導遊帶團，要拍收據、匯出結算 Excel（看 Part C＋Part D）。不確定就先做團體版，**之後隨時可以補建**（Part D 的 9-0）
3. **問風格**：6 選 1（看 Part B），附上預覽網址讓使用者自己看
4. 先輸出簡要計畫（版本、風格、有哪些區塊），等使用者確認再動手
5. 標 👤 的步驟一定要停下來，請使用者本人操作（註冊、登入授權、設定密碼），**不要叫使用者把密碼貼在對話裡**
6. **不能有額外費用**：只用免費方案，不要改接會計費的 AI 服務

> 內文提到 \`spec-lite.md\`、\`styles.md\`、\`spec.md\`、\`spec-leader.md\` 時，分別就是這份的 Part A、B、C、D。

---
`;
const parts = [
  ["# 🌿 Part A｜個人輕量版（spec-lite.md）", "spec-lite.md"],
  ["# 🎨 Part B｜6 種風格（styles.md）", "styles.md"],
  ["# 👥 Part C｜團體基本版（spec.md，主規格）", "spec.md"],
  ["# 🧭 Part D｜進階領隊版（spec-leader.md，只有領隊帶團才需要）", "spec-leader.md"],
];
const md = head + "\n" + parts.map(([t, f]) => `${t}\n\n${body(f)}`).join("\n\n---\n\n")
  + "\n\n---\n\n*整理自 2026/10 曼谷 13 人朋友團實際用過的旅遊手冊網頁。授權 CC BY-NC 4.0：可以免費使用、修改、分享，請註明出處，不能拿去販售。製作：@9n.flowlab*\n";
writeFileSync(out, md);
console.log(`已產生 ${out}（${Buffer.byteLength(md)} bytes）`);
