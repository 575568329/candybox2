<script setup>
import { onMounted, ref } from 'vue'
import GameList from './GameList/index.vue'

const route = ref('')

// 打开 Candy Box 2 游戏
const openCandyBox2 = () => {
  const gameUrl = window.location.origin + '/src/candybox2/index.html'

  window.utools.ubrowser
    .goto(gameUrl)
    .run({
      width: 1200,
      height: 800,
      center: true,
      title: '糖果盒子2 (Candy Box 2)'
    })
    .then(([result, instance]) => {
      console.log('游戏已打开', instance)
    })
    .catch(err => {
      console.error('打开游戏失败', err)
    })
}

onMounted(() => {
  // 如果没有路由，默认显示游戏列表
  if (!window.utools.getCurrentPlugin()) {
    route.value = ''
    return
  }

  window.utools.onPluginEnter((action) => {
    route.value = action.code

    // 如果是直接打开 Candy Box 2
    if (action.code === 'candybox2') {
      openCandyBox2()
    }
  })

  window.utools.onPluginOut(() => {
    route.value = ''
  })
})
</script>

<template>
  <!-- 默认显示游戏列表 -->
  <GameList v-if="!route || route === '' || route === 'games'" />
</template>
