/**
 * AI控制器
 * 控制AI球球的行为
 * 优化逻辑：多威胁避让、分身猎杀、食物发育、病毒避让
 */

export class AIController {
  constructor(aiBall, gameMap, behavior = {}) {
    this.ball = aiBall
    this.map = gameMap

    // 行为参数
    this.behavior = {
      // 攻击性（0-1）: 影响追逐频率和分身猎杀意愿
      aggressiveness: behavior.aggressiveness || 0.5,
      // 躲避能力（0-1）: 影响发现威胁的距离和避让优先级
      evasion: behavior.evasion || 0.5,
      // 分身使用频率（0-1）
      splitUsage: behavior.splitUsage || 0.3,
      // 反应速度（毫秒）
      reactionTime: behavior.reactionTime || 500,
      // 预测能力（0-1）
      prediction: behavior.prediction || 0.3
    }

    // 状态
    this.state = 'wandering' // wandering, chasing, fleeing, eating, split_killing
    this.target = null
    this.lastDecision = 0
    this.decisionCooldown = this.behavior.reactionTime / 1000

    // 目标点（用于游走）
    this.wanderTarget = this.getRandomPosition()
    
    // 视觉范围
    this.visionRange = 800
  }

  /**
   * 更新AI决策
   */
  update(deltaTime, allBalls, foods, viruses = []) {
    this.lastDecision += deltaTime

    // 定期做出决策
    if (this.lastDecision >= this.decisionCooldown) {
      this.lastDecision = 0
      this.makeDecision(allBalls, foods, viruses)
    }

    // 执行当前状态的行为
    this.executeBehavior(allBalls, viruses)
  }

  /**
   * 做决策
   */
  makeDecision(allBalls, foods, viruses = []) {
    // 1. 环境感知
    const nearbyBalls = this.findNearbyBalls(allBalls, this.visionRange)
    const nearbyViruses = viruses.filter(v => this.getDistance(this.ball, v) < 500)

    // 2. 识别威胁 (比自己大 1.2 倍的球)
    const threats = nearbyBalls.filter(b => b.mass > this.ball.mass * 1.2)
    
    // 3. 识别猎物 (比自己小 0.8 倍的球)
    const prey = nearbyBalls.filter(b => b.mass < this.ball.mass * 0.8)

    // 4. 决策逻辑优先级

    // A. 逃跑优先级最高
    if (threats.length > 0) {
      this.state = 'fleeing'
      this.target = threats // 逃跑时处理多个威胁
      return
    }

    // B. 避让病毒 (如果自己足够大)
    if (this.ball.mass > 130) {
      const dangerousViruses = nearbyViruses.filter(v => this.getDistance(this.ball, v) < this.ball.radius + 50)
      if (dangerousViruses.length > 0) {
        this.state = 'fleeing'
        this.target = dangerousViruses
        return
      }
    }

    // C. 尝试分身猎杀 (Aggressive AI 特有)
    if (this.canUseSplit() && Math.random() < this.behavior.aggressiveness) {
      const splitTarget = prey.find(p => {
        const dist = this.getDistance(this.ball, p)
        // 分身距离大约是 radius * 4 到 6
        return dist < this.ball.radius * 5 && p.mass < (this.ball.mass / 2) * 0.8
      })
      if (splitTarget) {
        this.state = 'split_killing'
        this.target = splitTarget
        return
      }
    }

    // D. 追逐最近猎物
    if (prey.length > 0 && Math.random() < this.behavior.aggressiveness) {
      this.state = 'chasing'
      this.target = this.getClosestBall(prey)
      return
    }

    // E. 寻找食物发育
    const nearbyFood = this.findNearbyFood(foods, 400)
    if (nearbyFood.length > 0) {
      this.state = 'eating'
      this.target = this.getClosestFood(nearbyFood)
      return
    }

    // F. 随机游走
    this.state = 'wandering'
    if (Math.random() < 0.2 || this.getDistance(this.ball, this.wanderTarget) < 100) {
      this.wanderTarget = this.getRandomPosition()
    }
  }

  /**
   * 执行行为
   */
  executeBehavior(allBalls, viruses) {
    switch (this.state) {
      case 'wandering':
        this.ball.setTarget(this.wanderTarget.x, this.wanderTarget.y)
        break

      case 'eating':
        if (this.target) {
          this.ball.setTarget(this.target.x, this.target.y)
        }
        break

      case 'chasing':
        if (this.target && this.target.alive) {
          // 预测目标位置
          const predictedPos = this.predictPosition(this.target)
          this.ball.setTarget(predictedPos.x, predictedPos.y)
        } else {
          this.state = 'wandering'
        }
        break

      case 'split_killing':
        if (this.target && this.target.alive) {
          const predictedPos = this.predictPosition(this.target)
          this.ball.setTarget(predictedPos.x, predictedPos.y)
          // 触发分身
          this.ball.shouldSplit = true
        }
        this.state = 'chasing' // 猎杀后转为追逐
        break

      case 'fleeing':
        // 多威胁综合避让算法 (向量合成)
        const fleeVector = { x: 0, y: 0 }
        const sources = Array.isArray(this.target) ? this.target : [this.target]
        
        sources.forEach(src => {
          const dx = this.ball.x - src.x
          const dy = this.ball.y - src.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          // 距离越近，斥力越大 (平方反比)
          const force = 1000 / (dist * dist)
          fleeVector.x += (dx / dist) * force
          fleeVector.y += (dy / dist) * force
        })

        // 加上边界排斥力
        const margin = 200
        if (this.ball.x < margin) fleeVector.x += (margin / this.ball.x)
        if (this.ball.x > this.map.width - margin) fleeVector.x -= (margin / (this.map.width - this.ball.x))
        if (this.ball.y < margin) fleeVector.y += (margin / this.ball.y)
        if (this.ball.y > this.map.height - margin) fleeVector.y -= (margin / (this.map.height - this.ball.y))

        this.ball.setTarget(this.ball.x + fleeVector.x * 100, this.ball.y + fleeVector.y * 100)
        break
    }
  }

  /**
   * 预测目标位置
   */
  predictPosition(target) {
    if (this.behavior.prediction < 0.1) return { x: target.x, y: target.y }
    
    // 简单的线性预测
    const pTime = 0.5 * this.behavior.prediction
    return {
      x: target.x + (target.velocity?.x || 0) * 60 * pTime,
      y: target.y + (target.velocity?.y || 0) * 60 * pTime
    }
  }

  /**
   * 基础辅助方法
   */
  getDistance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))
  }

  findNearbyBalls(all, range) {
    return all.filter(b => b !== this.ball && b.alive && this.getDistance(this.ball, b) < range)
  }

  getClosestBall(balls) {
    return balls.reduce((closest, curr) => {
      const d = this.getDistance(this.ball, curr)
      return (!closest || d < this.getDistance(this.ball, closest)) ? curr : closest
    }, null)
  }

  findNearbyFood(foods, range) {
    return foods.filter(f => this.getDistance(this.ball, f) < range)
  }

  getClosestFood(foods) {
    return foods.reduce((closest, curr) => {
      const d = this.getDistance(this.ball, curr)
      return (!closest || d < this.getDistance(this.ball, closest)) ? curr : closest
    }, null)
  }

  getRandomPosition() {
    const m = 100
    return {
      x: m + Math.random() * (this.map.width - m * 2),
      y: m + Math.random() * (this.map.height - m * 2)
    }
  }

  canUseSplit() {
    return this.ball.splitCooldown <= 0 && this.ball.mass > 60 && !this.ball.shouldSplit
  }
}
