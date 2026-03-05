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

        // 监听窗口关闭事件，确保关闭前保存存档
        window.addEventListener('beforeunload', () => {
          if (typeof Engine !== 'undefined' && Engine.saveGame) {
            // 立即执行保存，不防抖
            const gameStateStr = JSON.stringify(window.State);
            this.doSave(gameStateStr);
          }
        });

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

      // 防护：确保 event.data 是对象类型
      if (!event.data || typeof event.data !== 'object') {
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

        case 'adarkroom-get-save-data':
          // 存档管理器请求获取存档数据
          this.sendAllSaveData();
          break;

        case 'adarkroom-set-save-data':
          // 存档管理器请求设置存档数据
          if (data) {
            this.setAllSaveData(data);
          }
          break;

        case 'adarkroom-force-save-request':
          // 父页面请求立即强制保存
          if (typeof Engine !== 'undefined' && Engine.saveGame) {
            Engine.saveGame();
          }
          break;
      }
    },

    /**
     * 发送所有存档数据（供存档管理器使用）
     */
    sendAllSaveData() {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
      }
      
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'adarkroom-save-data',
          data: data
        }, '*');
      }
    },

    /**
     * 设置所有存档数据（供存档管理器使用）
     */
    setAllSaveData(data) {
      try {
        for (const key in data) {
          localStorage.setItem(key, data[key]);
        }
        
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'adarkroom-save-data-set',
            success: true
          }, '*');
        }
      } catch (e) {
        console.error('[uTools存档管理器] 设置存档数据失败:', e);
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'adarkroom-save-data-set',
            success: false
          }, '*');
        }
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

        // 防止无限刷新循环：如果刚刚因为应用存档而刷新过，不再重复刷新
        const reloadFlag = sessionStorage.getItem('adarkroom_reload_guard');
        if (reloadFlag) {
          sessionStorage.removeItem('adarkroom_reload_guard');
          console.log('[uTools存档管理器] 已在本次会话中应用过云端存档，跳过重复刷新');
          return;
        }

        // 检查当前 localStorage 是否已经有存档
        const currentLocalSave = localStorage.getItem(STORAGE_KEY);
        
        // 如果云端存档和本地存档一致，则不需要处理
        if (currentLocalSave === gameStateStr) {
          console.log('[uTools存档管理器] 云端存档与本地存档一致，无需更新');
          return;
        }

        // 保存到localStorage，确保 Engine.loadGame() 能读取到
        localStorage.setItem(STORAGE_KEY, gameStateStr);

        // 设置刷新保护标记，防止循环刷新
        sessionStorage.setItem('adarkroom_reload_guard', '1');

        console.log('[uTools存档管理器] 正在应用云端存档并刷新游戏...');
        window.location.reload();
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
