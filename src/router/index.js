import { createRouter, createWebHashHistory } from 'vue-router'
import GameList from '../GameList/index.vue'
import GameView from '../views/GameView.vue'
import TetrisGame from '../components/TetrisGame.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: GameList
  },
  {
    path: '/game/:id',
    name: 'Game',
    component: GameView,
    props: true
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
