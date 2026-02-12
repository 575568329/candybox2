<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { analyticsTracker } from '../utils/analyticsTracker'

const router = useRouter()

const iframeRef = ref(null)
const isLoading = ref(true)
const hasError = ref(false)

// 导航栏自动收起
const headerVisible = ref(true)
let headerTimer = null

// uTools云存档相关
const GAME_ID = 'adarkroom'
const UTOOLS_STORAGE_KEY = 'game_save_adarkroom'

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

// 退出确认
const showExitConfirm = ref(false)

// 组件挂载
onMounted(() => {
  console.log('[小黑屋] 组件已挂载')

  // 开始游戏会话（埋点）
  analyticsTracker.startGameSession({
    id: 'adarkroom',
    name: '小黑屋'
  })

  // 3秒后自动隐藏导航栏
  scheduleHideHeader()
})

// 返回游戏列表
const goBack = () => {
  showExitConfirm.value = true
}

const confirmExit = () => {
  showExitConfirm.value = false

  // 结束游戏会话（埋点）
  analyticsTracker.endGameSession()

  router.push('/')
}

const cancelExit = () => {
  showExitConfirm.value = false
}

// iframe 加载完成
const onIframeLoad = () => {
  console.log('[小黑屋] iframe 加载完成')
  isLoading.value = false
  hasError.value = false

  // 注册消息监听器，处理iframe的存档请求
  window.addEventListener('message', handleIframeMessage)
}

// 处理来自iframe的消息
const handleIframeMessage = async (event) => {
  // 验证消息来源
  if (event.origin !== window.location.origin) {
    return
  }

  const { type, data } = event.data

  switch(type) {
    case 'adarkroom-save-request':
      // 游戏请求保存存档到uTools
      await handleSaveToUTools(data)
      break

    case 'adarkroom-load-save-request':
      // 游戏请求从uTools加载存档
      await handleLoadFromUTools()
      break
  }
}

// 保存存档到uTools
const handleSaveToUTools = async (data) => {
  try {
    console.log('[小黑屋] 收到保存请求', data)

    if (window.utools && window.utools.db) {
      // 保存到uTools数据库
      const saveDoc = {
        _id: UTOOLS_STORAGE_KEY,
        gameState: data.gameState,
        timestamp: data.timestamp || Date.now(),
        updatedAt: Date.now()
      }

      // 使用promises API或回退到同步API
      if (window.utools.db.promises && window.utools.db.promises.put) {
        await window.utools.db.promises.put(saveDoc)
      } else {
        window.utools.db.put(saveDoc)
      }

      console.log('[小黑屋] 存档已保存到uTools')

      // 追踪存档操作（埋点）
      analyticsTracker.trackSaveOperation('save', 'adarkroom', {
        auto: false
      })

      // 发送确认消息给iframe
      if (iframeRef.value && iframeRef.value.contentWindow) {
        iframeRef.value.contentWindow.postMessage({
          type: 'adarkroom-save-response',
          data: { success: true }
        }, '*')
      }
    } else {
      // 非uTools环境，保存到localStorage作为备份
      localStorage.setItem(UTOOLS_STORAGE_KEY, JSON.stringify(data))
      console.log('[小黑屋] 存档已保存到localStorage（非uTools环境）')
    }
  } catch (error) {
    console.error('[小黑屋] 保存存档失败:', error)
  }
}

// 从uTools加载存档
const handleLoadFromUTools = async () => {
  try {
    console.log('[小黑屋] 收到加载请求')

    let gameStateData = null

    if (window.utools && window.utools.db) {
      // 从uTools数据库读取
      let docs = []

      if (window.utools.db.promises && window.utools.db.promises.allDocs) {
        docs = await window.utools.db.promises.allDocs(UTOOLS_STORAGE_KEY)
      } else {
        docs = window.utools.db.allDocs(UTOOLS_STORAGE_KEY)
      }

      if (docs && docs.length > 0) {
        gameStateData = docs[0].gameState
        console.log('[小黑屋] 从uTools加载存档成功')
      }
    } else {
      // 非uTools环境，从localStorage读取
      const savedData = localStorage.getItem(UTOOLS_STORAGE_KEY)
      if (savedData) {
        const parsed = JSON.parse(savedData)
        gameStateData = parsed.gameState
        console.log('[小黑屋] 从localStorage加载存档（非uTools环境）')
      }
    }

    // 发送存档数据给iframe
    if (iframeRef.value && iframeRef.value.contentWindow) {
      iframeRef.value.contentWindow.postMessage({
        type: 'adarkroom-load-save-response',
        data: { gameState: gameStateData }
      }, '*')
    }
  } catch (error) {
    console.error('[小黑屋] 加载存档失败:', error)

    // 即使出错也发送响应（空存档）
    if (iframeRef.value && iframeRef.value.contentWindow) {
      iframeRef.value.contentWindow.postMessage({
        type: 'adarkroom-load-save-response',
        data: { gameState: null }
      }, '*')
    }
  }
}

// iframe 加载失败
const onIframeError = () => {
  console.error('[小黑屋] iframe 加载失败')
  isLoading.value = false
  hasError.value = true
}

onUnmounted(() => {
  console.log('[小黑屋] 组件已卸载')
  // 清除定时器
  if (headerTimer) {
    clearTimeout(headerTimer)
    headerTimer = null
  }
  // 移除消息监听器
  window.removeEventListener('message', handleIframeMessage)
})
</script>

