// プレースホルダー図柄のコード生成（外部アセットDL禁止のため）。
// 図柄ごとに色＋シルエットを変えて視認で区別できるようにする
import Phaser from 'phaser'
import { REEL_STRIP, type SymbolId } from '../core/reels'
import { SPECIES, type Lineage, type SpeciesDef } from '../data/monsters'
import { monsterTextureKey, symbolTextureKey } from './keys'

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

// ---- モンスター（系統色×シルエット差のプレースホルダー） ----

export const MONSTER_SIZE = 96

const LINEAGE_COLOR: Record<Lineage, { main: number; accent: number }> = {
  beast: { main: 0xd68f4c, accent: 0x8a5a2a },
  dragon: { main: 0xe05252, accent: 0x8f2e2e },
  slime: { main: 0x5ee07a, accent: 0x2e8f46 },
  undead: { main: 0xa07ce0, accent: 0x5c3e94 },
}

export function generateMonsterTextures(scene: Phaser.Scene) {
  for (const species of SPECIES) {
    const key = monsterTextureKey(species.id)
    if (scene.textures.exists(key)) continue
    const g = scene.add.graphics()
    drawMonster(g, species)
    g.generateTexture(key, MONSTER_SIZE, MONSTER_SIZE)
    g.destroy()
  }
}

function drawMonster(g: Phaser.GameObjects.Graphics, species: SpeciesDef) {
  const { main, accent } = LINEAGE_COLOR[species.lineage]
  const body = species.tier === 'fusion' ? accent : main
  const { look } = species
  // 体型ごとの頭アンカー（目・ツノの基準点）
  let headX = 48
  let headY = 40

  switch (look.body) {
    case 'blob':
      g.fillStyle(body)
      g.fillEllipse(48, 58, 64, 52)
      headX = 48
      headY = 50
      break
    case 'quad':
      g.fillStyle(body)
      g.fillEllipse(48, 54, 62, 38)
      g.fillRect(30, 66, 8, 18)
      g.fillRect(58, 66, 8, 18)
      g.fillCircle(70, 40, 15)
      g.fillTriangle(60, 30, 66, 14, 72, 28) // 耳
      headX = 72
      headY = 38
      break
    case 'biped':
      g.fillStyle(body)
      g.fillRoundedRect(32, 42, 32, 36, 8)
      g.fillRect(36, 78, 10, 10)
      g.fillRect(50, 78, 10, 10)
      g.fillCircle(48, 30, 16)
      headX = 48
      headY = 28
      break
    case 'serpent':
      g.fillStyle(body)
      g.fillCircle(30, 70, 14)
      g.fillCircle(42, 58, 13)
      g.fillCircle(54, 46, 12)
      g.fillCircle(66, 34, 13)
      headX = 66
      headY = 32
      break
    case 'ghost':
      g.fillStyle(body)
      g.fillEllipse(48, 44, 52, 48)
      g.fillTriangle(22, 60, 36, 60, 29, 80)
      g.fillTriangle(40, 62, 56, 62, 48, 84)
      g.fillTriangle(60, 60, 74, 60, 67, 80)
      headX = 48
      headY = 40
      break
  }

  if (look.horns) {
    g.fillStyle(0xf5e6c8)
    g.fillTriangle(headX - 12, headY - 10, headX - 8, headY - 26, headX - 3, headY - 10)
    g.fillTriangle(headX + 3, headY - 10, headX + 8, headY - 26, headX + 12, headY - 10)
  }
  if (look.wings) {
    g.fillStyle(accent === body ? main : accent)
    g.fillTriangle(10, 50, 30, 38, 30, 60)
    g.fillTriangle(86, 50, 66, 38, 66, 60)
  }
  if (look.spikes) {
    g.fillStyle(0xffe24a)
    g.fillTriangle(34, 30, 40, 14, 46, 30)
    g.fillTriangle(44, 28, 50, 10, 56, 28)
    g.fillTriangle(54, 30, 60, 14, 66, 30)
  }
  if (look.ribs) {
    g.fillStyle(0xf0f0f0)
    g.fillRect(38, 52, 22, 3)
    g.fillRect(38, 60, 22, 3)
    g.fillRect(38, 68, 22, 3)
  }
  // 隠し種はにじ模様を重ねる
  if (species.tier === 'hidden') {
    g.fillStyle(0xff5fd7, 0.45)
    g.fillEllipse(36, 56, 20, 14)
    g.fillStyle(0x33e0ff, 0.45)
    g.fillEllipse(58, 62, 20, 14)
    g.fillStyle(0xffe24a, 0.45)
    g.fillEllipse(48, 44, 20, 14)
  }
  // 目
  g.fillStyle(0x1a1026)
  const eyeOffsets = look.eyes === 1 ? [0] : look.eyes === 2 ? [-6, 6] : [-8, 0, 8]
  for (const dx of eyeOffsets) g.fillCircle(headX + dx, headY, 3.5)
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
