/**
 * 球球实体类
 * 球球大作战的核心实体
 */

export class Ball {
  constructor(x, y, mass, color, options = {}) {
    // 位置
    this.x = x
    this.y = y

    // 质量
    this.mass = mass
    this.startMass = mass

    // 外观
    this.color = color
    this.skin = options.skin || 'default'
    this.name = options.name || ''
    this.isAI = options.isAI || false

    // 速度
    this.velocity = { x: 0, y: 0 }
    this.targetVelocity = { x: 0, y: 0 }

    // 状态
    this.alive = true
    this.splitCooldown = 0
    this.ejectCooldown = 0

    // 视觉效果
    this.scale = 0 // 出生动画
    this.targetScale = 1
    this.pulsePhase = Math.random() * Math.PI * 2
  }

  /**
   * 获取半径（根据质量计算）
   */
  get radius() {
    return Math.sqrt(this.mass) * 2
  }

  /**
   * 获取移动速度（质量越大速度越慢）
   */
  get speed() {
    const baseSpeed = 5
    const massFactor = Math.pow(this.mass, 0.2)
    return baseSpeed / massFactor
  }

  /**
   * 更新球球状态
   */
  update(deltaTime, mapWidth, mapHeight) {
    // 出生动画
    if (this.scale < this.targetScale) {
      this.scale = Math.min(1, this.scale + deltaTime * 3)
    }

    // 更新冷却时间
    if (this.splitCooldown > 0) {
      this.splitCooldown -= deltaTime
    }
    if (this.ejectCooldown > 0) {
      this.ejectCooldown -= deltaTime
    }

    // 平滑移动
    this.velocity.x += (this.targetVelocity.x - this.velocity.x) * 0.1
    this.velocity.y += (this.targetVelocity.y - this.velocity.y) * 0.1

    // 应用移动
    this.x += this.velocity.x * this.speed
    this.y += this.velocity.y * this.speed

    // 边界限制
    this.constrainToMap(mapWidth, mapHeight)

    // 质量自然衰减（过大的球球）
    if (this.mass > 10000) {
      this.mass *= 0.9999
    }

    // 脉冲动画
    this.pulsePhase += deltaTime * 2
  }

  /**
   * 限制在地图范围内
   */
  constrainToMap(mapWidth, mapHeight) {
    const r = this.radius
    this.x = Math.max(r, Math.min(mapWidth - r, this.x))
    this.y = Math.max(r, Math.min(mapHeight - r, this.y))
  }

