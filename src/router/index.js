import { createRouter, createWebHashHistory } from 'vue-router'
import GameList from '../GameList/index.vue'
import ADarkRoomView from '../views/ADarkRoomView.vue'
import TetrisGame from '../components/TetrisGame.vue'

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
    path: '/tetris',
    name: 'Tetris',
    component: TetrisGame
  }
]

// 使用 Hash 模式以兼容 uTools 环境
const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
