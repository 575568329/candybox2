import { createRouter, createWebHashHistory } from 'vue-router'

// 路由懒加载 - 减小首屏 bundle
const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../GameList/index.vue')
  },
  {
    path: '/adarkroom',
    name: 'ADarkRoom',
    component: () => import('../views/ADarkRoomView.vue')
  },
  {
    path: '/hextris',
    name: 'Hextris',
    component: () => import('../views/HextrisView.vue')
  },
  {
    path: '/circlepath',
    name: 'CirclePath',
    component: () => import('../views/CirclePathView.vue')
  },
  {
    path: '/tetris',
    name: 'Tetris',
    component: () => import('../views/TetrisGameView.vue')
  },
  {
    path: '/candybox2',
    name: 'CandyBox2',
    component: () => import('../views/CandyBox2View.vue')
  },
  {
    path: '/liferestart',
    name: 'LifeRestart',
    component: () => import('../views/LifeRestartView.vue')
  },
  {
    path: '/tank',
    name: 'Tank',
    component: () => import('../views/TankView.vue')
  }
]

// 使用 Hash 模式以兼容 uTools 环境
const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
