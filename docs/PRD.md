# PRD: モンスロ（仮）— スロット×モンスター育成ゲーム

作成日: 2026-07-05
設計詳細: `docs/design.md`（本 PRD と矛盾する場合は design.md を正とする）

## ゴール

TypeScript + Phaser 3 + Vite で、スロット×モンスター配合×自動戦闘のブラウザゲームを
ジャム規模で完成させる。itch.io にそのままアップロードできる dist/ 一式が成果物。

## コアループ（design.md の要約）

通常時スロット（金策）→ 扉図柄3揃い or 天井でバトルラッシュ突入 →
育成パーティ3体の自動戦闘（スピン継続で役がブースト）→
報酬（コイン+タマゴ+素材）→ 孵化・配合・強化 → 階層+1 で敵強化 → ループ。

## 完了の定義

以下がすべて満たされたとき完成:
1. `bash scripts/verify.sh` が green（tsc + vite build + vitest + E2E スモーク）
2. docs/features.json の全 feature が passes:true（または BLOCKED 記録済み）
3. dist/ をブラウザで開いて1周（スピン→ラッシュ→勝利→孵化→配合→階層UP→セーブ復帰）が成立する

## スコープ除外（やらないこと）

- itch.io への実アップロード（人間が実行）
- フリー素材アートの選定・組み込み（公開前に人間が差し替え）
- タイミングで抽選結果が変わる本物の目押し（取りこぼし方式のみ）
- 設定（1〜6）システム、実績、モバイル最適化、多言語対応
- design.md の「未決定・後回し事項」に列挙された拡張候補すべて

## 仮定（Assumptions）

- **アートはプレースホルダー**: モンスター・図柄・UI はコード生成のピクセル風図形
  （Phaser Graphics / 動的テクスチャ）。系統ごとに色相、種族ごとにシルエット差をつける。
  スプライトキーは1モジュール（例 src/assets/keys.ts）で一元管理し、後日の素材差し替えは
  テクスチャ登録の差し替えだけで済む構造にする。
- **SE は WebAudio で簡易生成**（外部音源ファイルの DL はしない）
- UI テキストは日本語
- 乱数はシード可能な PRNG を自前実装（mulberry32 等）し、テストで分布検証できるようにする
- 役テーブルの数値は design.md のドラフト値から開始し、vitest のシミュレーション
  （通常時 RTP 90〜95% を許容範囲で検証）に収まるよう調整してよい
- E2E 用に `window.__DEBUG__` フック（強制ラッシュ突入・コイン付与等）を dev/E2E ビルドでのみ露出

## 検証ゲート

`bash scripts/verify.sh` = tsc --noEmit → vite build → vitest run →（存在すれば）E2E スモーク。

## 運用

- ブランチ: feature/autopilot-mvp
- max-iterations: 30
- feature 単位でコミット（メッセージに「なぜ」を書く）
- docs/features.json は passes フィールド以外編集禁止
- docs/progress.txt に毎イテレーション追記（append-only）
