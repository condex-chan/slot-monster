// スプライトキーの一元管理。後日フリー素材へ差し替える際は
// このキーに対するテクスチャ登録（生成→ロード）だけを差し替えればよい
import type { SymbolId } from '../core/reels'
import type { SpeciesId } from '../data/monsters'

export const symbolTextureKey = (id: SymbolId) => `symbol-${id}`
export const monsterTextureKey = (id: SpeciesId) => `monster-${id}`
