import Phaser from 'phaser'

// シーン遷移のフェードイン/アウト。背景色に合わせて黒でなく紺で繋ぐ
const FADE_MS = 160
const R = 0x1a
const G = 0x10
const B = 0x26

/** シーン create の先頭で呼ぶ入場フェード */
export function fadeIn(scene: Phaser.Scene): void {
  scene.cameras.main.fadeIn(FADE_MS, R, G, B)
}

/** フェードアウト完了後にシーンを切り替える。フェード中の連打は無視 */
export function fadeToScene(scene: Phaser.Scene, key: string): void {
  const camera = scene.cameras.main
  if (camera.fadeEffect.isRunning) return
  camera.fadeOut(FADE_MS, R, G, B)
  camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start(key))
}
