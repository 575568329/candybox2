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
    console.log('[存档桥接器] 不在 uTools 环境中，启用 postMessage 通信模式');
    // 不 return，继续执行以启用 postMessage 通信
  } else {
    console.log('[存档桥接器] uTools 存档桥接器已启动 - 游戏ID: candybox2');
  }

  // 游戏ID和存档键名前缀 - 与存档管理器保持一致
  const GAME_ID = 'candybox2';
  const SAVE_PREFIX = 'game_save_' + GAME_ID + '_';

  // 数据验证配置
  const DATA_VALIDATION = {
    MAX_VALUE_SIZE: 100000, // 单个值最大 100KB
    MAX_KEY_LENGTH: 1000, // 键名最大长度
    ALLOWED_TYPES: ['string', 'number', 'boolean'] // 允许的数据类型
  };

  /**
   * 验证数据是否安全
   */
  function validateData(key, value) {
    // 验证键名
    if (typeof key !== 'string' || key.length > DATA_VALIDATION.MAX_KEY_LENGTH) {
      console.warn(`[存档桥接器] 键名验证失败: ${key}`);
      return false;
    }

    // 验证值
    if (value === null || value === undefined) {
      return true; // null/undefined 是允许的
    }

    // 验证值类型
    const valueType = typeof value;
    if (!DATA_VALIDATION.ALLOWED_TYPES.includes(valueType)) {
      console.warn(`[存档桥接器] 值类型验证失败: ${key}, 类型: ${valueType}`);
      return false;
    }

    // 验证字符串大小
    if (valueType === 'string' && value.length > DATA_VALIDATION.MAX_VALUE_SIZE) {
      console.warn(`[存档桥接器] 值大小验证失败: ${key}, 大小: ${value.length}`);
      return false;
    }

    return true;
  }

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
      const docId = SAVE_PREFIX + key;

      // 优先使用 promises API
      if (window.utools.db.promises && window.utools.db.promises.get) {
        window.utools.db.promises.get(docId)
          .then(data => {
            if (data && data.data) {
              // 验证数据
              if (validateData(key, data.data)) {
                console.log(`[存档桥接器] ✓ 从 uTools 加载存档: ${key}`);
                resolve(data.data);
              } else {
                console.error(`[存档桥接器] ✗ 数据验证失败，拒绝加载: ${key}`);
                resolve(null);
              }
            } else {
              resolve(null);
            }
          })
          .catch(err => {
            console.error(`[存档桥接器] ✗ 从 uTools 加载存档失败 (${key}):`, err);
            // 失败时回退到 localStorage
            resolve(originalLocalStorage.getItem(key));
          });
      } else {
        // 回退到同步 API
        try {
          const data = window.utools.db.get(docId);
          if (data && data.data) {
            // 验证数据
            if (validateData(key, data.data)) {
              console.log(`[存档桥接器] ✓ 从 uTools 加载存档: ${key}`);
              resolve(data.data);
            } else {
              console.error(`[存档桥接器] ✗ 数据验证失败，拒绝加载: ${key}`);
              resolve(null);
            }
          } else {
            resolve(null);
          }
        } catch (err) {
          console.error(`[存档桥接器] ✗ 从 uTools 加载存档失败 (${key}):`, err);
          resolve(originalLocalStorage.getItem(key));
        }
      }
    });
  }

  /**
   * 将存档保存到 uTools 数据库
   */
  function saveToUTools(key, value) {
    return new Promise((resolve, reject) => {
      const doc = {
        _id: SAVE_PREFIX + key,
        data: value,
        gameId: GAME_ID,
        updatedAt: Date.now()
      };

      // 优先使用 promises API
      if (window.utools.db.promises && window.utools.db.promises.put) {
        window.utools.db.promises.put(doc)
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
      } else {
        // 回退到同步 API
        try {
          const result = window.utools.db.put(doc);
          if (result.ok) {
            console.log(`[存档桥接器] ✓ 存档已保存到 uTools: ${key}`);
            resolve(true);
          } else {
            throw new Error(result.message);
          }
        } catch (err) {
          console.error(`[存档桥接器] ✗ 保存到 uTools 失败 (${key}):`, err);
          // 失败时回退到 localStorage
          originalLocalStorage.setItem(key, value);
          resolve(false);
        }
      }
    });
  }

  /**
   * 从 uTools 删除存档
   */
  function removeFromUTools(key) {
    return new Promise((resolve, reject) => {
      const docId = SAVE_PREFIX + key;

      // 优先使用 promises API
      if (window.utools.db.promises && window.utools.db.promises.remove) {
        window.utools.db.promises.remove(docId)
          .then(() => {
            console.log(`[存档桥接器] ✓ 从 uTools 删除存档: ${key}`);
            resolve(true);
          })
          .catch(err => {
            console.error(`[存档桥接器] ✗ 从 uTools 删除存档失败 (${key}):`, err);
            originalLocalStorage.removeItem(key);
            resolve(false);
          });
      } else {
        // 回退到同步 API
        try {
          const result = window.utools.db.remove(docId);
          if (result.ok) {
            console.log(`[存档桥接器] ✓ 从 uTools 删除存档: ${key}`);
            resolve(true);
          } else {
            throw new Error(result.message);
          }
        } catch (err) {
          console.error(`[存档桥接器] ✗ 从 uTools 删除存档失败 (${key}):`, err);
          originalLocalStorage.removeItem(key);
          resolve(false);
        }
      }
    });
  }

  // 仅在 uTools 环境中桥接 localStorage
  if (isUToolsEnv) {
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
        // 验证数据
        if (!validateData(key, value)) {
          console.error(`[存档桥接器] ✗ 数据验证失败，拒绝保存: ${key}`);
          throw new Error(`数据验证失败: ${key}`);
        }

        // 立即保存到 localStorage（保证性能）
        const oldValue = originalLocalStorage.getItem(key);
        originalLocalStorage.setItem(key, value);

        console.log(`[存档桥接器] setItem 调用: ${key} = ${value?.substring(0, 50)}${value?.length > 50 ? '...' : ''}`);

        // 同步保存到 uTools（确保数据不丢失）
        saveToUTools(key, value).then(success => {
          if (success) {
            console.log(`[存档桥接器] ✓ 已同步到 uTools: ${key}`);
            // 通知游戏列表更新存档信息
            notifySaveUpdate();
          } else {
            console.warn(`[存档桥接器] ✗ 同步到 uTools 失败: ${key}`);
          }
        }).catch(err => {
          console.error(`[存档桥接器] ✗ 同步到 uTools 异常: ${key}`, err);
        });
      } catch (err) {
        console.error('[存档桥接器] ✗ 保存存档失败，使用原生 localStorage:', err);
        // 即使验证失败也保存到 localStorage 作为降级方案
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
        // 获取所有文档
        const getAllDocs = () => {
          if (window.utools.db.promises && window.utools.db.promises.allDocs) {
            return window.utools.db.promises.allDocs(SAVE_PREFIX);
          }
          return Promise.resolve(window.utools.db.allDocs(SAVE_PREFIX));
        };

        // 删除文档
        const removeDoc = (docId) => {
          if (window.utools.db.promises && window.utools.db.promises.remove) {
            return window.utools.db.promises.remove(docId);
          }
          return new Promise((resolve, reject) => {
            const result = window.utools.db.remove(docId);
            if (result.ok) resolve(result);
            else reject(new Error(result.message));
          });
        };

        // 清除所有 Candy Box 2 相关的存档
        getAllDocs()
          .then(docs => {
            console.log(`[存档桥接器] 清除 ${docs.length} 个存档项`);
            return Promise.all(docs.map(doc => removeDoc(doc._id)));
          })
          .then(() => {
            originalLocalStorage.clear();
            notifySaveUpdate();
          })
          .catch(err => {
            console.error('[存档桥接器] ✗ 清除存档失败:', err);
            originalLocalStorage.clear();
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

    // 同时通过 postMessage 通知父窗口（游戏列表页面）
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'candybox2-save-updated',
        gameId: GAME_ID,
        timestamp: Date.now()
      }, window.location.origin);
      console.log('[存档桥接器] ✓ 存档更新通知已发送到父窗口');
    }
  }

  /**
   * 暴露存档统计信息给外部
   */
  window.CandyBox2Storage = {
    getSaveStats: async function() {
      // 获取所有文档
      const docs = window.utools.db.promises && window.utools.db.promises.allDocs
        ? await window.utools.db.promises.allDocs(SAVE_PREFIX)
        : window.utools.db.allDocs(SAVE_PREFIX);

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
      console.log('[存档桥接器] ========== 开始强制保存所有存档到 uTools ==========');

      const keys = [];
      for (let i = 0; i < originalLocalStorage.length; i++) {
        keys.push(originalLocalStorage.key(i));
      }

      console.log(`[存档桥接器] 发现 ${keys.length} 个 localStorage 键:`, keys);

      let successCount = 0;
      let failCount = 0;

      for (const key of keys) {
        const value = originalLocalStorage.getItem(key);
        if (key && value !== null && value !== undefined) {
          try {
            // 验证数据
            if (!validateData(key, value)) {
              console.warn(`[存档桥接器] ⚠ 跳过验证失败的数据: ${key}`);
              failCount++;
              continue;
            }

            const success = await saveToUTools(key, value);
            if (success) {
              successCount++;
              console.log(`[存档桥接器] ✓ 保存成功: ${key}`);
            } else {
              failCount++;
              console.warn(`[存档桥接器] ✗ 保存失败: ${key}`);
            }
          } catch (err) {
            failCount++;
            console.error(`[存档桥接器] ✗ 保存异常: ${key}`, err);
          }
        }
      }

      console.log(`[存档桥接器] ========== 强制保存完成: 成功 ${successCount} 个, 失败 ${failCount} 个 ==========`);

      // 通知游戏列表更新存档信息
      notifySaveUpdate();

      return { successCount, failCount, total: keys.length };
    }
  };

  // 替换全局 localStorage
  window.localStorage = bridgeLocalStorage;

  // 页面加载时自动从 uTools 恢复存档
  window.addEventListener('load', function() {
    console.log('[存档桥接器] 开始从 uTools 恢复存档...');

    // 获取所有文档
    const getAllDocs = () => {
      if (window.utools.db.promises && window.utools.db.promises.allDocs) {
        return window.utools.db.promises.allDocs(SAVE_PREFIX);
      }
      return Promise.resolve(window.utools.db.allDocs(SAVE_PREFIX));
    };

    getAllDocs()
      .then(docs => {
        console.log(`[存档桥接器] 找到 ${docs.length} 个存档项`);

        let restoreCount = 0;
        docs.forEach(doc => {
          const key = doc._id.replace(SAVE_PREFIX, '');

          // 验证数据
          if (validateData(key, doc.data)) {
            originalLocalStorage.setItem(key, doc.data);
            console.log(`[存档桥接器] ✓ 恢复存档: ${key}`);
            restoreCount++;
          } else {
            console.warn(`[存档桥接器] ⚠ 跳过无效存档: ${key}`);
          }
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
    console.log('[存档桥接器] ========== 页面即将卸载，保存所有存档到 uTools ==========');

    // 同步保存所有存档
    for (let i = 0; i < originalLocalStorage.length; i++) {
      const key = originalLocalStorage.key(i);
      const value = originalLocalStorage.getItem(key);
      if (key && value) {
        // 不等待 Promise 完成，浏览器会在后台完成
        saveToUTools(key, value);
        console.log(`[存档桥接器] 触发保存: ${key}`);
      }
    }
  });

  // 定期自动保存（每60秒 - 降低频率以优化性能）
  console.log('[存档桥接器] 设置定期自动保存（每60秒）');
  setInterval(() => {
    console.log('[存档桥接器] ========== 执行定期自动保存 ==========');
    window.CandyBox2Storage.forceSave().then(result => {
      console.log('[存档桥接器] 定期保存结果:', result);
    }).catch(err => {
      console.error('[存档桥接器] 定期保存失败:', err);
    });
  }, 60000); // 从15秒改为60秒

  // 智能保存：监听存档键的变化，在游戏保存后触发完整同步
  let saveSyncTimer = null;
  const SYNC_DELAY = 3000; // 游戏保存后3秒触发完整同步（增加延迟以合并多次保存）
  let lastSyncTime = 0;
  const MIN_SYNC_INTERVAL = 5000; // 两次同步最少间隔5秒

  // 监听特定的存档键
  const saveKeys = ['save', 'slot', 'gameCandies', 'gameLollipops'];

  // 包装原始 setItem 以检测游戏保存
  const originalSetItem = bridgeLocalStorage.setItem;
  bridgeLocalStorage.setItem = function(key, value) {
    // 调用原始方法
    const result = originalSetItem.call(this, key, value);

    // 检查是否是存档相关的键
    const isSaveKey = saveKeys.some(saveKey => key.includes(saveKey));

    if (isSaveKey) {
      console.log(`[存档桥接器] 检测到存档键变化: ${key}，准备同步所有数据...`);

      // 清除之前的定时器
      if (saveSyncTimer) {
        clearTimeout(saveSyncTimer);
      }

      // 检查距离上次同步的时间，避免过于频繁
      const now = Date.now();
      const timeSinceLastSync = now - lastSyncTime;

      // 设置新的定时器
      saveSyncTimer = setTimeout(() => {
        // 再次检查时间间隔
        if (Date.now() - lastSyncTime >= MIN_SYNC_INTERVAL) {
          console.log('[存档桥接器] 触发完整存档同步...');
          lastSyncTime = Date.now();

          window.CandyBox2Storage.forceSave().then(result => {
            console.log('[存档桥接器] ✓ 完整同步完成:', result);
          }).catch(err => {
            console.error('[存档桥接器] ✗ 完整同步失败:', err);
          });
        } else {
          console.log('[存档桥接器] 跳过同步，距离上次同步时间过短');
        }
      }, SYNC_DELAY);
    }

    return result;
  };
  } // 结束 if (isUToolsEnv)

  // ====== 以下代码在 uTools 和非 uTools 环境中都会运行 ======

  // 监听来自主页面的存档请求（支持非 uTools 环境）
  window.addEventListener('message', function(event) {
    // 仅处理来自同源的请求
    if (event.source !== window.parent) return;

    if (event.data && event.data.type === 'candybox2-request-save') {
      console.log('[存档桥接器] 收到保存请求，触发游戏保存功能...');

      // 定义尝试保存的函数
      const attemptSave = (attemptCount = 0, maxAttempts = 10) => {
        try {
          console.log(`[存档桥接器] 尝试保存 (${attemptCount + 1}/${maxAttempts})...`);

          // 检查游戏保存系统是否可用
          const hasSaving = typeof window.Saving !== 'undefined';
          const hasSaveFunc = hasSaving && typeof window.Saving.save === 'function';

          console.log('[存档桥接器] 检查游戏系统:', {
            hasSaving,
            hasSaveFunc,
            hasGetGame: typeof window.getGame === 'function',
            hasMain: typeof window.Main !== 'undefined'
          });

          if (!hasSaving || !hasSaveFunc) {
            // 游戏系统未就绪，等待后重试
            if (attemptCount < maxAttempts - 1) {
              console.warn('[存档桥接器] 游戏保存系统未就绪，1秒后重试...');
              setTimeout(() => attemptSave(attemptCount + 1, maxAttempts), 1000);
              return;
            } else {
              console.error('[存档桥接器] 达到最大重试次数，保存失败');
              window.parent.postMessage({
                type: 'candybox2-save-completed',
                success: false,
                error: '游戏保存系统未就绪'
              }, window.location.origin);
              return;
            }
          }

          // 获取游戏实例
          const game = typeof window.getGame === 'function' ? window.getGame() :
                      (typeof window.Main !== 'undefined' && typeof window.Main.getGame === 'function')
                        ? window.Main.getGame() : null;

          console.log('[存档桥接器] 游戏实例:', game);

          if (!game) {
            // 游戏实例未找到，等待后重试
            if (attemptCount < maxAttempts - 1) {
              console.warn('[存档桥接器] 游戏实例未找到，1秒后重试...');
              setTimeout(() => attemptSave(attemptCount + 1, maxAttempts), 1000);
              return;
            } else {
              console.error('[存档桥接器] 达到最大重试次数，游戏实例仍未找到');
              window.parent.postMessage({
                type: 'candybox2-save-completed',
                success: false,
                error: '游戏实例未找到'
              }, window.location.origin);
              return;
            }
          }

          // 获取当前槽位（从 localStorage 或使用默认槽位1）
          let currentSlot = 1;
          try {
            currentSlot = window.Saving.loadNumber ? window.Saving.loadNumber('currentSlot') || 1 : 1;
          } catch (e) {
            console.warn('[存档桥接器] 无法读取 currentSlot，使用默认槽位 1');
          }

          const slotName = 'slot' + currentSlot;

          console.log('[存档桥接器] 开始保存游戏到槽位:', slotName);

          // 调用游戏的保存函数
          // MainLoadingType.LOCAL = 0
          window.Saving.save(game, 0, slotName);

          console.log('[存档桥接器] ✓ 游戏已保存到槽位:', slotName);

          // 等待一小段时间确保保存完成
          setTimeout(() => {
            // 发送保存成功响应
            window.parent.postMessage({
              type: 'candybox2-save-completed',
              success: true,
              slotNum: currentSlot,
              slotName: slotName
            }, window.location.origin);
          }, 200);

        } catch (error) {
          console.error('[存档桥接器] 保存失败:', error);
          window.parent.postMessage({
            type: 'candybox2-save-completed',
            success: false,
            error: error.message
          }, window.location.origin);
        }
      };

      // 开始尝试保存
      attemptSave();
    } else if (event.data && event.data.type === 'candybox2-get-save-data') {
      console.log('[存档桥接器] 收到存档请求，收集 localStorage 数据...');

      // 收集所有 localStorage 数据（保持原始格式）
      const saveData = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        if (key && value) {
          // 直接保存原始值，不进行 JSON.parse
          saveData[key] = value;
        }
      }

      console.log('[存档桥接器] 发送存档数据:', Object.keys(saveData));

      // 发送存档数据给父页面
      window.parent.postMessage({
        type: 'candybox2-save-data',
        data: saveData
      }, window.location.origin);
    } else if (event.data && event.data.type === 'candybox2-set-save-data') {
      console.log('[存档桥接器] 收到导入存档请求，写入 localStorage...');

      const data = event.data.data;
      if (!data || typeof data !== 'object') {
        console.error('[存档桥接器] 存档数据格式不正确');
        window.parent.postMessage({
          type: 'candybox2-save-data-set',
          success: false
        }, window.location.origin);
        return;
      }

      try {
        // 先清空当前 localStorage
        localStorage.clear();

        // 写入新的存档数据（保持原始值，不进行 JSON.stringify）
        let writeCount = 0;
        let skipCount = 0;
        for (const [key, value] of Object.entries(data)) {
          // 验证数据
          if (validateData(key, value)) {
            localStorage.setItem(key, value);
            writeCount++;
          } else {
            console.warn(`[存档桥接器] ⚠ 跳过无效数据: ${key}`);
            skipCount++;
          }
        }

        if (skipCount > 0) {
          console.warn(`[存档桥接器] ⚠ 跳过了 ${skipCount} 个无效数据项`);
        }

        console.log(`[存档桥接器] ✓ 成功写入 ${writeCount} 个存档项`);

        // 发送成功响应
        window.parent.postMessage({
          type: 'candybox2-save-data-set',
          success: true,
          count: writeCount
        }, window.location.origin);
      } catch (error) {
        console.error('[存档桥接器] 写入存档失败:', error);
        window.parent.postMessage({
          type: 'candybox2-save-data-set',
          success: false,
          error: error.message
        }, window.location.origin);
      }
    } else if (event.data && event.data.type === 'candybox2-save-to-slot') {
      console.log('[存档桥接器] 收到保存到槽位请求:', event.data.slotNum);

      const slotNum = event.data.slotNum;
      const slotName = `slot${slotNum}`;

      try {
        // 检查游戏保存系统是否可用
        console.log('[存档桥接器] 检查游戏系统:', {
          hasSaving: typeof window.Saving !== 'undefined',
          hasSaveFunc: typeof window.Saving?.save === 'function',
          hasGetGame: typeof window.getGame === 'function',
          hasMain: typeof window.Main !== 'undefined'
        });

        // 方法1: 尝试使用游戏的保存系统
        if (typeof window.Saving !== 'undefined' && typeof window.Saving.save === 'function') {
          // 获取游戏实例
          const game = typeof window.getGame === 'function' ? window.getGame() :
                      (typeof window.Main !== 'undefined' ? window.Main.getGame() : null);

          console.log('[存档桥接器] 游戏实例:', game);

          if (game) {
            // 使用游戏的保存系统
            window.Saving.save(game, 0, slotName);
            console.log(`[存档桥接器] ✓ 已通过游戏API保存到槽位 ${slotName}`);
          }
        }

        // 方法2: 手动保存当前状态到localStorage（作为备份或替代方案）
        console.log('[存档桥接器] 手动保存游戏状态到localStorage...');

        // 保存时间戳
        const timestamp = Date.now();
        localStorage.setItem(slotName, timestamp.toString());

        // 如果游戏系统存在，保存所有游戏数据
        if (typeof window.Saving !== 'undefined') {
          // 保存所有bool值
          if (typeof window.Saving.getAllBools === 'function') {
            const bools = window.Saving.getAllBools();
            for (const key in bools) {
              const value = window.Saving.loadBool(key);
              localStorage.setItem(slotName + '.' + key, value ? 'true' : 'false');
            }
            console.log('[存档桥接器] 保存了', Object.keys(bools).length, '个bool值');
          }

          // 保存所有number值
          if (typeof window.Saving.getAllNumbers === 'function') {
            const numbers = window.Saving.getAllNumbers();
            for (const key in numbers) {
              const value = window.Saving.loadNumber(key);
              localStorage.setItem(slotName + '.' + key, value.toString());
            }
            console.log('[存档桥接器] 保存了', Object.keys(numbers).length, '个number值');
          }

          // 保存所有string值
          if (typeof window.Saving.getAllStrings === 'function') {
            const strings = window.Saving.getAllStrings();
            for (const key in strings) {
              const value = window.Saving.loadString(key);
              localStorage.setItem(slotName + '.' + key, value);
            }
            console.log('[存档桥接器] 保存了', Object.keys(strings).length, '个string值');
          }
        }

        console.log(`[存档桥接器] ✓ 保存完成到槽位 ${slotNum}`);

        // 发送成功响应
        window.parent.postMessage({
          type: 'candybox2-saved',
          success: true,
          slotNum: slotNum
        }, window.location.origin);
      } catch (error) {
        console.error('[存档桥接器] 保存到槽位失败:', error);
        window.parent.postMessage({
          type: 'candybox2-saved',
          success: false,
          error: error.message
        }, window.location.origin);
      }
    } else if (event.data && event.data.type === 'candybox2-load-slot') {
      console.log('[存档桥接器] 收到加载槽位请求:', event.data.slotNum);

      const slotNum = event.data.slotNum;
      const slotPrefix = `slot${slotNum}.`;

      try {
        // 读取该槽位的所有数据
        const slotData = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(slotPrefix)) {
            const dataKey = key.replace(slotPrefix, '');
            slotData[dataKey] = localStorage.getItem(key);
          }
        }

        console.log('[存档桥接器] 槽位数据:', Object.keys(slotData).length, '项');

        // 调用游戏的加载函数（如果存在）
        if (typeof window.LocalSaving !== 'undefined' && window.LocalSaving.load) {
          // 临时存储当前槽位数据
          const originalLoad = window.LocalSaving.load;

          // 修改游戏状态以加载指定槽位
          if (window.Saving) {
            // 将槽位数据加载到游戏状态中
            for (const [key, value] of Object.entries(slotData)) {
              if (typeof window.Saving.getAllBools === 'function' && key in window.Saving.getAllBools()) {
                window.Saving[key] = value === 'true';
              } else if (typeof window.Saving.getAllNumbers === 'function' && key in window.Saving.getAllNumbers()) {
                window.Saving[key] = parseFloat(value) || 0;
              }
            }
          }

          // 刷新游戏显示
          if (typeof window.updateGame === 'function') {
            window.updateGame();
          }

          console.log('[存档桥接器] ✓ 槽位加载完成');
        } else {
          console.warn('[存档桥接器] 游戏存档系统未就绪，尝试刷新页面');
          // 如果游戏未加载完成，刷新页面
          window.location.reload();
        }
      } catch (error) {
        console.error('[存档桥接器] 加载槽位失败:', error);
      }
    } else if (event.data && event.data.type === 'candybox2-delete-slot') {
      console.log('[存档桥接器] 收到删除槽位请求:', event.data.slotNum);

      const slotNum = event.data.slotNum;
      const slotPrefix = `slot${slotNum}.`;

      try {
        let deleteCount = 0;

        // 删除该槽位的所有数据
        const keysToDelete = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(slotPrefix)) {
            keysToDelete.push(key);
          }
        }

        keysToDelete.forEach(key => {
          localStorage.removeItem(key);
          deleteCount++;
        });

        console.log(`[存档桥接器] ✓ 删除槽位 ${slotNum} 的 ${deleteCount} 个数据项`);

        // 发送成功响应
        window.parent.postMessage({
          type: 'candybox2-slot-deleted',
          success: true,
          slotNum: slotNum,
          count: deleteCount
        }, window.location.origin);
      } catch (error) {
        console.error('[存档桥接器] 删除槽位失败:', error);
        window.parent.postMessage({
          type: 'candybox2-slot-deleted',
          success: false,
          error: error.message
        }, window.location.origin);
      }
    }
  });

  console.log('[存档桥接器] 存档桥接器初始化完成 ✓');

})();
