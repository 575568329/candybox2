/**
 * AI控制器
 * 控制AI球球的行为
 */

export class AIController {
  constructor(aiBall, gameMap, behavior = {}) {
    this.ball = aiBall
    this.map = gameMap

    // 行为参数
    this.behavior = {
      // 攻击性（0-1）
      aggressiveness: behavior.aggressiveness || 0.5,
      // 躲避能力（0-1）
      evasion: behavior.evasion || 0.5,
      // 分身使用频率（0-1）
      splitUsage: behavior.splitUsage || 0.3,
      // 反应速度（毫秒）
      reactionTime: behavior.reactionTime || 500,
      // 预测能力（0-1）
      prediction: behavior.prediction || 0.3
    }

    // 状态
    this.state = 'wandering' // wandering, chasing, fleeing
    this.target = null
    this.lastDecision = 0
    this.decisionCooldown = this.behavior.reactionTime / 1000

    // 目标点（用于游走）
    this.wanderTarget = this.getRandomPosition()
  }

  /**
   * 更新AI决策
   */
  update(deltaTime, allBalls, foods) {
    this.lastDecision += deltaTime

    // 定期做出决策
    if (this.lastDecision >= this.decisionCooldown) {
      this.lastDecision = 0
      this.makeDecision(allBalls, foods)
    }

    // 执行当前状态的行为
    this.executeBehavior(allBalls)
  }

  /**
   * 做决策
   */
  makeDecision(allBalls, foods) {
    // 找到附近的球球
    const nearbyBalls = this.findNearbyBalls(allBalls, 500)

    // 找到威胁（比自己大的球）
    const threats = nearbyBalls.filter(b => b.mass > this.ball.mass * 1.2)

    // 找到猎物（比自己小的球）
    const prey = nearbyBalls.filter(b => b.mass < this.ball.mass * 0.8)

    // 决策优先级
    if (threats.length > 0 && Math.random() < this.behavior.evasion) {
      // 躲避威胁
      this.state = 'fleeing'
      this.target = this.getFleeTarget(threats)
    } else if (prey.length > 0 && Math.random() < this.behavior.aggressiveness) {
      // 追逐猎物
      this.state = 'chasing'
      this.target = this.getClosestBall(prey)
    } else {
      // 游走
      this.state = 'wandering'
      this.target = null
      if (Math.random() < 0.3) {
        this.wanderTarget = this.getRandomPosition()
      }
    }
  }

  /**
   * 执行行为
   */
  executeBehavior(allBalls) {
    switch (this.state) {
      case 'wandering':
        this.ball.setTarget(this.wanderTarget.x, this.wanderTarget.y)

        // 接近目标点时生成新的
        const distToWander = this.getDistance(this.ball, this.wanderTarget)
        if (distToWander < 50) {
          this.wanderTarget = this.getRandomPosition()
        }
        break

      case 'chasing':
        if (this.target && this.target.alive) {
          // 预测目标位置
          if (this.behavior.prediction > 0.5) {
            const predictedPos = this.predictPosition(this.target)
            this.ball.setTarget(predictedPos.x, predictedPos.y)
          } else {
            this.ball.setTarget(this.target.x, this.target.y)
          }

          // 考虑使用分身
          if (this.canUseSplit() && Math.random() < this.behavior.splitUsage * 0.3) {
            // 这里需要游戏主循环处理分身
            this.ball.shouldSplit = true
          }
        } else {
          this.state = 'wandering'
        }
        break

      case 'fleeing':
        if (this.target) {
          const fleePos = this.getFleePosition(this.target)
          this.ball.setTarget(fleePos.x, fleePos.y)

          // 被追时考虑分身逃跑
          if (this.canUseSplit() && Math.random() < this.behavior.splitUsage * 0.5) {
            this.ball.shouldSplit = true
          }
        } else {
          this.state = 'wandering'
        }
        break
    }
  }

  /**
   * 找到附近的球球
   */
  findNearbyBalls(allBalls, range) {
    return allBalls.filter(ball => {
      if (ball === this.ball || !ball.alive) return false
      const dist = this.getDistance(this.ball, ball)
      return dist < range
    })
  }

  /**
   * 获取最近的球球
   */
  getClosestBall(balls) {
    let closest = null
    let minDist = Infinity

    balls.forEach(ball => {
      const dist = this.getDistance(this.ball, ball)
      if (dist < minDist) {
        minDist = dist
        closest = ball
      }
    })

    return closest
  }

  /**
   * 获取逃跑目标
   */
  getFleeTarget(threats) {
    // 找到最危险的威胁
    let mostDangerous = threats[0]
    let maxMass = threats[0].mass

    threats.forEach(ball => {
      if (ball.mass > maxMass) {
        maxMass = ball.mass
        mostDangerous = ball
      }
    })

    return mostDangerous
  }

  /**
   * 获取逃跑位置
   */
  getFleePosition(threat) {
    // 向威胁的反方向移动
    const dx = this.ball.x - threat.x
    const dy = this.ball.y - threat.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > 0) {
      const fleeDistance = 200
      return {
        x: this.ball.x + (dx / distance) * fleeDistance,
        y: this.ball.y + (dy / distance) * fleeDistance
      }
    }

    return this.getRandomPosition()
  }

  /**
   * 预测目标位置
   */
  predictPosition(target) {
    if (this.behavior.prediction < 0.3) {
      return { x: target.x, y: target.y }
    }

    // 简单的线性预测
    const predictionTime = this.behavior.prediction * 0.5 // 秒
    return {
      x: target.x + target.velocity.x * 60 * predictionTime,
      y: target.y + target.velocity.y * 60 * predictionTime
    }
  }

  /**
   * 获取随机位置
   */
  getRandomPosition() {
    const margin = 100
    return {
      x: margin + Math.random() * (this.map.width - margin * 2),
      y: margin + Math.random() * (this.map.height - margin * 2)
    }
  }

  /**
   * 计算距离
   */
  getDistance(ball1, ball2) {
    const dx = ball1.x - ball2.x
    const dy = ball1.y - ball2.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * 检查是否可以使用分身
   */
  canUseSplit() {
    return this.ball.splitCooldown <= 0 &&
           this.ball.mass >= 35 &&
           !this.ball.shouldSplit
  }

  /**
   * 重置状态
   */
  reset() {
    this.state = 'wandering'
    this.target = null
    this.lastDecision = 0
    this.wanderTarget = this.getRandomPosition()
  }
}
