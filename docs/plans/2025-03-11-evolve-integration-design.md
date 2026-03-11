# 进化游戏集成设计文档

**日期**: 2025-03-11
**状态**: 已批准
**方案**: 最小化集成（方案1）

## 1. 概述

将开源放置类游戏 [Evolve](https://github.com/Yuan producir-ng/evolve) 集成到小游戏集合中，采用 iframe 嵌入方式，保持与现有游戏一致的集成模式。

## 2. 架构设计

### 2.1 集成模式

采用 iframe 嵌入方式，与六边形俄罗斯方块、环形之路等游戏保持一致：

```
用户界面 → EvolveView.vue → iframe → public/evolve/index.html
                                      ↓
                                  Evolve 游戏 (Vue 2)
```

**隔离性**：iframe 隔离确保 Evolve 的 Vue 2 与项目 Vue 3 不冲突。

### 2.2 文件结构

```
src/
├── views/
│   └── EvolveView.vue           # 新建：视图包装器
├── config/
│   └── games.js                 # 修改：添加游戏配置 + 新增分类
└── router/
    └── index.js                 # 修改：添加路由

public/
└── evolve/                      # 已存在：游戏文件（不修改）
    ├── index.html
    ├── evolve/
    │   ├── main.js
    │   └── evolve.css
    └── ...
```

## 3. 详细设计

### 3.1 游戏分类配置

**新增"放置"分类：**

位置：`src/config/games.js` → `categories` 数组

```javascript
{
  id: 'idle',
  name: '放置',
  icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="24" stroke="currentColor" stroke-width="4"/>
    <path d="M32 16V32L40 40" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  </svg>`
}
```

**图标设计思路**：时钟/进度概念，象征放置类游戏的时间推进特性。

### 3.2 游戏配置

**位置**：`src/config/games.js` → `games` 数组

```javascript
{
  id: 'evolve',
  name: '进化',
  englishName: 'Evolve',
  description: '放置类进化模拟游戏，从单细胞开始逐步进化，体验生命演化的奇妙旅程',
  icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 12L28 20H36L32 12Z" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="32" cy="32" r="16" stroke="currentColor" stroke-width="3"/>
    <path d="M32 32V24M32 32L38 38M32 32L26 38" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <circle cx="32" cy="32" r="4" fill="currentColor"/>
  </svg>`,
  path: '/evolve',
  color: '#7E57C2',
  category: 'idle',
  tags: ['放置', '进化', '模拟'],
  difficulty: '简单',
  players: '单人',
  duration: '4-8小时'
}
```

**配置说明**：
- `id`: 游戏唯一标识
- `path`: 路由路径（对应 iframe src）
- `color`: 紫色系，代表神秘和进化
- `tags`: 包含"放置"标签，便于搜索发现
- **不包含** `isVueComponent: true`（iframe 游戏）
- **不包含** `source` 和 `githubUrl`（暂不标注来源）

### 3.3 视图包装器

**文件**：`src/views/EvolveView.vue`

```vue
<template>
  <div class="evolve-container">
    <iframe
      src="/evolve/index.html"
      frameborder="0"
      class="game-frame"
    />
  </div>
</template>

<script setup>
// 无需额外逻辑，纯 iframe 加载
</script>

<style scoped>
.evolve-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.game-frame {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}
</style>
```

**设计要点**：
- 全屏 iframe，无边框
- 容器 `overflow: hidden` 防止滚动条
- 无额外逻辑，保持轻量

### 3.4 路由配置

**文件**：`src/router/index.js`

```javascript
{
  path: '/evolve',
  name: 'Evolve',
  component: () => import('@/views/EvolveView.vue'),
  meta: {
    title: '进化 - Evolve',
    gameId: 'evolve'
  }
}
```

**插入位置**：在 xiuxian 路由之后，保持按 ID 排序。

## 4. 依赖和兼容性

### 4.1 技术栈

| 项目版本 | Evolve 版本 | 兼容性 |
|---------|------------|--------|
| Vue 3 | Vue 2 | ✅ iframe 隔离 |
| Vite 6 | 原生 ES Modules | ✅ 无冲突 |
| Element Plus | Buefy | ✅ iframe 隔离 |
| - | jQuery | ✅ iframe 隔离 |
| - | Chart.js | ✅ iframe 隔离 |

### 4.2 外部依赖

Evolve 使用的 CDN 资源：
- jQuery 3.6.3
- Vue 2.7.14
- Buefy 0.9.22
- Popper.js 2.9.2
- SortableJS 1.10.2
- Chart.js 3.8.2
- Google Fonts (Lato)

**网络要求**：需要互联网连接加载 CDN 资源。

### 4.3 窗口适配

- **uTools 默认**: 800px × 544px
- **Evolve 适配**: 游戏使用响应式设计，可以自适应容器尺寸
- **潜在问题**: 如果游戏在 544px 高度下显示不全，可能需要调整 uTools 窗口或添加内部滚动

## 5. 数据和存储

### 5.1 存档系统

**当前方案**: 使用 Evolve 自带的本地存储（localStorage）

**存储位置**: 浏览器 localStorage，键名由 Evolve 内部定义

**云存档**: 本次集成不实现，预留后续扩展：
- 可创建 `public/evolve/utools-adapter.js`
- 拦截 localStorage 操作并转发到 uTools.db
- 参考 `public/circlepath/utools-adapter.js` 的实现

### 5.2 数据隔离

- Evolve 的 localStorage 数据与主应用隔离（iframe 独立上下文）
- 不会影响其他游戏的存档

## 6. 用户体验

### 6.1 游戏列表显示

- 新增"放置"分类标签
- 游戏卡片显示紫色主题色 (#7E57C2)
- 描述突出"进化"和"放置"特性

### 6.2 加载体验

- iframe 加载可能有短暂白屏
- Evolve 自带加载动画（index.html 中的 .loading 样式）
- 无需额外加载提示

### 6.3 可访问性

- 全键盘支持（Evolve 原生支持）
- 响应式设计适配不同窗口尺寸

## 7. 测试要点

集成完成后需要验证：

1. **路由跳转**: 从游戏列表点击"进化"能正确跳转
2. **游戏加载**: iframe 正确加载游戏界面
3. **游戏功能**: 基本游戏流程正常（点击、进化等）
4. **存档功能**: 刷新页面存档保留
5. **窗口适配**: 在 uTools 窗口尺寸下显示正常
6. **分类筛选**: "放置"分类能正确筛选出进化游戏
7. **搜索功能**: 搜索"进化"、"Evolve"、"放置"能找到游戏

## 8. 未来扩展

### 8.1 云存档集成（可选）

创建 `public/evolve/utools-adapter.js`：
```javascript
// 拦截 localStorage 操作
const originalSetItem = localStorage.setItem
localStorage.setItem = function(key, value) {
  // 转发到 uTools.db
  window.parent.postMessage({
    type: 'GAME_SAVE',
    action: 'set',
    key: `evolve_${key}`,
    value
  }, '*')
  originalSetItem.call(this, key, value)
}
// 类似处理 getItem, removeItem
```

在 `index.html` 中引入适配器（在 main.js 之前）。

### 8.2 性能优化（可选）

- 考虑将 CDN 资源本地化（减少网络依赖）
- 修改 index.html 移除 Google Analytics

### 8.3 窗口优化（可选）

如果显示不全，可以：
- 建议用户调整 uTools 窗口大小
- 或在 EvolveView 中添加窗口调整逻辑

## 9. 实施清单

- [ ] 创建 `src/views/EvolveView.vue`
- [ ] 在 `src/config/games.js` 添加"放置"分类
- [ ] 在 `src/config/games.js` 添加"进化"游戏配置
- [ ] 在 `src/router/index.js` 添加路由
- [ ] 测试所有功能点（见第7节）

## 10. 风险和限制

| 风险 | 影响 | 缓解措施 |
|-----|------|---------|
| CDN 加载失败 | 游戏无法运行 | 确保网络连接，考虑本地化 |
| 窗口高度不足 | 游戏显示不全 | 测试评估，必要时调整窗口 |
| 存档不同步 | 更换设备丢失进度 | 后续实现云存档 |
| Vue 版本冲突 | 不适用 | iframe 隔离解决 |

## 11. 参考资料

- Evolve 游戏文件位置：`public/evolve/`
- 类似集成参考：`src/views/HextrisView.vue`, `src/views/CirclepathView.vue`
- 项目约束文档：`CLAUDE.md`, `docs/architecture.md`
