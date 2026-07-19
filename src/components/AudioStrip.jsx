import { useSyncExternalStore } from 'react'
import { subscribe, getState, toggle, cycleRate } from '../lib/audio.js'

export function useAudio() {
  return useSyncExternalStore(subscribe, getState)
}

const fmt = (s) => {
  if (!isFinite(s) || s <= 0) return '--:--'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

const playIcon = (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
    <path d="M5.5 3.5v11l9-5.5-9-5.5z" />
  </svg>
)
const pauseIcon = (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
    <path d="M4.5 3.5h3v11h-3zM10.5 3.5h3v11h-3z" />
  </svg>
)

export default function AudioStrip() {
  const a = useAudio()
  const playing = a.status === 'playing' || a.status === 'loading'
  const ratio = a.duration > 0 ? Math.min(1, a.currentTime / a.duration) : 0

  if (a.status === 'error') {
    return (
      <div className="audio-strip">
        <span className="audio-error">朗読を読み込めませんでした</span>
        <button className="rate-chip" onClick={toggle}>再試行</button>
      </div>
    )
  }

  return (
    <div className="audio-strip">
      <div className="audio-hairline" style={{ transform: `scaleX(${ratio})` }} />
      <button
        className={playing ? 'audio-play on' : 'audio-play'}
        onClick={toggle}
        aria-label={playing ? '朗読を一時停止' : '朗読を再生'}
      >
        {playing ? pauseIcon : playIcon}
      </button>
      <span className={a.status === 'loading' ? 'audio-time dim' : 'audio-time'}>
        {fmt(a.currentTime)} / {fmt(a.duration)}
      </span>
      <button className="rate-chip" onClick={cycleRate} aria-label="再生速度を変更">
        {a.rate}x
      </button>
    </div>
  )
}

export function NextChapterPrompt({ visible, onListen, onDismiss }) {
  return (
    <div className={visible ? 'next-prompt shown' : 'next-prompt'} aria-hidden={!visible}>
      <span>この章の朗読が終わりました</span>
      <button className="next-go" onClick={onListen}>▶ 次の章を聴く</button>
      <button className="next-x" onClick={onDismiss} aria-label="閉じる">×</button>
    </div>
  )
}
