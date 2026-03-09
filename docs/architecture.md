# 架构设计文档

## 游戏集成模式

代码库支持三种游戏集成方式：

### 1. Vue 组件游戏（原生）

作为 Vue 组件实现的游戏，完全集成到应用生态系统中。

**示例**: 俄罗斯方块、糖果盒子2、文字修仙

**结构**: `src/components/` 中的游戏组件 + `src/views/` 中的视图包装器

**优势**:
- 完全的 UI 控制
- 状态管理集成
- 直接访问 uTools API

**特殊实现**:
- **俄罗斯方块**: 使用 `src/composables/useTetris*.js` 中的组合式函数模式实现模块化逻辑
- **文字修仙**: 使用嵌套路由和独立模块系统（`src/xiuxian/`），包含完整的 RPG 机制

### 2. iframe 嵌入游戏（外部）

通过 iframe 嵌入的现有游戏，使用自定义消息传递实现存档/加载。

**示例**: 小黑屋、六边形俄罗斯方块、环形之路、人生重开模拟器、坦克大战

**结构**: `public/{game-id}/` 中的游戏文件 + 带 iframe 的视图包装器

**集成方式**: 自定义 `utools-adapter.js` 文件实现云存档同步

**消息协议**: 使用 `postMessage` 进行跨框架通信（见 `saveManager.js:192-286`）

### 3. Vue 组件游戏（复杂/嵌套路由）

对于需要多个页面和复杂状态管理的游戏（如文字修仙）。

**示例结构**:
```
src/
├── views/
│   └── GameIdView.vue        # 包装器
├── gameid/
│   ├── GameIdGame.vue        # 游戏主组件
│   ├── views/                # 各个页面
│   │   ├── indexPage.vue
│   │   ├── homePage.vue
│   │   └── ...
│   ├── components/           # 游戏组件
│   ├── plugins/             # 游戏插件/模块
│   └── utils/               # 工具函数
```

## 核心目录结构

```
src/
├── GameList/index.vue       # 游戏选择中心
├── config/
│   └── games.js             # 游戏配置文件（集中管理所有游戏信息）
├── views/                   # 每个游戏的视图包装器（导航 + 存档控制）
├── components/              # Vue 组件游戏
├── composables/             # Vue 3 组合式函数（仅俄罗斯方块使用）
├── xiuxian/                 # 文字修仙游戏模块
│   ├── views/              # 游戏页面（修炼、地图、探索等）
│   ├── components/         # 游戏组件
│   ├── plugins/            # 游戏插件（装备、商店、NPC等）
│   ├── utils/              # 工具函数
│   └── XiuxianGame.vue     # 游戏根组件
├── router/index.js          # uTools 兼容的 hash 模式路由
├── utils/
│   ├── saveManager.js       # 统一存档系统（uTools + iframe）
│   ├── analyticsTracker.js  # 使用 Pantry API 的事件追踪
│   └── utools-mock.js       # 浏览器开发环境回退方案
└── App.vue                  # 根组件，包含 uTools API 初始化
```

## 配置文件

### vite.config.js
- 构建配置
- 端口 5177
- 路径别名 `@`
- HMR 设置
- Element Plus 自动导入

### public/plugin.json
- uTools 插件清单
- 定义用于直接启动游戏的功能/命令

### jsconfig.json
- `@/` 导入的路径别名

## UI 框架和状态管理

### Element Plus
UI 组件库，自动导入组件和图标。

### Pinia
状态管理库，支持持久化存储。

### vConsole
移动端调试工具（仅开发环境）：
- 仅在开发环境加载
- 默认隐藏，按 `Ctrl+Shift+L` 切换显示
- 支持系统、网络、元素、存储等调试面板

## 存档管理器 (`src/utils/saveManager.js`)

处理 Vue 组件游戏和 iframe 游戏的统一存档系统：

### uTools 环境
使用 `window.utools.db`（类似 CouchDB）实现云存档

### iframe 通信
`postMessage` 协议用于读写 iframe 中的 localStorage

### 键前缀
`game_save_{gameId}_` 为每个游戏命名空间存档

### 操作方法
- `getSaveInfo()` - 获取存档信息
- `exportSave()` - 导出存档
- `importSave()` - 导入存档
- `clearSave()` - 清除存档

### iframe 游戏集成
需要在游戏的 `utools-adapter.js` 中实现消息处理器来响应：
- `{gameId}-get-save-data` → 响应 `{type: "{gameId}-save-data", data: {...}}`
- `{gameId}-set-save-data` → 写入 localStorage，响应 `{type: "{gameId}-save-data-set", success: true}`

## 路由系统

使用 **hash 模式**（`createWebHashHistory()`）以兼容 uTools。

路由按游戏类型分组（RPG、益智、策略），并支持嵌套路由（用于复杂游戏如文字修仙）。

### 嵌套路由示例

```javascript
{
  path: '/xiuxian',
  name: 'XiuxianGame',
  component: () => import('../views/XiuxianGameView.vue'),
  meta: { category: 'rpg', isVueComponent: true },
  redirect: '/xiuxian',
  children: [
    {
      path: '',
      name: 'XiuxianIndex',
      component: () => import('../xiuxian/views/indexPage.vue')
    },
    // 更多子路由...
  ]
}
```

## uTools 集成

### 插件入口 (`public/plugin.json`)
- `games` - 打开游戏选择列表
- `{gameId}` - 直接启动特定游戏

### API 使用
- `window.utools.onPluginEnter((action) => {})` - 处理启动操作
- `window.utools.onPluginOut(() => {})` - 退出时清理
- `window.utools.db.promises.*` - 异步数据库操作
- `window.utools.dbStorage` - 简单的键值存储

### 环境检测 (`src/utils/utools-mock.js`)
```javascript
const isUToolsEnv = typeof window !== 'undefined' && window.utools
```

## 浏览器 vs uTools 环境

### 浏览器环境
- 使用 `utools-mock.js` 和 localStorage 回退方案
- 显示环境警告

### uTools 环境
- 完整的云存档集成
- 直接启动命令
- 嵌入式浏览器

在浏览器中测试 iframe 游戏时，存档将使用 localStorage 而非 uTools db。
