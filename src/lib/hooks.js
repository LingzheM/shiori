import { useEffect, useState } from 'react'
import { load, save } from './storage.js'

export function usePersistedState(key, initial) {
  const [value, setValue] = useState(() => load(key, initial))
  useEffect(() => { save(key, value) }, [key, value])
  return [value, setValue]
}

// 设置项的取值表：索引存储，避免脏数据
export const FONT_SIZES = [15, 16, 17, 18, 19, 20, 22]
export const LEADINGS = [1.7, 1.9, 2.1]
export const LEADING_LABELS = ['狭い', '標準', '広い']

export const DEFAULT_SETTINGS = {
  theme: 'paper',   // light | paper | dark
  font: 'mincho',   // mincho | gothic
  size: 2,          // FONT_SIZES 索引
  leading: 1,       // LEADINGS 索引
  mode: 'scroll',   // scroll | paged
}
