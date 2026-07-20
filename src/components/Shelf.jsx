import { load } from '../lib/storage.js'

/** 本棚：文库本书脊风格的列表。只在多本书时出现。 */
export default function Shelf({ books, onOpen }) {
  return (
    <div className="shelf">
      <header className="shelf-head">
        <h1>本棚</h1>
      </header>
      <div className="shelf-list">
        {books.map((b) => {
          const lastCh = load(`book-ch:${b.id}`, null)
          const idx = b.chapters.findIndex((c) => c.id === lastCh)
          return (
            <button key={b.id} className="shelf-book" onClick={() => onOpen(b.id)}>
              <span className="spine" aria-hidden="true" />
              <span className="shelf-body">
                <span className="shelf-title">{b.title}</span>
                <span className="shelf-meta">
                  {b.author} · 全{b.chapters.length}章
                </span>
                <span className="shelf-progress">
                  {idx >= 0 ? `読みかけ：${b.chapters[idx].title}` : '未読'}
                </span>
              </span>
              <span className="shelf-arrow" aria-hidden="true">›</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
