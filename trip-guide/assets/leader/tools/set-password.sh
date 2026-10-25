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
