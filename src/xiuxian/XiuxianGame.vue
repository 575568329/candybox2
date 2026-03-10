<template>
  <div class="xiuxian-game-wrapper">
    <!-- 顶部导航栏 -->
    <div class="game-header">
      <el-button class="back-btn" @click="goBack" title="返回游戏列表">
        <span class="back-icon">←</span>
        <span class="back-text">返回</span>
      </el-button>
      <div class="game-title">
        <span class="game-icon">⚔️</span>
        <div class="title-text">
          <h1 class="game-name">文字修仙</h1>
          <p class="game-english-name">Xiuxian Game</p>
        </div>
      </div>
    </div>

    <!-- 游戏内容 -->
    <div :class="['game-container', { dark: player.dark }]">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <keep-alive v-if="route.meta.keepAlive">
            <component :is="Component" :key="key" />
          </keep-alive>
          <component v-else :is="Component" :key="key" />
        </transition>
      </router-view>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useXiuxianStore } from './plugins/store'
import { analyticsTracker } from '../utils/analyticsTracker'
import { initAutoSync, stopAutoSync, saveToUTools } from './utils/cloudSave'
import { ElMessage } from 'element-plus'

const router = useRouter()
const player = ref({})
const route = useRoute()
const key = computed(() => route.path)

// 返回游戏列表（带自动保存）
const goBack = async () => {
  // 显示保存提示
  const savingMsg = ElMessage({
    message: '正在保存游戏...',
    type: 'info',
    duration: 0,
    grouping: true
  })

  try {
    // 立即保存到 uTools 云存储
    const result = await saveToUTools()

    // 关闭保存提示
    savingMsg.close()

    if (result.success) {
      ElMessage({
        message: '游戏已保存',
        type: 'success',
        duration: 1500
      })
    } else if (result.reason === 'not_utools') {
      // 非 uTools 环境，Pinia 已经自动保存到 localStorage
      ElMessage({
        message: '游戏已保存（本地）',
        type: 'success',
        duration: 1500
      })
    }

    // 延迟跳转，让用户看到保存成功提示
    setTimeout(() => {
      router.push('/')
    }, 500)
  } catch (error) {
    savingMsg.close()
    console.error('[返回] 保存失败:', error)
    ElMessage({
      message: '保存失败，但已自动保存到本地',
      type: 'warning',
      duration: 2000
    })
    // 即使保存失败也跳转，因为本地已有自动保存
    setTimeout(() => {
      router.push('/')
    }, 2000)
  }
}

watch(
  () => player.value.dark,
  val => {
    const gameContainer = document.querySelector('.xiuxian-game-wrapper')
    if (gameContainer) {
      gameContainer.classList.toggle('dark', val)
    }
  }
)

onMounted(() => {
  // 初始化玩家数据
  const store = useXiuxianStore()
  player.value = store.player || { dark: false }

  // 开始游戏会话（埋点）
  analyticsTracker.startGameSession({
    id: 'xiuxian',
    name: '文字修仙'
  })

  // 初始化云存档自动同步
  initAutoSync()

  // 每分钟增加1岁
  setInterval(() => {
    if (player.value) {
      player.value.age = (player.value.age || 0) + 1
      player.value.time = new Date().getTime()
    }
  }, 60000)

  // 如果有脚本的话, 执行脚本内容
  if (player.value.script) {
    try {
      new Function(player.value.script)()
    } catch (e) {
      console.error('执行脚本失败:', e)
    }
  }
})

onUnmounted(() => {
  // 结束游戏会话（埋点）
  analyticsTracker.endGameSession()

  // 停止云存档自动同步
  stopAutoSync()
})
</script>

<style scoped>
.xiuxian-game-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  -webkit-user-drag: none;
}

/* 顶部导航栏 */
.game-header {
  height: 48px;
  background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  flex-shrink: 0;
}

.back-btn {
  position: absolute;
  left: 16px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: white;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateX(-2px);
}

.back-icon {
  font-size: 14px;
  line-height: 1;
}

.back-text {
  font-weight: 500;
}

.game-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.game-icon {
  font-size: 24px;
  line-height: 1;
}

