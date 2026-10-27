# 🧭 團體旅遊手冊網頁 — 進階領隊版 規格書（加購包）

> 適用：**領隊／導遊帶團**（旅行社團、公司旅遊、獎勵旅遊、包團），團員 5–40 人
>
> **進階版 = 基本版全部功能（團員看的前台）＋ 🔐 領隊後台**。這份只寫「比基本版多的部分」，
> **請先讀完 `spec.md`（基本版）再讀這份**；兩份衝突時，以這份為準。
>
> 領隊後台只有登入的人才看得到、才能呼叫：
> 1. **領隊帳本**：每筆支出記當地幣、自填匯率、台幣，付款人（當地導遊／台灣領隊）、付款方式（導遊匯率結台幣／刷卡／現金）
> 2. **收據上傳＋自動判讀**：手機拍照上傳，AI 讀出店家、日期、金額、品項，產生「待確認」草稿，領隊逐筆確認寫入
> 3. **一鍵匯出 Excel 結算表**：行程、花費、店家、地點、內容、當地幣、台幣、總計、領隊領款、零用金、結餘

---

## 📖 這份檔案怎麼用

1. 前台（團員看的網頁）照 `spec.md` 做，用 `assets/group/index.html` 當底，並把設定區的 `TRIP.admin` 改成 `true`（頁尾會出現「🧭 領隊後台」入口）
2. 後台直接用 `assets/leader/` 的現成檔案（admin.html、leader-lib.js、functions、tools、schema.sql），換旅程時只要改：`functions/api/admin/settings.js` 的 `DEFAULTS`、`wrangler.toml`、`admin.html` 開頭的 `THEME`（建議跟前台一樣）
3. 填 `spec.md` 第三部分＋這份的 3-16「領隊後台設定」
4. 上線照這份的第五部分（比基本版多了 AI 判讀和領隊密碼）
5. 旅程結束、帳都對完後，照第十部分封存
6. 卡住了：先查第十一部分「錯誤訊息對照表」

💰 **全部免費**：網站、資料庫、收據 AI 判讀都在 Cloudflare 免費方案內，不需要買網域、不需要伺服器、不用綁信用卡。

---
# 🆕 第零部分：開始前準備（帳號、軟體、權限）

> 這部分是**給你（使用者）看的**。AI 不能代替你註冊帳號、輸入密碼或按授權，以下這些要你自己來。

## 0-1 需要的帳號

| 帳號 | 用來做什麼 | 費用 | 必要嗎 |
|---|---|---|---|
| **Cloudflare** | 放網站、資料庫、收據 AI 判讀 | 免費，**不用綁信用卡** | ✅ 必要 |
| **Claude**（可以用 Claude Code 的方案） | 讓 AI 幫你寫程式、上傳 | 依你的方案 | ✅ 必要 |
| **Google** | 旅程結束封存時，自動上傳到 Google Drive | 免費 | ⬜ 選用（不設定也能封存，見第十部分） |

註冊 Cloudflare：https://dash.cloudflare.com/sign-up （用 Email 註冊，收驗證信點連結就好）

## 0-2 電腦要裝的軟體

打開「終端機」（Mac：按 `⌘ + 空白鍵` 搜尋「終端機」）輸入下面的指令確認：

| 軟體 | 確認指令 | 看到什麼代表 OK | 沒有的話 |
|---|---|---|---|
| **Node.js**（20 版以上） | `node -v` | `v20.x.x` 以上 | 到 https://nodejs.org 下載 LTS 版安裝 |
| **Claude Code** | `claude --version` | 版本號 | 照 Claude 官網說明安裝 |
| Google Workspace CLI `gws` | `gws --version` | 版本號 | ⬜ 選用，只有封存要自動上傳 Google Drive 才需要 |

💡 `wrangler`（Cloudflare 的上傳工具）不用自己裝，第一次執行 `npx wrangler` 時會自動下載。

## 0-3 過程中會跳出的授權畫面（照著按就好）

| 什麼時候 | 你會看到 | 怎麼做 | 注意 |
|---|---|---|---|
| **AI 要執行指令時** | Claude Code 問「要允許執行這個指令嗎？」 | 指令開頭是 `npx wrangler`、`node`、`npm`、`curl`、`./deploy.sh`、`tools/` 就允許 | 看到 `sudo`、`rm -rf`，或要你輸入電腦密碼的，**先停下來問 AI 為什麼** |
| **AI 第一次讀寫資料夾** | Mac 跳出「終端機想要取用『文件』檔案夾內的檔案」 | 按「好」 | 不小心拒絕了：系統設定 → 隱私權與安全性 → 檔案與檔案夾 → 打開「終端機」 |
| **登入 Cloudflare**（`npx wrangler login`） | 瀏覽器開啟授權頁，列出 Pages、D1、Workers AI 等權限 | **先確認網址是 `dash.cloudflare.com`**，再按「Allow」 | 瀏覽器沒有自動打開：把終端機裡的網址複製貼到瀏覽器；登入大約一個月後會過期，到時候重跑一次 `npx wrangler login` |
| **設定領隊密碼** | AI 問你「要自己設密碼，還是隨機產生一組？」 | 建議自己設：AI 會在終端機開一個輸入畫面，**輸入時畫面不會顯示字，這是正常的** | ⚠️ **不要把密碼打在 AI 對話框裡**。之後要改密碼，請 AI 再開同一個畫面 |
| **收據 AI 判讀** | 不會跳任何畫面 | 不用做任何事，Cloudflare 免費方案就有 | ⚠️ 不要把 Cloudflare 升級成付費的 Workers Paid 方案；只要維持免費方案，用量超過也只是暫停，不會收費 |
| **手機拍收據** | 「xxx.pages.dev 想要使用你的相機」 | 按「允許」 | 拒絕了：iPhone → 設定 → Safari → 相機 → 詢問；Android Chrome → 網址列左邊的圖示 → 權限 → 相機 |
| **匯出 Excel** | 「要下載這個檔案嗎？」 | 按「下載」 | iPhone 的檔案會存在「檔案」App 的「下載項目」 |
| **加到手機主畫面** | — | iPhone Safari：分享 → 加入主畫面；Android Chrome：右上 ⋮ → 加到主畫面 | iPhone 要用 Safari 開，LINE 內建瀏覽器不行 |
| **封存上傳 Google Drive**（選用） | `gws auth login -s drive` 開啟 Google 授權頁，可能顯示「Google 尚未驗證這個應用程式」 | 這是你自己建立的授權，點「進階」→「繼續」→ 勾選 Google Drive → 允許 | 第一次使用 `gws` 要先在 Google Cloud 建立 OAuth 用戶端（要用平常有在用的 Google 帳號，並把自己加進 Test users），比較複雜。**不想設定就用 `--no-drive` 封存**，再自己把資料夾拖到雲端硬碟 |

