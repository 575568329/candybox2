/**
 * 统一日志工具类
 * 支持不同级别的日志输出和模块标识
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
}

// 根据环境设置日志级别
const currentLevel = import.meta.env.DEV ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN

/**
 * 创建带模块标识的日志记录器
 * @param {string} module - 模块名称
 * @returns {Object} 日志记录器对象
 */
export function createLogger(module) {
  const prefix = `[${module}]`

  return {
    debug(...args) {
      if (currentLevel <= LOG_LEVELS.DEBUG) {
        console.log(prefix, ...args)
      }
    },

    info(...args) {
      if (currentLevel <= LOG_LEVELS.INFO) {
        console.info(prefix, ...args)
      }
    },

    warn(...args) {
      if (currentLevel <= LOG_LEVELS.WARN) {
        console.warn(prefix, ...args)
      }
    },

    error(...args) {
      if (currentLevel <= LOG_LEVELS.ERROR) {
        console.error(prefix, ...args)
      }
    },

    // 用于性能测量的计时器
    time(label) {
      if (currentLevel <= LOG_LEVELS.DEBUG) {
        console.time(`${prefix} ${label}`)
      }
    },

    timeEnd(label) {
      if (currentLevel <= LOG_LEVELS.DEBUG) {
        console.timeEnd(`${prefix} ${label}`)
      }
    },

    // 分组日志
    group(label) {
      if (currentLevel <= LOG_LEVELS.DEBUG) {
        console.group(`${prefix} ${label}`)
      }
    },

    groupEnd() {
      if (currentLevel <= LOG_LEVELS.DEBUG) {
        console.groupEnd()
      }
    }
  }
}

// 预创建常用模块的日志记录器
export const gameLogger = createLogger('Game')
export const saveLogger = createLogger('SaveManager')
export const analyticsLogger = createLogger('Analytics')
export const routerLogger = createLogger('Router')

export default createLogger
