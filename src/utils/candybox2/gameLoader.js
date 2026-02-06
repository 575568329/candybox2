/**
 * 糖果盒子2游戏加载器
 * 负责正确初始化游戏，解决类定义顺序问题
 */

// 等待所有脚本加载完成的标志
window.__candybox2_loaded__ = false;

// 保存原始的game实例
window.__candybox2_game__ = null;

// 原始的游戏启动函数会在脚本加载完成后自动调用
// 我们需要拦截它并保存game实例

// 重写documentIsReady函数，延迟执行直到DOM完全准备好
const originalStart = window.start;

window.start = function() {
  console.log('糖果盒子2: 开始初始化游戏...');

  try {
    // 调用原始的start函数
    const result = originalStart.apply(this, arguments);

    // 等待游戏实例创建
    setTimeout(() => {
      // game实例会在start函数中创建并赋值给全局变量
      if (typeof game !== 'undefined') {
        window.__candybox2_game__ = game;
        console.log('糖果盒子2: 游戏实例已创建');

        // 触发自定义事件，通知Vue组件游戏已就绪
        const event = new CustomEvent('candybox2-ready', {
          detail: { game: game }
        });
        window.dispatchEvent(event);
      } else {
        console.error('糖果盒子2: 游戏实例创建失败');
      }
    }, 100);

    return result;
  } catch (error) {
    console.error('糖果盒子2: 初始化失败', error);
    throw error;
  }
};

// 导出工具函数
window.CandyBox2Loader = {
  // 获取游戏实例
  getGame: function() {
    return window.__candybox2_game__;
  },

  // 检查游戏是否已加载
  isLoaded: function() {
    return window.__candybox2_loaded__ || typeof window.game !== 'undefined';
  },

  // 监听游戏就绪事件
  onReady: function(callback) {
    if (this.isLoaded() && window.__candybox2_game__) {
      callback(window.__candybox2_game__);
    } else {
      window.addEventListener('candybox2-ready', function(e) {
        callback(e.detail.game);
      });
    }
  }
};
