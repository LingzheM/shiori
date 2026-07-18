import { useEffect, useState } from 'react'
import { fetchManifest } from './lib/content.js'
import { usePersistedState, DEFAULT_SETTINGS } from './lib/hooks.js'
import Reader from './components/Reader.jsx'

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [settings, setSettings] = usePersistedState('settings', DEFAULT_SETTINGS)
  const [last, setLast] = usePersistedState('last', null)

  useEffect(() => {
    fetchManifest().then(setData).catch((e) => setError(e.message))
  }, [])

  // 主题 / 字体作用于根节点（index.html 内联脚本负责首帧，这里负责后续切换）
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = settings.theme
    root.dataset.font = settings.font
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.content = getComputedStyle(root).getPropertyValue('--bg').trim()
    }
  }, [settings.theme, settings.font])

  if (error) {
    return (
      <div className="center-note">
        本棚を読み込めませんでした。
        <br />
        {error}
      </div>
    )
  }
  if (!data) return null

  // v1：单本书。manifest 结构已支持多本，书架阶段在此处扩展。
  const book = data.books[0]
  const chapterId = book.chapters.some((c) => c.id === last?.chapterId)
    ? last.chapterId
    : book.chapters[0].id

  return (
    <Reader
      key={`${book.id}:${chapterId}`}
      book={book}
      chapterId={chapterId}
      onChapterChange={(id) => setLast({ bookId: book.id, chapterId: id })}
      settings={settings}
      setSettings={setSettings}
    />
  )
}
