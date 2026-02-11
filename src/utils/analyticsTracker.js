/**
 * 埋点追踪管理器（轻量版）
 * 用于追踪用户游戏行为和统计数据
 * 优化策略：减少数据量、降低提交频率、批量合并
 */

const PANTRY_API_BASE = 'https://getpantry.cloud/apiv1/pantry/9eafe9e6-8ff7-41ab-b111-ecabbc1685a7'
const BASKET_NAME = 'GAME'

export class AnalyticsTracker {
  constructor() {
    // 开发环境禁用埋点统计
    this.enabled = !import.meta.env.DEV

    if (!this.enabled) {
      console.log('[埋点] 开发环境已禁用埋点统计')
      return
    }

    this.sessionId = this.generateSessionId()
    this.userId = this.getUserId()
    this.currentSession = null
    this.pendingEvents = []
    this.syncInterval = null
    this.isOnline = navigator.onLine
    this.isSyncing = false // ✅ 修复问题3：并发控制标志
    this.throttledEvents = [] // ✅ 修复问题5：节流事件延迟队列

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
   * 检查埋点是否启用（开发环境禁用）
   */
  checkEnabled() {
    if (!this.enabled) {
      return false
    }
    return true
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
    if (!this.checkEnabled()) return null
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
    if (!this.checkEnabled()) return null
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
    if (!this.checkEnabled()) return
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
   * 追踪页面访问（带节流和延迟队列）
   */
  trackPageView(page, pageData = {}) {
    if (!this.checkEnabled()) return
    // ✅ 修复问题5：节流事件进入延迟队列而非直接丢弃
    if (this.shouldThrottle('page_view')) {
      // 加入延迟队列，后续在 sync() 中去重
      this.throttledEvents.push({
        type: 'pv',
        data: { p: page.substring(0, 10) },
        time: Date.now()
      })
      return
    }
    this.updateEventTime('page_view')

    const event = this.createEvent('pv', {
      p: page.substring(0, 10) // 页面名称缩写
    })

    this.addEvent(event)
  }

  /**
   * 追踪用户行为（带节流、统计和延迟队列）
   */
  trackUserAction(action, actionData = {}) {
    if (!this.checkEnabled()) return
    // 统计事件（无论是否节流都要统计）
    this.incrementEventStats(action, actionData)

    // ✅ 修复问题5：节流事件进入延迟队列
    if (this.shouldThrottle(action)) {
      this.throttledEvents.push({
        type: 'ua',
        data: {
          a: action.substring(0, 15),
          ...this.simplifyData(actionData)
        },
        time: Date.now()
      })
      return
    }
    this.updateEventTime(action)

    // 某些频繁事件只统计不立即记录（已经被上面的延迟队列处理）
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
   * 同步数据到服务器（修复版 - 防止数据丢失和并发问题）
   * - 添加并发控制，防止多个 sync() 同时执行
   * - 只在上传成功后才清空队列
   * - 处理节流事件队列（去重后添加）
   * - 只在成功时重置统计数据
   * - 保留30天内的数据，最多1000个事件
   * - 开发环境不执行同步
   */
  async sync() {
    if (!this.checkEnabled()) return

    // ✅ 修复问题3：并发控制
    if (this.isSyncing) {
      console.log('[埋点] 正在同步中，跳过本次请求')
      return
    }

    if (!this.isOnline || this.pendingEvents.length === 0) {
      return
    }

    this.isSyncing = true // ✅ 设置同步标志
    console.log(`[埋点] 开始同步 ${this.pendingEvents.length} 个事件`)

    try {
      // ✅ 修复问题5：处理节流事件队列（去重）
      if (this.throttledEvents.length > 0) {
        const dedupedThrottled = []
        const seenKeys = new Set()

        // 只保留每个类型的最后一个事件
        for (const event of this.throttledEvents) {
          const key = `${event.type}_${JSON.stringify(event.data)}`
          if (!seenKeys.has(key)) {
            dedupedThrottled.push(event)
            seenKeys.add(key)
          }
        }

        // 将去重后的节流事件转换为正式事件
        dedupedThrottled.forEach(e => {
          this.addEvent(this.createEvent(e.type, e.data))
        })

        this.throttledEvents = [] // 清空节流队列
        console.log(`[埋点] 添加了 ${dedupedThrottled.length} 个节流事件`)
      }

      // 添加统计数据到事件队列
      const statsToSync = { ...this.eventStats }
      if (Object.keys(statsToSync.gameClicks).length > 0 ||
          Object.keys(statsToSync.categoryViews).length > 0 ||
          statsToSync.searchCount > 0) {
        this.pendingEvents.push({
          t: 'stats',
          ts: Date.now(),
          d: {
            gc: statsToSync.gameClicks,
            cc: statsToSync.categoryViews,
            sc: statsToSync.searchCount
          }
        })
      }

      // 获取现有数据
      const existingData = await this.getExistingData()

      // ✅ 修复问题1：准备同步数据，但不清空队列
      const eventsToSync = [...this.pendingEvents]

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

      // ✅ 修复问题1：保存到 Pantry 并检查结果
      const success = await this.saveToPantry(updatedData)

      if (success) {
        // ✅ 修复问题1：只有成功才清空队列
        this.pendingEvents = []
        // ✅ 修复问题4：只有成功才重置统计数据
        this.eventStats = { gameClicks: {}, categoryViews: {}, searchCount: 0 }
        console.log('[埋点] 同步成功')
      } else {
        console.warn('[埋点] 上传失败，保留队列等待下次同步')
        // ✅ 修复问题1：失败时不清空队列，数据保留
      }
    } catch (error) {
      console.error('[埋点] 同步失败:', error)
      // ✅ 修复问题1：失败时不清空队列，数据保留
    } finally {
      this.isSyncing = false // ✅ 释放同步标志
    }
  }

  /**
   * 启动自动同步（优化版 - 降低频率）
   * @param {number} interval - 同步间隔（毫秒），默认5分钟
   */
  startAutoSync(interval = 300000) { // 默认5分钟（从30秒改为5分钟）
    if (!this.checkEnabled()) return

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
   * 初始化追踪器（修复版）
   * 开发环境不初始化
   */
  init() {
    if (!this.checkEnabled()) {
      console.log('[埋点] 开发环境跳过初始化')
      return
    }
    this.setupConnectivityListener()
    this.startAutoSync()

    // ✅ 修复问题2和6：页面卸载前的正确处理
    window.addEventListener('beforeunload', () => {
      // ✅ 修复问题6：确保游戏会话结束
      if (this.currentSession) {
        this.endGameSession()
      }

      // ✅ 修复问题2：使用 sendBeacon 确保数据能发送出去
      if (navigator.sendBeacon && this.pendingEvents.length > 0) {
        console.log('[埋点] 页面卸载，使用 sendBeacon 发送数据')

        // 合并节流事件和统计数据
        const eventsToSend = [...this.pendingEvents]

        // 添加统计数据
        if (Object.keys(this.eventStats.gameClicks).length > 0 ||
            Object.keys(this.eventStats.categoryViews).length > 0 ||
            this.eventStats.searchCount > 0) {
          eventsToSend.push({
            t: 'stats',
            ts: Date.now(),
            d: {
              gc: this.eventStats.gameClicks,
              cc: this.eventStats.categoryViews,
              sc: this.eventStats.searchCount
            }
          })
        }

        const data = {
          v: '2.0',
          u: this.userId,
          ls: Date.now(),
          te: eventsToSend.length,
          events: eventsToSend
        }

        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
        navigator.sendBeacon(`${PANTRY_API_BASE}/basket/${BASKET_NAME}`, blob)
      }
    })

    // ✅ 修复问题6：定期保存会话进度（每分钟）
    setInterval(() => {
      if (this.currentSession) {
        // 保存当前会话进度到 localStorage（作为备份）
        localStorage.setItem('game_session_temp', JSON.stringify({
          ...this.currentSession,
          saved: Date.now()
        }))
      }
    }, 60000)

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
