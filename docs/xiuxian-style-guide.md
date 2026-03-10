# 文字修仙游戏样式指南

本文档介绍文字修仙游戏的水墨书院风格设计系统，包括配色、字体、组件使用和响应式适配。

## 设计规范

### 配色系统

水墨书院风格采用传统中国水墨画配色，以宣纸为底，墨色为主，朱砂为点缀。

#### 主色系

| 色名 | CSS变量 | 色值 | 用途 |
|------|---------|------|------|
| 宣纸白 | `--color-paper` | `#f7f4ed` | 主背景色 |
| 宣纸暗 | `--color-paper-dark` | `#e8e4d9` | 卡片背景、次级背景 |
| 浓墨 | `--color-ink` | `#2c2c2c` | 主文字、主要元素 |
| 淡墨 | `--color-ink-light` | `#5a5a5a` | 次要文字、描述 |
| 极淡墨 | `--color-ink-lighter` | `#8a8a8a` | 辅助文字、边框 |

#### 强调色

| 色名 | CSS变量 | 色值 | 用途 |
|------|---------|------|------|
| 朱砂红 | `--color-cinnabar` | `#c8302c` | 主要操作、重要信息 |
| 朱砂亮 | `--color-cinnabar-light` | `#e85a52` | 悬停状态 |
| 古铜金 | `--color-gold` | `#b8860b` | 成就、荣誉、特殊标记 |
| 古铜金亮 | `--color-gold-light` | `#daa520` | 金色高亮 |

#### 辅助色

| 色名 | CSS变量 | 色值 | 用途 |
|------|---------|------|------|
| 玉色 | `--color-jade` | `#5f8d6e` | 成功状态、正向操作 |
| 靛青 | `--color-indigo` | `#4a5d6e` | 信息提示 |

#### 深色模式

深色模式自动反转明暗对比，保持水墨风格：

```css
.dark {
  --color-paper: #1a1a1a;
  --color-paper-dark: #252525;
  --color-ink: #e8e4d9;
  --color-ink-light: #c8c8c8;
}
```

### 字体系统

#### 字体族

| 用途 | CSS变量 | 字体栈 | 示例 |
|------|---------|--------|------|
| 标题 | `--font-title` | `'STXingkai', 'Xingkai SC', 'KaiTi', '楷体', serif` | 修仙之路 |
| 正文 | `--font-body` | `'Noto Serif SC', 'Source Han Serif SC', '宋体', serif` | 正文字体 |
| 数字 | `--font-number` | `'Noto Sans SC', sans-serif` | 12345 |

#### 字体类

```html
<h2 class="font-title">标题文字</h2>
<p class="font-body">正文字体</p>
<span class="font-number">12345</span>
```

### 间距系统

使用统一的间距变量，保持视觉节奏：

| 变量 | 值 | 用途 |
|------|-----|------|
| `--spacing-xs` | 4px | 极小间距 |
| `--spacing-sm` | 8px | 小间距 |
| `--spacing-md` | 12px | 中等间距（默认） |
| `--spacing-lg` | 16px | 大间距 |
| `--spacing-xl` | 24px | 超大间距 |

### 圆角系统

| 变量 | 值 | 用途 |
|------|-----|------|
| `--radius-sm` | 4px | 小圆角（按钮、标签） |
| `--radius-md` | 8px | 中圆角（卡片） |
| `--radius-lg` | 12px | 大圆角（面板） |

### 过渡动画

| 变量 | 值 | 用途 |
|------|-----|------|
| `--transition-fast` | 150ms | 快速交互（按钮悬停） |
| `--transition-normal` | 300ms | 常规动画（卡片悬停） |
| `--transition-slow` | 500ms | 慢速动画（进度条） |

## 组件使用

### AttributePanel - 属性面板

匾额样式的属性展示面板，带有云纹装饰和印章标记。

```vue
<template>
  <AttributePanel title="修仙者信息">
    <div class="attributes-grid">
      <div class="attribute-item">
        <span class="attribute-label">境界</span>
        <span class="attribute-value">筑基期</span>
      </div>
    </div>
  </AttributePanel>
</template>

<script setup>
import AttributePanel from '@/xiuxian/components/AttributePanel.vue'
</script>
```

**Props:**
- `title`: String - 面板标题

### InkButton - 水墨按钮

印章样式的按钮，支持多种类型。

```vue
<template>
  <InkButton type="primary" @click="handleClick">开始修炼</InkButton>
  <InkButton type="secondary" @click="handleCancel">取消</InkButton>
  <InkButton type="success" @click="handleConfirm">确认</InkButton>
  <InkButton type="warning" @click="handleWarning">警告</InkButton>
  <InkButton type="primary" :disabled="true">禁用</InkButton>
</template>

<script setup>
import InkButton from '@/xiuxian/components/InkButton.vue'

const handleClick = () => {
  console.log('按钮点击')
}
</script>
```

**Props:**
- `type`: String - 按钮类型，可选值：`primary` | `secondary` | `success` | `warning`
- `disabled`: Boolean - 是否禁用

**Events:**
- `click`: 点击事件

### 水墨卡片

通用的内容容器，带有悬停效果。

```html
<div class="ink-card">
  <h3 class="font-title">卡片标题</h3>
  <p class="font-body">卡片内容</p>
</div>
```

### 水墨进度条

展示进度信息的进度条，带有渐变效果。

```html
<div class="ink-progress">
  <div class="ink-progress-bar" :style="{ width: '75%' }"></div>
</div>
<div class="progress-text font-number">
  750 / 1000
</div>
```

