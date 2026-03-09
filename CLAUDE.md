# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 **uTools 插件**的游戏集合，使用 **Vue 3 + Vite** 构建。应用运行在 uTools 的嵌入式浏览器中，提供云存档、数据统计和统一的游戏体验。

**技术栈**: Vue 3 (Composition API)、Vite 6、Vue Router 4、Pinia、Element Plus、uTools API

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

## 快速开始

### 添加新游戏

快速添加游戏的步骤：

1. **Vue 组件游戏（简单）**
   - 创建 `src/components/NewGame.vue`
   - 创建 `src/views/NewGameView.vue`
   - 在 `src/router/index.js` 添加路由
   - 在 `src/config/games.js` 添加配置

2. **iframe 游戏**
   - 将游戏文件放在 `public/newgame/`
   - 创建 `src/views/NewGameView.vue`（带 iframe）
   - 在 `src/router/index.js` 添加路由
   - 在 `src/config/games.js` 添加配置
   - 创建 `public/newgame/utools-adapter.js`

详细开发指南请查看 [docs/development.md](docs/development.md)

## 核心文件

### 配置文件
- `src/config/games.js` - 游戏配置（集中管理）
- `vite.config.js` - Vite 构建配置
- `public/plugin.json` - uTools 插件清单

### 核心系统
- `src/router/index.js` - 路由配置（hash 模式）
- `src/utils/saveManager.js` - 统一存档系统
- `src/main.js` - 应用入口

### 游戏模块
- `src/GameList/index.vue` - 游戏选择中心
- `src/xiuxian/` - 文字修仙游戏（嵌套路由示例）
- `src/views/` - 各游戏视图包装器

## 技术要点

### 存档系统
- **uTools 环境**: 使用 `window.utools.db` 云存档
- **iframe 通信**: `postMessage` 协议
- **键前缀**: `game_save_{gameId}_`

### UI 框架
- **Element Plus**: 自动导入组件和图标
- **Pinia**: 状态管理 + 持久化
- **vConsole**: 调试工具（Ctrl+Shift+L 切换）

### 路由系统
- 使用 hash 模式兼容 uTools
- 支持嵌套路由（复杂游戏）
- 按类型分组（RPG、益智、策略）

## 重要约束

- **端口**: 必须使用 5177 端口
- **路由**: 始终使用 hash 模式
- **存档键**: 使用 `game_save_{gameId}_` 前缀
- **路径导入**: 使用 `@/` 别名
- **语境**: 使用中文语境
- **窗口大小**: uTools 默认 800px × 544px

## 详细文档

- 📐 [架构设计](docs/architecture.md) - 系统架构、集成模式、目录结构
- 🛠️ [开发指南](docs/development.md) - 添加游戏、配置说明、开发工具
- 🎮 [游戏列表](docs/games.md) - 所有游戏介绍和分类

## 当前游戏

### Vue 组件 (4个)
- 俄罗斯方块 - 经典消除游戏
- 糖果盒子2 - ASCII文字RPG
- 人生重开模拟器 - 人生模拟游戏
- 文字修仙 - 完整修仙RPG（嵌套路由）

### iframe 游戏 (4个)
- 六边形俄罗斯方块 - 六边形消除
- 环形之路 - 节奏点击游戏
- 小黑屋 - 文字冒险游戏
- 坦克大战 - FC经典游戏

### 游戏分类
- **RPG**: 小黑屋、糖果盒子2、人生重开模拟器、文字修仙
- **益智**: 俄罗斯方块、六边形俄罗斯方块、环形之路
- **策略**: 坦克大战

## 环境说明

### 浏览器环境
- 使用 `utools-mock.js` 和 localStorage
- 显示环境警告

### uTools 环境
- 完整云存档集成
- 直接启动命令
- 嵌入式浏览器

iframe 游戏在浏览器测试时使用 localStorage 而非 uTools db。
