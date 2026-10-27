<script setup>
/**
 * 糖果盒子2(Candy Box 2) 游戏组件
 * 壳层由 GameShell 提供，本组件保留：多槽位存档体系(utools dbStorage)、
 * 30秒自动保存、Ctrl+S、iframe 内链接拦截(槽位切换)、Toast 通知。
 */
import { onMounted, onUnmounted, ref } from 'vue'
import GameShell from './GameShell.vue'
import { analyticsTracker } from '../utils/analyticsTracker'

const iframeRef = ref(null)
const lastSaveTime = ref(null)
const showSaveTime = ref(false) // 控制保存时间的显示
const iframeUrl = ref('')

// Toast 通知状态
const toastMessage = ref('')
const toastVisible = ref(false)
let toastTimer = null
let saveTimeTimer = null // 保存时间显示的定时器

// 定时自动保存
let autoSaveInterval = null
const AUTO_SAVE_INTERVAL = 30000 // 每30秒自动保存一次

// 显示 Toast 通知
const showToast = (message, duration = 3000) => {
  toastMessage.value = message
  toastVisible.value = true

  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastVisible.value = false
  }, duration)
}

// 显示保存时间提示并自动隐藏
const showSaveTimeTemp = () => {
  showSaveTime.value = true
  if (saveTimeTimer) clearTimeout(saveTimeTimer)
  saveTimeTimer = setTimeout(() => {
    showSaveTime.value = false
  }, 5000) // 5秒后自动隐藏
}

// 退出前自动保存（GameShell beforeExit 钩子）
const saveBeforeExit = async () => {
  showToast('💾 正在保存存档...')

  try {
    await triggerAutoSave()

    // 等待一下，确保数据完全写入
    await new Promise(r => setTimeout(r, 500))

    showToast('✅ 保存成功')

    // 等待用户看到成功提示
    await new Promise(r => setTimeout(r, 800))
  } catch (error) {
    console.error('❌ Candy Box 2 保存失败:', error)
    showToast('⚠️ 保存失败')
  }
}

// 在 iframe 内部添加键盘监听和链接拦截
const setupIframeKeyboardListener = () => {
  const iframe = iframeRef.value
  if (!iframe?.contentWindow) {
    return
  }

  // 拦截游戏内的链接点击（修复 "You can load a local save" 功能）
  iframe.contentWindow.document.addEventListener('click', (e) => {
    const target = e.target
    if (target.tagName === 'A' && target.href) {
      const href = target.href

      // 检查是否是槽位链接
      const slotMatch = href.match(/[?&]slot=(\d)/)
      if (slotMatch) {
        e.preventDefault()
        const slot = slotMatch[1]

        // 使用异步函数
        ;(async () => {
          // 1. 先保存当前进度到 uTools
          await triggerAutoSave()
          showToast(`💾 已保存，正在切换到槽位 ${slot}...`)

          // 2. 🔥 关键：保存完成后再读取 uTools 自动存档（确保获取最新数据）
          if (window.utools) {
            const saveString = window.utools.dbStorage.getItem('candybox2_autosave')

            if (saveString) {
              const saveData = JSON.parse(saveString)

              // 🔥 关键修复：将数据保存到父窗口的 localStorage
              // 这样 iframe 加载时就可以读取
              localStorage.setItem('candybox2_pending_slot', slot)
              localStorage.setItem('candybox2_pending_data', JSON.stringify(saveData))

              // 3. 切换 iframe URL（iframe 加载后会从父 localStorage 读取数据）
              // 🔥 关键修复：不添加时间戳参数，避免干扰游戏的 URL 解析
              iframeUrl.value = `/candybox2-game.html?slot=${slot}`

              showToast(`✅ 槽位 ${slot} 加载成功`)
            } else {
              // 如果没有存档，直接切换
              iframeUrl.value = `/candybox2-game.html?slot=${slot}&t=${Date.now()}`
              showToast(`⚠️ 槽位 ${slot} 无存档，开始新游戏`)
            }
          } else {
            // 如果没有 uTools，直接切换
            iframeUrl.value = `/candybox2-game.html?slot=${slot}&t=${Date.now()}`
            showToast(`⚠️ 槽位 ${slot} 无存档，开始新游戏`)
          }
        })()

        return false
      }
    }
  }, true)

  // 在 iframe 的 document 上添加键盘监听
  iframe.contentWindow.document.addEventListener('keydown', (e) => {
    // Ctrl+S 或 Cmd+S
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault()
      e.stopPropagation()

      // 调用父窗口的保存函数
      ;(async () => {
        await triggerAutoSave()
        showToast('✅ 保存成功')
        showSaveTimeTemp()
      })()
    }
  }, true)
}

