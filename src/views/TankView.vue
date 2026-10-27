<script setup>
/**
 * 坦克大战 游戏视图
 * 壳层由 GameShell 提供，本视图保留：音效开关(postMessage)、
 * 512x416 原始尺寸的自适应缩放。
 */
import { ref, onMounted, onUnmounted } from 'vue'
import GameShell from '../components/GameShell.vue'

const iframeRef = ref(null)
const isLoading = ref(true)
const hasError = ref(false)

// 音效开关状态
const soundEnabled = ref(false)

// 游戏缩放（保持 512x416 宽高比，自适应容器）
const gameTransform = ref('')

const calculateGameScale = () => {
  // 坦克大战原始尺寸: 512x416
  const originalWidth = 512
  const originalHeight = 416

  const containerWidth = window.innerWidth
  const containerHeight = window.innerHeight - 48 // 减去导航栏高度

  const scaleX = containerWidth / originalWidth
  const scaleY = containerHeight / originalHeight
  const scale = Math.min(scaleX, scaleY)

  // 只设置缩放，由flex布局居中
  gameTransform.value = `scale(${scale})`
}

// 发送音效状态到 iframe
const sendSoundState = () => {
  if (iframeRef.value && iframeRef.value.contentWindow) {
    iframeRef.value.contentWindow.postMessage({
      type: 'toggleSound',
      enabled: soundEnabled.value
    }, '*')
  }
}

const toggleSound = () => {
  soundEnabled.value = !soundEnabled.value
  sendSoundState()
}

const onIframeLoad = () => {
  isLoading.value = false
  hasError.value = false
  // 发送初始音效状态到游戏
  sendSoundState()
}

const onIframeError = () => {
  isLoading.value = false
  hasError.value = true
}

onMounted(() => {
  calculateGameScale()
  window.addEventListener('resize', calculateGameScale)
})

onUnmounted(() => {
  window.removeEventListener('resize', calculateGameScale)
})
</script>

<template>
  <GameShell
    game-id="tank"
    game-name="坦克大战"
    game-english-name="Tank Battle - 经典射击游戏"
    game-icon="🎖️"
    icon-color="#f39c12"
    background-color="#131417"
    accent-color="#f39c12"
    :loading="isLoading"
    :error="hasError"
  >
    <template #actions>
      <button @click="toggleSound" :title="soundEnabled ? '关闭音效' : '开启音效'">
        {{ soundEnabled ? '🔊' : '🔇' }}
      </button>
    </template>

    <div class="tank-frame-wrap">
      <iframe
        v-show="!isLoading && !hasError"
        ref="iframeRef"
        src="./tank/index.html"
        class="tank-frame"
        :style="{ transform: gameTransform }"
        @load="onIframeLoad"
        @error="onIframeError"
        frameborder="0"
        allowfullscreen
      ></iframe>
    </div>
  </GameShell>
</template>

<style scoped>
.tank-frame-wrap {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.tank-frame {
  width: 512px;
  height: 416px;
  border: none;
  transform-origin: center center;
  flex-shrink: 0;
}
</style>
