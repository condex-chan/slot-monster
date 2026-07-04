// スプライトキーの一元管理。後日フリー素材へ差し替える際は
// このキーに対するテクスチャ登録（生成→ロード）だけを差し替えればよい
import type { SymbolId } from '../core/reels'

export const symbolTextureKey = (id: SymbolId) => `symbol-${id}`
