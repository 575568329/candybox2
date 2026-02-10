<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { saveManager } from '../utils/saveManager.js'

const router = useRouter()

// 游戏配置
const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const BLOCK_SIZE = 22 // 增大方块尺寸以获得更好的游戏体验

// 方块形状定义 (使用 0/1 矩阵)
const TETROMINOES = {
  I: {
    shape: [[1, 1, 1, 1]],
    color: '#00f5ff'
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: '#ffff00'
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1]
    ],
    color: '#a855f7'
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0]
    ],
    color: '#22c55e'
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1]
    ],
    color: '#ef4444'
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1]
    ],
    color: '#3b82f6'
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1]
    ],
    color: '#f97316'
  }
}

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
const autoLoaded = ref(false) // 标记是否自动加载了存档
const hasWindowFocus = ref(true) // 窗口是否有焦点
const focusMode = ref(false) // 专注模式
const clearingLines = ref([]) // 正在消除的行索引列表
const isLocking = ref(false) // 是否正在锁定方块

// 按键配置
const swapDropKeys = ref(false) // 是否互换软降和硬降按键

// 按键状态跟踪（用于长按支持）
const keysPressed = ref({
  ArrowLeft: false,
  ArrowRight: false,
  ArrowDown: false,
  KeyA: false,
  KeyD: false,
  KeyS: false
})
const lastMoveTime = ref({
  ArrowLeft: 0,
  ArrowRight: 0,
  ArrowDown: 0,
  KeyA: 0,
  KeyD: 0,
  KeyS: 0
})
const MOVE_INTERVAL = 150 // 移动间隔（毫秒）

// 返回游戏列表（先保存游戏）
const goBack = async () => {
  // 强制保存当前游戏状态（即使暂停中也要保存）
  await autoSaveGame(true)
  // 返回游戏列表
  router.push('/')
}

// 排行榜数据
const rankingData = ref([])
const loadingRanking = ref(false)
const rankingError = ref('')
const currentUserRanking = ref(null)
const showUploadPrompt = ref(false) // 是否显示上传分数提示
const lastRankingRefreshTime = ref(0) // 上次刷新排行榜的时间
const RANKING_REFRESH_COOLDOWN = 60000 // 排行榜刷新冷却时间：1分钟（毫秒）

// Toast 提示
const toast = ref({
  show: false,
  message: '',
  type: 'info', // 'info', 'success', 'error', 'warning'
  duration: 3000
})
let toastTimer = null

// uTools 用户信息
const userInfo = ref(null)

// 显示 Toast 提示
const showToast = (message, type = 'info', duration = 3000) => {
  // 清除之前的定时器
  if (toastTimer) {
    clearTimeout(toastTimer)
  }

  // 设置新的提示
  toast.value = {
    show: true,
    message,
    type,
    duration
  }

  // 自动隐藏
  if (duration > 0) {
    toastTimer = setTimeout(() => {
      toast.value.show = false
    }, duration)
  }
}

// 获取 Toast 图标
const getToastIcon = (type) => {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  }
  return icons[type] || icons.info
}

// 游戏循环
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
  return {
    ...piece,
    shape: rotated
  }
}

// 检测碰撞
const checkCollision = (piece, offsetX = 0, offsetY = 0) => {
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x]) {
        const newX = piece.x + x + offsetX
        const newY = piece.y + y + offsetY

        // 检查是否超出边界
        if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
          return true
        }

        // 只有当方块在游戏板内时才检查与已有方块的碰撞
        // 当 newY >= 0 时，方块已经进入游戏板，需要检查碰撞
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
  // 防止重复锁定
  if (isLocking.value) return
  isLocking.value = true

  // 将方块锁定到游戏板
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

  // 等待消除行完成
  await clearLines()

  // 生成新方块
  spawnPiece()

  // 解除锁定状态
  isLocking.value = false
}

// 清除完整的行
const clearLines = async () => {
  // 首先找出所有要消除的行
  const linesToRemove = []
  for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
    // 防御性检查：确保行存在且长度正确
    if (board.value[y] && board.value[y].length === BOARD_WIDTH) {
      if (board.value[y].every(cell => cell !== 0)) {
        linesToRemove.push(y)
      }
    }
  }

  if (linesToRemove.length === 0) return

  // 标记这些行为正在消除（添加动画效果）
  clearingLines.value = linesToRemove

  // 等待动画完成
  await new Promise(resolve => setTimeout(resolve, 300))

  // 实际消除行 - 一次性删除所有满行，避免索引混乱
  // 按从大到小的顺序删除（从底部开始）
  const sortedLines = [...linesToRemove].sort((a, b) => b - a)
  for (const y of sortedLines) {
    board.value.splice(y, 1)
  }

  // 在顶部一次性添加对应数量的空行
  const linesCleared = linesToRemove.length
  for (let i = 0; i < linesCleared; i++) {
    board.value.unshift(Array(BOARD_WIDTH).fill(0))
  }

  // 清除动画状态
  clearingLines.value = []

  // 计分系统
  const points = [0, 100, 300, 500, 800]
  score.value += points[linesCleared] * level.value
  lines.value += linesCleared

  // 每消除10行升一级
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

  // 检查游戏结束
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
    case 'left':
      newX--
      break
    case 'right':
      newX++
      break
    case 'down':
      newY++
      break
  }

  // 检测是否会发生碰撞
  if (!checkCollision(currentPiece.value, newX - currentPiece.value.x, newY - currentPiece.value.y)) {
    currentPiece.value.x = newX
    currentPiece.value.y = newY
  } else if (direction === 'down') {
    // 如果向下移动时发生碰撞，锁定方块
    await lockPiece()
  }
}

