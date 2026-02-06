<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const iframeRef = ref(null)
const isLoading = ref(true)
const hasError = ref(false)

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

// 存档管理
const showSaveManager = ref(false)
const STORAGE_KEY = 'adarkroom_saves'
const saves = ref([])
const selectedSlot = ref(null)
const saveInput = ref('')

// 自定义通知系统
const notification = ref({
  show: false,
  message: '',
  type: 'success' // success, error, info
})

// 显示通知
const showNotification = (message, type = 'success') => {
  notification.value = {
    show: true,
    message,
    type
  }
  setTimeout(() => {
    notification.value.show = false
  }, 3000)
}

// 自定义确认对话框
const customConfirm = ref({
  show: false,
  title: '',
  message: '',
  onConfirm: null
})

// 显示确认对话框
const showCustomConfirm = (title, message, onConfirm) => {
  customConfirm.value = {
    show: true,
    title,
    message,
    onConfirm
  }
}

// 确认操作
const handleConfirm = () => {
  if (customConfirm.value.onConfirm) {
    customConfirm.value.onConfirm()
  }
  customConfirm.value.show = false
}

// 取消确认
const handleCancelConfirm = () => {
  customConfirm.value.show = false
}

// 加载存档列表
const loadSaves = () => {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY)
    if (savedData) {
      saves.value = JSON.parse(savedData)
    } else {
      // 初始化3个空的存档位
      saves.value = [
        { id: 1, name: '存档位 1', data: null, timestamp: null },
        { id: 2, name: '存档位 2', data: null, timestamp: null },
        { id: 3, name: '存档位 3', data: null, timestamp: null }
      ]
    }
  } catch (error) {
    console.error('加载存档失败:', error)
    saves.value = [
      { id: 1, name: '存档位 1', data: null, timestamp: null },
      { id: 2, name: '存档位 2', data: null, timestamp: null },
      { id: 3, name: '存档位 3', data: null, timestamp: null }
    ]
  }
}

// 保存存档列表到localStorage
const saveSavesToStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saves.value))
  } catch (error) {
    console.error('保存存档失败:', error)
  }
}

// 打开存档管理
const openSaveManager = () => {
  loadSaves()
  // 默认选中存档1
  selectedSlot.value = 1
  saveInput.value = saves.value[0]?.data || ''
  showSaveManager.value = true
}

// 关闭存档管理
const closeSaveManager = () => {
  showSaveManager.value = false
  selectedSlot.value = null
  saveInput.value = ''
}

// 选择存档槽位
const selectSlot = (slot) => {
  selectedSlot.value = slot.id
  saveInput.value = slot.data || ''
}

// 确认保存存档
const confirmSave = () => {
  if (!selectedSlot.value) {
    showNotification('请先选择存档位', 'error')
    return
  }

  if (!saveInput.value.trim()) {
    showNotification('请输入存档字符串', 'error')
    return
  }

  const slotIndex = saves.value.findIndex(s => s.id === selectedSlot.value)
  if (slotIndex !== -1) {
    saves.value[slotIndex].data = saveInput.value.trim()
    saves.value[slotIndex].timestamp = new Date().toISOString()
    saveSavesToStorage()
    showNotification('存档保存成功', 'success')
  }
}

// 复制存档
const copySave = async () => {
  if (!saveInput.value.trim()) {
    showNotification('没有可复制的存档内容', 'error')
    return
  }

  try {
    await navigator.clipboard.writeText(saveInput.value)
    showNotification('存档已复制到剪贴板', 'success')
  } catch (error) {
    console.error('复制失败:', error)
    // 备用复制方法
    const textarea = document.createElement('textarea')
    textarea.value = saveInput.value
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      showNotification('存档已复制到剪贴板', 'success')
    } catch (err) {
      showNotification('复制失败，请手动复制', 'error')
    }
    document.body.removeChild(textarea)
  }
}

