<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { saveManager } from '../utils/saveManager'
import { analyticsTracker } from '../utils/analyticsTracker'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const route = useRoute()
const router = useRouter()

const game = ref(null)
const iframeRef = ref(null)
const isLoading = ref(true)
const hasError = ref(false)
const showSaveManager = ref(false)
const saveInfo = ref({
  hasSave: false,
  count: 0,
  candy: 0,
  lollipops: 0,
  slots: []
})
const saveMessage = ref({
  show: false,
  type: 'success',
  text: ''
})

// 返回确认弹窗
const showExitConfirm = ref(false)

// 自定义确认弹窗
const showClearSaveConfirm = ref(false)
const showDeleteSlotConfirm = ref(false)
const slotToDelete = ref(null)

const lastUpdateTime = ref(null)

// 文件导入相关
const fileInputRef = ref(null)

// 导航栏自动隐藏
const isHeaderVisible = ref(true)
let hideTimer = null
const HIDE_DELAY = 3000 // 3秒后自动隐藏

// 显示导航栏
const showHeader = () => {
  isHeaderVisible.value = true
  resetHideTimer()
}

// 隐藏导航栏
const hideHeader = () => {
  isHeaderVisible.value = false
}

// 重置隐藏定时器
const resetHideTimer = () => {
  if (hideTimer) {
    clearTimeout(hideTimer)
  }
  hideTimer = setTimeout(hideHeader, HIDE_DELAY)
}

// 处理鼠标移动
const handleMouseMove = () => {
  if (!isHeaderVisible.value) {
    showHeader()
  } else {
    resetHideTimer()
  }
}

// 处理鼠标进入顶部区域
const handleHeaderMouseEnter = () => {
  if (hideTimer) {
    clearTimeout(hideTimer)
  }
  isHeaderVisible.value = true
}

// 处理鼠标离开顶部区域
const handleHeaderMouseLeave = () => {
  resetHideTimer()
}

// 游戏配置
const games = {
  candybox2: {
    id: 'candybox2',
    name: '糖果盒子2',
    englishName: 'Candy Box 2',
    icon: '🍬',
    path: '/games/candybox2/index.html',
    color: '#ff6b6b'
  }
}

// 检查是否在 uTools 环境中
const isUToolsEnv = computed(() => {
  return typeof window !== 'undefined' && window.utools
})

// 获取游戏 URL
const gameUrl = computed(() => {
  if (!game.value) return ''

  // 如果是外部链接（http/https 开头），直接返回
  if (game.value.path.startsWith('http://') || game.value.path.startsWith('https://')) {
    return game.value.path
  }

  // 否则使用本地路径
  const baseUrl = window.location.origin
  return `${baseUrl}${game.value.path}`
})

// 加载存档信息（直接从 localStorage 读取）
const loadSaveInfo = async () => {
  if (!game.value) return

  console.log('[GameView] loadSaveInfo 调用', {
    hasIframeRef: !!iframeRef.value,
    hasContentWindow: iframeRef.value?.contentWindow,
    gameId: game.value.id
  })

  // 使用 saveManager 从 iframe 读取存档
  try {
    const result = await saveManager.getSaveInfo(game.value.id, iframeRef.value)

    console.log('[GameView] 存档读取结果:', result)

    if (result.hasSave) {
      saveInfo.value = result
      console.log('[GameView] ✓ 存档读取成功')
    } else {
      saveInfo.value = { hasSave: false, count: 0 }
      if (result.error) {
        console.warn('[GameView] 存档读取失败:', result.error)
      }
    }
  } catch (error) {
    console.error('[GameView] 获取存档信息失败:', error)
    saveInfo.value = { hasSave: false, count: 0, error: error.message }
  }
}

// 显示提示消息
const showMessage = (type, text) => {
  saveMessage.value = { show: true, type, text }
  setTimeout(() => {
    saveMessage.value.show = false
  }, 3000)
}

// 清除存档
const showClearSaveDialog = () => {
  if (!game.value) return
  showClearSaveConfirm.value = true
}

