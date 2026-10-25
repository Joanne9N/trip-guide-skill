#!/bin/bash
# 一鍵更新網站：先同步行程給後台，再把需要的檔案複製到乾淨的暫存資料夾上傳
set -e
SRC="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SRC/ARCHIVED.md" ]; then echo "⛔ 這一團已經封存（見 ARCHIVED.md），不能直接部署。要改回可編輯請用 tools/restore.sh"; exit 1; fi
node "$SRC/tools/extract-days.mjs"
TMP="$(mktemp -d)"
mkdir -p "$TMP/site"
cp "$SRC/wrangler.toml" "$TMP/"
cp -R "$SRC/functions" "$TMP/"
cp "$SRC/site/index.html" "$SRC/site/admin.html" "$SRC/site/leader-lib.js" "$SRC/site/days.json" "$SRC/site/_headers" "$SRC/site/robots.txt" "$TMP/site/"
[ -d "$SRC/site/audio" ] && cp -R "$SRC/site/audio" "$TMP/site/"
[ -d "$SRC/site/img" ] && cp -R "$SRC/site/img" "$TMP/site/"
cd "$TMP"
npx wrangler pages deploy --branch main --commit-dirty=true
