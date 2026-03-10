import { createRouter, createWebHashHistory } from 'vue-router'

// 路由懒加载 - 按类型分组，减小首屏 bundle
const routes = [
  // 首页
  {
    path: '/',
    name: 'Home',
    component: () => import('../GameList/index.vue')
  },

  // RPG 游戏组
  {
    path: '/adarkroom',
    name: 'ADarkRoom',
    component: () => import('../views/ADarkRoomView.vue'),
    meta: { category: 'rpg' }
  },
  {
    path: '/candybox2',
    name: 'CandyBox2',
    component: () => import('../views/CandyBox2View.vue'),
    meta: { category: 'rpg', isVueComponent: true }
  },
  {
    path: '/liferestart',
    name: 'LifeRestart',
    component: () => import('../views/LifeRestartView.vue'),
    meta: { category: 'rpg', isVueComponent: true }
  },

  // 益智游戏组
  {
    path: '/tetris',
    name: 'Tetris',
    component: () => import('../views/TetrisGameView.vue'),
    meta: { category: 'puzzle', isVueComponent: true }
  },
  {
    path: '/hextris',
    name: 'Hextris',
    component: () => import('../views/HextrisView.vue'),
    meta: { category: 'puzzle' }
  },
  {
    path: '/circlepath',
    name: 'CirclePath',
    component: () => import('../views/CirclePathView.vue'),
    meta: { category: 'puzzle' }
  },

  // 策略游戏组
  {
    path: '/tank',
    name: 'Tank',
    component: () => import('../views/TankView.vue'),
    meta: { category: 'strategy' }
  },

  // 修仙游戏（使用嵌套路由）
  {
    path: '/xiuxian',
    name: 'XiuxianGame',
    component: () => import('../xiuxian/XiuxianGame.vue'),
    meta: { category: 'rpg', isVueComponent: true },
    redirect: '/xiuxian/home',
    children: [
      {
        path: '',
        name: 'XiuxianIndex',
        component: () => import('../xiuxian/views/indexPage.vue')
      },
      {
        path: 'home',
        name: 'XiuxianHome',
        component: () => import('../xiuxian/views/homePage.vue')
      },
      {
        path: 'cultivate',
        name: 'XiuxianCultivate',
        component: () => import('../xiuxian/views/cultivatePage.vue')
      },
      {
        path: 'map',
        name: 'XiuxianMap',
        component: () => import('../xiuxian/views/mapExploration.vue')
      },
      {
        path: 'explore',
        name: 'XiuxianExplore',
        component: () => import('../xiuxian/views/explorePage.vue')
      },
      {
        path: 'boss',
        name: 'XiuxianBoss',
        component: () => import('../xiuxian/views/bossPage.vue')
      },
      {
        path: 'endlesstower',
        name: 'XiuxianEndlessTower',
        component: () => import('../xiuxian/views/endlessPage.vue')
      },
      {
        path: 'game',
        name: 'XiuxianGamePage',
        component: () => import('../xiuxian/views/game/game.vue')
      }
    ]
  }
]

// 使用 Hash 模式以兼容 uTools 环境
const router = createRouter({
  history: createWebHashHistory(),
  routes,
  // 滚动行为
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0 }
  }
})

export default router
