// BGM再生の薄いレイヤー。どの曲を流すかの判定は core/audio.ts。
// ファイルが manifest に無い（=ロードされていない）場合は無音のまま何もしない
import type Phaser from 'phaser'
import { JINGLE_WIN, bgmTransition, type BgmTrack } from '../core/audio'

const FADE_MS = 400
const BGM_VOLUME = 0.45
const JINGLE_VOLUME = 0.6

class BgmPlayer {
  private sound: Phaser.Sound.BaseSound | null = null
  private track: BgmTrack | null = null

  /** シーン入場時に呼ぶ。必要ならフェードで切り替える */
  enter(scene: Phaser.Scene, sceneKey: string): void {
    const { stop, play } = bgmTransition(this.track, sceneKey)
    if (stop) this.fadeOutCurrent(scene)
    if (play === null) {
      if (stop) this.track = null
      return
    }
    this.track = play
    if (!scene.cache.audio.exists(play)) return // アセット不在: 無音のまま
    const sound = scene.sound.add(play, { loop: true, volume: 0 })
    sound.play()
    scene.tweens.add({ targets: sound, volume: BGM_VOLUME, duration: FADE_MS })
    this.sound = sound
  }

  /** 勝利ジングル: BGMを止めて一度だけ鳴らす。次のシーン入場で通常BGMに戻る */
  victoryJingle(scene: Phaser.Scene): void {
    this.fadeOutCurrent(scene)
    this.track = null
    if (!scene.cache.audio.exists(JINGLE_WIN)) return
    scene.sound.add(JINGLE_WIN, { volume: JINGLE_VOLUME }).play()
  }

  private fadeOutCurrent(scene: Phaser.Scene): void {
    const old = this.sound
    this.sound = null
    if (!old) return
    scene.tweens.add({
      targets: old,
      volume: 0,
      duration: FADE_MS,
      onComplete: () => {
        old.stop()
        old.destroy()
      },
    })
  }
}

/** シーン横断のBGM状態（サウンドはゲーム全体で共有されるため単一インスタンス） */
export const bgm = new BgmPlayer()
