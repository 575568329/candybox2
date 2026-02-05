/**
 * 埋点追踪管理器（轻量版）
 * 用于追踪用户游戏行为和统计数据
 * 优化策略：减少数据量、降低提交频率、批量合并
 */

const PANTRY_API_BASE = 'https://getpantry.cloud/apiv1/pantry/9eafe9e6-8ff7-41ab-b111-ecabbc1685a7'
const BASKET_NAME = 'GAME'

export class AnalyticsTracker {
  constructor() {
    this.sessionId = this.generateSessionId()
    this.userId = this.getUserId()
    this.currentSession = null
    this.pendingEvents = []
    this.syncInterval = null
    this.isOnline = navigator.onLine

    // 节流控制：同一类型事件的最小间隔（毫秒）
    this.throttleIntervals = {
      search: 3000, // 搜索：3秒
      category_change: 2000, // 分类切换：2秒
      page_view: 5000 // 页面访问：5秒
    }
    this.lastEventTime = {}

    // 数据统计：合并相同事件
    this.eventStats = {
      gameClicks: {},
      categoryViews: {},
      searchCount: 0
    }
  }

  /**
   * 生成会话ID
   */
  generateSessionId() {
    return Date.now().toString()
  }

  /**
   * 获取/生成用户ID（匿名）
   */
  getUserId() {
    let userId = localStorage.getItem('game_user_id')
    if (!userId) {
      userId = Date.now().toString(36)
      localStorage.setItem('game_user_id', userId)
    }
    return userId
  }

  /**
   * 检查事件是否应该被节流
   */
  shouldThrottle(eventType) {
    const interval = this.throttleIntervals[eventType]
    if (!interval) return false

    const lastTime = this.lastEventTime[eventType] || 0
    const now = Date.now()
    return now - lastTime < interval
  }

  /**
   * 更新事件时间戳
   */
  updateEventTime(eventType) {
    this.lastEventTime[eventType] = Date.now()
  }

  /**
   * 创建轻量级事件（简化数据结构）
   */
  createEvent(eventType, eventData = {}) {
    return {
      t: eventType, // 类型缩写
      ts: Date.now(), // 时间戳（简化）
      d: this.simplifyData(eventData) // 简化数据
    }
  }

  /**
   * 简化数据，减少数据量
   */
  simplifyData(data) {
    // 只保留必要字段，移除冗余信息
    if (data.game) {
      return {
        g: data.game.id, // 只保留游戏ID
        n: data.game.name // 中文名称
      }
    }
    return data
  }

  /**
   * 开始游戏会话（简化版）
   */
  startGameSession(game) {
    const session = {
      g: game.id, // 游戏ID
      n: game.name, // 游戏名称
      s: Date.now(), // 开始时间
      e: null, // 结束时间
      d: 0, // 时长
      sv: false, // 是否有存档
      so: 0 // 存档操作次数
    }

    this.currentSession = session

    const event = this.createEvent('gs', {
      g: game.id,
      n: game.name
    })

    this.addEvent(event)
    return session
  }

  /**
   * 结束游戏会话（简化版）
   */
  endGameSession() {
    if (!this.currentSession) return

    this.currentSession.e = Date.now()
    this.currentSession.d = this.currentSession.e - this.currentSession.s

    const event = this.createEvent('ge', {
      g: this.currentSession.g,
      d: this.currentSession.d, // 时长（秒）
      sv: this.currentSession.sv,
      so: this.currentSession.so
    })

    this.addEvent(event)

    const completedSession = { ...this.currentSession }
    this.currentSession = null

    return completedSession
  }

  /**
   * 追踪存档操作（简化版）
   */
  trackSaveOperation(operation, gameId, saveData = {}) {
    if (this.currentSession) {
      this.currentSession.so++
      this.currentSession.sv = true
    }

    // 只在关键操作时记录（跳过频繁的自动保存）
    if (operation === 'auto_save') return

    const event = this.createEvent('so', {
      g: gameId,
      op: operation.substring(0, 3) // 操作类型缩写：del/cls/load
    })

    this.addEvent(event)
  }

  /**
   * 追踪页面访问（带节流）
   */
  trackPageView(page, pageData = {}) {
    // 节流检查
    if (this.shouldThrottle('page_view')) {
      return
    }
    this.updateEventTime('page_view')

    const event = this.createEvent('pv', {
      p: page.substring(0, 10) // 页面名称缩写
    })

    this.addEvent(event)
  }

  /**
   * 追踪用户行为（带节流和统计）
   */
  trackUserAction(action, actionData = {}) {
    // 节流检查
    if (this.shouldThrottle(action)) {
      // 即使被节流，也要统计次数
      this.incrementEventStats(action, actionData)
      return
    }
    this.updateEventTime(action)

    // 统计事件
    this.incrementEventStats(action, actionData)

    // 某些频繁事件只统计不立即记录
    if (action === 'search' || action === 'category_change') {
      return
    }

    const event = this.createEvent('ua', {
      a: action.substring(0, 15), // 动作名称截断
      ...this.simplifyData(actionData)
    })

    this.addEvent(event)
  }

  /**
   * 增加事件统计（用于批量合并）
   */
  incrementEventStats(action, data) {
    if (action === 'game_click') {
      const gameId = data.game?.id || 'unknown'
      this.eventStats.gameClicks[gameId] = (this.eventStats.gameClicks[gameId] || 0) + 1
    } else if (action === 'category_change') {
      const category = data.to || 'unknown'
      this.eventStats.categoryViews[category] = (this.eventStats.categoryViews[category] || 0) + 1
    } else if (action === 'search') {
      this.eventStats.searchCount++
    }
  }

