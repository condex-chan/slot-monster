# Autopilot v2 イテレーション手順（毎イテレーション必ずこのファイルを読み従うこと）

対象: docs/v2/PRD.md のゴール。v1 の設計は docs/design.md、v1 の経緯は docs/progress.txt を参照。

1. ORIENT: `git log --oneline -10` / docs/progress.txt 末尾 / docs/v2/features.json を読み現状把握。
   ブランチが feature/autopilot-v2 でなければ `git checkout -b feature/autopilot-v2` で作成する
2. PICK: passes:false の最小 priority の feature を1つだけ選ぶ
3. IMPLEMENT: 既存パターンに従い実装。docs/v2/features.json は passes フィールド以外編集禁止。新機能の追加禁止。
   ゲームロジック・判定は Phaser 非依存の pure TS モジュール（src/core/, src/data/）に置き、
   シーンは表示と入力だけを担当する
4. VERIFY: `bash scripts/verify.sh` を実行。実際に通るまで passes:true にしない
5. COMMIT: feature 単位でコミット（なぜ、を書く）+ docs/progress.txt に1〜3行追記。
   コミット後 `git push origin feature/autopilot-v2` でリモートに退避（失敗してもループは止めない）
6. 同じ失敗が3回続いたら、その feature は progress.txt に `BLOCKED: <理由>` を記録し revert して次へ

質問せず自分で判断し、根拠は progress.txt の Decisions 行に記録する。

## v2 固有の必須制約

- **v1 のリグレッション禁止**: 既存の全 vitest テストと E2E を green のまま維持する。
  既存テストの削除・弱体化で green にすることは虚偽と同じく禁止
- **アセット不在で完結**: 画像・音声ファイルが public/assets/ に無い状態で全 feature を
  passes にできること。素材はあとから人間が置く（docs/v2/asset-guide-*.md）
- **404 を出さない**: アセットのロードは manifest（scripts/gen-asset-manifest.mjs が生成）
  経由のみ。存在確認目的のリクエストを飛ばさない（E2E がコンソールエラー0を検証している）
- 実行時の外部URL参照・外部アセットDL禁止（従来どおり）

禁止事項（v1 から継承）:
- docs/v2/features.json の description/steps/priority の書き換え・削除
- 検証せずに passes:true にすること（虚偽）
- force push / reset --hard / 破壊的コマンド

全 feature が passes:true（または BLOCKED 記録済み）かつ `bash scripts/verify.sh` が green の時のみ
<promise>AUTOPILOT V2 COMPLETE</promise> を出力する。虚偽の完了宣言は禁止。
