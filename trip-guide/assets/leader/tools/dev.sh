#!/bin/bash
# 本機預覽（不含 AI 判讀：Workers AI 在本機要 workers.dev 子網域，判讀請在正式網址測）
set -e
SRC="$(cd "$(dirname "$0")/.." && pwd)"
node "$SRC/tools/extract-days.mjs"
TMP="$(mktemp -d)"
grep -v -e '^\[ai\]' -e '^binding = "AI"' "$SRC/wrangler.toml" > "$TMP/wrangler.toml"
ln -s "$SRC/functions" "$TMP/functions"; ln -s "$SRC/site" "$TMP/site"; cp "$SRC/.dev.vars" "$TMP/"
cd "$TMP"
exec npx wrangler pages dev site --port "${PORT:-8788}" --persist-to "$SRC/.wrangler/state"
