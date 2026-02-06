/**
 * 糖果盒子2存档适配器
 * 将游戏的localStorage存档系统适配到uTools存档管理器
 */

import { saveManager } from '../saveManager.js'

// 游戏ID
const GAME_ID = 'candybox2'

// 存档键前缀映射
const STORAGE_PREFIX = 'candybox2_'

/**
 * 本地存储适配器
 * 拦截localStorage操作，重定向到uTools存档管理器
 */
class CandyBox2StorageAdapter {
  constructor() {
    this.memoryCache = {}
    this.initialized = false
  }

  /**
   * 初始化适配器
   */
  async init() {
    if (this.initialized) return

    try {
      // 从uTools加载现有存档
      const saveData = await saveManager.loadGame(GAME_ID)

      if (saveData && saveData.data) {
        // 将存档数据加载到内存缓存
        this.memoryCache = saveData.data
        console.log('糖果盒子2存档加载成功')
      } else {
        console.log('未找到糖果盒子2存档，使用新游戏')
      }

      this.initialized = true
    } catch (error) {
      console.error('初始化存档适配器失败:', error)
    }
  }

  /**
   * 获取存档项
   * @param {string} key - 存档键
   * @returns {string|null} 存档值
   */
  getItem(key) {
    const fullKey = STORAGE_PREFIX + key
    const value = this.memoryCache[fullKey]

    // 同时尝试从localStorage读取（兼容性）
    if (value === undefined) {
      try {
        const localValue = localStorage.getItem(fullKey)
        if (localValue !== null) {
          return localValue
        }
      } catch (e) {
        // localStorage可能不可用
      }
      return null
    }

    return value !== undefined ? value : null
  }

  /**
   * 设置存档项
   * @param {string} key - 存档键
   * @param {string} value - 存档值
   */
  setItem(key, value) {
    const fullKey = STORAGE_PREFIX + key
    this.memoryCache[fullKey] = value

    // 异步保存到uTools
    this.saveToUTools()

    // 同时保存到localStorage（兼容性）
    try {
      localStorage.setItem(fullKey, value)
    } catch (e) {
      // localStorage可能不可用，忽略错误
    }
  }

  /**
   * 删除存档项
   * @param {string} key - 存档键
   */
  removeItem(key) {
    const fullKey = STORAGE_PREFIX + key
    delete this.memoryCache[fullKey]

    // 异步保存到uTools
    this.saveToUTools()

    // 同时从localStorage删除（兼容性）
    try {
      localStorage.removeItem(fullKey)
    } catch (e) {
      // localStorage可能不可用，忽略错误
    }
  }

  /**
   * 清空所有存档
   */
  clear() {
    // 只清除糖果盒子2的存档
    Object.keys(this.memoryCache).forEach(key => {
      if (key.startsWith(STORAGE_PREFIX)) {
        delete this.memoryCache[key]
      }
    })

    // 异步保存到uTools
    this.saveToUTools()

    // 同时清空localStorage（兼容性）
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
    } catch (e) {
      // localStorage可能不可用，忽略错误
    }
  }

  /**
   * 获取所有存档键
   * @param {number} index - 索引
   * @returns {string|null} 存档键
   */
  key(index) {
    const keys = Object.keys(this.memoryCache).filter(key =>
      key.startsWith(STORAGE_PREFIX)
    )

    if (index >= 0 && index < keys.length) {
      return keys[index].replace(STORAGE_PREFIX, '')
    }

    return null
  }

  /**
   * 获取存档项数量
   * @returns {number} 存档项数量
   */
  get length() {
    return Object.keys(this.memoryCache).filter(key =>
      key.startsWith(STORAGE_PREFIX)
    ).length
  }

  /**
   * 保存到uTools（带防抖）
   */
  async saveToUTools() {
    // 使用防抖，避免频繁保存
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
    }

    this.saveTimer = setTimeout(async () => {
      try {
        // 检查是否有实际存档数据
        const hasData = Object.keys(this.memoryCache).some(key =>
          key.startsWith(STORAGE_PREFIX)
        )

        if (hasData) {
          await saveManager.saveGame(GAME_ID, {
            data: this.memoryCache,
            timestamp: Date.now(),
            version: '1.2.3'
          })
          console.log('糖果盒子2存档已保存到uTools')
        }
      } catch (error) {
        console.error('保存存档到uTools失败:', error)
      }
    }, 1000) // 1秒防抖
  }

  /**
   * 手动触发保存（用于游戏退出时）
   */
  async forceSave() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
    }

    try {
      const hasData = Object.keys(this.memoryCache).some(key =>
        key.startsWith(STORAGE_PREFIX)
      )

      if (hasData) {
        await saveManager.saveGame(GAME_ID, {
          data: this.memoryCache,
          timestamp: Date.now(),
          version: '1.2.3'
        })
        console.log('糖果盒子2存档已强制保存')
      }
    } catch (error) {
      console.error('强制保存存档失败:', error)
    }
  }

  /**
   * 销毁适配器
   */
  async destroy() {
    // 保存最后一次存档
    await this.forceSave()

    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
    }

    this.initialized = false
  }
}

// 创建全局适配器实例
const storageAdapter = new CandyBox2StorageAdapter()

// 初始化适配器
storageAdapter.init().catch(console.error)

// 导出适配器
if (typeof window !== 'undefined') {
  window.CandyBox2StorageAdapter = storageAdapter
}

export default storageAdapter
