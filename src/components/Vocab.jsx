import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  subscribe,
  getSnapshot,
  segment,
  getEntry,
  getEnrich,
  setKnown,
  removeWord,
} from '../lib/vocab.js'

export function useVocab() {
  return useSyncExternalStore(subscribe, getSnapshot)
}

/** 段落文本 → 普通文字 + 生词片（淡朱点线）。下划线不改字形尺寸，分页排版零扰动。 */
export function VocabText({ text, onWordTap }) {
  useVocab() // 订阅：词表变化时重切分（低频）
  const pieces = segment(text)
  if (pieces.length === 1 && !pieces[0].w) return text
  return pieces.map((p, i) =>
    p.w ? (
      <span
        key={i}
        className="vocab"
        onClick={(e) => {
          e.stopPropagation() // 不触发翻页 / 工具栏切换
          onWordTap(p.w)
        }}
      >
        {p.t}
      </span>
    ) : (
      p.t
    ),
  )
}

/** 选区胶囊：长按选中文字后浮现「＋ 語彙に追加」 */
export function SelectionBubble({ onAdd }) {
  const [pos, setPos] = useState(null) // {x, y, text, paraEl}

  useEffect(() => {
    const onChange = () => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) return setPos(null)
      const text = sel.toString().trim()
      if (!text || text.length > 30 || text.includes('\n')) return setPos(null)
      const node = sel.anchorNode
      const paraEl = node?.parentElement?.closest?.('.para')
      if (!paraEl) return setPos(null)
      const rect = sel.getRangeAt(0).getBoundingClientRect()
      setPos({
        x: Math.min(Math.max(rect.left + rect.width / 2, 70), window.innerWidth - 70),
        y: Math.max(rect.top, 60),
        text,
        paraEl,
      })
    }
    document.addEventListener('selectionchange', onChange)
    return () => document.removeEventListener('selectionchange', onChange)
  }, [])

  if (!pos) return null
  return (
    <button
      className="sel-bubble"
      style={{ left: pos.x, top: pos.y - 46 }}
      // pointerdown 抢在浏览器清除选区之前；数据已存于 state，无需活选区
      onPointerDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onAdd({ text: pos.text, paraEl: pos.paraEl })
        window.getSelection()?.removeAllRanges()
        setPos(null)
      }}
    >
      ＋ 語彙に追加
    </button>
  )
}

/** 词卡：点生词后从底部升起 */
export function WordCard({ word, onClose }) {
  useVocab()
  const cardRef = useRef(null)
  if (!word) return null
  const entry = getEntry(word)
  const en = getEnrich(word)

  return (
    <div className="word-card-root" onClick={onClose}>
      <div className="word-card" ref={cardRef} onClick={(e) => e.stopPropagation()}>
        <div className="word-head">
          <span className="word-title">{word}</span>
          {en?.reading && en.reading !== word && (
            <span className="word-reading">{en.reading}</span>
          )}
        </div>
        {en?.meaning ? (
          <p className="word-meaning">{en.meaning}</p>
        ) : (
          <p className="word-meaning pending">
            未補完 —「語彙」タブから書き出して、スクリプトで vocab.json を生成してください
          </p>
        )}
        {entry?.sentence && <p className="word-example">{entry.sentence}</p>}
        <div className="word-actions">
          <button
            className="word-known"
            onClick={() => {
              setKnown(word, true)
              onClose()
            }}
          >
            ✓ もう覚えた
          </button>
          <button
            className="word-remove"
            onClick={() => {
              removeWord(word)
              onClose()
            }}
          >
            削除
          </button>
        </div>
      </div>
    </div>
  )
}
