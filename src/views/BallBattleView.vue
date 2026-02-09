<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { GameCanvas } from '@/utils/ballbattle/GameCanvas'
import { submitScore, getTopScores } from '@/utils/leaderboardService'
import { generateAIPlayers, spawnPlayerAI } from '@/utils/aiPlayerGenerator'

const router = useRouter()

// 游戏状态
const gameState = ref('menu') // menu, playing, paused, gameover, leaderboard, ready
const gameMode = ref('challenge') // challenge, endless, timed
const difficulty = ref('normal') // easy, normal, hard
const endlessWithPlayerAI = ref(true) // 无尽模式是否启用玩家AI

// Canvas相关
const canvasRef = ref(null)
let gameCanvas = null

// 游戏统计
const stats = ref({
  score: 0,
  kills: 0,
  survivalTime: 0,
  maxMass: 0,
  rank: 0
})

// 结算相关
const showSubmitDialog = ref(false)
const playerName = ref('')
const submitResult = ref(null)
const leaderboard = ref([])

// 通知
const notification = ref({
  show: false,
  message: '',
  type: 'success'
})

// 显示通知
const showNotification = (message, type = 'success') => {
  notification.value = { show: true, message, type }
  setTimeout(() => {
    notification.value.show = false
  }, 3000)
}

// 格式化时间
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 开始游戏
const startGame = async () => {
  try {
    // 先切换到ready状态，让Canvas元素渲染
    gameState.value = 'ready'

    // 等待DOM更新，然后初始化Canvas
    await new Promise(resolve => setTimeout(resolve, 50))

    // 初始化Canvas引擎
    if (!initGameCanvas()) {
      throw new Error('Canvas引擎初始化失败')
    }

    // 初始化游戏
    const aiPlayers = []

    // 挑战模式：从排行榜生成AI
    if (gameMode.value === 'challenge') {
      try {
        const generatedAI = await generateAIPlayers({
          count: 15,
          minScore: 1000,
          includeBasic: true,
          difficulty: difficulty.value
        })
        aiPlayers.push(...generatedAI)
      } catch (error) {
        console.warn('生成排行榜AI失败，使用基础AI:', error)
      }
    }

    // 初始化Canvas游戏
    gameCanvas.init(gameMode.value, difficulty.value, aiPlayers)
    gameCanvas.start()
    gameCanvas.togglePause() // 立即暂停

    showNotification('准备就绪！点击开始按钮开始游戏', 'info')
  } catch (error) {
    console.error('启动游戏失败:', error)
    showNotification('启动游戏失败: ' + error.message, 'error')
    gameState.value = 'menu'
  }
}

// 正式开始游戏
const startPlaying = () => {
  gameState.value = 'playing'
  // 取消暂停，让游戏开始运行
  if (gameCanvas && gameCanvas.paused) {
    gameCanvas.togglePause()
  }
  showNotification('游戏开始！', 'info')
}

// 暂停游戏
const togglePause = () => {
  if (gameCanvas) {
    gameCanvas.togglePause()
    gameState.value = gameState.value === 'paused' ? 'playing' : 'paused'
  }
}

// 返回菜单
const backToMenu = () => {
  if (gameCanvas) {
    gameCanvas.destroy()
    gameCanvas = null
  }
  gameState.value = 'menu'
  showSubmitDialog.value = false
  submitResult.value = null
}

// 游戏结束处理
const handleGameOver = (gameStats) => {
  stats.value = gameStats
  gameState.value = 'gameover'

  // 自动显示提交对话框
  showSubmitDialog.value = true
  playerName.value = '球球玩家' + Math.floor(Math.random() * 1000)
}

// 查看排行榜
const viewLeaderboard = async () => {
  try {
    gameState.value = 'leaderboard'
    leaderboard.value = await getTopScores(100)
  } catch (error) {
    console.error('获取排行榜失败:', error)
    showNotification('获取排行榜失败', 'error')
  }
}

