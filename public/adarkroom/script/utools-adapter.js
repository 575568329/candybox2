/**
 * uTools云存档适配器 - 小黑屋专用
 * 自动将游戏存档同步到uTools云存储，实现跨设备存档同步
 */

(function() {
  'use strict';

  // 游戏ID
  const GAME_ID = 'adarkroom';
  const STORAGE_KEY = 'gameState';

  /**
   * uTools存档管理器
   */
  const UToolsSaveManager = {
    isInitialized: false,
    saveTimer: null,

    /**
     * 初始化 - 从uTools加载存档
     */
    async init() {
      if (this.isInitialized) return;

      try {
        // 监听来自父页面的消息
        window.addEventListener('message', this.handleMessage.bind(this));

        // 如果在uTools环境中，请求父页面加载存档
        this.requestLoadFromUTools();

        this.isInitialized = true;
        console.log('[uTools存档管理器] 初始化成功');
      } catch (error) {
        console.error('[uTools存档管理器] 初始化失败:', error);
      }
    },

    /**
     * 处理来自父页面的消息
     */
    handleMessage(event) {
      // 验证消息来源
      if (event.origin !== window.location.origin) {
        return;
      }

      const { type, data } = event.data;

      switch(type) {
        case 'adarkroom-load-save-response':
          // 父页面返回存档数据
          if (data && data.gameState) {
            console.log('[uTools存档管理器] 收到存档数据');
            this.applySaveData(data.gameState);
          }
          break;

        case 'adarkroom-save-response':
          // 保存确认
          console.log('[uTools存档管理器] 保存确认:', data);
          break;
      }
    },

    /**
     * 请求父页面从uTools加载存档
     */
    requestLoadFromUTools() {
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'adarkroom-load-save-request'
        }, '*');
      }
    },

    /**
     * 应用存档数据到游戏
     */
    applySaveData(gameStateStr) {
      try {
        if (!gameStateStr) return;

        const savedState = JSON.parse(gameStateStr);
        if (savedState) {
          // 保存到localStorage作为备份
          localStorage.setItem(STORAGE_KEY, gameStateStr);

          // 通知游戏引擎加载存档
          if (typeof Engine !== 'undefined' && Engine.loadGame) {
            Engine.loadGameFromString(gameStateStr);
          }

          console.log('[uTools存档管理器] 存档已应用');
        }
      } catch (error) {
        console.error('[uTools存档管理器] 应用存档失败:', error);
      }
    },

    /**
     * 保存存档到uTools（带防抖）
     */
    saveToUTools(gameStateStr) {
      // 清除之前的定时器
      if (this.saveTimer) {
        clearTimeout(this.saveTimer);
      }

      // 设置新的定时器（1秒后保存）
      this.saveTimer = setTimeout(() => {
        this.doSave(gameStateStr);
      }, 1000);
    },

    /**
     * 执行保存到uTools
     */
    doSave(gameStateStr) {
      try {
        // 同时保存到localStorage作为备份
        localStorage.setItem(STORAGE_KEY, gameStateStr);

        // 通知父页面保存到uTools
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'adarkroom-save-request',
            data: {
              gameState: gameStateStr,
              timestamp: Date.now()
            }
          }, '*');
        }

        console.log('[uTools存档管理器] 存档已同步');
      } catch (error) {
        console.error('[uTools存档管理器] 保存失败:', error);
      }
    }
  };

  // 暴露到全局
  window.UToolsSaveManager = UToolsSaveManager;

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      UToolsSaveManager.init();
    });
  } else {
    UToolsSaveManager.init();
  }

})();
