# 布局重构方案 —— 2026-10-27 全页面布局评审

> 依据:2026-10-27 浏览器实测 9 款游戏 + 首页的截图评审,与源码审阅(GameList/index.vue、BaseGameView.vue、各 View、main.css)。

## 一、现状评审结论

### 做得好的
- **信息架构清晰**:首页(列表/分类/搜索)→ 游戏页(壳+iframe/Vue 组件)两层结构,路由组织合理(xiuxian 嵌套路由是标准做法)。
- **壳层交互方向正确**:自动隐藏头部(鼠标移入顶部 50px 唤回)是为游戏争取画面的正确取舍;tank/circlepath 的自定义动作按钮(静音/换地图)放头部右侧是合理位置。
- **修仙独立设计体系**(水墨风+自有组件+暗色模式)自洽,不应并入全局体系。
- 存档提示统一放头部条(☁️ 自动保存/上次保存时间),用户心智一致。

### 问题清单(按影响排序)

| # | 问题 | 证据 | 影响 |
|---|------|------|------|
| P1 | **壳层逻辑 7 处复制,统一组件零使用** | `BaseGameView.vue`(622 行)无任何 import;`headerVisible/scheduleHideHeader` 在 ADarkRoomView/HextrisView/EvolveView/CirclePathView/TankView/CandyBox2Game/LifeRestartGame 各复制一份 | 改一处交互要改 7 处;行为已经漂移(隐藏延迟、样式细节各不相同) |
| P2 | **无设计令牌,风格不统一** | main.css 仅 3 个变量;背景色 `#1a1a2e`、圆角、字号在各文件硬编码;各游戏页头部图标尺寸/按钮风格/间距肉眼可见地不一致 | 视觉割裂;暗色模式只能各自为政 |
| P3 | **首页卡片信息过载** | 每卡片 8-10 行元数据(难度/时长/玩家/3-6 个标签/来源 URL/复制按钮/开始按钮),一屏仅 2 行卡片 | 找游戏效率低;元数据价值密度低 |
| P4 | **GameList 单文件 1359 行** | 模板+逻辑+样式全在一个文件 | 难维护,卡片样式改动风险大 |
| P5 | **响应式基本缺失** | 全项目仅 5 个文件有 @media;Tetris 三栏固定宽度 | uTools 窗口自由拉伸时 Tetris 出滚动条、iframe 游戏留黑边 |
| P6 | **Tetris 布局比例失衡** | 实测:canvas 偏小,右栏(下一块+分数+等级+行数+玩家+当前排名+TOP10 排行榜)占宽过多且纵向稀疏 | 主视觉(棋盘)不是视觉重心 |
| P7 | EvolveView 989 行、CandyBox2Game 457+ 行 | 壳层+适配器+业务混写 | 同 P1 |

### 不动的东西(明确排除)
- **iframe 游戏内部**:hextris/circlepath/adarkroom/candybox2/liferestart/tank/evolve 的内部页面不改(转载作品+外部引擎,只动外壳)。
- **修仙内部布局**:自带设计语言且刚修复导入导出,不掺和本方案(仅阶段 4 可选接入颜色令牌)。

## 二、重构方案(4 阶段,每阶段独立可发布)

### 阶段 1:设计令牌 + GameShell 收敛(核心,收益最大)

**1a. `src/styles/tokens.css` 设计令牌**
```
颜色: --bg-app/--bg-surface/--bg-game/--text-1/--text-2/--accent/--danger
间距: --sp-1..--sp-8 (4px 基准)
字号: --fs-xs/sm/md/lg/xl + --fs-game-title
圆角/阴影/头部高度: --radius-md/--shadow-card/--header-h
```
main.css 引入;新代码只用令牌;存量硬编码逐步替换。

**1b. 激活 BaseGameView → 重命名 `GameShell.vue`,做减法**
- 保留:返回、标题区、动作按钮 slot(`#actions`)、存档提示条、加载/错误态、iframe 容器(统一 `aspect-ratio` + letterbox 策略)、自动隐藏头部(参数化为 composable `useAutoHideHeader`)。
- 各 View 迁移:删除自己的 headerVisible/showHeader/scheduleHideHeader/onMouseMoveGame 复制块,只留 `tankGameUrl`、静音按钮等特有逻辑放 `#actions`。
- 目标:每个 iframe View 从 300-600 行降到 ~80-150 行;壳层行为全局一致。
- 迁移顺序(风险从低到高):circlepath → hextris → tank → liferestart → adarkroom → candybox2 → evolve(evolve 交互最复杂放最后)。

