<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTetrisGame, BOARD_WIDTH, BOARD_HEIGHT, BLOCK_SIZE } from '../composables/useTetrisGame.js'
import { useTetrisKeyboard } from '../composables/useTetrisKeyboard.js'
import { useTetrisRanking } from '../composables/useTetrisRanking.js'
import { useTetrisSave } from '../composables/useTetrisSave.js'
import { analyticsTracker } from '../utils/analyticsTracker.js'

const router = useRouter()

// 使用 composables
const game = useTetrisGame()
const ranking = useTetrisRanking()
const save = useTetrisSave()

// 额外状态
const focusMode = ref(false)
const showUploadPrompt = ref(false)
const userInfo = ref(null)
const toast = ref({ show: false, message: '', type: 'info' })
let toastTimer = null

// Toast 提示
const showToast = (message, type = 'info', duration = 3000) => {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { show: true, message, type }
  if (duration > 0) {
    toastTimer = setTimeout(() => { toast.value.show = false }, duration)
  }
}

// 键盘控制
const keyboard = useTetrisKeyboard({
  onMove: (dir) => game.movePiece(dir),
  onRotate: () => game.rotate(),
  onSoftDrop: () => game.softDrop(),
  onHardDrop: () => game.hardDrop(),
  onPause: () => game.togglePause(),
  onStart: () => handleStart(),
  onRestart: () => game.restartGame(),
  onToggleFocusMode: () => { focusMode.value = !focusMode.value },
  onRefreshRanking: () => handleRefreshRanking(),
  isPlaying: game.isPlaying,
  gameOver: game.gameOver,
  isPaused: game.isPaused
})

// 返回游戏列表
const goBack = async () => {
  if (game.isPlaying.value && !game.gameOver.value) {
    await save.saveGame({
      board: game.board.value,
      score: game.score.value,
      level: game.level.value,
      lines: game.lines.value,
      currentPiece: game.currentPiece.value,
      nextPiece: game.nextPiece.value
    })
  }
  analyticsTracker.endGameSession()
  router.push('/')
}

// 开始游戏
const handleStart = () => {
  if (save.autoLoaded.value) {
    // 有存档，直接继续
    game.isPlaying.value = true
    game.isPaused.value = false
    game.startGameLoop()
    save.autoLoaded.value = false
  } else {
    game.startGame()
  }
}

// 刷新排行榜
const handleRefreshRanking = async () => {
  const result = await ranking.loadRanking()
  if (result.success) {
    showToast('排行榜已刷新')
  } else if (result.message) {
    showToast(result.message, 'warning')
  }
}

// 上传分数
const handleUpload = async () => {
  const result = await ranking.uploadScore(game.score.value, game.level.value, game.lines.value)
  if (result.success) {
    showToast(`上传成功！排名: 第 ${result.rank} 名`, 'success')
    showUploadPrompt.value = false
    await ranking.loadRanking(true)
  } else {
    showToast(result.message, 'error')
  }
}

// 游戏结束回调
game.setEndGameCallback(async () => {
  await save.saveHighScore(game.score.value, game.level.value, game.lines.value)
  await save.clearSave()
  await ranking.loadRanking(true)
  showUploadPrompt.value = true
})

// 生命周期
onMounted(async () => {
  analyticsTracker.startGameSession({ id: 'tetris', name: '俄罗斯方块' })
  
  userInfo.value = ranking.getUserInfo()
  game.initBoard()
  
  await keyboard.loadSwapKeysSetting({ getGameSavePrefix: (id) => `game_save_${id}_` })
  
  const savedGame = await save.loadGame()
  if (savedGame) {
    game.board.value = savedGame.board
    game.score.value = savedGame.score
    game.level.value = savedGame.level
    game.lines.value = savedGame.lines
    game.currentPiece.value = savedGame.currentPiece || game.randomPiece()
    game.nextPiece.value = savedGame.nextPiece || game.randomPiece()
    game.isPlaying.value = true
    game.isPaused.value = true
    save.autoLoaded.value = true
    setTimeout(() => { save.autoLoaded.value = false }, 3000)
  }
  
  await ranking.loadRanking()
  ranking.updateCurrentUserRanking(userInfo.value)
})

onUnmounted(async () => {
  game.stopGameLoop()
  if (game.isPlaying.value && !game.gameOver.value) {
    await save.saveGame({
      board: game.board.value,
      score: game.score.value,
      level: game.level.value,
      lines: game.lines.value,
      currentPiece: game.currentPiece.value,
      nextPiece: game.nextPiece.value
    })
  }
})
</script>

