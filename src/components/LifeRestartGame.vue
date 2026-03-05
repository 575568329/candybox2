<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { analyticsTracker } from '../utils/analyticsTracker'

const router = useRouter()
const iframeRef = ref(null)
const lastSaveTime = ref(null)

// 导航栏自动收起
const headerVisible = ref(true)
let headerTimer = null

// Toast 通知状态
const toastMessage = ref('')
const toastVisible = ref(false)
let toastTimer = null
let autoSaveInterval = null // 自动保存定时器

// 显示 Toast 通知
const showToast = (message, duration = 3000) => {
  toastMessage.value = message
  toastVisible.value = true

  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastVisible.value = false
  }, duration)
}

// 自动保存逻辑
const triggerAutoSave = async () => {
  if (!window.utools || !iframeRef.value || !iframeRef.value.contentWindow) return

  try {
    const iframeStorage = iframeRef.value.contentWindow.localStorage
    const data = {}
    for (let i = 0; i < iframeStorage.length; i++) {
      const key = iframeStorage.key(i)
      data[key] = iframeStorage.getItem(key)
    }

    if (Object.keys(data).length > 0) {
      const saveKey = 'liferestart_autosave'
      const saveData = {
        _metadata: {
          version: "1.0",
          lastSave: new Date().toISOString()
        },
        _data: data
      }
      window.utools.dbStorage.setItem(saveKey, JSON.stringify(saveData))
      lastSaveTime.value = new Date()
      console.log('[LifeRestart] 自动存档成功')
    }
  } catch (error) {
    console.error('[LifeRestart] 自动存档失败:', error)
  }
}

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
  }, 3000)
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
  if (event.clientY < 50) {
    showHeader()
    scheduleHideHeader()
  }
}

// 返回游戏列表
const goBack = () => {
  // 结束游戏会话（埋点）
  analyticsTracker.endGameSession()
  router.push('/')
}

onMounted(() => {
  // 开始游戏会话（埋点）
  analyticsTracker.startGameSession({
    id: 'liferestart',
    name: '人生重开模拟器'
  })

  // 3秒后自动隐藏导航栏
  scheduleHideHeader()

  // 启动定时自动保存（每30秒保存一次）
  autoSaveInterval = setInterval(triggerAutoSave, 30000)

  // 窗口关闭前自动保存
  window.addEventListener('beforeunload', triggerAutoSave)

  // 尝试读取上次保存时间
  if (window.utools) {
    const saveKey = 'liferestart_autosave'
    const saveString = window.utools.dbStorage.getItem(saveKey)
    if (saveString) {
      try {
        const parsedData = JSON.parse(saveString)
        const saveData = parsedData._data || {} // 兼容新旧格式
        
        // 如果有云端存档，且本地没有存档，则加载云端存档
        // 对于人生重开模拟器，直接写入 iframe 的 localStorage 即可
        if (Object.keys(saveData).length > 0) {
          localStorage.setItem('liferestart_pending_data', JSON.stringify(saveData))
          console.log('[LifeRestart] 准备加载云端存档数据')
        }

        // 解析上次保存时间（支持新格式）
        if (parsedData._metadata && parsedData._metadata.lastSave) {
          lastSaveTime.value = new Date(parsedData._metadata.lastSave)
        }
      } catch (error) {
        console.error('[LifeRestart] 解析存档失败:', error)
      }
    }
  }
})

// iframe 加载完成后的处理
const onIframeLoad = () => {
  console.log('[LifeRestart] iframe 加载完成')
  
  // 检查是否有待加载的云端数据
  const pendingData = localStorage.getItem('liferestart_pending_data')
  if (pendingData && iframeRef.value && iframeRef.value.contentWindow) {
    try {
      const data = JSON.parse(pendingData)
      const iframeStorage = iframeRef.value.contentWindow.localStorage
      
      // 检查当前 iframe 内是否已经有存档（如果本地有更旧或一样的，则覆盖）
      // 这里简单处理：如果本地没数据，才覆盖；或者直接覆盖。
      // 通常 LifeRestart 是单次游戏，所以直接覆盖比较稳妥。
      for (const key in data) {
        iframeStorage.setItem(key, data[key])
      }
      
      console.log('[LifeRestart] 已将云端存档应用到 iframe')
      localStorage.removeItem('liferestart_pending_data')
      
      // 刷新一次 iframe 以应用 localStorage
      // iframeRef.value.contentWindow.location.reload()
    } catch (e) {
      console.error('[LifeRestart] 应用云端存档失败:', e)
    }
  }
}

onUnmounted(() => {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval)
  }
  window.removeEventListener('beforeunload', triggerAutoSave)
  if (headerTimer) {
    clearTimeout(headerTimer)
  }
  if (toastTimer) {
    clearTimeout(toastTimer)
  }
  // 结束游戏会话（埋点）
  analyticsTracker.endGameSession()
})
</script>

<template>
  <div class="liferestart-wrapper" @mousemove="onMouseMoveGame">
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
      <div class="game-header">
        <button class="back-btn" @click="goBack">
          <span class="back-icon">←</span>
          <span class="back-text">返回</span>
        </button>
        <div class="game-title">
          <span class="game-icon">🔄</span>
          <span class="game-title-text">人生重开模拟器</span>
        </div>
        <div class="save-info">
          <div class="shortcut-hint">自动存档已启用</div>
        </div>
      </div>
    </div>

    <!-- 游戏容器 -->
    <div class="game-container">
      <iframe
        ref="iframeRef"
        src="lifeRestart/index.html"
        class="game-iframe"
        title="Life Restart"
        frameborder="0"
        @load="onIframeLoad"
      ></iframe>

      <!-- 保存时间提示 -->
      <Transition name="save-time-fade">
        <div v-if="lastSaveTime" class="save-time">
          上次保存: {{ lastSaveTime.toLocaleString('zh-CN') }}
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.liferestart-wrapper {
  width: 100%;
  height: 100vh;
  background: #000;
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
  background: #000;
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
