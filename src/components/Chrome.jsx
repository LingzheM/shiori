const icons = {
  toc: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M7 5h9M7 10h9M7 15h9" />
      <path d="M4 5h.01M4 10h.01M4 15h.01" strokeWidth="2.2" />
    </svg>
  ),
  ribbon: (filled) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M6 3h8v14l-4-3.2L6 17V3z" />
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M3 6h14M3 14h14" />
      <circle cx="8" cy="6" r="2" fill="var(--bg-raised)" />
      <circle cx="13" cy="14" r="2" fill="var(--bg-raised)" />
    </svg>
  ),
}

import AudioStrip from './AudioStrip.jsx'

export default function Chrome({ visible, title, percent, marked, hasAudio, onToc, onMark, onSettings }) {
  const cls = visible ? 'bar' : 'bar hidden'
  return (
    <>
      <header className={`${cls} top`}>
        <div className="chapter-title">{title}</div>
        <div className="percent">{percent}%</div>
      </header>
      <nav className={`${cls} bottom`}>
        {hasAudio && <AudioStrip />}
        <div className="bottom-nav">
        <button className="tool" onClick={onToc} aria-label="目次を開く">
          {icons.toc}
          <span>目次</span>
        </button>
        <button
          className={marked ? 'tool active' : 'tool'}
          onClick={onMark}
          aria-label={marked ? 'しおりを外す' : 'しおりを挟む'}
        >
          {icons.ribbon(marked)}
          <span>しおり</span>
        </button>
        <button className="tool" onClick={onSettings} aria-label="設定を開く">
          {icons.settings}
          <span>設定</span>
        </button>
        </div>
      </nav>
    </>
  )
}
