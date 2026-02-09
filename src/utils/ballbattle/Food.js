/**
 * 食物类
 * 地图上的彩豆
 */

export class Food {
  constructor(x, y, mass = 1) {
    this.x = x
    this.y = y
    this.mass = mass

    // 随机颜色
    this.color = this.getRandomColor()

    // 动画
    this.pulsePhase = Math.random() * Math.PI * 2
    this.scale = 0
    this.targetScale = 1
  }

  /**
   * 获取半径
   */
  get radius() {
    return Math.sqrt(this.mass) * 3
  }

  /**
   * 更新动画
   */
  update(deltaTime) {
    // 出生动画
    if (this.scale < this.targetScale) {
      this.scale = Math.min(1, this.scale + deltaTime * 5)
    }

    // 脉冲动画
    this.pulsePhase += deltaTime * 3
  }

  /**
   * 绘制食物
   */
  draw(ctx, camera) {
    const screenX = (this.x - camera.x) * camera.zoom + camera.centerX
    const screenY = (this.y - camera.y) * camera.zoom + camera.centerY
    const screenRadius = this.radius * camera.zoom * this.scale

    // 检查是否在视野内
    if (screenX + screenRadius < 0 || screenX - screenRadius > camera.width ||
        screenY + screenRadius < 0 || screenY - screenRadius > camera.height) {
      return
    }

    // 脉冲效果
    const pulse = Math.sin(this.pulsePhase) * 0.1 + 1

    ctx.save()
    ctx.beginPath()

    ctx.fillStyle = this.color
    ctx.arc(screenX, screenY, screenRadius * pulse, 0, Math.PI * 2)
    ctx.fill()

    // 发光效果
    ctx.shadowColor = this.color
    ctx.shadowBlur = 10
    ctx.fill()

    ctx.restore()
  }

  /**
   * 生成随机颜色
   */
  getRandomColor() {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
      '#F8B739', '#52B788', '#FF6F91', '#FFD93D'
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }
}

/**
 * 病毒类（刺球）
 */
export class Virus {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.mass = 150
    this.color = '#00FF00'
    this.spikes = 16
    this.rotation = 0
  }

  get radius() {
    return Math.sqrt(this.mass) * 2.5
  }

  update(deltaTime) {
    this.rotation += deltaTime * 0.5
  }

  draw(ctx, camera) {
    const screenX = (this.x - camera.x) * camera.zoom + camera.centerX
    const screenY = (this.y - camera.y) * camera.zoom + camera.centerY
    const screenRadius = this.radius * camera.zoom

    // 检查是否在视野内
    if (screenX + screenRadius < 0 || screenX - screenRadius > camera.width ||
        screenY + screenRadius < 0 || screenY - screenRadius > camera.height) {
      return
    }

    ctx.save()

    // 绘制刺球
    ctx.translate(screenX, screenY)
    ctx.rotate(this.rotation)

    ctx.beginPath()
    for (let i = 0; i < this.spikes * 2; i++) {
      const angle = (i * Math.PI) / this.spikes
      const radius = i % 2 === 0 ? screenRadius : screenRadius * 0.7
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.closePath()

    // 填充
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, screenRadius)
    gradient.addColorStop(0, '#00FF00')
    gradient.addColorStop(1, '#008000')
    ctx.fillStyle = gradient
    ctx.fill()

    // 边框
    ctx.strokeStyle = '#006400'
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.restore()
  }
}
