# uTools 小游戏集合

基于 uTools 平台开发的小游戏集合应用，使用 Vue 3 + Vite 构建。

## 功能特性

- 🎮 游戏选择界面：美观的游戏列表展示，支持分类筛选和搜索
- 🧩 俄罗斯方块：经典消除游戏，挑战极限速度
- 🏚️ 小黑屋：极简主义文字冒险游戏（转载）
- 🍬 糖果盒子2：ASCII艺术风格的文字RPG冒险游戏
- 💾 智能存档系统：支持多游戏存档管理，小黑屋支持3槽位存档
- 📊 数据统计：游戏使用统计和用户行为分析
- 🎯 游戏启动确认：有存档时智能提示继续或新游戏
- 📱 响应式设计：适配不同屏幕尺寸
- ✅ 环境检测：自动检测 uTools 环境，非 uTools 环境显示友好提示

## 项目结构

```
小游戏/
├── src/
│   ├── GameList/              # 游戏列表组件
│   │   └── index.vue          # 游戏列表主页（含搜索、分类、打赏）
│   ├── views/                 # 游戏视图组件
│   │   ├── TetrisGameView.vue # 俄罗斯方块游戏视图
│   │   ├── ADarkRoomView.vue  # 小黑屋游戏视图
│   │   └── CandyBox2View.vue  # 糖果盒子2游戏视图
│   ├── components/            # 通用游戏组件
│   │   ├── TetrisGame.vue     # 俄罗斯方块游戏组件
│   │   ├── CandyBox2Game.vue  # 糖果盒子2游戏组件
│   │   └── ConfirmDialog.vue  # 确认对话框组件
│   ├── utils/                 # 工具函数
│   │   ├── saveManager.js     # 存档管理器
│   │   ├── analyticsTracker.js # 数据统计追踪器
│   │   └── candybox2/         # 糖果盒子2相关工具
│   ├── router/                # 路由配置
│   │   └── index.js           # 路由定义
│   ├── App.vue                # 主应用组件
│   └── main.js                # 入口文件
├── public/
│   ├── plugin.json            # uTools 插件配置
│   ├── logo.png               # 插件图标
│   └── zs.png                 # 打赏二维码
├── docs/
│   └── ANALYTICS.md           # 数据分析文档
├── index.html                 # HTML 入口
├── vite.config.js             # Vite 配置
└── package.json
```

## 开发指南

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

开发服务器默认运行在 `http://localhost:5173`，如果端口被占用会自动使用下一个可用端口。

> **注意**：在浏览器中预览时，游戏功能不可用。插件会显示环境提示，需要在 uTools 中安装插件才能使用完整功能。

### 在 uTools 中加载插件

1. 打开 uTools
2. 进入 `设置` -> `插件开发` -> `本地开发插件`
3. 点击 `添加`，选择项目的 `public` 目录
4. 插件会自动加载并显示在 uTools 中

### 使用方式

#### 方式一：游戏列表

1. 在 uTools 中输入 "小游戏" 或 "游戏"
2. 进入游戏选择界面
3. 点击想要玩的游戏即可启动

#### 方式二：直接启动

1. 在 uTools 中输入 "俄罗斯方块"、"小黑屋" 等游戏名称
2. 游戏会直接在 uTools 内置浏览器中打开

## 游戏列表

### 已上线游戏

#### 1. 俄罗斯方块 (Tetris)
- **类型**: 益智消除
- **难度**: 中等
- **特色**: 经典消除游戏，支持等级加速，计分系统
- **实现**: Vue组件实现，完全自研

