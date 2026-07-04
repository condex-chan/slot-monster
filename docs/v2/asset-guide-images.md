# 画像素材 生成ガイド（NovelAI / ローカル Stable Diffusion 用）

ゲーム内の全スプライトを画像AIで生成して差し替えるための仕様書。
**このガイドはオートパイロット v2 と独立に進められる。** 生成が終わったら
「配置と反映」の手順どおりファイルを置くだけでよい（コード変更不要）。

## 共通仕様

- 形式: **PNG、背景透過**（推奨）
- 生成サイズ: **512×512**（ゲーム側で縮小する。表示は 96px/88px なので余裕があれば十分）
- 構図: **1体のみ・全身・正面〜やや斜め・中央配置**、キャンバスの8割程度に収める
- 背景透過が難しい場合: **単色の真緑 (#00FF00) か真マゼンタ (#FF00FF) の無地背景**で生成
  → 組み込み時にこちらで抜く。白背景は図柄と混ざるので避ける
  （ローカルSDなら拡張の rembg / ABG Remover で透過にするのが楽）
- **スタイル統一のコツ**: 全カットで同じスタイルプロンプト（下記プレフィックス）を使い、
  同じモデル・同じ設定で一括生成する。気に入った1枚が出たらその seed を控えて
  バリエーション生成すると揃いやすい

## プロンプトのベース

**共通プレフィックス（毎回先頭に付ける）:**

```
game asset, cute chibi monster, full body, front view, simple flat colors,
thick clean outlines, cel shading, centered composition, plain green background, no text
```

**共通ネガティブプロンプト:**

```
realistic, photo, 3d render, text, watermark, signature, human, multiple characters,
complex background, cropped, blurry
```

## モンスター 15 体

保存先: `public/assets/images/monsters/<ファイル名>.png`
系統ごとに色味を揃えること（獣=オレンジ茶 / ドラゴン=赤 / スライム=緑 / アンデッド=紫）。

| ファイル名 | 名前 | 系統・色 | プロンプト追記（プレフィックスの後ろに） |
|---|---|---|---|
| wolfy.png | ウルフィ | 獣・明るいオレンジ茶 | small orange wolf cub, four legs, pointed ears, friendly |
| draco.png | ドラコ | 竜・明るい赤 | small red baby dragon, standing on two legs, tiny wings, small horns |
| pururu.png | プルル | スライム・明るい緑 | round green slime blob, big eyes, glossy, bouncy |
| bones.png | ボーンズ | 不死・薄紫 | small purple skeleton imp, visible ribs, standing, mischievous |
| garm.png | ガルム | 獣・濃い茶 | large fierce brown wolf, horns, four legs, battle-ready |
| lindwurm.png | リンドヴルム | 竜・深紅 | crimson serpent dragon, long coiled body, horns, spiky wings |
| kingpururu.png | キングプルル | スライム・深緑 | big green king slime wearing a small gold crown, majestic |
| lich.png | リッチ | 不死・濃紫 | dark purple ghost lich, one glowing eye, horned hood, floating |
| wyvern.png | ワイバーン | 竜・赤 | red wyvern, two legs, large wings spread, sharp beak |
| mossle.png | モスプル | 獣・苔色がかった茶 | moss-covered beast, four legs, leaf sprouts on back, gentle |
| zombiewolf.png | ゾンビウルフ | 不死・くすんだ紫 | undead zombie wolf, one eye, exposed ribs, tattered, eerie |
| geldra.png | ゲルドラゴン | 竜・暗赤 | gel-covered serpent dragon, horns, dripping slime, semi-transparent body |
| dragonzombie.png | ドラゴンゾンビ | 不死・紫 | rotting undead dragon, bone wings, one eye, decaying scales |
| ghostpull.png | ゴスプル | 不死・薄紫半透明 | pale purple ghost slime, wispy bottom, translucent, spooky cute |
| prisma.png | にじプル | スライム（隠し）・虹色 | rainbow iridescent slime, three eyes, tiny fairy wings, sparkling, legendary aura |

## スロット図柄 9 種

保存先: `public/assets/images/symbols/<ファイル名>.png`
モンスターより**アイコン寄り**（マーク然とした見た目）にする。プレフィックスの
`cute chibi monster` を `slot machine symbol icon, bold glossy emblem` に差し替えるとよい。

| ファイル名 | 図柄 | プロンプト追記 |
|---|---|---|
| copper.png | 銅コイン | bronze copper coin, embossed, round |
| silver.png | 銀コイン | shiny silver coin, embossed, round |
| gold.png | 金コイン | shiny gold coin, embossed, round, radiant |
| egg.png | タマゴ | cream colored monster egg with spots |
| sword.png | 剣 | fantasy short sword, blue steel blade, upright |
| heart.png | ハート | glossy red heart |
| star.png | 星 | glossy golden five-pointed star |
| door.png | 扉 | ornate wooden dungeon door with gold knob, slightly glowing |
| flash.png | フラッシュ | electric blue lightning bolt, glowing |

## 品質チェックリスト（生成後にセルフチェック）

- [ ] 24点すべて同じ画風に見える（並べて違和感がない）
- [ ] 背景が透過 or 指定単色になっている
- [ ] 96px まで縮小しても何のアイコンか判別できる（細部が潰れない太い線か）
- [ ] 系統色が守られている（獣=橙茶・竜=赤・スライム=緑・不死=紫）
- [ ] にじプル（隠し種）だけ明確に「特別感」がある

## 配置と反映

```bash
# 1. 上記の通りに配置
public/assets/images/monsters/*.png   # 15ファイル
public/assets/images/symbols/*.png    # 9ファイル

# 2. manifest 更新（V2-F4 完了後に存在するスクリプト）
node scripts/gen-asset-manifest.mjs

# 3. 検証と再パッケージ
bash scripts/verify.sh
bash scripts/package.sh
```

一部だけ置いても動く（無い分はプレースホルダーのまま）。
最後に README.md のクレジット欄へ使用モデル名を記載すること（itch.io の AI 開示は設定済み）。
