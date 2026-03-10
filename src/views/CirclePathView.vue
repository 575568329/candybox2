<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { analyticsTracker } from '../utils/analyticsTracker'

const router = useRouter()

const iframeRef = ref(null)
const isLoading = ref(true)
const hasError = ref(false)

// uTools云存档相关
const GAME_ID = 'circlepath'
const UTOOLS_STORAGE_KEY = 'game_save_circlepath'

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

// 退出确认
const showExitConfirm = ref(false)

// 组件挂载
onMounted(() => {
  console.log('[CirclePath] 组件已挂载')

  // 注册消息监听器，处理iframe的存档请求
  window.addEventListener('message', handleIframeMessage)

  // 开始游戏会话（埋点）
  analyticsTracker.startGameSession({
    id: 'circlepath',
    name: '环形之路'
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
  console.log('[CirclePath] iframe 加载完成')
  isLoading.value = false
  hasError.value = false
}

// iframe 加载失败
const onIframeError = () => {
  console.error('[CirclePath] iframe 加载失败')
  isLoading.value = false
  hasError.value = true
}

// 切换地图
const changeMap = () => {
  if (iframeRef.value && iframeRef.value.contentWindow) {
    iframeRef.value.contentWindow.postMessage({ type: 'CHANGE_MAP' }, '*')
  }
}

// 处理来自iframe的消息
const handleIframeMessage = async (event) => {
  // 验证消息来源
  if (event.origin !== window.location.origin) {
    return
  }

  // 防护：确保 event.data 是对象类型
  if (!event.data || typeof event.data !== 'object') {
    return
  }

  const { type, data } = event.data

  switch(type) {
    case 'circlepath-save-request':
      // 游戏请求保存存档到uTools
      await handleSaveToUTools(data)
      break

    case 'circlepath-load-save-request':
      // 游戏请求从uTools加载存档
      await handleLoadFromUTools()
      break
  }
}

// 保存存档到uTools
const handleSaveToUTools = async (data) => {
  try {
    console.log('[CirclePath] 收到保存请求', data)

    if (window.utools && window.utools.db) {
      // 1. 先获取已有存档的 _rev，以便更新
      let existingDoc = null
      if (window.utools.db.promises && window.utools.db.promises.get) {
        existingDoc = await window.utools.db.promises.get(UTOOLS_STORAGE_KEY)
      } else {
        existingDoc = window.utools.db.get(UTOOLS_STORAGE_KEY)
      }

      // 2. 准备新的存档文档
      const saveDoc = {
        _id: UTOOLS_STORAGE_KEY,
        saveData: data.saveData,
        timestamp: data.timestamp || Date.now(),
        updatedAt: Date.now()
      }

      // 如果已有存档，添加 _rev 字段进行更新
      if (existingDoc && existingDoc._rev) {
        saveDoc._rev = existingDoc._rev
      }

      // 3. 保存到uTools数据库
      let result
      if (window.utools.db.promises && window.utools.db.promises.put) {
        result = await window.utools.db.promises.put(saveDoc)
      } else {
        result = window.utools.db.put(saveDoc)
      }

      if (result && result.error) {
        throw new Error(result.message || '保存到 uTools 数据库失败')
      }

      console.log('[CirclePath] 存档已保存到uTools', result)

      // 追踪存档操作（埋点）
      analyticsTracker.trackSaveOperation('save', 'circlepath', {
        auto: true // 自动存档
      })

      // 发送确认消息给iframe
      if (iframeRef.value && iframeRef.value.contentWindow) {
        iframeRef.value.contentWindow.postMessage({
          type: 'circlepath-save-response',
          data: { success: true }
        }, '*')
      }
    } else {
      // 非uTools环境，保存到localStorage作为备份
      localStorage.setItem(UTOOLS_STORAGE_KEY, JSON.stringify(data))
      console.log('[CirclePath] 存档已保存到localStorage（非uTools环境）')
    }
  } catch (error) {
    console.error('[CirclePath] 保存存档失败:', error)
  }
}

// 从uTools加载存档
const handleLoadFromUTools = async () => {
  try {
    console.log('[CirclePath] 收到加载请求')

    let saveData = null

    if (window.utools && window.utools.db) {
      // 从uTools数据库直接读取具体的文档
      let doc = null
      if (window.utools.db.promises && window.utools.db.promises.get) {
        doc = await window.utools.db.promises.get(UTOOLS_STORAGE_KEY)
      } else {
        doc = window.utools.db.get(UTOOLS_STORAGE_KEY)
      }

      if (doc && doc.saveData) {
        saveData = doc.saveData
        console.log('[CirclePath] 从uTools加载存档成功')
      }
    } else {
      // 非uTools环境，从localStorage读取
      const savedData = localStorage.getItem(UTOOLS_STORAGE_KEY)
      if (savedData) {
        const parsed = JSON.parse(savedData)
        saveData = parsed.saveData
        console.log('[CirclePath] 从localStorage加载存档（非uTools环境）')
      }
    }

    // 发送存档数据给iframe
    if (iframeRef.value && iframeRef.value.contentWindow) {
      iframeRef.value.contentWindow.postMessage({
        type: 'circlepath-load-save-response',
        data: saveData
      }, '*')
    }
  } catch (error) {
    console.error('[CirclePath] 加载存档失败:', error)

    // 即使出错也发送响应（空存档）
    if (iframeRef.value && iframeRef.value.contentWindow) {
      iframeRef.value.contentWindow.postMessage({
        type: 'circlepath-load-save-response',
        data: null
      }, '*')
    }
  }
}

onUnmounted(() => {
  console.log('[CirclePath] 组件已卸载')

  // 如果还有未结束的会话，结束它
  analyticsTracker.endGameSession()

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
  <div class="circlepath-view" @mousemove="onMouseMoveGame">
    <!-- 顶部感应区，用于在导航栏隐藏时唤出 -->
    <div class="header-trigger" @mouseenter="showHeader"></div>

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
          <span class="game-icon">●</span>
          <div class="title-text">
            <h1 class="game-name">环形之路</h1>
            <p class="game-english-name">Circle Path - 自动云存档已启用</p>
          </div>
        </div>
        <button
          class="map-btn"
          @click="changeMap"
          title="切换地图"
        >
          <span class="map-icon">🎨</span>
          <span class="map-text">切换地图</span>
        </button>
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
        src="circlepath/index.html"
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

.circlepath-view {
  width: 100%;
  height: 100vh;
  background: #1a1a1a;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

/* 导航栏容器 */
.header-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  transition: transform 0.3s ease;
}

/* 顶部感应区 */
.header-trigger {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 15px;
  z-index: 99;
}

.header-container.header-hidden {
  transform: translateY(-100%);
}

/* 顶部导航栏 */
.game-header {
  height: 48px;
  background: rgba(0, 0, 0, 0.5);
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
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: white;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.map-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: white;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.map-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.game-title {
  display: flex;
  align-items: center;
  gap: 12px;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.game-icon {
  font-size: 24px;
  color: #62bd18;
}

.title-text {
  display: flex;
  flex-direction: column;
}

.game-name {
  font-size: 16px;
  font-weight: 600;
  color: white;
  line-height: 1.2;
}

.game-english-name {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.2;
}

.spacer {
  width: 60px;
}

/* 游戏容器 */
.game-container {
  flex: 1;
  position: relative;
  overflow: hidden;
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
  background: #1a1a1a;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #62bd18;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
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
  background: #1a1a1a;
  padding: 20px;
}

.error-icon {
  font-size: 48px;
}

.error-title {
  font-size: 20px;
  color: white;
}

.error-message {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
}

.error-btn {
  margin-top: 16px;
  padding: 8px 20px;
  background: #62bd18;
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
}

/* 退出确认弹窗 */
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.confirm-dialog {
  background: #2c3e50;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 24px;
  width: 300px;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
}

.confirm-header h3 {
  color: white;
  margin-bottom: 16px;
}

.confirm-body p {
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 24px;
}

.confirm-footer {
  display: flex;
  gap: 12px;
}

.confirm-btn {
  flex: 1;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  border: none;
  font-weight: 500;
}

.confirm-btn.primary {
  background: #e74c3c;
  color: white;
}

.confirm-btn.cancel {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

/* 过渡动画 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>