/**
 * 游戏配置文件
 * 集中管理所有游戏的配置信息
 */

export const categories = [
  {
    id: 'all',
    name: '全部',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="18" height="18" rx="3" stroke="currentColor" stroke-width="4"/><rect x="36" y="10" width="18" height="18" rx="3" stroke="currentColor" stroke-width="4"/><rect x="10" y="36" width="18" height="18" rx="3" stroke="currentColor" stroke-width="4"/><rect x="36" y="36" width="18" height="18" rx="3" stroke="currentColor" stroke-width="4"/></svg>`
  },
  {
    id: 'rpg',
    name: '角色扮演',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M32 8L42 18V30L52 40L42 44L32 56L22 44L12 40L22 30V18L32 8Z" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M32 8V20M32 38V56M22 30L28 36M42 30L36 36" stroke="currentColor" stroke-width="2"/></svg>`
  },
  {
    id: 'puzzle',
    name: '益智',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M32 8L52 16V32L40 44L24 44L12 32V16L32 8Z" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><circle cx="32" cy="28" r="6" fill="currentColor" fill-opacity="0.3"/></svg>`
  },
  {
    id: 'strategy',
    name: '策略',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="20" stroke="currentColor" stroke-width="4"/><circle cx="32" cy="32" r="12" stroke="currentColor" stroke-width="4"/><circle cx="32" cy="32" r="4" fill="currentColor"/><path d="M32 8V12M32 52V56M8 32H12M52 32H56" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`
  }
]

export const games = [
  {
    id: 'tetris',
    name: '俄罗斯方块',
    englishName: 'Tetris',
    description: '经典消除游戏，挑战极限速度',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="12" width="18" height="18" rx="2" fill="currentColor"/><rect x="34" y="12" width="18" height="18" rx="2" fill="currentColor" fill-opacity="0.7"/><rect x="12" y="34" width="18" height="18" rx="2" fill="currentColor" fill-opacity="0.7"/><rect x="34" y="34" width="18" height="18" rx="2" fill="currentColor" fill-opacity="0.4"/></svg>`,
    path: '/tetris',
    color: '#667eea',
    category: 'puzzle',
    tags: ['益智', '消除', '经典'],
    difficulty: '中等',
    players: '单人',
    duration: '每局5-30分钟',
    isVueComponent: true
  },
  {
    id: 'hextris',
    name: '六边形俄罗斯方块',
    englishName: 'Hextris',
    description: '经典的六边形旋转消除游戏，体验不一样的俄罗斯方块',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M32 8L54 20V44L32 56L10 44V20L32 8Z" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M32 20L44 26V38L32 44L20 38V26L32 20Z" fill="currentColor" fill-opacity="0.3"/><path d="M32 32L36 34V38L32 40L28 38V34L32 32Z" fill="currentColor"/></svg>`,
    path: '/hextris',
    color: '#3498db',
    category: 'puzzle',
    tags: ['益智', '消除', '经典', '转载'],
    difficulty: '中等',
    players: '单人',
    duration: '每局5-30分钟',
    source: '转载自 hextris.io',
    githubUrl: 'https://github.com/Hextris/Hextris'
  },
  {
    id: 'circlepath',
    name: '环形之路',
    englishName: 'Circle Path',
    description: '极简风格的节奏点击游戏，在环形之路上精准跳跃',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="24" stroke="currentColor" stroke-width="4" stroke-dasharray="6 6"/><circle cx="32" cy="8" r="6" fill="currentColor"/></svg>`,
    path: '/circlepath',
    color: '#62bd18',
    category: 'puzzle',
    tags: ['益智', '节奏', '极简', '转载'],
    difficulty: '简单',
    players: '单人',
    duration: '每局1-5分钟',
    source: '转载自 circlepath',
    githubUrl: 'https://github.com/channingbreeze/games'
  },
  {
    id: 'adarkroom',
    name: '小黑屋',
    englishName: 'A Dark Room',
    description: '极简主义文字冒险游戏，在黑暗中求生',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M32 12L52 28V52H12V28L32 12Z" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><rect x="28" y="36" width="8" height="16" fill="currentColor" fill-opacity="0.5"/><path d="M20 28H44" stroke="currentColor" stroke-width="2"/></svg>`,
    path: '/adarkroom',
    color: '#a0aec0',
    category: 'rpg',
    tags: ['RPG', '文字', '冒险', '转载'],
    difficulty: '困难',
    players: '单人',
    duration: '2-5小时',
    source: '转载自 doublespeakgames.com',
    githubUrl: 'https://github.com/doublespeakgames/adarkroom'
  },
  {
    id: 'candybox2',
    name: '糖果盒子2',
    englishName: 'Candy Box 2',
    description: 'ASCII艺术风格的文字RPG冒险游戏，收集糖果，探索世界',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="16" y="24" width="32" height="20" rx="4" stroke="currentColor" stroke-width="4"/><path d="M16 34C10 34 10 24 16 24M48 34C54 34 54 24 48 24" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><circle cx="32" cy="34" r="4" fill="currentColor"/></svg>`,
    path: '/candybox2',
    color: '#ff6b9d',
    category: 'rpg',
    tags: ['RPG', '文字', '冒险', 'ASCII'],
    difficulty: '中等',
    players: '单人',
    duration: '2-4小时',
    isVueComponent: true,
    githubUrl: 'https://github.com/weizenbaum/candybox2'
  },
  {
    id: 'liferestart',
    name: '人生重开模拟器',
    englishName: 'Life Restart',
    description: '模拟另一种人生，体验不同的人生轨迹和选择',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M48 32C48 40.8366 40.8366 48 32 48C23.1634 48 16 40.8366 16 32C16 23.1634 23.1634 16 32 16C36.4183 16 40.4183 17.7909 43.3137 20.6863" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M36 21H44V13" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="32" cy="32" r="6" fill="currentColor"/></svg>`,
    path: '/liferestart',
    color: '#48bb78',
    category: 'rpg',
    tags: ['RPG', '模拟', '文字', '人生'],
    difficulty: '简单',
    players: '单人',
    duration: '每局5-15分钟',
    isVueComponent: true,
    githubUrl: 'https://github.com/VickScarlet/lifeRestart'
  },
  {
    id: 'tank',
    name: '坦克大战',
    englishName: 'Tank Battle',
    description: '经典FC坦克大战游戏，保卫基地，消灭敌军坦克',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="16" y="24" width="32" height="24" rx="2" stroke="currentColor" stroke-width="4"/><rect x="24" y="16" width="16" height="12" rx="2" stroke="currentColor" stroke-width="4"/><path d="M32 16V8M28 8H36" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M12 40H16M48 40H52" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`,
    path: '/tank',
    color: '#5c6bc0',
    category: 'strategy',
    tags: ['策略', '射击', '经典', '双人'],
    difficulty: '中等',
    players: '单人/双人',
    duration: '每局10-30分钟',
    githubUrl: 'https://github.com/channingbreeze/games'
  }
]

/**
 * 根据ID获取游戏配置
 * @param {string} id - 游戏ID
 * @returns {Object|undefined}
 */
export function getGameById(id) {
  return games.find(game => game.id === id)
}

/**
 * 根据分类获取游戏列表
 * @param {string} categoryId - 分类ID
 * @returns {Array}
 */
export function getGamesByCategory(categoryId) {
  if (categoryId === 'all') {
    return games
  }
  return games.filter(game => game.category === categoryId)
}

/**
 * 搜索游戏
 * @param {string} query - 搜索关键词
 * @returns {Array}
 */
export function searchGames(query) {
  const lowerQuery = query.toLowerCase()
  return games.filter(game =>
    game.name.toLowerCase().includes(lowerQuery) ||
    game.englishName.toLowerCase().includes(lowerQuery) ||
    game.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  )
}

export default {
  categories,
  games,
  getGameById,
  getGamesByCategory,
  searchGames
}