// 旋转当前方块
const rotate = () => {
  if (!currentPiece.value || gameOver.value || isPaused.value || isLocking.value) return

  const rotated = rotatePiece(currentPiece.value)

  // 墙踢测试 - 包括水平和垂直方向的踢
  const kicks = [
    { x: 0, y: 0 },      // 原地旋转
    { x: -1, y: 0 },     // 向左踢
    { x: 1, y: 0 },      // 向右踢
    { x: 0, y: -1 },     // 向上踢（用于底部边界）
    { x: -2, y: 0 },     // 向左踢两格
    { x: 2, y: 0 },      // 向右踢两格
    { x: -1, y: -1 },    // 左上踢
    { x: 1, y: -1 }      // 右上踢
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

// 缓降（软降）
const softDrop = async () => {
  if (!currentPiece.value || gameOver.value || isPaused.value || isLocking.value) return

  // 尝试向下移动一格
  if (!checkCollision(currentPiece.value, 0, 1)) {
    currentPiece.value.y++
    score.value += 1 // 缓降每格得1分
    lastTime = performance.now() // 重置下落计时器
  } else {
    // 如果不能移动，锁定方块
    await lockPiece()
  }
}

// 硬降
const hardDrop = async () => {
  if (!currentPiece.value || gameOver.value || isPaused.value || isLocking.value) return

  while (!checkCollision(currentPiece.value, 0, 1)) {
    currentPiece.value.y++
    score.value += 2 // 硬降额外得分
  }

  await lockPiece()
}

// 游戏主循环
const gameLoop = (currentTime) => {
  if (!isPlaying.value || isPaused.value || gameOver.value) {
    lastTime = currentTime
    gameLoopId = requestAnimationFrame(gameLoop)
    return
  }

  const deltaTime = currentTime - lastTime

  // 自动下落
  if (deltaTime > dropInterval) {
    movePiece('down')
    lastTime = currentTime
  }

  // 处理方向键移动（统一在游戏循环中处理，避免重复触发）
  // 左移（ArrowLeft 和 A 键）
  if (keysPressed.value.ArrowLeft || keysPressed.value.KeyA) {
    const leftKey = keysPressed.value.ArrowLeft ? 'ArrowLeft' : 'KeyA'
    const timeSinceLastMove = currentTime - lastMoveTime.value[leftKey]
    if (lastMoveTime.value[leftKey] === 0 || timeSinceLastMove > MOVE_INTERVAL) {
      movePiece('left')
      lastMoveTime.value[leftKey] = currentTime
    }
  }

  // 右移（ArrowRight 和 D 键）
  if (keysPressed.value.ArrowRight || keysPressed.value.KeyD) {
    const rightKey = keysPressed.value.ArrowRight ? 'ArrowRight' : 'KeyD'
    const timeSinceLastMove = currentTime - lastMoveTime.value[rightKey]
    if (lastMoveTime.value[rightKey] === 0 || timeSinceLastMove > MOVE_INTERVAL) {
      movePiece('right')
      lastMoveTime.value[rightKey] = currentTime
    }
  }

  // 缓降（ArrowDown 和 S 键）
  if ((keysPressed.value.ArrowDown || keysPressed.value.KeyS) && !swapDropKeys.value) {
    const downKey = keysPressed.value.ArrowDown ? 'ArrowDown' : 'KeyS'
    // 只有当 ArrowDown/KeyS 是缓降键时才支持长按
    const timeSinceLastMove = currentTime - lastMoveTime.value[downKey]
    if (lastMoveTime.value[downKey] === 0 || timeSinceLastMove > MOVE_INTERVAL) {
      softDrop()
      lastMoveTime.value[downKey] = currentTime
    }
  }

  gameLoopId = requestAnimationFrame(gameLoop)
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

  // 重置按键状态，防止重启后自动移动
  keysPressed.value.ArrowLeft = false
  keysPressed.value.ArrowRight = false
  keysPressed.value.ArrowDown = false
  keysPressed.value.KeyA = false
  keysPressed.value.KeyD = false
  keysPressed.value.KeyS = false
  lastMoveTime.value.ArrowLeft = 0
  lastMoveTime.value.ArrowRight = 0
  lastMoveTime.value.ArrowDown = 0
  lastMoveTime.value.KeyA = 0
  lastMoveTime.value.KeyD = 0
  lastMoveTime.value.KeyS = 0

  spawnPiece()
  lastTime = performance.now()
  gameLoopId = requestAnimationFrame(gameLoop)
}

// 重新开始游戏
const restartGame = () => {
  initBoard()
  score.value = 0
  level.value = 1
  lines.value = 0
  gameOver.value = false
  isPaused.value = false
  isPlaying.value = true
  dropInterval = 1000

  // 重置按键状态，防止重启后自动移动
  keysPressed.value.ArrowLeft = false
  keysPressed.value.ArrowRight = false
  keysPressed.value.ArrowDown = false
  keysPressed.value.KeyA = false
  keysPressed.value.KeyD = false
  keysPressed.value.KeyS = false
  lastMoveTime.value.ArrowLeft = 0
  lastMoveTime.value.ArrowRight = 0
  lastMoveTime.value.ArrowDown = 0
  lastMoveTime.value.KeyA = 0
  lastMoveTime.value.KeyD = 0
  lastMoveTime.value.KeyS = 0

  spawnPiece()
  lastTime = performance.now()
  gameLoopId = requestAnimationFrame(gameLoop)
}

// 暂停游戏
const togglePause = () => {
  if (!isPlaying.value || gameOver.value) return

  // 如果当前是暂停状态，需要继续游戏
  if (isPaused.value) {
    isPaused.value = false
    autoLoaded.value = false // 清除自动加载标记

    // 如果游戏循环未运行，启动它
    if (!gameLoopId) {
      lastTime = performance.now()
      gameLoopId = requestAnimationFrame(gameLoop)
      console.log('[游戏循环] 已启动')
    }
  } else {
    // 暂停游戏
    isPaused.value = true
  }
}

// 处理窗口失去焦点
const handleWindowBlur = () => {
  hasWindowFocus.value = false
  // 重置按键状态，防止恢复后自动移动
  keysPressed.value.ArrowLeft = false
  keysPressed.value.ArrowRight = false
  keysPressed.value.ArrowDown = false
  keysPressed.value.KeyA = false
  keysPressed.value.KeyD = false
  keysPressed.value.KeyS = false
  // 如果游戏正在进行且未暂停，自动暂停
  if (isPlaying.value && !isPaused.value && !gameOver.value) {
    isPaused.value = true
    console.log('[自动暂停] 窗口失去焦点，游戏已自动暂停')
  }
}

// 处理窗口获得焦点
const handleWindowFocus = () => {
  hasWindowFocus.value = true
  console.log('[窗口焦点] 窗口获得焦点')
}

// 处理页面可见性变化
const handleVisibilityChange = () => {
  if (document.hidden) {
    // 重置按键状态，防止恢复后自动移动
    keysPressed.value.ArrowLeft = false
    keysPressed.value.ArrowRight = false
    keysPressed.value.ArrowDown = false
    keysPressed.value.KeyA = false
    keysPressed.value.KeyD = false
    keysPressed.value.KeyS = false
    // 页面隐藏时自动暂停
    if (isPlaying.value && !isPaused.value && !gameOver.value) {
      isPaused.value = true
      console.log('[自动暂停] 页面隐藏，游戏已自动暂停')
    }
  }
}

// 切换专注模式
const toggleFocusMode = () => {
  focusMode.value = !focusMode.value
}

// 处理游戏板点击（游戏进行中点击暂停）
const handleBoardClick = () => {
  // 只有在游戏进行中且未暂停时才暂停
  if (isPlaying.value && !isPaused.value && !gameOver.value) {
    togglePause()
  }
}

// 保存游戏结果到 uTools
const saveGameResult = async () => {
  try {
    const saveData = {
      score: score.value,
      level: level.value,
      lines: lines.value,
      timestamp: Date.now()
    }

    if (window.utools) {
      // 保存最高分到 uTools
      const currentHigh = await getHighScore()

      if (score.value > currentHigh) {
        const savePrefix = saveManager.getGameSavePrefix('tetris')
        await saveManager.putDoc({
          _id: savePrefix + 'highscore',
          data: JSON.stringify(saveData),
          updatedAt: Date.now()
        })
      }

      // 保存游戏记录（用于统计）
      const savePrefix = saveManager.getGameSavePrefix('tetris')
      await saveManager.putDoc({
        _id: savePrefix + 'game_' + Date.now(),
        data: JSON.stringify(saveData),
        updatedAt: Date.now()
      })
    } else {
      // 使用 localStorage
      const highScore = loadFromLocal('tetris_highscore')
      if (!highScore || score.value > highScore.score) {
        saveToLocal('tetris_highscore', saveData)
      }
      // 保存游戏历史
      const history = loadFromLocal('tetris_history') || []
      history.push(saveData)
      saveToLocal('tetris_history', history.slice(-100)) // 只保留最近100条
    }

    console.log('游戏结果已保存:', saveData)
  } catch (error) {
    console.error('保存游戏结果失败:', error)
  }
}

// 获取最高分
const getHighScore = async () => {
  if (!window.utools) return 0

  try {
    const savePrefix = saveManager.getGameSavePrefix('tetris')
    const docs = await saveManager.getAllDocs(savePrefix + 'highscore')
    if (docs && docs.length > 0) {
      const data = JSON.parse(docs[0].data)
      return data.score || 0
    }
  } catch (error) {
    console.error('获取最高分失败:', error)
  }

  return 0
}

// 简单的本地存储保存（用于非 uTools 环境）
const saveToLocal = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.error('本地保存失败:', error)
  }
}

