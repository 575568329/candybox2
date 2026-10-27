<script setup>
/**
 * 进化(Evolve) 游戏视图
 * 壳层由 GameShell 提供，本视图保留：存档桥接(utools db)、
 * Wiki/存档管理对话框、promoBar 隐藏与链接拦截、关窗强制保存。
 */
import { ref, onMounted, onUnmounted } from 'vue'
import GameShell from '../components/GameShell.vue'
import { analyticsTracker } from '../utils/analyticsTracker'
import { getGameById } from '../config/games'

const gameConfig = getGameById('evolve')

const iframeRef = ref(null)
const isLoading = ref(true)
const hasError = ref(false)

// Wiki / 存档管理对话框
const showWikiDialog = ref(false)
const showSaveDialog = ref(false)

const UTOOLS_STORAGE_KEY = 'game_save_evolve'

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

// 打开 Wiki / 存档页面
const openWiki = () => {
  showWikiDialog.value = true
}

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

onMounted(() => {
  // 注册消息监听器，处理iframe的存档请求
  window.addEventListener('message', handleIframeMessage)
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  // 移除监听器
  window.removeEventListener('message', handleIframeMessage)
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<template>
  <GameShell
    game-id="evolve"
    game-name="进化"
    game-english-name="Evolve - 物种进化模拟"
    :game-icon="gameConfig.icon"
    icon-color="#58a4fc"
    background-color="#131417"
    accent-color="#58a4fc"
    :loading="isLoading"
    :error="hasError"
  >
    <template #actions>
      <button @click="openWiki" title="查看游戏 Wiki">
        <span>📖</span>
        <span>进化维基</span>
      </button>
      <button @click="openSave" title="游戏存档管理">
        <span>💾</span>
        <span>存档</span>
      </button>
    </template>

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
  </GameShell>
</template>

<style scoped>
.game-frame {
  width: 100%;
  height: 100%;
  border: none;
}

/* Wiki / 存档 对话框 */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}

.dialog-content {
  background: var(--gs-surface);
  border: 1px solid var(--gs-border);
  border-radius: 12px;
  width: 86vw;
  height: 84vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--gs-border);
}

.dialog-header h3 {
  color: var(--gs-text-1);
  font-size: 16px;
}

.close-btn {
  background: var(--gs-btn-bg);
  border: 1px solid var(--gs-btn-border);
  border-radius: var(--gs-radius);
  color: var(--gs-text-1);
  width: 30px;
  height: 30px;
  cursor: pointer;
  font-size: 14px;
}

.close-btn:hover {
  background: var(--gs-btn-bg-hover);
}

.dialog-body {
  flex: 1;
  overflow: hidden;
}

.dialog-iframe {
  width: 100%;
  height: 100%;
  border: none;
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
