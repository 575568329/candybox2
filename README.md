# uTools 小游戏集合

基于 uTools 平台开发的小游戏集合应用，使用 Vue 3 + Vite 构建，通过 uTools 内置的 ubrowser 打开游戏。

## 功能特性

- 🎮 游戏选择界面：美观的游戏列表展示
- 🍬 Candy Box 2：经典的文字RPG冒险游戏
- 🚀 一键启动：点击即可使用 uTools 内置浏览器打开游戏
- 📱 响应式设计：适配不同屏幕尺寸

## 项目结构

```
小游戏/
├── src/
│   ├── GameList/         # 游戏列表组件
│   ├── candybox2/        # Candy Box 2 游戏文件
│   ├── App.vue           # 主应用组件
│   └── main.js           # 入口文件
├── public/
│   ├── plugin.json       # uTools 插件配置
│   └── logo.png          # 插件图标
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

1. 在 uTools 中输入 "糖果盒子2" 或 "candybox2"
2. 游戏会直接在 uTools 内置浏览器中打开

## 添加新游戏

### 1. 准备游戏文件

将游戏文件放在 `src/games/` 目录下，例如：
```
src/games/mygame/index.html
```

### 2. 更新游戏列表

编辑 `src/GameList/index.vue`，在 `games` 数组中添加新游戏：

```javascript
{
  id: 'mygame',
  name: '我的游戏',
  description: '游戏描述',
  icon: '🎮',
  path: './src/games/mygame/index.html',
  color: '#4ecdc4'
}
```

### 3. 更新 plugin.json（可选）

如果想支持直接启动命令，在 `public/plugin.json` 的 `features` 数组中添加：

```json
{
  "code": "mygame",
  "explain": "直接打开我的游戏",
  "cmds": ["我的游戏", "mygame"]
}
```

## 技术栈

- **前端框架**: Vue 3 (Composition API)
- **构建工具**: Vite 6
- **uTools API**: ubrowser (可编程浏览器)
- **类型支持**: TypeScript

## uTools API 使用说明

### 打开游戏窗口

使用 `utools.ubrowser.goto(url).run(options)` 打开游戏：

```javascript
window.utools.ubrowser
  .goto(gameUrl)
  .run({
    width: 1200,
    height: 800,
    center: true,
    title: '游戏标题'
  })
  .then(([result, instance]) => {
    console.log('游戏已打开', instance)
  })
  .catch(err => {
    console.error('打开游戏失败', err)
  })
```

### 监听插件进入事件

```javascript
window.utools.onPluginEnter((action) => {
  console.log('插件被打开', action)
  // action.code: 功能代码
  // action.payload: 附加数据
})
```

## 构建生产版本

```bash
npm run build
```

构建产物在 `dist` 目录下。

## 注意事项

1. 游戏文件路径需要使用相对路径
2. 开发时需要根据实际运行端口修改 `plugin.json` 中的 `development.main`
3. 生产环境部署时，确保所有静态资源路径正确
4. ubrowser 窗口大小建议根据游戏特性调整

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
