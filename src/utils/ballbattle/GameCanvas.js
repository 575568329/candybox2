/**
 * 游戏Canvas核心
 * 管理游戏渲染和逻辑
 */

import { Ball } from './Ball'
import { Food, Virus } from './Food'
import { AIController } from './AI'
import { checkBallFoodCollision, handleFoodEat, canEat, handleEat, checkVirusCollision, handleVirusCollision, CollisionGrid } from './collision'

export class GameCanvas {
  constructor(canvas, options = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')

    // 游戏配置
    this.config = {
      mapWidth: 3000,
      mapHeight: 3000,
      foodCount: 500,
      virusCount: 10,
      ...options
    }

    // 游戏状态
    this.running = false
    this.paused = false
    this.gameOver = false
    this.gameMode = 'challenge' // challenge, endless, timed
    this.difficulty = 'normal' // easy, normal, hard

    // 实体
    this.player = null
    this.balls = []
    this.foods = []
    this.viruses = []
    this.aiControllers = []

    // 相机
    this.camera = {
      x: 0,
      y: 0,
      zoom: 1,
      centerX: this.canvas.width / 2,
      centerY: this.canvas.height / 2,
      width: this.canvas.width,
      height: this.canvas.height
    }

    // 输入
    this.mouseX = 0
    this.mouseY = 0

    // 统计
    this.stats = {
      kills: 0,
      survivalTime: 0,
      maxMass: 50
    }

    // 回调
    this.onGameOver = null
    this.onStatsUpdate = null

    // 时间
    this.lastTime = 0
    this.gameTime = 0

    // 无尽模式定时器
    this.endlessSpawner = null
  }

  /**
   * 初始化游戏
   */
  init(mode = 'challenge', difficulty = 'normal', aiPlayers = []) {
    this.gameMode = mode
    this.difficulty = difficulty
    this.balls = []
    this.foods = []
    this.viruses = []
    this.aiControllers = []
    this.gameTime = 0
    this.gameOver = false
    this.paused = false

    // 重置统计
    this.stats = {
      kills: 0,
      survivalTime: 0,
      maxMass: 50
    }

    // 创建玩家
    this.player = new Ball(
      this.config.mapWidth / 2,
      this.config.mapHeight / 2,
      50,
      '#667eea',
      { name: '你', skin: 'default' }
    )
    this.balls.push(this.player)

    // 添加AI玩家
    if (aiPlayers.length > 0) {
      this.addAIPlayers(aiPlayers)
    } else {
      // 生成基础AI
      this.generateBasicAI(20)
    }

    // 生成食物
    this.generateFood()

    // 生成病毒
    this.generateViruses()

    // 设置相机
    this.updateCamera()

    // 无尽模式：设置定时生成AI
    if (mode === 'endless') {
      this.setupEndlessMode()
    }

    // 限时模式：设置倒计时
    if (mode === 'timed') {
      this.timeLimit = 180 // 3分钟
    }

    this.running = true
  }

  /**
   * 添加AI玩家
   */
  addAIPlayers(aiDataList) {
    aiDataList.forEach(aiData => {
      const x = Math.random() * this.config.mapWidth
      const y = Math.random() * this.config.mapHeight

      const ball = new Ball(x, y, aiData.mass, this.getRandomColor(), {
        name: aiData.name,
        skin: aiData.skin || 'default',
        isAI: true
      })

      this.balls.push(ball)

      // 创建AI控制器，传递完整的配置对象
      const controller = new AIController(ball, this.config, aiData.behavior)
      this.aiControllers.push(controller)
    })
  }

