<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const iframeRef = ref(null)
const isLoading = ref(true)
const hasError = ref(false)

// 音效开关状态
const soundEnabled = ref(false)

// 计算坦克游戏 URL，确保在开发和生产环境都能正确加载
const tankGameUrl = computed(() => {
  // 使用相对路径，兼容开发和打包后的环境
  return './tank/index.html'
})

// 游戏缩放
const gameScale = ref(1)
const gameTransform = ref('')

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
  console.log('[Tank] 组件已挂载')
  // 3秒后自动隐藏导航栏
  scheduleHideHeader()
  // 计算游戏缩放
  calculateGameScale()
  // 监听窗口大小变化
  window.addEventListener('resize', calculateGameScale)
})

// 计算游戏缩放比例
const calculateGameScale = () => {
  // 坦克大战原始尺寸: 512x416
  const originalWidth = 512
  const originalHeight = 416

  // 获取容器可用尺寸（减去导航栏）
  const containerWidth = window.innerWidth
  const containerHeight = window.innerHeight - 48 // 减去导航栏高度

  // 计算缩放比例，保持游戏宽高比
  const scaleX = containerWidth / originalWidth
  const scaleY = containerHeight / originalHeight
  const scale = Math.min(scaleX, scaleY) // 自适应缩放

  gameScale.value = scale

  // 只设置缩放，由flex布局居中
  gameTransform.value = `scale(${scale})`

  console.log('[Tank] 游戏缩放:', scale)
}

// 返回游戏列表
const goBack = () => {
  showExitConfirm.value = true
}

const confirmExit = () => {
  showExitConfirm.value = false
  router.push('/')
}

const cancelExit = () => {
  showExitConfirm.value = false
}

// iframe 加载完成
const onIframeLoad = () => {
  console.log('[Tank] iframe 加载完成')
  isLoading.value = false
  hasError.value = false
  // 发送初始音效状态到游戏
  sendSoundState()
}

// 发送音效状态到 iframe
const sendSoundState = () => {
  if (iframeRef.value && iframeRef.value.contentWindow) {
    iframeRef.value.contentWindow.postMessage({
      type: 'toggleSound',
      enabled: soundEnabled.value
    }, '*')
  }
}

// 切换音效
const toggleSound = () => {
  soundEnabled.value = !soundEnabled.value
  sendSoundState()
}

// iframe 加载失败
const onIframeError = () => {
  console.error('[Tank] iframe 加载失败')
  isLoading.value = false
  hasError.value = true
}

onUnmounted(() => {
  console.log('[Tank] 组件已卸载')
  // 清除定时器
  if (headerTimer) {
    clearTimeout(headerTimer)
    headerTimer = null
  }
  // 移除窗口大小监听
  window.removeEventListener('resize', calculateGameScale)
})
</script>

<template>
  <div class="tank-view" @mousemove="onMouseMoveGame">
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
          <span class="game-icon">🎖️</span>
          <div class="title-text">
            <h1 class="game-name">坦克大战</h1>
            <p class="game-english-name">Tank Battle - 经典射击游戏</p>
          </div>
        </div>
        <button
          class="sound-btn"
          @click="toggleSound"
          :title="soundEnabled ? '关闭音效' : '开启音效'"
        >
          <span class="sound-icon">{{ soundEnabled ? '🔊' : '🔇' }}</span>
        </button>
      </div>
    </div>

    <!-- 游戏容器 -->
    <div class="game-container" ref="gameContainer">
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

      <!-- 游戏框架容器 -->
      <div
        v-show="!isLoading && !hasError"
        class="game-frame-wrapper"
        :style="{ transform: gameTransform }"
      >
        <iframe
          ref="iframeRef"
          :src="tankGameUrl"
          class="game-frame"
          @load="onIframeLoad"
          @error="onIframeError"
          frameborder="0"
          allowfullscreen
        ></iframe>
      </div>
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

.tank-view {
  width: 100%;
  height: 100vh;
  background: #1a1a2e;
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
  color: #5c6bc0;
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

/* 音效按钮 */
.sound-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s;
}

.sound-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.sound-icon {
  font-size: 16px;
}

/* 游戏容器 */
.game-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #000;
}

/* 游戏框架包装器 - 用于缩放和定位 */
.game-frame-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-origin: center center;
  transition: transform 0.1s ease-out;
}

.game-frame {
  width: 512px;
  height: 416px;
  border: none;
  display: block;
  background: #000;
  box-sizing: border-box;
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
  background: #1a1a2e;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #5c6bc0;
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
  background: #1a1a2e;
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
  background: #5c6bc0;
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
  background: #1a1a2e;
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
