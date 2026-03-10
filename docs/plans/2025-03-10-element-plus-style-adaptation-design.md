# Element Plus 组件水墨书院风样式适配设计

**日期**: 2025-03-10
**状态**: 已批准
**实施方式**: 作用域隔离（只影响 xiuxian 游戏）

---

## 一、设计目标

让 Element Plus 组件融入水墨书院风格，与 InkButton、AttributePanel 等自定义组件保持视觉一致。

**设计原则**：
- **最小侵入**：只修改视觉样式，不改变组件功能
- **风格统一**：与自定义组件保持一致
- **作用域隔离**：只影响 xiuxian 游戏，不影响其他游戏

---

## 二、配色方案

### Element Plus 原色 → 水墨书院风

| 组件/状态 | 原色 | 水墨色 | CSS 变量 |
|---------|------|--------|---------|
| Primary | 蓝色 #409EFF | 朱砂红 | `--color-cinnabar` |
| Success | 绿色 #67C23A | 玉色 | `--color-jade` |
| Warning | 橙色 #E6A23C | 古铜金 | `--color-gold` |
| Danger | 红色 #F56C6C | 朱砂红 | `--color-cinnabar` |
| Info | 灰色 #909399 | 墨色 | `--color-ink` |

### CSS 变量定义

```css
:root {
  --el-color-primary: var(--color-cinnabar);
  --el-color-success: var(--color-jade);
  --el-color-warning: var(--color-gold);
  --el-color-danger: var(--color-cinnabar);
  --el-color-info: var(--color-ink);
}
```

---

## 三、组件样式设计

### 3.1 按钮（el-button）✅ 已完成

**状态**：已全局替换为 InkButton 组件，无需额外适配。

---

### 3.2 标签（el-tag）- P0

**配色方案**：
```css
.el-tag {
  background-color: var(--color-paper);
  border-color: var(--color-ink);
  color: var(--color-ink);
}

.el-tag--success {
  background-color: rgba(95, 141, 110, 0.1);
  border-color: var(--color-jade);
  color: var(--color-jade);
}

.el-tag--warning {
  background-color: rgba(184, 134, 11, 0.1);
  border-color: var(--color-gold);
  color: var(--color-gold);
}

.el-tag--danger {
  background-color: rgba(200, 48, 44, 0.1);
  border-color: var(--color-cinnabar);
  color: var(--color-cinnabar);
}
```

**形状**：圆角矩形，带印章感
- 圆角：4px
- 边框：2px solid
- 内边距：4px 12px
- 字体：13px bold

---

### 3.3 对话框（el-dialog）- P0

**标题栏**：
- 背景：木纹渐变 `linear-gradient(135deg, #8B4513, #A0522D)`
- 文字：烫金效果，楷体
- 装饰：四角云纹

**内容区**：
- 背景：宣纸纹理 `var(--color-paper)`
- 边框：墨色细线 1px
- 内边距：20px

**按钮**：
- 替换为 InkButton
- 统一使用印章样式

**阴影**：
```css
.el-dialog {
  box-shadow:
    0 4px 12px rgba(44, 44, 44, 0.15),
    0 8px 24px rgba(44, 44, 44, 0.1);
}
```

---

### 3.4 抽屉（el-drawer）- P0

**容器**：
- 背景：宣纸色 + 纹理
- 边框：墨色 2px
- 标题：楷体，朱砂红

**装饰**：
- 右上角："仙"字印章
- 顶部：云纹装饰

---

### 3.5 消息框（el-message-box）- P1

**整体**：
- 边框：匾额样式（木纹渐变）
- 背景：宣纸色
- 按钮：InkButton

**图标**：
- Success：玉色勾选 ✓
- Warning：金色感叹号 ！
- Error：朱砂红叉号 ✗
- Info：墨色信息 i

---

### 3.6 提示框（el-tooltip、el-popover）- P1

**容器**：
- 背景：半透明宣纸色 `rgba(247, 244, 237, 0.95)`
- 边框：淡墨 1px
- 圆角：6px
- 阴影：水墨晕染

**箭头**：
- 颜色：墨色
- 形状：三角形

**文字**：
- 字体：宋体
- 颜色：墨色
- 大小：14px

---

### 3.7 下拉菜单（el-dropdown）- P1

**菜单容器**：
- 背景：宣纸色
- 边框：墨色细线
- 圆角：6px
- 阴影：水墨晕染

**菜单项**：
- 默认：墨色文字
- 悬停：淡墨背景 `rgba(44, 44, 44, 0.05)`
- 间距：8px

**分隔线**：
- 颜色：淡墨 `var(--color-ink-lighter)`
- 高度：1px
- 样式：实线

---

### 3.8 其他组件 - P2

**折叠面板（el-collapse）**：
- 标题：楷体，墨色
- 背景：宣纸色
- 图标：墨色箭头

