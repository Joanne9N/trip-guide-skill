# 🧳 trip-guide：一句話做出旅遊手冊網頁

把行程丟給 Claude，它會幫你做一個**手機優先的旅遊手冊網頁**：集合倒數、每日行程、記帳分帳、分房、推薦清單、留言板。**6 種風格任選，全部免費**。

👉 **先看長什麼樣子：[風格預覽網頁](https://joanne9n.github.io/trip-guide-skill/)**

整理自一個曼谷 13 人朋友團實際上線、旅途中天天在用的網頁。

---

## 三個版本

| 版本 | 適合 | 有什麼 | 放在哪 |
|---|---|---|---|
| 🌿 **個人輕量版** | 1–4 人 | 出發前準備、航班、每日行程、待辦清單、住宿 | GitHub Pages（免費） |
| 👥 **團體基本版** | 5–20 人，朋友／家族／公司 | 輕量版全部＋集合倒數、共用帳本、公積金、結算、分房、推薦按讚、留言板，全團同步 | Cloudflare（免費，不用綁卡） |
| 🧭 **進階領隊版** | 領隊、導遊帶團 | 團體版全部＋需登入的領隊後台：當地幣與匯率、收據拍照 AI 判讀、一鍵匯出 Excel 結算表 | Cloudflare（免費） |

## 6 種風格

| | 風格 | 適合 |
|---|---|---|
| 🎨 | 日系繪本風 | 親子、閨蜜、日韓 |
| 🌴 | 熱帶活潑風 | 東南亞、海島 |
| 📒 | 手帳剪貼簿風 | 朋友出遊、畢業旅行 |
| 🎫 | 復古登機證風 | 出國、蜜月 |
| 🫧 | 液態玻璃風 | 海島、極光、雪景 |
| 📰 | 雜誌編輯風 | 質感旅行、長輩團 |

---

## 開始前準備

> AI 不能代替你註冊帳號、輸入密碼或按授權。下面標 👤 的步驟要你自己來。

### 需要的帳號

| 帳號 | 哪個版本要 | 用來做什麼 | 費用 |
|---|---|---|---|
| **Claude**（要能用 Claude Code） | 全部 | 讓 AI 幫你做網頁、上傳 | Claude Code 要 **Pro 以上付費方案** |
| **Cloudflare** | 團體版、領隊版 | 放網站和資料庫 | 免費，**不用綁信用卡** |
| **GitHub** | 輕量版（放網頁用） | GitHub Pages 放網頁 | 免費 |

- 👤 註冊 Cloudflare：https://dash.cloudflare.com/sign-up
- 👤 註冊 GitHub：https://github.com/signup

### 電腦要裝的軟體

打開「終端機」（Mac：按 `⌘ + 空白鍵` 搜尋「終端機」）輸入指令確認：

| 軟體 | 確認指令 | 看到什麼代表 OK | 沒有的話 |
|---|---|---|---|
| **Claude Code** | `claude --version` | 版本號 | 最簡單是用 [Claude 桌面版](https://claude.com/download) 的 Code 分頁，不用另外裝 |
| **Git** | `git --version` | 版本號 | Mac 會跳出「安裝開發者工具」，按「安裝」 |
| **Node.js**（20 版以上，團體版和領隊版要） | `node -v` | `v20.x.x` 以上 | 到 https://nodejs.org 下載 LTS 版安裝 |

💡 Cloudflare 的上傳工具 `wrangler` 不用自己裝，第一次用的時候會自動下載。

---

## 安裝

### 方法一：請 Claude 幫你裝（最簡單，不用開終端機）

1. 下載 [Claude 桌面版](https://claude.com/download)，登入後點上方的 **Code** 分頁
2. 把下面這段話整段貼給它：

   > 請幫我安裝這個 skill：https://github.com/Joanne9N/trip-guide-skill ，照 README 的說明把 trip-guide 資料夾裝到 ~/.claude/skills/

3. 它要執行指令時會問你「要允許嗎？」，開頭是 `git`、`mkdir`、`cp` 的就按允許
4. 裝好後**開一個新的對話**，skill 才會出現

> 💳 Code 分頁要 **Claude Pro 以上的付費方案**，免費方案沒有。
> 只有網頁版 claude.ai 的話：團體版、領隊版要在你的電腦上執行上傳指令，網頁版做不到；只做個人輕量版的話，可以試著把 `trip-guide` 資料夾壓成 zip，到網頁版左邊 **Customize → Skills** 上傳；做出來的網頁檔要自己傳到 GitHub Pages。

### 方法二：自己在終端機貼指令

在終端機貼上這兩行：

```bash
git clone https://github.com/Joanne9N/trip-guide-skill.git
```

```bash
mkdir -p ~/.claude/skills && cp -R trip-guide-skill/trip-guide ~/.claude/skills/
```

裝好後**重新開一個 Claude Code**，skill 才會出現。

### 之後要更新到新版

跟 Claude 說「幫我把 trip-guide skill 更新到 GitHub 最新版」就好。自己來的話：進到 `trip-guide-skill` 資料夾執行 `git pull`，再跑一次上面第二行。

## 使用

跟 Claude 說你要做什麼就好，例如：

> 幫我們做一個旅遊手冊網頁，7 月去北海道 6 天，一家 8 個人，要可以一起記帳。

它會依序：

1. 問你要哪個版本、哪種風格（可以先看[預覽網頁](https://joanne9n.github.io/trip-guide-skill/)）
2. 請你提供行程資料（丟行程表、截圖、或直接講都可以；缺的它會問）
3. **先列計畫給你確認**，確認後才動手
4. 在你的電腦上做好網頁，用手機尺寸逐頁檢查
5. 帶你上線，最後給你網址和一段可以直接貼到群組的訊息

---

## 過程中會跳出的授權畫面（照著按就好）

| 什麼時候 | 你會看到 | 怎麼做 | 注意 |
|---|---|---|---|
| **AI 要執行指令時** | Claude Code 問「要允許執行這個指令嗎？」 | 開頭是 `npx wrangler`、`node`、`git`、`curl`、`./deploy.sh`、`tools/` 就允許 | 看到 `sudo`、`rm -rf`，或要你輸入電腦密碼的，**先停下來問 AI 為什麼** |
| **AI 第一次讀寫資料夾** | Mac 跳出「終端機想要取用『文件』檔案夾內的檔案」 | 按「好」 | 不小心拒絕：系統設定 → 隱私權與安全性 → 檔案與檔案夾 → 打開「終端機」 |
| 👤 **登入 Cloudflare**（團體版、領隊版） | 瀏覽器開啟授權頁，列出 Pages、D1 等權限 | **先確認網址是 `dash.cloudflare.com`**，再按「Allow」 | 瀏覽器沒自動打開：把終端機裡的網址貼到瀏覽器；大約一個月後會過期，到時再登入一次 |
| 👤 **設定管理／領隊密碼** | AI 問你「要自己設密碼，還是隨機產生一組？」 | 自己設的話，AI 會在終端機開輸入畫面，**輸入時畫面不會顯示字，這是正常的** | ⚠️ **不要把密碼打在 AI 對話框裡** |
| 👤 **開啟 GitHub Pages**（輕量版） | repo 的 Settings → Pages | Source 選「Deploy from a branch」、Branch 選 `main`，按 Save | 免費帳號的 Pages 要用 Public repo，**網頁任何人拿到網址都看得到** |
| **加到手機主畫面** | — | iPhone Safari：分享 → 加入主畫面；Android Chrome：右上 ⋮ → 加到主畫面 | iPhone 要用 Safari 開，LINE 內建瀏覽器不行 |

## 絕對不要做的事

- ❌ 不要把 Cloudflare 密碼、管理密碼、任何金鑰**貼在 AI 對話裡**
- ❌ 不要把專案裡的 `admin.key`、`.dev.vars` 上傳到 GitHub 或傳給別人
- ❌ 不要把**護照號碼、保單號碼、門鎖密碼**放進網頁
- ❌ 不要升級 Cloudflare 付費方案（免費方案就夠，用量超過只會暫停，不會收費）
- ❌ 不要讓 AI 幫你註冊帳號或代按授權按鈕

---

## 卡住了？錯誤訊息對照表

| 看到的訊息 | 原因 | 怎麼解決 |
|---|---|---|
| 跟 Claude 說了，它卻沒有用這個 skill | 裝完沒重開，或資料夾放錯位置 | 確認有 `~/.claude/skills/trip-guide/SKILL.md` 這個檔案，再重開 Claude Code；也可以直接說「用 trip-guide skill」 |
| `command not found: node` | 沒裝 Node.js | 到 https://nodejs.org 下載 LTS 版 |
| `Authentication error [code: 10000]`、`Not logged in` | Cloudflare 登入過期 | 👤 請 AI 重跑 `npx wrangler login`，重新按 Allow |
| `could not register workers.dev subdomain` | 新帳號還沒有 workers.dev 子網域 | 建網站的指令加 `--force`（AI 知道怎麼做） |
| 留言板／後台「密碼不對」 | 密碼跟網站上的不一致，或改完還沒重新部署 | 請 AI 重開設定密碼的畫面，設完會自動重新部署 |
| 網頁改了，手機看到的還是舊的 | 瀏覽器快取 | 網址後面加 `?v=2` 重新開，或關掉分頁再開 |
| GitHub Pages 網址打開是 404 | 剛開啟要等 1–2 分鐘，或檔名不是 `index.html` | 等一下再開；確認上傳的檔案叫 `index.html` |
| `Error 1027` | 當天免費請求次數用完（一般旅行團很難用到） | 等台灣時間早上 8 點自動恢復 |

更多細節在 skill 裡的規格書：`trip-guide/references/`（spec-lite.md、spec.md、spec-leader.md、styles.md）。

---

## 資料夾內容

```
trip-guide-skill/
├── README.md        # 這份說明
├── LICENSE          # 授權
├── docs/            # 風格預覽網頁（GitHub Pages）
└── trip-guide/      # ← skill 本體，複製到 ~/.claude/skills/
    ├── SKILL.md
    ├── references/  # 規格書與風格卡
    ├── assets/      # 三個版本的網頁模板、雲端 API、領隊後台
    └── tools/       # 同步風格、產生預覽網頁的小工具
```

## 授權

[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/deed.zh-hant)：可以免費使用、修改、分享，**請註明出處**，**不能拿去販售**（包括包裝成付費課程、模板或代做服務的主要內容）。想商業合作請聯絡 [@9n.flowlab](https://www.instagram.com/9n.flowlab/)。

做出來的旅遊網頁是你自己的，要怎麼分享給團員都可以。