// 提交成绩
const handleSubmitScore = async () => {
  if (!playerName.value.trim()) {
    showNotification('请输入玩家昵称', 'error')
    return
  }

  try {
    const result = await submitScore({
      playerName: playerName.value.trim(),
      score: stats.value.score,
      kills: stats.value.kills,
      survivalTime: stats.value.survivalTime,
      mode: gameMode.value,
      difficulty: difficulty.value,
      skin: 'default',
      maxMass: stats.value.maxMass
    })

    submitResult.value = result
    showNotification(result.message, result.success ? 'success' : 'error')
  } catch (error) {
    console.error('提交成绩失败:', error)
    showNotification('提交成绩失败', 'error')
  }
}

// 跳过提交
const skipSubmit = () => {
  showSubmitDialog.value = false
}

// 重新开始
const restartGame = () => {
  showSubmitDialog.value = false
  submitResult.value = null
  startGame()
}

// 获取排名图标
const getRankIcon = (rank) => {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return rank
}

// 统计更新
const handleStatsUpdate = (newStats) => {
  stats.value = newStats
}

// AI生成通知
const handleAISpawn = (aiName) => {
  showNotification(`⚠️ ${aiName} 加入了游戏！`, 'info')
}

// 组件挂载
onMounted(() => {
  // 设置键盘事件（提前设置，确保在游戏开始前就能响应）
  const handleKeyPress = (e) => {
    if (!gameCanvas || gameState.value !== 'playing') return

    switch (e.code) {
      case 'Space':
        e.preventDefault()
        gameCanvas.playerSplit()
        break
      case 'KeyW':
        e.preventDefault()
        gameCanvas.playerEject()
        break
      case 'Escape':
        e.preventDefault()
        togglePause()
        break
    }
  }

  window.addEventListener('keydown', handleKeyPress)

  // 保存清理函数
  window._ballBattleCleanup = () => {
    window.removeEventListener('keydown', handleKeyPress)
  }
})

// 初始化Canvas引擎
const initGameCanvas = () => {
  if (!canvasRef.value) {
    console.error('[球球大作战] Canvas元素不存在')
    return false
  }

  // 如果已经初始化过，直接返回成功
  if (gameCanvas) {
    console.log('[球球大作战] Canvas已初始化，跳过')
    return true
  }

  // 设置canvas尺寸
  canvasRef.value.width = window.innerWidth
  canvasRef.value.height = window.innerHeight

  gameCanvas = new GameCanvas(canvasRef.value, {
    mapWidth: 3000,
    mapHeight: 3000,
    foodCount: 500,
    virusCount: 10
  })

  // 更新相机尺寸
  gameCanvas.camera.centerX = window.innerWidth / 2
  gameCanvas.camera.centerY = window.innerHeight / 2
  gameCanvas.camera.width = window.innerWidth
  gameCanvas.camera.height = window.innerHeight

  // 设置回调
  gameCanvas.onGameOver = handleGameOver
  gameCanvas.onStatsUpdate = handleStatsUpdate
  gameCanvas.onAISpawn = handleAISpawn

  // 设置鼠标事件
  canvasRef.value.addEventListener('mousemove', (e) => {
    if (gameCanvas) {
      gameCanvas.setMousePosition(e.offsetX, e.offsetY)
    }
  })

  console.log('[球球大作战] Canvas初始化完成')
  return true
}

// 组件卸载
onUnmounted(() => {
  if (gameCanvas) {
    gameCanvas.destroy()
    gameCanvas = null
  }

  if (window._ballBattleCleanup) {
    window._ballBattleCleanup()
    delete window._ballBattleCleanup
  }
})

// 游戏模式选项
const gameModes = [
  { id: 'challenge', name: '挑战模式', icon: '⚔️', desc: '对抗AI，成为最大球球' },
  { id: 'endless', name: '无尽模式', icon: '⏱️', desc: '生存越久越好' },
  { id: 'timed', name: '限时模式', icon: '⏰', desc: '3分钟内获得最高分' }
]