#### 2. 小黑屋 (A Dark Room)
- **类型**: 文字RPG冒险
- **难度**: 困难
- **特色**: 极简主义文字冒险，独特的游戏机制
- **来源**: 转载自 [doublespeakgames.com](https://adarkroom.doublespeakgames.com/)
- **存档**: 支持3槽位存档管理

#### 3. 糖果盒子2 (Candy Box 2)
- **类型**: ASCII艺术RPG
- **难度**: 中等
- **特色**: ASCII艺术风格，收集糖果，探索世界
- **实现**: Vue组件实现，含完整的存档适配器

## 添加新游戏

### 方式一：Vue组件游戏（推荐）

适用于需要深度定制的游戏，可以完全控制游戏逻辑和UI。

#### 1. 创建游戏组件

在 `src/components/` 下创建游戏组件：
```vue
<!-- src/components/MyGame.vue -->
<script setup>
// 游戏逻辑
</script>

<template>
  <div class="my-game">
    <!-- 游戏界面 -->
  </div>
</template>
```

#### 2. 创建游戏视图

在 `src/views/` 下创建游戏视图，用于包装游戏组件并提供导航栏等UI：
```vue
<!-- src/views/MyGameView.vue -->
<script setup>
import { useRouter } from 'vue-router'
import MyGame from '../components/MyGame.vue'

const router = useRouter()
// 导航和存档逻辑
</script>

<template>
  <div class="my-game-view">
    <!-- 导航栏 -->
    <MyGame />
  </div>
</template>
```

#### 3. 添加路由

在 `src/router/index.js` 中添加路由：
```javascript
{
  path: '/mygame',
  name: 'MyGame',
  component: () => import('../views/MyGameView.vue')
}
```

#### 4. 更新游戏列表

在 `src/GameList/index.vue` 的 `games` 数组中添加：
```javascript
{
  id: 'mygame',
  name: '我的游戏',
  englishName: 'My Game',
  description: '游戏描述',
  icon: '🎮',
  path: '/mygame',
  color: '#4ecdc4',
  category: 'puzzle',
  tags: ['益智', '休闲'],
  difficulty: '简单',
  players: '单人',
  isVueComponent: true // 标记为Vue组件游戏
}
```

### 方式二：iframe嵌入游戏

适用于已有的HTML游戏。

#### 1. 添加游戏文件

将游戏文件放在项目目录或使用外部URL。

#### 2. 创建游戏视图（使用iframe）

在 `src/views/` 下创建视图，使用iframe加载游戏：
```vue
<template>
  <div class="my-game-view">
    <!-- 导航栏 -->
    <iframe :src="gameUrl" class="game-frame"></iframe>
  </div>
</template>
```

#### 3. 更新游戏列表和路由

同方式一的步骤3和4，但不设置 `isVueComponent: true`。

### 更新 plugin.json（可选）

如果想支持直接启动命令，在 `public/plugin.json` 的 `features` 数组中添加：

```json
{
  "code": "mygame",
  "explain": "直接打开我的游戏",
  "cmds": ["我的游戏", "mygame"]
}
```

## 技术栈

- **前端框架**: Vue 3 (Composition API + `<script setup>`)
- **路由**: Vue Router 4
- **构建工具**: Vite 6
- **开发语言**: JavaScript
- **类型支持**: TypeScript类型定义（utools-api-types）
- **uTools API**: ubrowser（可编程浏览器）

### 核心功能模块

1. **存档管理器** (`src/utils/saveManager.js`)
   - 支持多游戏存档
   - 自动保存和加载
   - 存档统计

2. **数据统计** (`src/utils/analyticsTracker.js`)
   - 用户行为追踪
   - 游戏使用统计
   - 自动同步机制

3. **路由系统** (`src/router/index.js`)
   - 基于Vue Router 4
   - 支持懒加载
   - 路由守卫

## uTools API 使用说明

### 监听插件进入事件

```javascript
window.utools.onPluginEnter((action) => {
  console.log('插件进入:', action)
  // action.code: 功能代码（如 "games", "tetris", "adarkroom"）
  // action.payload: 附加数据
})
```

### 监听插件退出事件

```javascript
window.utools.onPluginOut(() => {
  console.log('插件退出')
  // 可以在这里保存状态或清理资源
})
```

### 检测uTools环境

```javascript
const isUToolsEnv = typeof window !== 'undefined' && window.utools
```

### 使用 ubrowser（如需在外部窗口打开）

```javascript
window.utools.ubrowser
  .goto('https://example.com/game')
  .run({
    width: 1200,
    height: 800,
    center: true
  })
```

### 存储API

```javascript
// 保存数据
window.utools.dbStorage.setItem('key', { data: 'value' })

// 读取数据
window.utools.dbStorage.getItem('key').then(result => {
  console.log(result)
})

// 删除数据
window.utools.dbStorage.removeItem('key')
```

## 构建生产版本

```bash
npm run build
```

构建产物在 `dist` 目录下。

## 开发注意事项

1. **端口配置**
   - 开发服务器默认运行在 `http://localhost:5173`
   - 如端口被占用会自动使用下一个可用端口
   - 需同步更新 `plugin.json` 中的 `development.main`

2. **存档管理**
   - 使用 `window.utools.dbStorage` 持久化存档
   - 不同游戏使用不同的key前缀避免冲突
   - 存档格式建议使用JSON便于扩展

3. **路由跳转**
   - Vue组件游戏使用路由跳转：`router.push(path)`
   - iframe游戏在视图内嵌入，无需额外窗口

4. **性能优化**
   - 使用懒加载：`component: () => import('./views/MyView.vue')`
   - 大型游戏建议使用虚拟滚动或分片加载
   - 避免在组件中保存大量状态

5. **样式管理**
   - 使用 scoped CSS 避免样式污染
   - 深色主题配色参考现有游戏风格
   - 响应式设计适配不同窗口尺寸

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: 添加某功能'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 提交信息规范

- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构代码
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具链更新

## 相关文档

- [数据分析文档](./docs/ANALYTICS.md) - 用户行为统计和数据分析
- [uTools 官方文档](https://www.u.tools/docs/developer/intro.html)
- [Vue 3 文档](https://vuejs.org/)
- [Vite 文档](https://vitejs.dev/)

## 更新日志

### v2.0.1 (2025-02-06)
- ✨ 新增糖果盒子2游戏
- 🔧 优化存档管理系统
- 🐛 修复小黑屋存档管理布局问题
- 📝 更新项目文档

### v2.0.0
- ✨ 重构为Vue 3 + Vite架构
- ✨ 新增俄罗斯方块游戏
- ✨ 新增小黑屋游戏
- 💾 实现智能存档系统
- 📊 添加数据统计功能

## 联系方式

如有问题或建议，欢迎通过以下方式联系：

- 提交 Issue
- 发起 Pull Request
- 打赏支持（在游戏中点击打赏按钮）