  /**
   * 添加事件到队列
   */
  addEvent(event) {
    this.pendingEvents.push(event)

    // 限制队列大小，最多保留50个未同步的事件（从100减少到50）
    if (this.pendingEvents.length > 50) {
      this.pendingEvents = this.pendingEvents.slice(-50)
    }
  }

  /**
   * 从 Pantry 获取现有数据
   */
  async getExistingData() {
    try {
      const response = await fetch(`${PANTRY_API_BASE}/basket/${BASKET_NAME}`)
      if (response.ok) {
        const data = await response.json()
        return data
      }
      return null
    } catch (error) {
      console.error('[埋点] 获取现有数据失败:', error)
      return null
    }
  }

  /**
   * 将数据保存到 Pantry
   */
  async saveToPantry(data) {
    try {
      const response = await fetch(`${PANTRY_API_BASE}/basket/${BASKET_NAME}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        return true
      } else {
        console.error('[埋点] 保存到 Pantry 失败:', response.status)
        return false
      }
    } catch (error) {
      console.error('[埋点] 保存到 Pantry 时出错:', error)
      return false
    }
  }

  /**
   * 同步数据到服务器（优化版 - 防止数据膨胀）
   * - 拉取服务器数据后立即清空本地队列
   * - 只提交新事件，避免重复
   * - 只保留7天内的数据
   * - 限制服务器事件总数
   */
  async sync() {
    if (!this.isOnline || this.pendingEvents.length === 0) {
      return
    }

    try {
      // 添加统计数据到事件队列
      if (Object.keys(this.eventStats.gameClicks).length > 0 ||
          Object.keys(this.eventStats.categoryViews).length > 0 ||
          this.eventStats.searchCount > 0) {
        this.pendingEvents.push({
          t: 'stats',
          ts: Date.now(),
          d: {
            gc: this.eventStats.gameClicks,
            cc: this.eventStats.categoryViews,
            sc: this.eventStats.searchCount
          }
        })
        // 重置统计
        this.eventStats = { gameClicks: {}, categoryViews: {}, searchCount: 0 }
      }

      // 获取现有数据
      const existingData = await this.getExistingData()

      // 准备新数据（立即清空本地队列，避免重复提交）
      const eventsToSync = [...this.pendingEvents]
      this.pendingEvents = [] // ✅ 立即清空本地队列

      // 数据限制配置
      const MAX_EVENTS = 1000 // 最多保留1000个事件
      const DAYS_TO_KEEP = 30 // 只保留30天的数据
      const TIME_THRESHOLD = Date.now() - (DAYS_TO_KEEP * 24 * 60 * 60 * 1000)

      // 构建更新后的数据
      let updatedData

      if (existingData && existingData.events) {
        // 合并事件
        const allEvents = [...existingData.events, ...eventsToSync]

        // 过滤：只保留30天内的数据 + 最多1000个事件
        const filteredEvents = allEvents
          .filter(event => event.ts > TIME_THRESHOLD)
          .slice(-MAX_EVENTS)

        updatedData = {
          v: '2.0',
          u: this.userId,
          ls: Date.now(),
          te: allEvents.length, // 记录总事件数（包括被过滤的）
          events: filteredEvents
        }
      } else {
        // 如果没有现有数据，创建新数据
        updatedData = {
          v: '2.0',
          u: this.userId,
          c: Date.now(),
          ls: Date.now(),
          te: eventsToSync.length,
          events: eventsToSync
        }
      }

      // 保存到 Pantry
      await this.saveToPantry(updatedData)

      // 即使上传失败也不恢复队列，避免重复提交
    } catch (error) {
      console.error('[埋点] 同步失败:', error)
      // 失败时也不恢复队列，等待下次同步
    }
  }

  /**
   * 启动自动同步（优化版 - 降低频率）
   * @param {number} interval - 同步间隔（毫秒），默认5分钟
   */
  startAutoSync(interval = 300000) { // 默认5分钟（从30秒改为5分钟）
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    // 不立即执行同步，等待间隔后再执行
    // this.sync() // 移除立即同步

    // 定期同步
    this.syncInterval = setInterval(() => {
      this.sync()
    }, interval)

    // 监听页面可见性变化，但不立即同步（延迟5秒后同步）
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        setTimeout(() => this.sync(), 5000)
      }
    })
  }

  /**
   * 停止自动同步
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
      console.log('[埋点] 自动同步已停止')
    }
  }

  /**
   * 监听在线/离线状态
   */
  setupConnectivityListener() {
    window.addEventListener('online', () => {
      this.isOnline = true
      // 延迟同步，避免频繁切换
      setTimeout(() => this.sync(), 3000)
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
    })
  }

  /**
   * 初始化追踪器（简化版）
   */
  init() {
    this.setupConnectivityListener()
    this.startAutoSync()

    // 页面卸载前同步数据
    window.addEventListener('beforeunload', () => {
      if (this.currentSession) {
        this.endGameSession()
      }
      // 使用 sendBeacon 确保数据能发送出去
      if (navigator.sendBeacon) {
        this.sync()
      }
    })

    // 追踪初始页面访问
    this.trackPageView('app_start')
  }

  /**
   * 获取统计摘要（用于调试）
   */
  getStats() {
    return {
      pendingEvents: this.pendingEvents.length,
      eventStats: this.eventStats,
      currentSession: this.currentSession ? {
        gameId: this.currentSession.g,
        duration: Date.now() - this.currentSession.s
      } : null
    }
  }
}

// 导出单例
export const analyticsTracker = new AnalyticsTracker()
