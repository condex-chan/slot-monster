# PRD v2: モンスロ（仮）— 磨き込みフェーズ

作成日: 2026-07-05
前提: v1（docs/PRD.md）は完了済み。全21 feature passes、verify.sh green、itch.io で動作確認済み。

## ゴール

v1 の「動くゲーム」を「面白さが伝わるゲーム」にする。
リールの手触り・初見の分かりやすさ・見た目と音の差し替え基盤を整備し、
外部生成アセット（画像・BGM）を**ファイルを置くだけ**で組み込める状態で
itch.io に再アップロードできる dist/ を成果物とする。

## 背景（itch.io 公開後のフィードバック）

1. スロットのリールがランダムすぎる。上から流れてくる・並び順が決まっているリールがいい
2. 何をするゲームか・何が面白いのかがぱっと伝わらない
3. 絵柄が稚拙。画像生成AIで統一感のあるアイコンに差し替えたい
4. BGM が欲しい（Suno で生成予定）
5. UI 全体の洗練

## スコープ

- リールの縦スクロール化（帯の並び順固定、減速停止、出目整合の維持）
- タイトル画面と初回オンボーディング
- 外部アセットパイプライン（画像・音声。**素材が無くても動くフォールバック必須**）
- BGM 再生基盤（ループ・シーン切替・ミュート設定）
- UI 共通スタイルと情報設計の改善

## スコープ除外

- 画像・音声素材の生成そのもの（人間が docs/v2/asset-guide-*.md に従い別途作成）
- itch.io への実アップロード（人間が実行）
- 新しいゲームメカニクス（役・配合・階層の仕様変更はしない）
- モバイル最適化・多言語対応

## 制約（v1 から継承+追加）

- ゲームロジックは Phaser 非依存の pure TS（src/core/, src/data/）
- **v1 の全テスト・E2E を green のまま維持する**（リグレッション禁止）
- E2E はコンソールエラー0を検証している。存在しないアセットへのリクエストで
  404 を出してはならない → アセットは manifest 経由でロードする
- 外部アセットは public/assets/ 配下に置かれたファイルのみ使用（実行時の外部URL参照禁止）
- アセット不在時は v1 のコード生成テクスチャ/WebAudio SE に自動フォールバックし、
  全 feature はアセット不在の状態で passes にできること

## アセット差し替えの運用（人間側の作業）

1. docs/v2/asset-guide-images.md / asset-guide-suno.md に従い素材を生成
2. public/assets/images/ と public/assets/audio/ に規定のファイル名で配置
3. `node scripts/gen-asset-manifest.mjs` を実行して manifest を更新
4. `bash scripts/verify.sh` → `bash scripts/package.sh` で再パッケージ

## 検証ゲート

v1 と同じ `bash scripts/verify.sh`（tsc → vite build → vitest → E2E）。

## 運用

- ブランチ: feature/autopilot-v2（feature/autopilot-mvp から分岐）
- docs/v2/features.json は passes フィールド以外編集禁止
- docs/progress.txt に毎イテレーション追記（v1 から継続、append-only）
- feature 単位でコミットし `git push origin feature/autopilot-v2` で退避
