/**
 * 游戏存档管理工具
 * 支持每个游戏独立的存档空间
 */

export class SaveGameManager {
  constructor() {
    this.savePrefix = 'game_save_'
  }

  /**
   * 获取游戏的存档键前缀
   */
  getGameSavePrefix(gameId) {
    return `${this.savePrefix}${gameId}_`
  }

  /**
   * 获取所有文档（兼容同步和异步版本）
   */
  async getAllDocs(prefix) {
    // 优先使用 promises API（异步）
    if (window.utools.db.promises && window.utools.db.promises.allDocs) {
      return await window.utools.db.promises.allDocs(prefix)
    }
    // 回退到同步 API
    return window.utools.db.allDocs(prefix)
  }

  /**
   * 保存文档（兼容同步和异步版本）
   */
  async putDoc(doc) {
    // 优先使用 promises API（异步）
    if (window.utools.db.promises && window.utools.db.promises.put) {
      return await window.utools.db.promises.put(doc)
    }
    // 回退到同步 API
    return new Promise((resolve, reject) => {
      const result = window.utools.db.put(doc)
      if (result.error) {
        reject(new Error(result.message))
      } else {
        resolve(result)
      }
    })
  }

  /**
   * 删除文档（兼容同步和异步版本）
   */
  async removeDoc(idOrDoc) {
    // 优先使用 promises API（异步）
    if (window.utools.db.promises && window.utools.db.promises.remove) {
      return await window.utools.db.promises.remove(idOrDoc)
    }
    // 回退到同步 API
    return new Promise((resolve, reject) => {
      const result = window.utools.db.remove(idOrDoc)
      if (result.error) {
        reject(new Error(result.message))
      } else {
        resolve(result)
      }
    })
  }

