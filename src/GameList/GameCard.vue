<script setup>
/**
 * GameCard —— 首页游戏卡片（方案阶段2：卡片信息减负）
 * 主层只保留: 图标/名称/英文名/描述(2行截断)/标签(≤3)/一行元数据/开始入口；
 * 来源仓库长 URL 收成小图标按钮(点击复制)，减少视觉噪音。
 */
import { computed } from 'vue'

const props = defineProps({
  game: { type: Object, required: true }
})

const emit = defineEmits(['open', 'copy-url'])

// 标签最多展示 3 个，超出显示 +N
const visibleTags = computed(() => (props.game.tags || []).slice(0, 3))
const extraTagCount = computed(() => Math.max(0, (props.game.tags || []).length - 3))

// 一行元数据：难度 · 人数 · 时长
const metaLine = computed(() => {
  const parts = []
  if (props.game.difficulty) parts.push(props.game.difficulty)
  if (props.game.players) parts.push(props.game.players)
  if (props.game.duration) parts.push(props.game.duration)
  return parts.join(' · ')
})

const onCopy = (event) => {
  emit('copy-url', props.game.githubUrl, event)
}
</script>

<template>
  <div
    class="game-card"
    :class="{
      disabled: game.disabled,
      'coming-soon': game.comingSoon
    }"
    :style="{ '--card-color': game.color }"
    @click="emit('open', game)"
  >
    <div class="card-header">
      <!-- 安全说明: game.icon 是内部静态 SVG 配置，非用户输入，XSS 风险可控 -->
      <div class="game-icon" v-html="game.icon"></div>
      <div class="header-side">
        <div v-if="game.isExternalLink" class="external-link-badge">转载</div>
        <div v-if="game.comingSoon" class="coming-soon-badge">即将推出</div>
        <button
          v-if="game.githubUrl"
          class="copy-btn"
          title="复制来源地址"
          @click.stop="onCopy"
        >
          <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
            <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
            <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="card-body">
      <h3 class="game-name">{{ game.name }}</h3>
      <p class="game-english-name">{{ game.englishName }}</p>
      <p class="game-description">{{ game.description }}</p>

      <div class="game-tags">
        <span v-for="tag in visibleTags" :key="tag" class="tag">{{ tag }}</span>
        <span v-if="extraTagCount > 0" class="tag tag-more">+{{ extraTagCount }}</span>
      </div>
    </div>

    <div class="card-footer">
      <span v-if="metaLine" class="meta-line">{{ metaLine }}</span>
      <span v-else></span>
      <span class="game-action">
        <span v-if="game.comingSoon">敬请期待</span>
        <span v-else-if="game.disabled">暂不可用</span>
        <span v-else>开始游戏 →</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.game-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 168px;
}

.game-card:hover {
  transform: translateY(-3px);
  border-color: var(--card-color, var(--gs-accent));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.game-card.coming-soon,
.game-card.disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* 顶部彩色条（游戏主色） */
.game-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--card-color, var(--gs-accent));
}

/* 头部：图标 + 徽章/复制按钮 */
.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.game-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: var(--card-color, var(--gs-accent));
}

.game-icon :deep(svg) {
  width: 26px;
  height: 26px;
}

.header-side {
  display: flex;
  align-items: center;
  gap: 6px;
}

.external-link-badge,
.coming-soon-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
}

.external-link-badge {
  background: rgba(255, 255, 255, 0.12);
  color: var(--gs-text-2);
}

.coming-soon-badge {
  background: rgba(88, 164, 252, 0.2);
  color: var(--gs-accent);
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: var(--gs-btn-bg);
  border: 1px solid var(--gs-btn-border);
  border-radius: var(--gs-radius);
  color: var(--gs-text-2);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.copy-btn:hover {
  background: var(--gs-btn-bg-hover);
  color: var(--gs-text-1);
}

/* 主体：名称/描述/标签 */
.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.game-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--gs-text-1);
}

.game-english-name {
  font-size: 12px;
  color: var(--gs-text-2);
}

.game-description {
  font-size: 13px;
  color: var(--gs-text-2);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.game-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}

.tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--gs-text-2);
  white-space: nowrap;
}

.tag-more {
  background: transparent;
  border: 1px dashed rgba(255, 255, 255, 0.2);
}

/* 底部：一行元数据 + 开始入口 */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.meta-line {
  font-size: 11px;
  color: var(--gs-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.game-action {
  font-size: 13px;
  font-weight: 500;
  color: var(--card-color, var(--gs-accent));
  white-space: nowrap;
}
</style>
