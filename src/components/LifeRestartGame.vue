<script setup>
/**
 * 人生重开模拟器 游戏组件
 * 壳层由 GameShell 提供，本组件保留：30秒自动存档(utools dbStorage)、
 * 云端存档应用、保存时间提示。
 */
import { onMounted, onUnmounted, ref } from 'vue'
import GameShell from './GameShell.vue'

const iframeRef = ref(null)
const lastSaveTime = ref(null)

let autoSaveInterval = null // 自动保存定时器

// 自动保存逻辑
const triggerAutoSave = async () => {
  if (!window.utools || !iframeRef.value || !iframeRef.value.contentWindow) return

  try {
    const iframeStorage = iframeRef.value.contentWindow.localStorage
    const data = {}
    for (let i = 0; i < iframeStorage.length; i++) {
      const key = iframeStorage.key(i)
      data[key] = iframeStorage.getItem(key)
    }

    if (Object.keys(data).length > 0) {
      const saveKey = 'liferestart_autosave'
      const saveData = {
        _metadata: {
          version: "1.0",
          lastSave: new Date().toISOString()
        },
        _data: data
      }
      window.utools.dbStorage.setItem(saveKey, JSON.stringify(saveData))
      lastSaveTime.value = new Date()
      console.log('[LifeRestart] 自动存档成功')
    }
  } catch (error) {
    console.error('[LifeRestart] 自动存档失败:', error)
  }
}

onMounted(() => {
  // 启动定时自动保存（每30秒保存一次）
  autoSaveInterval = setInterval(triggerAutoSave, 30000)

  // 窗口关闭前自动保存
  window.addEventListener('beforeunload', triggerAutoSave)

  // 尝试读取上次保存时间
  if (window.utools) {
    const saveKey = 'liferestart_autosave'
    const saveString = window.utools.dbStorage.getItem(saveKey)
    if (saveString) {
      try {
        const parsedData = JSON.parse(saveString)
        const saveData = parsedData._data || {} // 兼容新旧格式

        // 如果有云端存档，准备在 iframe 加载后写入
        if (Object.keys(saveData).length > 0) {
          localStorage.setItem('liferestart_pending_data', JSON.stringify(saveData))
          console.log('[LifeRestart] 准备加载云端存档数据')
        }

        // 解析上次保存时间（支持新格式）
        if (parsedData._metadata && parsedData._metadata.lastSave) {
          lastSaveTime.value = new Date(parsedData._metadata.lastSave)
        }
      } catch (error) {
        console.error('[LifeRestart] 解析存档失败:', error)
      }
    }
  }
})

// iframe 加载完成后的处理
const onIframeLoad = () => {
  console.log('[LifeRestart] iframe 加载完成')

  // 检查是否有待加载的云端数据
  const pendingData = localStorage.getItem('liferestart_pending_data')
  if (pendingData && iframeRef.value && iframeRef.value.contentWindow) {
    try {
      const data = JSON.parse(pendingData)
      const iframeStorage = iframeRef.value.contentWindow.localStorage

      // LifeRestart 是单次游戏，直接覆盖比较稳妥
      for (const key in data) {
        iframeStorage.setItem(key, data[key])
      }

      console.log('[LifeRestart] 已将云端存档应用到 iframe')
      localStorage.removeItem('liferestart_pending_data')
    } catch (e) {
      console.error('[LifeRestart] 应用云端存档失败:', e)
    }
  }
}

onUnmounted(() => {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval)
  }
  window.removeEventListener('beforeunload', triggerAutoSave)
})
</script>

<template>
  <GameShell
    game-id="liferestart"
    game-name="人生重开模拟器"
    game-english-name="Life Restart - 自动存档已启用"
    game-icon="🔄"
    icon-color="#e74c3c"
    background-color="#131417"
    accent-color="#e74c3c"
    :exit-confirm="false"
  >
    <div class="liferestart-container">
      <iframe
        ref="iframeRef"
        src="lifeRestart/index.html"
        class="game-iframe"
        title="Life Restart"
        frameborder="0"
        @load="onIframeLoad"
      ></iframe>

      <!-- 保存时间提示 -->
      <Transition name="save-time-fade">
        <div v-if="lastSaveTime" class="save-time">
          上次保存: {{ lastSaveTime.toLocaleString('zh-CN') }}
        </div>
      </Transition>
    </div>
  </GameShell>
</template>

<style scoped>
.liferestart-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #000;
}

.game-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

.save-time {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  pointer-events: none;
  backdrop-filter: blur(10px);
}

.save-time-fade-enter-active,
.save-time-fade-leave-active {
  transition: all 0.3s ease;
}

.save-time-fade-enter-from,
.save-time-fade-leave-to {
  opacity: 0;
}
</style>
