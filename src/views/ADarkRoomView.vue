<script setup>
/**
 * 小黑屋(A Dark Room) 游戏视图
 * 壳层由 GameShell 提供，本视图只保留 iframe 存档桥接。
 */
import { ref, onMounted, onUnmounted } from 'vue'
import GameShell from '../components/GameShell.vue'
import { analyticsTracker } from '../utils/analyticsTracker'

const iframeRef = ref(null)
const isLoading = ref(true)
const hasError = ref(false)

// uTools云存档相关
const UTOOLS_STORAGE_KEY = 'game_save_adarkroom'

// iframe 加载完成/失败
const onIframeLoad = () => {
  isLoading.value = false
  hasError.value = false
}

const onIframeError = () => {
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
    case 'adarkroom-save-request':
      // 游戏请求保存存档到uTools
      await handleSaveToUTools(data)
      break

    case 'adarkroom-load-save-request':
      // 游戏请求从uTools加载存档
      await handleLoadFromUTools()
      break
  }
}

// 保存存档到uTools
const handleSaveToUTools = async (data) => {
  try {
    console.log('[小黑屋] 收到保存请求', data)

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
        gameState: data.gameState,
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

      console.log('[小黑屋] 存档已保存到uTools', result)

      // 追踪存档操作（埋点）
      analyticsTracker.trackSaveOperation('save', 'adarkroom', {
        auto: true // 自动存档
      })

      // 发送确认消息给iframe
      if (iframeRef.value && iframeRef.value.contentWindow) {
        iframeRef.value.contentWindow.postMessage({
          type: 'adarkroom-save-response',
          data: { success: true }
        }, '*')
      }
    } else {
      // 非uTools环境，保存到localStorage作为备份
      localStorage.setItem(UTOOLS_STORAGE_KEY, JSON.stringify(data))
      console.log('[小黑屋] 存档已保存到localStorage（非uTools环境）')
    }
  } catch (error) {
    console.error('[小黑屋] 保存存档失败:', error)
  }
}

// 从uTools加载存档
const handleLoadFromUTools = async () => {
  try {
    console.log('[小黑屋] 收到加载请求')

    let gameStateData = null

    if (window.utools && window.utools.db) {
      // 从uTools数据库直接读取具体的文档
      let doc = null
      if (window.utools.db.promises && window.utools.db.promises.get) {
        doc = await window.utools.db.promises.get(UTOOLS_STORAGE_KEY)
      } else {
        doc = window.utools.db.get(UTOOLS_STORAGE_KEY)
      }

      if (doc && doc.gameState) {
        gameStateData = doc.gameState
        console.log('[小黑屋] 从uTools加载存档成功')
      } else {
        // 尝试使用旧的方式兼容
        let docs = []
        if (window.utools.db.promises && window.utools.db.promises.allDocs) {
          docs = await window.utools.db.promises.allDocs(UTOOLS_STORAGE_KEY)
        } else {
          docs = window.utools.db.allDocs(UTOOLS_STORAGE_KEY)
        }
        if (docs && docs.length > 0) {
          gameStateData = docs[0].gameState
          console.log('[小黑屋] 从uTools(allDocs方式)加载存档成功')
        }
      }
    } else {
      // 非uTools环境，从localStorage读取
      const savedData = localStorage.getItem(UTOOLS_STORAGE_KEY)
      if (savedData) {
        const parsed = JSON.parse(savedData)
        gameStateData = parsed.gameState
        console.log('[小黑屋] 从localStorage加载存档（非uTools环境）')
      }
    }

    // 发送存档数据给iframe
    if (iframeRef.value && iframeRef.value.contentWindow) {
      iframeRef.value.contentWindow.postMessage({
        type: 'adarkroom-load-save-response',
        data: { gameState: gameStateData }
      }, '*')
    }
  } catch (error) {
    console.error('[小黑屋] 加载存档失败:', error)

    // 即使出错也发送响应（空存档）
    if (iframeRef.value && iframeRef.value.contentWindow) {
      iframeRef.value.contentWindow.postMessage({
        type: 'adarkroom-load-save-response',
        data: { gameState: null }
      }, '*')
    }
  }
}

onMounted(() => {
  // 注册消息监听器，处理iframe的存档请求
  window.addEventListener('message', handleIframeMessage)
})

onUnmounted(() => {
  // 移除消息监听器
  window.removeEventListener('message', handleIframeMessage)
})
</script>

<template>
  <GameShell
    game-id="adarkroom"
    game-name="小黑屋"
    game-english-name="A Dark Room - 自动云存档已启用"
    game-icon="🏚️"
    icon-color="#8e9aaf"
    background-color="#131417"
    accent-color="#8e9aaf"
    show-cloud-save-tip
    :loading="isLoading"
    :error="hasError"
  >
    <iframe
      v-show="!isLoading && !hasError"
      ref="iframeRef"
      src="adarkroom/index.html"
      class="game-frame"
      @load="onIframeLoad"
      @error="onIframeError"
      frameborder="0"
      allowfullscreen
    ></iframe>
  </GameShell>
</template>

<style scoped>
.game-frame {
  width: 100%;
  height: 100%;
  border: none;
}
</style>
