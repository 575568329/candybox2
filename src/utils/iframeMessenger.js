/**
 * iframe 通信工具
 * 统一封装 iframe 与父窗口之间的消息传递
 */

// 允许的消息来源
const ALLOWED_ORIGINS = [
  window.location.origin,
  'null' // 本地文件 iframe
]

// 消息类型常量
export const MESSAGE_TYPES = {
  // 通用存档操作
  GET_SAVE_DATA: 'get-save-data',
  SAVE_DATA: 'save-data',
  SET_SAVE_DATA: 'set-save-data',
  SAVE_DATA_SET: 'save-data-set',

  // 小黑屋专用
  ADARKROOM_SAVE_REQUEST: 'adarkroom-save-request',
  ADARKROOM_SAVE_RESPONSE: 'adarkroom-save-response',
  ADARKROOM_LOAD_REQUEST: 'adarkroom-load-save-request',
  ADARKROOM_LOAD_RESPONSE: 'adarkroom-load-save-response',

  // 通用
  GAME_READY: 'game-ready',
  GAME_ERROR: 'game-error'
}

/**
 * 创建消息处理器
 * @param {string} gameId - 游戏ID
 * @param {Object} handlers - 消息类型到处理函数的映射
 * @returns {Function} 清理函数
 */
export function createMessageHandler(gameId, handlers) {
  const handler = (event) => {
    // 验证消息来源
    if (!ALLOWED_ORIGINS.includes(event.origin)) {
      console.warn(`[${gameId}] 拒绝来自未知源的消息:`, event.origin)
      return
    }

    // 验证消息格式
    if (!event.data || typeof event.data !== 'object') {
      return
    }

    const { type, data } = event.data

    // 查找并执行对应的处理器
    if (handlers[type]) {
      handlers[type](data, event)
    }
  }

  window.addEventListener('message', handler)

  // 返回清理函数
  return () => {
    window.removeEventListener('message', handler)
  }
}

/**
 * 向 iframe 发送消息
 * @param {HTMLIFrameElement} iframe - iframe 元素
 * @param {string} type - 消息类型
 * @param {Object} data - 消息数据
 */
export function sendMessageToIframe(iframe, type, data = {}) {
  if (!iframe || !iframe.contentWindow) {
    console.warn('[IframeMessenger] iframe 不可用')
    return
  }

  const targetOrigin = window.location.origin
  iframe.contentWindow.postMessage({ type, data }, targetOrigin)
}

/**
 * 创建带超时的消息请求
 * @param {HTMLIFrameElement} iframe - iframe 元素
 * @param {string} requestType - 请求消息类型
 * @param {string} responseType - 响应消息类型
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<Object>}
 */
export function requestFromIframe(iframe, requestType, responseType, timeout = 5000) {
  return new Promise((resolve, reject) => {
    if (!iframe || !iframe.contentWindow) {
      reject(new Error('iframe 不可用'))
      return
    }

    const targetOrigin = window.location.origin
    let timeoutId = null

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      window.removeEventListener('message', handler)
    }

    const handler = (event) => {
      if (!ALLOWED_ORIGINS.includes(event.origin)) return

      if (event.data && event.data.type === responseType) {
        cleanup()
        resolve(event.data.data || {})
      }
    }

    // 设置超时
    timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error('请求超时'))
    }, timeout)

    window.addEventListener('message', handler)

    // 发送请求
    iframe.contentWindow.postMessage({ type: requestType }, targetOrigin)
  })
}

/**
 * 验证消息来源是否合法
 * @param {string} origin - 消息来源
 * @returns {boolean}
 */
export function isValidOrigin(origin) {
  return ALLOWED_ORIGINS.includes(origin)
}

export default {
  MESSAGE_TYPES,
  createMessageHandler,
  sendMessageToIframe,
  requestFromIframe,
  isValidOrigin
}
