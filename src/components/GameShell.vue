<script setup>
/**
 * GameShell —— 统一游戏壳组件（方案 docs/plans/2026-10-27-layout-refactor-design.md 阶段1）
 *
 * 吸收此前 7 个视图各自复制的壳层逻辑：
 * - 顶部栏：返回按钮(带退出确认) / 标题区 / 云存档提示 / 动作按钮插槽(#actions)
 * - 自动隐藏头部：鼠标移入顶部 50px 唤回，静止 autoHideDelay 后收起
 * - 埋点会话：挂载即 startGameSession，返回/卸载时 endGameSession
 * - 加载/错误状态覆盖层（由 :loading / :error 驱动）
 *
 * 游戏内容（iframe 等）放默认插槽；壳层样式全部走 tokens.css 设计令牌。
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { analyticsTracker } from '../utils/analyticsTracker'

const props = defineProps({
  // 游戏ID（埋点用）
  gameId: { type: String, required: true },
  // 游戏名称（标题 + 埋点用）
  gameName: { type: String, required: true },
  // 副标题（英文名/说明）
  gameEnglishName: { type: String, default: '' },
  // 图标（emoji 或 SVG html；来自内部静态配置，非用户输入）
  gameIcon: { type: String, default: '🎮' },
  // 图标着色（SVG 用 currentColor 时生效）
  iconColor: { type: String, default: 'var(--gs-accent)' },
  // 壳层背景色
  backgroundColor: { type: String, default: 'var(--gs-bg-app)' },
  // 强调色（加载动画/错误按钮）
  accentColor: { type: String, default: 'var(--gs-accent)' },
  // 显示云存档提示条
  showCloudSaveTip: { type: Boolean, default: false },
  // 是否启用头部自动隐藏
  autoHideHeader: { type: Boolean, default: true },
  // 自动隐藏延迟（毫秒）
  autoHideDelay: { type: Number, default: 3000 },
  // 加载中（覆盖层）
  loading: { type: Boolean, default: false },
  // 加载失败（覆盖层）
  error: { type: Boolean, default: false },
  // 返回时弹退出确认
  exitConfirm: { type: Boolean, default: true },
  // 退出前钩子（如退出前自动保存存档；完成后才真正返回）
  beforeExit: { type: Function, default: null }
})

const router = useRouter()

// ===== 头部自动隐藏 =====
const headerVisible = ref(true)
let headerTimer = null

const showHeader = () => {
  headerVisible.value = true
  if (headerTimer) {
    clearTimeout(headerTimer)
    headerTimer = null
  }
}

const scheduleHideHeader = () => {
  if (!props.autoHideHeader) return
  if (headerTimer) clearTimeout(headerTimer)
  headerTimer = setTimeout(() => {
    headerVisible.value = false
  }, props.autoHideDelay)
}

const onMouseEnterHeader = () => showHeader()
const onMouseLeaveHeader = () => scheduleHideHeader()

const onMouseMove = (event) => {
  if (event.clientY < 50) {
    showHeader()
    scheduleHideHeader()
  }
}

// ===== 返回（带退出确认）=====
const showExitConfirm = ref(false)

const goBack = () => {
  if (props.exitConfirm) {
    showExitConfirm.value = true
  } else {
    confirmExit()
  }
}

const confirmExit = async () => {
  showExitConfirm.value = false
  if (props.beforeExit) {
    try {
      await props.beforeExit()
    } catch (e) {
      console.error('[GameShell] beforeExit 钩子失败:', e)
    }
  }
  analyticsTracker.endGameSession()
  router.push('/')
}

const cancelExit = () => {
  showExitConfirm.value = false
}

// ===== 生命周期 + 埋点会话 =====
onMounted(() => {
  analyticsTracker.startGameSession({ id: props.gameId, name: props.gameName })
  scheduleHideHeader()
})

onUnmounted(() => {
  analyticsTracker.endGameSession()
  if (headerTimer) {
    clearTimeout(headerTimer)
    headerTimer = null
  }
})
</script>

<template>
  <div class="game-shell" :style="{ backgroundColor }" @mousemove="onMouseMove">
    <!-- 顶部感应区：头部隐藏时唤出 -->
    <div v-if="autoHideHeader" class="gs-header-trigger" @mouseenter="showHeader"></div>

    <!-- 顶部栏 -->
    <div
      class="gs-header"
      :class="{ 'gs-header-hidden': autoHideHeader && !headerVisible }"
      @mouseenter="onMouseEnterHeader"
      @mouseleave="onMouseLeaveHeader"
    >
      <button class="gs-back-btn" @click="goBack" title="返回游戏列表">
        <span class="gs-back-icon">←</span>
        <span class="gs-back-text">返回</span>
      </button>

      <div class="gs-title">
        <!-- 安全说明: gameIcon 来自内部静态配置/emoji, 非用户输入 -->
        <span class="gs-icon" :style="{ color: iconColor }" v-html="gameIcon"></span>
        <div class="gs-title-text">
          <h1 class="gs-name">{{ gameName }}</h1>
          <p v-if="gameEnglishName" class="gs-subtitle">{{ gameEnglishName }}</p>
        </div>
      </div>

      <div class="gs-header-right">
        <div v-if="showCloudSaveTip" class="gs-cloud-tip">
          <span class="gs-cloud-icon">☁️</span>
          <span>游戏已自动保存到uTools云存储</span>
        </div>
        <slot name="actions"></slot>
      </div>
    </div>

    <!-- 游戏内容 -->
    <div class="gs-game">
      <slot></slot>

      <div v-if="loading" class="gs-loading">
        <div class="gs-spinner" :style="{ borderTopColor: accentColor }"></div>
        <p class="gs-loading-text">正在加载游戏...</p>
      </div>

      <div v-else-if="error" class="gs-error">
        <div class="gs-error-icon">⚠️</div>
        <h2 class="gs-error-title">游戏加载失败</h2>
        <p class="gs-error-message">无法加载游戏，请检查网络连接</p>
        <button class="gs-error-btn" :style="{ background: accentColor }" @click="goBack">返回游戏列表</button>
      </div>
    </div>

    <!-- 退出确认弹窗 -->
    <transition name="gs-fade">
      <div v-if="showExitConfirm" class="gs-confirm-overlay" @click="cancelExit">
        <div class="gs-confirm-dialog" @click.stop>
          <div class="gs-confirm-header">
            <div class="gs-confirm-icon">🚪</div>
            <h3>退出游戏</h3>
          </div>
          <div class="gs-confirm-body">
            <p>确定要退出游戏吗？</p>
          </div>
          <div class="gs-confirm-footer">
            <button class="gs-confirm-btn gs-cancel" @click="cancelExit">↩ 取消</button>
            <button class="gs-confirm-btn gs-primary" @click="confirmExit">✓ 退出</button>
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

.game-shell {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: var(--gs-text-1);
}

/* ===== 头部 ===== */
.gs-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  min-height: var(--gs-header-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: var(--gs-shell-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--gs-border);
  transition: transform 0.3s ease;
}

