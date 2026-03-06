/**
 * 数据验证工具
 * 用于验证存档数据、配置数据等
 */

/**
 * 验证对象是否包含指定的字段和类型
 * @param {Object} data - 要验证的数据
 * @param {Object} schema - 字段名到类型的映射，如 { score: 'number', name: 'string' }
 * @returns {boolean}
 */
export function validateObject(data, schema) {
  if (!data || typeof data !== 'object') return false

  for (const [key, type] of Object.entries(schema)) {
    if (!(key in data)) return false

    const value = data[key]
    const actualType = Array.isArray(value) ? 'array' : typeof value

    if (actualType !== type) {
      // 允许 null 值
      if (value === null) continue
      return false
    }
  }

  return true
}

/**
 * 验证存档数据基本结构
 * @param {Object} data - 存档数据
 * @returns {boolean}
 */
export function validateSaveData(data) {
  if (!data || typeof data !== 'object') return false

  // 存档必须包含 version 或 data 字段
  return 'version' in data || 'data' in data
}

/**
 * 俄罗斯方块存档数据验证模式
 */
export const TETRIS_SAVE_SCHEMA = {
  board: 'array',
  score: 'number',
  level: 'number',
  lines: 'number',
  isPlaying: 'boolean',
  isPaused: 'boolean',
  gameOver: 'boolean'
}

/**
 * 验证俄罗斯方块存档
 * @param {Object} data - 存档数据
 * @returns {boolean}
 */
export function validateTetrisSave(data) {
  return validateObject(data, TETRIS_SAVE_SCHEMA)
}

/**
 * 游戏配置验证模式
 */
export const GAME_CONFIG_SCHEMA = {
  id: 'string',
  name: 'string',
  path: 'string',
  category: 'string'
}

/**
 * 验证游戏配置
 * @param {Object} config - 游戏配置对象
 * @returns {boolean}
 */
export function validateGameConfig(config) {
  return validateObject(config, GAME_CONFIG_SCHEMA)
}

/**
 * 安全解析 JSON
 * @param {string} jsonString - JSON 字符串
 * @param {*} defaultValue - 解析失败时的默认值
 * @returns {*}
 */
export function safeJsonParse(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString)
  } catch {
    return defaultValue
  }
}

/**
 * 深度克隆对象（避免引用问题）
 * @param {Object} obj - 要克隆的对象
 * @returns {Object}
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj

  try {
    return JSON.parse(JSON.stringify(obj))
  } catch {
    return obj
  }
}

export default {
  validateObject,
  validateSaveData,
  validateTetrisSave,
  validateGameConfig,
  safeJsonParse,
  deepClone,
  TETRIS_SAVE_SCHEMA,
  GAME_CONFIG_SCHEMA
}
