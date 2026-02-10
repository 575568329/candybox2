<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// ==================== 游戏配置 ====================
const CONFIG = {
  HEX_SIDES: 6,                    // 六边形边数
  BLOCK_HEIGHT: 15,                // 方块高度（参考原版）
  HEX_WIDTH: 65,                   // 中心六边形宽度（参考原版）
  START_DIST: 340,                 // 初始距离
  INITIAL_SPEED: 0.65,             // 初始下落速度
  SPEED_INCREMENT: 0.01,           // 速度增量
  ROTATION_COOLDOWN: 75,           // 旋转冷却时间(ms)
  ANGULAR_VELOCITY: 4,             // 旋转速度常数
  ROWS: 8,                         // 行数
  COLORS: [                        // 方块颜色（原版配色）
    '#e74c3c', // 红
    '#f1c40f', // 黄
    '#3498db', // 蓝
    '#2ecc71'  // 绿
  ],
  COLOR_TINTS: {                   // 高光颜色映射
    '#e74c3c': 'rgb(241,163,155)',
    '#f1c40f': 'rgb(246,223,133)',
    '#3498db': 'rgb(151,201,235)',
    '#2ecc71': 'rgb(150,227,183)'
  }
}

// ==================== 游戏状态 ====================
const canvas = ref(null)
const ctx = ref(null)
const gameState = ref(0) // 0:开始, 1:游戏中, 2:游戏结束, -1:暂停
const score = ref(0)
const highScore = ref(0)
const combo = ref(0)
const level = ref(1)

// 游戏对象
let mainHex = null
let fallingBlocks = []
let animationFrameId = null
let lastTime = 0
let currentSpeed = CONFIG.INITIAL_SPEED
let lastRotationTime = 0

// ==================== 工具函数 ====================

// 角度转弧度
const degToRad = (deg) => deg * Math.PI / 180

// 旋转点（原版 Hextris 方法）
const rotatePoint = (x, y, theta) => {
  const thetaRad = degToRad(theta)
  return {
    x: x * Math.cos(thetaRad) - y * Math.sin(thetaRad),
    y: x * Math.sin(thetaRad) + y * Math.cos(thetaRad)
  }
}

// ==================== 六边形类 ====================
class Hex {
  constructor(x, y, sideLength) {
    this.x = x
    this.y = y
    this.sides = CONFIG.HEX_SIDES
    this.sideLength = sideLength
    this.blocks = Array(this.sides).fill(null).map(() => [])
    this.position = 0
    this.angle = 0  // 边朝上，初始角度为0
    this.targetAngle = this.angle
  }

