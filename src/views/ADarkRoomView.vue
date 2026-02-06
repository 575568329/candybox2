<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const iframeRef = ref(null)
const isLoading = ref(true)
const hasError = ref(false)

// 退出确认
const showExitConfirm = ref(false)

// 存档管理
const showSaveModal = ref(false)
const saveString = ref('')
const saveMessage = ref({ show: false, type: 'success', text: '' })
const selectedSlot = ref(1) // 当前选中的槽位 (1-3)
const saveSlots = ref({
  1: { name: '', data: '', updatedAt: null },
  2: { name: '', data: '', updatedAt: null },
  3: { name: '', data: '', updatedAt: null }
})

// 显示提示消息
const showMessage = (type, text) => {
  saveMessage.value = { show: true, type, text }
  setTimeout(() => {
    saveMessage.value.show = false
  }, 3000)
}

// 选择槽位
const selectSlot = (slotNum) => {
  selectedSlot.value = slotNum
  // 更新文本框内容为选中槽位的存档
  saveString.value = saveSlots.value[slotNum].data || ''
}

// 打开存档管理弹窗
const openSaveModal = async () => {
  showSaveModal.value = true
  // 尝试从 uTools 读取存档
  await loadSaveFromUTools()
  // 加载选中槽位的存档到文本框
  saveString.value = saveSlots.value[selectedSlot.value].data || ''
}

// 从 uTools 加载存档
const loadSaveFromUTools = async () => {
  if (!window.utools) {
    saveSlots.value = {
      1: { name: '', data: '', updatedAt: null },
      2: { name: '', data: '', updatedAt: null },
      3: { name: '', data: '', updatedAt: null }
    }
    return
  }

  try {
    const data = await window.utools.db.promises.get('adarkroom_saves')
    if (data && data.slots) {
      saveSlots.value = data.slots
      // 加载选中槽位的存档
      saveString.value = saveSlots.value[selectedSlot.value].data || ''
    } else {
      saveSlots.value = {
        1: { name: '', data: '', updatedAt: null },
        2: { name: '', data: '', updatedAt: null },
        3: { name: '', data: '', updatedAt: null }
      }
      saveString.value = ''
    }
  } catch (error) {
    console.error('从 uTools 读取存档失败:', error)
    saveSlots.value = {
      1: { name: '', data: '', updatedAt: null },
      2: { name: '', data: '', updatedAt: null },
      3: { name: '', data: '', updatedAt: null }
    }
    saveString.value = ''
  }
}

// 保存存档到 uTools
const saveToUTools = async () => {
  if (!window.utools) {
    showMessage('error', '请在 uTools 环境中使用')
    return
  }

  if (!saveString.value.trim()) {
    showMessage('error', '存档字符串为空')
    return
  }

  try {
    // 更新当前槽位的数据
    saveSlots.value[selectedSlot.value] = {
      name: `存档 ${new Date().toLocaleString()}`,
      data: saveString.value,
      updatedAt: Date.now()
    }

    // 序列化数据，避免循环引用问题
    const dataToSave = JSON.parse(JSON.stringify({
      _id: 'adarkroom_saves',
      slots: saveSlots.value,
      updatedAt: Date.now()
    }))

    await window.utools.db.promises.put(dataToSave)
    showMessage('success', `存档已保存到槽位 ${selectedSlot.value} ✓`)
  } catch (error) {
    console.error('保存到 uTools 失败:', error)
    showMessage('error', '保存失败: ' + error.message)
  }
}

