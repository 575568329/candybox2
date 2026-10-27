<script setup>
/**
 * 六边形俄罗斯方块 游戏视图
 * 壳层由 GameShell 提供，本视图只保留 iframe 加载状态。
 */
import { ref } from 'vue'
import GameShell from '../components/GameShell.vue'

const isLoading = ref(true)
const hasError = ref(false)

const onIframeLoad = () => {
  isLoading.value = false
  hasError.value = false
}

const onIframeError = () => {
  isLoading.value = false
  hasError.value = true
}
</script>

<template>
  <GameShell
    game-id="hextris"
    game-name="六边形俄罗斯方块"
    game-english-name="Hextris - 经典益智游戏"
    game-icon="⬢"
    icon-color="#3498db"
    background-color="#2c3e50"
    accent-color="#3498db"
    :loading="isLoading"
    :error="hasError"
  >
    <iframe
      v-show="!isLoading && !hasError"
      src="hextris/index.html"
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
