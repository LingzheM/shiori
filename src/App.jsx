import { useEffect, useState } from 'react'
import { fetchManifest } from './lib/content.js'
import { load, save } from './lib/storage.js'
import { usePersistedState, DEFAULT_SETTINGS } from './lib/hooks.js'
import Reader from './components/Reader.jsx'
import Shelf from './components/Shelf.jsx'
import { loadEnrichment } from './lib/vocab.js'

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [settings, setSettings] = usePersistedState('settings', DEFAULT_SETTINGS)
  // screen: {type:'shelf'} | {type:'book', id}；数据加载后再决定初始屏
  const [screen, setScreen] = useState(null)

  useEffect(() => {
    fetchManifest().then(setData).catch((e) => setError(e.message))
    loadEnrichment(import.meta.env.BASE_URL)
  }, [])

  // 初始屏：单本书直进；多本书回到上次的书，没有记录则进本棚
  useEffect(() => {
    if (!data || screen) return
    const books = data.books
    if (books.length === 1) {
      setScreen({ type: 'book', id: books[0].id })
      return
    }
    const last = load('last', null)
    if (last?.bookId && books.some((b) => b.id === last.bookId)) {
      setScreen({ type: 'book', id: last.bookId })
    } else {
      setScreen({ type: 'shelf' })
    }
  }, [data, screen])

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
  if (!data || !screen) return null

  const books = data.books
  const multi = books.length > 1

  if (screen.type === 'shelf') {
    return <Shelf books={books} onOpen={(id) => setScreen({ type: 'book', id })} />
  }

  const book = books.find((b) => b.id === screen.id) || books[0]
  const valid = (id) => book.chapters.some((c) => c.id === id)
  const legacy = load('last', null) // v0.3 以前只存全局 last，做迁移兼容
  const chapterId = valid(screen.ch)
    ? screen.ch
    : valid(load(`book-ch:${book.id}`, null))
      ? load(`book-ch:${book.id}`, null)
      : legacy?.bookId === book.id && valid(legacy.chapterId)
        ? legacy.chapterId
        : book.chapters[0].id

  return (
    <Reader
      key={`${book.id}:${chapterId}`}
      book={book}
      chapterId={chapterId}
      onChapterChange={(id) => {
        save('last', { bookId: book.id, chapterId: id })
        save(`book-ch:${book.id}`, id)
        setScreen({ type: 'book', id: book.id, ch: id })
      }}
      onBack={multi ? () => setScreen({ type: 'shelf' }) : null}
      settings={settings}
      setSettings={setSettings}
    />
  )
}