## 0-4 絕對不要做的事

- ❌ 不要把 Cloudflare 密碼、Google 密碼、領隊密碼、任何 API 金鑰**貼在 AI 對話裡**
- ❌ 不要把 `admin.key`、`.dev.vars` 上傳到 GitHub，或傳給別人（裡面是領隊密碼）
- ❌ 不要升級 Cloudflare 付費方案（免費方案就夠用，而且保證不會被收費）
- ❌ 不要讓 AI 幫你註冊帳號或代按 Google、Cloudflare 的授權按鈕，這些一定要自己來

---

# 第二部分：功能規格（後台相關）

## 2-1 技術架構

| 項目 | 做法 |
|---|---|
| 網頁本體 | **單一 `index.html`**（HTML＋CSS＋原生 JavaScript，不用框架），方便維護與複製 |
| 放置位置 | **Cloudflare Pages**（免費），網址像 `xxx-隨機碼.pages.dev` |
| 共用資料 | **Cloudflare D1**（免費 SQLite 資料庫）＋ **Pages Functions**（`functions/api/*.js`） |
| 天氣 | **Open-Meteo**（免費、免註冊、免金鑰），前端直接呼叫 |
| 外語發音 | 瀏覽器內建語音朗讀（`speechSynthesis`，語言寫在 `TRIP.lang`，例如 `ja-JP`、`th-TH`），不用錄音檔，Mac／Windows／手機都能用 |
| 影片 | Instagram 官方內嵌 `https://www.instagram.com/reel/<ID>/embed/`（iframe） |
| 個人狀態 | `localStorage`（打包清單勾選、♡ 我的清單、展開狀態、暱稱）— **一律包 try/catch** |
| 部署 | `wrangler pages deploy`，用 `deploy.sh` 一鍵上傳 |
| 🆕 領隊後台 | 獨立 `site/admin.html`（不放進 index.html，團員不會載入後台程式） |
| 🆕 登入 | 管理密碼（伺服器 secret `ADMIN_KEY`）換一張簽章通行證，放 HttpOnly Cookie，7 天有效 |
| 🆕 收據圖片 | 前端先壓縮（長邊 1600px、JPEG、≤ 1MB）再上傳，**存在 D1 的 BLOB 欄位**（不用 R2，免綁卡） |
| 🆕 收據判讀 | **Cloudflare Workers AI**（免費額度每天 10,000 neurons，免綁卡）的視覺模型 `@cf/meta/llama-4-scout-17b-16e-instruct`（2026-10 實測：一張收據約 35 neurons，手寫收據也讀得出來；不需要另外同意授權）；後端自設每日上限保險絲，保證不超過免費額度；備案見 9-4 |
| 🆕 Excel 匯出 | **ExcelJS**（`cdn.jsdelivr.net/npm/exceljs`）在後台頁面直接產生 `.xlsx`，可內嵌收據縮圖 |

**資料夾結構**
```
專案/
├── site/
│   ├── index.html        # 網頁本體（所有設定都集中在 <script> 開頭的常數）
│   ├── admin.html        # 🆕 領隊後台
│   ├── leader-lib.js     # 🆕 結算與 Excel 共用程式（後台和封存腳本共用，數字才會一致）
│   ├── days.json         # 🆕 deploy.sh 自動從 index.html 產生的行程清單
│   ├── _headers          # X-Robots-Tag: noindex, nofollow
│   ├── robots.txt        # Disallow: /
│   └── img/              # （選填）說明圖片，例如機場接機位置圖
├── functions/
│   ├── _lib/auth.js      # 🆕 共用：驗證登入 Cookie（所有 /api/admin/* 都先過這關）
│   └── api/
│       ├── messages.js   # 留言板
│       ├── expenses.js   # 團員記帳
│       ├── recs.js       # 推薦（伴手禮、美食、按摩…）
│       ├── likes.js      # 推薦按讚
│       ├── rooms.js      # 分房
│       └── admin/        # 🆕 以下全部需要登入
│           ├── login.js      # 登入／登出
│           ├── ledger.js     # 領隊帳本 CRUD
│           ├── receipts.js   # 收據上傳、讀圖、刪除
│           ├── parse.js      # 收據 AI 判讀
│           └── settings.js   # 領款、零用金、匯率等結算設定
├── wrangler.toml         # Pages 設定 + D1 綁定
├── deploy.sh             # 一鍵部署
├── tools/                # 🆕 set-password.sh、dev.sh、extract-days.mjs、archive.mjs、restore.sh…（見第五部分）
├── admin.key             # 領隊／留言板管理密碼（加入 .gitignore，不上傳）
└── .dev.vars             # 🆕 本機預覽用的密碼（加入 .gitignore，不上傳）
```

## 2-2 資料庫（D1）