// 删除存档
const deleteSave = () => {
  if (!selectedSlot.value) {
    showNotification('请先选择存档位', 'error')
    return
  }

  const slot = saves.value.find(s => s.id === selectedSlot.value)
  if (!slot || !slot.data) {
    showNotification('该存档位为空', 'error')
    return
  }

  showCustomConfirm(
    '删除存档',
    `确定要删除 ${slot.name} 吗？`,
    () => {
      const slotIndex = saves.value.findIndex(s => s.id === selectedSlot.value)
      if (slotIndex !== -1) {
        saves.value[slotIndex].data = null
        saves.value[slotIndex].timestamp = null
        saveSavesToStorage()
        saveInput.value = ''
        showNotification('存档已删除', 'success')
      }
    }
  )
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return '未保存'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 组件挂载时加载存档
onMounted(() => {
  console.log('[小黑屋] 组件已挂载')
  loadSaves()
  // 3秒后自动隐藏导航栏
  scheduleHideHeader()
})

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
  console.log('[小黑屋] iframe 加载完成')
  isLoading.value = false
  hasError.value = false
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
          title="提示：转载游戏引用外部网站，无法自动存档。请在游戏中点击导出，然后在此处手动保存存档"
        >
          <span class="back-icon">←</span>
          <span class="back-text">返回</span>
        </button>
        <div class="game-title">
          <span class="game-icon">🏚️</span>
          <div class="title-text">
            <h1 class="game-name">小黑屋</h1>
            <p class="game-english-name">A Dark Room https://adarkroom.doublespeakgames.com/</p>
          </div>
        </div>
        <!-- 提示横幅 -->
      <div class="tip-banner">
        
        
      </div>
        <button
          class="save-manager-btn"
          @click="openSaveManager"
          title="存档管理（游戏无法自动存档，请在游戏中导出后在此处保存）"
        >
          <span class="save-icon">💾</span>
          <span class="save-text">存档</span>
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
        src="https://adarkroom.doublespeakgames.com/"
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
            <span class="tip-text">转载游戏引用外部网站，无法自动存档。请在游戏中点击"导出"，然后在存档管理中保存</span>
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

    <!-- 自定义通知 -->
    <transition name="slide-up">
      <div v-if="notification.show" class="notification" :class="notification.type">
        <span class="notification-icon">
          {{ notification.type === 'success' ? '✓' : notification.type === 'error' ? '✕' : 'ℹ️' }}
        </span>
        <span class="notification-message">{{ notification.message }}</span>
      </div>
    </transition>

    <!-- 自定义确认对话框 -->
    <transition name="fade">
      <div v-if="customConfirm.show" class="custom-confirm-overlay" @click="handleCancelConfirm">
        <div class="custom-confirm-dialog" @click.stop>
          <div class="custom-confirm-header">
            <div class="custom-confirm-icon">⚠️</div>
            <h3>{{ customConfirm.title }}</h3>
          </div>
          <div class="custom-confirm-body">
            <p>{{ customConfirm.message }}</p>
          </div>
          <div class="custom-confirm-footer">
            <button class="custom-confirm-btn cancel" @click="handleCancelConfirm">
              <span>取消</span>
            </button>
            <button class="custom-confirm-btn primary" @click="handleConfirm">
              <span>确定</span>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 存档管理弹窗 -->
    <transition name="fade">
      <div v-if="showSaveManager" class="save-manager-overlay">
        <div class="save-manager-dialog">
          <div class="save-manager-header">
            <div class="header-icon">💾</div>
            <h3>存档管理</h3>
            <button class="close-btn" @click="closeSaveManager" title="关闭">✕</button>
          </div>

          <div class="save-manager-body">
            <!-- 精简的使用说明 -->
            <div class="save-tip-compact">
              <span class="tip-icon">💡</span>
              <span class="tip-text">游戏中点击菜单"导出"获取存档，选择存档位后粘贴保存</span>
            </div>

            <!-- 存档槽位选择 -->
            <div class="save-slots-horizontal">
              <button
                v-for="slot in saves"
                :key="slot.id"
                class="slot-btn"
                :class="{ 'active': selectedSlot === slot.id, 'has-save': slot.data }"
                @click="selectSlot(slot)"
              >
                <div class="slot-btn-name">{{ slot.name }}</div>
                <div class="slot-btn-time">{{ formatTime(slot.timestamp) }}</div>
              </button>
            </div>

            <!-- 共享输入框 -->
            <div class="save-input-area">
              <textarea
                v-model="saveInput"
                class="main-save-input"
                placeholder="选择存档位后，在此粘贴游戏导出的存档字符串..."
                rows="5"
              ></textarea>
            </div>

            <!-- 操作按钮 -->
            <div class="action-buttons">
              <button class="action-btn delete" @click="deleteSave" v-if="selectedSlot">
                <span class="btn-icon">🗑️</span>
                <span>删除存档</span>
              </button>
              <div class="right-buttons">
                <button class="action-btn copy" @click="copySave">
                  <span class="btn-icon">📋</span>
                  <span>复制</span>
                </button>
                <button class="action-btn save" @click="confirmSave">
                  <span class="btn-icon">💾</span>
                  <span>保存</span>
                </button>
              </div>
            </div>
          </div>

          <div class="save-manager-footer">
            <button class="footer-btn close" @click="closeSaveManager">
              <span class="btn-icon">✕</span>
              <span>关闭</span>
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

.source-link {
  display: flex;
  align-items: center;
  gap: 3px;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 10px;
  transition: all 0.2s;
  margin-top: 2px;
}

.source-link:hover {
  color: rgba(255, 255, 255, 0.8);
}

.source-icon {
  font-size: 10px;
  line-height: 1;
}

.source-text {
  line-height: 1.2;
}

.header-spacer {
  width: 80px;
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

/* 存档管理按钮 */
.save-manager-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(76, 175, 80, 0.15);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 5px;
  color: #4caf50;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.save-manager-btn:hover {
  background: rgba(76, 175, 80, 0.25);
  border-color: rgba(76, 175, 80, 0.4);
  transform: translateY(-1px);
}

.save-icon {
  font-size: 12px;
  line-height: 1;
}

.save-text {
  font-weight: 500;
}

/* 存档管理弹窗 */
.save-manager-overlay {
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
  padding: 20px;
  overflow-y: auto;
}

.save-manager-dialog {
  background: linear-gradient(135deg, #1e1e32 0%, #1a1a2e 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  width: 90%;
  max-width: 420px;
  max-height: 80vh;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.save-manager-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-icon {
  font-size: 22px;
  margin-right: 10px;
}

.save-manager-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: white;
  flex: 1;
}

.close-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 5px;
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
}

.save-manager-body {
  padding: 12px 16px;
  overflow-y: auto;
  flex: 1;
}

/* 精简的提示框 */
.save-tip-compact {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.3);
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 12px;
}

