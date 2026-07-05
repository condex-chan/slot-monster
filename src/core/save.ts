// セーブ/ロード（pure TS）。ストレージは注入可能にしてテストでは偽物を使う。
// 壊れた・型が合わないデータは黙って初期状態にフォールバックする
import { createInitialState, type GameState } from './state'
import { normalizeMuted } from './audio'
import { normalizeBetLines } from './lines'
import { normalizeGuide } from './onboarding'
import { MATERIALS } from '../data/materials'
import { SKILLS, SPECIES } from '../data/monsters'

export const SAVE_KEY = 'slot-monster-save-v1'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem?(key: string): void
}

/** セーブを消す（タイトルの「はじめから」用）。removeItem の無い環境は空文字で潰す */
export function clearSave(storage: StorageLike): void {
  if (storage.removeItem) storage.removeItem(SAVE_KEY)
  else storage.setItem(SAVE_KEY, '')
}

export function saveState(state: GameState, storage: StorageLike): void {
  storage.setItem(SAVE_KEY, JSON.stringify(state))
}

/** 保存データを読み込む。ない・壊れている・不正な形は初期状態を返す */
export function loadState(storage: StorageLike): GameState {
  try {
    const raw = storage.getItem(SAVE_KEY)
    if (!raw) return createInitialState()
    const data: unknown = JSON.parse(raw)
    if (!isValidSave(data)) return createInitialState()
    // 既知のフィールドだけ取り出す（古い保存に紛れた余計なキーを持ち込まない）
    return {
      coins: data.coins,
      spinsSinceBattle: data.spinsSinceBattle,
      roster: data.roster,
      party: data.party,
      nextUid: data.nextUid,
      eggs: data.eggs,
      materials: {
        dew: data.materials.dew,
        meat: data.materials.meat,
        shard: data.materials.shard,
        feather: data.materials.feather,
      },
      floor: data.floor,
      bestFloor: data.bestFloor,
      discovered: data.discovered,
      autoSpin: data.autoSpin,
      // ガイドは後付けフィールド: v1セーブに無い場合はプレイ済みとみなし再表示しない
      guide: normalizeGuide((data as { guide?: unknown }).guide),
      // ミュートも後付けフィールド: 無ければ音あり
      muted: normalizeMuted((data as { muted?: unknown }).muted),
      // ベットライン数も後付け: 無ければ1ライン
      betLines: normalizeBetLines((data as { betLines?: unknown }).betLines),
    }
  } catch {
    return createInitialState()
  }
}

/** 有効なセーブデータが存在するか（タイトル画面の「つづきから」表示判定） */
export function hasSave(storage: StorageLike): boolean {
  try {
    const raw = storage.getItem(SAVE_KEY)
    if (!raw) return false
    return isValidSave(JSON.parse(raw))
  } catch {
    return false
  }
}

function isValidSave(d: unknown): d is GameState {
  if (typeof d !== 'object' || d === null) return false
  const s = d as Record<string, unknown>
  const numbers = ['coins', 'spinsSinceBattle', 'nextUid', 'eggs', 'floor', 'bestFloor']
  if (numbers.some((k) => typeof s[k] !== 'number' || !Number.isFinite(s[k] as number))) {
    return false
  }
  if (typeof s.autoSpin !== 'boolean') return false
  if (!Array.isArray(s.roster) || !Array.isArray(s.party) || !Array.isArray(s.discovered)) {
    return false
  }
  if (s.party.length !== 3) return false
  const speciesIds = new Set<string>(SPECIES.map((x) => x.id))
  for (const m of s.roster as Array<Record<string, unknown>>) {
    if (typeof m !== 'object' || m === null) return false
    if (typeof m.uid !== 'string') return false
    if (typeof m.speciesId !== 'string' || !speciesIds.has(m.speciesId)) return false
    if (typeof m.skillId !== 'string' || !SKILLS[m.skillId]) return false
    const bonus = m.bonus as Record<string, unknown> | null
    if (typeof bonus !== 'object' || bonus === null) return false
    if (['hp', 'atk', 'def', 'spd'].some((k) => typeof bonus[k] !== 'number')) return false
  }
  const rosterUids = new Set((s.roster as Array<{ uid: string }>).map((m) => m.uid))
  if (rosterUids.size !== (s.roster as unknown[]).length) return false
  for (const uid of s.party) {
    if (typeof uid !== 'string' || !rosterUids.has(uid)) return false
  }
  for (const sp of s.discovered) {
    if (typeof sp !== 'string' || !speciesIds.has(sp)) return false
  }
  const materials = s.materials as Record<string, unknown> | null
  if (typeof materials !== 'object' || materials === null) return false
  if (MATERIALS.some((mat) => typeof materials[mat.id] !== 'number')) return false
  return true
}

// ---- ブラウザ用の薄いラッパー（プライベートモード等で失敗しても無視） ----

export function persistToLocalStorage(state: GameState): void {
  try {
    saveState(state, window.localStorage)
  } catch {
    /* 保存できない環境では諦める */
  }
}

export function restoreIntoGameState(state: GameState): void {
  try {
    Object.assign(state, loadState(window.localStorage))
  } catch {
    /* 読めない環境は初期状態のまま */
  }
}

export function hasSavedGame(): boolean {
  try {
    return hasSave(window.localStorage)
  } catch {
    return false
  }
}

export function clearSavedGame(): void {
  try {
    clearSave(window.localStorage)
  } catch {
    /* 消せない環境では諦める */
  }
}
