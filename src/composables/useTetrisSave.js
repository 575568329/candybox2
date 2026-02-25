/**
 * 俄罗斯方块存档功能
 */
import { ref } from 'vue'
import { saveManager } from '../utils/saveManager.js'
import { analyticsTracker } from '../utils/analyticsTracker.js'
import { BOARD_WIDTH, BOARD_HEIGHT } from './useTetrisGame.js'

export function useTetrisSave() {
  const autoLoaded = ref(false)

  // 验证存档数据的有效性
  const validateSaveData = (data) => {
    try {
      if (!data || typeof data !== 'object') return false
      if (!Array.isArray(data.board) || data.board.length !== BOARD_HEIGHT) return false

      for (let i = 0; i < data.board.length; i++) {
        const row = data.board[i]
        if (!Array.isArray(row) || row.length !== BOARD_WIDTH) return false
      }

      if (typeof data.score !== 'number' || data.score < 0) return false
      if (typeof data.level !== 'number' || data.level < 1) return false
      if (typeof data.lines !== 'number' || data.lines < 0) return false

      return true
    } catch (error) {
      return false
    }
  }

  // 保存游戏
  const saveGame = async (gameState) => {
    const { board, score, level, lines, currentPiece, nextPiece } = gameState

    const saveData = {
      board,
      score,
      level,
      lines,
      currentPiece: currentPiece ? {
        type: currentPiece.type,
        shape: currentPiece.shape,
        color: currentPiece.color,
        x: currentPiece.x,
        y: currentPiece.y
      } : null,
      nextPiece: nextPiece ? {
        type: nextPiece.type,
        shape: nextPiece.shape,
        color: nextPiece.color,
        x: nextPiece.x,
        y: nextPiece.y
      } : null,
      timestamp: Date.now()
    }

    try {
      if (window.utools) {
        const savePrefix = saveManager.getGameSavePrefix('tetris')
        await saveManager.putDoc({
          _id: savePrefix + 'current',
          data: JSON.stringify(saveData),
          updatedAt: Date.now()
        })
        analyticsTracker.trackSaveOperation('auto_save', 'tetris', { score, level })
      } else {
        localStorage.setItem('tetris_save', JSON.stringify(saveData))
      }
      return { success: true }
    } catch (error) {
      console.error('[存档] 保存失败:', error)
      return { success: false, error: error.message }
    }
  }

  // 加载游戏
  const loadGame = async () => {
    try {
      let saveData = null

      if (window.utools) {
        const savePrefix = saveManager.getGameSavePrefix('tetris')
        const docs = await saveManager.getAllDocs(savePrefix)
        if (docs && docs.length > 0) {
          try {
            saveData = JSON.parse(docs[0].data)
          } catch (parseError) {
            console.error('[存档] 数据解析失败:', parseError)
            return null
          }
        }
      } else {
        const saved = localStorage.getItem('tetris_save')
        if (saved) {
          saveData = JSON.parse(saved)
        }
      }

      if (saveData && validateSaveData(saveData)) {
        return saveData
      }

      if (saveData) {
        await clearSave()
      }

      return null
    } catch (error) {
      console.error('[存档] 加载失败:', error)
      return null
    }
  }

  // 清空存档
  const clearSave = async () => {
    try {
      if (window.utools) {
        const savePrefix = saveManager.getGameSavePrefix('tetris')
        const docs = await saveManager.getAllDocs(savePrefix)
        if (docs && docs.length > 0) {
          for (const doc of docs) {
            if (!doc._id.endsWith('settings')) {
              await saveManager.removeDoc(doc._id)
            }
          }
        }
      } else {
        localStorage.removeItem('tetris_save')
      }
      return { success: true }
    } catch (error) {
      console.error('[存档] 清空失败:', error)
      return { success: false, error: error.message }
    }
  }

  // 保存最高分
  const saveHighScore = async (score, level, lines) => {
    const saveData = { score, level, lines, timestamp: Date.now() }

    try {
      if (window.utools) {
        const currentHigh = await getHighScore()
        if (score > currentHigh) {
          const savePrefix = saveManager.getGameSavePrefix('tetris')
          await saveManager.putDoc({
            _id: savePrefix + 'highscore',
            data: JSON.stringify(saveData),
            updatedAt: Date.now()
          })
        }
      } else {
        const highScore = getHighScoreLocal()
        if (!highScore || score > highScore.score) {
          localStorage.setItem('tetris_highscore', JSON.stringify(saveData))
        }
      }
    } catch (error) {
      console.error('[存档] 保存最高分失败:', error)
    }
  }

  // 获取最高分 (uTools)
  const getHighScore = async () => {
    if (!window.utools) return 0

    try {
      const savePrefix = saveManager.getGameSavePrefix('tetris')
      const docs = await saveManager.getAllDocs(savePrefix + 'highscore')
      if (docs && docs.length > 0) {
        const data = JSON.parse(docs[0].data)
        return data.score || 0
      }
    } catch (error) {
      console.error('[存档] 获取最高分失败:', error)
    }

    return 0
  }

  // 获取最高分 (localStorage)
  const getHighScoreLocal = () => {
    try {
      const data = localStorage.getItem('tetris_highscore')
      return data ? JSON.parse(data) : null
    } catch (error) {
      return null
    }
  }

  return {
    autoLoaded,
    validateSaveData,
    saveGame,
    loadGame,
    clearSave,
    saveHighScore,
    getHighScore
  }
}
