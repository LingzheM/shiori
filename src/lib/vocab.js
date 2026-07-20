import { load, save } from './storage.js'

/**
 * 生词引擎（模块单例）。
 * 生词是全局的（不分书）：不认识的词在哪本书里都不认识。
 * 数据分两层：
 *   entries    — 用户亲手标的词（localStorage，珍贵数据）
 *   enrichment — 脚本回填的读音/释义/活用形（仓库里的 vocab.json，可再生）
 */

let entries = load('vocab', []) // [{word, sentence, bookId, chapterId, para, t, known}]
let enrichment = {} // { word: {reading, meaning, forms:[]} }
let version = 0
let snapshot = { entries, enrichment, version }

const listeners = new Set()
function bump() {
  version += 1
  snapshot = { entries, enrichment, version }
  matcherCache = null
  listeners.forEach((fn) => fn())
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export function getSnapshot() {
  return snapshot
}

export function addWord({ word, sentence, bookId, chapterId, para }) {
  const w = word.trim()
  if (!w || w.length > 30) return
  const exist = entries.find((e) => e.word === w)
  if (exist) {
    // 再次标记一个已「毕业」的词 = 其实还没记住，恢复它
    if (exist.known) {
      entries = entries.map((e) => (e.word === w ? { ...e, known: false } : e))
      save('vocab', entries)
      bump()
    }
    return
  }
  entries = [...entries, { word: w, sentence, bookId, chapterId, para, t: Date.now(), known: false }]
  save('vocab', entries)
  bump()
}

export function setKnown(word, known) {
  entries = entries.map((e) => (e.word === word ? { ...e, known } : e))
  save('vocab', entries)
  bump()
}

export function removeWord(word) {
  entries = entries.filter((e) => e.word !== word)
  save('vocab', entries)
  bump()
}

export function getEntry(word) {
  return entries.find((e) => e.word === word) || null
}
export function getEnrich(word) {
  return enrichment[word] || null
}

/** 待补全导出：喂给脚本 / skill 的输入 */
export function exportPending() {
  const pending = entries
    .filter((e) => !enrichment[e.word])
    .map((e) => ({ word: e.word, sentence: e.sentence }))
  return JSON.stringify(pending, null, 2)
}
/** 全量备份（含毕业标记） */
export function exportBackup() {
  return JSON.stringify(entries, null, 2)
}

/** 启动时拉取回填数据；404/失败静默为「尚未回填」 */
export async function loadEnrichment(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}vocab.json`, { cache: 'no-cache' })
    if (!res.ok) return
    enrichment = await res.json()
    bump()
  } catch {
    /* 无 vocab.json 属正常状态 */
  }
}

/* ---------- 匹配引擎：活跃词 + 活用形 → 最长优先单次正则 ---------- */

let matcherCache = null

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function buildMatcher() {
  const formToBase = new Map()
  for (const e of entries) {
    if (e.known) continue
    formToBase.set(e.word, e.word)
    const forms = enrichment[e.word]?.forms || []
    for (const f of forms) if (f) formToBase.set(f, e.word)
  }
  if (formToBase.size === 0) return { regex: null, formToBase }
  const alts = [...formToBase.keys()].sort((a, b) => b.length - a.length).map(escapeRe)
  return { regex: new RegExp(alts.join('|'), 'g'), formToBase }
}

/** 把一段文本切成 [{t, w}]：w 为命中的生词原形，普通片 w=null */
export function segment(text) {
  if (!matcherCache) matcherCache = buildMatcher()
  const { regex, formToBase } = matcherCache
  if (!regex) return [{ t: text, w: null }]
  const out = []
  let last = 0
  regex.lastIndex = 0
  let m
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) out.push({ t: text.slice(last, m.index), w: null })
    out.push({ t: m[0], w: formToBase.get(m[0]) || m[0] })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ t: text.slice(last), w: null })
  return out
}

/** 从段落文本里截取包含该词的句子（。！？为界） */
export function sentenceAround(paraText, word) {
  const i = paraText.indexOf(word)
  if (i < 0) return paraText.slice(0, 100)
  const enders = /[。！？!?]/
  let start = 0
  for (let j = i - 1; j >= 0; j--) {
    if (enders.test(paraText[j])) { start = j + 1; break }
  }
  let end = paraText.length
  for (let j = i + word.length; j < paraText.length; j++) {
    if (enders.test(paraText[j])) { end = j + 1; break }
  }
  const s = paraText.slice(start, end).trim()
  return s.length > 140 ? s.slice(0, 140) + '…' : s
}
