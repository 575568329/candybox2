import { createApp } from 'vue'
import './utils/utools-mock.js'
import router from './router'
import App from './App.vue'
import './main.css'

// 初始化 vConsole（用于调试）
let vconsole = null
let vConsoleVisible = false // 跟踪 vConsole 的可见状态

// 在所有环境初始化 vConsole（可通过快捷键控制）
if (typeof window !== 'undefined') {
  // 动态导入 vConsole
  import('vconsole').then((module) => {
    const VConsole = module.default
    vconsole = new VConsole({
      defaultPlugins: ['system', 'network', 'element', 'storage'],
      disableLogScrolling: true,
      onReady: () => {
        console.log('[vConsole] 已初始化，按 Ctrl+Shift+L 切换显示')
        // 默认隐藏 vConsole
        vconsole.hide()
        vConsoleVisible = false

        // 隐藏默认的切换按钮
        const switchBtn = document.querySelector('.vc-switch')
        if (switchBtn) {
          switchBtn.style.display = 'none'
        }
      }
    })
  }).catch((error) => {
    console.error('[vConsole] 初始化失败:', error)
  })

  // 添加快捷键 Ctrl+Shift+L 切换 vConsole
  window.addEventListener('keydown', (event) => {
    // 检查是否按下了 Ctrl+Shift+L
    if (event.ctrlKey && event.shiftKey && (event.key === 'L' || event.key === 'l')) {
      event.preventDefault()

      if (!vconsole) {
        console.warn('[vConsole] 尚未初始化完成，请稍后再试')
        return
      }

      // 切换 vConsole 显示/隐藏
      vConsoleVisible = !vConsoleVisible

      if (vConsoleVisible) {
        vconsole.show()
        console.log('[vConsole] ✓ 已显示 (再次按 Ctrl+Shift+L 隐藏)')
      } else {
        vconsole.hide()
        console.log('[vConsole] ✗ 已隐藏 (按 Ctrl+Shift+L 显示)')
      }
    }
  })
}

const app = createApp(App)

app.use(router)
app.mount('#app')