// 自动保存游戏进度（保存所有槽位数据）
const triggerAutoSave = async () => {
  const iframe = iframeRef.value
  if (!iframe?.contentWindow) {
    return
  }

  try {
    // 检查游戏对象是否存在
    const maxWait = 10 // 最多等待 10 次（1 秒）
    for (let i = 0; i < maxWait; i++) {
      if (iframe.contentWindow.Saving && iframe.contentWindow.LocalSaving) {
        break
      }
      await new Promise(r => setTimeout(r, 100))
    }

    // 如果游戏对象仍未就绪，跳过保存
    if (!iframe.contentWindow.Saving || !iframe.contentWindow.LocalSaving) {
      return
    }

    // 获取当前使用的槽位（从 URL 参数读取）
    const urlParams = new URLSearchParams(iframeUrl.value.split('?')[1])
    const currentSlot = urlParams.get('slot') || '1'

    // 使用劫持 Keyboard.setGame 暴露的 game 对象
    const game = iframe.contentWindow.GAME_OBJECT
    const Saving = iframe.contentWindow.Saving
    const MainLoadingType = iframe.contentWindow.MainLoadingType

    if (game && Saving && MainLoadingType && typeof Saving.save === 'function') {
      const slotName = `slot${currentSlot}`

      // 调用游戏的保存方法
      Saving.save(game, MainLoadingType.LOCAL, slotName)

      // 等待数据写入完成
      await new Promise(r => setTimeout(r, 500))

      // 保存所有 localStorage 数据（包含所有槽位）
      const storage = iframe.contentWindow.localStorage
      const saveData = {
        _metadata: {
          version: "1.0",
          lastSave: new Date().toISOString(),
          currentSlot: currentSlot
        },
        _data: {}
      }

      // 保存所有数据
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        saveData._data[key] = storage.getItem(key)
      }

      // 保存到 uTools
      if (window.utools) {
        const saveKey = 'candybox2_autosave'
        const saveString = JSON.stringify(saveData)
        window.utools.dbStorage.setItem(saveKey, saveString)
        lastSaveTime.value = new Date()

        // 追踪存档操作（埋点）
        analyticsTracker.trackSaveOperation('save', 'candybox2', {
          slot: currentSlot,
          auto: false
        })
      }
    } else {
      // 降级方案：直接调用 LocalSaving.save()
      console.error('❌ Candy Box 2 保存失败：无法访问游戏对象，使用降级方案')
      const LocalSaving = iframe.contentWindow.LocalSaving
      if (LocalSaving && typeof LocalSaving.save === 'function') {
        const slotName = `slot${currentSlot}`
        LocalSaving.save(slotName)
        await new Promise(r => setTimeout(r, 500))

        // 保存所有 localStorage 数据
        const storage = iframe.contentWindow.localStorage
        const saveData = {
          _metadata: {
            version: "1.0",
            lastSave: new Date().toISOString(),
            currentSlot: currentSlot
          },
          _data: {}
        }

        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i)
          saveData._data[key] = storage.getItem(key)
        }

        if (window.utools) {
          const saveKey = 'candybox2_autosave'
          const saveString = JSON.stringify(saveData)
          window.utools.dbStorage.setItem(saveKey, saveString)
          lastSaveTime.value = new Date()
        }
      }
    }
  } catch (error) {
    console.error('❌ Candy Box 2 自动保存失败:', error)
  }
}

