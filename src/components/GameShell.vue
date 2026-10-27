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
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
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

// 弹窗打开时聚焦对话框，Esc 关闭（手写键值判断，兼容 'Escape'/'Esc'）
const dialogEl = ref(null)
const onDialogKey = (e) => {
  if (e.key === 'Escape' || e.key === 'Esc') cancelExit()
}
watch(showExitConfirm, async (open) => {
  if (open) {
    await nextTick()
    dialogEl.value?.focus()
  }
})

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

    <!-- 顶部导航栏 -->
    <header
      class="gs-header"
      :class="{ 'gs-header-hidden': autoHideHeader && !headerVisible }"
      @mouseenter="onMouseEnterHeader"
      @mouseleave="onMouseLeaveHeader"
    >
      <button class="gs-back-btn" @click="goBack" title="返回游戏列表 (Esc 关闭弹窗)">
        <svg class="gs-back-arrow" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 3L5 8l5 5" />
        </svg>
        <span class="gs-back-text">返回</span>
      </button>

      <div class="gs-title">
        <span class="gs-icon-tile" :style="{ '--gs-tile': iconColor }">
          <!-- 安全说明: gameIcon 来自内部静态配置/emoji, 非用户输入 -->
          <span class="gs-icon" v-html="gameIcon"></span>
        </span>
        <div class="gs-title-text">
          <h1 class="gs-name">{{ gameName }}</h1>
          <p v-if="gameEnglishName" class="gs-subtitle">{{ gameEnglishName }}</p>
        </div>
      </div>

      <div class="gs-header-right">
        <div v-if="showCloudSaveTip" class="gs-cloud-tip" title="游戏已自动保存到uTools云存储">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
            <path d="M11 6a3.5 3.5 0 0 1 3.5 3.5A3.5 3.5 0 0 1 11 13H5a4 4 0 0 1-1-7.87A4.5 4.5 0 0 1 11 6zm0 1a3.5 3.5 0 0 0-3.4-2.66A3.5 3.5 0 0 0 4.2 6.1l-.3.06a3 3 0 0 0 .1 5.84h7a2.5 2.5 0 0 0 .17-4.99L11 7z"/>
          </svg>
          <span>已自动保存</span>
        </div>
        <slot name="actions"></slot>
      </div>
    </header>

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
        <transition name="gs-pop" appear>
          <div
            class="gs-confirm-dialog"
            :style="{ '--gs-accent-local': accentColor }"
            ref="dialogEl"
            tabindex="-1"
            @keydown="onDialogKey"
            @click.stop
          >
            <div class="gs-confirm-icon-badge">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3v9" />
                <path d="M6.3 6.3a8 8 0 1 0 11.4 0" />
              </svg>
            </div>
            <h3 class="gs-confirm-title">退出游戏</h3>
            <p class="gs-confirm-text">确定要退出「{{ gameName }}」吗？</p>
            <div class="gs-confirm-footer">
              <button class="gs-btn gs-btn-stay" @click="cancelExit">继续游戏</button>
              <button class="gs-btn gs-btn-exit" @click="confirmExit">退出</button>
            </div>
          </div>
        </transition>
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

/* ===== 顶部导航栏 ===== */
.gs-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: var(--gs-header-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px 0 12px;
  background: linear-gradient(to bottom, rgba(16, 17, 21, 0.92), rgba(16, 17, 21, 0.82));
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.25), 0 4px 20px rgba(0, 0, 0, 0.18);
  transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1);
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

/* 返回按钮 */
.gs-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 32px;
  padding: 0 14px 0 11px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  color: var(--gs-text-1);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.18s, border-color 0.18s, transform 0.18s;
}

.gs-back-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.22);
  transform: translateX(-1px);
}

.gs-back-btn:active {
  transform: translateX(-1px) scale(0.97);
}

.gs-back-arrow {
  flex-shrink: 0;
}

