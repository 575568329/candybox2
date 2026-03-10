<template>
  <div class="cultivate-page">
    <!-- 修炼信息面板 -->
    <AttributePanel title="修炼法诀">
      <div class="cultivation-content">
        <div class="realm-display font-title">
          <span class="realm-label">当前境界</span>
          <span class="realm-text">{{ levelNames(player.level) }}({{ player.reincarnation || 0 }}转)</span>
        </div>
      </div>
    </AttributePanel>

    <!-- 修炼进度 -->
    <div class="ink-card progress-section">
      <h3 class="font-title">修为进度</h3>
      <div class="ink-progress">
        <div
          class="ink-progress-bar"
          :style="{ width: `${cultivationPercentage}%` }"
        ></div>
      </div>
      <div class="progress-text font-number">
        {{ player.cultivation }} / {{ player.maxCultivation }}
        <span class="progress-percent">({{ cultivationPercentage.toFixed(2) }}%)</span>
      </div>
    </div>

    <!-- 修炼日志 -->
    <div class="ink-card log-section">
      <h3 class="font-title">修炼日志</h3>
      <div class="log-content font-body">
        <el-scrollbar ref="scrollbar" always>
          <p v-for="(item, index) in texts" :key="index" v-html="item" />
        </el-scrollbar>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="actions-section">
      <InkButton type="primary" @click="startCultivate" :disabled="!isStart">开始修炼</InkButton>
      <InkButton type="secondary" @click="stopCultivate" :disabled="!isStop">停止修炼</InkButton>
      <InkButton type="warning" @click="reincarnationBreakthrough">转生突破</InkButton>
      <InkButton type="secondary" @click="() => router.push('/xiuxian/home')">返回家里</InkButton>
    </div>
  </div>
</template>

