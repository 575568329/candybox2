<script setup>
import { ref, computed } from 'vue'

// 分类
const categories = ref([
  { id: 'all', name: '全部', icon: '🎮' },
  { id: 'rpg', name: '角色扮演', icon: '⚔️' },
  { id: 'puzzle', name: '益智', icon: '🧩' },
  { id: 'action', name: '动作', icon: '💨' },
  { id: 'strategy', name: '策略', icon: '🎯' }
])

const activeCategory = ref('all')
const searchQuery = ref('')

// 游戏列表配置
const games = ref([
  {
    id: 'candybox2',
    name: '糖果盒子2',
    englishName: 'Candy Box 2',
    description: '文字RPG冒险，从收集糖果开始',
    icon: '🍬',
    path: './src/candybox2/index.html',
    color: '#ff6b6b',
    category: 'rpg',
    tags: ['RPG', '文字', '冒险'],
    difficulty: '中等',
    players: '单人'
  },
  // {
  //   id: 'coming-soon-1',
  //   name: '2048',
  //   englishName: '2048',
  //   description: '经典数字合成游戏',
  //   icon: '🔢',
  //   path: '',
  //   color: '#4ecdc4',
  //   category: 'puzzle',
  //   tags: ['益智', '数字'],
  //   difficulty: '简单',
  //   players: '单人',
  //   disabled: true,
  //   comingSoon: true
  // },
  // {
  //   id: 'coming-soon-2',
  //   name: '贪吃蛇',
  //   englishName: 'Snake',
  //   description: '经典贪吃蛇游戏',
  //   icon: '🐍',
  //   path: '',
  //   color: '#95e1d3',
  //   category: 'action',
  //   tags: ['动作', '经典'],
  //   difficulty: '简单',
  //   players: '单人',
  //   disabled: true,
  //   comingSoon: true
  // },
  // {
  //   id: 'coming-soon-3',
  //   name: '扫雷',
  //   englishName: 'Minesweeper',
  //   description: '经典扫雷游戏',
  //   icon: '💣',
  //   path: '',
  //   color: '#f38181',
  //   category: 'puzzle',
  //   tags: ['益智', '逻辑'],
  //   difficulty: '中等',
  //   players: '单人',
  //   disabled: true,
  //   comingSoon: true
  // },
  // {
  //   id: 'coming-soon-4',
  //   name: '俄罗斯方块',
  //   englishName: 'Tetris',
  //   description: '经典方块消除游戏',
  //   icon: '🧱',
  //   path: '',
  //   color: '#aa96da',
  //   category: 'puzzle',
  //   tags: ['益智', '经典'],
  //   difficulty: '中等',
  //   players: '单人',
  //   disabled: true,
  //   comingSoon: true
  // },
  // {
  //   id: 'coming-soon-5',
  //   name: '推箱子',
  //   englishName: 'Sokoban',
  //   description: '经典推箱子益智游戏',
  //   icon: '📦',
  //   path: '',
  //   color: '#fcbad3',
  //   category: 'puzzle',
  //   tags: ['益智', '逻辑'],
  //   difficulty: '困难',
  //   players: '单人',
  //   disabled: true,
  //   comingSoon: true
  // }
])

// 筛选后的游戏列表
const filteredGames = computed(() => {
  let result = games.value

  // 按分类筛选
  if (activeCategory.value !== 'all') {
    result = result.filter(game => game.category === activeCategory.value)
  }

  // 按搜索关键词筛选
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(game =>
      game.name.toLowerCase().includes(query) ||
      game.englishName.toLowerCase().includes(query) ||
      game.tags.some(tag => tag.toLowerCase().includes(query))
    )
  }

  return result
})

// 统计信息
const stats = computed(() => ({
  total: games.value.filter(g => !g.disabled).length,
  comingSoon: games.value.filter(g => g.comingSoon).length
}))

// 打开游戏
const openGame = (game) => {
  if (game.disabled || game.comingSoon) return

  // 使用 ubrowser 打开本地游戏文件
  const gameUrl = window.location.origin + '/' + game.path

  window.utools.ubrowser
    .goto(gameUrl)
    .run({
      width: 1200,
      height: 800,
      center: true,
      title: game.name
    })
    .then(([result, instance]) => {
      console.log('游戏已打开', instance)
    })
    .catch(err => {
      console.error('打开游戏失败', err)
    })
}

// 选择分类
const selectCategory = (categoryId) => {
  activeCategory.value = categoryId
}
</script>