const loadFromLocal = (key) => {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error('本地加载失败:', error)
    return null
  }
}

// 获取 uTools 用户信息
const getUserInfo = () => {
  if (window.utools && window.utools.getUser) {
    try {
      const user = window.utools.getUser()
      userInfo.value = {
        nickname: user.nickname || '匿名玩家',
        avatar: user.avatar || ''
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
      userInfo.value = { nickname: '匿名玩家', avatar: '' }
    }
  } else {
    userInfo.value = { nickname: '本地玩家', avatar: '' }
  }
}

// 排行榜相关
const RANKING_API = 'https://getpantry.cloud/apiv1/pantry/9eafe9e6-8ff7-41ab-b111-ecabbc1685a7/basket/ELSFK_RANK'
const MAX_RANKING = 3000
const DISPLAY_RANKING = 10 // 右侧只显示前10名

// 加载排行榜
const loadRanking = async (forceRefresh = false) => {
  // 检查冷却时间（除非强制刷新）
  if (!forceRefresh) {
    const now = Date.now()
    const timeSinceLastRefresh = now - lastRankingRefreshTime.value

    if (timeSinceLastRefresh < RANKING_REFRESH_COOLDOWN) {
      const remainingSeconds = Math.ceil((RANKING_REFRESH_COOLDOWN - timeSinceLastRefresh) / 1000)
      showToast(`排行榜刷新冷却中，请等待 ${remainingSeconds} 秒后再试`, 'warning')
      return
    }
  }

  loadingRanking.value = true
  rankingError.value = ''

  try {
    const response = await fetch(RANKING_API)
    if (!response.ok) {
      throw new Error('获取排行榜失败')
    }

    const data = await response.json()
    let ranking = data.ranking || []

    // 按分数排序
    ranking.sort((a, b) => b.score - a.score)

    // 限制总排行榜数量
    if (ranking.length > MAX_RANKING) {
      ranking = ranking.slice(0, MAX_RANKING)
    }

    rankingData.value = ranking

    // 如果有用户信息，查找用户所有记录并取最高的3条
    if (userInfo.value) {
      const userRecords = ranking.filter(
        r => r.nickname === userInfo.value.nickname
      )
      // 按分数排序取前3
      userRecords.sort((a, b) => b.score - a.score)
      currentUserRanking.value = userRecords.slice(0, 3)
    }

    // 更新刷新时间
    lastRankingRefreshTime.value = Date.now()

    console.log('[排行榜] 加载成功，共', ranking.length, '条记录')
  } catch (error) {
    console.error('[排行榜] 加载失败:', error)
    rankingError.value = error.message
  } finally {
    loadingRanking.value = false
  }
}

// 获取当前分数的排名
const getCurrentRank = () => {
  if (!rankingData.value || rankingData.value.length === 0) return null

  // 找到当前分数会排在第几名
  let rank = 1
  for (const record of rankingData.value) {
    if (score.value > record.score) {
      break
    }
    rank++
  }

  return rank > MAX_RANKING ? null : rank
}

// 检查是否能进入前3000名
// 上传分数到排行榜
const uploadScore = async () => {
  if (!userInfo.value || !window.utools) {
    showToast('需要登录 uTools 才能上传分数', 'warning')
    return
  }

  try {
    // 先获取当前排行榜
    const response = await fetch(RANKING_API)
    const data = await response.json()
    let ranking = data.ranking || []

    // 获取用户当前的所有记录
    const userRecords = ranking.filter(
      r => r.nickname === userInfo.value.nickname
    )

    // 检查当前分数是否值得上传（需要能进入前3000，或比用户现有记录高）
    const minScore = ranking.length >= MAX_RANKING
      ? ranking[MAX_RANKING - 1]?.score || 0
      : 0

    const userMinScore = userRecords.length > 0
      ? Math.min(...userRecords.map(r => r.score))
      : 0

    if (score.value < minScore && score.value <= userMinScore) {
      const userMaxScore = userRecords.length > 0
        ? Math.max(...userRecords.map(r => r.score))
        : 0

      showToast(`分数不足以进入排行榜。\n您的最高分: ${userMaxScore}\n当前第 ${MAX_RANKING} 名需要: ${minScore}`, 'warning')
      return
    }

    // 添加新记录
    ranking.push({
      nickname: userInfo.value.nickname,
      score: score.value,
      level: level.value,
      lines: lines.value,
      timestamp: Date.now()
    })

    // 排序并限制数量
    ranking.sort((a, b) => b.score - a.score)
    if (ranking.length > MAX_RANKING) {
      ranking.splice(MAX_RANKING)
    }

    // 每个用户只保留最高的3条记录
    const updatedRanking = []
    const userRecordMap = new Map()

    for (const record of ranking) {
      const key = record.nickname
      if (!userRecordMap.has(key)) {
        userRecordMap.set(key, [])
      }
      const records = userRecordMap.get(key)

      if (records.length < 3) {
        records.push(record)
      } else {
        // 如果已有3条，只保留最高的
        const minUserRecord = records.reduce((min, r) => r.score < min.score ? r : min)
        if (record.score > minUserRecord.score) {
          // 替换最低分
          const minIndex = records.indexOf(minUserRecord)
          records[minIndex] = record
        }
      }
    }

    // 展开所有记录
    for (const records of userRecordMap.values()) {
      updatedRanking.push(...records)
    }

    // 重新排序
    updatedRanking.sort((a, b) => b.score - a.score)

    // 上传到服务器
    const uploadResponse = await fetch(RANKING_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ranking: updatedRanking })
    })

    if (!uploadResponse.ok) {
      throw new Error('上传分数失败')
    }

    // 查找用户的新排名
    const newUserRank = updatedRanking.findIndex(
      r => r.nickname === userInfo.value.nickname && r.score === score.value
    ) + 1

    showToast(`分数上传成功！您的排名: 第 ${newUserRank} 名`, 'success')

    // 重新加载排行榜（强制刷新以立即显示刚上传的分数）
    await loadRanking(true)
    showUploadPrompt.value = false
  } catch (error) {
    console.error('[上传分数] 失败:', error)
    showToast('上传分数失败: ' + error.message, 'error')
  }
}

