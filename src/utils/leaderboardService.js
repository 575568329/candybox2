/**
 * 球球大作战 - 排行榜服务
 * 使用 Pantry.cloud API 实现全球排行榜功能
 */

const PANTRY_API_URL = 'https://getpantry.cloud/apiv1/public/9d5324b99c2062fbd1125725cfc4da3d'

/**
 * 排行榜数据结构
 */
export class LeaderboardService {
  constructor() {
    this.cache = null
    this.cacheTime = null
    this.cacheDuration = 60000 // 缓存60秒
    this.pendingRequests = new Map() // 防止并发请求
  }

  /**
   * 获取完整排行榜数据
   */
  async getLeaderboard() {
    // 检查缓存
    if (this.cache && this.cacheTime && (Date.now() - this.cacheTime < this.cacheDuration)) {
      return this.cache
    }

    // 防止并发请求
    const cacheKey = 'getLeaderboard'
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)
    }

    const promise = this._fetchLeaderboard()
    this.pendingRequests.set(cacheKey, promise)

    try {
      const result = await promise
      return result
    } finally {
      this.pendingRequests.delete(cacheKey)
    }
  }

  /**
   * 内部获取排行榜数据
   */
  async _fetchLeaderboard() {
    try {
      const response = await fetch(PANTRY_API_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // 验证数据结构
      if (!data.scores || !Array.isArray(data.scores)) {
        console.warn('[排行榜] 数据格式异常，初始化空数据')
        return { scores: [], lastUpdated: new Date().toISOString() }
      }

      // 更新缓存
      this.cache = data
      this.cacheTime = Date.now()

      return data
    } catch (error) {
      console.error('[排行榜] 获取数据失败:', error)

      // 如果有缓存，返回缓存数据
      if (this.cache) {
        console.warn('[排行榜] 使用缓存数据')
        return this.cache
      }

      // 返回空数据
      return { scores: [], lastUpdated: new Date().toISOString() }
    }
  }

  /**
   * 提交成绩到排行榜
   */
  async submitScore(scoreData) {
    try {
      // 验证必填字段
      if (!scoreData.playerName || !scoreData.score) {
        throw new Error('缺少必填字段：playerName 或 score')
      }

      // 构造提交数据
      const newScore = {
        id: this._generateId(),
        playerName: this._sanitizePlayerName(scoreData.playerName),
        score: Math.floor(scoreData.score), // 确保是整数
        kills: scoreData.kills || 0,
        survivalTime: scoreData.survivalTime || 0,
        mode: scoreData.mode || 'challenge',
        difficulty: scoreData.difficulty || 'normal',
        timestamp: new Date().toISOString(),
        playerData: {
          skin: scoreData.skin || 'default',
          maxMass: scoreData.maxMass || scoreData.score,
          ...scoreData.playerData
        }
      }

      // 获取当前排行榜数据
      const currentData = await this.getLeaderboard()

      // 添加新成绩
      currentData.scores.push(newScore)

      // 排序并限制条数（保留前1000名）
      currentData.scores.sort((a, b) => b.score - a.score)
      currentData.scores = currentData.scores.slice(0, 1000)
      currentData.lastUpdated = new Date().toISOString()

      // 上传到 Pantry
      const response = await fetch(PANTRY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(currentData)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // 清除缓存
      this.cache = null
      this.cacheTime = null

      // 返回提交的成绩和排名
      const rank = currentData.scores.findIndex(s => s.id === newScore.id) + 1

      return {
        success: true,
        score: newScore,
        rank,
        message: `成绩已提交！排名: ${rank}`
      }
    } catch (error) {
      console.error('[排行榜] 提交成绩失败:', error)
      return {
        success: false,
        error: error.message,
        message: '提交失败，请稍后重试'
      }
    }
  }

  /**
   * 获取排行榜前N名
   */
  async getTopScores(limit = 100, mode = 'all', difficulty = 'all') {
    const data = await this.getLeaderboard()
    let scores = [...data.scores]

    // 按模式筛选
    if (mode !== 'all') {
      scores = scores.filter(s => s.mode === mode)
    }

    // 按难度筛选
    if (difficulty !== 'all') {
      scores = scores.filter(s => s.difficulty === difficulty)
    }

    // 返回前N名
    return scores.slice(0, limit)
  }

  /**
   * 获取随机玩家数据（用于AI）
   */
  async getRandomPlayers(count = 10, minScore = 1000) {
    const data = await this.getLeaderboard()
    let scores = data.scores.filter(s => s.score >= minScore)

    // 如果数据不足，返回所有
    if (scores.length === 0) {
      console.warn('[排行榜] 没有符合条件的玩家数据')
      return []
    }

    // 随机打乱
    const shuffled = this._shuffleArray([...scores])

    // 返回指定数量
    return shuffled.slice(0, Math.min(count, shuffled.length))
  }

  /**
   * 获取玩家排名
   */
  async getPlayerRank(playerName, score) {
    const data = await this.getLeaderboard()

    // 找到所有相同分数的玩家
    const sameScorePlayers = data.scores.filter(s => s.score === score)

    if (sameScorePlayers.length === 0) {
      return null
    }

    // 获取第一个匹配的排名
    const rank = data.scores.findIndex(s => s.id === sameScorePlayers[0].id) + 1

    return {
      rank,
      totalPlayers: data.scores.length,
      percentage: ((data.scores.length - rank + 1) / data.scores.length * 100).toFixed(1)
    }
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache = null
    this.cacheTime = null
  }

  /**
   * 生成唯一ID
   */
  _generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 清理玩家名称（防止XSS）
   */
  _sanitizePlayerName(name) {
    // 移除HTML标签和特殊字符
    const clean = name
      .replace(/<[^>]*>/g, '')
      .replace(/[<>\"']/g, '')
      .trim()

    // 限制长度
    return clean.substring(0, 20) || '匿名玩家'
  }

  /**
   * 随机打乱数组
   */
  _shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }
}

// 导出单例
export const leaderboardService = new LeaderboardService()

// 便捷方法
export const submitScore = (data) => leaderboardService.submitScore(data)
export const getLeaderboard = () => leaderboardService.getLeaderboard()
export const getTopScores = (limit, mode, difficulty) => leaderboardService.getTopScores(limit, mode, difficulty)
export const getRandomPlayers = (count, minScore) => leaderboardService.getRandomPlayers(count, minScore)
