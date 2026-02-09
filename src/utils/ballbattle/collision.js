/**
 * 碰撞检测系统
 */

/**
 * 圆形碰撞检测
 */
export function checkCircleCollision(ball1, ball2) {
  const dx = ball1.x - ball2.x
  const dy = ball1.y - ball2.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  return distance < ball1.radius + ball2.radius
}

/**
 * 球球与食物碰撞
 */
export function checkBallFoodCollision(ball, food) {
  const dx = ball.x - food.x
  const dy = ball.y - food.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  return distance < ball.radius + food.radius
}

/**
 * 检查球球是否可以吞噬另一个球球
 */
export function canEat(ball1, ball2) {
  // 必须比对方大至少20%
  if (ball1.mass <= ball2.mass * 1.2) {
    return false
  }

  // 检查碰撞
  return checkCircleCollision(ball1, ball2)
}

/**
 * 处理球球吞噬
 */
export function handleEat(predator, prey) {
  // 获得对方的质量（80%转换率，防止过快成长）
  const massGain = prey.mass * 0.8
  predator.gainMass(massGain)

  // 标记为被吞噬
  prey.getEaten()
}

/**
 * 处理球球与食物的吞噬
 */
export function handleFoodEat(ball, food) {
  ball.gainMass(food.mass)
  return true
}

/**
 * 检查球球与病毒碰撞
 */
export function checkVirusCollision(ball, virus) {
  const dx = ball.x - virus.x
  const dy = ball.y - virus.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  return distance < ball.radius + virus.radius
}

/**
 * 处理病毒碰撞效果
 */
export function handleVirusCollision(ball, virus) {
  // 如果球球比病毒小，无事发生
  if (ball.mass < virus.mass) {
    return null
  }

  // 如果球球比病毒大，会分裂成多个小球
  const splitCount = Math.min(8, Math.floor(ball.mass / virus.mass))
  const newMass = ball.mass / (splitCount + 1)

  const splitBalls = []

  for (let i = 0; i < splitCount; i++) {
    const angle = (i * Math.PI * 2) / splitCount
    const splitBall = {
      x: ball.x + Math.cos(angle) * ball.radius,
      y: ball.y + Math.sin(angle) * ball.radius,
      mass: newMass,
      color: ball.color,
      velocity: {
        x: Math.cos(angle) * 5,
        y: Math.sin(angle) * 5
      }
    }
    splitBalls.push(splitBall)
  }

  return splitBalls
}

/**
 * 批量碰撞检测（优化版）
 * 使用简单的空间分区优化
 */
export class CollisionGrid {
  constructor(width, height, cellSize) {
    this.width = width
    this.height = height
    this.cellSize = cellSize
    this.grid = new Map()
  }

  /**
   * 清空网格
   */
  clear() {
    this.grid.clear()
  }

  /**
   * 获取单元格键
   */
  getCellKey(x, y) {
    const cellX = Math.floor(x / this.cellSize)
    const cellY = Math.floor(y / this.cellSize)
    return `${cellX},${cellY}`
  }

  /**
   * 添加球球到网格
   */
  add(ball) {
    const cells = this.getBallCells(ball)
    cells.forEach(key => {
      if (!this.grid.has(key)) {
        this.grid.set(key, [])
      }
      this.grid.get(key).push(ball)
    })
  }

  /**
   * 获取球球占据的所有单元格
   */
  getBallCells(ball) {
    const cells = []
    const minX = Math.floor((ball.x - ball.radius) / this.cellSize)
    const maxX = Math.floor((ball.x + ball.radius) / this.cellSize)
    const minY = Math.floor((ball.y - ball.radius) / this.cellSize)
    const maxY = Math.floor((ball.y + ball.radius) / this.cellSize)

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        cells.push(`${x},${y}`)
      }
    }

    return cells
  }

  /**
   * 获取可能碰撞的球球
   */
  getPotentialCollisions(ball) {
    const cells = this.getBallCells(ball)
    const potentialBalls = new Set()

    cells.forEach(key => {
      const cellBalls = this.grid.get(key)
      if (cellBalls) {
        cellBalls.forEach(b => {
          if (b !== ball) {
            potentialBalls.add(b)
          }
        })
      }
    })

    return Array.from(potentialBalls)
  }

  /**
   * 检测所有碰撞
   */
  detectAllCollisions(balls) {
    this.clear()

    // 添加所有球球到网格
    balls.forEach(ball => this.add(ball))

    // 检测碰撞
    const collisions = []
    const checked = new Set()

    balls.forEach(ball1 => {
      const potentialBalls = this.getPotentialCollisions(ball1)

      potentialBalls.forEach(ball2 => {
        // 避免重复检测
        const key = ball1.id < ball2.id ? `${ball1.id}-${ball2.id}` : `${ball2.id}-${ball1.id}`
        if (checked.has(key)) return
        checked.add(key)

        if (checkCircleCollision(ball1, ball2)) {
          collisions.push([ball1, ball2])
        }
      })
    })

    return collisions
  }
}