```sql
CREATE TABLE messages (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, body TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, day INTEGER NOT NULL, item INTEGER NOT NULL, title TEXT NOT NULL, amount REAL NOT NULL, currency TEXT NOT NULL, payer TEXT NOT NULL, split TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE recs (id INTEGER PRIMARY KEY AUTOINCREMENT, cat TEXT NOT NULL, name TEXT NOT NULL, en TEXT, why TEXT, warn TEXT, shops TEXT NOT NULL, place TEXT, author TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE rec_likes (rec_id INTEGER NOT NULL, voter TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (rec_id, voter));
CREATE TABLE room_assign (name TEXT PRIMARY KEY, room INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE settle_paid (name TEXT PRIMARY KEY, amount INTEGER NOT NULL, dir TEXT NOT NULL, paid_at INTEGER NOT NULL);
```

🆕 **領隊後台資料表**（完整欄位說明見 9-2）
```sql
CREATE TABLE leader_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day INTEGER, item INTEGER,             -- 對應行程（Day + 行程固定編號 k），可空白＝不屬於特定行程
  spent_on TEXT,                         -- 消費日期 YYYY-MM-DD
  category TEXT NOT NULL,                -- 餐飲／飲料酒水／門票／交通／住宿／小費／招待／雜支
  vendor TEXT NOT NULL,                  -- 店家
  place TEXT,                            -- 地點
  content TEXT,                          -- 內容（品項、幾人份）
  currency TEXT NOT NULL,                -- 當地幣代碼，例 IDR；直接付台幣就填 TWD
  amount_local REAL NOT NULL,            -- 當地幣金額
  rate REAL,                             -- 匯率（統一存「1 台幣 = ? 當地幣」）
  amount_twd REAL NOT NULL,              -- 台幣（保留小數；預設自動算，可手改）
  twd_manual INTEGER NOT NULL DEFAULT 0, -- 1 = 台幣是手動改的（例如刷卡帳單實際金額）
  payer TEXT NOT NULL,                   -- guide 當地導遊 ／ leader 台灣領隊
  method TEXT NOT NULL,                  -- guide_rate 導遊匯率結台幣 ／ card 刷卡 ／ cash 現金
  note TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed', -- draft 待確認（AI 判讀產生）／ confirmed 已確認
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ledger_id INTEGER,                     -- 對應帳本哪一筆（一筆帳可有多張收據）
  img BLOB NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL,
  ai_status TEXT NOT NULL DEFAULT 'pending', -- pending／done／failed／skipped
  ai_json TEXT,                          -- AI 讀出的原始結果（保留，方便對照）
  created_at INTEGER NOT NULL
);
CREATE TABLE leader_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  -- advance 領隊領款、petty_cash 零用金、guide_rate 導遊結算匯率、payer_company 撥款單位名稱…
CREATE TABLE login_attempts (ip TEXT NOT NULL, at INTEGER NOT NULL);
```

## 2-3 API（Pages Functions）

| 路徑 | 方法 | 說明 |
|---|---|---|
| `/api/messages` | GET / POST / DELETE | DELETE 需 header `X-Admin-Key`（伺服器 secret `ADMIN_KEY`）；POST 有隱藏欄位防機器人 |
| `/api/expenses` | GET / POST / PUT / DELETE | 驗證：金額 > 0、付款人、分帳的人必填；幣別只收本國幣／當地幣 |
| `/api/recs` | GET / POST / PUT / DELETE | GET 帶 `?voter=` 一併回傳讚數與「這支手機按過沒」；分類白名單 |
| `/api/likes` | POST | 同一個 voter 對同一推薦：按一次加讚、再按收回 |
| `/api/rooms` | GET / POST | POST `{room, names}` 設定某房成員；一人只會在一間房（自動從原房移出） |
| `/api/settle` | GET / POST | 結算確認：POST `{name, amount, dir:"pay"|"refund", paid:true/false}`，勾選／取消；任何人可操作 |

🆕 **領隊後台 API**（全部要登入；沒登入一律回 401，**連讀取都不行**，團員看不到領隊帳）

| 路徑 | 方法 | 說明 |
|---|---|---|
| `/api/admin/login` | POST / DELETE | POST `{password}` 比對 `ADMIN_KEY`，成功發 Cookie；同一 IP 15 分鐘錯 5 次就鎖 15 分鐘。DELETE 登出 |
| `/api/admin/ledger` | GET / POST / PUT / DELETE | GET 可帶 `?status=draft` 只看待確認；POST/PUT 驗證見 9-2 |
| `/api/admin/receipts` | GET / POST / DELETE | POST 上傳一張（multipart，≤ 1MB，只收 jpeg/png/webp）；GET `?id=` 回圖片本體 |
| `/api/admin/parse` | POST | `{receipt_id}` 呼叫 AI 判讀 → 寫 `ai_json` → 自動新增一筆 `draft` 帳 |
| `/api/admin/settings` | GET / PUT | 領款、零用金、導遊匯率等 |

**安全原則**：所有使用者輸入在畫面上都要跳脫（escape），避免有人貼程式碼破壞網頁；文字長度都要設上限。

# 第三部分：你的旅程資料（後台設定）

> 其他資料照 `spec.md` 第三部分填寫。

## 🆕 3-16 領隊後台設定
```
撥款單位（Excel 上顯示）：【例：星宇旅行社／○○公司福委會】
領隊姓名：【】　當地導遊姓名：【】
當地貨幣：【IDR 印尼盾】匯率輸入方向：【1 台幣 = ? 當地幣（適合 IDR、VND、KRW、JPY）／1 當地幣 = ? 台幣（適合 USD、EUR、THB）】
導遊結算匯率：【1 台幣 = 500 IDR】（導遊代墊的部分用這個匯率結台幣）
預設現金匯率：【出發前換匯的實際匯率】
當團領隊領款：【20,000】台幣（出發前公司撥給領隊的團費預支）
零用金：【0】台幣（另外撥的備用金；沒有就填 0）
支出類別：【餐飲、飲料酒水、門票、交通、住宿、小費、招待、雜支】（可增減）
```

---

