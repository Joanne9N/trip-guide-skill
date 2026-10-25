// 從 index.html 抽出行程 DAYS，產生 site/days.json 給領隊後台的「Day＋行程」下拉選單用
// 行程只維護 index.html 一份，部署前自動同步（deploy.sh 會呼叫）
import { readFileSync, writeFileSync } from "node:fs";
const dir = new URL("..", import.meta.url).pathname;
const html = readFileSync(dir + "site/index.html", "utf8");
// 抓到 DAYS 後面第一個常數為止（新版接的是 VEG，舊版接的是 BOOKINGS）
const a = html.indexOf("const DAYS = ");
const b = Math.min(...["const VEG", "const BOOKINGS"].map(k => html.indexOf(k, a)).filter(i => i > 0));
if (a < 0 || b < 0) throw new Error("index.html 裡找不到 DAYS");
const DAYS = new Function(html.slice(a, b) + "\nreturn DAYS;")();
const strip = s => String(s || "").replace(/<[^>]*>/g, "").trim();
const out = DAYS.map((d, i) => ({
  day: i + 1, date: d.date, title: strip(d.title),
  items: d.items.map(it => ({ k: it.k, t: it.t || "", title: strip(it.title), place: it.place || "", group: it.group || "" }))
}));
writeFileSync(dir + "site/days.json", JSON.stringify(out));
console.log(`days.json：${out.length} 天、${out.reduce((n, d) => n + d.items.length, 0)} 段行程`);
