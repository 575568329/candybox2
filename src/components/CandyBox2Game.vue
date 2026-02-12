<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { analyticsTracker } from '../utils/analyticsTracker'

const router = useRouter()
const iframeRef = ref(null)
const lastSaveTime = ref(null)
const showSaveTime = ref(false) // 控制保存时间的显示
const iframeUrl = ref('')

// 导航栏自动收起
const headerVisible = ref(true)
let headerTimer = null

// 显示导航栏
const showHeader = () => {
  headerVisible.value = true
  if (headerTimer) {
    clearTimeout(headerTimer)
    headerTimer = null
  }
}

// 隐藏导航栏
const hideHeader = () => {
  headerVisible.value = false
}

// 延迟隐藏导航栏
const scheduleHideHeader = () => {
  if (headerTimer) {
    clearTimeout(headerTimer)
  }
  headerTimer = setTimeout(() => {
    hideHeader()
  }, 3000) // 3秒后自动隐藏
}

// 鼠标进入顶部区域
const onMouseEnterHeader = () => {
  showHeader()
}

// 鼠标离开顶部区域
const onMouseLeaveHeader = () => {
  scheduleHideHeader()
}

// 鼠标在游戏区域移动
const onMouseMoveGame = (event) => {
  // 如果鼠标在顶部50px内，显示导航栏
  if (event.clientY < 50) {
    showHeader()
    scheduleHideHeader()
  }
}

// Toast 通知状态
const toastMessage = ref('')
const toastVisible = ref(false)
let toastTimer = null
let saveTimeTimer = null // 保存时间显示的定时器

// 🔥 新增：定时自动保存
let autoSaveInterval = null
const AUTO_SAVE_INTERVAL = 30000 // 每30秒自动保存一次

// 显示 Toast 通知
const showToast = (message, duration = 3000) => {
  toastMessage.value = message
  toastVisible.value = true

  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastVisible.value = false
  }, duration)
}

// 显示保存时间提示并自动隐藏
const showSaveTimeTemp = () => {
  showSaveTime.value = true
  if (saveTimeTimer) clearTimeout(saveTimeTimer)
  saveTimeTimer = setTimeout(() => {
    showSaveTime.value = false
  }, 5000) // 5秒后自动隐藏
}

// 返回游戏列表
const goBack = async () => {
  // 返回前自动保存
  showToast('💾 正在保存存档...')

  try {
    await triggerAutoSave()

    // 等待一下，确保数据完全写入
    await new Promise(r => setTimeout(r, 500))

    showToast('✅ 保存成功')

    // 等待用户看到成功提示
    await new Promise(r => setTimeout(r, 800))

    // 结束游戏会话（埋点）
    analyticsTracker.endGameSession()

    router.push('/')
  } catch (error) {
    console.error('❌ Candy Box 2 保存失败:', error)
    showToast('⚠️ 保存失败')

    // 即使失败也要结束会话（埋点）
    analyticsTracker.endGameSession()
    router.push('/')
  }
}

// 在 iframe 内部添加键盘监听和链接拦截
const setupIframeKeyboardListener = () => {
  const iframe = iframeRef.value
  if (!iframe?.contentWindow) {
    return
  }

  // 拦截游戏内的链接点击（修复 "You can load a local save" 功能）
  iframe.contentWindow.document.addEventListener('click', (e) => {
    const target = e.target
    if (target.tagName === 'A' && target.href) {
      const href = target.href

      // 检查是否是槽位链接
      const slotMatch = href.match(/[?&]slot=(\d)/)
      if (slotMatch) {
        e.preventDefault()
        const slot = slotMatch[1]

        // 使用异步函数
        ;(async () => {
          // 1. 先保存当前进度到 uTools
          await triggerAutoSave()
          showToast(`💾 已保存，正在切换到槽位 ${slot}...`)

          // 2. 🔥 关键：保存完成后再读取 uTools 自动存档（确保获取最新数据）
          if (window.utools) {
            const saveString = window.utools.dbStorage.getItem('candybox2_autosave')

            if (saveString) {
              const saveData = JSON.parse(saveString)

              // 🔥 关键修复：将数据保存到父窗口的 localStorage
              // 这样 iframe 加载时就可以读取
              localStorage.setItem('candybox2_pending_slot', slot)
              localStorage.setItem('candybox2_pending_data', JSON.stringify(saveData))

              // 3. 切换 iframe URL（iframe 加载后会从父 localStorage 读取数据）
              // 🔥 关键修复：不添加时间戳参数，避免干扰游戏的 URL 解析
              iframeUrl.value = `/candybox2-game.html?slot=${slot}`

              showToast(`✅ 槽位 ${slot} 加载成功`)
            } else {
              // 如果没有存档，直接切换
              iframeUrl.value = `/candybox2-game.html?slot=${slot}&t=${Date.now()}`
              showToast(`⚠️ 槽位 ${slot} 无存档，开始新游戏`)
            }
          } else {
            // 如果没有 uTools，直接切换
            iframeUrl.value = `/candybox2-game.html?slot=${slot}&t=${Date.now()}`
            showToast(`⚠️ 槽位 ${slot} 无存档，开始新游戏`)
          }
        })()

        return false
      }
    }
  }, true)

  // 在 iframe 的 document 上添加键盘监听
  iframe.contentWindow.document.addEventListener('keydown', (e) => {
    // Ctrl+S 或 Cmd+S
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault()
      e.stopPropagation()

      // 调用父窗口的保存函数
      ;(async () => {
        await triggerAutoSave()
        showToast('✅ 保存成功')
        showSaveTimeTemp()
      })()
    }
  }, true)

  // iframe 加载完成后，不再自动调用 loadAutoSave
  // 因为我们在组件挂载时已经用正确的槽位初始化了 iframe
  // 游戏会自动读取对应槽位的存档
}

