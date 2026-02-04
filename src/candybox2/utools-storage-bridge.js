/**
 * Candy Box 2 - uTools 存档桥接器
 * 将游戏的 localStorage 操作桥接到 uTools 数据库，实现存档持久化
 * 与游戏列表存档管理系统完全集成
 */

(function() {
  'use strict';

  // 检查是否在 uTools 环境中
  const isUToolsEnv = typeof window !== 'undefined' && window.utools;

  if (!isUToolsEnv) {
    console.log('[存档桥接器] 不在 uTools 环境中，使用原生 localStorage');
    return;
  }

  console.log('[存档桥接器] uTools 存档桥接器已启动 - 游戏ID: candybox2');

  // 游戏ID和存档键名前缀 - 与存档管理器保持一致
  const GAME_ID = 'candybox2';
  const SAVE_PREFIX = 'game_save_' + GAME_ID + '_';

  // 原生 localStorage
  const originalLocalStorage = {
    getItem: localStorage.getItem.bind(localStorage),
    setItem: localStorage.setItem.bind(localStorage),
    removeItem: localStorage.removeItem.bind(localStorage),
    clear: localStorage.clear.bind(localStorage)
  };

  /**
   * 从 uTools 数据库读取存档
   */
  function loadFromUTools(key) {
    return new Promise((resolve, reject) => {
      window.utools.db.promises.get(SAVE_PREFIX + key)
        .then(data => {
          if (data && data.data) {
            console.log(`[存档桥接器] ✓ 从 uTools 加载存档: ${key}`);
            resolve(data.data);
          } else {
            resolve(null);
          }
        })
        .catch(err => {
          console.error(`[存档桥接器] ✗ 从 uTools 加载存档失败 (${key}):`, err);
          // 失败时回退到 localStorage
          resolve(originalLocalStorage.getItem(key));
        });
    });
  }

  /**
   * 将存档保存到 uTools 数据库
   */
  function saveToUTools(key, value) {
    return new Promise((resolve, reject) => {
      window.utools.db.promises.put({
        _id: SAVE_PREFIX + key,
        data: value,
        gameId: GAME_ID,
        updatedAt: Date.now()
      })
        .then(() => {
          console.log(`[存档桥接器] ✓ 存档已保存到 uTools: ${key}`);
          resolve(true);
        })
        .catch(err => {
          console.error(`[存档桥接器] ✗ 保存到 uTools 失败 (${key}):`, err);
          // 失败时回退到 localStorage
          originalLocalStorage.setItem(key, value);
          resolve(false);
        });
    });
  }

  /**
   * 从 uTools 删除存档
   */
  function removeFromUTools(key) {
    return new Promise((resolve, reject) => {
      window.utools.db.promises.remove(SAVE_PREFIX + key)
        .then(() => {
          console.log(`[存档桥接器] ✓ 从 uTools 删除存档: ${key}`);
          resolve(true);
        })
        .catch(err => {
          console.error(`[存档桥接器] ✗ 从 uTools 删除存档失败 (${key}):`, err);
          originalLocalStorage.removeItem(key);
          resolve(false);
        });
    });
  }

  // 桥接 localStorage 的所有方法
  const bridgeLocalStorage = {
    getItem: function(key) {
      try {
        // 先从 localStorage 读取（快速访问）
        const cached = originalLocalStorage.getItem(key);

        // 异步从 uTools 加载最新数据
        loadFromUTools(key).then(utoolsValue => {
          if (utoolsValue !== null && utoolsValue !== cached) {
            // uTools 中有更新的数据，更新 localStorage
            originalLocalStorage.setItem(key, utoolsValue);
            console.log(`[存档桥接器] 更新本地缓存: ${key}`);
            // 触发 storage 事件通知游戏
            window.dispatchEvent(new StorageEvent('storage', {
              key: key,
              newValue: utoolsValue,
              oldValue: cached,
              url: window.location.href
            }));
          }
        });

        return cached;
      } catch (err) {
        console.error('[存档桥接器] ✗ 读取存档失败，使用原生 localStorage:', err);
        return originalLocalStorage.getItem(key);
      }
    },

    setItem: function(key, value) {
      try {
        // 立即保存到 localStorage（保证性能）
        const oldValue = originalLocalStorage.getItem(key);
        originalLocalStorage.setItem(key, value);

        // 异步保存到 uTools
        saveToUTools(key, value).then(success => {
          if (success) {
            // 通知游戏列表更新存档信息
            notifySaveUpdate();
          }
        });
      } catch (err) {
        console.error('[存档桥接器] ✗ 保存存档失败，使用原生 localStorage:', err);
        originalLocalStorage.setItem(key, value);
      }
    },

    removeItem: function(key) {
      try {
        originalLocalStorage.removeItem(key);
        removeFromUTools(key).then(success => {
          if (success) {
            notifySaveUpdate();
          }
        });
      } catch (err) {
        console.error('[存档桥接器] ✗ 删除存档失败:', err);
        originalLocalStorage.removeItem(key);
      }
    },

    clear: function() {
      try {
        // 清除所有 Candy Box 2 相关的存档
        window.utools.db.promises.findAll(SAVE_PREFIX)
          .then(docs => {
            console.log(`[存档桥接器] 清除 ${docs.length} 个存档项`);
            return Promise.all(docs.map(doc =>
              window.utools.db.promises.remove(doc._id)
            ));
          })
          .then(() => {
            originalLocalStorage.clear();
            notifySaveUpdate();
          });
      } catch (err) {
        console.error('[存档桥接器] ✗ 清除存档失败:', err);
        originalLocalStorage.clear();
      }
    },

    get length() {
      return originalLocalStorage.length;
    },

    key: function(index) {
      return originalLocalStorage.key(index);
    }
  };

  /**
   * 通知游戏列表更新存档信息
   * 通过自定义事件通信
   */
  function notifySaveUpdate() {
    // 发送自定义事件通知主页更新存档状态
    window.dispatchEvent(new CustomEvent('candybox2-save-update', {
      detail: {
        gameId: GAME_ID,
        timestamp: Date.now()
      }
    }));
    console.log('[存档桥接器] 存档更新事件已发送');
  }

  /**
   * 暴露存档统计信息给外部
   */
  window.CandyBox2Storage = {
    getSaveStats: async function() {
      const docs = await window.utools.db.promises.findAll(SAVE_PREFIX);

      // 提取关键游戏数据
      const candyDoc = docs.find(d => d._id.includes('candy') && !d._id.includes('candiesEaten'));
      const lollipopDoc = docs.find(d => d._id.includes('lollipop'));

      return {
        total: docs.length,
        candy: candyDoc ? parseInt(candyDoc.data) || 0 : 0,
        lollipops: lollipopDoc ? parseInt(lollipopDoc.data) || 0 : 0,
        lastUpdate: docs.length > 0 ? Math.max(...docs.map(d => d.updatedAt || 0)) : null
      };
    },

    forceSave: async function() {
      console.log('[存档桥接器] 强制保存所有存档到 uTools...');
      let saveCount = 0;

      for (let i = 0; i < originalLocalStorage.length; i++) {
        const key = originalLocalStorage.key(i);
        const value = originalLocalStorage.getItem(key);
        if (key && value) {
          await saveToUTools(key, value);
          saveCount++;
        }
      }

      console.log(`[存档桥接器] 强制保存完成: ${saveCount} 个存档项`);
      return saveCount;
    }
  };

  // 替换全局 localStorage
  window.localStorage = bridgeLocalStorage;

  // 页面加载时自动从 uTools 恢复存档
  window.addEventListener('load', function() {
    console.log('[存档桥接器] 开始从 uTools 恢复存档...');

    window.utools.db.promises.findAll(SAVE_PREFIX)
      .then(docs => {
        console.log(`[存档桥接器] 找到 ${docs.length} 个存档项`);

        let restoreCount = 0;
        docs.forEach(doc => {
          const key = doc._id.replace(SAVE_PREFIX, '');
          originalLocalStorage.setItem(key, doc.data);
          console.log(`[存档桥接器] ✓ 恢复存档: ${key}`);
          restoreCount++;
        });

        if (restoreCount > 0) {
          console.log(`[存档桥接器] 存档恢复完成: ${restoreCount} 个项目`);

          // 通知游戏列表更新存档状态
          notifySaveUpdate();
        }
      })
      .catch(err => {
        console.error('[存档桥接器] ✗ 恢复存档失败:', err);
      });
  });

  // 页面卸载前保存存档到 uTools
  window.addEventListener('beforeunload', function() {
    console.log('[存档桥接器] 页面即将卸载，保存存档到 uTools...');

    // 同步保存关键存档
    for (let i = 0; i < originalLocalStorage.length; i++) {
      const key = originalLocalStorage.key(i);
      const value = originalLocalStorage.getItem(key);
      if (key && value) {
        // 不等待 Promise 完成，浏览器会在后台完成
        saveToUTools(key, value);
      }
    }
  });

  // 定期自动保存（每30秒）
  setInterval(() => {
    console.log('[存档桥接器] 执行定期自动保存...');
    window.CandyBox2Storage.forceSave();
  }, 30000);

  console.log('[存档桥接器] 存档桥接器初始化完成 ✓');

})();
