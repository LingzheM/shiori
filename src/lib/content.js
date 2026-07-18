// 内容加载：manifest + 章节 txt → 段落数组（空行分段）
const base = import.meta.env.BASE_URL
export async function fetchManifest() {
  const res = await fetch(`${base}books/manifest.json`, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`manifest.json (${res.status})`)
  return res.json()
}

export async function fetchChapter(file) {
  const res = await fetch(base + file, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`${file} (${res.status})`)
  const text = await res.text()
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\n/g, '').trim())
    .filter(Boolean)
}