  /**
   * 导出存档（游戏原始格式）
   * @param {string} gameId - 游戏ID
   * @param {HTMLIFrameElement} iframe - 游戏的 iframe 元素
   */
  async exportSave(gameId, iframe = null) {
    try {
      if (gameId === 'adarkroom' && iframe && iframe.contentWindow) {
        // 从 iframe 读取 localStorage 数据（小黑屋）
        const localStorageData = await this.getLocalStorageFromIframe(iframe, 'adarkroom')

        if (!localStorageData || Object.keys(localStorageData).length === 0) {
          return {
            success: false,
            message: '没有找到存档数据'
          }
        }

        // 创建存档文件（游戏的原始格式）
        const saveData = {
          version: '1.0',
          gameId: gameId,
          exportTime: new Date().toISOString(),
          data: localStorageData
        }

        // 转换为 JSON 字符串
        const jsonString = JSON.stringify(saveData, null, 2)

        // 创建 Blob 并下载
        const blob = new Blob([jsonString], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${gameId}_save_${new Date().toISOString().slice(0, 10)}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        return {
          success: true,
          message: `成功导出 ${Object.keys(localStorageData).length} 个存档项`,
          count: Object.keys(localStorageData).length
        }
      } else {
        throw new Error('暂不支持该游戏的存档导出')
      }
    } catch (error) {
      console.error('导出存档失败:', error)
      return {
        success: false,
        message: `导出失败: ${error.message}`
      }
    }
  }

  /**
   * 导入存档（游戏原始格式）
   * @param {string} gameId - 游戏ID
   * @param {File} file - 存档文件
   * @param {HTMLIFrameElement} iframe - 游戏的 iframe 元素
   */
  async importSave(gameId, file, iframe = null) {
    try {
      // 读取文件
      const text = await this.readFile(file)
      const saveData = JSON.parse(text)

      // 验证存档格式
      if (!saveData.data || typeof saveData.data !== 'object') {
        throw new Error('存档格式不正确')
      }

      if (gameId === 'adarkroom' && iframe && iframe.contentWindow) {
        // 导入到 iframe 的 localStorage（小黑屋）
        await this.setLocalStorageToIframe(iframe, saveData.data, 'adarkroom')

        // 刷新游戏以应用新存档
        iframe.contentWindow.location.reload()

        return {
          success: true,
          message: `成功导入 ${Object.keys(saveData.data).length} 个存档项，游戏已刷新`,
          count: Object.keys(saveData.data).length,
          exportTime: saveData.exportTime
        }
      } else {
        throw new Error('暂不支持该游戏的存档导入')
      }
    } catch (error) {
      console.error('导入存档失败:', error)
      return {
        success: false,
        message: `导入失败: ${error.message}`
      }
    }
  }

  /**
   * 从 iframe 获取所有 localStorage 数据
   * @param {HTMLIFrameElement} iframe - iframe 元素
   * @param {string} gameType - 游戏类型（'adarkroom'）
   */
  getLocalStorageFromIframe(iframe, gameType = 'adarkroom') {
    return new Promise((resolve) => {
      if (!iframe || !iframe.contentWindow) {
        resolve(null)
        return
      }

      const targetOrigin = window.location.origin

      // 设置超时
      const timeout = setTimeout(() => {
        window.removeEventListener('message', messageHandler)
        resolve(null)
      }, 5000)

      // 根据游戏类型设置消息类型
      const messageType = gameType === 'adarkroom' ? 'adarkroom-save-data' : 'save-data'
      const requestType = gameType === 'adarkroom' ? 'adarkroom-get-save-data' : 'get-save-data'

      // 监听来自 iframe 的响应
      const messageHandler = (event) => {
        // 验证消息来源
        if (event.origin !== targetOrigin) {
          console.warn('[存档管理器] 收到来自未知来源的消息:', event.origin)
          return
        }

        if (event.data && event.data.type === messageType) {
          clearTimeout(timeout)
          window.removeEventListener('message', messageHandler)
          resolve(event.data.data || {})
        }
      }

      window.addEventListener('message', messageHandler)

      // 向 iframe 发送请求
      iframe.contentWindow.postMessage({
        type: requestType
      }, targetOrigin)
    })
  }

  /**
   * 向 iframe 设置 localStorage 数据
   * @param {HTMLIFrameElement} iframe - iframe 元素
   * @param {Object} data - 存档数据
   * @param {string} gameType - 游戏类型（'adarkroom'）
   */
  setLocalStorageToIframe(iframe, data, gameType = 'adarkroom') {
    return new Promise((resolve) => {
      if (!iframe || !iframe.contentWindow) {
        resolve(false)
        return
      }

      const targetOrigin = window.location.origin

      // 设置超时
      const timeout = setTimeout(() => {
        window.removeEventListener('message', messageHandler)
        resolve(false)
      }, 5000)

      // 根据游戏类型设置消息类型
      const messageType = gameType === 'adarkroom' ? 'adarkroom-save-data-set' : 'save-data-set'

      // 监听来自 iframe 的响应
      const messageHandler = (event) => {
        // 验证消息来源
        if (event.origin !== targetOrigin) {
          console.warn('[存档管理器] 收到来自未知来源的消息:', event.origin)
          return
        }

        if (event.data && event.data.type === messageType) {
          clearTimeout(timeout)
          window.removeEventListener('message', messageHandler)
          resolve(event.data.success || false)
        }
      }

      window.addEventListener('message', messageHandler)

      // 根据游戏类型设置消息类型
      const requestType = gameType === 'adarkroom' ? 'adarkroom-set-save-data' : 'set-save-data'

      // 向 iframe 发送数据，让其写入 localStorage
      iframe.contentWindow.postMessage({
        type: requestType,
        data: data
      }, targetOrigin)
    })
  }

  /**
   * 清除存档
   * @param {string} gameId - 游戏ID
   */
  async clearSave(gameId) {
    try {
      if (!window.utools) {
        throw new Error('请在 uTools 环境中使用')
      }

      const savePrefix = this.getGameSavePrefix(gameId)
      const docs = await this.getAllDocs(savePrefix)

      if (!docs || docs.length === 0) {
        return {
          success: true,
          message: '没有存档需要清除',
          count: 0
        }
      }

      // 删除所有存档
      for (const doc of docs) {
        await this.removeDoc(doc._id)
      }

      return {
        success: true,
        message: `已清除 ${docs.length} 个存档项`,
        count: docs.length
      }
    } catch (error) {
      console.error('清除存档失败:', error)
      return {
        success: false,
        message: `清除失败: ${error.message}`
      }
    }
  }

  /**
   * 从 iframe 读取 localStorage 存档（非 uTools 环境）
   */
  async getSaveInfoFromIframe(iframe, gameType = 'adarkroom') {
    return new Promise((resolve) => {
      if (!iframe || !iframe.contentWindow) {
        resolve({ hasSave: false, error: 'iframe 不可用' })
        return
      }

      const targetOrigin = window.location.origin

      // 设置超时
      const timeout = setTimeout(() => {
        resolve({ hasSave: false, error: '读取超时' })
      }, 3000)

      const messageType = gameType === 'adarkroom' ? 'adarkroom-save-data' : 'save-data'
      const requestType = gameType === 'adarkroom' ? 'adarkroom-get-save-data' : 'get-save-data'

      // 监听来自 iframe 的响应
      const messageHandler = (event) => {
        // 验证消息来源
        if (event.origin !== targetOrigin) {
          console.warn('[存档管理器] 收到来自未知来源的消息:', event.origin)
          return
        }

        if (event.data && event.data.type === messageType) {
          clearTimeout(timeout)
          window.removeEventListener('message', messageHandler)

          const saveData = event.data.data
          console.log('[存档管理器] 收到 iframe 存档数据，键数量:', Object.keys(saveData).length)

          if (saveData && Object.keys(saveData).length > 0) {
            resolve({
              hasSave: true,
              count: Object.keys(saveData).length,
              lastUpdate: Date.now(),
              source: 'iframe'
            })
          } else {
            resolve({ hasSave: false, count: 0 })
          }
        }
      }

      window.addEventListener('message', messageHandler)

      // 向 iframe 发送请求
      iframe.contentWindow.postMessage({
        type: requestType
      }, targetOrigin)
    })
  }

  /**
   * 获取存档信息
   * @param {string} gameId - 游戏ID
   * @param {HTMLIFrameElement} iframe - 游戏的 iframe 元素（可选，用于非 uTools 环境）
   */
  async getSaveInfo(gameId, iframe = null) {
    try {
      console.log('[存档管理器] getSaveInfo 调用', {
        gameId,
        hasUTools: !!window.utools,
        hasIframe: !!iframe,
        iframeReady: iframe ? !!iframe.contentWindow : false
      })

      // 验证输入参数
      if (!gameId || typeof gameId !== 'string') {
        throw new Error('无效的游戏ID')
      }

      // 如果有可用的 iframe，优先从 iframe 读取
      if (iframe && iframe.contentWindow) {
        console.log('[存档管理器] 从 iframe 读取存档（优先）')
        try {
          const iframeResult = await this.getSaveInfoFromIframe(iframe, gameId)
          if (iframeResult.hasSave) {
            console.log('[存档管理器] ✓ 从 iframe 成功读取存档')
            return iframeResult
          }
        } catch (err) {
          console.error('[存档管理器] 从 iframe 读取失败:', err)
        }
      }

      // 如果在 uTools 环境中，从 uTools 数据库读取
      if (window.utools) {
        console.log('[存档管理器] 使用 uTools 数据库读取')
        const savePrefix = this.getGameSavePrefix(gameId)
        const docs = await this.getAllDocs(savePrefix)

        console.log(`[存档管理器] 找到 ${docs?.length || 0} 个存档项`)

        if (!docs || docs.length === 0) {
          return {
            hasSave: false,
            count: 0
          }
        }

        return {
          hasSave: true,
          count: docs.length,
          lastUpdate: Math.max(...docs.map(d => d.updatedAt || 0)),
          source: 'utools'
        }
      } else {
        // 非 uTools 环境且没有 iframe
        console.log('[存档管理器] 非 uTools 环境，但没有可用的 iframe')
        return {
          hasSave: false,
          error: '请在 uTools 中使用，或提供游戏 iframe'
        }
      }
    } catch (error) {
      console.error('[存档管理器] 获取存档信息失败:', error)
      return {
        hasSave: false,
        error: `存档读取失败: ${error.message}`
      }
    }
  }

  /**
   * 读取文件内容
   */
  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = () => reject(new Error('读取文件失败'))
      reader.readAsText(file)
    })
  }
}

// 导出单例
export const saveManager = new SaveGameManager()
