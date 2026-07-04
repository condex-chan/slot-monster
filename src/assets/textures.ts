// プレースホルダー図柄のコード生成（外部アセットDL禁止のため）。
// 図柄ごとに色＋シルエットを変えて視認で区別できるようにする
import Phaser from 'phaser'
import { REEL_STRIP, type SymbolId } from '../core/reels'
import { symbolTextureKey } from './keys'

export const SYMBOL_SIZE = 88
const C = SYMBOL_SIZE / 2 // 中心座標

export function generateSymbolTextures(scene: Phaser.Scene) {
  for (const id of REEL_STRIP) {
    const key = symbolTextureKey(id)
    if (scene.textures.exists(key)) continue
    const g = scene.add.graphics()
    drawSymbol(g, id)
    g.generateTexture(key, SYMBOL_SIZE, SYMBOL_SIZE)
    g.destroy()
  }
}

function drawSymbol(g: Phaser.GameObjects.Graphics, id: SymbolId) {
  switch (id) {
    case 'copper':
      drawCoin(g, 0xb87333, 0x8a5322)
      break
    case 'silver':
      drawCoin(g, 0xc8c8d0, 0x94949e)
      break
    case 'gold':
      drawCoin(g, 0xffd700, 0xc7a600)
      break
    case 'egg':
      g.fillStyle(0xfff1d0)
      g.fillEllipse(C, C + 4, 52, 64)
      g.fillStyle(0xf0d9a8)
      g.fillEllipse(C - 8, C - 8, 14, 20)
      break
    case 'sword':
      g.fillStyle(0x9db4c0)
      g.fillTriangle(C, 6, C - 7, 18, C + 7, 18)
      g.fillRect(C - 7, 18, 14, 38)
      g.fillStyle(0x6b4f2a)
      g.fillRect(C - 19, 56, 38, 8)
      g.fillRect(C - 5, 64, 10, 18)
      break
    case 'heart':
      g.fillStyle(0xe0245a)
      g.fillCircle(C - 13, C - 10, 17)
      g.fillCircle(C + 13, C - 10, 17)
      g.fillTriangle(C - 28, C - 2, C + 28, C - 2, C, C + 32)
      break
    case 'star':
      g.fillStyle(0xffe24a)
      g.fillPoints(starPoints(C, C, 34, 14, 5), true)
      break
    case 'door':
      g.fillStyle(0x8b5a2b)
      g.fillRoundedRect(C - 20, C - 32, 40, 62, 6)
      g.fillStyle(0x5d3a18)
      g.fillRoundedRect(C - 14, C - 26, 28, 50, 4)
      g.fillStyle(0xffd700)
      g.fillCircle(C + 8, C + 2, 4)
      break
    case 'flash':
      g.fillStyle(0x33e0ff)
      g.fillPoints(
        [
          new Phaser.Geom.Point(C + 6, 8),
          new Phaser.Geom.Point(C - 18, C + 6),
          new Phaser.Geom.Point(C - 2, C + 6),
          new Phaser.Geom.Point(C - 8, 80),
          new Phaser.Geom.Point(C + 20, C - 6),
          new Phaser.Geom.Point(C + 2, C - 6),
        ],
        true,
      )
      break
  }
}

function drawCoin(g: Phaser.GameObjects.Graphics, main: number, rim: number) {
  g.fillStyle(rim)
  g.fillCircle(C, C, 34)
  g.fillStyle(main)
  g.fillCircle(C, C, 27)
}

function starPoints(cx: number, cy: number, outer: number, inner: number, spikes: number) {
  const points: Phaser.Geom.Point[] = []
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const angle = (Math.PI / spikes) * i - Math.PI / 2
    points.push(new Phaser.Geom.Point(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r))
  }
  return points
}