**分隔线（el-divider）**：
- 颜色：淡墨
- 文字：楷体，朱砂红

**复选框（el-checkbox）**：
- 勾选框：墨色边框
- 选中：玉色背景
- 文字：宋体

---

## 四、动画效果

### 4.1 过渡动画

**全局覆盖**：
```css
/* 水墨淡入效果 */
.el-dialog__wrapper,
.el-drawer,
.el-message-box__wrapper {
  transition: all var(--transition-normal);
}

.el-dialog__body {
  animation: ink-fade-in 300ms;
}
```

### 4.2 悬停效果

**标签**：
- 悬停：轻微上浮 + 淡墨阴影
- 过渡：150ms

**下拉项**：
- 悬停：淡墨背景
- 过渡：150ms

---

## 五、深色模式适配

### 5.1 配色方案

**暗色模式变量**：
```css
.dark {
  --el-bg-color: #1a1a1a;
  --el-text-color-primary: #e8e4d9;
  --el-border-color: #6a6a6a;
}
```

### 5.2 组件暗色样式

**对话框**：
- 背景：深色 `#252525`
- 边框：淡墨 `#6a6a6a`
- 标题栏：深木纹渐变

**标签**：
- 背景：半透明深色
- 边框：淡墨
- 文字：浅墨

**提示框**：
- 背景：半透明深色 `rgba(26, 26, 26, 0.95)`
- 文字：浅墨

---

## 六、实施方式

### 6.1 文件结构

```
src/xiuxian/styles/
├── theme.css              # 主题变量（已有）
├── global.css             # 全局样式（已有）
├── animations.css         # 动画效果（已有）
└── element-plus.css       # Element Plus 样式覆盖（新增）
```

### 6.2 引入方式

**在 XiuxianGame.vue 中引入**：
```vue
<style>
/* 引入 Element Plus 样式覆盖 */
@import './styles/element-plus.css';
</style>
```

### 6.3 作用域隔离

**只影响 xiuxian 游戏**：
- 样式文件放在 `src/xiuxian/` 目录
- 在 XiuxianGame.vue 中引入
- 不影响其他游戏（tetris、candybox2 等）

---

## 七、优先级分类

### P0（必须适配）- 第一阶段
1. ✅ 按钮组件 - 已完成（InkButton）
2. ⏳ 标签组件 - el-tag 样式覆盖
3. ⏳ 对话框 - el-dialog 水墨风格
4. ⏳ 抽屉 - el-drawer 样式适配

**预估时间**：2-3 小时

### P1（重要）- 第二阶段
5. ⏳ 消息框 - el-message-box
6. ⏳ 提示框 - el-tooltip、el-popover
7. ⏳ 下拉菜单 - el-dropdown

**预估时间**：1-2 小时

### P2（可选）- 第三阶段
8. ⏳ 其他组件（el-collapse、el-divider、el-checkbox 等）

**预估时间**：1 小时

---

## 八、测试要点

### 8.1 视觉测试
- [ ] 配色与水墨书院风一致
- [ ] 字体使用楷体/宋体
- [ ] 圆角、阴影与自定义组件一致
- [ ] 深色模式切换正常

### 8.2 功能测试
- [ ] 对话框打开/关闭正常
- [ ] 标签显示正确
- [ ] 提示框触发正常
- [ ] 下拉菜单可用

### 8.3 性能测试
- [ ] CSS 覆盖不影响渲染性能
- [ ] 动画流畅不卡顿
- [ ] 深色模式切换快速

---

## 九、风险控制

### 9.1 样式冲突
**风险**：Element Plus 样式覆盖可能影响组件布局
**措施**：
- 逐步测试，逐个组件适配
- 保留原始样式作为备份
- 使用浏览器开发工具检查

### 9.2 性能影响
**风险**：大量 CSS 覆盖可能影响性能
**措施**：
- 使用 CSS 变量，减少重复代码
- 避免使用 `!important`
- 测试渲染性能

### 9.3 兼容性
**风险**：样式覆盖可能导致组件行为异常
**措施**：
- 只修改视觉样式，不修改结构
- 保留组件的原有功能
- 充分测试每个组件

---

## 十、验收标准

### 10.1 视觉一致性
- ✅ 所有组件配色使用水墨书院风
- ✅ 字体使用楷体/宋体
- ✅ 装饰元素（云纹、印章）统一

### 10.2 功能完整性
- ✅ 所有组件功能正常
- ✅ 深色模式切换正常
- ✅ 动画效果流畅

### 10.3 性能标准
- ✅ 渲染性能无明显下降
- ✅ 样式加载速度快
- ✅ 无布局抖动

---

## 附录：参考资源

- Element Plus 官方文档：https://element-plus.org/
- 水墨书院风设计文档：`docs/xiuxian-style-guide.md`
- 已完成的组件：InkButton、AttributePanel