# 第五部分：上線步驟

> 標 👤 的步驟要**使用者本人**操作，AI 做到這裡要停下來，說明使用者會看到什麼畫面、要按哪裡，等使用者說「好了」再繼續。

```bash
# 👤 1. 使用者自己註冊 Cloudflare（免費，不用綁卡）：https://dash.cloudflare.com/sign-up

# 👤 2. 登入：瀏覽器會跳出授權頁，確認網址是 dash.cloudflare.com 再按 Allow
npx wrangler login
npx wrangler whoami          # 確認：看到自己的 Email 就代表登入成功

# 3. 建立網站（名稱用隨機碼，避免被猜到）
npx wrangler pages project create <專案名-隨機碼> --production-branch main
#   ⚠️ 若出現「could not register workers.dev subdomain」，代表新版 Pages 會被導到 Workers，
#      改加 --force 建立舊版 Pages（只有建立這一次需要）

# 4. 建立資料庫，把 database_id 填進 wrangler.toml（schema.sql 見 2-2）
npx wrangler d1 create <資料庫名> --location apac
npx wrangler d1 execute <資料庫名> --remote --file schema.sql -y

# 🆕 5. 確認收據判讀的 AI 模型還在（模型偶爾會改版，以當下清單為準）
npx wrangler ai models list | grep -i "llama-4-scout"

# 👤 6. 設定領隊密碼 —— AI 一定要先問使用者：「要自己設密碼，還是我幫你隨機產生一組？」
#    自己設（推薦）：AI 在使用者的終端機開這個畫面，使用者自己輸入，密碼不會出現在對話裡
tools/set-password.sh
#    隨機產生：AI 產生 24 字元隨機碼存進 admin.key，再請使用者自己打開檔案複製（不要貼在對話裡）
#    兩種方式都會把密碼存在 admin.key 和 .dev.vars（都要加進 .gitignore）

# 7. 上傳（之後每次修改都只要跑這行；它會先自動同步行程給後台）
./deploy.sh

# 8. 確認上線：網址打得開、沒登入時 /api/admin/ledger 回 401
curl -s -o /dev/null -w "%{http_code}\n" https://<專案名>.pages.dev/api/admin/ledger
```

🆕 **本機預覽**：`tools/dev.sh`（網址 `http://localhost:8788`）。⚠️ 本機預覽**沒有 AI 判讀**：帳號還沒註冊 workers.dev 子網域時，本機連不到遠端的 AI，所以 AI 判讀請在正式網址測試。

**wrangler.toml 範本**
```toml
name = "<專案名-隨機碼>"
pages_build_output_dir = "./site"
compatibility_date = "2026-09-01"

[[d1_databases]]
binding = "DB"
database_name = "<資料庫名>"
database_id = "<步驟 4 拿到的 ID>"

# 🆕 收據判讀用的 Workers AI
[ai]
binding = "AI"
```

**deploy.sh**（複製到乾淨暫存資料夾再上傳，避免把多餘檔案傳上去）
```bash
#!/bin/bash
set -e
SRC="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SRC/ARCHIVED.md" ]; then echo "⛔ 這一團已經封存，不能直接部署。要改回可編輯請用 tools/restore.sh"; exit 1; fi
node "$SRC/tools/extract-days.mjs"          # 從 index.html 抽出行程 → site/days.json（後台下拉選單用）
TMP="$(mktemp -d)"; mkdir -p "$TMP/site"
cp "$SRC/wrangler.toml" "$TMP/"; cp -R "$SRC/functions" "$TMP/"
cp "$SRC/site/index.html" "$SRC/site/admin.html" "$SRC/site/leader-lib.js" "$SRC/site/days.json" "$SRC/site/_headers" "$SRC/site/robots.txt" "$TMP/site/"
[ -d "$SRC/site/img" ] && cp -R "$SRC/site/img" "$TMP/site/"
[ -d "$SRC/site/img" ] && cp -R "$SRC/site/img" "$TMP/site/"
cd "$TMP" && npx wrangler pages deploy --branch main --commit-dirty=true
```

🆕 **工具腳本一覽**（放在 `tools/`）

| 檔案 | 做什麼 | 誰執行 |
|---|---|---|
| `set-password.sh` | 設定／更改領隊密碼，改完自動重新部署，舊的登入全部失效 | 👤 使用者在終端機輸入密碼 |
| `dev.sh` | 本機預覽（不含 AI 判讀） | AI |
| `extract-days.mjs` | 從 index.html 抽出行程給後台用（deploy.sh 會自動呼叫） | 自動 |
| `archive.mjs` | 旅程結束封存（見第十部分） | AI 試跑，👤 最後一步由使用者確認 |
| `restore.sh`、`restore-receipts.mjs` | 把封存的團還原成可以編輯的網站 | AI |
| `package.json` | 封存用的 Excel 套件（`cd tools && npm install`） | AI |

🆕 **`tools/set-password.sh` 完整內容**（設定密碼最重要，所以直接附上；AI 照抄存檔後 `chmod +x tools/set-password.sh`）
```bash
#!/bin/bash
# 設定／更改領隊後台密碼：密碼只在這個終端機輸入，不會出現在對話裡
# 改完會自動重新部署；舊密碼登入的手機會全部被登出
set -e
SRC="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="$(grep -E '^name *=' "$SRC/wrangler.toml" | cut -d'"' -f2)"
echo "🔐 設定「${PROJECT}」的領隊後台密碼（輸入時畫面不會顯示字，這是正常的）"
while true; do
  read -r -s -p "新密碼（至少 8 個字）：" P1; echo
  read -r -s -p "再輸入一次：" P2; echo
  if [ "$P1" != "$P2" ]; then echo "❌ 兩次不一樣，再來一次"; continue; fi
  if [ ${#P1} -lt 8 ]; then echo "❌ 太短了，至少 8 個字"; continue; fi
  break
done
printf '%s' "$P1" > "$SRC/admin.key"; chmod 600 "$SRC/admin.key"
printf 'ADMIN_KEY=%s\n' "$P1" > "$SRC/.dev.vars"
printf '%s' "$P1" | npx wrangler pages secret put ADMIN_KEY --project-name "$PROJECT" >/dev/null
echo "✅ 密碼已更新，正在重新部署讓新密碼生效…"
"$SRC/deploy.sh" >/dev/null 2>&1 && echo "🎉 完成！請用新密碼登入。" || echo "⚠️ 部署失敗，請跟 Claude 說"
```

