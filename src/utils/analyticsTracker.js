/**
 * 轻量级埋点追踪器
 * 核心功能：事件收集 + 定时同步
 * 
 * 事件类型缩写（与 ObjectConsole 兼容）：
 * - gs: game_start 游戏开始
 * - ge: game_end 游戏结束
 * - pv: page_view 页面访问
 * - ua: user_action 用户行为
 * - so: save_operation 存档操作
 * - stats: 统计汇总
 */

const API_URL = 'https://getpantry.cloud/apiv1/pantry/9eafe9e6-8ff7-41ab-b111-ecabbc1685a7/basket/GAME'

class AnalyticsTracker {
  constructor() {
    this.enabled = !import.meta.env.DEV
    this.events = []
    this.userId = this.getUserId()
    this.syncTimer = null
    this.currentGame = null
    this.sessionStart = 0
    // 存储事件监听器引用以便清理
    this._beforeUnloadHandler = null
    this._visibilityChangeHandler = null
  }

  getUserId() {
    let id = localStorage.getItem('game_user_id')
    if (!id) {
      id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
      localStorage.setItem('game_user_id', id)
    }
    return id
  }

  // 记录事件（兼容 ObjectConsole 格式）
  track(type, data = {}) {
    if (!this.enabled) return
    this.events.push({
      t: type,
      u: this.userId,
      ts: Date.now(),
      d: data
    })

    // 队列过大时强制同步
    if (this.events.length > 100) {
      this.sync()
    }
  }

  // 游戏会话开始
  startGameSession(game) {
    this.track('gs', { g: game.id, n: game.name })
    this.currentGame = game
    this.sessionStart = Date.now()
  }

  // 游戏会话结束
  endGameSession() {
    if (this.currentGame) {
      const duration = this.sessionStart > 0 ? Math.floor((Date.now() - this.sessionStart) / 1000) : 0
      this.track('ge', { 
        g: this.currentGame.id,
        d: duration // 添加时长（秒）
      })
      this.currentGame = null
      this.sessionStart = 0
    }
  }

  // 页面访问
  trackPageView(page) {
    this.track('pv', { p: page })
  }

  // 用户行为
  trackUserAction(action, data = {}) {
    this.track('ua', { a: action, ...data })
  }

  // 存档操作
  trackSaveOperation(op, gameId) {
    this.track('so', { op, g: gameId })
  }

  // 同步到服务器
  async sync() {
    if (!this.enabled || (this.events.length === 0 && !localStorage.getItem('pending_analytics_events'))) return

    // 合并本地缓存
    const cached = localStorage.getItem('pending_analytics_events')
    if (cached) {
      try {
        const cachedEvents = JSON.parse(cached)
        if (Array.isArray(cachedEvents)) {
          this.events = [...cachedEvents, ...this.events]
        }
        localStorage.removeItem('pending_analytics_events')
      } catch (e) {
        console.error('[埋点] 解析缓存失败:', e)
      }
    }

    if (this.events.length === 0) return

    const eventsToSend = [...this.events]
    this.events = []

    try {
      // 获取现有数据
      const res = await fetch(API_URL)
      const existingData = res.ok ? await res.json() : { events: [] }

      // --- v3.1 逻辑：统计摘要和数据保留策略 ---
      const MAX_EVENTS = 10000 
      const DAYS_TO_KEEP = 60 
      const TIME_THRESHOLD = Date.now() - (DAYS_TO_KEEP * 24 * 60 * 60 * 1000)

      // 更新用户表
      const users = (existingData && existingData.users) ? { ...existingData.users } : {}
      users[this.userId] = Date.now()

      // 过滤活跃用户
      for (const id in users) {
        if (users[id] < TIME_THRESHOLD) delete users[id]
      }

      // 构建统计摘要
      const today = new Date().toISOString().split('T')[0]
      const summary = (existingData && existingData.summary) ? { ...existingData.summary } : {
        totalUsers: 0,
        gameStats: {},
        dailyActive: {}
      }

      summary.totalUsers = Object.keys(users).length

      if (!summary.dailyActive[today]) summary.dailyActive[today] = []
      if (!summary.dailyActive[today].includes(this.userId)) {
        summary.dailyActive[today].push(this.userId)
      }

      // 更新游戏统计
      eventsToSend.forEach(event => {
        if (event.t === 'ge' && event.d && event.d.g) {
          const { g, d } = event.d
          if (!summary.gameStats[g]) summary.gameStats[g] = { p: 0, d: 0 }
          summary.gameStats[g].p += 1
          summary.gameStats[g].d += (d || 0)
        }
      })

      // 清理 DAU (保留30天)
      const dauLimit = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      for (const date in summary.dailyActive) {
        if (date < dauLimit) delete summary.dailyActive[date]
      }

      // 合并并过滤事件
      const allEvents = [...(existingData.events || []), ...eventsToSend]
      const filteredEvents = allEvents
        .filter(event => event.ts > TIME_THRESHOLD)
        .slice(-MAX_EVENTS)

      const updated = {
        v: '3.1',
        u: this.userId,
        users: users,
        summary: summary,
        ls: Date.now(),
        events: filteredEvents
      }

      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      })

      console.log('[埋点] 同步成功', eventsToSend.length, '个事件')
    } catch (e) {
      console.error('[埋点] 同步失败:', e)
      // 失败时将事件放回队列
      this.events = [...eventsToSend, ...this.events]
    }
  }

  // 初始化
  init() {
    if (!this.enabled) {
      console.log('[埋点] 开发环境已禁用')
      return
    }

    console.log('[埋点] 初始化完成，用户ID:', this.userId)

    // 每5分钟同步一次
    this.syncTimer = setInterval(() => this.sync(), 300000)

    // 页面关闭时确保结束会话并保存
    this._beforeUnloadHandler = () => {
      this.endGameSession()

      if (this.events.length > 0) {
        localStorage.setItem('pending_analytics_events', JSON.stringify(this.events))
      }
    }
    window.addEventListener('beforeunload', this._beforeUnloadHandler)

    // 启动时尝试同步一次（包含加载缓存）
    this.sync()

    // 页面可见性变化时同步
    this._visibilityChangeHandler = () => {
      if (document.hidden) {
        this.sync()
      }
    }
    document.addEventListener('visibilitychange', this._visibilityChangeHandler)
  }

  // 销毁实例，清理事件监听器
  destroy() {
    this.stopAutoSync()
    if (this._beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this._beforeUnloadHandler)
      this._beforeUnloadHandler = null
    }
    if (this._visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this._visibilityChangeHandler)
      this._visibilityChangeHandler = null
    }
  }

  // 停止自动同步
  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }
  }

  // 获取统计信息（调试用）
  getStats() {
    return {
      enabled: this.enabled,
      userId: this.userId,
      pendingEvents: this.events.length,
      currentGame: this.currentGame,
      sessionStart: this.sessionStart
    }
  }
}

// 导出单例
export const analyticsTracker = new AnalyticsTracker()

export default analyticsTracker
