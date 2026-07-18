// localStorage 薄封装。所有键统一 dokusho: 前缀。
const NS = 'dokusho'

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(`${NS}:${key}`)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(`${NS}:${key}`, JSON.stringify(value))
  } catch {
    /* 隐私模式等场景下静默失败 */
  }
}
