<script setup>
import { onMounted } from 'vue'

// 检查是否在 uTools 环境中
const isUToolsEnv = () => {
  return typeof window !== 'undefined' && window.utools
}

onMounted(() => {
  // 检查是否在 uTools 环境中
  if (!isUToolsEnv()) {
    console.log('当前在浏览器中预览')
    return
  }

  // 监听 uTools 插件进入事件
  if (window.utools) {
    window.utools.onPluginEnter((action) => {
      console.log('插件进入:', action)
      // 可以在这里处理特定的 uTools 入口
    })

    window.utools.onPluginOut(() => {
      console.log('插件退出')
    })
  }
})
</script>

<template>
  <router-view></router-view>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>
