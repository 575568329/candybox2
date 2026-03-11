<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { analyticsTracker } from '../utils/analyticsTracker'
import { getGameById } from '../config/games'

const router = useRouter()

// 获取游戏配置
const gameConfig = getGameById('evolve')

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

// Wiki 和存档对话框
const showWikiDialog = ref(false)
const showSaveDialog = ref(false)

// uTools云存档相关
const GAME_ID = 'evolve'
const UTOOLS_STORAGE_KEY = 'game_save_evolve'

// 组件挂载
onMounted(() => {
  console.log('[Evolve] 组件已挂载')

  // 注册消息监听器，处理iframe的存档请求
  window.addEventListener('message', handleIframeMessage)

  // 监听 uTools 窗口隐藏事件，确保关闭前保存存档
  if (window.utools && window.utools.onPluginEnter) {
    // uTools 插件显示/隐藏监听
    window.addEventListener('beforeunload', handleBeforeUnload)
  }

  // 开始游戏会话（埋点）
  analyticsTracker.startGameSession({
    id: 'evolve',
    name: '进化'
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

// 窗口卸载前的处理（保存存档）
const handleBeforeUnload = async () => {
  console.log('[Evolve] 窗口即将关闭，请求游戏强制保存')

  // 通知 iframe 立即保存存档
  if (iframeRef.value && iframeRef.value.contentWindow) {
    iframeRef.value.contentWindow.postMessage({
      type: 'evolve-force-save-request'
    }, '*')
  }

  // 等待一小段时间确保保存完成
  await new Promise(resolve => setTimeout(resolve, 500))
}

// 打开 Wiki 页面
const openWiki = () => {
  showWikiDialog.value = true
}

// 打开存档页面
const openSave = () => {
  showSaveDialog.value = true
}

// iframe 加载完成
const onIframeLoad = () => {
  console.log('[Evolve] iframe 加载完成')
  isLoading.value = false
  hasError.value = false

  // 隐藏 promoBar（通过注入 CSS）
  try {
    const iframe = iframeRef.value
    if (iframe && iframe.contentWindow && iframe.contentWindow.document) {
      const style = iframe.contentWindow.document.createElement('style')
      style.textContent = `
        .promoBar {
          display: none !important;
        }
      `
      iframe.contentWindow.document.head.appendChild(style)
      console.log('[Evolve] promoBar 已隐藏')
    }
  } catch (error) {
    console.warn('[Evolve] 无法隐藏 promoBar:', error)
  }

  // 拦截 iframe 中的链接，在当前窗口打开（uTools 兼容）
  try {
    const iframe = iframeRef.value
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.addEventListener('click', (e) => {
        const link = e.target.closest('a')
        if (link && link.hasAttribute('target')) {
          // 检查是否是同源链接（wiki.html, save.html 等）
          const href = link.getAttribute('href')
          if (href && !href.startsWith('http') && !href.startsWith('//')) {
            e.preventDefault()
            // 在当前 iframe 中打开
            iframe.contentWindow.location.href = href
          }
        }
      }, true)
    }
  } catch (error) {
    console.warn('[Evolve] 无法拦截 iframe 链接:', error)
  }
}

// iframe 加载失败
const onIframeError = () => {
  console.error('[Evolve] iframe 加载失败')
  isLoading.value = false
  hasError.value = true
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
    case 'evolve-save-request':
      // 游戏请求保存存档到uTools
      await handleSaveToUTools(data)
      break

    case 'evolve-load-save-request':
      // 游戏请求从uTools加载存档
      await handleLoadFromUTools()
      break

    case 'evolve-save-data':
      // 存档管理器请求：获取所有存档数据
      // 已经由适配器处理，这里不需要额外操作
      break

    case 'evolve-save-data-set':
      // 存档管理器请求：设置存档数据的响应
      // 已经由适配器处理，这里不需要额外操作
      break
  }
}

// 保存存档到uTools
const handleSaveToUTools = async (data) => {
  try {
    console.log('[Evolve] 收到保存请求', data)

    // 验证数据
    if (!data || !data.saveData) {
      console.warn('[Evolve] 存档数据为空，跳过保存')
      return
    }

    if (typeof data.saveData !== 'string') {
      console.error('[Evolve] 存档数据类型错误:', typeof data.saveData)
      return
    }

    if (window.utools && window.utools.db) {
      try {
        // 1. 先获取已有存档的 _rev，以便更新
        let existingDoc = null
        try {
          if (window.utools.db.promises && window.utools.db.promises.get) {
            existingDoc = await window.utools.db.promises.get(UTOOLS_STORAGE_KEY)
          } else {
            existingDoc = window.utools.db.get(UTOOLS_STORAGE_KEY)
          }
        } catch (getError) {
          // 存档不存在是正常情况，继续创建新存档
          console.log('[Evolve] 存档不存在，将创建新存档')
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

        console.log('[Evolve] 存档已保存到uTools', result)

        // 追踪存档操作（埋点）
        analyticsTracker.trackSaveOperation('save', 'evolve', {
          auto: true // 自动存档
        })

        // 发送确认消息给iframe
        if (iframeRef.value && iframeRef.value.contentWindow) {
          iframeRef.value.contentWindow.postMessage({
            type: 'evolve-save-response',
            data: { success: true }
          }, '*')
        }
      } catch (dbError) {
        console.error('[Evolve] 保存到uTools数据库失败:', dbError)
        // 数据库保存失败，尝试使用localStorage备份
        try {
          localStorage.setItem(UTOOLS_STORAGE_KEY, JSON.stringify(data))
          console.log('[Evolve] 已使用localStorage备份存档')
        } catch (backupError) {
          console.error('[Evolve] localStorage备份也失败:', backupError)
        }
      }
    } else {
      // 非uTools环境，保存到localStorage作为备份
      try {
        localStorage.setItem(UTOOLS_STORAGE_KEY, JSON.stringify(data))
        console.log('[Evolve] 存档已保存到localStorage（非uTools环境）')
      } catch (storageError) {
        console.error('[Evolve] 保存到localStorage失败:', storageError)
      }
    }
  } catch (error) {
    console.error('[Evolve] 保存存档失败:', error)
    // 保存失败不应影响游戏继续运行
  }
}

// 从uTools加载存档
const handleLoadFromUTools = async () => {
  try {
    console.log('[Evolve] 收到加载请求')

    let saveDataResult = null

    if (window.utools && window.utools.db) {
      try {
        // 从uTools数据库直接读取具体的文档
        let doc = null
        if (window.utools.db.promises && window.utools.db.promises.get) {
          doc = await window.utools.db.promises.get(UTOOLS_STORAGE_KEY)
        } else {
          doc = window.utools.db.get(UTOOLS_STORAGE_KEY)
        }

        if (doc && doc.saveData) {
          // 验证存档数据
          if (typeof doc.saveData === 'string' && doc.saveData.length > 0) {
            saveDataResult = doc.saveData
            console.log('[Evolve] 从uTools加载存档成功')
          } else {
            console.warn('[Evolve] uTools存档数据格式异常，已忽略')
            // 删除损坏的存档
            await removeCorruptedSave(UTOOLS_STORAGE_KEY)
          }
        } else {
          // 尝试使用旧的方式兼容
          let docs = []
          if (window.utools.db.promises && window.utools.db.promises.allDocs) {
            docs = await window.utools.db.promises.allDocs(UTOOLS_STORAGE_KEY)
          } else {
            docs = window.utools.db.allDocs(UTOOLS_STORAGE_KEY)
          }
          if (docs && docs.length > 0) {
            const doc = docs[0]
            if (doc.saveData && typeof doc.saveData === 'string' && doc.saveData.length > 0) {
              saveDataResult = doc.saveData
              console.log('[Evolve] 从uTools(allDocs方式)加载存档成功')
            } else {
              console.warn('[Evolve] uTools旧方式存档数据格式异常，已忽略')
            }
          }
        }
      } catch (dbError) {
        console.error('[Evolve] 从uTools读取存档时出错:', dbError)
        // 数据库错误不影响游戏运行，继续使用空存档
      }
    } else {
      // 非uTools环境，从localStorage读取
      try {
        const savedData = localStorage.getItem(UTOOLS_STORAGE_KEY)
        if (savedData) {
          const parsed = JSON.parse(savedData)
          if (parsed && parsed.saveData && typeof parsed.saveData === 'string') {
            saveDataResult = parsed.saveData
            console.log('[Evolve] 从localStorage加载存档（非uTools环境）')
          } else {
            console.warn('[Evolve] localStorage存档数据格式异常，已忽略')
            localStorage.removeItem(UTOOLS_STORAGE_KEY)
          }
        }
      } catch (parseError) {
        console.error('[Evolve] 解析localStorage存档失败:', parseError)
        // 清除损坏的存档
        localStorage.removeItem(UTOOLS_STORAGE_KEY)
      }
    }

    // 发送存档数据给iframe（即使为null也要发送，让游戏知道没有存档）
    if (iframeRef.value && iframeRef.value.contentWindow) {
      iframeRef.value.contentWindow.postMessage({
        type: 'evolve-load-save-response',
        data: { saveData: saveDataResult }
      }, '*')
    }
  } catch (error) {
    console.error('[Evolve] 加载存档失败:', error)
    // 即使加载失败，也要通知iframe（发送null），确保游戏能正常启动
    if (iframeRef.value && iframeRef.value.contentWindow) {
      iframeRef.value.contentWindow.postMessage({
        type: 'evolve-load-save-response',
        data: { saveData: null }
      }, '*')
    }
  }
}

// 删除损坏的存档
const removeCorruptedSave = async (saveId) => {
  try {
    if (window.utools && window.utools.db) {
      if (window.utools.db.promises && window.utools.db.promises.remove) {
        await window.utools.db.promises.remove(saveId)
      } else {
        window.utools.db.remove(saveId)
      }
      console.log('[Evolve] 已删除损坏的存档:', saveId)
    }
  } catch (error) {
    console.error('[Evolve] 删除损坏存档失败:', error)
  }
}

onUnmounted(() => {
  console.log('[Evolve] 组件已卸载')

  // 如果还有未结束的会话，结束它
  analyticsTracker.endGameSession()

  // 清除定时器
  if (headerTimer) {
    clearTimeout(headerTimer)
    headerTimer = null
  }

  // 移除消息监听器
  window.removeEventListener('message', handleIframeMessage)
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<template>
  <div class="evolve-view" @mousemove="onMouseMoveGame">
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
          <!-- 安全说明: gameConfig.icon 是内部静态 SVG 配置，非用户输入，XSS 风险可控 -->
          <span class="game-icon" v-html="gameConfig.icon"></span>
          <div class="title-text">
            <h1 class="game-name">进化</h1>
            <p class="game-english-name">Evolve - 物种进化模拟</p>
          </div>
        </div>
        <div class="header-actions">
          <button
            class="action-btn"
            @click="openWiki"
            title="查看游戏 Wiki"
          >
            <span class="action-icon">📖</span>
            <span class="action-text">进化维基</span>
          </button>
          <button
            class="action-btn"
            @click="openSave"
            title="游戏存档管理"
          >
            <span class="action-icon">💾</span>
            <span class="action-text">存档</span>
          </button>
        </div>
        <div class="spacer"></div>
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
        src="/evolve/index.html"
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

    <!-- Wiki 对话框 -->
    <transition name="fade">
      <div v-if="showWikiDialog" class="dialog-overlay" @click="showWikiDialog = false">
        <div class="dialog-content" @click.stop>
          <div class="dialog-header">
            <h3>📖 进化维基</h3>
            <button class="close-btn" @click="showWikiDialog = false">✕</button>
          </div>
          <div class="dialog-body">
            <iframe
              src="/evolve/wiki.html"
              class="dialog-iframe"
              frameborder="0"
            ></iframe>
          </div>
        </div>
      </div>
    </transition>

    <!-- 存档对话框 -->
    <transition name="fade">
      <div v-if="showSaveDialog" class="dialog-overlay" @click="showSaveDialog = false">
        <div class="dialog-content" @click.stop>
          <div class="dialog-header">
            <h3>💾 游戏存档</h3>
            <button class="close-btn" @click="showSaveDialog = false">✕</button>
          </div>
          <div class="dialog-body">
            <iframe
              src="/evolve/save.html"
              class="dialog-iframe"
              frameborder="0"
            ></iframe>
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

.evolve-view {
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

.game-title {
  display: flex;
  align-items: center;
  gap: 12px;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.game-icon {
  width: 24px;
  height: 24px;
  margin-right: 12px;
  line-height: 1;
  display: inline-block;
  vertical-align: middle;
}

.game-icon :deep(svg) {
  width: 100%;
  height: 100%;
  stroke: currentColor;
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

.header-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(155, 89, 182, 0.3);
  border-color: rgba(155, 89, 182, 0.5);
}

.action-icon {
  font-size: 16px;
  line-height: 1;
}

.action-text {
  font-size: 12px;
  font-weight: 500;
}

@media (max-width: 768px) {
  .action-text {
    display: none;
  }

  .action-btn {
    padding: 6px 10px;
  }
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
  background: #1a1a2e;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #9b59b6;
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
  background: #9b59b6;
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

/* Wiki 和存档对话框 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 10px;
}

.dialog-content {
  background: #1a1a2e;
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  width: 90%;
  max-width: 900px;
  height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(155, 89, 182, 0.1);
  flex-shrink: 0;
}

.dialog-header h3 {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 20px;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  line-height: 1;
  padding: 0;
}

.close-btn:hover {
  background: rgba(231, 76, 60, 0.3);
  color: #fff;
}

.dialog-body {
  flex: 1;
  overflow: hidden;
  background: #fff;
}

.dialog-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

/* 过渡动画 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