<template>
  <div class="adarkroom-view" @mousemove="onMouseMoveGame">
    <!-- 顶部导航栏容器 -->
    <div
      class="header-container"
      :class="{ 'header-hidden': !headerVisible }"
      @mouseenter="onMouseEnterHeader"
      @mouseleave="onMouseLeaveHeader"
    >
      <!-- 顶部导航栏 -->
      <div class="game-header">
        <button
          class="back-btn"
          @click="goBack"
          title="返回游戏列表"
        >
          <span class="back-icon">←</span>
          <span class="back-text">返回</span>
        </button>
        <div class="game-title">
          <span class="game-icon">🏚️</span>
          <div class="title-text">
            <h1 class="game-name">小黑屋</h1>
            <p class="game-english-name">A Dark Room - 自动云存档已启用</p>
          </div>
        </div>
        <!-- 提示横幅 -->
      <div class="tip-banner">
        <span class="cloud-save-icon">☁️</span>
        <span class="cloud-save-text">游戏已自动保存到uTools云存储</span>
      </div>
      </div>

      
    </div>

    <!-- 游戏容器 -->
    <div class="game-container">
      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p class="loading-text">正在加载游戏...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="hasError" class="error-state">
        <div class="error-icon">⚠️</div>
        <h2 class="error-title">游戏加载失败</h2>
        <p class="error-message">无法加载游戏，请检查网络连接</p>
        <button class="error-btn" @click="goBack">返回游戏列表</button>
      </div>

      <!-- 游戏框架 -->
      <iframe
        v-show="!isLoading && !hasError"
        ref="iframeRef"
        src="adarkroom/index.html?lang=zh_cn"
        class="game-frame"
        @load="onIframeLoad"
        @error="onIframeError"
        frameborder="0"
        allowfullscreen
      ></iframe>
    </div>

    <!-- 退出确认弹窗 -->
    <transition name="fade">
      <div v-if="showExitConfirm" class="confirm-overlay" @click="cancelExit">
        <div class="confirm-dialog" @click.stop>
          <div class="confirm-header">
            <div class="confirm-icon">🚪</div>
            <h3>退出游戏</h3>
          </div>
          <div class="confirm-body">
            <p>确定要退出游戏吗？</p>
            <span class="tip-text">游戏已自动保存到uTools云存储，下次打开会自动恢复</span>
          </div>
          <div class="confirm-footer">
            <button class="confirm-btn cancel" @click="cancelExit">
              <span class="btn-icon">↩</span>
              <span>取消</span>
            </button>
            <button class="confirm-btn primary" @click="confirmExit">
              <span class="btn-icon">✓</span>
              <span>退出</span>
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.adarkroom-view {
  width: 100%;
  height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

/* 导航栏容器 */
.header-container {
  position: relative;
  z-index: 100;
  transition: transform 0.3s ease;
  flex-shrink: 0;
}

.header-container.header-hidden {
  transform: translateY(-100%);
}

/* 顶部导航栏 */
.game-header {
  height: 48px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
}

.tip-icon {
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
}

.tip-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.4;
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
  gap: 10px;
}

.game-icon {
  font-size: 24px;
  line-height: 1;
}

.title-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.game-name {
  font-size: 16px;
  font-weight: 600;
  color: white;
  line-height: 1.2;
}

.game-english-name {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.2;
}

/* 云存档提示横幅 */
.tip-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(76, 175, 80, 0.15);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 6px;
  padding: 6px 12px;
}

.cloud-save-icon {
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
}

.cloud-save-text {
  font-size: 11px;
  color: rgba(76, 175, 80, 0.9);
  font-weight: 500;
  line-height: 1.4;
}

/* 游戏容器 */
.game-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #fff;
}

.game-frame {
  width: 100%;
  height: 100%;
  border: none;
}

/* 加载状态 */
.loading-state {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  background: #000;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
}

/* 错误状态 */
.error-state {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: #000;
  padding: 20px;
}

.error-icon {
  font-size: 64px;
  opacity: 0.5;
}

.error-title {
  font-size: 24px;
  font-weight: 600;
  color: #fff;
}

.error-message {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  max-width: 400px;
}

.error-btn {
  margin-top: 16px;
  padding: 10px 24px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.error-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

/* 退出确认弹窗 */
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.confirm-dialog {
  background: linear-gradient(135deg, #1e1e32 0%, #1a1a2e 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  min-width: 400px;
  max-width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.confirm-header {
  text-align: center;
  margin-bottom: 12px;
  padding-top: 8px;
  position: relative;
}

.confirm-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.confirm-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.confirm-body {
  text-align: center;
  margin-bottom: 24px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.confirm-body p {
  margin: 0;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
}

.confirm-footer {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.confirm-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  flex: 1;
  justify-content: center;
}

.confirm-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.confirm-btn.primary {
  background: rgba(76, 175, 80, 0.15);
  border-color: rgba(76, 175, 80, 0.3);
  color: #4caf50;
}

.confirm-btn.primary:hover {
  background: rgba(76, 175, 80, 0.25);
  border-color: rgba(76, 175, 80, 0.4);
}

.confirm-btn.cancel {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.confirm-btn .btn-icon {
  font-size: 16px;
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
