/**
 * 俄罗斯方块键盘控制
 */
import { ref, onMounted, onUnmounted } from 'vue'

export function useTetrisKeyboard(options) {
  const {
    onMove,
    onRotate,
    onSoftDrop,
    onHardDrop,
    onPause,
    onStart,
    onRestart,
    onToggleFocusMode,
    onRefreshRanking,
    isPlaying,
    gameOver,
    isPaused
  } = options

  // 按键配置
  const swapDropKeys = ref(false)

  // 按键状态跟踪（用于长按支持）
  const keysPressed = ref({
    ArrowLeft: false,
    ArrowRight: false,
    ArrowDown: false,
    KeyA: false,
    KeyD: false,
    KeyS: false
  })

  const lastMoveTime = ref({
    ArrowLeft: 0,
    ArrowRight: 0,
    ArrowDown: 0,
    KeyA: 0,
    KeyD: 0,
    KeyS: 0
  })

  const MOVE_INTERVAL = 150

  // 处理按键按下
  const handleKeyDown = (event) => {
    // Ctrl 组合键
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'f':
          event.preventDefault()
          onToggleFocusMode?.()
          break
        case 'r':
          event.preventDefault()
          onRefreshRanking?.()
          break
      }
      return
    }

    // 游戏未开始时的快捷键
    if (!isPlaying.value) {
      switch (event.key) {
        case 'Enter':
          event.preventDefault()
          onStart?.()
          break
      }
      return
    }

    // 游戏中的快捷键
    switch (event.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        event.preventDefault()
        onMove?.('left')
        break
      case 'ArrowRight':
      case 'd':
      case 'D':
        event.preventDefault()
        onMove?.('right')
        break
      case 'ArrowDown':
      case 's':
      case 'S':
        event.preventDefault()
        if (swapDropKeys.value) {
          onHardDrop?.()
        } else {
          onSoftDrop?.()
        }
        break
      case ' ':
        event.preventDefault()
        if (swapDropKeys.value) {
          onSoftDrop?.()
        } else {
          onHardDrop?.()
        }
        break
      case 'ArrowUp':
      case 'w':
      case 'W':
        event.preventDefault()
        onRotate?.()
        break
      case 'p':
      case 'P':
      case 'Enter':
        event.preventDefault()
        if (gameOver.value) {
          onRestart?.()
        } else {
          onPause?.()
        }
        break
    }
  }

  // 处理按键释放
  const handleKeyUp = (event) => {
    const keyMap = {
      'ArrowLeft': 'ArrowLeft',
      'ArrowRight': 'ArrowRight',
      'ArrowDown': 'ArrowDown',
      'a': 'KeyA',
      'A': 'KeyA',
      'd': 'KeyD',
      'D': 'KeyD',
      's': 'KeyS',
      'S': 'KeyS'
    }
    const mappedKey = keyMap[event.key] || event.key
    if (keysPressed.value.hasOwnProperty(mappedKey)) {
      keysPressed.value[mappedKey] = false
    }
  }

  // 窗口焦点处理
  const handleWindowBlur = () => {
    keysPressed.value = {
      ArrowLeft: false,
      ArrowRight: false,
      ArrowDown: false,
      KeyA: false,
      KeyD: false,
      KeyS: false
    }
  }

  // 加载按键设置
  const loadSwapKeysSetting = async (saveManager) => {
    if (window.utools) {
      try {
        const savePrefix = saveManager.getGameSavePrefix('tetris')
        const docs = await saveManager.getAllDocs(savePrefix + 'settings')
        if (docs && docs.length > 0) {
          const settings = JSON.parse(docs[0].data)
          if (typeof settings.swapDropKeys === 'boolean') {
            swapDropKeys.value = settings.swapDropKeys
          }
        }
      } catch (error) {
        console.error('[设置] 加载互换按键设置失败:', error)
      }
    } else {
      const saved = localStorage.getItem('tetris_swap_keys')
      if (saved !== null) {
        swapDropKeys.value = saved === 'true'
      }
    }
  }

  // 保存按键设置
  const saveSwapKeysSetting = async (saveManager) => {
    if (window.utools) {
      try {
        const savePrefix = saveManager.getGameSavePrefix('tetris')
        await saveManager.putDoc({
          _id: savePrefix + 'settings',
          data: JSON.stringify({ swapDropKeys: swapDropKeys.value }),
          updatedAt: Date.now()
        })
      } catch (error) {
        console.error('[设置] 保存互换按键设置失败:', error)
      }
    } else {
      localStorage.setItem('tetris_swap_keys', swapDropKeys.value.toString())
    }
  }

  // 生命周期
  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleWindowBlur)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
    window.removeEventListener('blur', handleWindowBlur)
  })

  return {
    swapDropKeys,
    keysPressed,
    lastMoveTime,
    loadSwapKeysSetting,
    saveSwapKeysSetting
  }
}
