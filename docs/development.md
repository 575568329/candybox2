# 开发指南

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

## 添加新游戏

### Vue 组件游戏（简单）

1. 创建 `src/components/NewGame.vue` 实现游戏逻辑
2. 创建 `src/views/NewGameView.vue` 作为包装器（包含导航、存档控制）
3. 在 `src/router/index.js` 中添加路由
4. 在 `src/config/games.js` 的 games 数组中添加游戏配置，设置 `isVueComponent: true`
5. 在 `public/plugin.json` 中添加功能以支持直接启动（可选）

### Vue 组件游戏（复杂/嵌套路由）

对于需要多个页面和复杂状态管理的游戏（如文字修仙）：

1. 创建游戏目录 `src/gameid/`
2. 创建游戏主组件 `src/gameid/GameIdGame.vue`
3. 在 `src/gameid/views/` 中创建各个页面组件
4. 创建视图包装器 `src/views/GameIdView.vue`，引用游戏主组件
5. 在 `src/router/index.js` 中添加嵌套路由配置
6. 在 `src/config/games.js` 中添加游戏配置
7. 在 `public/plugin.json` 中添加功能以支持直接启动（可选）

### iframe 游戏

1. 将游戏文件放在 `public/newgame/` 目录
2. 创建 `src/views/NewGameView.vue`，使用 iframe 指向 `/newgame/`
3. 在 `src/router/index.js` 中添加路由
4. 在 `src/config/games.js` 中添加游戏配置（省略 `isVueComponent`）
5. 创建 `public/newgame/utools-adapter.js` 处理消息传递（存档/加载）
6. 在 `public/plugin.json` 中添加功能以支持直接启动（可选）

## 游戏配置

所有游戏配置都在 `src/config/games.js` 中定义：

```javascript
{
  id: 'game-id',              // 用于存档命名空间和路由
  name: '游戏名称',
  englishName: 'Game Name',
  description: '游戏描述',
  icon: '<svg>...</svg>',     // 自定义 SVG 字符串
  path: '/game-route',        // 路由路径
  color: '#theme-color',      // 游戏主题色
  category: 'puzzle|rpg|strategy',
  tags: ['标签1', '标签2'],
  difficulty: '简单|中等|困难',
  players: '单人|多人',
  duration: '每局X分钟',
  isVueComponent: true,       // Vue 游戏为 true，iframe 游戏省略
  source: '来源',             // 转载游戏标注
  githubUrl: 'https://...'    // 游戏源码地址
}
```

### 配置工具函数

- `getGameById(id)` - 根据ID获取游戏配置
- `getGamesByCategory(categoryId)` - 根据分类获取游戏列表
- `searchGames(query)` - 搜索游戏

## 路由配置

添加新游戏路由：

```javascript
{
  path: '/newgame',
  name: 'NewGame',
  component: () => import('../views/NewGameView.vue'),
  meta: { category: 'puzzle', isVueComponent: true }
}
```

## 图标设计

所有游戏图标都是存储在游戏配置中的**自定义 SVG 字符串**。

### 设计要求

- 使用 64x64 viewBox
- 颜色设置为 `currentColor` 以继承主题
- 通过 CSS 应用霓虹发光效果
- 保持极简扁平设计风格

## 构建与部署

```bash
npm run build  # 输出到 dist/
```

### uTools 插件开发流程

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
- **窗口大小**: utools 默认宽高：800px × 544px

## 调试工具

### vConsole 使用

开发环境集成了 vConsole 调试工具：

- **快捷键**: `Ctrl+Shift+L` 切换显示/隐藏
- **默认状态**: 隐藏
- **功能**:
  - 系统日志
  - 网络请求
  - 元素检查
  - 存储查看

仅在开发环境加载，生产环境自动移除。

## 开发最佳实践

### 代码规范

- 使用 Vue 3 Composition API
- 组件使用 `<script setup>` 语法
- 遵循 ESLint 配置
- 使用 Prettier 格式化代码

### 性能优化

- 路由懒加载
- 组件按需导入
- 图片资源优化
- 代码分割

### 测试

- 在浏览器中测试基本功能
- 在 uTools 中测试完整功能
- 测试存档同步
- 测试不同窗口大小
