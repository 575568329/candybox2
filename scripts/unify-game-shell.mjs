/**
 * 一次性样式统一脚本:7 个游戏壳的 头部/返回按钮/副标题 统一为 tokens.css 规范
 * 运行: node scripts/unify-game-shell.mjs
 */
import { readFileSync, writeFileSync } from 'fs'

const files = [
  'src/views/TankView.vue',
  'src/views/ADarkRoomView.vue',
  'src/views/HextrisView.vue',
  'src/views/CirclePathView.vue',
  'src/views/EvolveView.vue',
  'src/components/CandyBox2Game.vue',
  'src/components/LifeRestartGame.vue'
]

const UNIFIED_BACK_BTN = `.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  padding: 4px 12px;
  background: var(--gs-btn-bg);
  border: 1px solid var(--gs-btn-border);
  border-radius: var(--gs-radius);
  color: var(--gs-text-1);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}`

const UNIFIED_HOVER_BODY = `  background: var(--gs-btn-bg-hover);
  border-color: var(--gs-btn-border-hover);`

const SURFACE = `  background: var(--gs-shell-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--gs-border);`

const UNIFIED_SUBTITLE = `.game-english-name {
  font-size: 12px;
  color: var(--gs-text-2);
  line-height: 1.3;
}`

for (const f of files) {
  let src = readFileSync(f, 'utf8')
  const before = src

  // 1. back-btn 主体(两种变体,逐行匹配从 .back-btn { 到 })
  src = src.replace(/^\.back-btn \{[^}]*\}/m, UNIFIED_BACK_BTN)

  // 2. back-btn:hover 的背景/边框色
  src = src.replace(
    /^(\.back-btn:hover \{\n)  background: rgba\(255, 255, 255, 0\.(?:15|2)\);\n  border-color: rgba\(255, 255, 255, 0\.3\);/m,
    `$1${UNIFIED_HOVER_BODY}`
  )

  // 3. header-container 注入统一表面(三种变体,只在 } 前插入且不重复)
  src = src.replace(
    /^(\.header-container \{[^}]*?)(\n\})/m,
    (m, head, tail) => head.includes('--gs-shell-bg') ? m : `${head}\n${SURFACE}${tail}`
  )

  // 4. 副标题统一
  src = src.replace(/^\.game-english-name \{[^}]*\}/m, UNIFIED_SUBTITLE)

  if (src !== before) {
    writeFileSync(f, src)
    console.log(`✓ ${f}`)
  } else {
    console.log(`⚠ ${f} 无变化(检查匹配)`)
  }
}