.title-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.game-name {
  font-size: 16px;
  font-weight: 600;
  color: white;
  line-height: 1.2;
  margin: 0;
}

.game-english-name {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.2;
  margin: 0;
}

/* uTools 窗口优化 */
@media only screen and (max-width: 800px) and (max-height: 500px) {
  .game-header {
    height: 44px;
    padding: 0 12px;
  }

  .back-btn {
    padding: 5px 10px;
    font-size: 12px;
    left: 12px;
  }

  .game-icon {
    font-size: 20px;
  }

  .game-name {
    font-size: 14px;
  }

  .game-english-name {
    font-size: 10px;
  }
}

.game-container-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.game-container {
  /* uTools 默认窗口 800x450 的优化尺寸 */
  width: calc(100% - 30px);  /* 留出左右各 15px 边距 */
  max-width: 760px;           /* 800 - 40 = 760px */
  /* 减去导航栏高度后的可用高度 */
  max-height: calc(100vh - 48px - 30px);  /* 48px导航栏 + 30px上下边距 */
  margin: 15px auto;
  padding: 15px;              /* 减小内边距以节省空间 */
  background-color: rgba(255, 255, 255, 0.5);
  text-align: center;
  position: relative;
  overflow-y: auto;           /* 内容过多时允许内部滚动 */
  box-sizing: border-box;
  flex: 1;
}

.game-container.dark {
  background-color: #141414;
}

.el-icon svg {
  height: 1em;
  width: 1em;
}

.light-icon {
  color: #606266;
}

.dark-icon {
  border-radius: 50%;
  color: #cfd3dc;
  background-color: #141414;
}

/* uTools 窗口尺寸优化 (800x450) */
@media only screen and (max-width: 800px) and (max-height: 500px) {
  /* 优化主容器高度计算 - 使用固定高度确保准确 */
  .game-container {
    padding: 6px;
    margin: 6px auto;
    width: calc(100% - 12px);
    /* 使用固定高度，避免calc计算误差 */
    height: 320px;  /* 固定320px给内容区 */
    max-height: 320px;
    display: flex;
    flex-direction: column;
    overflow: hidden;  /* 强制不显示滚动条 */
  }

  /* game-container需要relative定位 */
  .xiuxian-game-wrapper .game-container {
    position: relative;
  }

  /* 隐藏所有滚动条 */
  .game-container::-webkit-scrollbar {
    display: none;
  }

  .game-container {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  /* 内部滚动容器优化 */
  .game-container > * {
    flex-shrink: 0;
  }

  /* 允许页面内容内部滚动 */
  .game-container .home-page,
  .game-container .cultivate-page,
  .game-container .boss-page,
  .game-container .explore-page {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }
}

/* 横屏模式优化 */
@media only screen and (min-width: 768px) and (max-height: 500px) {
  .game-container {
    padding: 8px;
    margin: 8px auto;
    width: calc(100% - 16px);
  }

  /* 顶部导航栏优化 */
  .game-header {
    height: 44px;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  /* 增大触摸目标 */
  .back-btn {
    min-height: 44px;
    min-width: 44px;
  }

  .ink-button {
    min-height: 44px;
  }

  /* 优化点击反馈 */
  .ink-button:active {
    transform: scale(0.95);
  }
}

/* 移动端适配 */
@media only screen and (max-width: 768px) {
  .game-container {
    min-width: 356px;
    padding: 10px;
  }
}

/* 深色模式滚动条 */
.game-container.dark::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
}

.game-container.dark::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}

.game-container.dark::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>

<style>
/* 引入主题变量 */
@import './styles/theme.css';

/* 引入全局样式 */
@import './styles/global.css';

/* 引入动画样式 */
@import './styles/animations.css';

/* 引入 Element Plus 样式覆盖 */
@import './styles/element-plus.css';

/* 全局样式 - 仅在修仙游戏组件内生效 */
.xiuxian-game-wrapper {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.xiuxian-game-wrapper * {
  user-select: none;
}

.xiuxian-game-wrapper .el-switch.is-checked .el-switch__core {
  background-color: #2c2c2c;
  border-color: #4c4d4f;
}
</style>