🆕 **其他 `tools/` 腳本**：如果拿到這份規格書時沒有附上 `tools/` 資料夾，請 AI 依照第五部分「工具腳本一覽」、第九部分、第十部分的說明自己寫出來；寫好後**一定要先用 `--dry-run` 和本機預覽測過**，才能用在正式的團。

---

# 第六部分：隱私與安全

| 可以放網頁 | 不要放網頁 |
|---|---|
| 航班、行程、民宿名稱與地址、訂單號 | **門鎖／鑰匙盒密碼**（預設在群組公布；屋主明確決定才可放，見附錄 A-5） |
| 房東、包車公司、團內聯絡電話（大家都需要） | 護照號碼、身分證字號、保單號碼（各自截圖存手機） |
| 分房、分組、Dress Code | 訂單金額（如不想公開） |
| 個別提醒（**本人同意後**） | 管理密碼、API 金鑰 |

- 網址用隨機名稱、設定 `noindex` 不被搜尋引擎收錄、提醒大家不要轉出群組
- 記帳、推薦、分房「拿到網址的人都能改」（朋友互信設計）；擔心誤刪可改成需要管理密碼
- 所有使用者輸入都要跳脫，避免被貼惡意程式碼

🆕 **領隊後台額外規則**
- 領隊帳本、收據、領款金額**只有登入後看得到**；團員頁面完全不顯示，API 沒登入一律 401
- 收據常有**信用卡末四碼、簽名、統編、會員電話**：上傳畫面提醒「拍照時用手指遮住卡號」；AI 判讀結果只取店家、日期、金額、品項，**不存卡號**
- Cookie 設 `HttpOnly; Secure; SameSite=Strict`；登入有錯誤次數上限
- 管理密碼外洩或想換密碼：執行 `tools/set-password.sh`（使用者自己在終端機輸入新密碼）→ 自動上傳並重新部署 → 所有舊的登入立即失效（簽章金鑰跟著換）
- 收據判讀送到 Cloudflare Workers AI，資料留在 Cloudflare 內；不要改接其他第三方 OCR

---

# 第七部分：上線前測試清單

- [ ] 手機尺寸（375px 寬）逐頁看過，按鈕好按、字夠大、沒有橫向捲動
- [ ] 用 `?now=` 模擬：出發前、每天早上、分組行動的早上、跨天深夜、旅程結束後
- [ ] 下一個集合（含分組日）、進行中標籤、自動展開都正確
- [ ] 記帳：新增、編輯、刪除、公積金、只分給部分人、結算加總歸零
- [ ] 分房：移動成員、超過床位警示
- [ ] 推薦：新增、編輯、刪除、按讚（一機一票）、店家篩選、地區分組正確
- [ ] 打包清單打勾後重新整理還在；換算器輸入時打勾不會清掉數字
- [ ] 外語 🔊 每句都能播
- [ ] 地圖、電話連結都正確（`tel:` 要含國碼）
- [ ] 正式網址確認更新成功（瀏覽器有快取時加 `?v=新版` 重新開）
- [ ] 🆕 沒登入時：`/admin.html` 只看到登入框；直接打 `/api/admin/ledger` 回 401
- [ ] 🆕 登入錯 5 次被鎖；登出後 Cookie 失效
- [ ] 🆕 記帳：三種付款方式都記一筆；改匯率台幣自動重算；手改台幣後再改匯率**不會蓋掉**手改值（會提示）
- [ ] 🆕 收據：一次選 5 張上傳，全部壓縮、判讀、產生草稿；判讀失敗的那張可手動填
- [ ] 🆕 拿 9-6 的範例資料算一次：導遊代付小計 15,601、總計 22,505、結餘 −2,505
- [ ] 🆕 匯出 Excel 用 Excel／Numbers／Google 試算表都打得開，數字格式、黃底結餘、收據縮圖正確

---

# 第八部分：踩過的坑（直接避開）

