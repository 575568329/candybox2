# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 **uTools 插件**的游戏集合，使用 **Vue 3 + Vite** 构建。应用运行在 uTools 的嵌入式浏览器中，提供云存档、数据统计和统一的游戏体验。

**技术栈**: Vue 3 (Composition API)、Vite 6、Vue Router 4、uTools API

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器（运行在 5177 端口）
npm run dev

# 构建生产版本
npm run build
```

**重要提示**: 开发服务器必须运行在 `http://localhost:5177`，以匹配 `public/plugin.json` 中的配置。该端口也用于 uTools 本地插件开发。

## 架构设计

### 游戏集成模式

代码库支持两种截然不同的游戏集成方式：

#### 1. Vue 组件游戏（原生）
作为 Vue 组件实现的游戏，完全集成到应用生态系统中。
- **示例**: 俄罗斯方块、糖果盒子2
- **结构**: `src/components/` 中的游戏组件 + `src/views/` 中的视图包装器
- **优势**: 完全的 UI 控制、状态管理集成、直接访问 uTools API
- **俄罗斯方块特有**: 使用 `src/composables/useTetris*.js` 中的组合式函数模式实现模块化逻辑

#### 2. iframe 嵌入游戏（外部）
通过 iframe 嵌入的现有游戏，使用自定义消息传递实现存档/加载。
- **示例**: 小黑屋、六边形俄罗斯方块、环形之路、人生重开模拟器、坦克大战
- **结构**: `public/{game-id}/` 中的游戏文件 + 带 iframe 的视图包装器
- **集成方式**: 自定义 `utools-adapter.js` 文件实现云存档同步
- **消息协议**: 使用 `postMessage` 进行跨框架通信（见 `saveManager.js:192-286`）

### 核心目录结构

```
src/
├── GameList/index.vue       # 游戏选择中心 + 游戏配置数组
├── views/                   # 每个游戏的视图包装器（导航 + 存档控制）
├── components/              # Vue 组件游戏
├── composables/             # Vue 3 组合式函数（仅俄罗斯方块使用）
├── router/index.js          # uTools 兼容的 hash 模式路由
├── utils/
│   ├── saveManager.js       # 统一存档系统（uTools + iframe）
│   ├── analyticsTracker.js  # 使用 Pantry API 的事件追踪
│   └── utools-mock.js       # 浏览器开发环境回退方案
└── App.vue                  # 根组件，包含 uTools API 初始化
```

### 配置文件

- `vite.config.js`: 构建配置，端口 5177，路径别名 `@`，HMR 设置
- `public/plugin.json`: uTools 插件清单，定义用于直接启动游戏的功能/命令
- `jsconfig.json`: `@/` 导入的路径别名

## 核心系统

### 存档管理器 (`src/utils/saveManager.js`)

处理 Vue 组件游戏和 iframe 游戏的统一存档系统：

- **uTools 环境**: 使用 `window.utools.db`（类似 CouchDB）实现云存档
- **iframe 通信**: `postMessage` 协议用于读写 iframe 中的 localStorage
- **键前缀**: `game_save_{gameId}_` 为每个游戏命名空间存档
- **操作方法**: `getSaveInfo()`、`exportSave()`、`importSave()`、`clearSave()`

添加 iframe 游戏时，需要在游戏的 `utools-adapter.js` 中实现消息处理器来响应：
- `{gameId}-get-save-data` → 响应 `{type: "{gameId}-save-data", data: {...}}`
- `{gameId}-set-save-data` → 写入 localStorage，响应 `{type: "{gameId}-save-data-set", success: true}`

### 游戏配置 (`src/GameList/index.vue:44-175`)

