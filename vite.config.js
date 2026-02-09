import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5177, // 与 plugin.json 中的端口一致
    host: true, // 允许外部访问（uTools 需要）
    strictPort: true, // 端口被占用时失败而不是尝试下一个端口
    // 忽略 source map 警告
    hmr: {
      overlay: false
    }
  },
  // 忽略 jQuery source map 警告
  optimizeDeps: {
    include: []
  }
})
