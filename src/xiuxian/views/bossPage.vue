<template>
  <div class="boss-page">
    <!-- BOSS 信息卡片 -->
    <div class="ink-card boss-info">
      <h2 class="boss-name font-title" @click="openBossInfo">{{ store.boss.name }}</h2>
      <p class="boss-desc font-body">{{ store.boss.desc }}</p>
      <div class="boss-stats" v-if="store.boss.health > 0">
        <div class="stat-item">
          <span class="stat-label">气血</span>
          <div class="ink-progress">
            <div class="ink-progress-bar" :style="{ width: `${(store.boss.health / store.boss.maxhealth) * 100}%` }"></div>
          </div>
          <span class="stat-value font-number">{{ formatNumberToChineseUnit(store.boss.health) }} / {{ formatNumberToChineseUnit(store.boss.maxhealth) }}</span>
        </div>
      </div>
      <div class="boss-seal" v-else>
        <span class="seal">未刷新</span>
      </div>
    </div>

    <!-- 战斗日志 -->
    <div class="ink-card battle-log">
      <div class="battle-header">
        <h3 class="font-title">战况记录</h3>
        <span v-if="isFighting" class="round-counter font-number">{{ guashaRounds }} 回合 / 50 回合</span>
      </div>
      <div class="log-content font-body">
        <el-scrollbar ref="scrollbar" always>
          <p
            v-for="(item, index) in texts"
            :key="index"
            class="log-entry"
            v-html="item"
            @click="openEquipmentInfo(equipmentInfo)"
          />
        </el-scrollbar>
      </div>
    </div>

    <!-- 战斗操作 -->
    <div class="actions-section">
      <InkButton type="primary" @click="startFightBoss" :disabled="isEnd">
        发起战斗
      </InkButton>
      <InkButton type="secondary" @click="router.push('/xiuxian/home')">
        回家疗伤
      </InkButton>
    </div>
  </div>
</template>