const handleClearSaveConfirmed = async () => {
  if (!game.value) return

  try {
    showMessage('success', '正在清除存档...')

    // 追踪存档操作
    analyticsTracker.trackSaveOperation('clear_all', game.value.id, {
      confirm: true
    })

    // 使用 saveManager 清除 uTools 数据库中的存档
    const result = await saveManager.clearSave(game.value.id)

    if (result.success) {
      showMessage('success', result.message || '存档已清除')

      // 追踪操作结果
      analyticsTracker.trackUserAction('save_cleared', {
        game: {
          id: game.value.id,
          name: game.value.name
        },
        count: result.count
      })

      // 刷新游戏，重新加载 iframe
      if (iframeRef.value) {
        const currentSrc = iframeRef.value.src
        iframeRef.value.src = currentSrc
      }

      // 刷新存档信息
      await loadSaveInfo()
    } else {
      showMessage('error', result.message || '清除失败')
    }
  } catch (error) {
    console.error('[清除存档] 错误:', error)
    showMessage('error', `清除失败: ${error.message}`)
  }
}

const clearSave = async () => {
  // 使用自定义弹窗
  showClearSaveDialog()
}

// 读取指定存档槽位到游戏
const loadSlot = async (slotNum) => {
  if (!game.value || !iframeRef.value) return

  try {
    showMessage('success', `正在读取存档槽位 ${slotNum}...`)

    // 追踪存档操作
    analyticsTracker.trackSaveOperation('load_slot', game.value.id, {
      slotNum: slotNum
    })

    // 游戏通过URL参数加载存档，需要刷新iframe并添加?slot=N参数
    const currentUrl = new URL(iframeRef.value.src)
    currentUrl.searchParams.set('slot', slotNum.toString())

    // 刷新游戏页面并传递槽位参数
    iframeRef.value.src = currentUrl.toString()

    // 等待游戏加载后刷新存档信息
    setTimeout(() => {
      loadSaveInfo()
      showMessage('success', `存档槽位 ${slotNum} 已加载`)

      // 追踪操作成功
      analyticsTracker.trackUserAction('save_loaded', {
        game: {
          id: game.value.id,
          name: game.value.name
        },
        slotNum: slotNum
      })
    }, 2000)
  } catch (error) {
    showMessage('error', `读取存档失败: ${error.message}`)
  }
}

// 删除指定存档槽位
const showDeleteSlotDialog = (slotNum) => {
  if (!game.value || !iframeRef.value) return
  slotToDelete.value = slotNum
  showDeleteSlotConfirm.value = true
}

const handleDeleteSlotConfirmed = async () => {
  const slotNum = slotToDelete.value
  if (!game.value || !iframeRef.value || !slotNum) return

  try {
    showMessage('success', `正在删除存档槽位 ${slotNum}...`)

    // 追踪存档操作
    analyticsTracker.trackSaveOperation('delete_slot', game.value.id, {
      slotNum: slotNum
    })

    // 向 iframe 发送消息，要求删除指定槽位
    const result = await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        window.removeEventListener('message', messageHandler)
        resolve({ success: false })
      }, 5000)

      const messageHandler = (event) => {
        // 验证消息来源
        if (event.origin !== window.location.origin) {
          console.warn('[GameView] 收到来自未知来源的消息:', event.origin)
          return
        }

        if (event.data && event.data.type === 'candybox2-slot-deleted') {
          clearTimeout(timeout)
          window.removeEventListener('message', messageHandler)
          resolve(event.data)
        }
      }

      window.addEventListener('message', messageHandler)

      iframeRef.value.contentWindow.postMessage({
        type: 'candybox2-delete-slot',
        slotNum: slotNum
      }, window.location.origin)
    })

    if (result.success) {
      showMessage('success', `存档槽位 ${slotNum} 已删除`)
      await loadSaveInfo()

      // 追踪操作成功
      analyticsTracker.trackUserAction('save_deleted', {
        game: {
          id: game.value.id,
          name: game.value.name
        },
        slotNum: slotNum
      })
    } else {
      showMessage('error', `删除存档槽位 ${slotNum} 失败`)
    }
  } catch (error) {
    showMessage('error', `删除存档失败: ${error.message}`)
  } finally {
    slotToDelete.value = null
  }
}

