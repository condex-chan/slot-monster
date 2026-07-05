import Phaser from 'phaser'
import { persistToLocalStorage } from '../core/save'
import { gameState } from '../core/state'
import { setSfxMuted } from '../assets/sfx'
import { addButton } from './button'

/** ミュート設定をゲーム全体（Phaser音声=BGMとWebAudio SE）へ反映する */
export function applyMuted(game: Phaser.Game): void {
  game.sound.mute = gameState.muted
  setSfxMuted(gameState.muted)
}

/** ミュート切替ボタン（setOrigin(1,0)基準）。設定はセーブに含める */
export function addMuteButton(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Text {
  const label = () => (gameState.muted ? '🔇 ミュート中' : '🔊 サウンド')
  const button = addButton(scene, x, y, label(), {
    fontSize: 16,
    color: '#37474f',
    padding: { x: 10, y: 5 },
    origin: [1, 0],
    onClick: () => {
      gameState.muted = !gameState.muted
      applyMuted(scene.game)
      button.setText(label())
      persistToLocalStorage(gameState)
    },
  })
  return button
}