<script setup>
  import { useRouter } from 'vue-router'
  import { ref, computed, onUnmounted, onMounted } from 'vue'
  import { useMainStore } from '../plugins/store'
  import equip from '../plugins/equip'
  import { maxLv, smoothScrollToBottom, levelNames, gameNotifys } from '../plugins/game'
  import { ElMessageBox } from 'element-plus'
  import AttributePanel from '../components/AttributePanel.vue'
  import InkButton from '../components/InkButton.vue'

  const store = useMainStore()
  const router = useRouter()
  const texts = ref([])
  const player = ref(store.player)
  const isStop = ref(false)
  const isStart = ref(false)
  const timerIds = ref([])
  const observer = ref(null)
  const scrollbar = ref(null)
  const buttonsFor = computed(() => {
    return [
      { text: '开始修炼', click: () => startCultivate(), disabled: !isStart.value },
      { text: '停止修炼', click: () => stopCultivate(), disabled: !isStop.value },
      { text: '转生突破', click: () => reincarnationBreakthrough() },
      { text: '返回家里', click: () => router.push('/xiuxian/home') }
    ]
  })

  const cultivationPercentage = computed(() => {
    const { cultivation, maxCultivation } = player.value
    return Math.min(100, (cultivation / maxCultivation) * 100)
  })

  const startCultivate = () => {
    isStart.value = false
    const zs = player.value.reincarnation * 10
    const time = zs >= 200 ? 100 : 300 - zs
    const timerId = setInterval(() => {
      if (player.value.cultivation <= player.value.maxCultivation) {
        isStop.value = true
        isStart.value = false
        const exp =
          player.value.level <= 10
            ? Math.floor(player.value.maxCultivation / equip.getRandomInt(10, 30))
            : Math.floor(player.value.maxCultivation / 100)
        texts.value.push(
          player.value.level < maxLv
            ? '你开始冥想，吸收周围的灵气。修为提升了！'
            : '你当前的境界已修炼圆满, 需要转生后才能继续修炼'
        )
        breakThrough(exp)
        // 10%的概率触发随机事件
        if (Math.random() < 0.1) triggerRandomEvent()
      } else {
        breakThrough(100)
      }
    }, time)
    timerIds.value.push(timerId)
  }

  const triggerRandomEvent = () => {
    const randomEvents = [
      { type: 'resource', name: '灵石', amount: 100, description: '你发现了一堆灵石！' },
      { type: 'cultivation', name: '顿悟', amount: 500, description: '你突然顿悟，修为大涨！' },
      { type: 'item', name: '丹药', effect: '增加100点修为', description: '你获得了一颗珍贵的丹药！' },
      { type: 'skill', name: '剑法', effect: '增加10%攻击力', description: '你领悟了一门高深剑法！' },
      { type: 'lucky', name: '雷劫', effect: '修为降低10%', description: '你遭遇了雷劫！' }
    ]
    const event = randomEvents[Math.floor(Math.random() * randomEvents.length)]
    texts.value.push(`<span style="color: #E6A23C">${event.description}</span>`)
    switch (event.type) {
      case 'resource':
        player.value.props.money += event.amount
        break
      case 'cultivation':
        player.value.cultivation += event.amount
        break
      // 增加修为
      case 'item':
        player.value.cultivation += player.value.cultivation * 0.05
        break
      // 减少修为
      case 'lucky':
        player.value.cultivation -= player.value.cultivation * 0.1
        break
      // 增加攻击力
      case 'skill':
        player.value.attack *= 1.1
        break
    }
  }

  const stopCultivate = () => {
    timerIds.value.forEach(id => {
      clearInterval(id)
    })
    timerIds.value = []
    isStart.value = true
    isStop.value = false
  }

  const breakThrough = exp => {
    const reincarnation = player.value.reincarnation ? player.value.reincarnation + 1 : 1
    if (player.value.level < maxLv) {
      if (player.value.cultivation >= player.value.maxCultivation) {
        if (player.value.level > 10 && player.value.level > player.value.taskNum) {
          stopCultivate()
          isStop.value = false
          isStart.value = false
          texts.value.push(
            `当前境界修为已满, 你需要通过击败<span class="textColor">(${player.value.taskNum} / ${player.value.level})</span>个敌人证道突破`
          )
          return
        }
        player.value.taskNum = 0
        player.value.level++
        player.value.points += 3
        player.value.health = player.value.maxHealth
        player.value.maxCultivation = Math.floor(100 * Math.pow(2, player.value.level * reincarnation))
        texts.value.push(`恭喜你突破了！当前境界：${levelNames(player.value.level)}`)
      } else {
        player.value.cultivation += exp
      }
    } else {
      isStop.value = false
      isStart.value = false
      player.value.level = maxLv
      player.value.maxCultivation = Math.floor(100 * Math.pow(2, maxLv * reincarnation))
      stopCultivate()
    }
  }

  const reincarnationBreakthrough = () => {
    let reincarnation = player.value.reincarnation
    reincarnation = reincarnation == 0 ? 1 * 100 : reincarnation * 100
    if (player.value.level == maxLv) {
      if (player.value.points) {
        gameNotifys({ title: '未满足转生条件', message: `当前还有${player.value.points}境界点未使用, 无法转生` })
        return
      }
      if (player.value.taskNum >= reincarnation) {
        const txt =
          player.value.reincarnation == 0
            ? '转生之后的敌人属性是转生前的百倍<br>转生前请务必确认自己的实力是否足够战胜转生后的对手, 避免卡档后删档重练'
            : '转生操作不可逆, 是否确定要转生?'
        ElMessageBox.confirm(txt, '转生提醒', {
          center: true,
          cancelButtonText: '取消转生',
          confirmButtonText: '立即转生',
          dangerouslyUseHTMLString: true
        })
          .then(() => {
            player.value.level = 0
            player.value.taskNum = 0
            player.value.cultivation = 0
            player.value.maxCultivation = 100
            player.value.reincarnation++
            player.value.backpackCapacity += 50
            gameNotifys({
              title: '转生提示',
              message: `转生成功, 当前为${player.value.reincarnation}转, 背包总容量增加50`,
              dangerouslyUseHTMLString: true
            })
          })
          .catch(() => {})
      } else {
        gameNotifys({
          title: '未满足转生条件',
          message: `需要通过击败<span class="textColor">(${player.value.taskNum} / ${reincarnation})</span>个敌人证道转生`,
          dangerouslyUseHTMLString: true
        })
      }
    } else {
      gameNotifys({
        title: '未满足转生条件',
        message: `境界需要达到<span class="textColor">${levelNames(maxLv)}</span>才能满足转生条件`,
        dangerouslyUseHTMLString: true
      })
    }
  }

  const setupObserver = () => {
    const element = scrollbar.value?.wrapRef
    if (element) {
      observer.value = new MutationObserver(() => smoothScrollToBottom(element))
      observer.value.observe(element, { subtree: true, childList: true })
    }
  }

  const stopObserving = () => {
    if (observer.value) {
      observer.value.disconnect()
      observer.value = null
    }
  }

  onMounted(() => {
    startCultivate()
    setupObserver()
  })

  onUnmounted(() => {
    stopCultivate()
    stopObserving()
  })