const deleteSlot = (slotNum) => {
  // 使用自定义弹窗
  showDeleteSlotDialog(slotNum)
}

// 格式化存档时间
const formatSaveTime = (timestamp) => {
  if (!timestamp) return '未知时间'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 返回游戏列表
const goBack = () => {
  // 显示自定义确认弹窗
  showExitConfirm.value = true
}

// 确认退出
const confirmExit = () => {
  showExitConfirm.value = false
  router.push('/')
}

// 取消退出
const cancelExit = () => {
  showExitConfirm.value = false
}

// iframe 加载完成
const onIframeLoad = () => {
  console.log('[GameView] iframe 加载完成')
  isLoading.value = false
  hasError.value = false

  // 使用智能重试机制读取存档，而不是固定延迟
  let retryCount = 0
  const maxRetries = 5
  const retryDelay = 500 // 500ms 间隔

  const attemptLoadSave = async () => {
    retryCount++
    console.log(`[GameView] 尝试读取存档 (${retryCount}/${maxRetries})`)

    try {
      const result = await loadSaveInfo()

      // 检查是否有错误
      if (result?.error) {
        console.warn(`[GameView] 存档读取遇到错误: ${result.error}`)

        // 对于致命错误（如 iframe 不可用），不再重试
        if (result.error === 'iframe 不可用' || result.error.includes('读取超时')) {
          console.log('[GameView] 检测到致命错误，停止重试')
          return
        }
      }

      // 如果成功读取到存档或确定没有存档，停止重试
      if (saveInfo.value.hasSave) {
        console.log('[GameView] ✓ 存档读取成功')
        return
      }

      // 确认没有存档
      if (result?.hasSave === false) {
        console.log('[GameView] ✓ 确认无存档')
        return
      }

      // 继续重试
      if (retryCount < maxRetries) {
        setTimeout(attemptLoadSave, retryDelay)
      } else {
        console.log('[GameView] 已达到最大重试次数，停止尝试')
        // 显示友好提示
        showMessage('warning', '存档读取遇到问题，游戏仍可正常进行')
      }
    } catch (error) {
      console.error('[GameView] 存档读取异常:', error)

      // 发生异常时也继续重试几次
      if (retryCount < maxRetries) {
        setTimeout(attemptLoadSave, retryDelay)
      } else {
        console.error('[GameView] 达到最大重试次数，放弃读取存档')
        showMessage('warning', '存档读取失败，但游戏仍可正常进行')
      }
    }
  }

  // 开始尝试读取存档
  setTimeout(attemptLoadSave, retryDelay)
}

// iframe 加载失败
const onIframeError = () => {
  isLoading.value = false
  hasError.value = true
}

let saveRefreshTimer = null
let messageHandler = null

// 刷新存档信息
const refreshSaveInfo = async () => {
  await loadSaveInfo()
  lastUpdateTime.value = new Date()
  console.log(`[存档同步] 已更新存档信息`)
}

// 手动刷新存档
const manualRefreshSave = () => {
  showMessage('success', '正在刷新存档...')
  refreshSaveInfo()
  showMessage('success', '存档已更新 ✓')
}

// 格式化时间
const formatTime = (date) => {
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)

  if (diff < 60) return `${diff}秒前`
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  const gameId = route.params.id

  if (!games[gameId]) {
    hasError.value = true
    isLoading.value = false
    return
  }

  game.value = games[gameId]

  // 初始化埋点追踪器
  analyticsTracker.init()

  // 追踪游戏页面访问
  analyticsTracker.trackPageView('game_page', {
    game: {
      id: game.value.id,
      name: game.value.name,
      category: game.value.category
    }
  })

  // 开始游戏会话追踪
  analyticsTracker.startGameSession(game.value)

  // 等待 iframe 加载后，使用智能重试机制读取存档
  // 这里不需要手动调用 loadSaveInfo，因为在 onIframeLoad 中已经处理

  // 定期刷新存档信息（每5秒）
  saveRefreshTimer = setInterval(() => {
    refreshSaveInfo()
  }, 5000)
  console.log('[存档同步] 已启动存档自动同步（每5秒）')

  // 监听来自 iframe 的存档更新事件
  messageHandler = (event) => {
    // 验证消息来源
    if (event.origin !== window.location.origin) {
      console.warn('[GameView] 收到来自未知来源的消息:', event.origin)
      return
    }

    if (event.data && event.data.type === 'candybox2-save-updated') {
      console.log('[GameView] 收到存档更新通知，立即刷新存档信息')
      refreshSaveInfo()

      // 追踪存档操作
      analyticsTracker.trackSaveOperation('auto_save', game.value.id, {
        timestamp: new Date().toISOString()
      })
    }
  }
  window.addEventListener('message', messageHandler)

  // 监听鼠标移动，用于自动隐藏/显示导航栏
  document.addEventListener('mousemove', handleMouseMove)

  // 启动自动隐藏定时器
  resetHideTimer()
})

