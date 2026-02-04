<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { saveManager } from '../utils/saveManager.js'

const router = useRouter()

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

// 存档信息
const saveInfo = ref({
  hasSave: false,
  count: 0,
  candy: 0,
  lollipops: 0
})

// 游戏启动确认弹窗
const showGameStartModal = ref(false)
const selectedGame = ref(null)

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

// 检查是否在 uTools 环境中
const isUToolsEnv = computed(() => {
  return typeof window !== 'undefined' && window.utools
})

// 打开游戏
const openGame = async (game) => {
  if (game.disabled || game.comingSoon) return

  // 检查是否在 uTools 环境中
  if (!isUToolsEnv.value) {
    console.error('当前不在 uTools 环境中')
    alert('请在 uTools 中打开此插件以使用游戏功能')
    return
  }

  // 保存选中的游戏
  selectedGame.value = game

  // 加载该游戏的存档信息
  const info = await saveManager.getSaveInfo(game.id)
  saveInfo.value = info

  // 检查是否有存档
  if (info.hasSave) {
    // 显示游戏启动确认弹窗
    showGameStartModal.value = true
  } else {
    // 没有存档，直接开始游戏
    launchGame(game)
  }
}

// 启动游戏（新游戏）
const startNewGame = () => {
  if (!selectedGame.value) return

  // 清除该游戏的存档
  saveManager.clearSave(selectedGame.value.id).then(result => {
    console.log('存档已清除:', result.message)
    // 启动游戏
    launchGame(selectedGame.value)
    // 关闭弹窗
    showGameStartModal.value = false
  })
}

// 继续游戏
const continueGame = () => {
  if (!selectedGame.value) return

  // 直接启动游戏（游戏会自动加载存档）
  launchGame(selectedGame.value)
  // 关闭弹窗
  showGameStartModal.value = false
}

// 实际启动游戏 - 使用路由跳转
const launchGame = (game) => {
  router.push(`/game/${game.id}`)
}

// 选择分类
const selectCategory = (categoryId) => {
  activeCategory.value = categoryId
}
</script>

<template>
  <div class="game-container">
    <!-- 环境提示 -->
    <div v-if="!isUToolsEnv" class="env-warning">
      <span class="warning-icon">⚠️</span>
      <span class="warning-text">当前在浏览器中预览，请在 uTools 中安装此插件以使用完整功能</span>
    </div>

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
      <div class="top-actions">
        <div class="stats">
          <span class="stat-item">{{ stats.total }} 款游戏</span>
          <span v-if="stats.comingSoon > 0" class="stat-item coming-soon">
            {{ stats.comingSoon }} 款即将推出
          </span>
        </div>
      </div>
    </div>

    <!-- 游戏启动确认弹窗 -->
    <div v-if="showGameStartModal" class="game-start-overlay" @click="showGameStartModal = false">
      <div class="game-start-modal" @click.stop>
        <div class="modal-header">
          <h3>🎮 {{ selectedGame?.name }}</h3>
          <button class="close-btn" @click="showGameStartModal = false">✕</button>
        </div>

        <div class="modal-content">
          <!-- 存档预览 -->
          <div v-if="saveInfo.hasSave" class="save-preview">
            <div class="preview-header">
              <span class="preview-icon">💾</span>
              <span class="preview-title">发现现有存档</span>
            </div>
            <div class="preview-stats">
              <div class="stat-card">
                <span class="stat-icon">🍬</span>
                <div class="stat-info">
                  <span class="stat-label">糖果</span>
                  <span class="stat-value">{{ saveInfo.candy?.toLocaleString() || 0 }}</span>
                </div>
              </div>
              <div class="stat-card">
                <span class="stat-icon">🍭</span>
                <div class="stat-info">
                  <span class="stat-label">棒棒糖</span>
                  <span class="stat-value">{{ saveInfo.lollipops?.toLocaleString() || 0 }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 选择提示 -->
          <div class="modal-message">
            <p>请选择如何开始游戏：</p>
          </div>

          <!-- 操作按钮 -->
          <div class="modal-actions">
            <button class="modal-btn primary" @click="continueGame">
              <span class="btn-icon">▶️</span>
              <div class="btn-content">
                <span class="btn-title">继续游戏</span>
                <span class="btn-desc">使用现有存档继续冒险</span>
              </div>
            </button>
            <button class="modal-btn danger" @click="startNewGame">
              <span class="btn-icon">🆕</span>
              <div class="btn-content">
                <span class="btn-title">新游戏</span>
                <span class="btn-desc">清除存档，重新开始</span>
              </div>
            </button>
          </div>

          <!-- 取消按钮 -->
          <div class="modal-footer">
            <button class="text-btn" @click="showGameStartModal = false">
              取消
            </button>
          </div>
        </div>
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
              <div class="header-actions">
                <div v-if="game.comingSoon" class="coming-soon-badge">即将推出</div>
              </div>
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

/* 环境提示 */
.env-warning {
  background: rgba(255, 193, 7, 0.15);
  border-bottom: 1px solid rgba(255, 193, 7, 0.3);
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.warning-icon {
  font-size: 16px;
}

.warning-text {
  font-size: 12px;
  color: #ffc107;
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

.top-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: scale(1.05);
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
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

/* 游戏启动确认弹窗 */
.game-start-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
  animation: fadeIn 0.2s ease;
}

.game-start-modal {
  background: linear-gradient(135deg, #1e1e32 0%, #1a1a2e 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  width: 90%;
  max-width: 520px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: white;
}

.modal-content {
  padding: 28px;
  overflow-y: auto;
  flex: 1;
}

/* 存档预览 */
.save-preview {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.preview-icon {
  font-size: 28px;
}

.preview-title {
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.preview-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 14px 16px;
}

.stat-icon {
  font-size: 24px;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: white;
}

/* 模态框消息 */
.modal-message {
  text-align: center;
  margin-bottom: 24px;
}

.modal-message p {
  margin: 0;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

/* 操作按钮 */
.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.modal-btn {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 18px 24px;
  border: 2px solid transparent;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.08);
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.modal-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
}

.modal-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: rgba(102, 126, 234, 0.3);
}

.modal-btn.primary:hover {
  background: linear-gradient(135deg, #7b8ff0 0%, #8b5bb8 100%);
  border-color: rgba(102, 126, 234, 0.5);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
}

.modal-btn.danger {
  background: rgba(255, 107, 107, 0.15);
  border-color: rgba(255, 107, 107, 0.3);
  color: #ff6b6b;
}

.modal-btn.danger:hover {
  background: rgba(255, 107, 107, 0.25);
  border-color: rgba(255, 107, 107, 0.5);
  box-shadow: 0 8px 20px rgba(255, 107, 107, 0.2);
}

.modal-btn .btn-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.btn-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.btn-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
}

.btn-desc {
  font-size: 13px;
  opacity: 0.8;
  line-height: 1.4;
}

/* 底部取消按钮 */
.modal-footer {
  text-align: center;
  padding-top: 8px;
}

.text-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  padding: 8px 20px;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 8px;
}

.text-btn:hover {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.05);
}

@media (max-width: 600px) {
  .preview-stats {
    grid-template-columns: 1fr;
  }

  .modal-btn {
    padding: 16px 20px;
  }

  .modal-btn .btn-icon {
    font-size: 28px;
  }

  .btn-title {
    font-size: 15px;
  }

  .btn-desc {
    font-size: 12px;
  }
}
</style>