</script>

<style scoped>
/* ==================== 水墨书院风格修炼页样式 ==================== */

.cultivate-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}

/* 修炼内容区 */
.cultivation-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.realm-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm);
}

.realm-label {
  color: var(--color-ink-lighter);
  font-size: 14px;
}

.realm-text {
  color: var(--color-cinnabar);
  font-size: 18px;
  font-weight: bold;
}

/* 进度区域 */
.progress-section {
  text-align: center;
  padding: var(--spacing-lg);
}

.progress-section h3 {
  margin-bottom: var(--spacing-md);
  color: var(--color-ink);
  font-size: 18px;
}

.ink-progress {
  margin: var(--spacing-md) 0;
  height: 8px;
  background-color: var(--color-paper);
  border-radius: var(--radius-sm);
  overflow: hidden;
  position: relative;
}

.ink-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--color-ink), var(--color-cinnabar));
  border-radius: var(--radius-sm);
  transition: width var(--transition-slow);
}

.progress-text {
  margin-top: var(--spacing-sm);
  color: var(--color-ink);
  font-size: 16px;
}

.progress-percent {
  color: var(--color-ink-light);
  font-size: 14px;
  margin-left: var(--spacing-xs);
}

/* 日志区域 */
.log-section {
  padding: var(--spacing-md);
}

.log-section h3 {
  margin-bottom: var(--spacing-md);
  color: var(--color-ink);
  font-size: 18px;
  text-align: center;
}

.log-content {
  max-height: 200px;
  overflow-y: auto;
  padding: var(--spacing-sm);
  background-color: var(--color-paper);
  border-radius: var(--radius-sm);
  line-height: 1.8;
  min-height: 80px;
}

.log-content p {
  margin: var(--spacing-xs) 0;
  padding-left: var(--spacing-md);
  border-left: 2px solid var(--color-ink-lighter);
}

/* 按钮区域 */
.actions-section {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: center;
  flex-wrap: wrap;
  padding: var(--spacing-md) 0;
}

/* 事件文本高亮 */
.event-text {
  color: var(--color-gold);
  font-weight: bold;
}

/* 响应式适配 */
@media (max-width: 600px) {
  .cultivate-page {
    padding: var(--spacing-sm);
    gap: var(--spacing-sm);
  }

  .actions-section {
    gap: var(--spacing-xs);
  }

  .realm-display {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-xs);
  }
}

/* uTools 小窗口优化 */
@media only screen and (max-width: 800px) and (max-height: 500px) {
  .cultivate-page {
    max-height: 320px;
    overflow-y: auto;
    padding: var(--spacing-xs);
    gap: var(--spacing-xs);
  }

  .progress-section,
  .log-section {
    padding: var(--spacing-sm);
  }

  .progress-section h3,
  .log-section h3 {
    font-size: 16px;
    margin-bottom: var(--spacing-xs);
  }

  .log-content {
    max-height: 120px;
    padding: var(--spacing-xs);
  }

  .realm-text {
    font-size: 16px;
  }

  .ink-progress {
    height: 6px;
    margin: var(--spacing-xs) 0;
  }

  .progress-text {
    font-size: 14px;
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .actions-section {
    flex-direction: column;
  }

  .actions-section .ink-button {
    width: 100%;
  }
}
</style>
