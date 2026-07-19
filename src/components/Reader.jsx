import { useCallback, useEffect, useState } from 'react'
import { fetchChapter } from '../lib/content.js'
import { load, save } from '../lib/storage.js'
import { usePersistedState, FONT_SIZES, LEADINGS } from '../lib/hooks.js'
import { prepare, release, requestAutoplayNext } from '../lib/audio.js'
import { useAudio, NextChapterPrompt } from './AudioStrip.jsx'
import ScrollView from './ScrollView.jsx'
import PagedView from './PagedView.jsx'
import Chrome from './Chrome.jsx'
import Sheet from './Sheet.jsx'
import TocPanel from './TocPanel.jsx'
import SettingsPanel from './SettingsPanel.jsx'

export default function Reader({ book, chapterId, onChapterChange, settings, setSettings }) {
  const chapters = book.chapters
  const index = chapters.findIndex((c) => c.id === chapterId)
  const chapter = chapters[index]

  const [paras, setParas] = useState(null)
  const [loadError, setLoadError] = useState(null)
  // 进度锚点 = 当前可见的第一个段落索引。跨模式、跨字号通用。
  const [anchor, setAnchor] = useState(
    () => load(`progress:${book.id}:${chapterId}`, { para: 0 }).para || 0,
  )
  const [chrome, setChrome] = useState(true)
  const [sheet, setSheet] = useState(null) // 'toc' | 'settings' | null
  const [marks, setMarks] = usePersistedState(`bookmarks:${book.id}`, [])
  const [pageInfo, setPageInfo] = useState(null)
  // 视图重排计数：跳转/改字号时 remount 视图并回到锚点段落
  const [viewEpoch, setViewEpoch] = useState(0)

  useEffect(() => {
    let alive = true
    fetchChapter(chapter.file)
      .then((p) => alive && setParas(p))
      .catch((e) => alive && setLoadError(e.message))
    return () => { alive = false }
  }, [chapter.file])

  const hasAudio = Boolean(chapter.audio)
  useEffect(() => {
    if (!hasAudio) return
    prepare({
      src: import.meta.env.BASE_URL + chapter.audio,
      key: `audio-pos:${book.id}:${chapterId}`,
      title: chapter.title,
      artist: book.title,
    })
    return () => release()
  }, [hasAudio, chapter.audio, chapter.title, book.id, book.title, chapterId])

  const reportAnchor = useCallback(
    (p) => {
      setAnchor(p)
      save(`progress:${book.id}:${chapterId}`, { para: p, t: Date.now() })
    },
    [book.id, chapterId],
  )

  const jumpTo = useCallback(
    (p) => {
      reportAnchor(p)
      setViewEpoch((e) => e + 1)
      setSheet(null)
    },
    [reportAnchor],
  )

  const goChapter = useCallback(
    (id) => {
      setSheet(null)
      if (id !== chapterId) onChapterChange(id)
    },
    [chapterId, onChapterChange],
  )

  // 书签：以 (章, 段落) 为单位
  const marked = marks.some((m) => m.chapterId === chapterId && m.para === anchor)
  const toggleMark = useCallback(() => {
    setMarks((ms) => {
      const exists = ms.some((m) => m.chapterId === chapterId && m.para === anchor)
      if (exists) return ms.filter((m) => !(m.chapterId === chapterId && m.para === anchor))
      const snippet = (paras?.[anchor] || '').slice(0, 46)
      return [...ms, { chapterId, para: anchor, snippet, t: Date.now() }]
    })
  }, [anchor, chapterId, paras, setMarks])

  const markedSet = new Set(
    marks.filter((m) => m.chapterId === chapterId).map((m) => m.para),
  )

  const contentStyle = {
    fontSize: `${FONT_SIZES[settings.size]}px`,
    lineHeight: LEADINGS[settings.leading],
  }

  const percent =
    settings.mode === 'paged' && pageInfo
      ? Math.round(((pageInfo.page + 1) / pageInfo.pages) * 100)
      : paras && paras.length > 1
        ? Math.round((anchor / (paras.length - 1)) * 100)
        : 0

  if (loadError) {
    return (
      <div className="center-note">
        章を読み込めませんでした。
        <br />
        {loadError}
      </div>
    )
  }
  if (!paras) return null

  const viewKey = `${settings.mode}-${settings.size}-${settings.leading}-${settings.font}-${viewEpoch}`
  const viewProps = {
    paras,
    title: chapter.title,
    initialPara: Math.min(anchor, paras.length - 1),
    markedSet,
    contentStyle,
    onAnchor: reportAnchor,
    onToggleChrome: () => setChrome((v) => !v),
    hasPrev: index > 0,
    hasNext: index < chapters.length - 1,
    onPrevChapter: () => index > 0 && goChapter(chapters[index - 1].id),
    onNextChapter: () => index < chapters.length - 1 && goChapter(chapters[index + 1].id),
  }

  return (
    <>
      {settings.mode === 'scroll' ? (
        <ScrollView key={viewKey} {...viewProps} />
      ) : (
        <PagedView key={viewKey} {...viewProps} onPageInfo={setPageInfo} />
      )}

      <Chrome
        visible={chrome}
        title={chapter.title}
        percent={percent}
        marked={marked}
        hasAudio={hasAudio}
        onToc={() => setSheet('toc')}
        onMark={toggleMark}
        onSettings={() => setSheet('settings')}
      />

      {hasAudio && (
        <EndedPrompt
          hasNext={index < chapters.length - 1}
          onListenNext={() => {
            requestAutoplayNext()
            goChapter(chapters[index + 1].id)
          }}
        />
      )}

      <Sheet open={sheet === 'toc'} onClose={() => setSheet(null)}>
        <TocPanel
          book={book}
          currentId={chapterId}
          marks={marks}
          onSelectChapter={goChapter}
          onSelectMark={(m) => (m.chapterId === chapterId ? jumpTo(m.para) : (save(`progress:${book.id}:${m.chapterId}`, { para: m.para, t: Date.now() }), goChapter(m.chapterId)))}
          onRemoveMark={(m) =>
            setMarks((ms) => ms.filter((x) => !(x.chapterId === m.chapterId && x.para === m.para)))
          }
        />
      </Sheet>

      <Sheet open={sheet === 'settings'} onClose={() => setSheet(null)} dim={0.12}>
        <SettingsPanel settings={settings} setSettings={setSettings} />
      </Sheet>
    </>
  )
}

/**
 * 播完提示：自行订阅音频状态，Reader 本体不因 timeupdate 重渲染。
 * 十秒无操作自动淡出；再次播放或翻章后状态复位。
 */
function EndedPrompt({ hasNext, onListenNext }) {
  const audio = useAudio()
  const [dismissed, setDismissed] = useState(false)
  const ended = audio.status === 'ended'

  useEffect(() => {
    if (!ended) { setDismissed(false); return }
    const t = setTimeout(() => setDismissed(true), 10000)
    return () => clearTimeout(t)
  }, [ended])

  return (
    <NextChapterPrompt
      visible={ended && hasNext && !dismissed}
      onListen={onListenNext}
      onDismiss={() => setDismissed(true)}
    />
  )
}
