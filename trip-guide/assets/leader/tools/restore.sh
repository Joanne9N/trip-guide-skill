#!/bin/bash
# 把封存的團還原成可以編輯的網站：開一個新資料庫 → 匯入備份 → 改 wrangler.toml → 重新部署
# 用法：tools/restore.sh <封存資料夾>（裡面要有 完整備份.sql、收據對照.json、收據照片/）
set -e
SRC="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$(cd "$1" 2>/dev/null && pwd)" || { echo "❌ 請給封存資料夾路徑，例如：tools/restore.sh archive/20261020_xxx"; exit 1; }
SQL="$DIR/完整備份.sql"
[ -f "$SQL" ] && [ -f "$DIR/收據對照.json" ] || { echo "❌ 資料夾裡缺少 完整備份.sql 或 收據對照.json"; exit 1; }
PROJECT="$(grep -E '^name *=' "$SRC/wrangler.toml" | cut -d'"' -f2)"
NEW="${PROJECT}-db-$(date +%Y%m%d%H%M)"
cd "$SRC"
echo "1️⃣  建立新資料庫 $NEW…"
ID="$(npx wrangler d1 create "$NEW" --location apac 2>&1 | grep -oE '"database_id": *"[0-9a-f-]+"' | grep -oE '[0-9a-f]{8}-[0-9a-f-]+')"
[ -n "$ID" ] || { echo "❌ 建立資料庫失敗"; exit 1; }
cp wrangler.toml "wrangler.toml.bak-$(date +%Y%m%d%H%M)"
sed -i '' -E "s/^database_name *=.*/database_name = \"$NEW\"/; s/^database_id *=.*/database_id = \"$ID\"/" wrangler.toml
echo "2️⃣  匯入備份…"
npx wrangler d1 execute "$NEW" --remote --file "$SQL" -y >/dev/null
[ -f ARCHIVED.md ] && mv ARCHIVED.md "ARCHIVED-已還原-$(date +%Y%m%d).md"
echo "3️⃣  重新部署成可以編輯的版本…"
./deploy.sh >/dev/null
echo "4️⃣  還原收據照片…"
sleep 5
node tools/restore-receipts.mjs "$DIR"
echo "🎉 還原完成：https://$PROJECT.pages.dev（領隊密碼沒變）"
