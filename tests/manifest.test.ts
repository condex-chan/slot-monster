import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  audioKeyFor,
  buildManifest,
  generate,
  imageKeyFor,
} from '../scripts/gen-asset-manifest.mjs'
import { monsterTextureKey, symbolTextureKey } from '../src/assets/keys'

describe('imageKeyFor — キー規約が keys.ts と一致する', () => {
  it('symbols/ 配下は symbolTextureKey と同じキーになる', () => {
    expect(imageKeyFor('symbols/copper.png')).toBe(symbolTextureKey('copper'))
    expect(imageKeyFor('symbols/flash.png')).toBe(symbolTextureKey('flash'))
  })

  it('monsters/ 配下は monsterTextureKey と同じキーになる', () => {
    expect(imageKeyFor('monsters/wolfy.png')).toBe(monsterTextureKey('wolfy'))
    expect(imageKeyFor('monsters/prisma.png')).toBe(monsterTextureKey('prisma'))
  })

  it('直下のファイルは拡張子なしのファイル名がキー', () => {
    expect(imageKeyFor('title-bg.png')).toBe('title-bg')
  })
})

describe('audioKeyFor', () => {
  it('拡張子なしのファイル名がキー', () => {
    expect(audioKeyFor('bgm-main.mp3')).toBe('bgm-main')
    expect(audioKeyFor('jingle-win.ogg')).toBe('jingle-win')
  })
})

describe('buildManifest', () => {
  it('走査結果を public 配信パスへ対応づける', () => {
    const manifest = buildManifest(['symbols/copper.png'], ['bgm-main.mp3'])
    expect(manifest).toEqual({
      images: { 'symbol-copper': 'assets/images/symbols/copper.png' },
      audio: { 'bgm-main': 'assets/audio/bgm-main.mp3' },
    })
  })

  it('アセットなしでは空の manifest（ロード対象0＝404リクエストなし）', () => {
    expect(buildManifest([], [])).toEqual({ images: {}, audio: {} })
  })
})

describe('generate — 実ディレクトリ走査から manifest.json 生成まで', () => {
  it('ダミーPNGを置いて生成すると、そのキーが manifest に載る', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'manifest-test-'))
    mkdirSync(path.join(root, 'public/assets/images/symbols'), { recursive: true })
    mkdirSync(path.join(root, 'public/assets/images/monsters'), { recursive: true })
    writeFileSync(path.join(root, 'public/assets/images/symbols/copper.png'), 'dummy')
    writeFileSync(path.join(root, 'public/assets/images/monsters/wolfy.png'), 'dummy')
    // 対象外の拡張子は無視される
    writeFileSync(path.join(root, 'public/assets/images/symbols/readme.txt'), 'x')

    const manifest = generate(root)
    expect(manifest.images).toEqual({
      'symbol-copper': 'assets/images/symbols/copper.png',
      'monster-wolfy': 'assets/images/monsters/wolfy.png',
    })
    const written = JSON.parse(
      readFileSync(path.join(root, 'src/assets/manifest.json'), 'utf8'),
    )
    expect(written).toEqual(manifest)
  })

  it('public/assets/ が存在しなくても空 manifest を生成する（アセット不在は正常系）', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'manifest-empty-'))
    expect(generate(root)).toEqual({ images: {}, audio: {} })
  })
})
