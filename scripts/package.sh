#!/usr/bin/env bash
# リリースパッケージ作成: 本番ビルド → itch.io アップロード用 zip を生成
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION=$(node -p "require('./package.json').version")
OUT="slot-monster-v${VERSION}.zip"

echo "== build (production) =="
npx vite build

echo "== zip dist/ -> ${OUT} =="
# zip コマンドがない環境でも動くよう python3 の zipfile を使う
python3 - "$OUT" <<'EOF'
import os, sys, zipfile

out = sys.argv[1]
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk('dist'):
        for f in files:
            full = os.path.join(root, f)
            # zip 内は dist/ を剥がしてルート直下に置く（itch.io は index.html がルート必須）
            z.write(full, os.path.relpath(full, 'dist'))
print(f'created {out}')
EOF

echo "PACKAGE DONE: ${OUT}"
