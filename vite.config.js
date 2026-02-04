import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './',
  server: {
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
