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
   * 导出存档
   * @param {string} gameId - 游戏ID
   */
  async exportSave(gameId) {
    try {
      if (!window.utools) {
        throw new Error('请在 uTools 环境中使用')
      }

      const savePrefix = this.getGameSavePrefix(gameId)

      // 从 uTools 数据库读取该游戏的所有存档
      const docs = await window.utools.db.promises.findAll(savePrefix)

      if (!docs || docs.length === 0) {
        return {
          success: false,
          message: '没有找到存档数据'
        }
      }

      // 整理存档数据
      const saveData = {
        version: '1.0',
        gameId: gameId,
        exportTime: new Date().toISOString(),
        data: {}
      }

      docs.forEach(doc => {
        const key = doc._id.replace(this.saveKey, '')
        saveData.data[key] = doc.data
      })

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
        message: `成功导出 ${docs.length} 个存档项`,
        count: docs.length
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
   * 导入存档
   * @param {string} gameId - 游戏ID
   * @param {File} file - 存档文件
   */
  async importSave(gameId, file) {
    try {
      if (!window.utools) {
        throw new Error('请在 uTools 环境中使用')
      }

      const savePrefix = this.getGameSavePrefix(gameId)

      // 读取文件
      const text = await this.readFile(file)
      const saveData = JSON.parse(text)

      // 验证存档格式
      if (!saveData.data || typeof saveData.data !== 'object') {
        throw new Error('存档格式不正确')
      }

      // 导入到 uTools 数据库
      let importCount = 0
      for (const [key, value] of Object.entries(saveData.data)) {
        await window.utools.db.promises.put({
          _id: savePrefix + key,
          data: value,
          updatedAt: Date.now()
        })
        importCount++
      }

      return {
        success: true,
        message: `成功导入 ${importCount} 个存档项`,
        count: importCount,
        exportTime: saveData.exportTime
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
   * 清除存档
   * @param {string} gameId - 游戏ID
   */
  async clearSave(gameId) {
    try {
      if (!window.utools) {
        throw new Error('请在 uTools 环境中使用')
      }

      const savePrefix = this.getGameSavePrefix(gameId)
      const docs = await window.utools.db.promises.findAll(savePrefix)

      if (!docs || docs.length === 0) {
        return {
          success: true,
          message: '没有存档需要清除',
          count: 0
        }
      }

      // 删除所有存档
      for (const doc of docs) {
        await window.utools.db.promises.remove(doc._id)
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
   * 获取存档信息
   * @param {string} gameId - 游戏ID
   */
  async getSaveInfo(gameId) {
    try {
      if (!window.utools) {
        throw new Error('请在 uTools 环境中使用')
      }

      const savePrefix = this.getGameSavePrefix(gameId)
      const docs = await window.utools.db.promises.findAll(savePrefix)

      if (!docs || docs.length === 0) {
        return {
          hasSave: false,
          count: 0
        }
      }

      // 提取关键游戏数据
      const candyCount = docs.find(d => d._id.includes('candy') && !d._id.includes('candiesEaten'))
      const lollipopCount = docs.find(d => d._id.includes('lollipop'))

      return {
        hasSave: true,
        count: docs.length,
        candy: candyCount ? parseInt(candyCount.data) || 0 : 0,
        lollipops: lollipopCount ? parseInt(lollipopCount.data) || 0 : 0,
        lastUpdate: Math.max(...docs.map(d => d.updatedAt || 0))
      }
    } catch (error) {
      console.error('获取存档信息失败:', error)
      return {
        hasSave: false,
        error: error.message
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
      reader.onerror = (e) => reject(new Error('读取文件失败'))
      reader.readAsText(file)
    })
  }
}

// 导出单例
export const saveManager = new SaveGameManager()
