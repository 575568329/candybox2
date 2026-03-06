# 文档目录

本目录包含项目的详细技术文档。

## 目录结构

```
docs/
├── README.md                  # 本文件 - 文档导航
├── DESIGN.md                  # 设计规范与图标方案
├── ANALYTICS.md               # 埋点追踪系统文档
├── DEBUG.md                   # 调试工具使用说明
└── archive/                   # 归档文档
    ├── LIFERESTART_INTEGRATION.md    # 人生重开模拟器集成说明
    ├── plugin更新说明.md              # 插件版本更新记录
    ├── 上线检查报告.md                # 上线前检查报告
    ├── ANALYTICS_FIX_SUMMARY.md      # 埋点系统修复总结
    └── ANALYTICS_ISSUES.md            # 埋点系统问题分析
```

## 文档说明

### 核心文档

- **[DESIGN.md](DESIGN.md)** - 项目设计规范
  - 整体视觉风格定义
  - 游戏图标设计规范
  - SVG 图标技术实现
  - 扩展指南

- **[ANALYTICS.md](ANALYTICS.md)** - 埋点追踪系统
  - 系统概述与优化说明
  - 数据存储方案
  - 追踪的核心数据类型
  - 优化后的数据结构
  - 数据同步策略
  - 使用方法和调试

- **[DEBUG.md](DEBUG.md)** - 调试工具使用说明
  - vConsole 调试工具介绍
  - 快捷键使用方法
  - 功能说明（Console、System、Network、Element、Storage）
  - 使用场景示例
  - 常见问题解答

### 归档文档

`archive/` 目录包含临时性或历史性文档，保留供参考但不再更新：

- **LIFERESTART_INTEGRATION.md** - 人生重开模拟器游戏集成记录
- **plugin更新说明.md** - uTools 插件版本更新历史
- **上线检查报告.md** - v2.3.3 版本上线前检查报告
- **ANALYTICS_FIX_SUMMARY.md** - 埋点系统修复总结（2025-02-06）
- **ANALYTICS_ISSUES.md** - 埋点系统问题分析（已修复）

## 文档维护

### 添加新文档

1. 将核心文档放在 `docs/` 目录
2. 使用清晰的文件名（全大写英文 + .md）
3. 在本 README 中添加文档说明
4. 更新根目录 [README.md](../README.md) 的文档链接

### 归档文档

当文档不再需要频繁更新时，可移至 `archive/` 目录：
1. 使用 `git mv` 移动文件
2. 在本 README 的归档文档列表中添加说明
3. 保留文件原名称不变

---

**更新日期**: 2026-03-06