**验收**:7 个视图零 `headerVisible` 复制;截图对比迁移前后无布局回退;游戏功能点测(每游戏 1 条冒烟路径)。

### 阶段 2:首页卡片减负 + 组件拆分

- 拆 `GameList/index.vue` → `GameFilterBar.vue`(搜索+分类)/ `GameCard.vue` / `GameGrid.vue`,index.vue 只做数据与筛选状态(<300 行)。
- **卡片信息分层**:主层=图标+名称+一句话描述+标签(最多 3 个)+开始;次层(难度/时长/玩家/来源链接)收进 hover 浮层或点击展开的详情弹层。
- 网格 `repeat(auto-fill, minmax(240px, 1fr))`,自然适配 uTools 窗口宽度。
- 可选:记录每个游戏"最近游玩"排序(persist 到 localStorage)。

**验收**:一屏至少 2 行×3 列卡片;无功能回退(搜索/分类/复制地址/开始游戏)。

### 阶段 3:Tetris 布局重排 + 响应式基线

- 三栏改为:左窄栏(操作说明折叠成"?"弹层或底部一行)—— 中间棋盘弹性放大 `min-height: calc(100vh - 2*--header-h)` —— 右栏收纳(下一块+分数/等级/行数合并为一个紧凑卡;排行榜默认 TOP10 折叠,点开展开)。
- 棋盘尺寸用 `min(vw, vh)` 驱动的容器查询/clamp,窗口拉伸时保持完整可见不出滚动条。
- 顺带统一全站 2 个响应式断点(容器查询优先,退化 @media):`<720px`(单栏,侧栏下沉)与 `>=720px`。

**验收**:720p 高度窗口无纵向滚动条;棋盘为视觉重心;排行榜可用性不降。

### 阶段 4(可选):修仙接入颜色令牌 + EvolveView 拆分

- EvolveView 拆 `EvolveShell`(用 GameShell)+ `evolveAdapter`(iframe 通信)两文件。
- 修仙仅替换背景/文本色为令牌(保持水墨风自定义值),不动作布局。

## 三、实施与风险

- **每阶段一个 PR,独立可回滚**;阶段 1 是其余阶段的地基,优先做。
- 迁移 View 时逐个进行,迁移一个实测一个(本次测试报告的冒烟清单可直接复用)。
- 主要风险:自动隐藏头部行为差异是"有意为之"的可能性低,但迁移时逐个确认原延迟参数,以 GameShell 默认值为准、允许 prop 覆盖。
- 工作量粗估:阶段 1 ≈ 1.5 天,阶段 2 ≈ 1 天,阶段 3 ≈ 1 天,阶段 4 ≈ 0.5 天。

## 附:2026-10-27 测试基线(重构回归用)

| 游戏 | 类型 | 冒烟路径 | 结果 |
|------|------|----------|------|
| 首页 | - | 列表 9 款/搜索/分类渲染 | ✅ |
| 俄罗斯方块 | Vue | Enter 开始落块;排行榜 API 加载 | ✅ |
| 六边形 | iframe | 开始界面渲染 | ✅ |
| 环形之路 | iframe | 开始界面渲染(修复后首次验证) | ✅ |
| 小黑屋 | iframe | 中文界面+生火按钮+云存档提示 | ✅ |
| 糖果盒子2 | iframe | "You have 7 candies" 正常 | ✅(1 次导航竞态,不可复现) |
| 人生重开 | iframe | Laya canvas 498×664 渲染 | ✅ |
| 坦克大战 | iframe | 标题界面+静音按钮 | ✅ |
| 文字修仙 | Vue | 隐私弹窗→主页→导出内容=完整加密存档(旧 bug 已修复)→刷新存档恢复 | ✅ |
| 进化 | iframe | 史前 v1.4.9 + RNA 资源界面 | ✅ |
