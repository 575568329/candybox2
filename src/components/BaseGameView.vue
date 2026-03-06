<script setup>
/**
 * 游戏视图基础组件
 * 提供通用的导航栏、加载状态、错误状态和退出确认功能
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { analyticsTracker } from '../utils/analyticsTracker'

const props = defineProps({
  // 游戏ID（用于埋点）
  gameId: {
    type: String,
    required: true
  },
  // 游戏名称
  gameName: {
    type: String,
    required: true
  },
  // 游戏英文名称
  gameEnglishName: {
    type: String,
    default: ''
  },
  // 游戏图标（emoji）
  gameIcon: {
    type: String,
    default: '🎮'
  },
  // 是否显示云存档提示
  showCloudSaveTip: {
    type: Boolean,
    default: false
  },
  // 背景颜色
  backgroundColor: {
    type: String,
    default: '#1a1a2e'
  },
  // 是否启用自动隐藏导航栏
  autoHideHeader: {
    type: Boolean,
    default: true
  },
  // 自动隐藏延迟（毫秒）
  autoHideDelay: {
    type: Number,
    default: 3000
  }
})

const emit = defineEmits(['mounted', 'unmounted'])

const router = useRouter()

// 导航栏状态
const headerVisible = ref(true)
let headerTimer = null

// 加载状态
const isLoading = ref(true)
const hasError = ref(false)

// 退出确认
const showExitConfirm = ref(false)

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
  if (!props.autoHideHeader) return
  if (headerTimer) {
    clearTimeout(headerTimer)
  }
  headerTimer = setTimeout(() => {
    hideHeader()
  }, props.autoHideDelay)
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

// 返回游戏列表
const goBack = () => {
  showExitConfirm.value = true
}

// 确认退出
const confirmExit = () => {
  showExitConfirm.value = false
  analyticsTracker.endGameSession()
  router.push('/')
}

// 取消退出
const cancelExit = () => {
  showExitConfirm.value = false
}

// 设置加载状态
const setLoading = (loading) => {
  isLoading.value = loading
}

// 设置错误状态
const setError = (error) => {
  hasError.value = error
  isLoading.value = false
}

// 组件挂载
onMounted(() => {
  // 开始游戏会话（埋点）
  analyticsTracker.startGameSession({
    id: props.gameId,
    name: props.gameName
  })

  // 延迟隐藏导航栏
  scheduleHideHeader()

  emit('mounted')
})

// 组件卸载
onUnmounted(() => {
  // 结束游戏会话
  analyticsTracker.endGameSession()

  // 清除定时器
  if (headerTimer) {
    clearTimeout(headerTimer)
    headerTimer = null
  }

  emit('unmounted')
})

// 暴露方法给父组件
defineExpose({
  showHeader,
  hideHeader,
  scheduleHideHeader,
  setLoading,
  setError,
  goBack
})
</script>

<template>
  <div class="base-game-view" :style="{ backgroundColor }" @mousemove="onMouseMoveGame">
    <!-- 顶部导航栏容器 -->
    <div
      class="header-container"
      :class="{ 'header-hidden': !headerVisible }"
      @mouseenter="onMouseEnterHeader"
      @mouseleave="onMouseLeaveHeader"
    >
      <!-- 顶部导航栏 -->
      <div class="game-header">
        <button class="back-btn" @click="goBack" title="返回游戏列表">
          <span class="back-icon">←</span>
          <span class="back-text">返回</span>
        </button>
        <div class="game-title">
          <span class="game-icon">{{ gameIcon }}</span>
          <div class="title-text">
            <h1 class="game-name">{{ gameName }}</h1>
            <p class="game-english-name">{{ gameEnglishName }}</p>
          </div>
        </div>
        <!-- 云存档提示 -->
        <div v-if="showCloudSaveTip" class="tip-banner">
          <span class="cloud-save-icon">☁️</span>
          <span class="cloud-save-text">游戏已自动保存到uTools云存储</span>
        </div>
        <div v-else class="spacer"></div>
      </div>
    </div>

    <!-- 游戏内容插槽 -->
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

      <!-- 游戏内容 -->
      <slot v-show="!isLoading && !hasError"></slot>
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
            <span v-if="showCloudSaveTip" class="tip-text">游戏已自动保存到uTools云存储，下次打开会自动恢复</span>
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

.base-game-view {
  width: 100%;
  height: 100vh;
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

.spacer {
  width: 60px;
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

.tip-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.4;
}

/* 游戏容器 */
.game-container {
  flex: 1;
  position: relative;
  overflow: hidden;
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
  background: inherit;
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

@media (max-width: 600px) {
  .confirm-dialog {
    min-width: 320px;
  }

  .confirm-btn {
    padding: 8px 16px;
  }
}
</style>