1. **行程編號 `k` 要固定**：用陣列順序對應記帳的話，插入新行程會讓舊帳對錯行程
2. **打包清單新項目只能加在最後**：勾選是照順序存的
3. **localStorage 一定要 try/catch**：私密瀏覽或被封鎖時會出錯
4. **重新整理畫面時保留使用者展開的卡片**，不然記完帳卡片就收起來了
5. **換算器、表單輸入中不要整頁重畫**，只更新需要的部分
6. **文字比對要小心包含關係**：例如 ICONSIAM 會被當成 SIAM，要排除
7. **wrangler 在某資料夾執行 login 可能自動產生 `wrangler.jsonc`**，從那個資料夾部署會失敗 → 用 deploy.sh 從乾淨資料夾上傳
8. **Cloudflare 會擋 Python 預設 User-Agent**，用 curl 呼叫 API
9. **Instagram 內嵌要有網路**才看得到；Klook 等網站可能跳機器人驗證（不能代為通過，請使用者自己開）
10. **店家營業時間、市集搬家、入境規定常變**：出發前一週再確認一次
11. 🆕 **小計列不能再加進總計**：手做的結算表常見錯誤，例如「以上導遊代付 7,800,400」這列又被加進 IDR 總計，變成 15,600,800（重複算兩次）。程式只從明細算，小計和總計都是「算出來的列」
12. 🆕 **四捨五入只做一次**：導遊匯率的部分是「當地幣小計 ÷ 匯率」後才四捨五入（7,800,400 ÷ 500 = 15,600.8 → 15,601），不要每筆先捨入再加總，會差好幾塊
13. 🆕 **匯率方向寫死在設定**：IDR 習慣講「1 台幣 = 500」、THB 習慣講「1 泰銖 = 0.95」，畫面依設定顯示，資料庫統一存同一種方向，避免乘除搞反
14. 🆕 **手機照片很大**：沒壓縮直接上傳會超過 D1 單筆 2MB 上限而失敗，一定要先在瀏覽器壓縮
15. 🆕 **AI 判讀一定是「草稿」**：手寫收據、熱感紙褪色、外文店名都可能讀錯，必須領隊確認才算數，不能自動入帳
16. 🆕 **照片存在 D1 的 BLOB 欄位，備份時要分開**：`wrangler d1 export` 匯出的照片 INSERT 每行太長，重新匯入會出現 `SQLITE_TOOBIG` → SQL 裡拿掉照片，照片另外存成檔案，還原時再用 API 傳回去（`archive.mjs`、`restore.sh` 已處理）
17. 🆕 **Cloudflare Pages 找不到檔案時會回首頁（200）**：檢查「某個檔案有沒有上線」時，不能只看狀態碼，要確認內容
18. 🆕 **用 `hidden` 屬性藏元素時**，CSS 要加 `[hidden]{display:none !important}`，否則會被 `display:flex` 蓋掉（沒登入也看得到分頁列）
19. 🆕 **Pages 會把 `/admin.html` 轉址到 `/admin`（308）**，這是正常的，連結兩種寫法都能用
20. 🆕 **密碼不能經過 AI 對話**：用 `read -s` 在終端機輸入（`set-password.sh`），AI 只負責開啟那個畫面

---

# 🆕 第九部分：領隊後台功能規格

## 9-0 之後補建領隊後台（已經做好團體版的網站）

出發前才決定要加、甚至旅途中才想到都可以。**已經有的行程、團員記帳、留言、推薦、分房都不會受影響**，網址也不變。

跟 AI 說「幫我補建領隊後台」，AI 照以下步驟做：
1. 從 `assets/leader/` 複製：`site/admin.html`、`site/leader-lib.js`、`functions/_lib/auth.js`、`functions/api/admin/`（login、ledger、receipts、parse、settings、`_middleware.js`）、`tools/`（至少要 `extract-days.mjs`、`set-password.sh`）
2. 資料庫**只新增**領隊用的資料表（`schema.sql` 裡的 leader_ledger、receipts、leader_settings、login_attempts、ai_usage，全部是 `CREATE TABLE IF NOT EXISTS`），不動既有資料表：
   ```bash
   npx wrangler d1 execute <資料庫名> --remote --file schema.sql -y
   ```
3. `wrangler.toml` 加上 `[ai]` 這段（第五部分範本）
4. 👤 **管理密碼**：AI 先問使用者「要沿用原本留言板的管理密碼，還是換一組新的？」要換的話，請使用者執行 `tools/set-password.sh`
5. 改用 `assets/leader/deploy.sh`（會先跑 `extract-days.mjs`，並一起上傳 `admin.html`、`leader-lib.js`、`days.json`）
6. `index.html` 設定區的 `TRIP.admin` 改成 `true`（頁尾會出現「🧭 領隊後台」入口）
7. 部署後，請使用者填 3-16 的設定（在後台「⚙️ 設定」頁就能填），再跑第七部分的領隊測試項目

## 9-1 後台畫面（`/admin.html`，手機優先）

上方 4 個分頁：

| 分頁 | 內容 |
|---|---|
| 🧾 帳本 | 結算總覽卡＋支出明細（可依天數、付款人、類別篩選）＋「＋記一筆」 |
| 📷 收據 | 上傳區＋**待確認草稿**清單（有紅點顯示數量）＋全部收據牆 |
| 📊 結算 | 依付款人分段的結算表（長得跟 9-6 的範例一樣）＋領款、零用金、結餘 |
| ⚙️ 設定 | 領款、零用金、導遊結算匯率、預設現金匯率、類別、撥款單位；登出 |

右上角固定一顆「⬇️ 匯出 Excel」。

## 9-2 領隊帳本

**新增／編輯表單**（欄位順序就是領隊在現場的思考順序）
1. **付款人**：🧑‍🦱 當地導遊 ／ 🧑‍✈️ 台灣領隊（大按鈕二選一）
2. **付款方式**：依付款人自動帶預設，可改
   - 當地導遊 → `導遊匯率結台幣`（預設）
   - 台灣領隊 → `刷卡` 或 `現金`
3. **Day＋行程**下拉（同前台的行程編號 `k`，選了自動帶入地點）；也可選「不屬於特定行程」
4. **類別**、**店家**、**地點**、**內容**（例：「13 人晚餐＋啤酒加點」）
5. **金額＋幣別**：預設當地幣，可切 TWD（領隊直接付台幣時，例如台灣機場接送）
6. **匯率**：依付款方式自動帶
   - 導遊匯率結台幣 → 設定裡的導遊結算匯率（鎖定，要改去設定）
   - 現金 → 預設現金匯率（可改）
   - 刷卡 → 預設現金匯率先估，旁邊註記「等帳單出來可改成實際台幣」
   - 幣別是 TWD → 匯率欄隱藏
7. **台幣**：自動算、即時顯示；可手動改（改了就標 ✏️ 手動，之後改匯率不覆蓋）
8. **收據**：可直接拍照／選照片附上（可多張）、備註

**驗證**：金額 > 0、店家必填、付款人與付款方式必須是合法組合（導遊只能 `guide_rate` 或 `cash`；領隊只能 `card`／`cash`）、匯率 > 0。

**明細清單**：每筆一列，顯示 Day、店家、內容、當地幣金額、台幣、付款人／方式小標籤、📎 收據數；點一下編輯。草稿用虛線框＋「待確認」標籤，**不計入結算**。