onUnmounted(() => {
  // 清理定时器
  if (saveRefreshTimer) {
    clearInterval(saveRefreshTimer)
    saveRefreshTimer = null
    console.log('[存档同步] 已停止存档自动同步')
  }

  // 清理导航栏自动隐藏定时器
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }

  // 清理事件监听器（确保只移除一次）
  if (messageHandler) {
    window.removeEventListener('message', messageHandler)
    messageHandler = null
  }

  // 确保移除鼠标移动监听器
  document.removeEventListener('mousemove', handleMouseMove)

  // 结束游戏会话追踪
  if (game.value) {
    analyticsTracker.endGameSession()
    analyticsTracker.trackPageView('game_exit', {
      game: {
        id: game.value.id,
        name: game.value.name
      }
    })
  }

  // 停止自动同步并触发一次同步
  analyticsTracker.stopAutoSync()
  analyticsTracker.sync()

  console.log('[GameView] 组件已卸载，所有资源已清理')
})
</script>

<template>
  <div class="game-view">
    <!-- 顶部栏 -->
    <div
      class="game-header"
      :class="{ hidden: !isHeaderVisible }"
      @mouseenter="handleHeaderMouseEnter"
      @mouseleave="handleHeaderMouseLeave"
    >
      <div class="header-left">
        <button class="back-btn" @click="goBack" title="返回游戏列表">
          <span class="back-icon">←</span>
          <span class="back-text">返回</span>
        </button>
        <div class="game-title">
          <span class="game-icon">{{ game?.icon }}</span>
          <div class="title-text">
            <h1 class="game-name">{{ game?.name }}</h1>
            <p class="game-english-name">{{ game?.englishName }}</p>
          </div>
        </div>
      </div>

      <div class="header-right">
        <button
          class="icon-btn"
          @click="showSaveManager = !showSaveManager"
          title="读档管理"
        >
          📖 读档
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
        <p class="error-message">无法加载游戏,请检查游戏文件是否存在</p>
        <button class="error-btn" @click="goBack">返回游戏列表</button>
      </div>

      <!-- 游戏框架 -->
      <iframe
        v-show="!isLoading && !hasError"
        ref="iframeRef"
        :src="gameUrl"
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
            <p>退出前是否已在游戏内保存进度？</p>
          </div>
          <div class="confirm-footer">
            <button class="confirm-btn cancel" @click="cancelExit">
              <span class="btn-icon">↩</span>
              <span>取消</span>
            </button>
            <button class="confirm-btn primary" @click="confirmExit">
              <span class="btn-icon">✓</span>
              <span>退出游戏</span>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 存档管理面板 -->
    <transition name="slide">
      <div v-if="showSaveManager" class="save-manager-overlay" @click="showSaveManager = false">
        <div class="save-manager-panel" @click.stop>
          <div class="save-manager-header">
            <h3>💾 存档管理</h3>
            <div class="header-actions">
              <button class="refresh-btn" @click="manualRefreshSave" title="刷新存档信息">
                🔄
              </button>
              <button class="close-btn" @click="showSaveManager = false">✕</button>
            </div>
          </div>

          <div class="save-manager-content">
            <!-- 存档信息 -->
            <div class="save-info-section">
              <div class="section-header">
                <h4>存档列表</h4>
                <span v-if="lastUpdateTime" class="update-time">
                  更新于 {{ formatTime(lastUpdateTime) }}
                </span>
              </div>

              <!-- 存档槽位列表 -->
              <div v-if="saveInfo.hasSave && saveInfo.slots && saveInfo.slots.length > 0" class="save-slots-list">
                <div
                  v-for="slot in saveInfo.slots"
                  :key="slot.slot"
                  class="save-slot-item"
                >
                  <div class="slot-header">
                    <div class="slot-title">
                      <span class="slot-number">槽位 {{ slot.slot }}</span>
                      <span class="slot-time">{{ formatSaveTime(slot.timestamp) }}</span>
                    </div>
                  </div>
                  <div class="slot-stats">
                    <div class="slot-stat">
                      <span class="stat-icon">🍬</span>
                      <span class="stat-value">{{ slot.candies?.toLocaleString() || 0 }}</span>
                    </div>
                    <div class="slot-stat">
                      <span class="stat-icon">🍭</span>
                      <span class="stat-value">{{ slot.lollipops?.toLocaleString() || 0 }}</span>
                    </div>
                  </div>
                  <div class="slot-actions">
                    <button class="slot-btn load" @click="loadSlot(slot.slot)">
                      <span class="btn-icon">📖</span>
                      <span>读取</span>
                    </button>
                    <button class="slot-btn delete" @click="deleteSlot(slot.slot)">
                      <span class="btn-icon">🗑️</span>
                      <span>删除</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- 无存档提示 -->
              <div v-else class="no-save">
                <span class="no-save-icon">📭</span>
                <p>暂无存档</p>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="save-actions">
              <button class="action-btn danger" @click="clearSave">
                <span class="btn-icon">🗑️</span>
                <span>清除所有存档</span>
              </button>
            </div>
          </div>

          <!-- 消息提示 -->
          <transition name="fade">
            <div v-if="saveMessage.show" :class="['save-message', saveMessage.type]">
              {{ saveMessage.text }}
            </div>
          </transition>
        </div>
      </div>
    </transition>

    <!-- 清除存档确认弹窗 -->
    <ConfirmDialog
      v-model:show="showClearSaveConfirm"
      title="清除所有存档"
      :message="`确定要清除《${game?.name}》的所有存档吗？此操作不可恢复！`"
      confirm-text="确认清除"
      cancel-text="取消"
      type="danger"
      icon="🗑️"
      @confirm="handleClearSaveConfirmed"
      @cancel="showClearSaveConfirm = false"
    />

    <!-- 删除存档槽位确认弹窗 -->
    <ConfirmDialog
      v-model:show="showDeleteSlotConfirm"
      title="删除存档槽位"
      :message="`确定要删除存档槽位 ${slotToDelete} 吗？此操作不可恢复！`"
      confirm-text="确认删除"
      cancel-text="取消"
      type="danger"
      icon="🗑️"
      @confirm="handleDeleteSlotConfirmed"
      @cancel="showDeleteSlotConfirm = false; slotToDelete = null"
    />
  </div>
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.game-view {
  width: 100%;
  height: 100vh;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 顶部栏 */
.game-header {
  height: 48px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
  transition: transform 0.3s ease, opacity 0.3s ease;
  transform: translateY(0);
  opacity: 1;
}

.game-header.hidden {
  transform: translateY(-100%);
  opacity: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 5px;
  color: white;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateX(-2px);
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
  transition: all 0.3s ease;
  overflow: hidden;
}

.game-icon {
  font-size: 24px;
  line-height: 1;
}

.title-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.game-name {
  font-size: 15px;
  font-weight: 600;
  color: white;
  line-height: 1.2;
}

.game-english-name {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.2;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: white;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.3);
}