  /**
   * 设置移动目标
   */
  setTarget(x, y) {
    const dx = x - this.x
    const dy = y - this.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > 1) {
      this.targetVelocity.x = dx / distance
      this.targetVelocity.y = dy / distance
    } else {
      this.targetVelocity.x = 0
      this.targetVelocity.y = 0
    }
  }

  /**
   * 分身
   */
  split() {
    if (this.splitCooldown > 0) return null
    if (this.mass < 35) return null

    this.splitCooldown = 1.5 // 秒

    // 质量减半
    const newMass = this.mass / 2
    this.mass = newMass

    // 创建分身（向前方弹出）
    const splitBall = new Ball(
      this.x + this.targetVelocity.x * this.radius * 2,
      this.y + this.targetVelocity.y * this.radius * 2,
      newMass,
      this.color,
      {
        name: this.name,
        skin: this.skin,
        isAI: this.isAI
      }
    )

    // 分身有初始速度
    splitBall.velocity.x = this.targetVelocity.x * 10
    splitBall.velocity.y = this.targetVelocity.y * 10

    return splitBall
  }

  /**
   * 吐球（发射小孢子）
   */
  eject() {
    if (this.ejectCooldown > 0) return null
    if (this.mass < 20) return null

    this.ejectCooldown = 0.5 // 秒

    // 损失质量
    const ejectMass = Math.min(15, this.mass * 0.25)
    this.mass -= ejectMass

    // 创建孢子
    const ejector = new Ball(
      this.x + this.targetVelocity.x * this.radius,
      this.y + this.targetVelocity.y * this.radius,
      ejectMass,
      this.color,
      { isEjector: true }
    )

    // 孢子快速向前飞
    ejector.velocity.x = this.targetVelocity.x * 15
    ejector.velocity.y = this.targetVelocity.y * 15

    return ejector
  }

  /**
   * 吞噬另一个球球
   */
  canEat(other) {
    if (!other.alive) return false

    // 必须比对方大至少20%
    return this.mass > other.mass * 1.2
  }

  /**
   * 被吞噬
   */
  getEaten() {
    this.alive = false
  }

  /**
   * 绘制球球
   */
  draw(ctx, camera) {
    if (!this.alive) return

    // 计算屏幕位置
    const screenX = (this.x - camera.x) * camera.zoom + camera.centerX
    const screenY = (this.y - camera.y) * camera.zoom + camera.centerY
    const screenRadius = this.radius * camera.zoom * this.scale

    // 检查是否在视野内
    if (screenX + screenRadius < 0 || screenX - screenRadius > camera.width ||
        screenY + screenRadius < 0 || screenY - screenRadius > camera.height) {
      return
    }

    ctx.save()

    // 绘制球体
    this.drawBody(ctx, screenX, screenY, screenRadius)

    // 绘制名称
    if (this.name) {
      this.drawName(ctx, screenX, screenY, screenRadius)
    }

    ctx.restore()
  }

  /**
   * 绘制球体
   */
  drawBody(ctx, x, y, radius) {
    ctx.beginPath()

    // 脉冲效果
    const pulse = Math.sin(this.pulsePhase) * 0.02 + 1
    const r = radius * pulse

    // 根据皮肤绘制
    switch (this.skin) {
      case 'rainbow':
        this.drawRainbowSkin(ctx, x, y, r)
        break
      case 'metal':
        this.drawMetalSkin(ctx, x, y, r)
        break
      case 'ghost':
        this.drawGhostSkin(ctx, x, y, r)
        break
      default:
        this.drawDefaultSkin(ctx, x, y, r)
    }

    ctx.closePath()
  }

  /**
   * 默认皮肤
   */
  drawDefaultSkin(ctx, x, y, r) {
    // 渐变填充
    const gradient = ctx.createRadialGradient(
      x - r * 0.3, y - r * 0.3, 0,
      x, y, r
    )
    gradient.addColorStop(0, this.lightenColor(this.color, 30))
    gradient.addColorStop(1, this.color)

    ctx.fillStyle = gradient
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()

    // 边框
    ctx.strokeStyle = this.darkenColor(this.color, 20)
    ctx.lineWidth = 2
    ctx.stroke()

    // 高光
    ctx.beginPath()
    ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.2, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.fill()
  }

  /**
   * 彩虹皮肤
   */
  drawRainbowSkin(ctx, x, y, r) {
    const gradient = ctx.createLinearGradient(x - r, y - r, x + r, y + r)
    gradient.addColorStop(0, '#ff0000')
    gradient.addColorStop(0.2, '#ff7f00')
    gradient.addColorStop(0.4, '#ffff00')
    gradient.addColorStop(0.6, '#00ff00')
    gradient.addColorStop(0.8, '#0000ff')
    gradient.addColorStop(1, '#8b00ff')

    ctx.fillStyle = gradient
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 3
    ctx.stroke()
  }

  /**
   * 金属皮肤
   */
  drawMetalSkin(ctx, x, y, r) {
    const gradient = ctx.createRadialGradient(
      x - r * 0.3, y - r * 0.3, 0,
      x, y, r
    )
    gradient.addColorStop(0, '#ffffff')
    gradient.addColorStop(0.3, '#c0c0c0')
    gradient.addColorStop(0.7, '#808080')
    gradient.addColorStop(1, '#404040')

    ctx.fillStyle = gradient
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = '#303030'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  /**
   * 幽灵皮肤
   */
  drawGhostSkin(ctx, x, y, r) {
    ctx.globalAlpha = 0.6

    const gradient = ctx.createRadialGradient(
      x - r * 0.3, y - r * 0.3, 0,
      x, y, r
    )
    gradient.addColorStop(0, 'rgba(200, 220, 255, 0.8)')
    gradient.addColorStop(1, 'rgba(100, 150, 255, 0.6)')

    ctx.fillStyle = gradient
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = 'rgba(150, 200, 255, 0.8)'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.globalAlpha = 1
  }

  /**
   * 绘制名称
   */
  drawName(ctx, x, y, radius) {
    const fontSize = Math.max(12, Math.min(16, radius * 0.4))
    ctx.font = `bold ${fontSize}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // 文字阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillText(this.name, x + 1, y + radius + fontSize / 2 + 2)

    // 文字
    ctx.fillStyle = 'white'
    ctx.fillText(this.name, x, y + radius + fontSize / 2)
  }

  /**
   * 颜色变亮
   */
  lightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = (num >> 16) + amt
    const G = (num >> 8 & 0x00FF) + amt
    const B = (num & 0x0000FF) + amt
    return '#' + (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1)
  }

  /**
   * 颜色变暗
   */
  darkenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = (num >> 16) - amt
    const G = (num >> 8 & 0x00FF) - amt
    const B = (num & 0x0000FF) - amt
    return '#' + (
      0x1000000 +
      (R > 0 ? (R > 255 ? 255 : R) : 0) * 0x10000 +
      (G > 0 ? (G > 255 ? 255 : G) : 0) * 0x100 +
      (B > 0 ? (B > 255 ? 255 : B) : 0)
    ).toString(16).slice(1)
  }

  /**
   * 质量增加
   */
  gainMass(amount) {
    this.mass += amount
  }

  /**
   * 检查碰撞
   */
  collidesWith(other) {
    const dx = this.x - other.x
    const dy = this.y - other.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance < this.radius + other.radius
  }
}
