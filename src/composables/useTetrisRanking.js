/**
 * 俄罗斯方块排行榜功能
 */
import { ref } from 'vue'

const RANKING_API = 'https://getpantry.cloud/apiv1/pantry/9eafe9e6-8ff7-41ab-b111-ecabbc1685a7/basket/ELSFK_RANK'
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
          avatar: user.avatar || ''
        }
      } catch (error) {
        console.error('获取用户信息失败:', error)
        return { nickname: '匿名玩家', avatar: '' }
      }
    }
    return { nickname: '本地玩家', avatar: '' }
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

  // 上传分数
  const uploadScore = async (score, level, lines) => {
    const userInfo = getUserInfo()
    if (!userInfo || !window.utools) {
      return { success: false, message: '需要登录 uTools 才能上传分数' }
    }

    try {
      const response = await fetch(RANKING_API)
      const data = await response.json()
      let ranking = data.ranking || []

      const userRecords = ranking.filter(r => r.nickname === userInfo.nickname)
      const minScore = ranking.length >= MAX_RANKING ? ranking[MAX_RANKING - 1]?.score || 0 : 0
      const userMinScore = userRecords.length > 0 ? Math.min(...userRecords.map(r => r.score)) : 0

      if (score < minScore && score <= userMinScore) {
        return { success: false, message: '分数不足以进入排行榜' }
      }

      ranking.push({
        nickname: userInfo.nickname,
        score,
        level,
        lines,
        timestamp: Date.now()
      })

      ranking.sort((a, b) => b.score - a.score)
      if (ranking.length > MAX_RANKING) {
        ranking.splice(MAX_RANKING)
      }

      // 每个用户只保留最高的3条记录
      const updatedRanking = []
      const userRecordMap = new Map()

      for (const record of ranking) {
        const key = record.nickname
        if (!userRecordMap.has(key)) {
          userRecordMap.set(key, [])
        }
        const records = userRecordMap.get(key)

        if (records.length < 3) {
          records.push(record)
        } else {
          const minUserRecord = records.reduce((min, r) => r.score < min.score ? r : min)
          if (record.score > minUserRecord.score) {
            const minIndex = records.indexOf(minUserRecord)
            records[minIndex] = record
          }
        }
      }

      for (const records of userRecordMap.values()) {
        updatedRanking.push(...records)
      }

      updatedRanking.sort((a, b) => b.score - a.score)

      const uploadResponse = await fetch(RANKING_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ranking: updatedRanking })
      })

      if (!uploadResponse.ok) throw new Error('上传分数失败')

      const newUserRank = updatedRanking.findIndex(
        r => r.nickname === userInfo.nickname && r.score === score
      ) + 1

      return { success: true, rank: newUserRank }
    } catch (error) {
      return { success: false, message: error.message }
    }
  }

  // 更新当前用户排名
  const updateCurrentUserRanking = (userInfo) => {
    if (!userInfo || !rankingData.value) {
      currentUserRanking.value = null
      return
    }

    const userRecords = rankingData.value.filter(r => r.nickname === userInfo.nickname)
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