  // 绘制六边形
  draw(ctx) {
    const radius = (this.sideLength / 2) * Math.sqrt(3)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 3

    ctx.beginPath()
    for (let i = 0; i < this.sides; i++) {
      // 使用 this.angle 来实现旋转动画
      const theta = degToRad(60 * i + this.angle)
      const px = this.x + radius * Math.cos(theta)
      const py = this.y + radius * Math.sin(theta)
      if (i === 0) {
        ctx.moveTo(px, py)
      } else {
        ctx.lineTo(px, py)
      }
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  // 旋转六边形
  rotate(direction) {
    const now = Date.now()
    if (now - lastRotationTime < CONFIG.ROTATION_COOLDOWN) return

    lastRotationTime = now
    this.position = (this.position + direction + this.sides) % this.sides
    this.targetAngle = this.position * (360 / this.sides)  // 边朝上时，从0度开始

    // 更新所有已固定方块的目标角度
    for (let i = 0; i < this.blocks.length; i++) {
      for (let j = 0; j < this.blocks[i].length; j++) {
        const block = this.blocks[i][j]
        block.targetAngle = block.targetAngle - direction * 60
      }
    }
  }

  // 更新六边形角度（平滑旋转）
  update(dt) {
    // 平滑旋转到目标角度
    if (this.angle > this.targetAngle) {
      this.angle -= Math.min(Math.abs(this.angle - this.targetAngle), CONFIG.ANGULAR_VELOCITY * dt)
    } else if (this.angle < this.targetAngle) {
      this.angle += Math.min(Math.abs(this.targetAngle - this.angle), CONFIG.ANGULAR_VELOCITY * dt)
    }
  }

  // 添加方块
  addBlock(block) {
    const lane = (this.sides - block.fallingLane + this.position) % this.sides
    block.settled = true
    this.blocks[lane].push(block)
  }

  // 检测碰撞（参考原版实现）
  checkCollision(block) {
    if (block.settled) return false

    const lane = (this.sides - block.fallingLane + this.position) % this.sides
    const arr = this.blocks[lane]

    // 检查是否碰到其他方块
    if (arr.length > 0) {
      const topBlock = arr[arr.length - 1]
      // 使用精确的距离计算
      const distance = block.distFromHex - topBlock.distFromHex - topBlock.height
      if (distance <= 0) {
        block.distFromHex = topBlock.distFromHex + topBlock.height
        this.addBlock(block)
        return true
      }
    }

    // 检查是否碰到中心六边形
    const hexRadius = (this.sideLength / 2) * Math.sqrt(3)
    if (block.distFromHex - hexRadius - block.height <= 0) {
      block.distFromHex = hexRadius + block.height / 2
      this.addBlock(block)
      return true
    }

    return false
  }

  // 检查游戏结束（改进版）
  checkGameOver() {
    for (let i = 0; i < this.sides; i++) {
      if (this.blocks[i].length > 0) {
        const topBlock = this.blocks[i][this.blocks[i].length - 1]
        const hexRadius = (this.sideLength / 2) * Math.sqrt(3)
        // 如果方块超出边界一定距离，游戏结束
        if (topBlock.distFromHex - hexRadius > CONFIG.BLOCK_HEIGHT * CONFIG.ROWS * 0.6) {
          return true
        }
      }
    }
    return false
  }
}

// ==================== 方块类 ====================
class Block {
  constructor(fallingLane, color) {
    this.fallingLane = fallingLane
    this.color = color
    this.tint = CONFIG.COLOR_TINTS[color] || 'rgba(255,255,255,0.3)'
    // 方块对齐六边形的边（0度, 60度, 120度, 180度, 240度, 300度）
    this.angle = 60 * fallingLane
    this.targetAngle = this.angle
    this.distFromHex = CONFIG.START_DIST
    this.settled = false
    this.deleted = false
    this.opacity = 1
    this.height = CONFIG.BLOCK_HEIGHT
    this.tintValue = 0.3
  }

  update(dt) {
    if (!this.settled && !this.deleted) {
      this.distFromHex -= currentSpeed * dt
    }

    // 更新高光效果
    if (this.tintValue > 0) {
      this.tintValue -= 0.02 * dt
      if (this.tintValue < 0) this.tintValue = 0
    }

    // 消除动画
    if (this.deleted && this.opacity > 0) {
      this.opacity -= 0.075 * dt
      if (this.opacity < 0) this.opacity = 0
    }

    // 平滑旋转（原版方法）
    if (this.angle > this.targetAngle) {
      this.angle -= Math.min(Math.abs(this.angle - this.targetAngle), CONFIG.ANGULAR_VELOCITY * dt)
    } else if (this.angle < this.targetAngle) {
      this.angle += Math.min(Math.abs(this.targetAngle - this.angle), CONFIG.ANGULAR_VELOCITY * dt)
    }
  }

  draw(ctx, centerX, centerY) {
    if (this.deleted && this.opacity <= 0) return

    ctx.save()
    ctx.globalAlpha = this.opacity

    // 原版 Hextris 的宽度计算
    const width = 2 * this.distFromHex / Math.sqrt(3)
    const widthWide = 2 * (this.distFromHex + this.height) / Math.sqrt(3)

    // 计算四个顶点（原版方法：梯形）
    const p1 = rotatePoint(-width / 2, this.height / 2, this.angle)
    const p2 = rotatePoint(width / 2, this.height / 2, this.angle)
    const p3 = rotatePoint(widthWide / 2, -this.height / 2, this.angle)
    const p4 = rotatePoint(-widthWide / 2, -this.height / 2, this.angle)

    // 原版 Hextris 的基础位置计算（注意 sin 和 -cos 的使用）
    const baseX = centerX + Math.sin(this.angle * Math.PI / 180) * (this.distFromHex + this.height / 2)
    const baseY = centerY - Math.cos(this.angle * Math.PI / 180) * (this.distFromHex + this.height / 2)

    // 绘制方块（梯形）
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.moveTo(baseX + p1.x, baseY + p1.y)
    ctx.lineTo(baseX + p2.x, baseY + p2.y)
    ctx.lineTo(baseX + p3.x, baseY + p3.y)
    ctx.lineTo(baseX + p4.x, baseY + p4.y)
    ctx.closePath()
    ctx.fill()

    // 边框
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'
    ctx.lineWidth = 1
    ctx.stroke()

    // 高光效果
    if (this.tintValue > 0) {
      ctx.fillStyle = this.tint
      ctx.globalAlpha = this.tintValue * this.opacity
      ctx.beginPath()
      ctx.moveTo(baseX + p1.x, baseY + p1.y)
      ctx.lineTo(baseX + p2.x, baseY + p2.y)
      ctx.lineTo(baseX + p3.x, baseY + p3.y)
      ctx.lineTo(baseX + p4.x, baseY + p4.y)
      ctx.closePath()
      ctx.fill()
    }

    ctx.restore()
  }
}

// ==================== 消除检测 ====================
const checkMatches = () => {
  const toDelete = []

  // 洪水填充算法检测同色方块
  const floodFill = (side, index, color, visited) => {
    const key = `${side},${index}`
    if (visited.has(key)) return
    if (!mainHex.blocks[side] || !mainHex.blocks[side][index]) return
    if (mainHex.blocks[side][index].color !== color) return

    visited.add(key)
    toDelete.push({ side, index })

    // 检查相邻边
    for (let offset = -1; offset <= 1; offset++) {
      const newSide = (side + offset + mainHex.sides) % mainHex.sides
      const newIndex = index + (offset === 0 ? 1 : 0)
      floodFill(newSide, newIndex, color, visited)
    }
  }

  // 遍历所有方块
  for (let side = 0; side < mainHex.sides; side++) {
    for (let index = 0; index < mainHex.blocks[side].length; index++) {
      const block = mainHex.blocks[side][index]
      if (!block || block.deleted) continue

      const visited = new Set()
      const deleteCount = toDelete.length
      floodFill(side, index, block.color, visited)

      // 如果找到3个或以上同色方块
      if (toDelete.length - deleteCount >= 3) {
        const addedCount = toDelete.length - deleteCount
        score.value += addedCount * 10 * level.value
        combo.value++
      } else {
        // 不足3个，移除刚添加的
        toDelete.splice(deleteCount)
      }
    }
  }

  // 标记删除
  if (toDelete.length > 0) {
    toDelete.forEach(({ side, index }) => {
      if (mainHex.blocks[side] && mainHex.blocks[side][index]) {
        mainHex.blocks[side][index].deleted = true
        // 重新触发高光效果（消除时闪烁）
        mainHex.blocks[side][index].tintValue = 0.5
      }
    })

    // 延迟清理已删除的方块（让消除动画播放完成）
    setTimeout(() => {
      for (let side = 0; side < mainHex.sides; side++) {
        mainHex.blocks[side] = mainHex.blocks[side].filter(b => !b.deleted || b.opacity > 0)
        // 清理完全透明的方块
        mainHex.blocks[side] = mainHex.blocks[side].filter(b => b.opacity > 0)
      }
      combo.value = 0
    }, 300)
  }
}

// ==================== 方块生成 ====================
const spawnBlock = () => {
  if (gameState.value !== 1) return

  const lane = Math.floor(Math.random() * CONFIG.HEX_SIDES)
  const color = CONFIG.COLORS[Math.floor(Math.random() * CONFIG.COLORS.length)]
  const block = new Block(lane, color)
  fallingBlocks.push(block)
}

// ==================== 渲染 ====================
const render = () => {
  if (!ctx.value) return

  const width = canvas.value.width
  const height = canvas.value.height
  const centerX = width / 2
  const centerY = height / 2

  // 清空画布
  ctx.value.clearRect(0, 0, width, height)

  // 绘制背景（使用渐变）
  const gradient = ctx.value.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(width, height) / 2)
  gradient.addColorStop(0, '#1a1a2e')
  gradient.addColorStop(1, '#0f0f1a')
  ctx.value.fillStyle = gradient
  ctx.value.fillRect(0, 0, width, height)

  // 绘制外边界（参考原版实现）
  const boundaryRadius = (CONFIG.BLOCK_HEIGHT * CONFIG.ROWS) * (2 / Math.sqrt(3)) + CONFIG.HEX_WIDTH
  ctx.value.fillStyle = 'rgba(255, 255, 255, 0.02)'
  ctx.value.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.value.lineWidth = 2
  ctx.value.beginPath()
  for (let i = 0; i < 6; i++) {
    const theta = degToRad(60 * i)  // 边朝上
    const px = centerX + boundaryRadius * Math.cos(theta)
    const py = centerY + boundaryRadius * Math.sin(theta)
    if (i === 0) {
      ctx.value.moveTo(px, py)
    } else {
      ctx.value.lineTo(px, py)
    }
  }
  ctx.value.closePath()
  ctx.value.fill()
  ctx.value.stroke()

  // 只有当 mainHex 初始化后才绘制游戏元素
  if (!mainHex) return  // 游戏未开始，只显示背景

  // 绘制中心六边形
  mainHex.draw(ctx.value)

  // 绘制已固定的方块
  for (let side = 0; side < mainHex.sides; side++) {
    for (let i = 0; i < mainHex.blocks[side].length; i++) {
      const block = mainHex.blocks[side][i]
      if (!block.deleted || block.opacity > 0) {
        block.draw(ctx.value, centerX, centerY)
      }
    }
  }

  // 绘制下落的方块
  fallingBlocks.forEach(block => {
    block.draw(ctx.value, centerX, centerY)
  })
}

// ==================== 更新 ====================
const update = (dt) => {
  if (gameState.value !== 1) return

  // 更新六边形旋转动画
  if (mainHex) {
    mainHex.update(dt)
  }

  // 更新下落方块
  fallingBlocks.forEach(block => {
    block.update(dt)
  })

  // 更新已固定的方块（用于旋转动画和消除动画）
  if (mainHex) {
    for (let side = 0; side < mainHex.sides; side++) {
      for (let i = 0; i < mainHex.blocks[side].length; i++) {
        mainHex.blocks[side][i].update(dt)
      }
    }
  }

  // 碰撞检测
  fallingBlocks = fallingBlocks.filter(block => {
    if (mainHex.checkCollision(block)) {
      checkMatches()
      return false
    }
    return !block.settled
  })

  // 检查游戏结束
  if (mainHex.checkGameOver()) {
    endGame()
  }
}

// ==================== 游戏循环 ====================
const gameLoop = (currentTime) => {
  if (!lastTime) lastTime = currentTime
  const dt = ((currentTime - lastTime) / 16.666) * currentSpeed
  lastTime = currentTime

  update(dt)
  render()

  if (gameState.value === 1) {
    animationFrameId = requestAnimationFrame(gameLoop)
  }
}

// ==================== 游戏控制 ====================
const startGame = () => {
  gameState.value = 1
  score.value = 0
  combo.value = 0
  level.value = 1
  currentSpeed = CONFIG.INITIAL_SPEED
  fallingBlocks = []

  // 初始化六边形
  const centerX = canvas.value.width / 2
  const centerY = canvas.value.height / 2
  mainHex = new Hex(centerX, centerY, CONFIG.HEX_WIDTH)

  lastTime = 0
  gameLoop(0)

  // 定期生成方块
  spawnBlock()
  window.spawnInterval = setInterval(spawnBlock, 2000)
}

const endGame = () => {
  gameState.value = 2
  if (window.spawnInterval) {
    clearInterval(window.spawnInterval)
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }

  if (score.value > highScore.value) {
    highScore.value = score.value
    localStorage.setItem('hexTetris_highScore', highScore.value)
  }
}

const togglePause = () => {
  if (gameState.value === 1) {
    gameState.value = -1
    if (window.spawnInterval) {
      clearInterval(window.spawnInterval)
    }
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
    }
  } else if (gameState.value === -1) {
    gameState.value = 1
    lastTime = 0
    gameLoop(0)
    window.spawnInterval = setInterval(spawnBlock, 2000)
  }
}