// 难度选项
const difficulties = [
  { id: 'easy', name: '简单', color: '#4caf50' },
  { id: 'normal', name: '普通', color: '#ff9800' },
  { id: 'hard', name: '困难', color: '#f44336' }
]
</script>

<template>
  <div class="ballbattle-view">
    <!-- 通知 -->
    <transition name="slide-up">
      <div v-if="notification.show" class="notification" :class="notification.type">
        <span class="notification-icon">
          {{ notification.type === 'success' ? '✓' : notification.type === 'error' ? '✕' : 'ℹ️' }}
        </span>
        <span class="notification-message">{{ notification.message }}</span>
      </div>
    </transition>

    <!-- 主菜单 -->
    <transition name="fade">
      <div v-if="gameState === 'menu'" class="main-menu">
        <div class="menu-container">
          <div class="game-header">
            <h1 class="game-title">⚽ 球球大作战</h1>
            <p class="game-subtitle">吞噬彩豆和对手，成为地图霸主！</p>
          </div>

          <!-- 游戏模式选择 -->
          <div class="section">
            <h2 class="section-title">🎮 游戏模式</h2>
            <div class="mode-grid">
              <button
                v-for="mode in gameModes"
                :key="mode.id"
                class="mode-card"
                :class="{ active: gameMode === mode.id }"
                @click="gameMode = mode.id"
              >
                <span class="mode-icon">{{ mode.icon }}</span>
                <span class="mode-name">{{ mode.name }}</span>
                <span class="mode-desc">{{ mode.desc }}</span>
              </button>
            </div>
          </div>

          <!-- 难度选择 -->
          <div class="section">
            <h2 class="section-title">🎯 难度</h2>
            <div class="difficulty-buttons">
              <button
                v-for="diff in difficulties"
                :key="diff.id"
                class="diff-btn"
                :class="{ active: difficulty === diff.id }"
                :style="{ '--color': diff.color }"
                @click="difficulty = diff.id"
              >
                {{ diff.name }}
              </button>
            </div>
          </div>

          <!-- 无尽模式选项 -->
          <div v-if="gameMode === 'endless'" class="section endless-options">
            <label class="checkbox-label">
              <input type="checkbox" v-model="endlessWithPlayerAI" />
              <span>启用"玩家AI"功能</span>
            </label>
            <p class="option-desc">从排行榜中抽取真实玩家作为AI敌人</p>
          </div>

          <!-- 操作按钮 -->
          <div class="action-buttons">
            <button class="primary-btn" @click="startGame">
              <span class="btn-icon">▶️</span>
              <span>开始游戏</span>
            </button>
            <button class="secondary-btn" @click="viewLeaderboard">
              <span class="btn-icon">🏆</span>
              <span>排行榜</span>
            </button>
            <button class="secondary-btn" @click="router.push('/')">
              <span class="btn-icon">←</span>
              <span>返回</span>
            </button>
          </div>

          <!-- 操作说明 -->
          <div class="controls-info">
            <h3>🎮 操作说明</h3>
            <div class="controls-grid">
              <div class="control-item">
                <span class="key">鼠标</span>
                <span class="action">移动</span>
              </div>
              <div class="control-item">
                <span class="key">空格</span>
                <span class="action">分身</span>
              </div>
              <div class="control-item">
                <span class="key">W</span>
                <span class="action">吐球</span>
              </div>
              <div class="control-item">
                <span class="key">ESC</span>
                <span class="action">暂停</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- 游戏界面 -->
    <transition name="fade">
      <div v-if="gameState === 'playing' || gameState === 'paused' || gameState === 'ready'" class="game-container">
        <canvas ref="canvasRef" class="game-canvas"></canvas>

        <!-- 准备开始遮罩 -->
        <div v-if="gameState === 'ready'" class="ready-overlay">
          <div class="ready-content">
            <h2>⚽ 准备好了吗？</h2>
            <p>使用鼠标控制移动，空格分身，W吐球</p>
            <button class="start-btn" @click="startPlaying">开始游戏</button>
            <button class="back-btn-small" @click="backToMenu">返回</button>
          </div>
        </div>

        <!-- 暂停遮罩 -->
        <div v-if="gameState === 'paused'" class="pause-overlay">
          <div class="pause-content">
            <h2>⏸️ 游戏暂停</h2>
            <button class="resume-btn" @click="togglePause">继续游戏</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 结算界面 -->
    <transition name="fade">
      <div v-if="gameState === 'gameover'" class="gameover-screen">
        <div class="gameover-content">
          <div class="gameover-header">
            <h1>🎮 游戏结束</h1>
            <p class="gameover-mode">{{ gameModes.find(m => m.id === gameMode)?.name }}</p>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-icon">⭐</span>
              <span class="stat-label">最终质量</span>
              <span class="stat-value">{{ stats.score }}</span>
            </div>
            <div class="stat-card">
              <span class="stat-icon">💀</span>
              <span class="stat-label">击杀数</span>
              <span class="stat-value">{{ stats.kills }}</span>
            </div>
            <div class="stat-card">
              <span class="stat-icon">⏱️</span>
              <span class="stat-label">存活时间</span>
              <span class="stat-value">{{ formatTime(stats.survivalTime) }}</span>
            </div>
            <div class="stat-card">
              <span class="stat-icon">🏆</span>
              <span class="stat-label">最大质量</span>
              <span class="stat-value">{{ stats.maxMass }}</span>
            </div>
          </div>

          <!-- 提交成绩对话框 -->
          <div v-if="showSubmitDialog" class="submit-dialog">
            <div class="submit-header">
              <h3>🏆 提交成绩到排行榜</h3>
            </div>

            <div v-if="!submitResult" class="submit-form">
              <input
                v-model="playerName"
                type="text"
                class="player-name-input"
                placeholder="输入你的昵称"
                maxlength="20"
              />
              <div class="submit-buttons">
                <button class="submit-btn primary" @click="handleSubmitScore">
                  提交成绩
                </button>
                <button class="submit-btn secondary" @click="skipSubmit">
                  跳过
                </button>
              </div>
            </div>

            <div v-else class="submit-result">
              <div class="result-message" :class="{ success: submitResult.success }">
                {{ submitResult.message }}
              </div>
              <div v-if="submitResult.success" class="result-rank">
                你的排名: <span class="rank-number">#{{ submitResult.rank }}</span>
              </div>
            </div>
          </div>

          <div class="gameover-actions">
            <button class="action-btn primary" @click="restartGame">
              <span class="btn-icon">🔄</span>
              <span>再来一局</span>
            </button>
            <button class="action-btn secondary" @click="backToMenu">
              <span class="btn-icon">🏠</span>
              <span>返回菜单</span>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 排行榜界面 -->
    <transition name="fade">
      <div v-if="gameState === 'leaderboard'" class="leaderboard-screen">
        <div class="leaderboard-content">
          <div class="leaderboard-header">
            <h1>🏆 全球排行榜</h1>
            <button class="close-btn" @click="backToMenu">✕</button>
          </div>

          <div class="leaderboard-list">
            <div
              v-for="(entry, index) in leaderboard"
              :key="index"
              class="leaderboard-item"
            >
              <span class="rank">{{ getRankIcon(index + 1) }}</span>
              <span class="player-name">{{ entry.playerName }}</span>
              <span class="score">{{ entry.score }}</span>
              <span class="meta">{{ entry.kills }}击杀</span>
            </div>
          </div>

          <div class="leaderboard-footer">
            <button class="refresh-btn" @click="viewLeaderboard">🔄 刷新</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.ballbattle-view {
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
}