onMounted(async () => {
  // 启动定时自动保存（每30秒保存一次）
  autoSaveInterval = setInterval(async () => {
    try {
      await triggerAutoSave()
    } catch (error) {
      console.error('❌ Candy Box 2 定时自动保存失败:', error)
    }
  }, AUTO_SAVE_INTERVAL)

  // 窗口关闭前自动保存
  window.addEventListener('beforeunload', triggerAutoSave)

  // 读取自动存档，确定应该加载哪个槽位
  let initialSlot = '1' // 默认槽位1

  if (window.utools) {
    const saveKey = 'candybox2_autosave'
    const saveString = window.utools.dbStorage.getItem(saveKey)

    if (saveString) {
      try {
        const saveData = JSON.parse(saveString)

        // 验证存档数据的结构
        if (!saveData || typeof saveData !== 'object') {
          console.warn('[CandyBox2] 存档数据无效：不是对象类型')
          throw new Error('存档数据格式无效')
        }

        if (!saveData._metadata || typeof saveData._metadata !== 'object') {
          console.warn('[CandyBox2] 存档数据无效：缺少 _metadata')
          throw new Error('存档缺少元数据')
        }

        if (!saveData._data || typeof saveData._data !== 'object') {
          console.warn('[CandyBox2] 存档数据无效：缺少 _data')
          throw new Error('存档缺少数据')
        }

        // 验证 currentSlot 是否有效
        const validSlot = saveData._metadata.currentSlot
        if (validSlot && ['1', '2', '3'].includes(String(validSlot))) {
          initialSlot = String(validSlot)
        } else {
          console.warn('[CandyBox2] 槽位无效，使用默认槽位1:', validSlot)
          initialSlot = '1'
        }

        // 验证并解析 lastSave
        if (saveData._metadata.lastSave) {
          try {
            lastSaveTime.value = new Date(saveData._metadata.lastSave)
            // 检查日期是否有效
            if (isNaN(lastSaveTime.value.getTime())) {
              console.warn('[CandyBox2] 保存时间无效，忽略')
              lastSaveTime.value = null
            }
          } catch (dateError) {
            console.warn('[CandyBox2] 解析保存时间失败:', dateError)
            lastSaveTime.value = null
          }
        }

        // 将数据保存到父窗口 localStorage，iframe 加载时会从这里读取
        localStorage.setItem('candybox2_pending_slot', initialSlot)
        localStorage.setItem('candybox2_pending_data', saveString)

        console.log('[CandyBox2] 存档加载成功，槽位:', initialSlot)
      } catch (parseError) {
        console.error('[CandyBox2] 解析存档失败，使用默认槽位:', parseError)
        // 清除无效的存档
        window.utools.dbStorage.removeItem(saveKey)
        // 同时清除 localStorage 中的 pending 数据，避免加载错误槽位
        localStorage.removeItem('candybox2_pending_slot')
        localStorage.removeItem('candybox2_pending_data')
        initialSlot = '1'
      }
    }
  }

  // 初始化 iframe URL（使用正确的槽位）
  iframeUrl.value = `candybox2-game.html?slot=${initialSlot}`
})

onUnmounted(async () => {
  // 清理定时器
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval)
  }
  window.removeEventListener('beforeunload', triggerAutoSave)
})
</script>

<template>
  <GameShell
    game-id="candybox2"
    game-name="糖果盒子2"
    game-english-name="Candy Box 2 - Ctrl+S 保存 | 自动存档已启用"
    game-icon="🍬"
    icon-color="#e74c3c"
    background-color="#131417"
    accent-color="#e74c3c"
    :exit-confirm="false"
    :before-exit="saveBeforeExit"
  >
    <div class="candybox2-container">
      <iframe
        ref="iframeRef"
        :src="iframeUrl"
        class="game-iframe"
        title="Candy Box 2"
        frameborder="0"
        @load="setupIframeKeyboardListener"
      ></iframe>

      <!-- 保存时间提示 -->
      <Transition name="save-time-fade">
        <div v-if="showSaveTime && lastSaveTime" class="save-time">
          上次保存: {{ lastSaveTime.toLocaleString('zh-CN') }}
        </div>
      </Transition>
    </div>

    <!-- 自定义 Toast 通知 -->
    <Transition name="toast-fade">
      <div v-if="toastVisible" class="toast-notification">
        {{ toastMessage }}
      </div>
    </Transition>
  </GameShell>
</template>

<style scoped>
.candybox2-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #fff;
}

.game-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

/* Toast 通知 */
.toast-notification {
  position: fixed;
  top: 80px;
  right: 24px;
  background: rgba(30, 30, 46, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px 24px;
  color: white;
  font-size: 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  z-index: 9998;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(100px);
}

/* 保存时间提示 */
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
