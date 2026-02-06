/**
 * 糖果盒子2入口文件
 * 负责初始化游戏和设置存档适配器
 */

import CandyBox2StorageAdapter from './saveAdapter.js'

/**
 * 初始化糖果盒子2游戏
 * @param {Object} saveManager - uTools存档管理器
 */
export async function initCandyBox2(saveManager) {
  console.log('正在初始化糖果盒子2...')

  try {
    // 等待存档适配器初始化
    await CandyBox2StorageAdapter.init()

    // 替换localStorage为我们的适配器
    // 注意：这需要修改游戏代码中的localStorage调用
    // 或者使用Proxy来拦截localStorage操作

    console.log('糖果盒子2初始化完成')
    return true
  } catch (error) {
    console.error('初始化糖果盒子2失败:', error)
    return false
  }
}

/**
 * 销毁糖果盒子2游戏
 */
export async function destroyCandyBox2() {
  console.log('正在销毁糖果盒子2...')

  try {
    // 保存存档
    await CandyBox2StorageAdapter.forceSave()

    // 清理适配器
    await CandyBox2StorageAdapter.destroy()

    console.log('糖果盒子2已销毁')
    return true
  } catch (error) {
    console.error('销毁糖果盒子2失败:', error)
    return false
  }
}

// 导出到全局对象（用于HTML中调用）
if (typeof window !== 'undefined') {
  window.initCandyBox2 = initCandyBox2
  window.destroyCandyBox2 = destroyCandyBox2
}
