/**
 * Candy Box 2 - uTools 存档桥接器
 * 将游戏的 localStorage 操作桥接到 uTools 数据库，实现存档持久化
 */

(function() {
  'use strict';

  // 检查是否在 uTools 环境中
  const isUToolsEnv = typeof window !== 'undefined' && window.utools;

  if (!isUToolsEnv) {
    console.log('不在 uTools 环境中，使用原生 localStorage');
    return;
  }

  console.log('uTools 存档桥接器已启动');

  // 原生 localStorage
  const originalLocalStorage = {
    getItem: localStorage.getItem.bind(localStorage),
    setItem: localStorage.setItem.bind(localStorage),
    removeItem: localStorage.removeItem.bind(localStorage),
    clear: localStorage.clear.bind(localStorage)
  };

  // 存档键名前缀
  const SAVE_PREFIX = 'candybox2_save_';

  /**
   * 从 uTools 数据库读取存档
   */
  function loadFromUTools(key) {
    return new Promise((resolve, reject) => {
      window.utools.db.promises.get(SAVE_PREFIX + key)
        .then(data => {
          if (data && data.data) {
            console.log(`从 uTools 加载存档: ${key}`);
            resolve(data.data);
          } else {
            resolve(null);
          }
        })
        .catch(err => {
          console.error(`从 uTools 加载存档失败 (${key}):`, err);
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
        updatedAt: Date.now()
      })
        .then(() => {
          console.log(`存档已保存到 uTools: ${key}`);
          resolve(true);
        })
        .catch(err => {
          console.error(`保存到 uTools 失败 (${key}):`, err);
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
          console.log(`从 uTools 删除存档: ${key}`);
          resolve(true);
        })
        .catch(err => {
          console.error(`从 uTools 删除存档失败 (${key}):`, err);
          originalLocalStorage.removeItem(key);
          resolve(false);
        });
    });
  }

  // 桥接 localStorage 的所有方法
  const bridgeLocalStorage = {
    getItem: function(key) {
      try {
        const result = loadFromUTools(key);
        // 同步返回，如果 uTools 还没加载完则返回缓存或 localStorage
        const cached = originalLocalStorage.getItem(key);
        return result !== null ? result : cached;
      } catch (err) {
        console.error('读取存档失败，使用原生 localStorage:', err);
        return originalLocalStorage.getItem(key);
      }
    },

    setItem: function(key, value) {
      try {
        // 先保存到 localStorage 作为备份
        originalLocalStorage.setItem(key, value);
        // 异步保存到 uTools
        saveToUTools(key, value);
      } catch (err) {
        console.error('保存存档失败，使用原生 localStorage:', err);
        originalLocalStorage.setItem(key, value);
      }
    },

    removeItem: function(key) {
      try {
        originalLocalStorage.removeItem(key);
        removeFromUTools(key);
      } catch (err) {
        console.error('删除存档失败:', err);
        originalLocalStorage.removeItem(key);
      }
    },

    clear: function() {
      try {
        // 清除所有 Candy Box 2 相关的存档
        window.utools.db.promises.findAll(SAVE_PREFIX)
          .then(docs => {
            docs.forEach(doc => {
              window.utools.db.promises.remove(doc._id);
            });
          });
        originalLocalStorage.clear();
      } catch (err) {
        console.error('清除存档失败:', err);
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

  // 替换全局 localStorage
  window.localStorage = bridgeLocalStorage;

  // 页面加载时自动从 uTools 恢复存档
  window.addEventListener('load', function() {
    console.log('开始从 uTools 恢复存档...');

    window.utools.db.promises.findAll(SAVE_PREFIX)
      .then(docs => {
        console.log(`找到 ${docs.length} 个存档`);
        docs.forEach(doc => {
          const key = doc._id.replace(SAVE_PREFIX, '');
          originalLocalStorage.setItem(key, doc.data);
          console.log(`恢复存档: ${key}`);
        });

        // 通知游戏重新加载存档
        setTimeout(() => {
          if (typeof window.location.reload === 'function') {
            console.log('存档恢复完成，刷新页面...');
            // window.location.reload();
          }
        }, 500);
      })
      .catch(err => {
        console.error('恢复存档失败:', err);
      });
  });

  // 页面卸载前保存存档到 uTools
  window.addEventListener('beforeunload', function() {
    console.log('页面即将卸载，保存存档到 uTools...');

    // 遍历 localStorage，将所有 Candy Box 2 相关的存档保存到 uTools
    for (let i = 0; i < originalLocalStorage.length; i++) {
      const key = originalLocalStorage.key(i);
      const value = originalLocalStorage.getItem(key);
      if (key && value) {
        saveToUTools(key, value);
      }
    }
  });

})();
