<script setup>
import { onMounted } from 'vue'
import { analyticsTracker } from './utils/analyticsTracker.js'

// 检查是否在 uTools 环境中
const isUToolsEnv = () => {
  return typeof window !== 'undefined' && window.utools
}

onMounted(() => {
  // 开发环境不初始化埋点追踪器
  if (import.meta.env.DEV) {
    console.log('[埋点] 开发环境跳过埋点初始化')
    return
  }

  // 初始化埋点追踪器（全局初始化，确保所有页面都能收集数据）
  console.log('[埋点] 初始化追踪器')
  analyticsTracker.init()

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
      // 停止自动同步并触发一次同步（开发环境已跳过）
      if (!import.meta.env.DEV) {
        analyticsTracker.stopAutoSync()
        analyticsTracker.sync()
      }
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