## 9-3 收據上傳與自動判讀

**上傳**
- 「📷 拍收據」按鈕（手機直接開相機）＋「🖼️ 從相簿選」可多選
- 每張先在瀏覽器壓縮（長邊 1600px、JPEG 品質 0.8，超過 1MB 再降）→ 逐張上傳，顯示進度
- 上傳後可選：「🤖 自動判讀」（預設）或「我自己填」
- 提醒文字：「拍照時請遮住信用卡號」

**自動判讀流程**
1. 後端把圖片送 Workers AI 視覺模型，要求**只回 JSON**：
   ```json
   { "vendor": "店家名稱", "date": "YYYY-MM-DD", "currency": "IDR",
     "total": 653400, "items": [{"name": "Bintang 啤酒", "qty": 6, "amount": 270000}],
     "confidence": "high|medium|low" }
   ```
2. 後端驗證 JSON（數字、日期格式），失敗就標 `ai_status = failed`，不亂猜
3. 成功就自動建一筆 `draft` 帳：店家、日期、幣別、金額、內容（品項摘要成一行），**用日期自動對到 Day**；付款人、付款方式、行程留給領隊選
4. 📷 收據頁的「待確認」清單：左邊收據圖（可放大）、右邊預填好的表單，領隊核對 → 補付款人／行程 → 「✅ 確認入帳」，下一張自動接上（**逐一寫入**）
5. `confidence: low` 或金額讀不到時，欄位標黃提醒人工檢查

## 9-4 判讀備案（免費額度用完、或 AI 讀得很差時）

- **方案 B｜Claude Code 批次判讀**：回到電腦跟 Claude 說「幫我判讀待處理的收據」，Claude 用管理密碼呼叫 API 下載 `ai_status = pending/failed` 的收據、自己看圖，再呼叫 `/api/admin/ledger` 建立草稿。不另外花錢，準確度通常比較高，適合回國後一次整理
- **方案 C｜純手動**：上傳時選「我自己填」，收據照樣附在帳上，Excel 照樣匯出
- **免費額度保險絲**：`parse.js` 每天最多判讀 150 張、用量上限 8,000 neurons（免費額度是 10,000，台灣時間早上 8 點重置）。到上限會回「今天的免費判讀額度用完了」，收據照片照樣保存，可以手動填或隔天按「再判讀一次」。收據頁會顯示「今天已判讀 N／150 張」
- 實測（2026-10）：一張收據約 35 neurons，一天理論上可以讀約 280 張；**上線前仍建議用 5 張真實收據測一次**（熱感紙、手寫、外文店名）
- ⚠️ **不要改接 OpenAI、Claude API、Google Vision 等會計費的服務**，這個設計的前提是「完全不會有額外支出」

## 9-5 結算邏輯

```
導遊代付 TWD   ＝ 四捨五入( 導遊代付當地幣小計 ÷ 導遊結算匯率 )     ← 只捨入一次
                 （若導遊代付中有直接用台幣的，另外加）
領隊支出 TWD   ＝ Σ 領隊刷卡＋現金的台幣（各筆保留小數，加總後四捨五入）
總支出 TWD     ＝ 導遊代付 TWD ＋ 領隊支出 TWD
可用資金       ＝ 領隊領款 ＋ 零用金
結餘           ＝ 可用資金 − 總支出
                 正數 → 領隊要退回撥款單位　負數 → 撥款單位要補給領隊
```
結算頁把結餘用大字＋顏色顯示（正數綠、負數紅），並寫成一句白話：「領隊需退回 X 元」或「需補給領隊 X 元」。

## 9-6 Excel 匯出（`旅程名稱_領隊結算_YYYYMMDD.xlsx`）

**工作表 1｜結算總表**（沿用領隊熟悉的格式，深藍標題列、白字）

| No. | Item Description | 當地幣 | TWD |
|---|---|---|---|
| 1 | 金巴蘭啤酒 | 4,000,000 | |
| | 金巴蘭加點 | 653,400 | |
| 2 | Casa Luna 啤酒 | 210,000 | |
| 3 | 溫鞦韆那請吃冰 | 2,550,000 | |
| 4 | Lotus 啤酒 | 87,000 | |
| | 水 | 300,000 | |
| | **以上導遊代付，台幣匯率 1:500** | **7,800,400** | **15,601** |
| 5 | sentosa 啤酒 | | 562 |
| 6 | 招待小朋友果汁 | | 504 |
| 7 | 招待小朋友麥當勞＋領隊的炸雞 | | 418 |
| 8 | 兩位兩趟領隊機場接送 | | 5,420 |
| | **以上領隊刷卡＋現金** | | **6,904** |
| | **總計** | **7,800,400** | **22,505** |
| | **領隊領款（撥款單位）** | | **20,000** |
| | **零用金** | | **0** |
| | **結餘** | | **🟨 −2,505** |

- 依「付款人／付款方式」分段，每段一個小計列；同一行程的多筆用同一個 No.（第二筆起 No. 留白，像「金巴蘭加點」）
- 當地幣總計**只加明細**，不含小計列（見第八部分第 11 條）
- 結餘儲存格黃底、負數紅字；數字一律千分位、TWD 取整數
- 頁首：旅程名稱、日期、領隊、導遊；頁尾留「領隊簽名／會計簽名」兩格

**工作表 2｜支出明細**（給會計核帳，可篩選）
欄位：No.、日期、Day、行程、類別、店家、地點、內容、付款人、付款方式、幣別、當地幣金額、匯率、台幣、台幣是否手改、收據張數、備註

**工作表 3｜依行程彙總**：每個 Day＋行程一列，當地幣、台幣小計；最後一列總計

**工作表 4｜收據**：每張收據一列，對應 No.、店家、金額，**內嵌縮圖**（寬 240px）；照片太多時（> 80 張）改成只放編號，原始照片在封存的「收據照片」資料夾（見第十部分）