### 字体工具类

快速应用字体样式：

```html
<h2 class="font-title">标题使用行楷</h2>
<p class="font-body">正文使用宋体</p>
<span class="font-number">12345</span>
```

## 布局模式

### 页面容器

标准页面布局结构：

```vue
<template>
  <div class="page-name">
    <!-- 页面内容 -->
  </div>
</template>

<style scoped>
.page-name {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
}
</style>
```

### 网格布局

属性展示使用网格布局：

```vue
<template>
  <div class="attributes-grid">
    <div class="attribute-item">属性1</div>
    <div class="attribute-item">属性2</div>
    <div class="attribute-item">属性3</div>
    <div class="attribute-item">属性4</div>
  </div>
</template>

<style scoped>
.attributes-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
}

.attribute-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  background-color: var(--color-paper);
  border-radius: var(--radius-sm);
}
</style>
```

### 按钮组

操作按钮的标准布局：

```vue
<template>
  <div class="actions-section">
    <InkButton type="primary">主操作</InkButton>
    <InkButton type="secondary">次操作</InkButton>
  </div>
</template>

<style scoped>
.actions-section {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: center;
  flex-wrap: wrap;
  padding: var(--spacing-md) 0;
}
</style>
```

## 响应式适配

### 断点系统

| 断点 | 条件 | 目标设备 |
|------|------|----------|
| 移动端 | `max-width: 600px` | 手机 |
| 平板 | `max-width: 768px` | 平板、小屏幕 |
| uTools | `max-width: 800px and max-height: 500px` | uTools 小窗口 |

### 移动端适配

```css
@media (max-width: 600px) {
  .attributes-grid {
    grid-template-columns: 1fr;
  }

  .actions-section {
    flex-direction: column;
  }

  .actions-section .ink-button {
    width: 100%;
  }
}
```

### uTools 小窗口优化

```css
@media only screen and (max-width: 800px) and (max-height: 500px) {
  .page-name {
    padding: var(--spacing-sm);
    gap: var(--spacing-xs);
  }

  .ink-card {
    padding: var(--spacing-sm);
  }

  /* 隐藏非必要内容 */
  .story-text {
    display: none;
  }
}
```

## 动画效果

### 页面转场

水墨晕染效果的页面切换：

```css
.page-enter-active {
  animation: ink-fade-in 400ms cubic-bezier(0.4, 0, 0.2, 1);
}

.page-leave-active {
  animation: ink-fade-out 300ms cubic-bezier(0.4, 0, 1, 1);
}
```

### 悬停效果

卡片悬停上浮：

```css
.ink-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

### 按钮交互

印章盖下效果：

```css
.ink-button:active:not(.is-disabled) {
  transform: scale(0.95);
}
```

## 深色模式

### 切换深色模式

```javascript
// 在 Vue 组件中
const toggleDark = () => {
  document.documentElement.classList.toggle('dark')
}
```

### 深色模式样式

组件自动适配深色模式，使用 CSS 变量：

```css
.my-component {
  background-color: var(--color-paper);
  color: var(--color-ink);
}
```

深色模式下自动反转：
- 背景变暗
- 文字变亮
- 保持对比度和可读性

## 最佳实践

### 1. 使用 CSS 变量

```css
/* ✅ 推荐 */
.my-component {
  padding: var(--spacing-md);
  background-color: var(--color-paper);
}

/* ❌ 不推荐 */
.my-component {
  padding: 12px;
  background-color: #f7f4ed;
}
```

### 2. 组件化思维

优先使用现有组件，保持代码 DRY：

```vue
<!-- ✅ 推荐 -->
<AttributePanel title="标题">
  内容
</AttributePanel>

<!-- ❌ 不推荐 -->
<div class="custom-panel">
  <div class="panel-header">标题</div>
  <div class="panel-content">内容</div>
</div>
```

### 3. 渐进增强

先完成基础功能，再添加动画：

```css
/* 1. 基础样式 */
.ink-card {
  background-color: var(--color-paper-dark);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
}

/* 2. 添加过渡 */
.ink-card {
  transition: all var(--transition-normal);
}

/* 3. 添加悬停效果 */
.ink-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

### 4. 性能考虑

使用 CSS transform 避免触发重排：

```css
/* ✅ 推荐 - 使用 transform */
.button:hover {
  transform: translateY(-2px);
}

/* ❌ 不推荐 - 使用 margin/top */
.button:hover {
  margin-top: -2px;
}
```

## 常见问题

### Q: 如何自定义颜色？

A: 在组件样式中使用 CSS 变量或覆盖：

```css
.custom-component {
  --custom-color: var(--color-cinnabar);
  color: var(--custom-color);
}
```

### Q: 如何调整间距？

A: 使用间距变量，保持一致性：

```css
.my-component {
  padding: var(--spacing-md);
  gap: var(--spacing-sm);
}
```

### Q: 如何添加新的水墨效果？

A: 参考 `global.css` 中的现有效果类，或创建新的工具类。

## 更新日志

- **2026-03-10**: 初始版本，包含基础样式系统文档
- 组件库持续更新中...

## 相关文件

- 主题变量: `src/xiuxian/styles/theme.css`
- 全局样式: `src/xiuxian/styles/global.css`
- 动画样式: `src/xiuxian/styles/animations.css`
- 属性面板组件: `src/xiuxian/components/AttributePanel.vue`
- 水墨按钮组件: `src/xiuxian/components/InkButton.vue`
