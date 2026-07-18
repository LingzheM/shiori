import { FONT_SIZES, LEADINGS, LEADING_LABELS } from '../lib/hooks.js'

/**
 * 设置即预览：面板遮罩刻意调浅（dim 0.12），
 * 每一次调整都立刻反映在身后的正文上。
 */
export default function SettingsPanel({ settings, setSettings }) {
  const set = (patch) => setSettings((s) => ({ ...s, ...patch }))

  return (
    <div className="settings">
      <div className="setting-row">
        <span className="setting-label">テーマ</span>
        <div className="swatches">
          {[
            ['light', '白'],
            ['paper', '紙'],
            ['dark', '黒'],
          ].map(([t, label]) => (
            <button
              key={t}
              data-t={t}
              className={settings.theme === t ? 'swatch on' : 'swatch'}
              onClick={() => set({ theme: t })}
              aria-label={`テーマ：${label}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="setting-row">
        <span className="setting-label">書体</span>
        <div className="seg">
          <button
            className={settings.font === 'mincho' ? 'on' : ''}
            onClick={() => set({ font: 'mincho' })}
          >
            明朝
          </button>
          <button
            className={settings.font === 'gothic' ? 'on' : ''}
            onClick={() => set({ font: 'gothic' })}
          >
            ゴシック
          </button>
        </div>
      </div>

      <div className="setting-row">
        <span className="setting-label">文字サイズ</span>
        <div className="stepper">
          <button
            disabled={settings.size === 0}
            onClick={() => set({ size: settings.size - 1 })}
            aria-label="文字を小さく"
          >
            −
          </button>
          <span className="value">{FONT_SIZES[settings.size]}</span>
          <button
            disabled={settings.size === FONT_SIZES.length - 1}
            onClick={() => set({ size: settings.size + 1 })}
            aria-label="文字を大きく"
          >
            ＋
          </button>
        </div>
      </div>

      <div className="setting-row">
        <span className="setting-label">行間</span>
        <div className="seg">
          {LEADINGS.map((_, i) => (
            <button
              key={i}
              className={settings.leading === i ? 'on' : ''}
              onClick={() => set({ leading: i })}
            >
              {LEADING_LABELS[i]}
            </button>
          ))}
        </div>
      </div>

      <div className="setting-row">
        <span className="setting-label">表示</span>
        <div className="seg">
          <button
            className={settings.mode === 'scroll' ? 'on' : ''}
            onClick={() => set({ mode: 'scroll' })}
          >
            スクロール
          </button>
          <button
            className={settings.mode === 'paged' ? 'on' : ''}
            onClick={() => set({ mode: 'paged' })}
          >
            ページ
          </button>
        </div>
      </div>
    </div>
  )
}
