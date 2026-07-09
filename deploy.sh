#!/bin/zsh
# DM Re:Vault デプロイスクリプト
set -e

REPO=~/moon
DL=~/Downloads

SRC=$(ls -t "$DL"/index*.html 2>/dev/null | head -1)
if [ -z "$SRC" ]; then
  echo "❌ $DL に index*.html が見つかりません。先にチャットから index.html を保存してください。"
  exit 1
fi

cp "$SRC" "$REPO/index.html"
cd "$REPO"
git add -A
if git diff --cached --quiet; then
  echo "ℹ️ 変更なし。何もせず終了します。"
  exit 0
fi
git commit -m "update $(date +%F_%H%M)"
git push
echo "✅ 反映完了 → https://roaring-sun-va.github.io/moon/"
echo "   （使った元ファイル: $SRC）"
