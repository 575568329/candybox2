# 进化游戏集成实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 将开源放置类游戏 Evolve 通过 iframe 方式集成到小游戏集合中，添加"放置"分类，实现游戏加载和基础功能。

**架构:** 使用 iframe 嵌入方式隔离 Evolve 的 Vue 2 与项目 Vue 3，通过视图包装器加载 `public/evolve/index.html`，保持与现有 iframe 游戏（六边形俄罗斯方块、环形之路）一致的集成模式。

**技术栈:** Vue 3 (Composition API), Vite 6, Vue Router 4, Element Plus, iframe 隔离

**前置要求:** `public/evolve/` 目录已存在完整游戏文件

---

## Task 1: 创建视图包装器

**Files:**
- Create: `src/views/EvolveView.vue`

**Step 1: 创建 EvolveView.vue 文件**

创建标准的 iframe 视图包装器，用于加载 Evolve 游戏。

文件内容：

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
// Evolve 游戏的视图包装器
// 使用 iframe 加载游戏，保持与项目 Vue 3 的隔离
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

**Step 2: 验证文件创建成功**

运行: `ls -la src/views/EvolveView.vue`

预期输出: 文件存在，大小约 500 bytes

**Step 3: 提交视图包装器**

```bash
git add src/views/EvolveView.vue
git commit -m "feat(evolve): 创建 Evolve 游戏视图包装器

- 使用 iframe 加载 /evolve/index.html
- 全屏无边框显示
- 隔离 Evolve 的 Vue 2 与项目 Vue 3

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: 添加"放置"游戏分类

**Files:**
- Modify: `src/config/games.js:6-27`

**Step 1: 读取 games.js 文件**

运行: `cat src/config/games.js | head -30`

确认 categories 数组结构（应该在 lines 6-27）

**Step 2: 在 categories 数组中添加"放置"分类**

在 `src/config/games.js` 的 categories 数组中，在 'strategy' 分类后添加新分类：

```javascript
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
  },
  {
    id: 'idle',
    name: '放置',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="24" stroke="currentColor" stroke-width="4"/><path d="M32 16V32L40 40" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`
  }
]
```

注意：在 'strategy' 对象后添加逗号，然后添加 'idle' 对象。

**Step 3: 验证配置语法**

运行: `npm run build`

预期输出: 构建成功，无语法错误

如果报错：检查 JSON 语法，确认逗号位置正确

**Step 4: 提交分类配置**

```bash
git add src/config/games.js
git commit -m "feat(evolve): 添加\"放置\"游戏分类

- 新增 idle 分类用于放置类游戏
- 时钟图标象征时间推进特性
- 为 Evolve 游戏准备分类支持

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: 添加 Evolve 游戏配置

**Files:**
- Modify: `src/config/games.js:29-156`

**Step 1: 定位 games 数组末尾**

运行: `grep -n "xiuxian" src/config/games.js`

确认 xiuxian 游戏配置的结束位置（应该在 line 155 左右）

**Step 2: 在 games 数组末尾添加 Evolve 配置**

在 xiuxian 游戏配置后（`games` 数组的最后一个元素后），添加：

```javascript
  {
    id: 'evolve',
    name: '进化',
    englishName: 'Evolve',
    description: '放置类进化模拟游戏，从单细胞开始逐步进化，体验生命演化的奇妙旅程',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M32 12L28 20H36L32 12Z" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><circle cx="32" cy="32" r="16" stroke="currentColor" stroke-width="3"/><path d="M32 32V24M32 32L38 38M32 32L26 38" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="32" cy="32" r="4" fill="currentColor"/></svg>`,
    path: '/evolve',
    color: '#7E57C2',
    category: 'idle',
    tags: ['放置', '进化', '模拟'],
    difficulty: '简单',
    players: '单人',
    duration: '4-8小时'
  }
```

注意：确保在 xiuxian 配置对象的右括号后添加逗号。

**Step 3: 验证配置完整性**

运行: `node -e "import('./src/config/games.js').then(m => console.log('Total games:', m.games.length))"`

预期输出: `Total games: 9`（原来 8 个 + Evolve）

**Step 4: 测试游戏查询**

运行: `node -e "import('./src/config/games.js').then(m => console.log('Evolve:', JSON.stringify(m.getGameById('evolve'), null, 2)))"`

预期输出: Evolve 游戏配置对象，包含所有字段

**Step 5: 提交游戏配置**

```bash
git add src/config/games.js
git commit -m "feat(evolve): 添加 Evolve 游戏配置

- 游戏ID: evolve
- 分类: 放置 (idle)
- 紫色主题 (#7E57C2)
- 难度: 简单，时长: 4-8小时

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: 添加路由配置

**Files:**
- Modify: `src/router/index.js`

**Step 1: 定位路由数组**

运行: `grep -n "xiuxian" src/router/index.js`

找到 xiuxian 路由的位置（应该在末尾附近）

**Step 2: 添加 Evolve 路由**

在 xiuxian 路由配置后添加新的路由对象：

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

确保在 xiuxian 路由对象后添加逗号。

完整上下文示例：
```javascript
  {
    path: '/xiuxian',
    name: 'Xiuxian',
    component: () => import('@/views/XiuxianView.vue'),
    meta: {
      title: '文字修仙 - Xiuxian Game',
      gameId: 'xiuxian'
    }
  },
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

**Step 3: 验证路由配置**

运行: `npm run build`

预期输出: 构建成功，路由无错误

如果报错：检查 import 路径是否正确，语法是否有误

**Step 4: 提交路由配置**

```bash
git add src/router/index.js
git commit -m "feat(evolve): 添加 Evolve 游戏路由

- 路径: /evolve
- 视图: EvolveView.vue
- Meta: 包含标题和游戏ID

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: 开发环境验证

**Step 1: 启动开发服务器**

运行: `npm run dev`

预期输出:
```
VITE v6.x.x  ready in xxx ms

➜  Local:   http://localhost:5177/
➜  Network: use --host to expose
```

服务器必须运行在 **5177** 端口（项目约束）。

**Step 2: 打开浏览器验证**

在浏览器中访问: `http://localhost:5177/#/evolve`

预期结果:
- iframe 正确加载 Evolve 游戏界面
- 游戏可以看到（可能会加载 CDN 资源，需要网络连接）
- 控制台无报错

**Step 3: 验证路由跳转**

1. 访问 `http://localhost:5177/#/`（游戏列表）
2. 确认"放置"分类标签显示
3. 点击"放置"分类，确认"进化"游戏卡片显示
4. 点击"进化"游戏卡片，确认跳转到 `/evolve`
5. 点击浏览器后退按钮，确认返回游戏列表

**Step 4: 测试游戏基础功能**

在 Evolve 游戏界面：
1. 等待游戏加载完成（可能需要几秒钟加载 CDN 资源）
2. 尝试点击游戏元素（如果有可点击的按钮）
3. 确认游戏响应正常

预期结果: 游戏可以正常交互

**Step 5: 验证存档功能（本地）**

1. 在游戏中进行一些操作
2. 刷新页面 (`F5`)
3. 确认游戏进度保存（使用 localStorage）

**Step 6: 检查控制台**

打开浏览器开发者工具 (`F12`)，检查：
- Console 标签：无严重错误（可能有 CDN 警告，可忽略）
- Network 标签：确认 CDN 资源加载成功（jQuery, Vue 2, Buefy 等）
- Application 标签 → Local Storage：确认 Evolve 存档键存在

**Step 7: 测试分类筛选**

在游戏列表页：
1. 点击"放置"分类，确认只显示"进化"游戏
2. 点击"全部"分类，确认显示所有 9 个游戏
3. 在搜索框输入"进化"，确认搜索结果正确
4. 在搜索框输入"Evolve"，确认搜索结果正确
5. 在搜索框输入"放置"，确认搜索结果正确

**Step 8: 记录测试结果**

如果所有测试通过，继续下一步。如果有失败，记录问题：

运行:
```bash
echo "测试日期: $(date)" > test-results.md
echo "测试环境: npm run dev (localhost:5177)" >> test-results.md
echo "测试结果: 待记录" >> test-results.md
```

---

## Task 6: 生产构建验证

**Step 1: 构建生产版本**

运行: `npm run build`

预期输出:
```
building for production...
✓ 123 modules transformed.
dist/index.html                      1.2 kB
dist/assets/index-abc123.css         50 kB
dist/assets/index-def456.js          200 kB
✓ built in 2.3s
```

如果报错：检查构建日志，根据错误信息修复

**Step 2: 验证构建产物**

运行: `ls -la dist/`

确认输出：
- `dist/index.html` 存在
- `dist/assets/` 目录包含 CSS 和 JS 文件
- `dist/evolve/` 目录包含游戏文件（Vite 会自动复制 public/）

**Step 3: 提交所有更改（如果测试通过）**

```bash
git status
git add .
git commit -m "feat(evolve): 完成 Evolve 游戏集成

✨ 新功能:
- 创建 EvolveView.vue 视图包装器
- 添加\"放置\"游戏分类
- 添加 Evolve 游戏配置
- 添加路由配置

📝 技术细节:
- 使用 iframe 隔离 Vue 2 与 Vue 3
- 保持与现有 iframe 游戏一致的集成模式
- 紫色主题 (#7E57C2)
- 难度: 简单，时长: 4-8小时

🎮 游戏信息:
- 名称: 进化 (Evolve)
- 分类: 放置
- 标签: 放置、进化、模拟

✅ 测试:
- 本地开发环境验证通过
- 游戏加载正常
- 路由跳转正常
- 分类筛选正常
- 搜索功能正常
- 本地存档功能正常

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: 清理和文档更新

**Step 1: 更新游戏列表文档（可选）**

如果项目维护游戏列表文档，更新它：

文件: `docs/games.md`

在"iframe 游戏"部分添加：
```markdown
- 进化 (evolve) - 放置类进化模拟游戏
```

在"游戏分类"部分添加：
```markdown
- **放置**: 进化
```

**Step 2: 更新开发指南（可选）**

如果需要，在 `docs/development.md` 添加 Evolve 作为案例。

**Step 3: 清理临时文件**

运行:
```bash
rm -f test-results.md
```

**Step 4: 最终验证清单**

- [ ] EvolveView.vue 创建并提交
- [ ] "放置"分类添加到 games.js
- [ ] Evolve 游戏配置添加到 games.js
- [ ] 路由配置添加到 router/index.js
- [ ] 开发环境测试通过
- [ ] 生产构建成功
- [ ] 所有功能正常（路由、筛选、搜索、游戏加载）
- [ ] 代码已提交到 git

**Step 5: 创建功能完成标记**

运行:
```bash
git tag -a v1.0.0-evolve -m "集成 Evolve 游戏

功能:
- 新增放置类游戏分类
- 集成 Evolve 进化模拟游戏
- 支持 4-8小时游戏时长

技术:
- iframe 雔离模式
- Vue 2 与 Vue 3 共存
- 保留原生 localStorage 存档"
```

---

## 验收标准

### 功能验收

1. **游戏列表显示**
   - "放置"分类标签显示在分类栏
   - "进化"游戏卡片显示，使用紫色主题
   - 游戏描述、难度、时长信息正确

2. **路由和导航**
   - 点击"进化"卡片跳转到 `/evolve`
   - 浏览器后退功能正常
   - URL hash 正确显示

3. **游戏加载**
   - iframe 正确加载游戏界面
   - CDN 资源加载成功（需要网络）
   - 游戏可以正常交互

4. **分类和搜索**
   - "放置"分类只显示进化游戏
   - 搜索"进化"、"Evolve"、"放置"都能找到游戏

5. **存档功能**
   - 刷新页面后游戏进度保留（localStorage）

### 技术验收

1. **代码质量**
   - 无 ESLint 警告
   - 无 TypeScript 错误
   - 遵循项目代码风格

2. **构建成功**
   - `npm run build` 成功
   - `npm run dev` 正常运行

3. **Git 提交**
   - 所有更改已提交
   - 提交信息清晰规范
   - 功能标签已创建（可选）

### 性能验收

1. **加载时间**
   - 游戏列表加载时间 < 100ms
   - Evolve 游戏首次加载 < 5s（取决于 CDN）

2. **运行时性能**
   - 游戏运行流畅，无明显卡顿
   - 内存占用正常（< 200MB）

---

## 故障排查

### 问题 1: iframe 无法加载游戏

**症状**: iframe 显示空白或"无法加载"

**排查步骤**:
1. 检查 `public/evolve/index.html` 是否存在
2. 检查浏览器控制台是否有 404 错误
3. 确认路径是 `/evolve/index.html`（绝对路径）

**解决方案**:
- 确保文件路径正确
- 检查 Vite 配置的 public 目录设置

### 问题 2: CDN 资源加载失败

**症状**: 游戏界面显示异常，控制台显示 CDN 加载错误

**排查步骤**:
1. 检查网络连接
2. 打开 Network 标签，查看失败的资源

**解决方案**:
- 确保网络连接正常
- 考虑将 CDN 资源本地化（后续优化）

### 问题 3: 游戏在 uTools 窗口显示不全

**症状**: 游戏界面被裁剪，显示不完整

**排查步骤**:
1. 检查 uTools 窗口尺寸（默认 800×544）
2. 在浏览器调整窗口大小复现问题

**解决方案**:
- 建议用户调整 uTools 窗口高度
- 或在 EvolveView 中添加滚动条（overflow: auto）

### 问题 4: 路由跳转不工作

**症状**: 点击游戏卡片无响应

**排查步骤**:
1. 检查路由配置是否正确
2. 检查浏览器控制台是否有路由错误

**解决方案**:
- 确认路由 path 与游戏配置 path 一致
- 检查 Vue Router hash 模式配置

---

## 参考资料

### 项目文档

- `CLAUDE.md` - 项目概述和开发约束
- `docs/architecture.md` - 系统架构设计
- `docs/development.md` - 开发指南
- `docs/games.md` - 游戏列表介绍

### 相关文件

- `src/views/HextrisView.vue` - iframe 游戏参考
- `src/views/CirclepathView.vue` - iframe 游戏参考
- `src/config/games.js` - 游戏配置
- `src/router/index.js` - 路由配置
- `public/evolve/index.html` - Evolve 游戏入口

### 外部资源

- Evolve 游戏原始文件：`public/evolve/`
- Vue 3 文档：https://vuejs.org/
- Vue Router 4 文档：https://router.vuejs.org/
- Vite 文档：https://vitejs.dev/

---

## 执行说明

**执行模式选择**（完成计划后）：

此实施计划可以通过以下两种方式执行：

1. **Subagent-Driven（当前会话）** - 每个任务使用新的子代理执行，任务之间进行代码审查，快速迭代

2. **Parallel Session（独立会话）** - 在新会话中使用 executing-plans 技能批量执行，设置检查点

**推荐**: Subagent-Driven 模式，适合此规模的集成任务（约 30-45 分钟）。

**前置条件**:
- 开发服务器可以运行在 5177 端口
- 网络连接正常（Evolve 需要 CDN 资源）
- Git 工作目录干净（无未提交更改）
