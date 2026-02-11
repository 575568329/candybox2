import { createRouter, createWebHashHistory } from 'vue-router'
import GameList from '../GameList/index.vue'
import ADarkRoomView from '../views/ADarkRoomView.vue'
import HextrisView from '../views/HextrisView.vue'
import TetrisGame from '../components/TetrisGame.vue'
import CandyBox2Game from '../components/CandyBox2Game.vue'
import LifeRestartGame from '../components/LifeRestartGame.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: GameList
  },
  {
    path: '/adarkroom',
    name: 'ADarkRoom',
    component: ADarkRoomView
  },
  {
    path: '/hextris',
    name: 'Hextris',
    component: HextrisView
  },
  {
    path: '/tetris',
    name: 'Tetris',
    component: TetrisGame
  },
  {
    path: '/candybox2',
    name: 'CandyBox2',
    component: CandyBox2Game
  },
  {
    path: '/liferestart',
    name: 'LifeRestart',
    component: LifeRestartGame
  }
]

// 使用 Hash 模式以兼容 uTools 环境
const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