// 自动保存游戏进度（保存所有槽位数据）
const triggerAutoSave = async () => {
  const iframe = iframeRef.value
  if (!iframe?.contentWindow) {
    return
  }

  try {
    // 检查游戏对象是否存在
    const maxWait = 10 // 最多等待 10 次（1 秒）
    for (let i = 0; i < maxWait; i++) {
      if (iframe.contentWindow.Saving && iframe.contentWindow.LocalSaving) {
        break
      }
      await new Promise(r => setTimeout(r, 100))
    }

    // 如果游戏对象仍未就绪，跳过保存
    if (!iframe.contentWindow.Saving || !iframe.contentWindow.LocalSaving) {
      return
    }

    // 获取当前使用的槽位（从 URL 参数读取）
    const urlParams = new URLSearchParams(iframeUrl.value.split('?')[1])
    const currentSlot = urlParams.get('slot') || '1'

    // 使用劫持 Keyboard.setGame 暴露的 game 对象
    const game = iframe.contentWindow.GAME_OBJECT
    const Saving = iframe.contentWindow.Saving
    const MainLoadingType = iframe.contentWindow.MainLoadingType

    if (game && Saving && MainLoadingType && typeof Saving.save === 'function') {
      const slotName = `slot${currentSlot}`

      // 调用游戏的保存方法
      Saving.save(game, MainLoadingType.LOCAL, slotName)

      // 等待数据写入完成
      await new Promise(r => setTimeout(r, 500))

      // 保存所有 localStorage 数据（包含所有槽位）
      const storage = iframe.contentWindow.localStorage
      const saveData = {
        _metadata: {
          version: "1.0",
          lastSave: new Date().toISOString(),
          currentSlot: currentSlot
        },
        _data: {}
      }

      // 保存所有数据
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        saveData._data[key] = storage.getItem(key)
      }

      // 保存到 uTools
      if (window.utools) {
        const saveKey = 'candybox2_autosave'
        const saveString = JSON.stringify(saveData)
        window.utools.dbStorage.setItem(saveKey, saveString)
        lastSaveTime.value = new Date()

        // 追踪存档操作（埋点）
        analyticsTracker.trackSaveOperation('save', 'candybox2', {
          slot: currentSlot,
          auto: false
        })
      }
    } else {
      // 降级方案：直接调用 LocalSaving.save()
      console.error('❌ Candy Box 2 保存失败：无法访问游戏对象，使用降级方案')
      const LocalSaving = iframe.contentWindow.LocalSaving
      if (LocalSaving && typeof LocalSaving.save === 'function') {
        const slotName = `slot${currentSlot}`
        LocalSaving.save(slotName)
        await new Promise(r => setTimeout(r, 500))

        // 保存所有 localStorage 数据
        const storage = iframe.contentWindow.localStorage
        const saveData = {
          _metadata: {
            version: "1.0",
            lastSave: new Date().toISOString(),
            currentSlot: currentSlot
          },
          _data: {}
        }

        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i)
          saveData._data[key] = storage.getItem(key)
        }

        if (window.utools) {
          const saveKey = 'candybox2_autosave'
          const saveString = JSON.stringify(saveData)
          window.utools.dbStorage.setItem(saveKey, saveString)
          lastSaveTime.value = new Date()
        }
      }
    }
  } catch (error) {
    console.error('❌ Candy Box 2 自动保存失败:', error)
  }
}

onMounted(async () => {
  // 开始游戏会话（埋点）
  analyticsTracker.startGameSession({
    id: 'candybox2',
    name: '糖果盒子2'
  })

  // 3秒后自动隐藏导航栏
  scheduleHideHeader()

  // 启动定时自动保存（每30秒保存一次）
  autoSaveInterval = setInterval(async () => {
    try {
      await triggerAutoSave()
    } catch (error) {
      console.error('❌ Candy Box 2 定时自动保存失败:', error)
    }
  }, AUTO_SAVE_INTERVAL)

  // 读取自动存档，确定应该加载哪个槽位
  let initialSlot = '1' // 默认槽位1

  if (window.utools) {
    const saveKey = 'candybox2_autosave'
    const saveString = window.utools.dbStorage.getItem(saveKey)

    if (saveString) {
      const saveData = JSON.parse(saveString)
      initialSlot = saveData._metadata.currentSlot
      lastSaveTime.value = new Date(saveData._metadata.lastSave)

      // 将数据保存到父窗口 localStorage，iframe 加载时会从这里读取
      localStorage.setItem('candybox2_pending_slot', initialSlot)
      localStorage.setItem('candybox2_pending_data', saveString)
    }
  }

  // 初始化 iframe URL（使用正确的槽位）
  iframeUrl.value = `candybox2-game.html?slot=${initialSlot}`
})

