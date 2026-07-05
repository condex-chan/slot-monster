import Phaser from 'phaser'

// 共通パネル: 半透明の暗色板 + 枠線。結果画面・説明・選択パネルの下地を統一する
const PANEL_FILL = 0x1a1026
const PANEL_STROKE = 0xffe24a

export function addPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha = 0.92,
): Phaser.GameObjects.Rectangle {
  return scene.add
    .rectangle(x, y, width, height, PANEL_FILL, alpha)
    .setStrokeStyle(2, PANEL_STROKE, 0.85)
}
