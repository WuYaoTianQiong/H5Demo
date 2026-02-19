/**
 * 通用安全返回工具
 * 解决 H5 环境下页面刷新后页面栈丢失的问题
 */

/**
 * 安全返回上一页
 * @param {Object} options - 配置选项
 * @param {string} options.fallbackUrl - 页面栈不足时的兜底跳转地址（默认首页）
 * @param {string} options.fallbackType - 兜底跳转类型：'redirectTo' | 'reLaunch' | 'switchTab'（默认 'redirectTo'）
 * @param {number} options.delta - navigateBack 的回退层数（默认 1）
 */
export function safeNavigateBack(options = {}) {
  const {
    fallbackUrl = '/pages/index/index',
    fallbackType = 'redirectTo',
    delta = 1
  } = options;

  // 检查页面栈
  const pages = getCurrentPages ? getCurrentPages() : [];

  if (pages && pages.length > 1) {
    // 页面栈正常，使用 navigateBack
    uni.$u.route({ type: 'navigateBack', delta });
    return;
  }

  // 页面栈不足，使用兜底跳转
  console.log('[safeNavigateBack] 页面栈不足，使用兜底跳转:', fallbackUrl);

  switch (fallbackType) {
    case 'redirectTo':
      uni.$u.route({ type: 'redirectTo', url: fallbackUrl });
      break;
    case 'reLaunch':
      uni.$u.route({ type: 'reLaunch', url: fallbackUrl });
      break;
    case 'switchTab':
    default:
      uni.$u.route({ type: 'switchTab', url: fallbackUrl });
      break;
  }
}

/**
 * 带来源页面的安全返回（用于 location-picker 等选择器页面）
 * @param {Object} options - 配置选项
 * @param {string} options.from - 来源页面路径（如 'pages/event/event'）
 * @param {Object} options.fromParams - 来源页面参数
 * @param {string} options.fallbackUrl - 兜底地址
 */
export function safeNavigateBackWithSource(options = {}) {
  const {
    from = '',
    fromParams = {},
    fallbackUrl = '/pages/index/index'
  } = options;

  const pages = getCurrentPages ? getCurrentPages() : [];

  if (pages && pages.length > 1) {
    uni.$u.route({ type: 'navigateBack' });
    return;
  }

  // 页面栈不足，根据来源跳转
  if (from) {
    const query = uni.$u.queryParams(fromParams);
    const url = `/${from}${query}`;
    uni.$u.route({ type: 'redirectTo', url });
  } else {
    uni.$u.route({ type: 'switchTab', url: fallbackUrl });
  }
}

export default {
  safeNavigateBack,
  safeNavigateBackWithSource
};
