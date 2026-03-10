/**
 * uTools云存档适配器 - 环形之路专用
 * 自动将游戏存档同步到uTools云存储，实现跨设备存档同步
 *
 * 设计原则：存档功能失败不应影响游戏正常运行
 */

(function() {
  'use strict';

  // 游戏ID
  const GAME_ID = 'circlepath';

  /**
   * uTools存档管理器
   */
  const UToolsSaveManager = {
    isInitialized: false,
    saveTimer: null,
    isLoadingSave: false,  // 防止重复加载存档

    /**
     * 初始化
     */
    init() {
      if (this.isInitialized) return;

      try {
        // 监听来自父页面的消息
        window.addEventListener('message', this.handleMessage.bind(this));

        // 监听窗口关闭事件，确保关闭前保存存档
        window.addEventListener('beforeunload', () => {
          try {
            this.flushSave();
          } catch (e) {
            // 忽略保存错误，不影响游戏关闭
          }
        });

        // 延迟请求存档，确保游戏已启动
        setTimeout(() => {
          this.requestLoadFromUTools();
        }, 1000);

        this.isInitialized = true;
        console.log('[uTools存档管理器] 初始化成功');
      } catch (error) {
        console.error('[uTools存档管理器] 初始化失败:', error);
        // 即使初始化失败，也不应阻止游戏运行
      }
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
          case 'circlepath-load-save-response':
            // 父页面返回存档数据
            if (data && !this.isLoadingSave) {
              console.log('[uTools存档管理器] 收到存档数据');
              this.applySaveData(data);
            }
            break;

          case 'circlepath-save-response':
            // 保存确认（静默处理）
            break;

          case 'get-save-data':
            // 存档管理器请求获取存档数据（通用接口）
            this.sendAllSaveData();
            break;

          case 'set-save-data':
            // 存档管理器请求设置存档数据（通用接口）
            if (data) {
              this.setAllSaveData(data);
            }
            break;

          case 'CHANGE_MAP':
            // 切换地图消息（游戏原有功能）
            // 这个消息已经在 game.js 中处理，这里不需要重复处理
            break;
        }
      } catch (error) {
        console.error('[uTools存档管理器] 处理消息失败:', error);
      }
    },

    /**
     * 发送所有存档数据（供存档管理器使用）
     */
    sendAllSaveData() {
      try {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          data[key] = localStorage.getItem(key);
        }

        console.log('[uTools存档管理器] 发送存档数据，键数量:', Object.keys(data).length);

        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'save-data',
            data: data
          }, '*');
        }
      } catch (error) {
        console.error('[uTools存档管理器] 发送存档数据失败:', error);
      }
    },

    /**
     * 设置所有存档数据（供存档管理器使用）
     */
    setAllSaveData(data) {
      try {
        for (const key in data) {
          try {
            localStorage.setItem(key, data[key]);
          } catch (e) {
            console.error('[uTools存档管理器] 设置键失败:', key, e);
          }
        }

        console.log('[uTools存档管理器] 已设置存档数据，键数量:', Object.keys(data).length);

        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'save-data-set',
            success: true
          }, '*');
        }

        // 刷新游戏以应用新存档
        setTimeout(() => {
          window.location.reload();
        }, 100);
      } catch (e) {
        console.error('[uTools存档管理器] 设置存档数据失败:', e);
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'save-data-set',
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
          type: 'circlepath-load-save-request'
        }, '*');
      }
    },

    /**
     * 应用存档数据到游戏
     */
    applySaveData(data) {
      try {
        if (!data) return;

        // 防止重复加载
        if (this.isLoadingSave) {
          console.log('[uTools存档管理器] 正在加载存档，跳过重复请求');
          return;
        }

        this.isLoadingSave = true;

        // 检查当前 localStorage 是否已经有存档
        const currentLocalSave = localStorage.getItem('circlepath');

        // 遍历云端数据，应用到本地
        let needsReload = false;
        for (const key in data) {
          const cloudValue = data[key];
          const localValue = localStorage.getItem(key);

          // 如果云端数据和本地数据不同，则更新
          if (cloudValue !== localValue) {
            try {
              localStorage.setItem(key, cloudValue);
              needsReload = true;
            } catch (e) {
              console.error('[uTools存档管理器] 设置键失败:', key, e);
            }
          }
        }

        if (needsReload && currentLocalSave !== data.circlepath) {
          console.log('[uTools存档管理器] 正在应用云端存档并刷新游戏...');
          // 使用 reloadGuard 标记防止循环刷新
          const reloadFlag = sessionStorage.getItem('circlepath_reload_guard');
          if (!reloadFlag) {
            sessionStorage.setItem('circlepath_reload_guard', '1');
            window.location.reload();
          } else {
            sessionStorage.removeItem('circlepath_reload_guard');
            console.log('[uTools存档管理器] 检测到循环刷新，已取消');
          }
        } else {
          console.log('[uTools存档管理器] 云端存档与本地存档一致，无需更新');
        }

        this.isLoadingSave = false;
      } catch (error) {
        console.error('[uTools存档管理器] 应用存档失败:', error);
        this.isLoadingSave = false;
      }
    },

    /**
     * 保存存档到uTools（带防抖）
     */
    saveToUTools() {
      // 清除之前的定时器
      if (this.saveTimer) {
        clearTimeout(this.saveTimer);
      }

      // 设置新的定时器（1秒后保存）
      this.saveTimer = setTimeout(() => {
        this.doSave();
      }, 1000);
    },

    /**
     * 执行保存到uTools
     */
    doSave() {
      try {
        // 收集所有存档数据
        const saveData = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          saveData[key] = localStorage.getItem(key);
        }

        // 通知父页面保存到uTools
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'circlepath-save-request',
            data: {
              saveData: saveData,
              timestamp: Date.now()
            }
          }, '*');
        }

        console.log('[uTools存档管理器] 存档已同步');
      } catch (error) {
        console.error('[uTools存档管理器] 保存失败:', error);
        // 保存失败不应影响游戏运行
      }
    },

    /**
     * 立即刷新保存（不防抖）
     */
    flushSave() {
      if (this.saveTimer) {
        clearTimeout(this.saveTimer);
        this.saveTimer = null;
      }
      try {
        this.doSave();
      } catch (e) {
        // 忽略错误，不影响游戏关闭
      }
    }
  };

  // 暴露到全局
  window.UToolsSaveManager = UToolsSaveManager;

  // 拦截 localStorage.setItem，自动同步到 uTools
  // 使用 try-catch 确保拦截失败不影响游戏
  try {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
      // 调用原始方法
      try {
        const result = originalSetItem.call(this, key, value);

        // 如果是游戏相关的 key，自动同步到 uTools
        if ((key === 'circlepath' || key === 'circlepath_mapIndex') &&
            window.UToolsSaveManager && window.UToolsSaveManager.isInitialized) {
          window.UToolsSaveManager.saveToUTools();
        }

        return result;
      } catch (e) {
        // 如果同步失败，至少保证 localStorage.setItem 成功
        console.error('[uTools存档管理器] 同步失败:', e);
        return originalSetItem.call(this, key, value);
      }
    };
  } catch (e) {
    console.error('[uTools存档管理器] 拦截 localStorage.setItem 失败:', e);
  }

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
