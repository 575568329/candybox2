// 处理外部链接，在用户默认浏览器中打开
(function() {
  'use strict';

  // 等待 DOM 加载完成
  function initExternalLinks() {
    // 查找所有外部链接
    const links = document.querySelectorAll('a[href]');

    links.forEach(function(link) {
      const href = link.getAttribute('href');

      // 检查是否是外部链接（http、https 或 faq.html）
      if (href && (href.startsWith('http://') || href.startsWith('https://') || href === 'faq.html')) {
        link.addEventListener('click', function(e) {
          e.preventDefault();

          // 构建完整 URL
          let url = href;
          if (href === 'faq.html') {
            // faq.html 是相对路径，需要转换为绝对路径
            url = window.location.origin + window.location.pathname.replace('index.html', '') + href;
          }

          // 在 uTools 环境中，使用 shellOpenExternal 在外部浏览器打开
          if (window.utools && window.utools.shellOpenExternal) {
            window.utools.shellOpenExternal(url);
          } else {
            // 不在 uTools 环境中，使用默认方式打开
            window.open(url, '_blank');
          }

          return false;
        });
      }
    });
  }

  // DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExternalLinks);
  } else {
    // DOM 已经加载完成
    initExternalLinks();
  }

  // 也监听动态内容加载
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length > 0) {
        initExternalLinks();
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
