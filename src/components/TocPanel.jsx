import { useState } from 'react'

export default function TocPanel({
  book,
  currentId,
  marks,
  onSelectChapter,
  onSelectMark,
  onRemoveMark,
}) {
  const [tab, setTab] = useState('toc')
  const titleOf = (id) => book.chapters.find((c) => c.id === id)?.title || id

  return (
    <>
      <div className="toc-tabs">
        <button
          className={tab === 'toc' ? 'toc-tab active' : 'toc-tab'}
          onClick={() => setTab('toc')}
        >
          目次
        </button>
        <button
          className={tab === 'marks' ? 'toc-tab active' : 'toc-tab'}
          onClick={() => setTab('marks')}
        >
          しおり{marks.length > 0 ? `（${marks.length}）` : ''}
        </button>
      </div>

      {tab === 'toc' ? (
        <div className="toc-list">
          {book.chapters.map((c) => (
            <button
              key={c.id}
              className={c.id === currentId ? 'toc-item current' : 'toc-item'}
              onClick={() => onSelectChapter(c.id)}
            >
              <span className="dot" />
              <span>{c.title}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="toc-list">
          {marks.length === 0 ? (
            <div className="empty-note">
              しおりはまだありません。
              <br />
              本文で「しおり」を押すと、この場所に挟まれます。
            </div>
          ) : (
            [...marks]
              .sort((a, b) => b.t - a.t)
              .map((m) => (
                <div key={`${m.chapterId}-${m.para}`} className="mark-item">
                  <button className="mark-body" onClick={() => onSelectMark(m)}>
                    <div className="snippet">{m.snippet}…</div>
                    <div className="where">{titleOf(m.chapterId)}</div>
                  </button>
                  <button
                    className="remove"
                    onClick={() => onRemoveMark(m)}
                    aria-label="しおりを削除"
                  >
                    ×
                  </button>
                </div>
              ))
          )}
        </div>
      )}
    </>
  )
}