<template>
  <div class="game-container">
    <!-- 顶部栏 -->
    <div class="top-bar">
      <div class="logo">
        <span class="logo-icon">🎮</span>
        <span class="logo-text">小游戏集合</span>
      </div>
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索游戏..."
          class="search-input"
        />
        <span class="search-icon">🔍</span>
      </div>
      <div class="stats">
        <span class="stat-item">{{ stats.total }} 款游戏</span>
        <span v-if="stats.comingSoon > 0" class="stat-item coming-soon">
          {{ stats.comingSoon }} 款即将推出
        </span>
      </div>
    </div>

    <!-- 主体内容 -->
    <div class="main-content">
      <!-- 左侧分类栏 -->
      <div class="sidebar">
        <div class="category-list">
          <div
            v-for="category in categories"
            :key="category.id"
            class="category-item"
            :class="{ active: activeCategory === category.id }"
            @click="selectCategory(category.id)"
          >
            <span class="category-icon">{{ category.icon }}</span>
            <span class="category-name">{{ category.name }}</span>
          </div>
        </div>
      </div>

      <!-- 右侧游戏网格 -->
      <div class="games-section">
        <div class="games-grid">
          <div
            v-for="game in filteredGames"
            :key="game.id"
            class="game-card"
            :class="{
              disabled: game.disabled,
              'coming-soon': game.comingSoon
            }"
            :style="{ '--card-color': game.color }"
            @click="openGame(game)"
          >
            <div class="game-header">
              <div class="game-icon">{{ game.icon }}</div>
              <div v-if="game.comingSoon" class="coming-soon-badge">即将推出</div>
            </div>

            <div class="game-info">
              <h3 class="game-name">{{ game.name }}</h3>
              <p class="game-english-name">{{ game.englishName }}</p>
              <p class="game-description">{{ game.description }}</p>

              <div class="game-meta">
                <div class="game-tags">
                  <span
                    v-for="tag in game.tags"
                    :key="tag"
                    class="tag"
                  >
                    {{ tag }}
                  </span>
                </div>
                <div class="game-details">
                  <span class="detail-item">难度: {{ game.difficulty }}</span>
                  <span class="detail-item">{{ game.players }}</span>
                </div>
              </div>
            </div>

            <div class="game-action">
              <span v-if="game.comingSoon">敬请期待</span>
              <span v-else-if="game.disabled">暂不可用</span>
              <span v-else>开始游戏 →</span>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="filteredGames.length === 0" class="empty-state">
          <div class="empty-icon">🎯</div>
          <p class="empty-text">没有找到匹配的游戏</p>
          <button class="empty-btn" @click="searchQuery = ''; activeCategory = 'all'">
            清除筛选
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.game-container {
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 顶部栏 */
.top-bar {
  height: 56px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  font-size: 24px;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: white;
}

.search-box {
  position: relative;
  width: 200px;
}

.search-input {
  width: 100%;
  height: 32px;
  padding: 0 32px 0 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  color: white;
  font-size: 13px;
  outline: none;
  transition: all 0.2s;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.search-input:focus {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.search-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  opacity: 0.5;
}

.stats {
  display: flex;
  gap: 12px;
}

.stat-item {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.stat-item.coming-soon {
  color: #ffd93d;
  background: rgba(255, 217, 61, 0.1);
}

/* 主体内容 */
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 左侧分类栏 */
.sidebar {
  width: 120px;
  background: rgba(0, 0, 0, 0.2);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  overflow-y: auto;
  flex-shrink: 0;
}

.category-list {
  padding: 12px 8px;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.category-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.category-item.active {
  background: rgba(255, 255, 255, 0.15);
}

.category-icon {
  font-size: 24px;
}

.category-name {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
}

.category-item.active .category-name {
  color: white;
  font-weight: 500;
}

/* 右侧游戏区域 */
.games-section {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

/* 游戏卡片 */
.game-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.game-card:hover:not(.disabled) {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.game-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.game-card.coming-soon {
  opacity: 0.6;
}

.game-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--card-color);
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.game-icon {
  font-size: 36px;
  line-height: 1;
}

.coming-soon-badge {
  font-size: 10px;
  color: #ffd93d;
  background: rgba(255, 217, 61, 0.15);
  padding: 3px 8px;
  border-radius: 8px;
  font-weight: 500;
}

.game-name {
  font-size: 14px;
  font-weight: 600;
  color: white;
  margin-bottom: 2px;
  line-height: 1.3;
}

.game-english-name {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 6px;
}

.game-description {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.4;
  margin-bottom: 8px;
  min-height: 34px;
}

.game-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.game-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.game-details {
  display: flex;
  gap: 8px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
}

.game-action {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
  font-size: 12px;
  color: var(--card-color);
  font-weight: 500;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.6);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
  margin-bottom: 16px;
}

.empty-btn {
  padding: 8px 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.empty-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

/* 滚动条样式 */
.sidebar::-webkit-scrollbar,
.games-section::-webkit-scrollbar {
  width: 6px;
}

.sidebar::-webkit-scrollbar-track,
.games-section::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar::-webkit-scrollbar-thumb,
.games-section::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.sidebar::-webkit-scrollbar-thumb:hover,
.games-section::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .sidebar {
    width: 80px;
  }

  .category-name {
    font-size: 10px;
  }

  .games-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }

  .search-box {
    width: 140px;
  }
}
</style>
