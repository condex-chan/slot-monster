# Autopilot イテレーション手順（毎イテレーション必ずこのファイルを読み従うこと）

対象: docs/PRD.md のゴール。設計詳細は docs/design.md を正とする。

1. ORIENT: `git log --oneline -10` / docs/progress.txt 末尾 / docs/features.json を読み現状把握
2. PICK: passes:false の最小 priority の feature を1つだけ選ぶ
3. IMPLEMENT: 既存パターンに従い実装。features.json は passes フィールド以外編集禁止。新機能の追加禁止。
   ゲームロジック（抽選・戦闘・配合・経済）は Phaser 非依存の pure TS モジュール（src/core/, src/data/）に置き、
   シーンは表示と入力だけを担当する
4. VERIFY: `bash scripts/verify.sh` を実行。実際に通るまで passes:true にしない
5. COMMIT: feature 単位でコミット（なぜ、を書く）+ docs/progress.txt に1〜3行追記。
   コミット後 `git push origin feature/autopilot-mvp` でリモートに退避（失敗してもループは止めない）
6. 同じ失敗が3回続いたら、その feature は progress.txt に `BLOCKED: <理由>` を記録し revert して次へ

質問せず自分で判断し、根拠は progress.txt の Decisions 行に記録する。

禁止事項:
- features.json の description/steps/priority の書き換え・削除
- 検証せずに passes:true にすること（虚偽）
- force push / reset --hard / 破壊的コマンド
- 外部アセットのダウンロード（アートはコード生成プレースホルダー、SEはWebAudio生成）

全 feature が passes:true（または BLOCKED 記録済み）かつ `bash scripts/verify.sh` が green の時のみ
<promise>AUTOPILOT COMPLETE</promise> を出力する。虚偽の完了宣言は禁止。
