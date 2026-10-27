<script setup>
/**
 * 环形之路 游戏视图
 * 壳层(头部/自动隐藏/退出确认/埋点会话)由 GameShell 提供，
 * 本视图只保留 iframe 存档桥接与切换地图动作。
 */
import { ref, onMounted, onUnmounted } from 'vue'
import GameShell from '../components/GameShell.vue'
import { analyticsTracker } from '../utils/analyticsTracker'

const iframeRef = ref(null)
const isLoading = ref(true)
const hasError = ref(false)

// uTools云存档相关
const UTOOLS_STORAGE_KEY = 'game_save_circlepath'

// 切换地图
const changeMap = () => {
  if (iframeRef.value && iframeRef.value.contentWindow) {
    iframeRef.value.contentWindow.postMessage({ type: 'CHANGE_MAP' }, '*')
  }
}

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
    case 'circlepath-save-request':
      // 游戏请求保存存档到uTools
      await handleSaveToUTools(data)
      break

    case 'circlepath-load-save-request':
      // 游戏请求从uTools加载存档
      await handleLoadFromUTools()
      break
  }
}

// 保存存档到uTools
const handleSaveToUTools = async (data) => {
  try {
    console.log('[CirclePath] 收到保存请求', data)

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

      console.log('[CirclePath] 存档已保存到uTools', result)

      // 追踪存档操作（埋点）
      analyticsTracker.trackSaveOperation('save', 'circlepath', {
        auto: true // 自动存档
      })

      // 发送确认消息给iframe
      if (iframeRef.value && iframeRef.value.contentWindow) {
        iframeRef.value.contentWindow.postMessage({
          type: 'circlepath-save-response',
          data: { success: true }
        }, '*')
      }
    } else {
      // 非uTools环境，保存到localStorage作为备份
      localStorage.setItem(UTOOLS_STORAGE_KEY, JSON.stringify(data))
      console.log('[CirclePath] 存档已保存到localStorage（非uTools环境）')
    }
  } catch (error) {
    console.error('[CirclePath] 保存存档失败:', error)
  }
}

// 从uTools加载存档
const handleLoadFromUTools = async () => {
  try {
    console.log('[CirclePath] 收到加载请求')

    let saveData = null

    if (window.utools && window.utools.db) {
      // 从uTools数据库直接读取具体的文档
      let doc = null
      if (window.utools.db.promises && window.utools.db.promises.get) {
        doc = await window.utools.db.promises.get(UTOOLS_STORAGE_KEY)
      } else {
        doc = window.utools.db.get(UTOOLS_STORAGE_KEY)
      }

      if (doc && doc.saveData) {
        saveData = doc.saveData
        console.log('[CirclePath] 从uTools加载存档成功')
      }
    } else {
      // 非uTools环境，从localStorage读取
      const savedData = localStorage.getItem(UTOOLS_STORAGE_KEY)
      if (savedData) {
        const parsed = JSON.parse(savedData)
        saveData = parsed.saveData
        console.log('[CirclePath] 从localStorage加载存档（非uTools环境）')
      }
    }

    // 发送存档数据给iframe
    if (iframeRef.value && iframeRef.value.contentWindow) {
      iframeRef.value.contentWindow.postMessage({
        type: 'circlepath-load-save-response',
        data: saveData
      }, '*')
    }
  } catch (error) {
    console.error('[CirclePath] 加载存档失败:', error)

    // 即使出错也发送响应（空存档）
    if (iframeRef.value && iframeRef.value.contentWindow) {
      iframeRef.value.contentWindow.postMessage({
        type: 'circlepath-load-save-response',
        data: null
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
    game-id="circlepath"
    game-name="环形之路"
    game-english-name="Circle Path - 自动云存档已启用"
    game-icon="●"
    icon-color="#62bd18"
    background-color="#131417"
    accent-color="#62bd18"
    :loading="isLoading"
    :error="hasError"
  >
    <template #actions>
      <button @click="changeMap" title="切换地图">
        <span>🎨</span>
        <span>切换地图</span>
      </button>
    </template>

    <iframe
      v-show="!isLoading && !hasError"
      ref="iframeRef"
      src="circlepath/index.html"
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