.gs-header-hidden {
  transform: translateY(-100%);
}

.gs-header-trigger {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 15px;
  z-index: 99;
}

.gs-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  padding: 4px 12px;
  background: var(--gs-btn-bg);
  border: 1px solid var(--gs-btn-border);
  border-radius: var(--gs-radius);
  color: var(--gs-text-1);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.gs-back-btn:hover {
  background: var(--gs-btn-bg-hover);
  border-color: var(--gs-btn-border-hover);
}

.gs-title {
  display: flex;
  align-items: center;
  gap: 12px;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.gs-icon {
  font-size: 22px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
}

.gs-icon :deep(svg) {
  width: 24px;
  height: 24px;
}

.gs-title-text {
  display: flex;
  flex-direction: column;
}

.gs-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--gs-text-1);
  line-height: 1.2;
}

.gs-subtitle {
  font-size: 12px;
  color: var(--gs-text-2);
  line-height: 1.3;
}

.gs-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.gs-cloud-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--gs-text-2);
}

/* 头部动作按钮（#actions 插槽内按钮的统一规格） */
.gs-header-right :deep(button) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  padding: 4px 12px;
  background: var(--gs-btn-bg);
  border: 1px solid var(--gs-btn-border);
  border-radius: var(--gs-radius);
  color: var(--gs-text-1);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.gs-header-right :deep(button:hover) {
  background: var(--gs-btn-bg-hover);
  border-color: var(--gs-btn-border-hover);
}

/* ===== 游戏内容 ===== */
.gs-game {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* ===== 加载/错误状态 ===== */
.gs-loading,
.gs-error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: var(--gs-bg-app);
  z-index: 10;
}

.gs-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--gs-border);
  border-top-color: var(--gs-accent);
  border-radius: 50%;
  animation: gs-spin 1s linear infinite;
}

@keyframes gs-spin {
  to { transform: rotate(360deg); }
}

.gs-loading-text {
  font-size: 14px;
  color: var(--gs-text-2);
}

.gs-error-icon {
  font-size: 48px;
}

.gs-error-title {
  font-size: 20px;
  color: var(--gs-text-1);
}

.gs-error-message {
  font-size: 14px;
  color: var(--gs-text-2);
  text-align: center;
}

.gs-error-btn {
  margin-top: 8px;
  padding: 8px 20px;
  border: none;
  border-radius: var(--gs-radius);
  color: white;
  cursor: pointer;
}

/* ===== 退出确认弹窗 ===== */
.gs-confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.gs-confirm-dialog {
  background: var(--gs-surface);
  border: 1px solid var(--gs-border);
  border-radius: 12px;
  padding: 24px;
  width: 300px;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
}

.gs-confirm-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
}

.gs-confirm-header h3 {
  color: var(--gs-text-1);
}

.gs-confirm-icon {
  font-size: 20px;
}

.gs-confirm-body p {
  color: var(--gs-text-2);
  margin-bottom: 24px;
}

.gs-confirm-footer {
  display: flex;
  gap: 12px;
}

.gs-confirm-btn {
  flex: 1;
  padding: 8px;
  border-radius: var(--gs-radius);
  cursor: pointer;
  border: none;
  font-weight: 500;
}

.gs-confirm-btn.gs-primary {
  background: var(--gs-accent);
  color: #fff;
}

.gs-confirm-btn.gs-cancel {
  background: var(--gs-btn-bg);
  color: var(--gs-text-1);
}

/* ===== 过渡 ===== */
.gs-fade-enter-active,
.gs-fade-leave-active {
  transition: opacity 0.3s;
}

.gs-fade-enter-from,
.gs-fade-leave-to {
  opacity: 0;
}
</style>
