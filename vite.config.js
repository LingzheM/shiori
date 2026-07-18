import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' → 构建产物用相对路径，GitHub Pages 项目页直接可用
export default defineConfig({
  base: './',
  plugins: [react()],
})
