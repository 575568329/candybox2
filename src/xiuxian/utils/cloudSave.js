/**
 * 修仙游戏 uTools 云存档工具
 * 集成 Pinia store 和 uTools 云存储
 */
import { useXiuxianStore } from '../plugins/store'
import { analyticsTracker } from '../../utils/analyticsTracker'

const UTOOLS_STORAGE_KEY = 'xiuxian_save'

/**
 * 保存存档到 uTools 云存储
 */
export async function saveToUTools() {
  try {
    if (typeof window === 'undefined' || !window.utools || !window.utools.db) {
      console.log('[云存档] 非uTools环境，跳过云保存')
      return { success: false, reason: 'not_utools' }
    }

    const store = useXiuxianStore()
    const saveData = {
      boss: store.boss,
      player: store.player,
      monster: store.monster,
      mapData: store.mapData,
      mapScroll: store.mapScroll,
      fishingMap: store.fishingMap,
      timestamp: Date.now(),
      updatedAt: Date.now()
    }

    // 获取已有存档的 _rev
    let existingDoc = null
    if (window.utools.db.promises && window.utools.db.promises.get) {
      existingDoc = await window.utools.db.promises.get(UTOOLS_STORAGE_KEY)
    } else {
      existingDoc = window.utools.db.get(UTOOLS_STORAGE_KEY)
    }

    // 准备存档文档
    const saveDoc = {
      _id: UTOOLS_STORAGE_KEY,
      ...saveData
    }

    // 如果已有存档，添加 _rev 字段进行更新
    if (existingDoc && existingDoc._rev) {
      saveDoc._rev = existingDoc._rev
    }

    // 保存到uTools数据库
    let result
    if (window.utools.db.promises && window.utools.db.promises.put) {
      result = await window.utools.db.promises.put(saveDoc)
    } else {
      result = window.utools.db.put(saveDoc)
    }

    if (result && result.error) {
      throw new Error(result.message || '保存到 uTools 数据库失败')
    }

    console.log('[云存档] 存档已保存到uTools云存储')

    // 追踪存档操作（埋点）
    analyticsTracker.trackSaveOperation('save', 'xiuxian', {
      auto: true,
      cloud: true
    })

    return { success: true }
  } catch (error) {
    console.error('[云存档] 保存失败:', error)
    return { success: false, error }
  }
}

/**
 * 从 uTools 云存储加载存档
 */
export async function loadFromUTools() {
  try {
    if (typeof window === 'undefined' || !window.utools || !window.utools.db) {
      console.log('[云存档] 非uTools环境，跳过云加载')
      return { success: false, reason: 'not_utools' }
    }

    let doc = null
    if (window.utools.db.promises && window.utools.db.promises.get) {
      doc = await window.utools.db.promises.get(UTOOLS_STORAGE_KEY)
    } else {
      doc = window.utools.db.get(UTOOLS_STORAGE_KEY)
    }

    if (!doc) {
      console.log('[云存档] 无云端存档')
      return { success: false, reason: 'no_save' }
    }

    // 恢复到 Pinia store
    const store = useXiuxianStore()
    store.$patch({
      boss: doc.boss || {},
      player: doc.player || {},
      monster: doc.monster || {},
      mapData: doc.mapData || {},
      mapScroll: doc.mapScroll || 0,
      fishingMap: doc.fishingMap || []
    })

    console.log('[云存档] 从uTools云存储加载存档成功')

    // 追踪存档操作（埋点）
    analyticsTracker.trackSaveOperation('load', 'xiuxian', {
      cloud: true
    })

    return { success: true }
  } catch (error) {
    console.error('[云存档] 加载失败:', error)
    return { success: false, error }
  }
}

/**
 * 初始化云存档自动同步
 * 当本地存档变化时自动同步到云端
 */
let syncTimer = null

export function initAutoSync() {
  if (typeof window === 'undefined' || !window.utools || !window.utools.db) {
    console.log('[云存档] 非uTools环境，不启用自动同步')
    return
  }

  console.log('[云存档] 已启用自动同步')

  // 每30秒自动同步一次
  syncTimer = setInterval(() => {
    saveToUTools()
  }, 30000)

  // 页面隐藏时同步
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      saveToUTools()
    }
  })
}

/**
 * 停止自动同步
 */
export function stopAutoSync() {
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }
}

/**
 * 获取云端存档信息
 */
export async function getCloudSaveInfo() {
  try {
    if (typeof window === 'undefined' || !window.utools || !window.utools.db) {
      return { hasCloudSave: false }
    }

    let doc = null
    if (window.utools.db.promises && window.utools.db.promises.get) {
      doc = await window.utools.db.promises.get(UTOOLS_STORAGE_KEY)
    } else {
      doc = window.utools.db.get(UTOOLS_STORAGE_KEY)
    }

    if (!doc) {
      return { hasCloudSave: false }
    }

    return {
      hasCloudSave: true,
      timestamp: doc.timestamp || doc.updatedAt || 0,
      player: doc.player?.name || '未知'
    }
  } catch (error) {
    console.error('[云存档] 获取云端存档信息失败:', error)
    return { hasCloudSave: false }
  }
}
