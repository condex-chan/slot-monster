# BGM 生成ガイド（Suno 用）

Suno でゲーム用 BGM を生成して組み込むための仕様書。
**オートパイロット v2 と独立に進められる。** 生成が終わったら「配置と反映」どおり
ファイルを置くだけでよい（コード変更不要）。

## 必要なトラック（3本）

| ファイル名 | 用途 | 長さの目安 | 雰囲気 |
|---|---|---|---|
| bgm-main.mp3 | 通常スロット画面（ループ） | 60〜120秒 | 軽快・カジノ・中毒性。ずっと聴いても疲れない |
| bgm-battle.mp3 | バトルラッシュ（ループ） | 60〜90秒 | アップテンポ・高揚感。「当たった！」の興奮を持続させる |
| jingle-win.mp3 | 勝利ジングル（1回再生） | 4〜8秒 | 短いファンファーレ |

## Suno での作り方

1. **必ず Instrumental（歌なし）モードで生成する**（Custom モードで Instrumental を ON）
2. Style of Music 欄に下記プロンプトを貼る（Lyrics は空でよい）
3. 気に入るまで数回生成 → ダウンロードは **MP3** でOK

### プロンプト案

**bgm-main（通常時）:**
```
upbeat chiptune casino loop, playful 8-bit slot machine music, bouncy bassline,
bright arpeggios, catchy and repetitive, video game background music, 120 bpm, instrumental
```

**bgm-battle（ラッシュ）:**
```
intense chiptune battle theme, fast energetic 8-bit boss music, driving drums,
heroic melody, rising tension, retro video game, 150 bpm, instrumental
```

**jingle-win（勝利）:**
```
short victory fanfare, triumphant 8-bit jingle, celebratory, video game level clear sound, instrumental
```

※ 画像素材をチップチューン以外の画風にした場合は `chiptune / 8-bit` を
`orchestral` や `jazzy lounge` 等に置き換えて世界観を合わせる。

## ループ用の選び方のコツ

- Suno の曲は「イントロ→展開→アウトロ」構造になりがち。**イントロとアウトロが
  短い（またはほぼ無い）テイク**を選ぶとループの継ぎ目が気になりにくい
- 組み込み側でフェードイン/アウトを入れるので、完全なシームレスループでなくてよい
- 曲全体でテンポと音量感が一定のテイクが向いている。後半で盛り上がりすぎて
  音圧が変わるものは避ける
- 2曲（main/battle）は**同じ系統のプロンプトから派生**させると統一感が出る

## 配置と反映

```bash
# 1. 配置（ファイル名は正確に）
public/assets/audio/bgm-main.mp3
public/assets/audio/bgm-battle.mp3
public/assets/audio/jingle-win.mp3

# 2. manifest 更新（V2-F5 完了後に存在するスクリプト）
node scripts/gen-asset-manifest.mjs

# 3. 検証と再パッケージ
bash scripts/verify.sh
bash scripts/package.sh
```

一部だけ置いても動く（無い分は無音のまま、効果音は従来どおり WebAudio 生成）。
README.md のクレジット欄に「BGM: Suno で生成」を記載すること。

## 注意

- Suno の利用規約上、**商用利用の可否はプランに依存**する（無料プランは非商用のみ）。
  itch.io で無料公開なら通常は問題ないが、有料販売するなら有料プランで生成した曲を使うこと
- ファイルサイズ目安: 3本合計 5〜10MB 程度なら itch.io のブラウザゲームとして問題ない
