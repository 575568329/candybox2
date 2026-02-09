/**
 * AI玩家生成器
 * 从排行榜数据生成AI敌人
 */

import { leaderboardService } from './leaderboardService.js'

/**
 * AI玩家配置
 */
export class AIPlayerGenerator {
  constructor() {
    this.cachedPlayers = []
    this.lastFetch = 0
    this.fetchInterval = 300000 // 5分钟更新一次
  }

  /**
   * 生成AI玩家
   */
  async generateAIPlayers(config = {}) {
    const {
      count = 10,
      minScore = 1000,
      includeBasic = true, // 是否包含基础AI（没有排行榜数据时）
      difficulty = 'normal' // easy, normal, hard
    } = config

    // 获取排行榜玩家
    const leaderboardPlayers = await this._getLeaderboardPlayers(count, minScore)

    // 生成AI列表
    let aiPlayers = []

    // 1. 添加排行榜玩家AI
    aiPlayers = aiPlayers.concat(
      leaderboardPlayers.map(player => this._createPlayerFromLeaderboard(player, difficulty))
    )

    // 2. 如果数量不足，添加基础AI
    if (includeBasic && aiPlayers.length < count) {
      const basicCount = count - aiPlayers.length
      const basicAI = this._generateBasicAI(basicCount, difficulty)
      aiPlayers = aiPlayers.concat(basicAI)
    }

    return aiPlayers
  }

  /**
   * 在无尽模式中动态添加AI
   */
  async spawnPlayerAI(currentTime, minMass = 500) {
    // 根据时间逐渐增加AI质量
    const timeBonus = Math.floor(currentTime / 60) * 100 // 每分钟增加100质量

    const leaderboardPlayers = await leaderboardService.getRandomPlayers(
      5,
      Math.max(minScore, minMass + timeBonus)
    )

    if (leaderboardPlayers.length > 0) {
      const randomPlayer = leaderboardPlayers[Math.floor(Math.random() * leaderboardPlayers.length)]
      return this._createPlayerFromLeaderboard(randomPlayer, 'normal')
    }

    // 没有排行榜数据时返回基础AI
    return this._generateBasicAI(1, 'normal')[0]
  }

  /**
   * 获取排行榜玩家数据
   */
  async _getLeaderboardPlayers(count, minScore) {
    const now = Date.now()

    // 定期更新缓存
    if (now - this.lastFetch > this.fetchInterval || this.cachedPlayers.length === 0) {
      try {
        this.cachedPlayers = await leaderboardService.getRandomPlayers(count * 2, minScore)
        this.lastFetch = now
      } catch (error) {
        console.error('[AI生成器] 获取排行榜玩家失败:', error)
        return []
      }
    }

    return this.cachedPlayers.slice(0, count)
  }

  /**
   * 从排行榜玩家创建AI
   */
  _createPlayerFromLeaderboard(player, difficulty) {
    const difficultyMultiplier = this._getDifficultyMultiplier(difficulty)

    return {
      // 基本信息
      id: `ai_${player.id}`,
      name: player.playerName,
      isAI: true,
      isLeaderboardPlayer: true,

      // 游戏属性
      mass: Math.floor(player.score * 0.1 * difficultyMultiplier), // 质量基于排行榜分数
      maxMass: player.playerData?.maxMass || player.score,
      skin: player.playerData?.skin || 'default',

      // AI行为参数
      behavior: {
        // 攻击性（0-1）
        aggressiveness: this._clamp(player.kills / 50, 0.3, 0.9),

        // 躲避能力（0-1）
        evasion: this._clamp(player.survivalTime / 300, 0.4, 0.9),

        // 分身使用频率
        splitUsage: this._clamp(player.score / 20000, 0.2, 0.8),

        // 反应速度（毫秒）
        reactionTime: this._clamp(500 - player.score / 100, 100, 800),

        // 预测能力（0-1）
        prediction: this._clamp(player.score / 30000, 0.1, 0.7)
      },

      // 难度调整
      difficulty: difficulty,
      difficultyMultiplier: difficultyMultiplier,

      // 统计数据（用于显示）
      stats: {
        originalScore: player.score,
        originalKills: player.kills,
        originalSurvivalTime: player.survivalTime,
        rank: player.rank || '未知'
      }
    }
  }

  /**
   * 生成基础AI
   */
  _generateBasicAI(count, difficulty) {
    const aiList = []
    const names = [
      '萌新玩家', '球球杀手', '吞噬者', '小萌球',
      '无敌球球', '吞噬大师', '生存专家', '分裂狂魔',
      '彩豆收集者', '地图霸主', '隐形刺客', '极速球球'
    ]

    const skins = ['default', 'rainbow', 'metal', 'ghost']

    for (let i = 0; i < count; i++) {
      const baseMass = 50 + Math.random() * 200
      const difficultyMultiplier = this._getDifficultyMultiplier(difficulty)

      aiList.push({
        id: `ai_basic_${Date.now()}_${i}`,
        name: names[Math.floor(Math.random() * names.length)],
        isAI: true,
        isLeaderboardPlayer: false,

        mass: Math.floor(baseMass * difficultyMultiplier),
        maxMass: Math.floor(baseMass * 3 * difficultyMultiplier),
        skin: skins[Math.floor(Math.random() * skins.length)],

        behavior: {
          aggressiveness: 0.3 + Math.random() * 0.4,
          evasion: 0.3 + Math.random() * 0.4,
          splitUsage: 0.2 + Math.random() * 0.3,
          reactionTime: 400 + Math.random() * 400,
          prediction: Math.random() * 0.4
        },

        difficulty: difficulty,
        difficultyMultiplier: difficultyMultiplier,

        stats: {
          originalScore: 0,
          originalKills: 0,
          originalSurvivalTime: 0,
          rank: null
        }
      })
    }

    return aiList
  }

  /**
   * 获取难度倍数
   */
  _getDifficultyMultiplier(difficulty) {
    const multipliers = {
      easy: 0.7,
      normal: 1.0,
      hard: 1.5
    }
    return multipliers[difficulty] || 1.0
  }

  /**
   * 限制数值范围
   */
  _clamp(value, min, max) {
    return Math.min(Math.max(value, min), max)
  }
}

// 导出单例
export const aiPlayerGenerator = new AIPlayerGenerator()

// 便捷方法
export const generateAIPlayers = (config) => aiPlayerGenerator.generateAIPlayers(config)
export const spawnPlayerAI = (currentTime, minMass) => aiPlayerGenerator.spawnPlayerAI(currentTime, minMass)
