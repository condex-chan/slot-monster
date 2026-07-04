import Phaser from 'phaser'

// 共通ボタンファクトリ。全シーンのボタンはここを経由して
// ホバー（明るく）・押下（沈む）のフィードバックを統一する。
// 返り値は Text のまま: 既存の setText / disableInteractive / setAlpha による
// 状態制御と共存できる。動的に背景色を変える場合は setButtonColor を使う

export interface ButtonOptions {
  fontSize?: number
  /** 背景色（'#rrggbb'） */
  color?: string
  padding?: { x: number; y: number }
  origin?: [number, number]
  onClick?: () => void
}

const DEFAULT_COLOR = '#7a2ea0'

/** '#rrggbb' を明るくする（ホバー表示用） */
export function lighten(hex: string, amount = 36): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.min(255, v + amount)
  const r = ch((n >> 16) & 0xff)
  const g = ch((n >> 8) & 0xff)
  const b = ch(n & 0xff)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

/** ボタンの基準背景色を変更する（オート ON/OFF のような状態色に使う） */
export function setButtonColor(button: Phaser.GameObjects.Text, color: string): void {
  button.setData('baseBg', color)
  button.setBackgroundColor(color)
}

export function addButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  options: ButtonOptions = {},
): Phaser.GameObjects.Text {
  const color = options.color ?? DEFAULT_COLOR
  const [ox, oy] = options.origin ?? [0.5, 0.5]
  const button = scene.add
    .text(x, y, label, {
      fontSize: `${options.fontSize ?? 20}px`,
      color: '#ffffff',
      backgroundColor: color,
      padding: options.padding ?? { x: 14, y: 7 },
    })
    .setOrigin(ox, oy)
    .setInteractive({ useHandCursor: true })
  button.setData('baseBg', color)

  button.on('pointerover', () => button.setBackgroundColor(lighten(button.getData('baseBg'))))
  button.on('pointerout', () => {
    button.setBackgroundColor(button.getData('baseBg'))
    button.setScale(1)
  })
  button.on('pointerup', () => button.setScale(1))
  // 操作は押した瞬間に発火（目押しのタイミングを変えない）。沈み込みは演出のみ
  button.on('pointerdown', () => {
    button.setScale(0.94)
    options.onClick?.()
  })
  return button
}