// 清空存档（保留设置）
const clearSave = async () => {
  try {
    if (window.utools) {
      // 删除 uTools 中的存档（但保留设置）
      const savePrefix = saveManager.getGameSavePrefix('tetris')
      const docs = await saveManager.getAllDocs(savePrefix)
      if (docs && docs.length > 0) {
        for (const doc of docs) {
          // 跳过设置文件，不删除
          if (!doc._id.endsWith('settings')) {
            await saveManager.removeDoc(doc._id)
          }
        }
      }
    } else {
      // 删除 localStorage 中的存档（保留设置）
      localStorage.removeItem('tetris_save')
    }
    console.log('[清空存档] 存档已清空（保留设置）')
  } catch (error) {
    console.error('[清空存档] 失败:', error)
  }
}

// 结束游戏并询问是否上传分数
const endGame = async () => {
  gameOver.value = true
  isPlaying.value = false
  cancelAnimationFrame(gameLoopId)

  // 自动保存游戏结果
  await saveGameResult()

  // 清空存档（游戏结束后不能继续）
  await clearSave()

  // 强制刷新排行榜
  await loadRanking(true)

  // 显示上传分数弹窗
  showUploadPrompt.value = true
}

// 取消上传分数
const cancelUpload = () => {
  showUploadPrompt.value = false
}

// 获取用户记录在排行榜中的位置
const getCurrentUserRankPosition = (record) => {
  if (!rankingData.value || rankingData.value.length === 0) return '-'

  let rank = 1
  for (const r of rankingData.value) {
    if (r.nickname === record.nickname && r.score === record.score && r.timestamp === record.timestamp) {
      return rank
    }
    rank++
  }
  return '-'
}

// 显示当前排名
const getCurrentRankDisplay = () => {
  if (rankingData.value.length === 0) {
    return '等待数据...'
  }

  const currentRank = getCurrentRank()
  if (currentRank) {
    return `第 ${currentRank} 名`
  } else {
    const minScore = rankingData.value[MAX_RANKING - 1]?.score || 0
    return `未入榜 (需>${minScore})`
  }
}

// 格式化时间
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}