/* 游戏容器 */
.game-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #ffffff;
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
  background: #ffffff;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-top-color: #667eea;
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
  color: rgba(0, 0, 0, 0.6);
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
  background: #ffffff;
  padding: 20px;
}

.error-icon {
  font-size: 64px;
  opacity: 0.3;
}

.error-title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.error-message {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.6);
  text-align: center;
  max-width: 400px;
}

.error-btn {
  margin-top: 16px;
  padding: 10px 24px;
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  color: #333;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.error-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  border-color: rgba(0, 0, 0, 0.2);
}

/* 存档管理面板 */
.save-manager-overlay {
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

.save-manager-panel {
  background: linear-gradient(135deg, #1e1e32 0%, #1a1a2e 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  width: 90%;
  max-width: 480px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  position: relative;
}

.save-manager-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.save-manager-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: white;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.refresh-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.refresh-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: rotate(180deg);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.save-manager-content {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.save-info-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.save-info-section h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

.update-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 400;
}

/* 存档槽位列表 */
.save-slots-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.save-slot-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s;
}

.save-slot-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
}

.slot-header {
  margin-bottom: 12px;
}

.slot-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.slot-number {
  font-size: 15px;
  font-weight: 600;
  color: white;
}

.slot-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.slot-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.slot-stat {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-icon {
  font-size: 16px;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: #ffd93d;
}

.slot-actions {
  display: flex;
  gap: 8px;
}

.slot-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.slot-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.slot-btn.load:hover {
  background: rgba(76, 175, 80, 0.2);
  border-color: rgba(76, 175, 80, 0.4);
}

.slot-btn.delete:hover {
  background: rgba(255, 107, 107, 0.2);
  border-color: rgba(255, 107, 107, 0.4);
}

.no-save {
  text-align: center;
  padding: 32px 16px;
  color: rgba(255, 255, 255, 0.5);
}

.no-save-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
  opacity: 0.5;
}

