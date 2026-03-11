/**
 * uTools云存档适配器 - 进化游戏专用
 * 自动将游戏存档同步到uTools云存储，实现跨设备存档同步
 */

(function() {
  'use strict';

  // 游戏ID和存储键
  const GAME_ID = 'evolve';
  const STORAGE_KEY = 'evolved';

  /**
   * uTools存档管理器
   */
  const UToolsSaveManager = {
    isInitialized: false,
    saveTimer: null,
    saveData: null,
    storageAvailable: true,

    /**
     * 初始化 - 从uTools加载存档
     */
    async init() {
      if (this.isInitialized) return;

      try {
        // 检查 localStorage 是否可用
        this.storageAvailable = this.checkStorageAvailability();
        if (!this.storageAvailable) {
          console.warn('[uTools存档管理器] localStorage 不可用，存档功能已禁用');
          // 即使存档不可用，也继续初始化，不影响游戏运行
        } else {
          // 拦截 localStorage 的.setItem和getItem，实现自动同步
          this.interceptStorage();
        }

        // 监听来自父页面的消息
        window.addEventListener('message', this.handleMessage.bind(this));

        // 监听窗口关闭事件，确保关闭前保存存档
        window.addEventListener('beforeunload', () => {
          // 立即执行保存，不防抖
          if (this.saveData && this.storageAvailable) {
            this.doSave(this.saveData);
          }
        });

        // 监听页面可见性变化，隐藏时保存存档
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden' && this.saveData && this.storageAvailable) {
            console.log('[uTools存档管理器] 页面隐藏，立即保存存档');
            this.doSave(this.saveData);
          }
        });

        // 如果在uTools环境中，请求父页面加载存档
        this.requestLoadFromUTools();

        this.isInitialized = true;
        console.log('[uTools存档管理器] 初始化成功');
      } catch (error) {
        console.error('[uTools存档管理器] 初始化失败:', error);
        // 初始化失败不应阻止游戏运行
      }
    },

    /**
     * 检查 localStorage 是否可用
     */
    checkStorageAvailability() {
      try {
        const testKey = '__storage_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        return true;
      } catch (e) {
        console.error('[uTools存档管理器] localStorage 不可用:', e);
        return false;
      }
    },

    /**
     * 拦截 localStorage 操作
     */
    interceptStorage() {
      const originalSetItem = localStorage.setItem;
      const originalGetItem = localStorage.getItem;

      // 拦截 setItem
      localStorage.setItem = (key, value) => {
        try {
          // 先执行原始操作
          const result = originalSetItem.call(localStorage, key, value);

          // 如果是游戏的存档键，同步到uTools
          if (key === STORAGE_KEY && value && typeof value === 'string') {
            this.saveData = value;
            this.saveToUTools(value);
          }

          return result;
        } catch (error) {
          console.error('[uTools存档管理器] localStorage.setItem 失败:', error);
          // 即使失败也要尝试执行原始操作
          try {
            return originalSetItem.call(localStorage, key, value);
          } catch (originalError) {
            console.error('[uTools存档管理器] 原始setItem也失败:', originalError);
            throw originalError;
          }
        }
      };

      // 拦截 getItem
      localStorage.getItem = (key) => {
        try {
          return originalGetItem.call(localStorage, key);
        } catch (error) {
          console.error('[uTools存档管理器] localStorage.getItem 失败:', error);
          return null;
        }
      };
    },

    /**
     * 处理来自父页面的消息
     */
    handleMessage(event) {
      try {
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
          case 'evolve-load-save-response':
            // 父页面返回存档数据
            if (data && data.saveData) {
              console.log('[uTools存档管理器] 收到存档数据');
              this.applySaveData(data.saveData);
            }
            break;

          case 'evolve-save-response':
            // 保存确认（静默处理）
            break;

          case 'evolve-get-save-data':
            // 存档管理器请求获取存档数据
            this.sendAllSaveData();
            break;

          case 'evolve-set-save-data':
            // 存档管理器请求设置存档数据
            if (data) {
              this.setAllSaveData(data);
            }
            break;

          case 'evolve-force-save-request':
            // 父页面请求立即强制保存
            if (this.saveData) {
              this.doSave(this.saveData);
            }
            break;
        }
      } catch (error) {
        console.error('[uTools存档管理器] 处理消息失败:', error);
        // 消息处理失败不应影响游戏运行
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
          type: 'evolve-save-data',
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
            type: 'evolve-save-data-set',
            success: true
          }, '*');
        }
      } catch (e) {
        console.error('[uTools存档管理器] 设置存档数据失败:', e);
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'evolve-save-data-set',
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
          type: 'evolve-load-save-request'
        }, '*');
      }
    },

    /**
     * 应用存档数据到游戏
     */
    applySaveData(saveDataStr) {
      try {
        if (!saveDataStr) {
          console.log('[uTools存档管理器] 云端存档为空，跳过应用');
          return;
        }

        // 验证存档数据格式
        if (typeof saveDataStr !== 'string') {
          console.error('[uTools存档管理器] 存档格式错误，不是字符串类型');
          return;
        }

        // 防止无限刷新循环：如果刚刚因为应用存档而刷新过，不再重复刷新
        const reloadFlag = sessionStorage.getItem('evolve_reload_guard');
        if (reloadFlag) {
          sessionStorage.removeItem('evolve_reload_guard');
          console.log('[uTools存档管理器] 已在本次会话中应用过云端存档，跳过重复刷新');
          return;
        }

        // 检查当前 localStorage 是否已经有存档
        const currentLocalSave = localStorage.getItem(STORAGE_KEY);

        // 如果云端存档和本地存档一致，则不需要处理
        if (currentLocalSave === saveDataStr) {
          console.log('[uTools存档管理器] 云端存档与本地存档一致，无需更新');
          return;
        }

        // 尝试验证存档数据是否有效（LZString 压缩数据检查）
        try {
          // 基本的长度检查，避免空或异常短的存档
          if (saveDataStr.length < 10) {
            console.warn('[uTools存档管理器] 存档数据异常短，可能已损坏');
            return;
          }
        } catch (validationError) {
          console.error('[uTools存档管理器] 存档验证失败:', validationError);
          return;
        }

        // 保存到localStorage
        localStorage.setItem(STORAGE_KEY, saveDataStr);
        this.saveData = saveDataStr;

        // 设置刷新保护标记，防止循环刷新
        sessionStorage.setItem('evolve_reload_guard', '1');

        console.log('[uTools存档管理器] 正在应用云端存档并刷新游戏...');
        window.location.reload();
      } catch (error) {
        console.error('[uTools存档管理器] 应用存档失败:', error);
        // 应用存档失败不应阻止游戏运行
        // 清除可能损坏的存档数据
        try {
          localStorage.removeItem(STORAGE_KEY);
          console.log('[uTools存档管理器] 已清除可能损坏的存档');
        } catch (clearError) {
          console.error('[uTools存档管理器] 清除存档失败:', clearError);
        }
      }
    },

    /**
     * 保存存档到uTools（带防抖）
     */
    saveToUTools(saveDataStr) {
      // 清除之前的定时器
      if (this.saveTimer) {
        clearTimeout(this.saveTimer);
      }

      // 设置新的定时器（1秒后保存）
      this.saveTimer = setTimeout(() => {
        this.doSave(saveDataStr);
      }, 1000);
    },

    /**
     * 执行保存到uTools
     */
    doSave(saveDataStr) {
      try {
        // 通知父页面保存到uTools
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'evolve-save-request',
            data: {
              saveData: saveDataStr,
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
  // 使用 setTimeout 确保不阻塞页面加载
  setTimeout(() => {
    try {
      UToolsSaveManager.init();
    } catch (e) {
      console.error('[uTools存档管理器] 初始化失败:', e);
      // 初始化失败不应影响游戏运行
    }
  }, 100);

})();
