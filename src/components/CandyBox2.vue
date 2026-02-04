<template>
  <div class="candybox2-container">
    <div id="aroundStatusBar"><pre id="statusBar"></pre></div>
    <pre id="mainContent"></pre>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'

// 加载游戏资源
const loadGameScripts = () => {
  // 加载 jQuery
  const loadjQuery = () => {
    return new Promise((resolve, reject) => {
      if (window.$) {
        resolve()
        return
      }
      const script = document.createElement('script')
      script.src = '/games/candybox2/libs/jquery-1.9.1.min.js'
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  // 加载游戏主逻辑
  const loadCandyBox2 = () => {
    return new Promise((resolve, reject) => {
      // 检查是否已经加载
      if (window.CandyBox2GameLoaded) {
        resolve()
        return
      }

      // 使用 XHR 加载并执行脚本，确保完整的执行上下文
      const xhr = new XMLHttpRequest()
      xhr.open('GET', '/games/candybox2/candybox2.js', true)
      xhr.onload = () => {
        try {
          // 创建 script 标签来执行代码
          const script = document.createElement('script')
          script.text = xhr.responseText
          document.head.appendChild(script)

          // 等待一小段时间确保脚本执行完成
          setTimeout(() => {
            window.CandyBox2GameLoaded = true
            document.head.removeChild(script)
            resolve()
          }, 100)
        } catch (err) {
          reject(err)
        }
      }
      xhr.onerror = reject
      xhr.send()
    })
  }

  // 加载样式
  const loadStyles = () => {
    return new Promise((resolve) => {
      // 检查是否已经加载
      if (document.querySelector('link[href*="candybox2/css/design.css"]')) {
        resolve()
        return
      }
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = '/games/candybox2/css/design.css'
      link.onload = resolve
      document.head.appendChild(link)
    })
  }

  // 依次加载所有资源
  return loadStyles()
    .then(() => loadjQuery())
    .then(() => loadCandyBox2())
    .catch(err => {
      console.error('加载 Candy Box 2 失败:', err)
      throw err
    })
}

onMounted(async () => {
  console.log('[CandyBox2] 组件已挂载，开始加载游戏资源...')
  try {
    await loadGameScripts()
    console.log('[CandyBox2] 游戏资源加载完成')
  } catch (error) {
    console.error('[CandyBox2] 游戏加载失败:', error)
  }
})

onUnmounted(() => {
  console.log('[CandyBox2] 组件已卸载')
})
</script>

<style scoped>
.candybox2-container {
  width: 100%;
  height: 100%;
  background: #ffffff;
  overflow: auto;
  font-family: monospace;
}

#aroundStatusBar {
  position: sticky;
  top: 0;
  background: #ffffff;
  z-index: 10;
  border-bottom: 1px solid #ccc;
}

#statusBar {
  margin: 0;
  padding: 10px;
  background: #f0f0f0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

#mainContent {
  padding: 10px;
  white-space: pre-wrap;
  word-wrap: break-word;
  user-select: text;
}
</style>
