/**
 * 轻量级埋点追踪器
 * 核心功能：事件收集 + 定时同步
 *
 * v4.0：上报迁移到自建阿里云 tracker-server（纯追加 POST /collect/<token>/<project>），
 * 替代已失效的 getpantry.cloud（pantry 平台 2026-10 清理，GET-merge-POST 整段废弃）
 *
 * 事件类型缩写（与 ObjectConsole 兼容）：
 * - gs: game_start 游戏开始
 * - ge: game_end 游戏结束
 * - pv: page_view 页面访问
 * - ua: user_action 用户行为
 * - so: save_operation 存档操作
 * - stats: 统计汇总
 */
import { COLLECT_CONFIG } from '../config/collectConfig.js'

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

  // 同步到服务器（纯追加，服务端聚合并限制容量，客户端不再 GET-merge-POST）
  // useBeacon: 关页场景用 sendBeacon(text/plain 免预检)，失败时回写本地备份
  async sync(useBeacon = false) {
    if (!this.enabled) return

    // 合并上次退出前未发出的本地缓存
    const cached = localStorage.getItem('pending_analytics_events')
    if (cached) {
      try {
        const cachedEvents = JSON.parse(cached)
        if (Array.isArray(cachedEvents)) {
          this.events = [...cachedEvents, ...this.events]
        }
      } catch (e) {
        console.error('[埋点] 解析缓存失败:', e)
      }
      localStorage.removeItem('pending_analytics_events')
    }

    if (this.events.length === 0) return

    const eventsToSend = [...this.events]
    this.events = []

    const url = `${COLLECT_CONFIG.API}/collect/${COLLECT_CONFIG.TOKEN}/${COLLECT_CONFIG.PROJECT}`
    const body = JSON.stringify({ events: eventsToSend })

    const onFail = e => {
      console.error('[埋点] 同步失败:', e)
      // 失败时将事件放回队列
      this.events = [...eventsToSend, ...this.events]
      // 关页场景内存随页面销毁，回写本地备份供下次启动补发
      if (useBeacon) {
        localStorage.setItem('pending_analytics_events', JSON.stringify(this.events))
      }
    }

    try {
      if (useBeacon && navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'text/plain;charset=utf-8' })
        if (navigator.sendBeacon(url, blob)) {
          console.log('[埋点] sendBeacon 已提交', eventsToSend.length, '个事件')
          return
        }
        // 队列满返回 false，退回 fetch keepalive 兜底
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true
      })
      if (!res.ok) throw new Error(`collect ${res.status}`)
      console.log('[埋点] 同步成功', eventsToSend.length, '个事件')
    } catch (e) {
      onFail(e)
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

    // 页面关闭时确保结束会话并补发（sendBeacon + 失败本地备份）
    this._beforeUnloadHandler = () => {
      this.endGameSession()
      this.sync(true)
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
