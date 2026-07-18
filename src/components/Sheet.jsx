import { useEffect, useRef, useState } from 'react'

/**
 * 底部面板。进 260ms / 出 200ms（不对称：离场的东西用户不再关心）。
 * CSS transition 驱动 → 快速开关时可被打断，从当前位置继续。
 */
export default function Sheet({ open, onClose, children, dim = 0.4 }) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    clearTimeout(timer.current)
    if (open) {
      setMounted(true)
      // 双 rAF：确保初始态 (translateY(100%)) 先完成一次布局再进入
      requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
    } else {
      setShown(false)
      timer.current = setTimeout(() => setMounted(false), 220)
    }
    return () => clearTimeout(timer.current)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!mounted) return null
  return (
    <div className={shown ? 'sheet-root shown' : 'sheet-root'}>
      <div
        className="sheet-backdrop"
        style={{ '--dim': `rgba(0,0,0,${dim})`, background: `rgba(0,0,0,${dim})` }}
        onClick={onClose}
      />
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="sheet-grip" />
        {children}
      </div>
    </div>
  )
}
