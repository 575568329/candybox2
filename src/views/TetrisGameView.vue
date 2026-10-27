<script setup>
/**
 * 俄罗斯方块游戏视图
 * 壳层(头部/返回/埋点会话)由 GameShell 提供
 */
import TetrisGame from '../components/TetrisGame.vue'
import GameShell from '../components/GameShell.vue'
import { getGameById } from '../config/games'

const gameConfig = getGameById('tetris')
</script>

<template>
  <GameShell
    game-id="tetris"
    game-name="俄罗斯方块"
    game-english-name="Tetris - 经典消除游戏"
    :game-icon="gameConfig.icon"
    icon-color="#667eea"
    background-color="#131417"
    accent-color="#667eea"
    :auto-hide-header="false"
  >
    <TetrisGame />
  </GameShell>
</template>
