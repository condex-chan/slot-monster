// WebAudio 生成SE（外部音源ファイルのDLなし、PRDの仮定）。
// AudioContext が使えない環境（テスト・非対応ブラウザ）では無音で何もしない
let ctx: AudioContext | null | undefined

function audioCtx(): AudioContext | null {
  if (ctx !== undefined) return ctx
  try {
    ctx = new AudioContext()
  } catch {
    ctx = null
  }
  return ctx
}

function tone(
  freq: number,
  durationMs: number,
  type: OscillatorType,
  volume: number,
  delayMs = 0,
): void {
  const c = audioCtx()
  if (!c) return
  try {
    if (c.state === 'suspended') void c.resume()
    const t0 = c.currentTime + delayMs / 1000
    const t1 = t0 + durationMs / 1000
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    gain.gain.setValueAtTime(volume, t0)
    gain.gain.exponentialRampToValueAtTime(0.0001, t1)
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start(t0)
    osc.stop(t1)
  } catch {
    /* 無音でよい */
  }
}

export const sfx = {
  /** スピン開始 */
  spin(): void {
    tone(196, 90, 'sawtooth', 0.04)
  },
  /** リール停止 */
  stop(): void {
    tone(523, 60, 'square', 0.05)
  },
  /** 役が揃った・払い出し */
  win(): void {
    tone(659, 110, 'square', 0.05)
    tone(880, 140, 'square', 0.05, 110)
  },
  /** ラッシュ突入カットイン */
  rush(): void {
    tone(330, 140, 'sawtooth', 0.06)
    tone(494, 140, 'sawtooth', 0.06, 140)
    tone(659, 260, 'sawtooth', 0.06, 280)
  },
  /** 戦闘のヒット */
  hit(): void {
    tone(110, 70, 'square', 0.05)
  },
  /** 勝利ファンファーレ */
  victory(): void {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, 160, 'triangle', 0.06, i * 150))
  },
  /** 敗北 */
  defeat(): void {
    tone(220, 300, 'triangle', 0.05)
    tone(165, 400, 'triangle', 0.05, 250)
  },
}
