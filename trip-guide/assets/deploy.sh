#!/bin/bash
# 一鍵更新網站：把需要的檔案複製到乾淨的暫存資料夾再上傳
# （site/ 裡有第一次上傳失敗時自動產生的 wrangler.jsonc，不能直接從這裡上傳）
set -e
SRC="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"
mkdir -p "$TMP/site"
cp "$SRC/wrangler.toml" "$TMP/"
cp -R "$SRC/functions" "$TMP/"
cp "$SRC/site/index.html" "$SRC/site/_headers" "$SRC/site/robots.txt" "$TMP/site/"
[ -d "$SRC/site/audio" ] && cp -R "$SRC/site/audio" "$TMP/site/"
[ -d "$SRC/site/img" ] && cp -R "$SRC/site/img" "$TMP/site/"
cd "$TMP"
npx wrangler pages deploy --branch main --commit-dirty=true
