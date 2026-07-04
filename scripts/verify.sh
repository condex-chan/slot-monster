#!/usr/bin/env bash
# 検証ゲート: 1コマンドで合否が出る。ループはこれが green になるまで passes:true にできない
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== 1/4 type check =="
npx tsc --noEmit

echo "== 2/4 build =="
npx vite build

echo "== 3/4 unit tests =="
if ls tests/*.test.ts >/dev/null 2>&1 || ls src/**/*.test.ts >/dev/null 2>&1; then
  npx vitest run
else
  echo "(no tests yet — skip)"
fi

echo "== 4/4 e2e smoke =="
if [ -f scripts/e2e.mjs ]; then
  node scripts/e2e.mjs
else
  echo "(no e2e yet — skip)"
fi

echo "VERIFY GREEN"