  /**
   * 生成基础AI
   */
  generateBasicAI(count) {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * this.config.mapWidth
      const y = Math.random() * this.config.mapHeight
      const mass = 50 + Math.random() * 200

      const ball = new Ball(x, y, mass, this.getRandomColor(), {
        name: this.getRandomName(),
        skin: 'default',
        isAI: true
      })

      this.balls.push(ball)

      // 创建AI控制器
      const controller = new AIController(ball, this.config, {
        aggressiveness: 0.3 + Math.random() * 0.4,
        evasion: 0.3 + Math.random() * 0.4,
        splitUsage: 0.2 + Math.random() * 0.3,
        reactionTime: 400 + Math.random() * 400,
        prediction: Math.random() * 0.4
      })

      this.aiControllers.push(controller)
    }
  }

  /**
   * 生成食物
   */
  generateFood() {
    for (let i = 0; i < this.config.foodCount; i++) {
      this.spawnFood()
    }
  }

  /**
   * 生成单个食物
   */
  spawnFood() {
    const x = Math.random() * this.config.mapWidth
    const y = Math.random() * this.config.mapHeight
    this.foods.push(new Food(x, y))
  }

  /**
   * 生成病毒
   */
  generateViruses() {
    for (let i = 0; i < this.config.virusCount; i++) {
      const x = Math.random() * this.config.mapWidth
      const y = Math.random() * this.config.mapHeight
      this.viruses.push(new Virus(x, y))
    }
  }

  /**
   * 设置无尽模式
   */
  setupEndlessMode() {
    this.endlessSpawner = setInterval(() => {
      if (!this.running || this.gameOver) return

      // 每30秒生成一个新AI
      const mass = this.player.mass * (0.8 + Math.random() * 0.4)
      const ball = new Ball(
        Math.random() * this.config.mapWidth,
        Math.random() * this.config.mapHeight,
        mass,
        this.getRandomColor(),
        {
          name: this.getRandomName(),
          skin: 'default',
          isAI: true
        }
      )

      this.balls.push(ball)

      const controller = new AIController(ball, this.config, {
        aggressiveness: 0.5,
        evasion: 0.5,
        splitUsage: 0.3,
        reactionTime: 500,
        prediction: 0.3
      })

      this.aiControllers.push(controller)

      // 通知外部
      if (this.onAISpawn) {
        this.onAISpawn(ball.name)
      }
    }, 30000)
  }

  /**
   * 开始游戏循环
   */
  start() {
    this.running = true
    this.lastTime = performance.now()
    this.gameLoop()
  }

  /**
   * 游戏主循环
   */
  gameLoop = () => {
    if (!this.running) return

    const currentTime = performance.now()
    const deltaTime = (currentTime - this.lastTime) / 1000
    this.lastTime = currentTime

    if (!this.paused && !this.gameOver) {
      this.update(deltaTime)
    }

    this.render()

    requestAnimationFrame(this.gameLoop)
  }

  /**
   * 更新游戏逻辑
   */
  update(deltaTime) {
    this.gameTime += deltaTime

    // 更新统计
    this.stats.survivalTime = Math.floor(this.gameTime)
    if (this.player.mass > this.stats.maxMass) {
      this.stats.maxMass = Math.floor(this.player.mass)
    }

    // 更新玩家目标
    const worldMouseX = (this.mouseX - this.camera.centerX) / this.camera.zoom + this.camera.x
    const worldMouseY = (this.mouseY - this.camera.centerY) / this.camera.zoom + this.camera.y
    this.player.setTarget(worldMouseX, worldMouseY)

    // 更新所有球球
    this.balls.forEach(ball => {
      ball.update(deltaTime, this.config.mapWidth, this.config.mapHeight)

      // 检查AI分身
      if (ball.isAI && ball.shouldSplit) {
        ball.shouldSplit = false
        const splitBall = ball.split()
        if (splitBall) {
          this.balls.push(splitBall)
        }
      }
    })

    // 更新AI控制器
    this.aiControllers.forEach((controller, index) => {
      if (controller.ball.alive) {
        controller.update(deltaTime, this.balls, this.foods)
      } else {
        this.aiControllers.splice(index, 1)
      }
    })

    // 更新食物
    this.foods.forEach(food => food.update(deltaTime))

    // 更新病毒
    this.viruses.forEach(virus => virus.update(deltaTime))

    // 碰撞检测：球球与食物
    this.balls.forEach(ball => {
      if (!ball.alive) return

      for (let i = this.foods.length - 1; i >= 0; i--) {
        const food = this.foods[i]
        if (checkBallFoodCollision(ball, food)) {
          handleFoodEat(ball, food)
          this.foods.splice(i, 1)
          // 补充食物
          this.spawnFood()
        }
      }
    })

    // 碰撞检测：球球与球球
    for (let i = 0; i < this.balls.length; i++) {
      for (let j = i + 1; j < this.balls.length; j++) {
        const ball1 = this.balls[i]
        const ball2 = this.balls[j]

        if (!ball1.alive || !ball2.alive) continue

        // 检查是否可以吞噬
        if (canEat(ball1, ball2)) {
          handleEat(ball1, ball2)
          if (ball2 === this.player) {
            this.handlePlayerDeath()
          } else if (ball1 === this.player) {
            this.stats.kills++
          }
        } else if (canEat(ball2, ball1)) {
          handleEat(ball2, ball1)
          if (ball1 === this.player) {
            this.handlePlayerDeath()
          } else if (ball2 === this.player) {
            this.stats.kills++
          }
        }
      }
    }

    // 移除死亡的球球
    this.balls = this.balls.filter(ball => ball.alive)

    // 碰撞检测：球球与病毒
    this.balls.forEach(ball => {
      if (!ball.alive) return

      this.viruses.forEach(virus => {
        if (checkVirusCollision(ball, virus)) {
          const splitBalls = handleVirusCollision(ball, virus)
          if (splitBalls && ball === this.player) {
            // 玩家撞到病毒
            splitBalls.forEach(splitData => {
              const splitBall = new Ball(
                splitData.x,
                splitData.y,
                splitData.mass,
                ball.color,
                { name: ball.name, skin: ball.skin }
              )
              splitBall.velocity.x = splitData.velocity.x
              splitBall.velocity.y = splitData.velocity.y
              this.balls.push(splitBall)
            })
          }
        }
      })
    })

    // 更新相机
    this.updateCamera()

    // 检查游戏结束条件
    this.checkGameOver()

    // 更新统计回调
    if (this.onStatsUpdate) {
      this.onStatsUpdate(this.getStats())
    }
  }

  /**
   * 更新相机
   */
  updateCamera() {
    if (!this.player || !this.player.alive) return

    // 相机跟随玩家
    this.camera.x = this.player.x
    this.camera.y = this.player.y

    // 根据玩家大小调整缩放
    const targetZoom = Math.max(0.3, 1 - (this.player.mass - 50) / 5000)
    this.camera.zoom += (targetZoom - this.camera.zoom) * 0.05
  }

  /**
   * 检查游戏结束
   */
  checkGameOver() {
    if (this.gameOver) return

    // 挑战模式：玩家死亡
    if (this.gameMode === 'challenge' && !this.player.alive) {
      this.endGame()
    }

    // 无尽模式：玩家死亡
    if (this.gameMode === 'endless' && !this.player.alive) {
      this.endGame()
    }

    // 限时模式：时间到
    if (this.gameMode === 'timed') {
      if (this.gameTime >= this.timeLimit) {
        this.endGame()
      }
    }
  }

  /**
   * 处理玩家死亡
   */
  handlePlayerDeath() {
    // 玩家死亡会由 checkGameOver 处理
  }

  /**
   * 结束游戏
   */
  endGame() {
    this.gameOver = true
    this.running = false

    // 清除无尽模式定时器
    if (this.endlessSpawner) {
      clearInterval(this.endlessSpawner)
      this.endlessSpawner = null
    }

    if (this.onGameOver) {
      this.onGameOver(this.getStats())
    }
  }

  /**
   * 渲染
   */
  render() {
    const { ctx, canvas, camera } = this

    // 清空画布
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 绘制网格背景
    this.drawGrid()

    // 绘制地图边界
    this.drawMapBoundary()

    // 绘制食物
    this.foods.forEach(food => food.draw(ctx, camera))

    // 绘制病毒
    this.viruses.forEach(virus => virus.draw(ctx, camera))

    // 绘制球球（按质量排序，小的先画）
    const sortedBalls = [...this.balls].sort((a, b) => a.mass - b.mass)
    sortedBalls.forEach(ball => ball.draw(ctx, camera))

    // 绘制游戏UI
    this.drawUI()
  }

  /**
   * 绘制网格
   */
  drawGrid() {
    const { ctx, camera } = this
    const gridSize = 50 * camera.zoom

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
    ctx.lineWidth = 1

    // 计算可见范围
    const startX = Math.floor((camera.x - camera.centerX / camera.zoom) / 50) * 50
    const startY = Math.floor((camera.y - camera.centerY / camera.zoom) / 50) * 50
    const endX = camera.x + camera.centerX / camera.zoom
    const endY = camera.y + camera.centerY / camera.zoom

    for (let x = startX; x < endX; x += 50) {
      const screenX = (x - camera.x) * camera.zoom + camera.centerX
      ctx.beginPath()
      ctx.moveTo(screenX, 0)
      ctx.lineTo(screenX, this.canvas.height)
      ctx.stroke()
    }

    for (let y = startY; y < endY; y += 50) {
      const screenY = (y - camera.y) * camera.zoom + camera.centerY
      ctx.beginPath()
      ctx.moveTo(0, screenY)
      ctx.lineTo(this.canvas.width, screenY)
      ctx.stroke()
    }
  }

  /**
   * 绘制地图边界
   */
  drawMapBoundary() {
    const { ctx, camera } = this

    ctx.strokeStyle = '#ff0000'
    ctx.lineWidth = 5

    const x = (0 - camera.x) * camera.zoom + camera.centerX
    const y = (0 - camera.y) * camera.zoom + camera.centerY
    const w = this.config.mapWidth * camera.zoom
    const h = this.config.mapHeight * camera.zoom

    ctx.strokeRect(x, y, w, h)
  }

  /**
   * 绘制UI
   */
  drawUI() {
    const { ctx } = this

    // 排行榜（前10名）
    const sortedBalls = [...this.balls].sort((a, b) => b.mass - a.mass)
    const top10 = sortedBalls.slice(0, 10)

    let y = 20
    ctx.font = 'bold 14px Arial'
    ctx.textAlign = 'left'

    top10.forEach((ball, index) => {
      const isPlayer = ball === this.player
      const rank = index + 1

      ctx.fillStyle = isPlayer ? '#FFD700' : 'rgba(255, 255, 255, 0.8)'

      const text = `${rank}. ${ball.name || 'AI'} - ${Math.floor(ball.mass)}`
      ctx.fillText(text, 20, y)
      y += 20
    })

    // 玩家统计
    if (this.player && this.player.alive) {
      ctx.fillStyle = 'white'
      ctx.font = 'bold 16px Arial'
      ctx.textAlign = 'right'
      ctx.fillText(`质量: ${Math.floor(this.player.mass)}`, this.canvas.width - 20, 30)
      ctx.fillText(`击杀: ${this.stats.kills}`, this.canvas.width - 20, 55)
      ctx.fillText(`时间: ${this.formatTime(this.stats.survivalTime)}`, this.canvas.width - 20, 80)

      // 限时模式倒计时
      if (this.gameMode === 'timed') {
        const remaining = Math.max(0, this.timeLimit - this.gameTime)
        ctx.fillStyle = remaining < 30 ? '#ff6b6b' : 'white'
        ctx.fillText(`剩余: ${this.formatTime(remaining)}`, this.canvas.width - 20, 105)
      }
    }
  }

  /**
   * 格式化时间
   */
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * 玩家分身
   */
  playerSplit() {
    if (!this.player || !this.player.alive) return

    const splitBall = this.player.split()
    if (splitBall) {
      this.balls.push(splitBall)
    }
  }

  /**
   * 玩家吐球
   */
  playerEject() {
    if (!this.player || !this.player.alive) return

    const ejector = this.player.eject()
    if (ejector) {
      this.balls.push(ejector)
    }
  }

  /**
   * 设置鼠标位置
   */
  setMousePosition(x, y) {
    this.mouseX = x
    this.mouseY = y
  }

  /**
   * 暂停/继续
   */
  togglePause() {
    this.paused = !this.paused
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      score: Math.floor(this.player ? this.player.mass : 0),
      kills: this.stats.kills,
      survivalTime: this.stats.survivalTime,
      maxMass: this.stats.maxMass,
      rank: this.getRank()
    }
  }

  /**
   * 获取排名
   */
  getRank() {
    if (!this.player || !this.player.alive) return -1

    const sortedBalls = [...this.balls].sort((a, b) => b.mass - a.mass)
    return sortedBalls.indexOf(this.player) + 1
  }

  /**
   * 获取随机颜色
   */
  getRandomColor() {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  /**
   * 获取随机名称
   */
  getRandomName() {
    const names = [
      '萌新玩家', '球球杀手', '吞噬者', '小萌球',
      '无敌球球', '吞噬大师', '生存专家', '分裂狂魔',
      '彩豆收集者', '地图霸主', '隐形刺客', '极速球球'
    ]
    return names[Math.floor(Math.random() * names.length)]
  }

  /**
   * 清理资源
   */
  destroy() {
    this.running = false

    if (this.endlessSpawner) {
      clearInterval(this.endlessSpawner)
      this.endlessSpawner = null
    }
  }
}
