// アセットmanifest生成: public/assets/ を走査して src/assets/manifest.json を書く。
// ゲームは manifest に載っているファイルだけをロードするため、存在しないアセットへの
// リクエスト（404）が発生しない。素材を置き替えたら `node scripts/gen-asset-manifest.mjs`。
//
// キー規約（src/assets/keys.ts と一致させる）:
//   images/symbols/<id>.png  -> symbol-<id>
//   images/monsters/<id>.png -> monster-<id>
//   images/<その他>.png       -> ファイル名そのまま（拡張子なし）
//   audio/<name>.<ext>       -> <name>
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp'])
export const AUDIO_EXTS = new Set(['.mp3', '.ogg', '.wav', '.m4a'])

/** images/ からの相対パスをテクスチャキーへ変換する */
export function imageKeyFor(relPath) {
  const stem = path.basename(relPath, path.extname(relPath))
  const dir = path.dirname(relPath)
  if (dir === 'symbols') return `symbol-${stem}`
  if (dir === 'monsters') return `monster-${stem}`
  return stem
}

/** audio/ からの相対パスをオーディオキーへ変換する */
export function audioKeyFor(relPath) {
  return path.basename(relPath, path.extname(relPath))
}

/** ディレクトリを再帰走査し、拡張子が合うファイルの相対パス一覧を返す（辞書順） */
export function scanFiles(rootDir, exts) {
  const found = []
  const walk = (dir, prefix) => {
    let entries
    try {
      entries = readdirSync(dir)
    } catch {
      return // ディレクトリが無ければ空（アセット不在は正常系）
    }
    for (const name of entries.sort()) {
      const full = path.join(dir, name)
      const rel = prefix ? `${prefix}/${name}` : name
      if (statSync(full).isDirectory()) walk(full, rel)
      else if (exts.has(path.extname(name).toLowerCase())) found.push(rel)
    }
  }
  walk(rootDir, '')
  return found
}

/** 走査結果から manifest オブジェクトを組み立てる（pure・テスト対象） */
export function buildManifest(imageFiles, audioFiles) {
  const images = {}
  for (const rel of imageFiles) images[imageKeyFor(rel)] = `assets/images/${rel}`
  const audio = {}
  for (const rel of audioFiles) audio[audioKeyFor(rel)] = `assets/audio/${rel}`
  return { images, audio }
}

/** projectRoot の public/assets/ を走査して src/assets/manifest.json を書き出す */
export function generate(projectRoot) {
  const manifest = buildManifest(
    scanFiles(path.join(projectRoot, 'public/assets/images'), IMAGE_EXTS),
    scanFiles(path.join(projectRoot, 'public/assets/audio'), AUDIO_EXTS),
  )
  const outFile = path.join(projectRoot, 'src/assets/manifest.json')
  mkdirSync(path.dirname(outFile), { recursive: true })
  writeFileSync(outFile, `${JSON.stringify(manifest, null, 2)}\n`)
  return manifest
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const manifest = generate(root)
  const nImages = Object.keys(manifest.images).length
  const nAudio = Object.keys(manifest.audio).length
  console.log(`manifest updated: ${nImages} image(s), ${nAudio} audio file(s)`)
}
