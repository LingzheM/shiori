import { useLayoutEffect, useRef } from 'react'

export default function ScrollView({
  paras,
  title,
  initialPara,
  markedSet,
  contentStyle,
  onAnchor,
  onToggleChrome,
  hasPrev,
  hasNext,
  onPrevChapter,
  onNextChapter,
}) {
  const scrollRef = useRef(null)
  const paraEls = useRef([])
  const tops = useRef([])
  const anchorRef = useRef(initialPara)
  const raf = useRef(null)

  const measure = () => {
    tops.current = paraEls.current.map((el) => (el ? el.offsetTop : 0))
  }

  // 挂载后：测量段落位置并恢复到锚点段落
  useLayoutEffect(() => {
    measure()
    const el = scrollRef.current
    if (el && initialPara > 0) {
      el.scrollTop = (tops.current[initialPara] || 0) - 16
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paras])

  const handleScroll = () => {
    if (raf.current) return
    raf.current = requestAnimationFrame(() => {
      raf.current = null
      const el = scrollRef.current
      if (!el) return
      const y = el.scrollTop + 20
      // 二分：最后一个 offsetTop <= y 的段落即当前锚点
      let lo = 0
      let hi = tops.current.length - 1
      let ans = 0
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        if (tops.current[mid] <= y) { ans = mid; lo = mid + 1 } else hi = mid - 1
      }
      if (ans !== anchorRef.current) {
        anchorRef.current = ans
        onAnchor(ans)
      }
    })
  }

  // 点正文空白切换 chrome；选中文字时不触发
  const handleClick = () => {
    const sel = window.getSelection()
    if (sel && !sel.isCollapsed) return
    onToggleChrome()
  }

  return (
    <div className="scroll-view" ref={scrollRef} onScroll={handleScroll}>
      <div className="scroll-inner reading" style={contentStyle} onClick={handleClick}>
        <header className="tobira">
          <h1>{title}</h1>
        </header>
        {paras.map((text, i) => (
          <p
            key={i}
            ref={(el) => (paraEls.current[i] = el)}
            className={markedSet.has(i) ? 'para marked' : 'para'}
          >
            {text}
          </p>
        ))}
        <nav className="chapter-nav" onClick={(e) => e.stopPropagation()}>
          {hasPrev ? (
            <button onClick={onPrevChapter}>← 前の章</button>
          ) : (
            <span />
          )}
          {hasNext ? (
            <button className="next" onClick={onNextChapter}>次の章 →</button>
          ) : (
            <span />
          )}
        </nav>
      </div>
    </div>
  )
}
