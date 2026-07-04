import { describe, expect, it } from 'vitest'
import { sfx } from '../src/assets/sfx'

// SE は WebAudio 動的生成のみ（外部ファイルなし）。
// AudioContext がない環境では無音の no-op として安全に呼べることを保証する
describe('sfx — WebAudio生成SE', () => {
  it('AudioContext がない環境でも全SEが例外なく呼べる（デッドロックしない）', () => {
    for (const name of Object.keys(sfx) as (keyof typeof sfx)[]) {
      expect(() => sfx[name](), name).not.toThrow()
    }
  })

  it('外部音源ファイルを参照しない（音声アセットが存在しない）', async () => {
    const fs = await import('node:fs')
    const files = fs.readdirSync('src', { recursive: true }) as string[]
    const audioFiles = files.filter((f) => /\.(mp3|wav|ogg|m4a)$/i.test(String(f)))
    expect(audioFiles).toEqual([])
  })
})
