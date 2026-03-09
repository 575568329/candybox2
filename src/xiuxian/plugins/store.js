import { defineStore } from 'pinia'
import crypto from './crypto'

export const useXiuxianStore = defineStore('xiuxian', {
  state: () => ({
    // boss属性
    boss: {
      name: '',
      text: '',
      time: 0,
      desc: '',
      level: 0,
      dodge: 0,
      attack: 0,
      health: 0,
      conquer: false,
      defense: 0,
      critical: 0,
      maxhealth: 0
    },
    // 玩家属性
    player: {
      zc: false,
      age: 1,
      pet: {},
      time: 0,
      name: '玩家',
      dark: false,
      npcs: [],
      wife: {},
      pets: [],
      wifes: [],
      props: {
        money: 0,
        flying: 0,
        qingyuan: 0,
        rootBone: 0,
        currency: 0,
        cultivateDan: 0,
        strengtheningStone: 0
      },
      score: 0,
      level: 0,
      dodge: 0,
      points: 0,
      attack: 10,
      health: 100,
      critical: 0,
      defense: 10,
      taskNum: 0,
      version: 0.8,
      currency: 0,
      maxHealth: 100,
      inventory: [],
      isNewbie: false,
      shopData: [],
      equipment: {
        sutra: {},
        armor: {},
        weapon: {},
        accessory: {}
      },
      achievement: {
        pet: [],
        monster: [],
        equipment: []
      },
      script: '',
      cultivation: 0,
      currentTitle: null,
      reincarnation: 0,
      maxCultivation: 100,
      backpackCapacity: 50,
      sellingEquipmentData: [],
      highestTowerFloor: 1,
      rewardedTowerFloors: [],
      nextGameTimes: {
        rps: null,
        dice: null,
        fortune: null,
        secretrealm: 0,
        gamblingStone: null
      },
      gameWins: 0,
      gameLosses: 0,
      checkinDays: 0,
      checkinStreak: 0,
      lastCheckinDate: null,
      fortuneTellingDate: null,
      checkedInToday: false
    },
    // 怪物信息
    monster: {
      name: '',
      health: 0,
      attack: 0,
      defense: 0,
      dodge: 0,
      critical: 0
    },
    mapData: {
      y: 0,
      x: 0,
      map: []
    },
    mapScroll: 0,
    fishingMap: []
  }),
  persist: {
    key: 'xiuxian_save',
    paths: ['boss', 'player', 'monster', 'mapData', 'mapScroll', 'fishingMap'],
    storage: localStorage,
    serializer: {
      serialize: state => {
        return JSON.stringify({
          boss: crypto.encryption(state.boss),
          player: crypto.encryption(state.player),
          monster: state.monster,
          mapData: state.mapData,
          mapScroll: state.mapScroll,
          fishingMap: state.fishingMap
        })
      },
      deserialize: value => {
        try {
          const state = JSON.parse(value)
          return {
            boss: crypto.decryption(state.boss),
            player: crypto.decryption(state.player),
            monster: state.monster || {},
            mapData: state.mapData || { y: 0, x: 0, map: [] },
            mapScroll: state.mapScroll || 0,
            fishingMap: state.fishingMap || []
          }
        } catch (e) {
          // 如果解密失败，返回默认状态
          return {
            boss: {},
            player: {},
            monster: {},
            mapData: { y: 0, x: 0, map: [] },
            mapScroll: 0,
            fishingMap: []
          }
        }
      }
    }
  }
})

// 为了兼容原有代码，导出 useMainStore 别名
export const useMainStore = useXiuxianStore
