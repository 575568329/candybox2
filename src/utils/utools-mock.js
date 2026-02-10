/**
 * uTools API 模拟器
 * 用于在非 uTools 环境（如标准浏览器）下运行项目
 */

const UTOOLS_DB_PREFIX = 'utools_db:';
const UTOOLS_STORAGE_PREFIX = 'utools_storage:';

const utoolsMock = {
  // 检查是否为模拟环境
  isMock: true,

  // 事件监听模拟
  onPluginEnter(callback) {
    console.log('[uTools-Mock] onPluginEnter 注册');
    // 模拟插件进入，延迟执行以模拟异步
    setTimeout(() => {
      callback({
        code: 'games',
        type: 'text',
        payload: ''
      });
    }, 100);
  },

  onPluginOut(callback) {
    console.log('[uTools-Mock] onPluginOut 注册');
    window.addEventListener('beforeunload', callback);
  },

  onPluginDetach(callback) {
    console.log('[uTools-Mock] onPluginDetach 注册');
  },

  // 用户信息模拟
  getUser() {
    return {
      nickname: 'Web用户',
      avatar: 'https://res.u-tools.cn/currentuseravatar.png'
    };
  },

  // 数据库存储模拟 (简单键值对)
  dbStorage: {
    setItem(key, value) {
      localStorage.setItem(UTOOLS_STORAGE_PREFIX + key, value);
    },
    getItem(key) {
      return localStorage.getItem(UTOOLS_STORAGE_PREFIX + key);
    },
    removeItem(key) {
      localStorage.removeItem(UTOOLS_STORAGE_PREFIX + key);
    }
  },

  // 数据库模拟 (类 PouchDB/CouchDB)
  db: {
    put(doc) {
      if (!doc._id) return { error: true, message: 'doc must have _id' };
      
      const key = UTOOLS_DB_PREFIX + doc._id;
      const existing = localStorage.getItem(key);
      const newDoc = { ...doc };
      
      if (existing) {
        const parsed = JSON.parse(existing);
        newDoc._rev = (parseInt(parsed._rev || '0') + 1).toString();
      } else {
        newDoc._rev = '1';
      }
      
      localStorage.setItem(key, JSON.stringify(newDoc));
      return { id: doc._id, rev: newDoc._rev, ok: true };
    },

    get(id) {
      const key = UTOOLS_DB_PREFIX + id;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    },

    remove(idOrDoc) {
      const id = typeof idOrDoc === 'string' ? idOrDoc : idOrDoc._id;
      const key = UTOOLS_DB_PREFIX + id;
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        return { id, rev: 'deleted', ok: true };
      }
      return { error: true, message: 'not found' };
    },

    allDocs(keyPrefix) {
      const docs = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(UTOOLS_DB_PREFIX)) {
          const id = key.substring(UTOOLS_DB_PREFIX.length);
          if (!keyPrefix || id.startsWith(keyPrefix)) {
            docs.push(JSON.parse(localStorage.getItem(key)));
          }
        }
      }
      return docs;
    },

    // 异步 API 模拟
    promises: {
      put: (doc) => Promise.resolve(utoolsMock.db.put(doc)),
      get: (id) => Promise.resolve(utoolsMock.db.get(id)),
      remove: (idOrDoc) => Promise.resolve(utoolsMock.db.remove(idOrDoc)),
      allDocs: (keyPrefix) => Promise.resolve(utoolsMock.db.allDocs(keyPrefix))
    }
  },

  // 其他常用 API 模拟
  showNotification(body) {
    console.log('[uTools-Mock] 通知:', body);
    alert(body);
  },

  shellOpenExternal(url) {
    window.open(url, '_blank');
  },

  hideMainWindow() {
    console.log('[uTools-Mock] 隐藏主窗口');
  },

  outPlugin() {
    console.log('[uTools-Mock] 退出插件');
  },

  copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
      console.log('[uTools-Mock] 已复制文本');
    });
  },

  // 模拟 ubrowser
  ubrowser: {
    goto(url) {
      console.log('[uTools-Mock] ubrowser goto:', url);
      return this;
    },
    run() {
      console.log('[uTools-Mock] ubrowser run');
      return Promise.resolve();
    }
  }
};

// 如果不在 uTools 环境中，则挂载模拟器
if (typeof window !== 'undefined' && !window.utools) {
  window.utools = utoolsMock;
  console.log('[uTools-Mock] 已在全局环境挂载 uTools 模拟器');
}

export default utoolsMock;