/* 标题区 */
.gs-title {
  display: flex;
  align-items: center;
  gap: 10px;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
}

.gs-icon-tile {
  --gs-tile: var(--gs-accent);
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--gs-tile) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--gs-tile) 22%, transparent);
  color: var(--gs-tile);
}

.gs-icon {
  font-size: 16px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
}

.gs-icon :deep(svg) {
  width: 20px;
  height: 20px;
}

.gs-title-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.gs-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--gs-text-1);
  line-height: 1.15;
  letter-spacing: 0.2px;
}

.gs-subtitle {
  font-size: 11px;
  color: var(--gs-text-2);
  line-height: 1.2;
  letter-spacing: 0.3px;
}

/* 右区：云存档提示 + 动作按钮 */
.gs-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.gs-cloud-tip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 11px;
  border-radius: 999px;
  background: rgba(84, 187, 132, 0.1);
  border: 1px solid rgba(84, 187, 132, 0.2);
  color: #6fcf97;
  font-size: 11.5px;
  white-space: nowrap;
}

.gs-header-right :deep(button) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  color: var(--gs-text-1);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.18s, border-color 0.18s, transform 0.18s;
}

.gs-header-right :deep(button:hover) {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.22);
}

.gs-header-right :deep(button:active) {
  transform: scale(0.97);
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
  padding: 9px 22px;
  border: none;
  border-radius: 999px;
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

/* ===== 退出确认弹窗 ===== */
.gs-confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(8, 9, 12, 0.55);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.gs-confirm-dialog {
  --gs-accent-local: var(--gs-accent);
  width: 312px;
  padding: 26px 24px 20px;
  border-radius: 18px;
  background: linear-gradient(170deg, #23252c 0%, #1b1d22 100%);
  border: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow:
    0 24px 64px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  outline: none; /* 聚焦用于 Esc 监听, 不显示焦点框 */
}

/* 图标徽章 */
.gs-confirm-icon-badge {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  background: color-mix(in srgb, var(--gs-accent-local) 13%, transparent);
  border: 1px solid color-mix(in srgb, var(--gs-accent-local) 26%, transparent);
  color: var(--gs-accent-local);
}

.gs-confirm-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--gs-text-1);
  margin-bottom: 6px;
}

.gs-confirm-text {
  font-size: 13px;
  color: var(--gs-text-2);
  line-height: 1.5;
  margin-bottom: 20px;
}

/* 按钮组：继续游戏为视觉主按钮（更安全的默认），退出为红色幽灵 */
.gs-confirm-footer {
  display: flex;
  gap: 10px;
  width: 100%;
}

.gs-btn {
  flex: 1;
  height: 38px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.16s, border-color 0.16s, transform 0.12s, box-shadow 0.16s;
}

.gs-btn:active {
  transform: scale(0.97);
}

.gs-btn-stay {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.92);
  color: #16171b;
}

.gs-btn-stay:hover {
  background: #ffffff;
  box-shadow: 0 4px 14px rgba(255, 255, 255, 0.14);
}

.gs-btn-exit {
  background: rgba(255, 87, 87, 0.1);
  border: 1px solid rgba(255, 87, 87, 0.28);
  color: #ff7a7a;
}

.gs-btn-exit:hover {
  background: rgba(255, 87, 87, 0.18);
  border-color: rgba(255, 87, 87, 0.45);
}

/* ===== 过渡动画 ===== */
.gs-fade-enter-active,
.gs-fade-leave-active {
  transition: opacity 0.22s ease;
}

.gs-fade-enter-from,
.gs-fade-leave-to {
  opacity: 0;
}

.gs-pop-enter-active {
  transition: transform 0.26s cubic-bezier(0.34, 1.4, 0.64, 1), opacity 0.2s ease;
}

.gs-pop-enter-from {
  transform: scale(0.94) translateY(10px);
  opacity: 0;
}
</style>