/* 通知 */
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-size: 14px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}

.notification.success {
  border-color: rgba(76, 175, 80, 0.4);
  background: rgba(76, 175, 80, 0.9);
}

.notification.error {
  border-color: rgba(244, 67, 54, 0.4);
  background: rgba(244, 67, 54, 0.9);
}

.notification.info {
  border-color: rgba(33, 150, 243, 0.4);
  background: rgba(33, 150, 243, 0.9);
}

/* 主菜单 */
.main-menu {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
}

.menu-container {
  width: 90%;
  max-width: 800px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.game-header {
  text-align: center;
  margin-bottom: 40px;
}

.game-title {
  font-size: 48px;
  font-weight: 700;
  color: white;
  margin-bottom: 10px;
}

.game-subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
}

.section {
  margin-bottom: 30px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: white;
  margin-bottom: 15px;
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.mode-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-card:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.mode-card.active {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.15);
}

.mode-icon {
  font-size: 32px;
}

.mode-name {
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.mode-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
}

.difficulty-buttons {
  display: flex;
  gap: 10px;
}

.diff-btn {
  flex: 1;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.diff-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.diff-btn.active {
  border-color: var(--color);
  background: var(--color);
}

.endless-options {
  background: rgba(255, 255, 255, 0.05);
  padding: 15px;
  border-radius: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: white;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.option-desc {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-left: 28px;
}

.action-buttons {
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
}

.primary-btn,
.secondary-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 15px 30px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.primary-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.primary-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.secondary-btn {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.secondary-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.controls-info {
  background: rgba(255, 255, 255, 0.05);
  padding: 20px;
  border-radius: 12px;
}

.controls-info h3 {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 15px;
}

.controls-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.key {
  display: inline-block;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  color: rgba(255, 255, 255, 0.8);
}

.action {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

/* 游戏界面 */
.game-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.game-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.pause-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(5px);
}

.pause-content {
  text-align: center;
  color: white;
}

.pause-content h2 {
  font-size: 48px;
  margin-bottom: 30px;
}

.resume-btn {
  padding: 15px 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.resume-btn:hover {
  transform: scale(1.05);
}

/* 准备开始界面 */
.ready-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(5px);
}

.ready-content {
  text-align: center;
  color: white;
}

.ready-content h2 {
  font-size: 42px;
  margin-bottom: 20px;
}

.ready-content p {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 30px;
}

.start-btn {
  padding: 15px 50px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-right: 15px;
}

.start-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.back-btn-small {
  padding: 15px 30px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  color: white;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn-small:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: scale(1.05);
}

/* 结算界面 */
.gameover-screen {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
}

.gameover-content {
  width: 90%;
  max-width: 600px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.gameover-header {
  text-align: center;
  margin-bottom: 30px;
}

.gameover-header h1 {
  font-size: 36px;
  color: white;
  margin-bottom: 10px;
}

.gameover-mode {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 30px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

.stat-icon {
  font-size: 32px;
}

.stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: white;
}

.submit-dialog {
  background: rgba(255, 255, 255, 0.05);
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.submit-header h3 {
  font-size: 16px;
  color: white;
  margin-bottom: 15px;
}

.player-name-input {
  width: 100%;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-size: 14px;
  margin-bottom: 15px;
}

.player-name-input:focus {
  outline: none;
  border-color: #667eea;
}

.submit-buttons {
  display: flex;
  gap: 10px;
}

.submit-btn {
  flex: 1;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.submit-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.submit-btn.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.submit-result {
  text-align: center;
  padding: 10px;
}

.result-message {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 10px;
}

.result-message.success {
  color: #4caf50;
}

.result-rank {
  font-size: 16px;
  color: white;
}

.rank-number {
  font-size: 24px;
  font-weight: 700;
  color: #FFD700;
}

.gameover-actions {
  display: flex;
  gap: 15px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 15px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.action-btn.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

/* 排行榜 */
.leaderboard-screen {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.leaderboard-content {
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.leaderboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 30px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.leaderboard-header h1 {
  font-size: 24px;
  color: white;
}

.close-btn {
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.leaderboard-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.leaderboard-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px 15px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  margin-bottom: 8px;
}

.leaderboard-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.rank {
  font-size: 20px;
  width: 40px;
  text-align: center;
}

.player-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: white;
}

.score {
  font-size: 16px;
  font-weight: 600;
  color: #667eea;
}

.meta {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.leaderboard-footer {
  padding: 15px 30px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.refresh-btn {
  width: 100%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

/* 滚动条 */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}
</style>