// 复制存档字符串
const copySaveString = async () => {
  if (!saveString.value.trim()) {
    showMessage('error', '没有可复制的存档')
    return
  }

  try {
    await navigator.clipboard.writeText(saveString.value)
    showMessage('success', '已复制到剪贴板 ✓')
  } catch (error) {
    showMessage('error', '复制失败')
  }
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return '空'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取槽位状态文本
const getSlotStatus = (slotNum) => {
  const slot = saveSlots.value[slotNum]
  if (!slot.data) return '空'
  if (slot.updatedAt) {
    const diff = Date.now() - slot.updatedAt
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
    return formatTime(slot.updatedAt)
  }
  return '有数据'
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

onMounted(() => {
  console.log('[小黑屋] 组件已挂载')
})

onUnmounted(() => {
  console.log('[小黑屋] 组件已卸载')
})
</script>

<template>
  <div class="adarkroom-view">
    <!-- 顶部导航栏 -->
    <div class="game-header">
      <button class="back-btn" @click="goBack" title="返回游戏列表">
        <span class="back-icon">←</span>
        <span class="back-text">返回</span>
      </button>
      <div class="game-title">
        <span class="game-icon">🏚️</span>
        <div class="title-text">
          <h1 class="game-name">小黑屋</h1>
          <p class="game-english-name">A Dark Room https://zhaolinxu.github.io/adarkroom/?lang=zh_cn</p>
        </div>
      </div>
      <button class="save-btn" @click="openSaveModal" title="存档管理">
        <span class="save-icon">💾</span>
      </button>
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
        src="https://zhaolinxu.github.io/adarkroom/?lang=zh_cn"
        class="game-frame"
        @load="onIframeLoad"
        @error="onIframeError"
        frameborder="0"
        allowfullscreen
      ></iframe>
    </div>

    <!-- 存档管理弹窗 -->
    <transition name="fade">
      <div v-if="showSaveModal" class="confirm-overlay" @click="showSaveModal = false">
        <div class="save-dialog" @click.stop>
          <div class="confirm-header">
            <div class="confirm-icon">💾</div>
            <h3>存档管理</h3>
            <button class="close-btn" @click="showSaveModal = false">✕</button>
          </div>

          <div class="save-content">
            <!-- 槽位选择器 -->
            <div class="slot-selector">
              <div
                v-for="slotNum in [1, 2, 3]"
                :key="slotNum"
                class="slot-item"
                :class="{ active: selectedSlot === slotNum }"
                @click="selectSlot(slotNum)"
              >
                <div class="slot-header">
                  <span class="slot-number">槽位 {{ slotNum }}</span>
                  <span class="slot-status">{{ getSlotStatus(slotNum) }}</span>
                </div>
                <div class="slot-preview">
                  {{ saveSlots[slotNum].name || '空槽位' }}
                </div>
              </div>
            </div>

            <div class="save-text-area">
              <textarea
                v-model="saveString"
                class="save-input"
                placeholder="在此粘贴或查看存档字符串..."
                rows="5"
              ></textarea>
            </div>

            <div class="save-actions">
              <button class="action-btn primary" @click="saveToUTools">
                <span class="action-icon">☁️</span>
                <span>保存到槽位 {{ selectedSlot }}</span>
              </button>
              <button class="action-btn" @click="copySaveString">
                <span class="action-icon">📋</span>
                <span>复制字符串</span>
              </button>
            </div>
          </div>

          <!-- 消息提示 -->
          <transition name="fade">
            <div v-if="saveMessage.show" :class="['save-message-toast', saveMessage.type]">
              {{ saveMessage.text }}
            </div>
          </transition>
        </div>
      </div>
    </transition>

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

.adarkroom-view {
  width: 100%;
  height: 100vh;
  background: #000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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

.save-btn {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.save-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: scale(1.05);
}

.save-icon {
  font-size: 18px;
  line-height: 1;
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

/* 存档管理弹窗 */
.save-dialog {
  background: linear-gradient(135deg, #1e1e32 0%, #1a1a2e 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  min-width: 320px;
  max-width: 95%;
  max-height: 90vh;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease;
  position: relative;
  display: flex;
  flex-direction: column;
}

.save-dialog .close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.save-dialog .close-btn:hover {
  background: rgba(255, 107, 107, 0.2);
  color: #ff6b6b;
}

.save-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 槽位选择器 */
.slot-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.slot-item {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.slot-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.slot-item.active {
  background: rgba(102, 126, 234, 0.15);
  border-color: rgba(102, 126, 234, 0.4);
}

.slot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.slot-number {
  font-size: 11px;
  font-weight: 600;
  color: white;
}

.slot-status {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.1);
  padding: 1px 4px;
  border-radius: 3px;
}

.slot-preview {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.3;
  min-height: 24px;
  display: flex;
  align-items: center;
}

.save-text-area {
  display: flex;
  flex-direction: column;
}

.save-input {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 8px;
  color: white;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 11px;
  line-height: 1.4;
  resize: vertical;
  outline: none;
}

.save-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.save-input:focus {
  border-color: rgba(255, 255, 255, 0.4);
}

.save-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: white;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.action-btn.primary {
  background: rgba(102, 126, 234, 0.2);
  border-color: rgba(102, 126, 234, 0.4);
}

.action-btn.primary:hover {
  background: rgba(102, 126, 234, 0.3);
  border-color: rgba(102, 126, 234, 0.5);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.action-icon {
  font-size: 14px;
}

.save-message-toast {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 12px;
  text-align: center;
  white-space: nowrap;
}

.save-message-toast.success {
  background: rgba(76, 175, 80, 0.9);
  border: 1px solid rgba(76, 175, 80, 0.3);
  color: white;
}

.save-message-toast.error {
  background: rgba(244, 67, 54, 0.9);
  border: 1px solid rgba(244, 67, 54, 0.3);
  color: white;
}

.save-message-toast.warning {
  background: rgba(255, 152, 0, 0.9);
  border: 1px solid rgba(255, 152, 0, 0.3);
  color: white;
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
