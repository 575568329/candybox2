/**
 * 俄罗斯方块核心游戏逻辑
 */
import { ref, computed } from 'vue'

// 游戏配置
export const BOARD_WIDTH = 10
export const BOARD_HEIGHT = 20
export const BLOCK_SIZE = 22

// 方块形状定义
export const TETROMINOES = {
  I: { shape: [[1, 1, 1, 1]], color: '#00f5ff' },
  O: { shape: [[1, 1], [1, 1]], color: '#ffff00' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#a855f7' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#22c55e' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#ef4444' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#3b82f6' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#f97316' }
}

export function useTetrisGame() {
  // 游戏状态
  const board = ref([])
  const currentPiece = ref(null)
  const nextPiece = ref(null)
  const score = ref(0)
  const level = ref(1)
  const lines = ref(0)
  const gameOver = ref(false)
  const isPaused = ref(false)
  const isPlaying = ref(false)
  const clearingLines = ref([])
  const isLocking = ref(false)
  
  // 游戏循环相关
  let gameLoopId = null
  let lastTime = 0
  let dropInterval = 1000

  // 初始化游戏板
  const initBoard = () => {
    board.value = Array(BOARD_HEIGHT).fill(null).map(() =>
      Array(BOARD_WIDTH).fill(0)
    )
  }

  // 创建新方块
  const createPiece = (type) => {
    const tetromino = TETROMINOES[type]
    return {
      type,
      shape: tetromino.shape.map(row => [...row]),
      color: tetromino.color,
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(tetromino.shape[0].length / 2),
      y: 0
    }
  }

  // 随机生成方块
  const randomPiece = () => {
    const types = Object.keys(TETROMINOES)
    const type = types[Math.floor(Math.random() * types.length)]
    return createPiece(type)
  }

  // 旋转方块
  const rotatePiece = (piece) => {
    const rotated = piece.shape[0].map((_, i) =>
      piece.shape.map(row => row[i]).reverse()
    )
    return { ...piece, shape: rotated }
  }

  // 检测碰撞
  const checkCollision = (piece, offsetX = 0, offsetY = 0) => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = piece.x + x + offsetX
          const newY = piece.y + y + offsetY
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return true
          }
          if (newY >= 0 && board.value[newY] && board.value[newY][newX]) {
            return true
          }
        }
      }
    }
    return false
  }

  // 锁定方块到游戏板
  const lockPiece = async () => {
    if (isLocking.value) return
    isLocking.value = true

    for (let y = 0; y < currentPiece.value.shape.length; y++) {
      for (let x = 0; x < currentPiece.value.shape[y].length; x++) {
        if (currentPiece.value.shape[y][x]) {
          const boardY = currentPiece.value.y + y
          const boardX = currentPiece.value.x + x
          if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
            board.value[boardY][boardX] = currentPiece.value.color
          }
        }
      }
    }

    await clearLines()
    spawnPiece()
    isLocking.value = false
  }

  // 清除完整的行
  const clearLines = async () => {
    const linesToRemove = []
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      if (board.value[y] && board.value[y].length === BOARD_WIDTH) {
        if (board.value[y].every(cell => cell !== 0)) {
          linesToRemove.push(y)
        }
      }
    }

    if (linesToRemove.length === 0) return

    clearingLines.value = linesToRemove
    await new Promise(resolve => setTimeout(resolve, 300))

    const sortedLines = [...linesToRemove].sort((a, b) => b - a)
    for (const y of sortedLines) {
      board.value.splice(y, 1)
    }

    const linesCleared = linesToRemove.length
    for (let i = 0; i < linesCleared; i++) {
      board.value.unshift(Array(BOARD_WIDTH).fill(0))
    }

    clearingLines.value = []

    const points = [0, 100, 300, 500, 800]
    score.value += points[linesCleared] * level.value
    lines.value += linesCleared

    const newLevel = Math.floor(lines.value / 10) + 1
    if (newLevel > level.value) {
      level.value = newLevel
      dropInterval = Math.max(100, 1000 - (level.value - 1) * 100)
    }
  }

  // 生成新方块
  const spawnPiece = () => {
    currentPiece.value = nextPiece.value || randomPiece()
    nextPiece.value = randomPiece()
    if (checkCollision(currentPiece.value)) {
      endGame()
    }
  }

  // 移动方块
  const movePiece = async (direction) => {
    if (!currentPiece.value || gameOver.value || isPaused.value || isLocking.value) return

    let newX = currentPiece.value.x
    let newY = currentPiece.value.y

    switch (direction) {
      case 'left': newX--; break
      case 'right': newX++; break
      case 'down': newY++; break
    }

    if (!checkCollision(currentPiece.value, newX - currentPiece.value.x, newY - currentPiece.value.y)) {
      currentPiece.value.x = newX
      currentPiece.value.y = newY
    } else if (direction === 'down') {
      await lockPiece()
    }
  }

  // 旋转当前方块
  const rotate = () => {
    if (!currentPiece.value || gameOver.value || isPaused.value || isLocking.value) return

    const rotated = rotatePiece(currentPiece.value)
    const kicks = [
      { x: 0, y: 0 }, { x: -1, y: 0 }, { x: 1, y: 0 },
      { x: 0, y: -1 }, { x: -2, y: 0 }, { x: 2, y: 0 },
      { x: -1, y: -1 }, { x: 1, y: -1 }
    ]

    for (const kick of kicks) {
      if (!checkCollision({ ...rotated, x: rotated.x + kick.x, y: rotated.y + kick.y })) {
        currentPiece.value.shape = rotated.shape
        currentPiece.value.x += kick.x
        currentPiece.value.y += kick.y
        return
      }
    }
  }

  // 缓降
  const softDrop = async () => {
    if (!currentPiece.value || gameOver.value || isPaused.value || isLocking.value) return
    if (!checkCollision(currentPiece.value, 0, 1)) {
      currentPiece.value.y++
      score.value += 1
      lastTime = performance.now()
    } else {
      await lockPiece()
    }
  }

  // 硬降
  const hardDrop = async () => {
    if (!currentPiece.value || gameOver.value || isPaused.value || isLocking.value) return
    while (!checkCollision(currentPiece.value, 0, 1)) {
      currentPiece.value.y++
      score.value += 2
    }
    await lockPiece()
  }

  // 渲染游戏板
  const renderBoard = computed(() => {
    const display = board.value.map(row => [...row])
    if (currentPiece.value) {
      for (let y = 0; y < currentPiece.value.shape.length; y++) {
        for (let x = 0; x < currentPiece.value.shape[y].length; x++) {
          if (currentPiece.value.shape[y][x]) {
            const boardY = currentPiece.value.y + y
            const boardX = currentPiece.value.x + x
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              display[boardY][boardX] = currentPiece.value.color
            }
          }
        }
      }
    }
    return display
  })

  // 结束游戏回调（由外部设置）
  let onEndGame = null
  const setEndGameCallback = (callback) => {
    onEndGame = callback
  }

  // 结束游戏
  const endGame = () => {
    gameOver.value = true
    isPlaying.value = false
    if (gameLoopId) {
      cancelAnimationFrame(gameLoopId)
      gameLoopId = null
    }
    if (onEndGame) {
      onEndGame()
    }
  }

  // 开始游戏
  const startGame = () => {
    initBoard()
    score.value = 0
    level.value = 1
    lines.value = 0
    gameOver.value = false
    isPaused.value = false
    isPlaying.value = true
    dropInterval = 1000
    spawnPiece()
    lastTime = performance.now()
    gameLoopId = requestAnimationFrame(gameLoop)
  }

  // 重新开始
  const restartGame = () => {
    startGame()
  }

  // 暂停/继续
  const togglePause = () => {
    if (!isPlaying.value || gameOver.value) return
    if (isPaused.value) {
      isPaused.value = false
      if (!gameLoopId) {
        lastTime = performance.now()
        gameLoopId = requestAnimationFrame(gameLoop)
      }
    } else {
      isPaused.value = true
    }
  }

  // 游戏循环
  const gameLoop = (currentTime) => {
    if (!isPlaying.value || isPaused.value || gameOver.value) {
      lastTime = currentTime
      gameLoopId = null  // 停止循环，节省资源
      return
    }

    const deltaTime = currentTime - lastTime
    if (deltaTime > dropInterval) {
      movePiece('down')
      lastTime = currentTime
    }

    gameLoopId = requestAnimationFrame(gameLoop)
  }

  // 停止游戏循环
  const stopGameLoop = () => {
    if (gameLoopId) {
      cancelAnimationFrame(gameLoopId)
      gameLoopId = null
    }
  }

  // 启动游戏循环
  const startGameLoop = () => {
    lastTime = performance.now()
    gameLoopId = requestAnimationFrame(gameLoop)
  }

  return {
    // 状态
    board,
    currentPiece,
    nextPiece,
    score,
    level,
    lines,
    gameOver,
    isPaused,
    isPlaying,
    clearingLines,
    isLocking,
    dropInterval,
    
    // 方法
    initBoard,
    createPiece,
    randomPiece,
    checkCollision,
    lockPiece,
    clearLines,
    spawnPiece,
    movePiece,
    rotate,
    softDrop,
    hardDrop,
    startGame,
    restartGame,
    endGame,
    togglePause,
    renderBoard,
    stopGameLoop,
    startGameLoop,
    setEndGameCallback
  }
}