// 渲染游戏板（用于显示）
const renderBoard = computed(() => {
  const display = board.value.map(row => [...row])

  // 绘制当前方块
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

// 键盘控制
const handleKeyDown = (event) => {
  // Ctrl 组合键
  if (event.ctrlKey || event.metaKey) {
    switch (event.key.toLowerCase()) {
      case 'f':
        event.preventDefault()
        toggleFocusMode()
        break
      case 'r':
        event.preventDefault()
        loadRanking()
        break
    }
    return
  }

  // 游戏未开始时的快捷键
  if (!isPlaying.value) {
    switch (event.key) {
      case 'Enter':
        event.preventDefault()
        startGame()
        break
    }
    return
  }

  // 游戏中的快捷键
  switch (event.key) {
    case 'ArrowLeft':
    case 'a':
    case 'A':
      event.preventDefault()
      const leftKey = event.key === 'ArrowLeft' ? 'ArrowLeft' : 'KeyA'
      if (!keysPressed.value[leftKey]) {
        keysPressed.value[leftKey] = true
        lastMoveTime.value[leftKey] = 0 // 重置移动时间，让游戏循环立即移动
      }
      break
    case 'ArrowRight':
    case 'd':
    case 'D':
      event.preventDefault()
      const rightKey = event.key === 'ArrowRight' ? 'ArrowRight' : 'KeyD'
      if (!keysPressed.value[rightKey]) {
        keysPressed.value[rightKey] = true
        lastMoveTime.value[rightKey] = 0 // 重置移动时间，让游戏循环立即移动
      }
      break
    case 'ArrowDown':
    case 's':
    case 'S':
      event.preventDefault()
      const downKey = event.key === 'ArrowDown' ? 'ArrowDown' : 'KeyS'
      // 根据配置决定缓降还是硬降
      if (swapDropKeys.value) {
        hardDrop() // 互换后：向下键硬降
      } else {
        if (!keysPressed.value[downKey]) {
          keysPressed.value[downKey] = true
          lastMoveTime.value[downKey] = 0 // 重置移动时间，让游戏循环立即移动
        }
      }
      break
    case ' ':
      event.preventDefault()
      // 根据配置决定硬降还是缓降
      if (swapDropKeys.value) {
        softDrop() // 互换后：空格键缓降
      } else {
        hardDrop() // 默认：空格键硬降
      }
      break
    case 'ArrowUp':
    case 'w':
    case 'W':
      event.preventDefault()
      rotate()
      break
    case 'p':
    case 'P':
    case 'Enter':
      event.preventDefault()
      // 游戏结束时，Enter键重新开始
      if (gameOver.value) {
        restartGame()
      } else if (isPaused.value || !gameOver.value) {
        // Enter 和 P 都可以切换暂停/继续
        togglePause()
      }
      break
  }
}

// 按键释放处理（用于长按支持）
const handleKeyUp = (event) => {
  const keyMap = {
    'ArrowLeft': 'ArrowLeft',
    'ArrowRight': 'ArrowRight',
    'ArrowDown': 'ArrowDown',
    'a': 'KeyA',
    'A': 'KeyA',
    'd': 'KeyD',
    'D': 'KeyD',
    's': 'KeyS',
    'S': 'KeyS'
  }
  const mappedKey = keyMap[event.key] || event.key
  if (keysPressed.value.hasOwnProperty(mappedKey)) {
    keysPressed.value[mappedKey] = false
  }
}

// 自动保存游戏（窗口关闭时）
// @param {boolean} forceSave - 是否强制保存（忽略暂停状态）
const autoSaveGame = async (forceSave = false) => {
  // 如果不是强制保存，且游戏未进行、已暂停或已结束，则不保存
  if (!isPlaying.value || gameOver.value) {
    return
  }

  // 如果不是强制保存，且游戏暂停中，也不保存
  if (!forceSave && isPaused.value) {
    return
  }

  try {
    const saveData = {
      board: board.value,
      score: score.value,
      level: level.value,
      lines: lines.value,
      // 保存当前方块和下一个方块的状态
      currentPiece: currentPiece.value ? {
        type: currentPiece.value.type,
        shape: currentPiece.value.shape,
        color: currentPiece.value.color,
        x: currentPiece.value.x,
        y: currentPiece.value.y
      } : null,
      nextPiece: nextPiece.value ? {
        type: nextPiece.value.type,
        shape: nextPiece.value.shape,
        color: nextPiece.value.color,
        x: nextPiece.value.x,
        y: nextPiece.value.y
      } : null,
      timestamp: Date.now()
    }

    if (window.utools) {
      // 保存到 uTools（使用 saveManager 的前缀规范）
      const savePrefix = saveManager.getGameSavePrefix('tetris')
      await saveManager.putDoc({
        _id: savePrefix + 'current',
        data: JSON.stringify(saveData),
        updatedAt: Date.now()
      })
    } else {
      // 保存到 localStorage
      saveToLocal('tetris_save', saveData)
    }

    console.log('[自动保存] 游戏已自动保存')
  } catch (error) {
    console.error('[自动保存] 保存失败:', error)
  }
}

// 自动加载游戏
const autoLoadGame = async () => {
  try {
    let saveData = null

    if (window.utools) {
      // 从 uTools 加载（使用 saveManager 的前缀规范）
      const savePrefix = saveManager.getGameSavePrefix('tetris')
      const docs = await saveManager.getAllDocs(savePrefix)
      if (docs && docs.length > 0) {
        saveData = JSON.parse(docs[0].data)
      }
    } else {
      // 从 localStorage 加载
      saveData = loadFromLocal('tetris_save')
    }

    if (saveData) {
      // 恢复游戏状态
      board.value = saveData.board
      score.value = saveData.score
      level.value = saveData.level
      lines.value = saveData.lines

      // 恢复当前方块和下一个方块（如果存档中有）
      if (saveData.currentPiece) {
        currentPiece.value = saveData.currentPiece
      } else {
        currentPiece.value = randomPiece()
      }

      if (saveData.nextPiece) {
        nextPiece.value = saveData.nextPiece
      } else {
        nextPiece.value = randomPiece()
      }

      // 标记为已加载状态，但不自动开始游戏
      isPlaying.value = true
      gameOver.value = false
      isPaused.value = true // 保持暂停状态，等待手动开始
      autoLoaded.value = true

      console.log('[自动加载] 存档已加载，等待手动开始游戏')

      // 3秒后隐藏自动加载提示
      setTimeout(() => {
        autoLoaded.value = false
      }, 3000)
    }
  } catch (error) {
    console.error('[自动加载] 加载失败:', error)
  }
}

// 加载互换按键设置
const loadSwapKeysSetting = async () => {
  if (window.utools) {
    try {
      const savePrefix = saveManager.getGameSavePrefix('tetris')
      const docs = await saveManager.getAllDocs(savePrefix + 'settings')
      if (docs && docs.length > 0) {
        const settings = JSON.parse(docs[0].data)
        if (typeof settings.swapDropKeys === 'boolean') {
          swapDropKeys.value = settings.swapDropKeys
          console.log('[设置] 已加载互换按键设置:', swapDropKeys.value)
        }
      }
    } catch (error) {
      console.error('[设置] 加载互换按键设置失败:', error)
    }
  } else {
    // 非uTools环境，从localStorage加载
    const saved = localStorage.getItem('tetris_swap_keys')
    if (saved !== null) {
      swapDropKeys.value = saved === 'true'
    }
  }
}

// 保存互换按键设置
const saveSwapKeysSetting = async () => {
  if (window.utools) {
    try {
      const savePrefix = saveManager.getGameSavePrefix('tetris')
      await saveManager.putDoc({
        _id: savePrefix + 'settings',
        data: JSON.stringify({ swapDropKeys: swapDropKeys.value }),
        updatedAt: Date.now()
      })
      console.log('[设置] 互换按键设置已保存到uTools:', swapDropKeys.value)
    } catch (error) {
      console.error('[设置] 保存互换按键设置失败:', error)
    }
  } else {
    // 非uTools环境，保存到localStorage
    localStorage.setItem('tetris_swap_keys', swapDropKeys.value.toString())
    console.log('[设置] 互换按键设置已保存到本地:', swapDropKeys.value)
  }
}

// 生命周期
onMounted(async () => {
  getUserInfo()
  initBoard()
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)

  // 监听窗口焦点变化
  window.addEventListener('blur', handleWindowBlur)
  window.addEventListener('focus', handleWindowFocus)

  // 监听页面可见性变化
  document.addEventListener('visibilitychange', handleVisibilityChange)

  // 加载互换按键设置
  await loadSwapKeysSetting()

  // 自动加载存档
  await autoLoadGame()

  // 自动加载排行榜
  await loadRanking()
})

onUnmounted(() => {
  if (gameLoopId) {
    cancelAnimationFrame(gameLoopId)
  }
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)

  // 移除焦点和可见性事件监听
  window.removeEventListener('blur', handleWindowBlur)
  window.removeEventListener('focus', handleWindowFocus)
  document.removeEventListener('visibilitychange', handleVisibilityChange)

  // 窗口关闭时自动保存
  autoSaveGame()
})
</script>

