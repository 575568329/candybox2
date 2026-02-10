/**
 * 球球实体类
 * 球球大作战的核心实体
 */

export class Ball {
  static idCounter = 0

  constructor(x, y, mass, color, options = {}) {
    this.id = Ball.idCounter++
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
    this.friction = 0.95 // 摩擦力
    this.momentum = options.isEjector ? 0.98 : 0.9 // 动量保持

    // 状态
    this.alive = true
    this.isDying = false
    this.deathOpacity = 1
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
    if (this.isDying) {
      this.deathOpacity = Math.max(0, this.deathOpacity - deltaTime * 2)
      this.mass = Math.max(0, this.mass - deltaTime * 50) // 质量也迅速缩小
      if (this.deathOpacity <= 0) {
        this.alive = false
      }
      return // 死亡过程中停止移动和其他逻辑
    }

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

    // 平滑移动逻辑优化：组合目标速度和当前动量
    const speed = this.speed
    
    // 增加摩擦力和动量处理
    if (this.isEjector) {
      // 孢子主要受惯性影响，逐渐减速
      this.velocity.x *= this.momentum
      this.velocity.y *= this.momentum
    } else {
      // 普通球球：向目标速度靠拢
      const accel = 0.1
      this.velocity.x += (this.targetVelocity.x * speed - this.velocity.x) * accel
      this.velocity.y += (this.targetVelocity.y * speed - this.velocity.y) * accel
      
      // 额外的惯性衰减（如果没有任何目标速度）
      if (this.targetVelocity.x === 0 && this.targetVelocity.y === 0) {
        this.velocity.x *= this.friction
        this.velocity.y *= this.friction
      }
    }

    // 应用移动 (乘以 60 保持与原来大概一致的像素速度)
    this.x += this.velocity.x * deltaTime * 60
    this.y += this.velocity.y * deltaTime * 60

    // 边界限制
    this.constrainToMap(mapWidth, mapHeight)

    // 质量自然衰减（过大的球球衰减更快）
    if (this.mass > 1000) {
      const decayRate = 0.001 * (this.mass / 5000)
      this.mass *= (1 - decayRate * deltaTime)
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

    this.splitCooldown = 1.0 // 降低冷却到 1 秒

    // 质量减半
    const newMass = this.mass / 2
    this.mass = newMass

    // 确定弹出方向
    let dirX = this.targetVelocity.x
    let dirY = this.targetVelocity.y
    
    // 如果没有移动方向，随机一个
    if (dirX === 0 && dirY === 0) {
      const angle = Math.random() * Math.PI * 2
      dirX = Math.cos(angle)
      dirY = Math.sin(angle)
    }

    // 创建分身（向前方弹出）
    const splitBall = new Ball(
      this.x + dirX * this.radius,
      this.y + dirY * this.radius,
      newMass,
      this.color,
      {
        name: this.name,
        skin: this.skin,
        isAI: this.isAI
      }
    )

    // 分身有初始爆发速度
    splitBall.velocity.x = dirX * 25
    splitBall.velocity.y = dirY * 25
    
    // 原本体也获得一点反作用力或轻微位移？暂时保持原位
    return splitBall
  }

  /**
   * 吐球（发射小孢子）
   */
  eject() {
    if (this.ejectCooldown > 0) return null
    if (this.mass < 30) return null // 提高吐球门槛

    this.ejectCooldown = 0.2 // 降低连发冷却

    // 固定质量消耗
    const ejectMass = 15
    this.mass -= ejectMass

    // 确定方向
    let dirX = this.targetVelocity.x
    let dirY = this.targetVelocity.y
    if (dirX === 0 && dirY === 0) {
      const angle = Math.random() * Math.PI * 2
      dirX = Math.cos(angle)
      dirY = Math.sin(angle)
    }

    // 创建孢子
    const ejector = new Ball(
      this.x + dirX * (this.radius + 15),
      this.y + dirY * (this.radius + 15),
      ejectMass,
      this.color,
      { isEjector: true, name: '' }
    )

    // 孢子有很高的初始初速，随后因摩擦力减速
    ejector.velocity.x = dirX * 30
    ejector.velocity.y = dirY * 30

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
    if (this.isDying) return
    this.isDying = true
    // 立即停止所有物理运动
    this.velocity = { x: 0, y: 0 }
    this.targetVelocity = { x: 0, y: 0 }
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
    if (this.isDying) {
      ctx.globalAlpha = this.deathOpacity
    }

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
