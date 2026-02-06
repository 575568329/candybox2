# LifeRestart 集成说明文档

## 概述

本文档说明如何将 `D:\cursorObject\lifeRestart` 项目集成到当前小游戏集合项目中。

## 集成方式

采用 **iframe 集成方式**，这是最简单且维护成本最低的方案。

### 已完成的工作

1. **创建了 Vue 组件** - [LifeRestartGame.vue](src/components/LifeRestartGame.vue)
   - 使用 iframe 加载独立构建的 lifeRestart 游戏
   - 实现了导航栏自动隐藏功能（3秒延迟）
   - 支持 uTools 存档集成
   - 响应式设计，适配不同屏幕尺寸

2. **更新了路由配置** - [src/router/index.js](src/router/index.js)
   - 添加了 `/liferestart` 路由

3. **更新了游戏列表** - [src/GameList/index.vue](src/GameList/index.vue)
   - 在游戏列表中添加"人生重开模拟器"条目
   - 分类：RPG
   - 标签：RPG、模拟、文字、人生

## ✅ 集成已完成

所有步骤已完成！游戏已经可以正常运行。

### 实际执行的步骤

#### 1. 转换数据文件

lifeRestart 使用 Excel 文件存储游戏数据，需要先转换为 JSON：

```bash
cd D:\cursorObject\lifeRestart
npx pnpm xlsx2json  # 转换 data/**/*.xlsx 为 JSON 文件
```

生成的文件包括：
- `data/zh-cn/age.json` - 年龄事件数据（1MB+）
- `data/zh-cn/talents.json` - 天赋数据
- `data/zh-cn/events.json` - 游戏事件数据
- `data/zh-cn/character.json` - 角色数据
- `data/zh-cn/achievement.json` - 成就数据

#### 2. 构建项目

```bash
npx pnpm build
```

#### 3. 复制构建产物

```bash
# 清空并重建目标目录
rm -rf "d:/cursorObject/小游戏/public/lifeRestart"
mkdir -p "d:/cursorObject/小游戏/public/lifeRestart"

# 复制所有文件
cp -r "d:/cursorObject/lifeRestart/template/public/"* "d:/cursorObject/小游戏/public/lifeRestart/"
```

### 最终文件结构

```
小游戏/public/lifeRestart/
├── index.html              # 游戏入口
├── assets/                 # 打包后的 JS/CSS
│   ├── index-BLsR_SyO.js   # 主程序（187KB）
│   └── ... (其他资源文件)
├── data/                   # 游戏数据文件 ⭐ 关键！
│   ├── specialthanks.json
│   ├── zh-cn/
│   │   ├── age.json       # 1MB+ 年龄事件
│   │   ├── talents.json   # 天赋
│   │   ├── events.json    # 游戏事件
│   │   ├── character.json # 角色
│   │   └── achievement.json # 成就
│   └── en-us/             # 英文数据
├── libs/                   # LayaAir 引擎
│   └── laya/min/
│       ├── laya.core.min.js
│       ├── laya.webgl.min.js
│       └── ...
├── fonts/                  # 字体文件
├── images/                 # 图片资源
├── particle/               # 粒子效果
└── view/                   # 视图文件
```

将 lifeRestart 的构建产物复制到当前项目的 public 目录：

```bash
# 创建目标目录
mkdir "d:\cursorObject\小游戏\public\lifeRestart"

# 复制文件
xcopy /E /I "D:\cursorObject\lifeRestart\template\public\*" "d:\cursorObject\小游戏\public\lifeRestart\"
```

或者在 PowerShell 中：

```powershell
New-Item -ItemType Directory -Path "d:\cursorObject\小游戏\public\lifeRestart" -Force
Copy-Item -Path "D:\cursorObject\lifeRestart\template\public\*" -Destination "d:\cursorObject\小游戏\public\lifeRestart\" -Recurse -Force
```

### 3. 验证集成

启动当前项目：

```bash
cd d:\cursorObject\小游戏
pnpm dev
```

访问 `http://localhost:5177/#/liferestart`，应该能看到人生重开模拟器游戏正常运行。

## 文件结构

集成后的文件结构：