<template>
  <div class="tetris-container" :class="{ 'focus-mode': focusMode }">
    <!-- 右上角返回按钮 -->
    <button class="back-btn" @click="goBack" title="返回游戏列表">
      <span class="back-icon">←</span>
      <span class="back-text">返回</span>
    </button>

    <!-- 游戏主区域 -->
    <div class="game-area">
      <!-- 专注模式下的浮动按钮 -->
      <div class="focus-mode-toggle" v-show="focusMode" @click="toggleFocusMode" title="Ctrl+F退出专注模式">
        退出专注 (Ctrl+F)
      </div>

      <!-- 游戏内容 -->
      <div class="game-content">
        <!-- 自动加载提示 -->
        <div v-if="autoLoaded" class="auto-load-toast">
          ✅ 已自动加载上次存档，按 Enter 开始游戏
        </div>

        <!-- Toast 提示 -->
        <transition name="toast-fade">
          <div v-if="toast.show" class="toast-message" :class="toast.type">
            <span class="toast-icon">{{ getToastIcon(toast.type) }}</span>
            <span class="toast-text">{{ toast.message }}</span>
          </div>
        </transition>

        <!-- 左侧信息面板 -->
        <div class="info-panel" v-show="!focusMode">
          <!-- 下一个方块 -->
          <div class="info-box next-piece-box">
            <h3>下一个</h3>
            <div v-if="nextPiece" class="next-piece-preview">
              <div
                v-for="(row, y) in nextPiece.shape"
                :key="'next-' + y"
                class="next-row"
              >
                <div
                  v-for="(cell, x) in row"
                  :key="'next-' + y + '-' + x"
                  class="next-cell"
                  :class="{ filled: cell }"
                  :style="{ backgroundColor: cell ? nextPiece.color : 'transparent' }"
                ></div>
              </div>
            </div>
          </div>

          <!-- 分数信息 -->
          <div class="info-box score-box">
            <div class="score-header">
              <h3>分数</h3>
              <div class="score-tip">ℹ️</div>
            </div>
            <p class="score-value">{{ score.toLocaleString() }}</p>
            <!-- 积分规则提示 -->
            <div class="score-rules-tooltip">
              <h4>📊 积分规则</h4>
              <div class="rule-item">消除 1 行：100分</div>
              <div class="rule-item">消除 2 行：300分</div>
              <div class="rule-item">消除 3 行：500分</div>
              <div class="rule-item">消除 4 行：800分</div>
              <div class="rule-item divider"></div>
              <div class="rule-item">缓降：每格 1分</div>
              <div class="rule-item">硬降：每格 2分</div>
              <div class="rule-item divider"></div>
              <div class="rule-item bonus">最终得分 = 基础分 × 等级</div>
            </div>
          </div>

          <div class="info-box">
            <h3>等级</h3>
            <p class="level-value">{{ level }}</p>
          </div>

          <div class="info-box">
            <h3>行数</h3>
            <p class="lines-value">{{ lines }}</p>
          </div>

          <!-- 操作说明 -->
          <div class="info-box controls-info">
            <h3>操作</h3>
            <div class="control-list">
              <div class="control-item">Enter 开始/暂停</div>
              <div class="control-item">← → / A D 移动</div>
              <div class="control-item">↑ / W 旋转</div>
              <div class="control-item">
                ↓ / S {{ swapDropKeys ? '硬降' : '缓降' }}
              </div>
              <div class="control-item">
                空格 {{ swapDropKeys ? '缓降' : '硬降' }}
              </div>
              <div class="control-item">Ctrl+F 专注模式</div>
              <div class="control-item">Ctrl+R 刷新排行</div>
            </div>
            <!-- 按键互换开关 -->
            <div class="swap-keys-toggle">
              <div class="toggle-label">软硬互换</div>
              <button
                class="toggle-button"
                :class="{ active: swapDropKeys }"
                @click="swapDropKeys = !swapDropKeys; saveSwapKeysSetting()"
              >
                <div class="toggle-slider"></div>
              </button>
            </div>
          </div>
        </div>

        <!-- 专注模式下的下一个方块（浮动在游戏板上） -->
        <div class="next-piece-container" v-show="focusMode">
          <h3>下一个</h3>
          <div v-if="nextPiece" class="next-piece-preview">
            <div
              v-for="(row, y) in nextPiece.shape"
              :key="'next-' + y"
              class="next-row"
            >
              <div
                v-for="(cell, x) in row"
                :key="'next-' + y + '-' + x"
                class="next-cell"
                :class="{ filled: cell }"
                :style="{ backgroundColor: cell ? nextPiece.color : 'transparent' }"
              ></div>
            </div>
          </div>
        </div>

        <!-- 游戏板 -->
        <div class="board-container">
          <div
            class="game-board"
            :class="{ paused: isPaused, 'game-over': gameOver }"
            @click="handleBoardClick"
          >
            <div v-if="!isPlaying && !gameOver" class="board-overlay" @click.stop="startGame">
              <p>{{ autoLoaded ? '已加载存档 - ' : '' }}按 Enter 或点击开始游戏</p>
            </div>
            <div v-if="isPaused" class="board-overlay" @click.stop="togglePause">
              <p>{{ autoLoaded ? '已加载存档 - ' : '' }}已暂停 (按 Enter 或点击继续)</p>
            </div>
            <div v-if="gameOver" class="board-overlay game-over-overlay" @click.stop="restartGame">
              <p class="game-over-text">游戏结束</p>
              <p class="final-score">最终分数: {{ score.toLocaleString() }}</p>
              <p class="restart-hint">按 Enter 或点击重新开始</p>
            </div>

            <div class="board-grid" :style="{ gridTemplateRows: `repeat(${BOARD_HEIGHT}, ${BLOCK_SIZE}px)`, gap: '1px' }">
              <div
                v-for="(row, y) in renderBoard"
                :key="'row-' + y"
                class="board-row"
                :class="{ clearing: clearingLines.includes(y) }"
                :style="{ gridTemplateColumns: `repeat(${BOARD_WIDTH}, ${BLOCK_SIZE}px)`, gap: '1px' }"
              >
                <div
                  v-for="(cell, x) in row"
                  :key="'cell-' + y + '-' + x"
                  class="board-cell"
                  :class="{ filled: cell !== 0 }"
                  :style="{
                    backgroundColor: cell || 'transparent',
                    width: `${BLOCK_SIZE}px`,
                    height: `${BLOCK_SIZE}px`
                  }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 用户信息 -->
        <div v-if="userInfo" class="user-panel" v-show="!focusMode">
          <div class="info-box">
            <h3>玩家</h3>
            <p class="user-name">{{ userInfo.nickname }}</p>
          </div>

          <!-- 当前排名 -->
          <div v-if="currentUserRanking && currentUserRanking.length > 0" class="info-box">
            <h3>您的最高分</h3>
            <div class="user-scores">
              <div
                v-for="(record, index) in currentUserRanking"
                :key="index"
                class="user-score-item"
              >
                <span class="score-rank">#{{ getCurrentUserRankPosition(record) }}</span>
                <span class="score-points">{{ record.score.toLocaleString() }}</span>
              </div>
            </div>
          </div>

          <!-- 当前分数排名 -->
          <div v-if="isPlaying || gameOver" class="info-box">
            <h3>当前排名</h3>
            <p class="current-rank">
              {{ getCurrentRankDisplay() }}
            </p>
          </div>

          <!-- 排行榜 -->
          <div class="info-box ranking-box">
            <h3>🏆 排行榜 (TOP {{ DISPLAY_RANKING }})</h3>
            <div v-if="loadingRanking" class="ranking-loading-small">
              <p>加载中...</p>
            </div>
            <div v-else-if="rankingError" class="ranking-error-small">
              <p>加载失败</p>
            </div>
            <div v-else class="ranking-list-small">
              <div
                v-for="(item, index) in rankingData.slice(0, DISPLAY_RANKING)"
                :key="index"
                class="ranking-item-small"
                :class="{ 'is-current-user': item.nickname === userInfo?.nickname }"
              >
                <span class="rank-small" :class="{ 'top-three': index < 3 }">
                  <span v-if="index === 0">🥇</span>
                  <span v-else-if="index === 1">🥈</span>
                  <span v-else-if="index === 2">🥉</span>
                  <span v-else>{{ index + 1 }}</span>
                </span>
                <span class="name-small">{{ item.nickname }}</span>
                <span class="score-small">{{ item.score.toLocaleString() }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 上传分数提示 -->
        <div v-if="showUploadPrompt" class="upload-prompt-overlay">
          <div class="upload-prompt-panel" @click.stop>
            <h3>🎉 游戏结束!</h3>
            <p class="upload-score-info">最终分数: {{ score.toLocaleString() }}</p>
            <p class="upload-rank-info">当前排名: 第 {{ getCurrentRank() || '?' }} 名</p>
            <p class="upload-question">是否上传分数到排行榜?</p>
            <p class="upload-hint">💡 每人仅保留最高3个成绩</p>
            <div class="upload-actions">
              <button class="upload-btn confirm" @click="uploadScore">
                ✓ 上传分数
              </button>
              <button class="upload-btn cancel" @click="cancelUpload">
                ✕ 取消
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.tetris-container {
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
  color: white;
  overflow: hidden;
}

/* 左上角返回按钮 */
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
  transition: all 0.2s;
  z-index: 1000;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateX(-1px);
}

