# Autopilot v2 の始め方

v1（21 feature、feature/autopilot-mvp）完了後の磨き込みフェーズ。
新しいセッションで以下を実行するだけで開始できる。

## 起動コマンド

Claude Code の新セッションで:

```
/ralph-loop "docs/v2/LOOP_PROMPT.md を読み、その手順に厳密に従って docs/v2/PRD.md のゴールを自動実装する。完了宣言の条件も LOOP_PROMPT.md に従う。" --max-iterations 25 --completion-promise "AUTOPILOT V2 COMPLETE"
```

## ファイル構成

| ファイル | 役割 |
|---|---|
| docs/v2/PRD.md | v2 のゴール・スコープ・制約 |
| docs/v2/features.json | 9 feature（passes 以外編集禁止） |
| docs/v2/LOOP_PROMPT.md | 毎イテレーションの手順書 |
| docs/v2/asset-guide-images.md | 画像素材の生成ガイド（人間作業・並行可） |
| docs/v2/asset-guide-suno.md | BGM の生成ガイド（人間作業・並行可） |

## 人間側の並行作業（いつやってもいい）

アセット生成はオートパイロットと**独立に**進められる。
V2-F4/F5 が「素材が無くても動くパイプライン」を先に作るので、
素材が完成したら置くだけで反映される:

1. ガイドに従い画像 / BGM を生成
2. `public/assets/images/` / `public/assets/audio/` に規定ファイル名で配置
3. `node scripts/gen-asset-manifest.mjs`（V2-F4 完了後に存在する）
4. `bash scripts/verify.sh` で確認 → `bash scripts/package.sh` で itch.io 用 zip