```
小游戏/
├── public/
│   └── lifeRestart/          # lifeRestart 构建产物
│       ├── index.html        # 游戏入口
│       ├── assets/           # 静态资源
│       └── libs/             # LayaAir 引擎库
├── src/
│   ├── components/
│   │   └── LifeRestartGame.vue   # Vue 包装组件
│   ├── router/
│   │   └── index.js          # 路由配置（已更新）
│   └── GameList/
│       └── index.vue         # 游戏列表（已更新）
```

## 可选增强功能

### 存档同步

如果需要实现存档同步（类似 CandyBox2），可以：

1. 在 `LifeRestartGame.vue` 中添加存档监听和保存逻辑
2. 拦截 lifeRestart 的 localStorage 操作
3. 将存档数据同步到 uTools DB

参考 [CandyBox2Game.vue](src/components/CandyBox2Game.vue:194-293) 的实现。

### 快捷键支持

添加快捷键保存功能：

```javascript
// 在 iframe 中监听 Ctrl+S
iframe.contentWindow.document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    // 触发保存
  }
})
```

### 主题适配

如果需要支持主题切换，可以在 iframe URL 中添加主题参数：

```javascript
iframeUrl.value = `/lifeRestart/index.html?theme=dark`
```

## ⚠️ 重要提示

### 数据文件转换步骤

**这是最容易遗漏的步骤！** lifeRestart 的游戏数据存储在 Excel 文件中（`data/**/*.xlsx`），必须先转换为 JSON 格式：

```bash
cd D:\cursorObject\lifeRestart
npx pnpm xlsx2json
```

如果不执行此步骤，游戏会报错：
```
[error]Failed to load: data/zh-cn/age.json
[error]Failed to load: data/zh-cn/talents.json
...
```

### 为什么需要这个步骤？

- lifeRestart 使用 `v-transform` 工具将 Excel 数据转换为 JSON
- 这些 JSON 文件不会自动包含在 `pnpm build` 中
- 必须先运行 `xlsx2json` 生成 JSON 文件到 `public/data/` 目录
- 然后运行 `build` 才能将整个 `public/` 目录打包

### 验证数据文件是否完整

检查以下文件是否存在：

```bash
test -f "d:/cursorObject/小游戏/public/lifeRestart/data/zh-cn/age.json" && echo "✓ age.json"
test -f "d:/cursorObject/小游戏/public/lifeRestart/data/zh-cn/talents.json" && echo "✓ talents.json"
test -f "d:/cursorObject/小游戏/public/lifeRestart/data/zh-cn/events.json" && echo "✓ events.json"
test -f "d:/cursorObject/小游戏/public/lifeRestart/data/zh-cn/character.json" && echo "✓ character.json"
test -f "d:/cursorObject/小游戏/public/lifeRestart/data/zh-cn/achievement.json" && echo "✓ achievement.json"
```

## 注意事项

1. **数据文件转换**：每次更新 Excel 数据后，必须重新运行 `xlsx2json`
2. **路径问题**：确保 lifeRestart 的所有资源路径都是相对路径
2. **CORS 问题**：iframe 内外通信可能遇到跨域问题，使用 `postMessage` 解决
3. **性能优化**：lifeRestart 使用 LayaAir 引擎，首次加载可能较慢，考虑添加加载动画
4. **移动端适配**：lifeRestart 原生支持移动端，但需要在 iframe 中设置正确的 viewport

## 故障排除

### 游戏无法加载

1. 检查控制台是否有资源加载错误
2. 确认 `public/lifeRestart/` 目录存在且包含所有必要文件
3. 检查 iframe 的 `src` 路径是否正确

### 存档无法保存

1. 检查是否在 uTools 环境中运行
2. 确认 `window.utools.dbStorage` API 可用
3. 查看控制台是否有权限错误

### 样式错乱

1. 检查 iframe 的 CSS 是否被父页面影响
2. 确认 lifeRestart 的资源文件完整
3. 检查 viewport 设置是否正确

## 相关文件

- [LifeRestartGame.vue](src/components/LifeRestartGame.vue) - Vue 组件
- [CandyBox2Game.vue](src/components/CandyBox2Game.vue) - 参考实现
- [saveManager.js](src/utils/saveManager.js) - 存档管理工具

## 更新日志

- **2025-02-07**: 集成完成
  - 创建 LifeRestartGame.vue 组件
  - 更新路由和游戏列表配置
  - 执行 xlsx2json 转换数据文件
  - 构建并复制所有文件到 public/lifeRestart/
  - 游戏可正常运行