const goBack = () => {
  if (gameState.value === 1) {
    togglePause()
  }
  router.push('/')
}

// ==================== 输入处理 ====================
const handleKeyDown = (event) => {
  if (gameState.value !== 1) {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (gameState.value === 0 || gameState.value === 2) {
        startGame()
      }
    }
    return
  }

  switch (event.key) {
    case 'ArrowLeft':
    case 'a':
    case 'A':
      event.preventDefault()
      mainHex.rotate(-1)
      break
    case 'ArrowRight':
    case 'd':
    case 'D':
      event.preventDefault()
      mainHex.rotate(1)
      break
    case 'p':
    case 'P':
    case 'Enter':
      event.preventDefault()
      togglePause()
      break
  }
}

// ==================== 生命周期 ====================
onMounted(() => {
  ctx.value = canvas.value.getContext('2d')
  canvas.value.width = 600
  canvas.value.height = 600

  window.addEventListener('keydown', handleKeyDown)

  // 加载最高分
  const savedHighScore = localStorage.getItem('hexTetris_highScore')
  if (savedHighScore) {
    highScore.value = parseInt(savedHighScore)
  }

  // 初始渲染
  render()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  if (window.spawnInterval) {
    clearInterval(window.spawnInterval)
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
})
</script>

<template>
  <div class="hex-tetris-container">
    <!-- 返回按钮 -->
    <button class="back-btn" @click="goBack" title="返回游戏列表">
      <span class="back-icon">←</span>
      <span class="back-text">返回</span>
    </button>

    <!-- 游戏画布 -->
    <div class="game-wrapper">
      <canvas ref="canvas" class="game-canvas"></canvas>

      <!-- 游戏信息面板 -->
      <div class="info-panel">
        <div class="info-item">
          <div class="info-label">分数</div>
          <div class="info-value">{{ score }}</div>
        </div>
        <div class="info-item">
          <div class="info-label">最高分</div>
          <div class="info-value">{{ highScore }}</div>
        </div>
        <div class="info-item" v-if="combo > 0">
          <div class="info-label">连击</div>
          <div class="info-value combo">{{ combo }}</div>
        </div>
      </div>

      <!-- 开始界面 -->
      <div v-if="gameState === 0" class="overlay">
        <div class="overlay-content">
          <h1>六边形俄罗斯方块</h1>
          <p>Hex Tetris</p>
          <button class="start-btn" @click="startGame">开始游戏</button>
          <div class="instructions">
            <h3>操作说明</h3>
            <p>← → 或 A D - 旋转六边形</p>
            <p>Enter - 开始/暂停</p>
            <p>三个或以上同色方块会消除</p>
          </div>
        </div>
      </div>

      <!-- 暂停界面 -->
      <div v-if="gameState === -1" class="overlay">
        <div class="overlay-content">
          <h2>已暂停</h2>
          <button class="start-btn" @click="togglePause">继续游戏</button>
        </div>
      </div>

      <!-- 游戏结束界面 -->
      <div v-if="gameState === 2" class="overlay">
        <div class="overlay-content">
          <h2>游戏结束</h2>
          <p class="final-score">最终分数: {{ score }}</p>
          <button class="start-btn" @click="startGame">再来一局</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hex-tetris-container {
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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

.game-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.game-canvas {
  border-radius: 10px;
  box-shadow: 0 0 30px rgba(102, 126, 234, 0.3);
}

.info-panel {
  display: flex;
  gap: 30px;
  padding: 15px 30px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.info-item {
  text-align: center;
}

.info-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 5px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.info-value {
  font-size: 24px;
  font-weight: 700;
  color: white;
}

.info-value.combo {
  color: #FFD700;
  animation: pulse 0.5s ease-in-out infinite alternate;
}

@keyframes pulse {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.1);
  }
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}

.overlay-content {
  text-align: center;
  color: white;
}

.overlay-content h1 {
  font-size: 36px;
  margin: 0 0 10px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.overlay-content h2 {
  font-size: 32px;
  margin: 0 0 20px 0;
}

.overlay-content p {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  margin: 5px 0 20px 0;
}

.final-score {
  font-size: 24px;
  color: #FFD700;
  font-weight: 700;
  margin: 10px 0 20px 0;
}

.start-btn {
  padding: 12px 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 25px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
}

.instructions {
  margin-top: 30px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  text-align: left;
}

.instructions h3 {
  margin: 0 0 15px 0;
  font-size: 18px;
  color: #667eea;
}

.instructions p {
  margin: 8px 0;
  font-size: 14px;
  line-height: 1.6;
}
</style>