onUnmounted(async () => {
  // 清理定时器
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval)
  }

  // 清理导航栏定时器
  if (headerTimer) {
    clearTimeout(headerTimer)
  }
})
</script>

<template>
  <div class="candybox2-wrapper" @mousemove="onMouseMoveGame">
    <!-- 自定义 Toast 通知 -->
    <Transition name="toast-fade">
      <div v-if="toastVisible" class="toast-notification">
        {{ toastMessage }}
      </div>
    </Transition>

    <!-- 顶部导航栏容器 -->
    <div
      class="header-container"
      :class="{ 'header-hidden': !headerVisible }"
      @mouseenter="onMouseEnterHeader"
      @mouseleave="onMouseLeaveHeader"
    >
      <!-- 顶部导航栏 -->
      <div class="game-header">
          <button class="back-btn" @click="goBack">
            <span class="back-icon">←</span>
            <span class="back-text">返回</span>
          </button>
          <div class="game-title">
            <span class="game-icon">🍬</span>
            <span class="game-title-text">糖果盒子2</span>
            <span class="game-version">v1.2.3</span>
          </div>

          <!-- 保存提示 -->
          <div class="save-info">
            <div class="shortcut-hint">Ctrl+S 保存 | 自动存档已启用</div>
          </div>
        </div>
    </div>

    <!-- 游戏容器 - 使用 iframe 完全隔离 -->
    <div class="game-container">
      <iframe
        ref="iframeRef"
        :src="iframeUrl"
        class="game-iframe"
        title="Candy Box 2"
        frameborder="0"
        @load="setupIframeKeyboardListener"
      ></iframe>

      <!-- 保存时间提示 -->
      <Transition name="save-time-fade">
        <div v-if="showSaveTime && lastSaveTime" class="save-time">
          上次保存: {{ lastSaveTime.toLocaleString('zh-CN') }}
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.candybox2-wrapper {
  width: 100%;
  height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Toast 通知 */
.toast-notification {
  position: fixed;
  top: 80px;
  right: 24px;
  background: rgba(30, 30, 46, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px 24px;
  color: white;
  font-size: 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  z-index: 9998;
  animation: toastSlideIn 0.3s ease-out;
}

@keyframes toastSlideIn {
  from {
    opacity: 0;
    transform: translateX(100px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Toast 淡入淡出动画 */
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(100px);
}

/* 导航栏容器 */
.header-container {
  position: relative;
  z-index: 1000;
  transition: transform 0.3s ease;
  flex-shrink: 0;
}

.header-container.header-hidden {
  transform: translateY(-100%);
}

/* 顶部导航栏 */
.game-header {
  height: 56px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 5px;
  color: white;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateX(-1px);
}

.back-icon {
  font-size: 12px;
  line-height: 1;
}

.back-text {
  font-weight: 500;
}

.game-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.game-icon {
  font-size: 24px;
}

.game-title-text {
  font-size: 18px;
  font-weight: 600;
  color: white;
}

.game-version {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

/* 保存信息 */
.save-info {
  display: flex;
  align-items: center;
}

.shortcut-hint {
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  font-family: monospace;
  white-space: nowrap;
}

/* 游戏容器 */
.game-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #fff;
}

/* 导航栏过渡动画 */
.header-slide-enter-active,
.header-slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.header-slide-enter-from,
.header-slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.game-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

.save-time {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  pointer-events: none;
  backdrop-filter: blur(10px);
}

/* 保存时间淡入淡出动画 */
.save-time-fade-enter-active,
.save-time-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.save-time-fade-enter-from,
.save-time-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .game-header {
    padding: 0 12px;
    flex-wrap: wrap;
    height: auto;
    min-height: 56px;
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .back-btn {
    padding: 5px 8px;
    gap: 3px;
  }

  .back-text {
    display: none;
  }

  .back-icon {
    font-size: 16px;
  }

  .game-title-text {
    font-size: 16px;
  }

  .game-version {
    display: none;
  }

  .save-info {
    width: 100%;
    order: 3;
    justify-content: center;
    margin-top: 8px;
  }

  .save-time {
    bottom: 10px;
    right: 10px;
    font-size: 11px;
    padding: 6px 12px;
  }

  .toast-notification {
    top: 60px;
    right: 12px;
    left: 12px;
    font-size: 13px;
  }
}
</style>
