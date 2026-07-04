// E2E スモーク: 起動→スピン→（__DEBUG__で）ラッシュ突入→戦闘進行→結果画面到達。
// __DEBUG__ フックは mode=e2e ビルドのみ露出するため、dist-e2e/ に別ビルドして配信する
// （本番 dist/ と中身は同一構成、フックの有無だけが差分）
import { execSync } from 'node:child_process'
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist-e2e')
const PORT = 8123

console.log('[e2e] build (mode=e2e) ...')
execSync('npx vite build --mode e2e --outDir dist-e2e', { cwd: ROOT, stdio: 'inherit' })

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
}
const server = http.createServer(async (req, res) => {
  try {
    const urlPath = req.url === '/' ? '/index.html' : (req.url ?? '/').split('?')[0]
    if (urlPath === '/favicon.ico') {
      res.writeHead(204)
      res.end()
      return
    }
    const data = await readFile(path.join(DIST, urlPath))
    res.writeHead(200, { 'Content-Type': MIME[path.extname(urlPath)] ?? 'application/octet-stream' })
    res.end(data)
  } catch {
    res.writeHead(404)
    res.end()
  }
})
await new Promise((resolve) => server.listen(PORT, resolve))

const consoleErrors = []
let browser
let failed = false
try {
  browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--autoplay-policy=no-user-gesture-required',
    ],
  })
  const page = await browser.newPage()
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(String(err)))

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load', timeout: 20000 })

  // 1. 起動: canvas 表示と Main シーン到達
  await page.waitForSelector('canvas', { timeout: 15000 })
  await page.waitForFunction(() => window.__DEBUG__ !== undefined, { timeout: 15000 })
  await page.waitForFunction(() => window.__DEBUG__.activeScene().includes('Main'), {
    timeout: 15000,
  })
  console.log('[e2e] boot -> Main OK')

  // 2. スピン: コイン残高が変化する（ベット消費±払い出し）
  const coinsBefore = await page.evaluate(() => window.__DEBUG__.state.coins)
  await page.evaluate(() => window.__DEBUG__.spinOnce())
  const coinsAfter = await page.evaluate(() => window.__DEBUG__.state.coins)
  if (coinsBefore === coinsAfter) throw new Error('spin did not change coins')
  console.log(`[e2e] spin OK (coins ${coinsBefore} -> ${coinsAfter})`)

  // 3. 天井を強制してラッシュ突入 → Battle シーン
  await page.evaluate(() => {
    window.__DEBUG__.forceRush()
    window.__DEBUG__.spinOnce()
  })
  await page.waitForFunction(() => window.__DEBUG__.activeScene().includes('Battle'), {
    timeout: 15000,
  })
  console.log('[e2e] rush entry -> Battle OK')

  // 4. 戦闘を進めて結果画面到達
  await page.evaluate(() => window.__DEBUG__.fastForwardBattle())
  await page.waitForFunction(() => window.__DEBUG__.battleOver(), { timeout: 15000 })
  console.log('[e2e] battle -> result OK')

  // 5. コンソールエラー 0 件
  if (consoleErrors.length > 0) {
    console.error('[e2e] console errors detected:')
    for (const e of consoleErrors) console.error('  -', e)
    throw new Error(`${consoleErrors.length} console error(s)`)
  }
  console.log('[e2e] PASS (console errors: 0)')
} catch (err) {
  failed = true
  console.error('[e2e] FAIL:', err.message ?? err)
} finally {
  await browser?.close()
  server.close()
}
process.exit(failed ? 1 : 0)
