import { useState } from 'react'
import { useVocab } from './Vocab.jsx'
import { setKnown, removeWord, exportPending, exportBackup, getEnrich } from '../lib/vocab.js'

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
        <button
          className={tab === 'vocab' ? 'toc-tab active' : 'toc-tab'}
          onClick={() => setTab('vocab')}
        >
          語彙
        </button>
      </div>

      {tab === 'vocab' ? (
        <VocabTab />
      ) : tab === 'toc' ? (
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

function VocabTab() {
  const { entries } = useVocab()
  const [copied, setCopied] = useState(null)
  const active = entries.filter((e) => !e.known)
  const learned = entries.filter((e) => e.known)

  const copy = async (kind) => {
    const text = kind === 'pending' ? exportPending() : exportBackup()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      window.prompt('コピーしてください', text)
    }
  }

  return (
    <div className="toc-list">
      {entries.length === 0 ? (
        <div className="empty-note">
          語彙はまだありません。
          <br />
          本文で言葉を長押しで選択し「＋ 語彙に追加」。
        </div>
      ) : (
        <>
          <div className="vocab-toolbar">
            <button className="vocab-export" onClick={() => copy('pending')}>
              {copied === 'pending' ? '✓ コピーしました' : '未補完を書き出し'}
            </button>
            <button className="vocab-backup" onClick={() => copy('backup')}>
              {copied === 'backup' ? '✓' : '全バックアップ'}
            </button>
          </div>
          {active.map((e) => {
            const en = getEnrich(e.word)
            return (
              <div key={e.word} className="vocab-item">
                <div className="vocab-body">
                  <span className="vocab-word">{e.word}</span>
                  {en?.reading && en.reading !== e.word && (
                    <span className="vocab-reading">{en.reading}</span>
                  )}
                  {!en && <span className="vocab-pending">未補完</span>}
                </div>
                <button className="vocab-act" onClick={() => setKnown(e.word, true)}>
                  ✓
                </button>
                <button className="vocab-act dim" onClick={() => removeWord(e.word)}>
                  ×
                </button>
              </div>
            )
          })}
          {learned.length > 0 && (
            <>
              <div className="vocab-divider">覚えた（{learned.length}）</div>
              {learned.map((e) => (
                <div key={e.word} className="vocab-item learned">
                  <div className="vocab-body">
                    <span className="vocab-word">{e.word}</span>
                  </div>
                  <button className="vocab-act dim" onClick={() => setKnown(e.word, false)}>
                    ↺
                  </button>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  )
}