<script setup>
  import boss from '../plugins/boss'
  import { useRouter } from 'vue-router'
  import { ref, onUnmounted, onMounted } from 'vue'
  import { useMainStore } from '../plugins/store'
  import { ElMessageBox } from 'element-plus'
  import { maxLv, levelNames, formatNumberToChineseUnit, genre, levels, smoothScrollToBottom } from '../plugins/game'
  import InkButton from '../components/InkButton.vue'

  const router = useRouter()
  const store = useMainStore()
  const isEnd = ref(false)
  const texts = ref([])
  const player = ref(store.player)
  const timerIds = ref([])
  const currency = ref(boss.getRandomInt(1, 10))
  const isFighting = ref(false)
  const startFight = ref(false)
  const isequipment = ref(false)
  const guashaRounds = ref(50)
  const equipmentInfo = ref({})
  const scrollbar = ref(null)

  // 开始攻击
  const startFightBoss = () => {
    if (isEnd.value) return
    isEnd.value = true
    const zs = player.value.reincarnation * 10
    const time = zs >= 200 ? 100 : 300 - zs
    const timerId = setInterval(() => {
      fightBoss()
      const element = scrollbar.value?.wrapRef
      const observer = new MutationObserver(() => {
        smoothScrollToBottom(element)
      })
      observer.observe(element, {
        childList: true,
        subtree: true
      })
    }, time)
    timerIds.value.push(timerId)
  }

  // 停止攻击
  const stopFightBoss = () => {
    timerIds.value.forEach(id => clearInterval(id))
    timerIds.value = []
  }

  // boss信息
  const openBossInfo = () => {
    const info = store.boss
    ElMessageBox.confirm('', info.name, {
      center: true,
      message: `<div class="monsterinfo">
      <div class="monsterinfo-box">
      <p>境界: ${levelNames(info.level)}</p>
      <p>气血: ${formatNumberToChineseUnit(info.health)}</p>
      <p>攻击: ${formatNumberToChineseUnit(info.attack)}</p>
      <p>防御: ${formatNumberToChineseUnit(info.defense)}</p>
      <p>闪避率: ${info.dodge > 0 ? (info.dodge * 100 > 100 ? 100 : (info.dodge * 100).toFixed(2)) : 0}%</p>
      <p>暴击率: ${info.critical > 0 ? (info.critical * 100 > 100 ? 100 : (info.critical * 100).toFixed(2)) : 0}%</p>
      <p>鸿蒙石掉落: ${currency.value}块</p>
      <p>神装掉落率: 100%</p>
      </div>
    </div>`,
      showCancelButton: false,
      confirmButtonText: '知道了',
      dangerouslyUseHTMLString: true
    }).catch(() => {})
  }

  // 攻击世界boss
  const fightBoss = () => {
    if (player.value.level < maxLv) {
      isEnd.value = true
      stopFightBoss()
      texts.value.push(`你的境界尚未达到${levelNames(maxLv)}, ${store.boss.name}对于你的挑战不屑一顾`)
      return
    }
    if (store.boss.health <= 0 || !store.boss.health) {
      texts.value.push('BOSS刷新时间还未到')
      return
    }
    isFighting.value = true
    // boss伤害计算
    const monsterAttack = store.boss.attack // boss攻击
    const playerDefense = player.value.defense // 玩家防御
    let monsterHarm = Math.max(0, Math.floor(monsterAttack - playerDefense)) // boss伤害
    monsterHarm = monsterHarm <= 1 ? 1 : monsterHarm // 伤害小于1时强制破防
    // 玩家伤害计算
    const playerAttack = player.value.attack // 玩家攻击
    const monsterDefense = store.boss.defense // boss防御
    let playerHarm = Math.max(0, Math.floor(playerAttack - monsterDefense)) // 玩家伤害基础值
    playerHarm = playerHarm <= 1 ? 1 : playerHarm // 伤害小于1时强制破防
    // 是否暴击
    let isMCritical = false,
      isCritical = false
    // 玩家是否闪避
    const isPlayerHit = Math.random() > store.boss.dodge
    // boss是否闪避
    const isBHit = Math.random() > player.value.dodge
    // 检查boss是否暴击
    if (Math.random() < store.boss.critical) {
      // boss暴击，伤害加倍
      monsterHarm *= 2
      // boss成功暴击
      isMCritical = true
    }
    // 检查玩家是否暴击
    if (Math.random() < player.value.critical) {
      // 玩家暴击，伤害加倍
      playerHarm *= 1.5
      // 玩家成功暴击
      isCritical = true
    }
    // 如果玩家没有闪避，扣除玩家气血
    if (isBHit) player.value.health -= monsterHarm
    // 如果boss没有闪避，扣除boss气血
    if (isPlayerHit) store.boss.health -= playerHarm
    player.value.health = Math.max(0, player.value.health)
    store.boss.health = Math.max(0, store.boss.health)
    if (guashaRounds.value > 1) {
      // 扣除回合数
      guashaRounds.value--
      // boss气血小于等于0
      if (store.boss.health <= 0) {
        const equipItem = boss.boss_Equip(maxLv)
        isequipment.value = true
        equipmentInfo.value = equipItem
        texts.value.push(
          `你击败${store.boss.name}后，获得了<span class="el-tag el-tag--${equipItem.quality}">${
            levels[equipItem.quality]
          }${equipItem.name}(${genre[equipItem.type]})</span>`
        )
        // 如果装备背包当前容量大于等于背包总容量
        if (player.value.inventory.length >= player.value.backpackCapacity)
          texts.value.push(`当前装备背包容量已满, 该装备自动丢弃, 转生可增加背包容量`)
        // 玩家获得道具
        else player.value.inventory.push(equipItem)
        // 增加悟性丹
        player.value.props.rootBone += 1
        // 获得悟性丹通知
        texts.value.push('你获得了1颗悟性丹')
        // 增加鸿蒙石
        player.value.props.currency += currency.value
        // 获得鸿蒙石通知
        texts.value.push(`你获得了${currency.value}块鸿蒙石`)
        // 修改按钮状态
        isEnd.value = true
        // 修改boss状态
        store.boss.time = Math.floor(Date.now() / 1000)
        store.boss.health = 0
        store.boss.conquer = true
        stopFightBoss()
      } else if (player.value.health <= 0) {
        isEnd.value = true
        // 恢复boss血量
        store.boss.health = store.boss.maxhealth
        texts.value.push('你因为太弱被击败了。')
        texts.value.push(`${store.boss.text}`)
        stopFightBoss()
        guashaRounds.value = 50
      } else {
        texts.value.push(
          isPlayerHit
            ? `你攻击了${store.boss.name}，${isCritical ? '触发暴击' : ''}造成了${playerHarm}点伤害，剩余${
                store.boss.health
              }气血。`
            : `你攻击了${store.boss.name}，对方闪避了你的攻击，你未造成伤害，剩余${store.boss.health}气血。 `
        )
        texts.value.push(
          isBHit
            ? `${store.boss.name}攻击了你，${isMCritical ? '触发暴击' : ''}造成了${monsterHarm}点伤害`
            : `${store.boss.name}攻击了你，你闪避了对方的攻击，对方未造成伤害，你剩余${player.value.health}气血。 `
        )
      }
    } else {
      // 恢复默认回合数
      guashaRounds.value = 50
      stopFightBoss()
      // 恢复boss血量
      store.boss.health = store.boss.maxhealth
      texts.value.push(`回合结束, 你未战胜${store.boss.name}你输了。`)
      texts.value.push(`${store.boss.text}`)
    }
  }

  const openEquipmentInfo = item => {
    if (!isequipment.value) return
    ElMessageBox.confirm('', item.name, {
      center: true,
      message: `<div class="monsterinfo">
      <div class="monsterinfo-box">
        <p>类型: ${genre[item.type] ?? '未知'}</p>
        <p>境界: ${levelNames(item.level)}</p>
        <p>品质: ${levels[item.quality] ?? '未知'}</p>
        <p>气血: ${formatNumberToChineseUnit(item.health)}</p>
        <p>攻击: ${formatNumberToChineseUnit(item.attack)}</p>
        <p>防御: ${formatNumberToChineseUnit(item.defense)}</p>
        <p>闪避率: ${(item.dodge * 100).toFixed(2) ?? 0}%</p>
        <p>暴击率: ${(item.critical * 100).toFixed(2) ?? 0}%</p>
        </div>
    </div>`,
      showClose: false,
      closeOnClickModal: false,
      closeOnPressEscape: false,
      dangerouslyUseHTMLString: true,
      showCancelButton: false,
      confirmButtonText: '知道了'
    })
      .then(() => {
        router.push('/xiuxian/home')
      })
      .catch(() => {
        router.push('/xiuxian/home')
      })
  }

  // 世界BOSS
  const assaultBoss = () => {
    // boss生成的时间
    const time = getMinuteDifference(store.boss.time)
    // boss难度根据玩家最高等级 + 转生次数
    const bossLv = maxLv * player.value.reincarnation + maxLv
    // 检查boss的血量和时间
    if (store.boss.health > 0) {
      // 如果boss还有血量，允许玩家挑战
      if (time >= 5) {
        // boss没有血量但时间大于等于5分钟，重新生成boss
        store.boss = boss.drawPrize(bossLv)
      }
      // 如果boss没有血量
    } else {
      if (time >= 5 || store.boss.time == 0) {
        // boss没有血量但时间大于等于5分钟，重新生成boss
        store.boss = boss.drawPrize(bossLv)
      } else {
        isEnd.value = true
        texts.value.push('BOSS还未刷新，请等待5分钟后再次挑战')
        return
      }
    }
    //更新回合数
    guashaRounds.value = 50
  }

  // 计算当前时间和指定时间相差多少分钟
  const getMinuteDifference = specifiedTimestamp => {
    // 获取当前时间戳（秒数）
    const currentTimestamp = Math.floor(Date.now() / 1000)
    specifiedTimestamp = specifiedTimestamp == 0 ? currentTimestamp : specifiedTimestamp
    // 计算时间差（分钟数）
    const timeDifferenceInSeconds = Math.abs(currentTimestamp - specifiedTimestamp)
    const timeDifferenceInMinutes = Math.floor(timeDifferenceInSeconds / 60)
    return timeDifferenceInMinutes
  }

  onMounted(() => {
    assaultBoss()
  })

  onUnmounted(() => {
    stopFightBoss()
  })