.save-tip-compact .tip-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.save-tip-compact .tip-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.4;
}

/* 存档槽位横向排列 */
.save-slots-horizontal {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.slot-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 6px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.slot-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.slot-btn.active {
  background: rgba(33, 150, 243, 0.15);
  border-color: rgba(33, 150, 243, 0.4);
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
}

.slot-btn.has-save {
  background: rgba(76, 175, 80, 0.08);
  border-color: rgba(76, 175, 80, 0.2);
}

.slot-btn.has-save:hover {
  background: rgba(76, 175, 80, 0.12);
  border-color: rgba(76, 175, 80, 0.3);
}

.slot-btn.active.has-save {
  background: rgba(76, 175, 80, 0.15);
  border-color: rgba(76, 175, 80, 0.4);
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.slot-btn-name {
  font-size: 12px;
  font-weight: 600;
  color: white;
}

.slot-btn-time {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
}

/* 共享输入框区域 */
.save-input-area {
  margin-bottom: 12px;
}

.main-save-input {
  width: 100%;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: white;
  font-size: 11px;
  font-family: 'Consolas', 'Monaco', monospace;
  resize: vertical;
  transition: all 0.2s;
  line-height: 1.4;
  min-height: 100px;
}

.main-save-input:focus {
  outline: none;
  border-color: rgba(33, 150, 243, 0.4);
  background: rgba(0, 0, 0, 0.4);
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
}

.main-save-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.right-buttons {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 7px 14px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: white;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.action-btn .btn-icon {
  font-size: 14px;
}

.action-btn.save {
  background: rgba(33, 150, 243, 0.15);
  border-color: rgba(33, 150, 243, 0.3);
  color: #2196f3;
}

.action-btn.save:hover {
  background: rgba(33, 150, 243, 0.25);
  border-color: rgba(33, 150, 243, 0.4);
}

.action-btn.copy {
  background: rgba(76, 175, 80, 0.15);
  border-color: rgba(76, 175, 80, 0.3);
  color: #4caf50;
}

.action-btn.copy:hover {
  background: rgba(76, 175, 80, 0.25);
  border-color: rgba(76, 175, 80, 0.4);
}

.action-btn.delete {
  background: rgba(244, 67, 54, 0.15);
  border-color: rgba(244, 67, 54, 0.3);
  color: #f44336;
}

.action-btn.delete:hover {
  background: rgba(244, 67, 54, 0.25);
  border-color: rgba(244, 67, 54, 0.4);
}

.save-manager-footer {
  display: flex;
  justify-content: center;
  padding: 10px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.footer-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.08);
  color: white;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.footer-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

/* 自定义通知 */
.notification {
  position: fixed;
  top: 80px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-size: 14px;
  z-index: 3000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  animation: slideInRight 0.3s ease;
}

@keyframes slideInRight {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.notification.success {
  border-color: rgba(76, 175, 80, 0.4);
  background: rgba(76, 175, 80, 0.9);
}

.notification.error {
  border-color: rgba(244, 67, 54, 0.4);
  background: rgba(244, 67, 54, 0.9);
}

.notification.info {
  border-color: rgba(33, 150, 243, 0.4);
  background: rgba(33, 150, 243, 0.9);
}

.notification-icon {
  font-size: 18px;
  font-weight: bold;
  flex-shrink: 0;
}

.notification-message {
  line-height: 1.4;
}

/* 滑上动画 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

/* 自定义确认对话框 */
.custom-confirm-overlay {
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
  z-index: 2500;
  padding: 20px;
}

.custom-confirm-dialog {
  background: linear-gradient(135deg, #1e1e32 0%, #1a1a2e 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  min-width: 400px;
  max-width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease;
}

.custom-confirm-header {
  text-align: center;
  margin-bottom: 16px;
}

.custom-confirm-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.custom-confirm-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: white;
}

.custom-confirm-body {
  text-align: center;
  margin-bottom: 24px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.custom-confirm-body p {
  margin: 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
}

.custom-confirm-footer {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.custom-confirm-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  flex: 1;
}

.custom-confirm-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.custom-confirm-btn.primary {
  background: rgba(244, 67, 54, 0.15);
  border-color: rgba(244, 67, 54, 0.3);
  color: #f44336;
}

.custom-confirm-btn.primary:hover {
  background: rgba(244, 67, 54, 0.25);
  border-color: rgba(244, 67, 54, 0.4);
}

.custom-confirm-btn.cancel {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}
</style>