**匯出前檢查**：還有 `draft` 草稿時跳提醒「還有 N 筆待確認，不會列入 Excel，要先處理嗎？」

---

# 🆕 第十部分：旅程結束封存

**為什麼要封存**：Cloudflare 免費方案最多 **10 個資料庫**，一團用一個。封存就是把資料備份好、刪掉資料庫，把名額空出來給下一團。網址會保留，變成唯讀的紀念版。

**什麼時候封存**：建議**回國後 2–4 週**，等信用卡帳單出來、刷卡的實際台幣補好、跟撥款單位對完帳再做。

**封存後的樣子**

| 誰在看 | 看到什麼 |
|---|---|
| 👥 團員 | 行程、民宿、推薦、留言、團員記帳照常顯示，頁首出現「🎉 旅程已結束・紀念版」，按新增／修改會顯示「旅程已經結束，不能再修改囉」 |
| 🧭 領隊後台 | 關閉，顯示「這一團已經封存了」。領隊帳本、收據、領款金額**不會留在網路上**（紀念版是公開網頁，沒有密碼保護） |

**封存檔**（電腦 `archive/<日期>_<專案名>/`，選用：同步一份到 Google Drive `旅遊手冊封存/<年-月> <旅程名>/`）

| 檔案 | 內容 |
|---|---|
| `<旅程名>_領隊結算.xlsx` | 跟後台「匯出 Excel」一樣的結算表 |
| `收據照片/` | 原始照片，檔名開頭是 Excel「支出明細」的 No. |
| `收據對照.json` | 每張照片對應哪一筆帳（還原用） |
| `完整備份.sql` | 資料庫完整備份（不含照片本體） |
| `說明.txt` | 結算摘要、檔案說明、怎麼還原 |
| `紀念版網站/` | 目前線上紀念版的原始檔 |

**步驟**

```bash
cd tools && npm install && cd ..          # 第一次封存前安裝 Excel 套件

# 1. 試跑：只在電腦產生封存檔，不上傳、不改網站、不刪資料庫。先打開看看對不對
node tools/archive.mjs --dry-run

# 👤 2. 正式封存（會問問題，請 AI 在使用者的終端機開啟；最後一步要使用者親手輸入專案名稱才會刪資料庫）
node tools/archive.mjs              # 有設定 gws：自動上傳 Google Drive
node tools/archive.mjs --no-drive   # 沒設定 gws：只存在電腦，腳本會請你先把資料夾複製到雲端硬碟或隨身碟
```

**安全設計**：每一步都要檢查成功才會往下走（照片張數、備份裡有沒有每個資料表、Drive 上傳張數、紀念版有沒有真的上線）。任何一步失敗就停下來，**資料庫不會被刪**。封存後專案資料夾會出現 `ARCHIVED.md`，`deploy.sh` 看到它就不會再部署。

**還原**（改回可以編輯的網站，大約 2 分鐘）：
```bash
tools/restore.sh archive/<日期>_<專案名>     # Google Drive 那份下載下來也可以用
```
它會開一個新資料庫、匯入備份、重新部署，再把收據照片一張張傳回去。領隊密碼不變。

---

# 🆕 第十一部分：錯誤訊息對照表（卡住先查這裡）

| 看到的訊息 | 原因 | 怎麼解決 |
|---|---|---|
| `Authentication error [code: 10000]`、`Not logged in` | Cloudflare 登入過期了（大約一個月） | 👤 `npx wrangler login`，重新按 Allow |
| `could not register workers.dev subdomain`（建立網站時） | 帳號還沒有 workers.dev 子網域 | 建專案指令加 `--force` |
| `You need to register a workers.dev subdomain`（本機預覽時） | 本機預覽要連遠端 AI，但帳號沒有子網域 | 改用 `tools/dev.sh`（不含 AI），AI 判讀到正式網址測試 |
| 後台一直跳回登入頁、API 回 `401` | 密碼跟網站上的不一致，或登入超過 7 天 | 重新登入；忘記密碼就執行 👤 `tools/set-password.sh` 重設 |
| 「錯太多次了，請 15 分鐘後再試」 | 密碼連續錯 5 次，暫時鎖住（防止別人亂猜） | 等 15 分鐘 |
| 「今天的免費判讀額度用完了」 | 到了每日上限（保護你不會被收費） | 先手動填，台灣時間早上 8 點後按「再判讀一次」 |
| 「讀不出金額，請手動填寫」 | 照片模糊、反光、熱感紙褪色 | 重拍一張（平放、不要反光），或直接手動填 |
| 「圖片太大」 | 網頁沒壓縮到（很少見） | 重新選一次照片；還是不行就先截圖再上傳 |
| 手機按「拍收據」沒反應 | 相機權限被拒絕 | 見第零部分 0-3「手機拍收據」 |
| 「Excel 工具載入失敗」 | 網路不穩（Excel 套件從網路載入） | 換個網路再按一次匯出 |
| `invalid_grant`、`Token has been expired or revoked`（封存時） | Google 授權過期 | 👤 `gws auth login -s drive`；或改用 `--no-drive` |
| `SQLITE_TOOBIG`（還原時） | 直接匯入了含照片的舊備份 | 用 `tools/restore.sh`，它會把照片分開處理 |
| 「這一團已經封存」（部署時） | 專案已封存，`deploy.sh` 擋下來 | 要改內容請先 `tools/restore.sh` 還原 |
| 網頁改了，手機看到的還是舊的 | 瀏覽器快取 | 網址後面加 `?v=2` 重新開，或關掉分頁再開 |
| `Error 1027` | 今天的免費請求次數（10 萬次）用完 | 等台灣時間早上 8 點自動恢復（一般旅行團很難用到） |

---

---

*這份規格整理自 2026/10 曼谷 13 人朋友團的實戰版本，歡迎依自己的旅程調整 🧭*