.back-icon {
  font-size: 12px;
  line-height: 1;
}

.back-text {
  font-weight: 500;
}

/* 游戏主区域 */
.game-area {
  width: 100%;
  max-width: 780px;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 48px 8px 8px 8px; /* 顶部留出空间给按钮 */
}

/* 游戏内容 */
.game-content {
  display: grid;
  grid-template-columns: minmax(0, 32%) 1fr minmax(0, 32%);
  gap: 8px;
  align-items: flex-start;
  flex: 1;
  overflow: hidden;
  min-height: 0;
  position: relative;
  width: 100%;
  padding: 0 8px;
}

/* 自动加载提示 */
.auto-load-toast {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 100;
  animation: slideDown 0.3s ease;
  white-space: nowrap;
  grid-column: 1 / -1; /* 跨越所有列 */
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* Toast 提示 */
.toast-message {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 150;
  white-space: pre-line;
  text-align: center;
  max-width: 80%;
  grid-column: 1 / -1;
  animation: toastSlideDown 0.3s ease;
}

.toast-message.info {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.toast-message.success {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
}

.toast-message.error {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.toast-message.warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.toast-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.toast-text {
  line-height: 1.4;
}

@keyframes toastSlideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

/* 信息面板 */
.info-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
  grid-column: 1;
  justify-self: end;
  max-width: 180px;
  min-width: 0;
}

.info-box {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 8px 10px;
  min-width: 80px;
}

.info-box h3 {
  font-size: 9px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 3px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.score-value,
.level-value,
.lines-value {
  font-size: 16px;
  font-weight: 700;
  color: white;
  line-height: 1.2;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: white;
  line-height: 1.2;
  word-break: break-word;
  overflow-wrap: break-word;
}

.score-value {
  color: #ffd93d;
}

.level-value {
  color: #22c55e;
}

.lines-value {
  color: #0ea5e9;
}

/* 分数框 */
.score-box {
  position: relative;
  isolation: isolate; /* 创建新的 stacking context */
  z-index: 100; /* 确保在游戏板之上 */
}

/* 积分规则提示框 */
.score-rules-tooltip {
  position: fixed; /* 使用固定定位，脱离父容器限制 */
  top: 0;
  left: 0;
  margin-top: 8px;
  margin-left: 8px;
  background: linear-gradient(135deg, #2d2d44 0%, #1e1e32 100%);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 8px;
  padding: 12px;
  min-width: 200px;
  max-width: 250px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  z-index: 10000; /* 更高的 z-index */
  pointer-events: none;
  transform: translate(0, 0); /* 将通过 JavaScript 动态计算位置 */
}

.score-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.score-tip {
  font-size: 12px;
  cursor: help;
  opacity: 0.6;
  transition: opacity 0.2s;
  user-select: none;
}

.score-tip:hover {
  opacity: 1;
}

/* 积分规则提示框 */
.score-rules-tooltip {
  position: absolute;
  top: 100%;
  left: 100%;
  margin-top: 8px;
  margin-left: 8px;
  background: linear-gradient(135deg, #2d2d44 0%, #1e1e32 100%);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 8px;
  padding: 12px;
  min-width: 200px;
  max-width: 250px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  z-index: 9999;
  pointer-events: none;
}

.score-box:hover .score-rules-tooltip {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.score-box:hover .score-rules-tooltip {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.score-rules-tooltip h4 {
  margin: 0 0 10px 0;
  font-size: 13px;
  font-weight: 600;
  color: #ffd93d;
  text-align: center;
  border-bottom: 1px solid rgba(255, 215, 0, 0.2);
  padding-bottom: 8px;
}

.rule-item {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  padding: 4px 0;
  line-height: 1.4;
}

.rule-item.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 6px 0;
  padding: 0;
}

.rule-item.bonus {
  color: #ffd93d;
  font-weight: 600;
  text-align: center;
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 215, 0, 0.2);
}

/* 左侧面板内的下一个方块 */
.next-piece-box {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 下一个方块容器（专注模式下浮动） */
.next-piece-container {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 8px 10px;
  min-width: 80px;
  max-width: 180px;
  grid-column: 1;
  justify-self: end;
}

.next-piece-container h3 {
  font-size: 9px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 3px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 下一个方块预览 */
.next-piece-preview {
  display: inline-block;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  padding: 4px;
}

.next-row {
  display: flex;
  gap: 1px;
}

.next-cell {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.05);
}

.next-cell.filled {
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.3);
}

/* 操作说明 */
.controls-info {
  font-size: 10px;
}

.control-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.control-item {
  padding: 2px 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

/* 按键互换开关 */
.swap-keys-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.toggle-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.toggle-button {
  position: relative;
  width: 36px;
  height: 20px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.toggle-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.toggle-button.active {
  background: rgba(102, 126, 234, 0.6);
  border-color: rgba(102, 126, 234, 0.8);
}

.toggle-slider {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.toggle-button.active .toggle-slider {
  transform: translateX(16px);
  background: white;
}

/* 游戏板容器 */
.board-container {
  position: relative;
  flex-shrink: 0;
  grid-column: 2;
  justify-self: center;
}

.game-board {
  position: relative;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 2px;
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
}

.board-grid {
  display: grid;
  gap: 1px;
  background: rgba(255, 255, 255, 0.05);
}

.board-row {
  display: grid;
  gap: 1px;
}

.board-cell {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 2px;
  transition: background-color 0.05s;
}

.board-cell.filled {
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4),
              inset 0 -2px 4px rgba(0, 0, 0, 0.2);
}

/* 消除行动画 */
.board-row.clearing {
  animation: clearLine 0.3s ease-out forwards;
}

.board-row.clearing .board-cell {
  animation: cellFlash 0.3s ease-out forwards;
}

@keyframes clearLine {
  0% {
    transform: scaleY(1);
    opacity: 1;
  }
  50% {
    transform: scaleY(1.1);
    opacity: 1;
    background: rgba(255, 255, 255, 0.3);
  }
  100% {
    transform: scaleY(0);
    opacity: 0;
  }
}

@keyframes cellFlash {
  0% {
    background: currentColor;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4),
                inset 0 -2px 4px rgba(0, 0, 0, 0.2),
                0 0 20px rgba(255, 255, 255, 0.8);
  }
  50% {
    background: rgba(255, 255, 255, 0.9);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.8),
                inset 0 -2px 4px rgba(0, 0, 0, 0.2),
                0 0 30px rgba(255, 215, 0, 1),
                0 0 40px rgba(255, 255, 255, 0.8);
    transform: scale(1.05);
  }
  100% {
    background: rgba(255, 255, 255, 0.3);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.6),
                inset 0 -2px 4px rgba(0, 0, 0, 0.2),
                0 0 20px rgba(255, 215, 0, 0.5);
    transform: scale(0.95);
    opacity: 0;
  }
}

/* 游戏板覆盖层 */
.board-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
  z-index: 10;
}

.board-overlay:hover {
  background: rgba(0, 0, 0, 0.75);
}

.game-board.paused .board-overlay {
  background: rgba(0, 0, 0, 0.6);
}

.game-over-overlay {
  background: rgba(0, 0, 0, 0.9);
}

.game-over-text {
  font-size: 24px;
  color: #ef4444;
  margin-bottom: 8px;
}

.restart-hint {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 12px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}

.final-score {
  font-size: 18px;
  color: #ffd93d;
}

/* 用户面板 */
.user-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
  grid-column: 3;
  justify-self: start;
  max-width: 180px;
  min-width: 0;
  overflow-x: hidden;
}

/* 用户最高分显示 */
.user-scores {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-score-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  padding: 2px 0;
}

.score-rank {
  font-weight: 600;
  color: #ffd93d;
  min-width: 30px;
}

.score-points {
  font-weight: 700;
  color: white;
}

/* 当前排名 */
.current-rank {
  font-size: 14px;
  font-weight: 600;
  color: #22c55e;
}

/* 排行榜盒子 */
.ranking-box {
  flex: 1;
  max-height: 200px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 排行榜列表（小尺寸） */
.ranking-list-small {
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow-y: auto;
  padding-right: 2px;
}

.ranking-item-small {
  display: grid;
  grid-template-columns: 24px 1fr 50px;
  gap: 4px;
  padding: 4px 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  align-items: center;
  font-size: 9px;
  transition: all 0.2s;
}

.ranking-item-small.is-current-user {
  background: rgba(102, 126, 234, 0.2);
  font-weight: 600;
}

.rank-small {
  font-size: 9px;
  font-weight: 600;
  text-align: center;
}

.rank-small.top-three {
  font-size: 11px;
}

.name-small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.score-small {
  font-weight: 600;
  color: #ffd93d;
  text-align: right;
}

/* 加载状态 */
.ranking-loading-small,
.ranking-error-small {
  padding: 10px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 10px;
}

/* 上传分数提示弹窗 */
.upload-prompt-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

.upload-prompt-panel {
  background: linear-gradient(135deg, #1e1e32 0%, #1a1a2e 100%);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 24px;
  max-width: 320px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease;
}

.upload-prompt-panel h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: white;
}

.upload-score-info {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 700;
  color: #ffd93d;
}

.upload-rank-info {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.upload-question {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
}

.upload-hint {
  margin: 0 0 20px 0;
  font-size: 12px;
  color: rgba(255, 215, 0, 0.8);
  text-align: center;
  font-style: italic;
}

.upload-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.upload-btn {
  padding: 10px 20px;
  border: 2px solid transparent;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 100px;
}

.upload-btn.confirm {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  border-color: rgba(34, 197, 94, 0.3);
  color: white;
}

.upload-btn.confirm:hover {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.upload-btn.cancel {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.7);
}

.upload-btn.cancel:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 专注模式浮动按钮 */
.focus-mode-toggle {
  position: fixed;
  top: 10px;
  left: 110px;
  background: rgba(102, 126, 234, 0.9);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.2s;
  user-select: none;
}

.focus-mode-toggle:hover {
  background: rgba(102, 126, 234, 1);
  transform: translateY(-1px);
}

/* 专注模式样式 */
.tetris-container.focus-mode {
  justify-content: center;
}

.tetris-container.focus-mode .game-area {
  max-width: none;
  width: 100%;
  height: 100%;
}

.tetris-container.focus-mode .game-content {
  justify-content: center;
  align-items: center;
}

.tetris-container.focus-mode .board-container {
  flex: 0 0 auto;
}

/* 排行榜固定尺寸 */
.ranking-box {
  flex: 0 0 auto !important;
  max-height: 250px !important;
  max-width: 180px !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
}

.ranking-list-small {
  overflow-y: auto !important;
  overflow-x: hidden !important;
  flex: 1 !important;
  padding-right: 4px !important;
}

/* 自定义滚动条样式 */
.ranking-list-small::-webkit-scrollbar {
  width: 4px;
}

.ranking-list-small::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
}

.ranking-list-small::-webkit-scrollbar-thumb {
  background: rgba(102, 126, 234, 0.5);
  border-radius: 2px;
}

.ranking-list-small::-webkit-scrollbar-thumb:hover {
  background: rgba(102, 126, 234, 0.7);
}

/* 响应式调整 - 更小屏幕 */
@media (max-width: 600px) {
  .game-title {
    font-size: 18px;
  }

  .ranking-item {
    grid-template-columns: 45px 1fr 70px 45px;
    padding: 8px 10px;
  }

  .rank-score {
    font-size: 13px;
  }

  .info-panel {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .info-box {
    flex: 1;
    min-width: 70px;
  }
}
</style>
