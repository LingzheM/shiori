import { load, save } from './storage.js'

/**
 * 音频引擎（模块单例）。
 * 为什么不是组件内状态：Reader 按章节 key 重挂载，
 * 音频元素必须活在 React 树之外才能跨章节、跨重挂载存续。
 * iOS 备忘：同一个 audio 元素被用户手势解锁一次后，
 * 后续程序化 play()（如「续播下一章」）也被允许——所以全局只用这一个元素。
 */

const el = typeof Audio !== 'undefined' ? new Audio() : null
if (el) el.preload = 'metadata'

const RATES = [1, 1.25, 1.5, 0.8]

let state = {
  src: null,
  status: 'idle', // idle | loading | playing | paused | ended | error
  currentTime: 0,
  duration: 0,
  rate: load('audio-rate', 1),
}
let posKey = null // audio-pos:{book}:{chapter}
let resumeAt = 0
let pendingAutoplay = false
let lastSavedAt = 0
let lastTick = 0

const listeners = new Set()
const emit = (patch) => {
  state = { ...state, ...patch }
  listeners.forEach((fn) => fn())
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export function getState() {
  return state
}

function savePos(force = false) {
  if (!posKey || !el) return
  const now = Date.now()
  if (!force && now - lastSavedAt < 5000) return
  lastSavedAt = now
  save(posKey, el.currentTime)
}

/** 章节挂载时调用。只装元数据，不播放。 */
export function prepare({ src, key, title, artist }) {
  if (!el) return
  if (state.src !== src) {
    savePos(true) // 旧章离场前存位
    el.src = src
    el.playbackRate = state.rate
    posKey = key
    const saved = load(key, 0)
    resumeAt = saved > 5 ? saved : 0 // 开头 5 秒内不值得续播
    emit({ src, status: 'idle', currentTime: resumeAt, duration: 0 })
  }
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title, artist, album: '栞' })
    navigator.mediaSession.setActionHandler('play', play)
    navigator.mediaSession.setActionHandler('pause', pause)
  }
  if (pendingAutoplay) {
    pendingAutoplay = false
    play()
  }
}

/** 章节卸载时调用：停下、存位，但保留 src（可能马上回来）。 */
export function release() {
  if (!el) return
  savePos(true)
  el.pause()
}

export function play() {
  if (!el || !state.src) return
  if (state.status === 'ended') {
    el.currentTime = 0 // 播完后再按 = 重听本章
  } else if (resumeAt > 0 && el.currentTime < 1) {
    el.currentTime = resumeAt
    resumeAt = 0
  }
  emit({ status: 'loading' })
  el.play().catch(() => emit({ status: 'error' }))
}

export function pause() {
  el?.pause()
}

export function toggle() {
  if (state.status === 'playing' || state.status === 'loading') pause()
  else play()
}

export function cycleRate() {
  const next = RATES[(RATES.indexOf(state.rate) + 1) % RATES.length]
  if (el) el.playbackRate = next
  save('audio-rate', next)
  emit({ rate: next })
}

export function requestAutoplayNext() {
  pendingAutoplay = true
}

if (el) {
  el.addEventListener('loadedmetadata', () => {
    emit({ duration: el.duration })
    if (resumeAt > 0 && resumeAt < el.duration - 5) {
      el.currentTime = resumeAt
      emit({ currentTime: resumeAt })
    } else {
      resumeAt = 0
      emit({ currentTime: 0 })
    }
  })
  el.addEventListener('playing', () => emit({ status: 'playing' }))
  el.addEventListener('pause', () => {
    savePos(true)
    if (state.status !== 'ended') emit({ status: 'paused' })
  })
  el.addEventListener('waiting', () => emit({ status: 'loading' }))
  el.addEventListener('ended', () => {
    if (posKey) save(posKey, 0) // 播完清位，下次重听
    emit({ status: 'ended', currentTime: el.duration })
  })
  el.addEventListener('error', () => {
    if (state.src) emit({ status: 'error' })
  })
  el.addEventListener('timeupdate', () => {
    const now = Date.now()
    if (now - lastTick < 500) return // UI 每秒更新两次足够
    lastTick = now
    savePos()
    emit({ currentTime: el.currentTime })
    if ('mediaSession' in navigator && el.duration && navigator.mediaSession.setPositionState) {
      try {
        navigator.mediaSession.setPositionState({
          duration: el.duration,
          playbackRate: el.playbackRate,
          position: el.currentTime,
        })
      } catch { /* 部分浏览器不支持，忽略 */ }
    }
  })
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) savePos(true)
  })
  window.addEventListener('pagehide', () => savePos(true))
}