.no-save p {
  margin: 0;
  font-size: 14px;
}

.save-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.action-btn.danger {
  background: rgba(255, 107, 107, 0.15);
  border-color: rgba(255, 107, 107, 0.3);
  color: #ff6b6b;
}

.action-btn.danger:hover {
  background: rgba(255, 107, 107, 0.25);
  border-color: rgba(255, 107, 107, 0.4);
}

.action-btn.success {
  background: rgba(76, 175, 80, 0.15);
  border-color: rgba(76, 175, 80, 0.3);
  color: #4caf50;
}

.action-btn.success:hover {
  background: rgba(76, 175, 80, 0.25);
  border-color: rgba(76, 175, 80, 0.4);
}

.action-btn.primary {
  background: rgba(33, 150, 243, 0.15);
  border-color: rgba(33, 150, 243, 0.3);
  color: #2196f3;
}

.action-btn.primary:hover {
  background: rgba(33, 150, 243, 0.25);
  border-color: rgba(33, 150, 243, 0.4);
}

.btn-icon {
  font-size: 16px;
}

.save-message {
  position: absolute;
  bottom: 24px;
  left: 24px;
  right: 24px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  text-align: center;
}

.save-message.success {
  background: rgba(76, 175, 80, 0.15);
  border: 1px solid rgba(76, 175, 80, 0.3);
  color: #4caf50;
}

.save-message.error {
  background: rgba(244, 67, 54, 0.15);
  border: 1px solid rgba(244, 67, 54, 0.3);
  color: #f44336;
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
  margin-bottom: 20px;
}

.confirm-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.confirm-header h3 {
  margin: 0;
  font-size: 20px;
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

.confirm-btn.secondary {
  background: rgba(255, 107, 107, 0.15);
  border-color: rgba(255, 107, 107, 0.3);
  color: #ff6b6b;
}

.confirm-btn.secondary:hover {
  background: rgba(255, 107, 107, 0.25);
  border-color: rgba(255, 107, 107, 0.4);
}

.confirm-btn.cancel {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.confirm-btn .btn-icon {
  font-size: 16px;
}

/* 动画 */
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.3s;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
