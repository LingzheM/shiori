import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { VocabText } from './Vocab.jsx'

/**
 * 分页实现：CSS 多栏。
 * 内层容器 column-width = 可视宽度，内容横向溢出成 N 栏，
 * translateX 定位到第 page 栏。翻页刻意不加过渡（高频操作 → 即时）。
 */
export default function PagedView({
  paras,
  title,
  initialPara,
  markedSet,
  contentStyle,
  onWordTap,
  onAnchor,
  onToggleChrome,
  onPageInfo,
  hasPrev,
  hasNext,
  onPrevChapter,
  onNextChapter,
}) {
  const outerRef = useRef(null)
  const innerRef = useRef(null)
  const paraEls = useRef([])
  const stepRef = useRef(1)
  const pagesRef = useRef(1)
  const pageRef = useRef(0)
  const [display, setDisplay] = useState({ page: 0, pages: 1 })

  const applyPage = useCallback(
    (p) => {
      const page = Math.max(0, Math.min(pagesRef.current - 1, p))
      pageRef.current = page
      const inner = innerRef.current
      if (inner) inner.style.transform = `translateX(${-page * stepRef.current}px)`
      setDisplay({ page, pages: pagesRef.current })
      onPageInfo?.({ page, pages: pagesRef.current })
      // 锚点 = 该页起点处的段落（最后一个 offsetLeft <= 页起点 的段落）
      const start = page * stepRef.current + 2
      let lo = 0
      let hi = paraEls.current.length - 1
      let ans = 0
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        const el = paraEls.current[mid]
        if (el && el.offsetLeft <= start) { ans = mid; lo = mid + 1 } else hi = mid - 1
      }
      onAnchor(ans)
    },
    [onAnchor, onPageInfo],
  )

  const layout = useCallback(
    (targetPara) => {
      const outer = outerRef.current
      const inner = innerRef.current
      if (!outer || !inner) return
      const width = outer.clientWidth
      const gap =
        parseFloat(getComputedStyle(inner).columnGap) || 48
      inner.style.columnWidth = `${width}px`
      const step = width + gap
      stepRef.current = step
      pagesRef.current = Math.max(1, Math.round((inner.scrollWidth + gap) / step))
      const el = paraEls.current[targetPara]
      const page = el ? Math.floor((el.offsetLeft + 2) / step) : 0
      applyPage(page)
    },
    [applyPage],
  )

  useLayoutEffect(() => {
    layout(initialPara)
    const outer = outerRef.current
    let first = true
    const ro = new ResizeObserver(() => {
      if (first) { first = false; return } // 忽略挂载时的首次回调
      // 视口变化（旋转/地址栏收起）→ 以当前锚点段落重排
      const start = pageRef.current * stepRef.current + 2
      let ans = 0
      for (let i = 0; i < paraEls.current.length; i++) {
        const el = paraEls.current[i]
        if (el && el.offsetLeft <= start) ans = i
        else break
      }
      layout(ans)
    })
    ro.observe(outer)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paras])

  const next = useCallback(() => {
    if (pageRef.current < pagesRef.current - 1) applyPage(pageRef.current + 1)
    else if (hasNext) onNextChapter()
  }, [applyPage, hasNext, onNextChapter])

  const prev = useCallback(() => {
    if (pageRef.current > 0) applyPage(pageRef.current - 1)
    else if (hasPrev) onPrevChapter()
  }, [applyPage, hasPrev, onPrevChapter])

  // 点击分区：左 30% 上一页 / 右 30% 下一页 / 中间切换 chrome
  const handleClick = (e) => {
    const sel = window.getSelection()
    if (sel && !sel.isCollapsed) return
    const x = e.clientX / window.innerWidth
    if (x < 0.3) prev()
    else if (x > 0.7) next()
    else onToggleChrome()
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev])

  return (
    <div className="paged-view" onClick={handleClick}>
      <div className="paged-outer" ref={outerRef}>
        <div className="paged-inner reading" ref={innerRef} style={contentStyle}>
          <header className="tobira">
            <h1>{title}</h1>
          </header>
          {paras.map((text, i) => (
            <p
              key={i}
              ref={(el) => (paraEls.current[i] = el)}
              data-idx={i}
              className={markedSet.has(i) ? 'para marked' : 'para'}
            >
              <VocabText text={text} onWordTap={onWordTap} />
            </p>
          ))}
        </div>
      </div>
      <div className="folio">
        {display.page + 1} / {display.pages}
      </div>
    </div>
  )
}