</script>

<style scoped>
.boss-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
}

/* BOSS 信息卡片 */
.boss-info {
  background: linear-gradient(135deg, rgba(200, 48, 44, 0.05) 0%, var(--color-paper-dark) 100%);
  border-left: 4px solid var(--color-cinnabar);
}

.boss-name {
  font-size: 24px;
  color: var(--color-cinnabar);
  text-align: center;
  margin: 0 0 var(--spacing-sm) 0;
  letter-spacing: 4px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.boss-name:hover {
  text-shadow: 0 0 8px rgba(200, 48, 44, 0.3);
}

.boss-desc {
  color: var(--color-ink-light);
  text-align: center;
  line-height: 1.6;
  margin: var(--spacing-sm) 0;
}

.boss-stats {
  margin-top: var(--spacing-md);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background-color: var(--color-paper);
  border-radius: var(--radius-sm);
}

.stat-label {
  font-family: var(--font-title);
  font-size: 14px;
  color: var(--color-ink-lighter);
  min-width: 40px;
}

.ink-progress {
  flex: 1;
  height: 10px;
  background-color: var(--color-paper-dark);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.stat-value {
  font-size: 12px;
  color: var(--color-ink-light);
  min-width: 80px;
  text-align: right;
}

.boss-seal {
  text-align: center;
  padding: var(--spacing-md);
}

/* 战斗日志 */
.battle-log {
  min-height: 150px;
  max-height: 200px;
  overflow: hidden;
}

.battle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--color-ink-lighter);
}

.battle-header h3 {
  font-size: 18px;
  color: var(--color-ink);
  margin: 0;
  letter-spacing: 2px;
}

.round-counter {
  font-size: 14px;
  color: var(--color-cinnabar);
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: rgba(200, 48, 44, 0.1);
  border-radius: var(--radius-sm);
}

.log-content {
  line-height: 1.6;
  color: var(--color-ink-light);
}

.log-entry {
  margin: var(--spacing-xs) 0;
  padding-left: var(--spacing-md);
  border-left: 2px solid var(--color-ink-lighter);
  transition: all var(--transition-fast);
}

.log-entry:hover {
  border-left-color: var(--color-cinnabar);
  padding-left: var(--spacing-lg);
}

/* 操作按钮区 */
.actions-section {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: center;
  flex-wrap: wrap;
}

/* uTools 窗口优化 */
@media only screen and (max-width: 800px) and (max-height: 500px) {
  .boss-page {
    padding: var(--spacing-sm);
    gap: var(--spacing-sm);
  }

  .boss-name {
    font-size: 20px;
  }

  .battle-log {
    min-height: 100px;
    max-height: 150px;
  }

  .battle-header h3 {
    font-size: 16px;
  }

  .round-counter {
    font-size: 12px;
  }
}
</style>
