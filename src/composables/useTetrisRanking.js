/**
 * 俄罗斯方块排行榜功能
 * v4.0：迁移到自建阿里云 tracker-server（getpantry.cloud 已失效）
 * - 上榜走 POST /rank/<token>/tetris，合并逻辑（排序/top3000/每人3条）全部由服务端完成
 * - userKey 用 uTools openId（稳定匿名ID），服务端按它去重，nickname 仅作展示名
 */
import { ref } from 'vue'
import { COLLECT_CONFIG } from '../config/collectConfig.js'

const RANKING_API = `${COLLECT_CONFIG.API}/rank/${COLLECT_CONFIG.TOKEN}/${COLLECT_CONFIG.RANK_BOARD}`
const USER_KEY_STORAGE = 'tetris_rank_user_key'
const MAX_RANKING = 3000
const DISPLAY_RANKING = 10
const RANKING_REFRESH_COOLDOWN = 60000
const RANKING_LOCAL_KEY = 'tetris_ranking_cache'

export function useTetrisRanking() {
  const rankingData = ref([])
  const loadingRanking = ref(false)
  const rankingError = ref('')
  const currentUserRanking = ref(null)
  const lastRankingRefreshTime = ref(0)

  // 获取用户信息
  const getUserInfo = () => {
    if (window.utools && window.utools.getUser) {
      try {
        const user = window.utools.getUser()
        return {
          nickname: user.nickname || '匿名玩家',
          avatar: user.avatar || '',
          userKey: user.openId || getLocalUserKey()
        }
      } catch (error) {
        console.error('获取用户信息失败:', error)
        return { nickname: '匿名玩家', avatar: '', userKey: getLocalUserKey() }
      }
    }
    return { nickname: '本地玩家', avatar: '', userKey: getLocalUserKey() }
  }

  // 无 openId 时用本地持久 UUID 兜底（跨会话稳定，服务端按它去重）
  const getLocalUserKey = () => {
    let key = localStorage.getItem(USER_KEY_STORAGE)
    if (!key) {
      key = 'local-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
      localStorage.setItem(USER_KEY_STORAGE, key)
    }
    return key
  }

  // 加载排行榜
  const loadRanking = async (forceRefresh = false) => {
    // 尝试从本地缓存读取
    if (!forceRefresh) {
      const cached = localStorage.getItem(RANKING_LOCAL_KEY)
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached)
          if (Date.now() - timestamp < RANKING_REFRESH_COOLDOWN) {
            rankingData.value = data
            lastRankingRefreshTime.value = timestamp
            return { success: true, count: data.length, fromCache: true }
          }
        } catch (e) {
          // 缓存解析失败，继续网络请求
        }
      }

      // 检查冷却时间
      const now = Date.now()
      const timeSinceLastRefresh = now - lastRankingRefreshTime.value
      if (timeSinceLastRefresh < RANKING_REFRESH_COOLDOWN) {
        const remainingSeconds = Math.ceil((RANKING_REFRESH_COOLDOWN - timeSinceLastRefresh) / 1000)
        return { success: false, message: `冷却中，请等待 ${remainingSeconds} 秒` }
      }
    }

    loadingRanking.value = true
    rankingError.value = ''

    try {
      const response = await fetch(RANKING_API)
      if (!response.ok) throw new Error('获取排行榜失败')

      const data = await response.json()
      let ranking = data.ranking || []
      ranking.sort((a, b) => b.score - a.score)

      if (ranking.length > MAX_RANKING) {
        ranking = ranking.slice(0, MAX_RANKING)
      }

      rankingData.value = ranking
      lastRankingRefreshTime.value = Date.now()

      // 保存到本地缓存
      localStorage.setItem(RANKING_LOCAL_KEY, JSON.stringify({
        data: ranking,
        timestamp: Date.now()
      }))

      return { success: true, count: ranking.length }
    } catch (error) {
      rankingError.value = error.message
      return { success: false, message: error.message }
    } finally {
      loadingRanking.value = false
    }
  }

  // 获取当前分数的排名
  const getCurrentRank = (score) => {
    if (!rankingData.value || rankingData.value.length === 0) return null

    let rank = 1
    for (const record of rankingData.value) {
      if (score > record.score) break
      rank++
    }

    return rank > MAX_RANKING ? null : rank
  }

  // 上传分数（服务端合并：排序 + top3000 + 每人最多3条）
  const uploadScore = async (score, level, lines) => {
    const userInfo = getUserInfo()
    if (!userInfo || !window.utools) {
      return { success: false, message: '需要登录 uTools 才能上传分数' }
    }

    try {
      const response = await fetch(RANKING_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: userInfo.nickname,
          score,
          level,
          lines,
          userKey: userInfo.userKey
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || `上传分数失败 (${response.status})`)

      if (!data.qualified) {
        return { success: false, message: '分数不足以进入排行榜' }
      }
      return { success: true, rank: data.rank }
    } catch (error) {
      return { success: false, message: error.message }
    }
  }

  // 更新当前用户排名（优先按稳定 userKey 匹配，退回 nickname）
  const updateCurrentUserRanking = (userInfo) => {
    if (!userInfo || !rankingData.value) {
      currentUserRanking.value = null
      return
    }

    const userRecords = rankingData.value.filter(r =>
      r.userKey && userInfo.userKey
        ? r.userKey === userInfo.userKey
        : r.nickname === userInfo.nickname
    )
    userRecords.sort((a, b) => b.score - a.score)
    currentUserRanking.value = userRecords.slice(0, 3)
  }

  // 获取排名显示文本
  const getRankDisplay = (score) => {
    if (rankingData.value.length === 0) return '等待数据...'
    const rank = getCurrentRank(score)
    if (rank) return `第 ${rank} 名`
    const minScore = rankingData.value[MAX_RANKING - 1]?.score || 0
    return `未入榜 (需>${minScore})`
  }

  return {
    rankingData,
    loadingRanking,
    rankingError,
    currentUserRanking,
    lastRankingRefreshTime,
    DISPLAY_RANKING,
    MAX_RANKING,
    getUserInfo,
    loadRanking,
    getCurrentRank,
    uploadScore,
    updateCurrentUserRanking,
    getRankDisplay
  }
}
