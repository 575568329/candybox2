# 项目设计规范与图标方案

本文档记录了“uTools 小游戏集合”项目的 UI 设计规范、图标设计思路及技术实现。

## 1. 整体视觉风格 (Visual Identity)

项目整体采用**深色科技感 (Deep Tech)** 风格，旨在提供沉浸式的游戏体验。

- **背景色**: 采用渐变深蓝色 (`linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)`)。
- **材质**: 大量使用毛玻璃效果 (`backdrop-filter: blur(10px)`) 和半透明边框。
- **强调色**: 每个游戏拥有独特的主题色 (`--card-color`)，用于图标、标签和按钮。

## 2. 游戏图标设计规范 (Game Icon Design)

为了保持项目气质的统一，所有游戏图标不再使用 Emoji 或图片，而是采用**自定义 SVG 矢量图形**。

### 2.1 设计原则
- **极简主义 (Minimalism)**: 仅保留游戏最核心的视觉元素（如方块、圆环、坦克轮廓）。
- **扁平化矢量 (Flat Vector)**: 使用简单的路径 (`path`)、矩形 (`rect`) 和圆形 (`circle`)。
- **霓虹质感 (Neon Aesthetic)**: 通过 `drop-shadow` 滤镜营造发光感，提升精致度。
- **一致性**: 统一使用 64x64 的 `viewBox`，描边宽度统一为 `4` 或 `2`。

### 2.2 技术实现
图标数据直接存储在 `src/GameList/index.vue` 的 `games` 数组中，采用 `SVG` 字符串格式。

#### 图标渲染逻辑：
- 使用 `v-html` 指令动态渲染 SVG。
- 使用 `currentColor` 关键字，使 SVG 自动继承组件的主题色。
- **CSS 增强**:
  ```css
  .game-icon {
    color: var(--card-color); /* 继承游戏主题色 */
    transition: all 0.3s ease;
  }
  .game-icon :deep(svg) {
    filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
  }
  .game-card:hover .game-icon {
    transform: scale(1.1); /* 悬停缩放 */
    filter: drop-shadow(0 0 8px var(--card-color)); /* 霓虹发光 */
  }
  ```

### 2.3 典型案例说明
- **六边形俄罗斯方块 (Hextris)**: 采用嵌套六边形结构，内部填充半透明方块，体现旋转和堆叠感。
- **环形之路 (Circle Path)**: 采用虚线圆环模拟运行轨道，配合一个实心圆点体现节奏跳动。
- **坦克大战 (Tank Battle)**: 简化的履带与炮管结构，保留经典剪影。

## 3. 扩展指南 (Extension)

添加新游戏图标时，建议遵循以下步骤：
1. 在 [SVGOMG](https://jakearchibald.github.io/svgomg/) 等工具中精简 SVG 代码。
2. 将颜色属性改为 `fill="currentColor"` 或 `stroke="currentColor"`。
3. 确保图标在 64x64 的画布中心。
4. 将整理后的 SVG 字符串存入 `games` 配置项中。
