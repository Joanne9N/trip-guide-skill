# 🌿 個人輕量版 規格書

> 適用：**一個人、情侶、2–4 人的小旅行**，不需要一起記帳、分房、留言
> 成品：**單一 `index.html`**，不用註冊 Cloudflare、不用資料庫，丟到 GitHub Pages（或任何放靜態網頁的地方）就能用

---

## 📖 怎麼用

1. 先挑風格（`styles.md`）
2. 以 `assets/lite/index.html` 為底，只改 `<script>` 開頭「✏️ 設定區」的 `THEME`、`TRIP`、`HERO_SVG`
3. 本機打開檔案或用簡單的本機預覽檢查（網址加 `?now=2027-07-17` 可以模擬旅途中某一天、`?theme=magazine` 可以臨時換風格）
4. 上線照下面「上線步驟」

## 成品有什麼

| 區塊 | 內容 |
|---|---|
| 頂端選單 | 固定在最上面：首頁／準備／航班／行程／清單／住宿，捲動時自動標示目前位置 |
| 首頁 | 手繪插圖、標題、日期、亮點數字（例：6 天／4 座城市）、出發倒數或「Day 3 / 6」、旅程簡介 |
| 🛂 出發前準備 | 簽證／入境申報的步驟卡（1→N）、費用大字小卡、官方連結、「以官網為準」 |
| ✈️ 航班 | 去程、回程卡片（機場代碼、時間、飛行時間、集合提醒） |
| 🗓️ 每日行程 | 上方日期切換（今天自動選好）、分類篩選、當天標題與交通／住宿摘要、時間軸（交通彩色標籤、「必去」、Google Maps）、旅人提醒、前一天／下一天 |
| ✅ 待辦清單 | 可打勾，**只存在自己的手機**（換手機或清除瀏覽紀錄就會不見） |
| 🛏️ 住宿 | 每間住宿的日期、入住／退房時間、地址、開地圖 |

## 設定區欄位

```js
const THEME = "picturebook";   // 6 選 1，見 styles.md
const PHOTO = "";               // 玻璃風背景照片網址（選填）
const TRIP = {
  key: "hokkaido-2027",         // 每個旅程不一樣（打勾紀錄用）
  title, short, kicker, dates, start, end, tz, tzNote,
  stats: [["6","天"], ...],     // 首頁亮點數字，建議 4 個
  intro: "一段有畫面感的旅程簡介",
  prep: { title, lead, steps:[[標題, 說明]], fees:[[大字, 小字]], note, links:[[文字, 網址]] },  // 不需要就整段刪掉
  flights: [ { dir:"去程", date, airline, no, from, fromCity, dep, to, toCity, arr, dur, note } ],
  cats: [["sight","📍 景點"], ...],   // 行程分類篩選
  days: [ { date, label, title, route, move, stay, tip,
            items:[ { k, time, cat, title, desc, tags:["train"], must:true, map:"Google 地圖搜尋字" } ] } ],
  todo: [ { k, t, note } ],      // k 固定不要改，新項目加在最後
  stays: [ { name, nights, address, checkin, checkout, map, note } ],
  credit: { text, url },         // 頁尾署名（可刪）
};
```

交通標籤可用：`walk` 步行、`train` 電車、`bus` 巴士、`car` 包車、`flight` 飛機。

## 上線步驟（GitHub Pages，免費）

> 標 👤 的步驟要使用者本人操作，AI 做到這裡要停下來說明畫面，等使用者說「好了」再繼續。

1. 👤 註冊 GitHub（免費）：https://github.com/signup
2. 👤 建一個新的 repository：https://github.com/new ，名稱例如 `hokkaido-2027`，選 **Public**（免費帳號的 Pages 需要公開 repo）
3. 👤 在 repo 頁面按「Add file → Upload files」，把 `index.html` 拖進去，按「Commit changes」
4. 👤 到 repo 的 **Settings → Pages**，Source 選「Deploy from a branch」，Branch 選 `main`、資料夾 `/ (root)`，按 Save
5. 等 1–2 分鐘，網址會是 `https://<帳號>.github.io/<repo 名稱>/`

⚠️ **GitHub Pages 是公開網頁，任何人拿到網址都看得到**。護照號碼、訂單號碼、門鎖密碼、私人電話**都不要放**。網頁已加 `noindex`，但不保證完全不被搜尋到。

有改內容時：回到 repo 點 `index.html` → 右上鉛筆圖示編輯，或重新上傳覆蓋。

## 測試清單

- [ ] 手機寬度（375px）逐區看過，沒有橫向捲動
- [ ] `?now=` 測：出發前（倒數）、旅途中（自動跳到今天）、結束後
- [ ] 行程：日期切換有彈跳、分類篩選、前一天／下一天、地圖連結
- [ ] 待辦打勾後重新整理還在
- [ ] 手機開「減少動態效果」後插圖不會動