所有游戏都在 `games` 数组中定义，包含以下属性：
```javascript
{
  id: 'game-id',              // 用于存档命名空间和路由
  name: '游戏名称',
  englishName: 'Game Name',
  description: '游戏描述',
  icon: '<svg>...</svg>',     // 自定义 SVG 字符串（见 DESIGN.md）
  path: '/game-route',        // 路由路径
  color: '#theme-color',      // 游戏主题色
  category: 'puzzle|rpg|strategy',
  tags: ['标签1', '标签2'],
  difficulty: '简单|中等|困难',
  players: '单人|多人',
  duration: '每局X分钟',
  isVueComponent: true,       // Vue 游戏为 true，iframe 游戏省略
  source: '来源'              // 转载游戏标注
}
```

### 路由系统 (`src/router/index.js`)

使用 **hash 模式**（`createWebHashHistory()`）以兼容 uTools。所有路由都使用动态导入进行懒加载。

添加新游戏路由：
```javascript
{
  path: '/newgame',
  name: 'NewGame',
  component: () => import('../views/NewGameView.vue')
}
```

### uTools 集成

**插件入口** (`public/plugin.json`):
- `games` - 打开游戏选择列表
- `{gameId}` - 直接启动特定游戏

**API 使用**:
- `window.utools.onPluginEnter((action) => {})` - 处理启动操作
- `window.utools.onPluginOut(() => {})` - 退出时清理
- `window.utools.db.promises.*` - 异步数据库操作
- `window.utools.dbStorage` - 简单的键值存储

**环境检测** (`src/utils/utools-mock.js`):
```javascript
const isUToolsEnv = typeof window !== 'undefined' && window.utools
```

## 添加新游戏

### Vue 组件游戏

1. 创建 `src/components/NewGame.vue` 实现游戏逻辑
2. 创建 `src/views/NewGameView.vue` 作为包装器（包含导航、存档控制）
3. 在 `src/router/index.js` 中添加路由
4. 在 `src/GameList/index.vue` 的 games 数组中添加游戏配置，设置 `isVueComponent: true`
5. 在 `public/plugin.json` 中添加功能以支持直接启动（可选）

### iframe 游戏

1. 将游戏文件放在 `public/newgame/` 目录
2. 创建 `src/views/NewGameView.vue`，使用 iframe 指向 `/newgame/`
3. 在 `src/router/index.js` 中添加路由
4. 在 `src/GameList/index.vue` 中添加游戏配置（省略 `isVueComponent`）
5. 创建 `public/newgame/utools-adapter.js` 处理消息传递（存档/加载）
6. 在 `public/plugin.json` 中添加功能以支持直接启动（可选）

### 图标设计

所有游戏图标都是存储在游戏配置中的**自定义 SVG 字符串**。图标设计指南见 `docs/DESIGN.md`：
- 使用 64x64 viewBox
- 颜色设置为 `currentColor` 以继承主题
- 通过 CSS 应用霓虹发光效果
- 保持极简扁平设计风格

## 构建与部署

```bash
npm run build  # 输出到 dist/
```

uTools 插件开发流程：
1. 启动开发服务器（`npm run dev`）
2. 在 uTools 中：设置 → 插件开发 → 本地开发插件
3. 添加 `public/` 目录
4. 插件将自动加载并支持热重载

## 重要约束

- **端口**: 开发服务器必须使用 5177 端口（在 `vite.config.js` 和 `plugin.json` 中配置）
- **路由**: 始终使用 hash 模式以兼容 uTools
- **存档键**: 使用 `game_save_{gameId}_` 前缀避免冲突
- **消息传递**: 使用 iframe 的 `postMessage` 时需验证 event.origin
- **路径导入**: 使用 `@/` 别名导入 src 目录文件
- **语境**: 使用中文语境编写文档和注释等文字工作

## 浏览器 vs uTools 环境

应用在两种环境中均可工作：
- **浏览器**: 使用 `utools-mock.js` 和 localStorage 回退方案，显示环境警告
- **uTools**: 完整的云存档集成、直接启动命令、嵌入式浏览器

在浏览器中测试 iframe 游戏时，存档将使用 localStorage 而非 uTools db。