<template>
  <div class="tetris-container" :class="{ 'focus-mode': focusMode }">
    <!-- 返回按钮 -->
    <button class="back-btn" @click="goBack">
      <span>←</span><span>返回</span>
    </button>

    <!-- 游戏区域 -->
    <div class="game-area">
      <!-- 专注模式退出按钮 -->
      <div v-if="focusMode" class="focus-mode-toggle" @click="focusMode = false">
        退出专注 (Ctrl+F)
      </div>

      <div class="game-content">
        <!-- Toast -->
        <transition name="toast-fade">
          <div v-if="toast.show" class="toast" :class="toast.type">
            {{ toast.message }}
          </div>
        </transition>

        <!-- 自动加载提示 -->
        <div v-if="save.autoLoaded.value" class="auto-load-toast">
          ✅ 已加载存档，按 Enter 开始
        </div>

        <!-- 左侧面板 -->
        <div v-if="!focusMode" class="info-panel">
          <div class="info-box">
            <h3>下一个</h3>
            <div v-if="game.nextPiece.value" class="next-piece">
              <div v-for="(row, y) in game.nextPiece.value.shape" :key="y" class="next-row">
                <div
                  v-for="(cell, x) in row" :key="x"
                  class="next-cell"
                  :style="{ backgroundColor: cell ? game.nextPiece.value.color : 'transparent' }"
                />
              </div>
            </div>
          </div>

          <div class="info-box">
            <h3>分数</h3>
            <p class="value">{{ game.score.value.toLocaleString() }}</p>
          </div>

          <div class="info-box">
            <h3>等级</h3>
            <p class="value level">{{ game.level.value }}</p>
          </div>

          <div class="info-box">
            <h3>行数</h3>
            <p class="value lines">{{ game.lines.value }}</p>
          </div>

          <div class="info-box controls">
            <h3>操作</h3>
            <div class="control-item">Enter 开始/暂停</div>
            <div class="control-item">← → / A D 移动</div>
            <div class="control-item">↑ / W 旋转</div>
            <div class="control-item">↓ / S {{ keyboard.swapDropKeys.value ? '硬降' : '缓降' }}</div>
            <div class="control-item">空格 {{ keyboard.swapDropKeys.value ? '缓降' : '硬降' }}</div>
            <div class="control-item">Ctrl+F 专注模式</div>
          </div>
        </div>

        <!-- 游戏板 -->
        <div class="board-container">
          <div class="game-board" :class="{ paused: game.isPaused.value, 'game-over': game.gameOver.value }">
            <!-- 开始提示 -->
            <div v-if="!game.isPlaying.value && !game.gameOver.value" class="overlay" @click="handleStart">
              <p>{{ save.autoLoaded.value ? '已加载存档 - ' : '' }}按 Enter 或点击开始</p>
            </div>
            
            <!-- 暂停提示 -->
            <div v-if="game.isPaused.value && game.isPlaying.value" class="overlay" @click="game.togglePause">
              <p>已暂停 (按 Enter 继续)</p>
            </div>
            
            <!-- 游戏结束 -->
            <div v-if="game.gameOver.value" class="overlay game-over" @click="game.restartGame">
              <p class="game-over-text">游戏结束</p>
              <p class="final-score">分数: {{ game.score.value.toLocaleString() }}</p>
              <p class="restart-hint">按 Enter 重新开始</p>
            </div>

            <!-- 游戏板网格 -->
            <div class="board-grid">
              <div
                v-for="(row, y) in game.renderBoard.value"
                :key="y"
                class="board-row"
                :class="{ clearing: game.clearingLines.value.includes(y) }"
              >
                <div
                  v-for="(cell, x) in row" :key="x"
                  class="board-cell"
                  :class="{ filled: cell }"
                  :style="{
                    backgroundColor: cell || 'transparent',
                    width: BLOCK_SIZE + 'px',
                    height: BLOCK_SIZE + 'px'
                  }"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧面板 -->
        <div v-if="!focusMode" class="user-panel">
          <div class="info-box">
            <h3>玩家</h3>
            <p class="user-name">{{ userInfo?.nickname || '未知' }}</p>
          </div>

          <div class="info-box">
            <h3>当前排名</h3>
            <p class="rank">{{ ranking.getRankDisplay(game.score.value) }}</p>
          </div>

          <div class="info-box ranking">
            <h3>🏆 排行榜 (TOP {{ ranking.DISPLAY_RANKING }})</h3>
            <div v-if="ranking.loadingRanking.value" class="loading">加载中...</div>
            <div v-else-if="ranking.rankingError.value" class="error">加载失败</div>
            <div v-else class="ranking-list">
              <div
                v-for="(item, index) in ranking.rankingData.value.slice(0, ranking.DISPLAY_RANKING)"
                :key="index"
                class="ranking-item"
                :class="{ 'is-me': item.nickname === userInfo?.nickname }"
              >
                <span class="rank-num">
                  <span v-if="index === 0">🥇</span>
                  <span v-else-if="index === 1">🥈</span>
                  <span v-else-if="index === 2">🥉</span>
                  <span v-else>{{ index + 1 }}</span>
                </span>
                <span class="name">{{ item.nickname }}</span>
                <span class="score">{{ item.score.toLocaleString() }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 上传分数弹窗 -->
        <div v-if="showUploadPrompt" class="upload-overlay">
          <div class="upload-panel">
            <h3>🎉 游戏结束!</h3>
            <p class="score-info">分数: {{ game.score.value.toLocaleString() }}</p>
            <p class="rank-info">{{ ranking.getRankDisplay(game.score.value) }}</p>
            <p>是否上传到排行榜?</p>
            <div class="actions">
              <button class="btn confirm" @click="handleUpload">✓ 上传</button>
              <button class="btn cancel" @click="showUploadPrompt = false">✕ 取消</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tetris-container {
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  flex-direction: column;
  color: white;
  overflow: hidden;
}

.back-btn {
  position: fixed;
  top: 10px;
  left: 10px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 5px;
  color: white;
  font-size: 11px;
  cursor: pointer;
  z-index: 1000;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.game-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 48px 8px 8px 8px;
}

.game-content {
  display: grid;
  grid-template-columns: minmax(0, 32%) 1fr minmax(0, 32%);
  gap: 8px;
  align-items: flex-start;
  flex: 1;
  padding: 0 8px;
}

/* Toast */
.toast {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 13px;
  z-index: 150;
  white-space: pre-line;
  grid-column: 1 / -1;
}

.toast.info { background: #667eea; }
.toast.success { background: #22c55e; }
.toast.error { background: #ef4444; }
.toast.warning { background: #f59e0b; }

.toast-fade-enter-active, .toast-fade-leave-active { transition: all 0.3s; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(-20px); }

.auto-load-toast {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: #22c55e;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 12px;
  z-index: 100;
  grid-column: 1 / -1;
}

/* 信息面板 */
.info-panel, .user-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 180px;
}

.info-panel { grid-column: 1; justify-self: end; }
.user-panel { grid-column: 3; justify-self: start; }

.info-box {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 8px 10px;
}

.info-box h3 {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 3px;
  text-transform: uppercase;
}

.value {
  font-size: 16px;
  font-weight: 700;
  color: #ffd93d;
}

.value.level { color: #22c55e; }
.value.lines { color: #0ea5e9; }

.user-name { font-size: 14px; font-weight: 600; }
.rank { font-size: 14px; font-weight: 600; color: #22c55e; }

/* 下一个方块 */
.next-piece {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  padding: 4px;
}

.next-row { display: flex; gap: 1px; }
.next-cell { width: 16px; height: 16px; border-radius: 2px; }

/* 操作说明 */
.controls { font-size: 10px; }
.control-item { padding: 2px 0; color: rgba(255, 255, 255, 0.8); border-bottom: 1px solid rgba(255, 255, 255, 0.05); }

/* 游戏板 */
.board-container { grid-column: 2; justify-self: center; }

.game-board {
  position: relative;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 2px;
}

.board-grid { display: flex; flex-direction: column; gap: 1px; }
.board-row { display: flex; gap: 1px; }
.board-cell { background: rgba(255, 255, 255, 0.03); border-radius: 2px; }
.board-cell.filled { box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4); }

.board-row.clearing { animation: clearLine 0.3s ease-out forwards; }
@keyframes clearLine {
  0% { transform: scaleY(1); opacity: 1; }
  100% { transform: scaleY(0); opacity: 0; }
}

/* 覆盖层 */
.overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  z-index: 10;
  font-size: 14px;
  font-weight: 600;
}

.overlay.game-over { background: rgba(0, 0, 0, 0.9); }
.game-over-text { font-size: 24px; color: #ef4444; margin-bottom: 8px; }
.final-score { font-size: 18px; color: #ffd93d; }
.restart-hint { font-size: 14px; color: rgba(255, 255, 255, 0.7); margin-top: 12px; animation: pulse 1.5s infinite; }
@keyframes pulse { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }

/* 排行榜 */
.ranking { max-height: 200px; overflow: hidden; }
.ranking-list { overflow-y: auto; max-height: 150px; }
.ranking-item {
  display: grid;
  grid-template-columns: 24px 1fr 50px;
  gap: 4px;
  padding: 4px 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  font-size: 9px;
  margin-bottom: 3px;
}
.ranking-item.is-me { background: rgba(102, 126, 234, 0.2); font-weight: 600; }
.rank-num { font-weight: 600; text-align: center; }
.name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.score { font-weight: 600; color: #ffd93d; text-align: right; }

/* 上传弹窗 */
.upload-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.upload-panel {
  background: linear-gradient(135deg, #1e1e32 0%, #1a1a2e 100%);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 24px;
  max-width: 320px;
  text-align: center;
}

.upload-panel h3 { margin: 0 0 16px; font-size: 18px; }
.score-info { font-size: 20px; font-weight: 700; color: #ffd93d; margin-bottom: 8px; }
.rank-info { font-size: 14px; color: rgba(255, 255, 255, 0.8); margin-bottom: 12px; }

.actions { display: flex; gap: 12px; justify-content: center; margin-top: 20px; }
.btn { padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; min-width: 100px; }
.btn.confirm { background: #22c55e; border: none; color: white; }
.btn.cancel { background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: rgba(255, 255, 255, 0.7); }

/* 专注模式 */
.focus-mode-toggle {
  position: fixed;
  top: 10px;
  left: 110px;
  background: rgba(102, 126, 234, 0.9);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  z-index: 1000;
}

.focus-mode .game-content { justify-content: center; align-items: center; }
.focus-mode .info-panel, .focus-mode .user-panel { display: none; }
</style>
