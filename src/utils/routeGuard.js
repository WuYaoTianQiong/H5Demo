/**
 * 路由守卫
 * 统一处理页面访问权限
 * 
 * 使用方式：
 * 1. 在需要登录的页面配置中添加: "needLogin": true
 * 2. 在 App.vue 中引入并调用 initRouteGuard()
 */

// 白名单页面（无需登录）
const WHITE_LIST = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/public/:id'
]

// 需要登录的页面（也可以在 pages.json 中配置 needLogin: true）
const AUTH_PAGES = [
  '/',
  '/trip/:id',
  '/trip/:id/schedule',
  '/trip/:tripId/event',
  '/profile',
  '/profile/edit'
]

// 检查是否需要登录
function needLogin(path) {
  // 去除参数
  const cleanPath = path.split('?')[0]
  
  // 白名单放行
  if (WHITE_LIST.some(page => cleanPath.includes(page))) {
    return false
  }
  
  // 特定页面需要登录
  if (AUTH_PAGES.some(page => cleanPath.includes(page))) {
    return true
  }
  
  // 默认需要登录（非白名单页面）
  return !WHITE_LIST.some(page => cleanPath.includes(page))
}

// 检查是否已登录
function isLoggedIn() {
  try {
    const token = uni.getStorageSync('token')
    return !!token
  } catch (e) {
    return false
  }
}

// 路由拦截器
let isNavigating = false

/**
 * 拦截页面跳转
 */
export function interceptNavigation() {
  // 拦截 uni.navigateTo
  const originalNavigateTo = uni.navigateTo
  uni.navigateTo = function(options) {
    if (checkAuth(options.url)) {
      return originalNavigateTo.call(uni, options)
    }
    return Promise.reject(new Error('需要登录'))
  }
  
  // 拦截 uni.redirectTo
  const originalRedirectTo = uni.redirectTo
  uni.redirectTo = function(options) {
    if (checkAuth(options.url)) {
      return originalRedirectTo.call(uni, options)
    }
    return Promise.reject(new Error('需要登录'))
  }
  
  // 拦截 uni.reLaunch
  const originalReLaunch = uni.reLaunch
  uni.reLaunch = function(options) {
    if (checkAuth(options.url)) {
      return originalReLaunch.call(uni, options)
    }
    return Promise.reject(new Error('需要登录'))
  }
  
  // 拦截 uni.switchTab
  const originalSwitchTab = uni.switchTab
  uni.switchTab = function(options) {
    if (checkAuth(options.url)) {
      return originalSwitchTab.call(uni, options)
    }
    return Promise.reject(new Error('需要登录'))
  }
}

/**
 * 检查权限
 * @param {string} url - 目标页面地址
 * @returns {boolean} - 是否允许访问
 */
export function checkAuth(url) {
  if (!url) return true
  
  // 如果不需要登录，直接放行
  if (!needLogin(url)) {
    return true
  }
  
  // 需要登录但未登录
  if (!isLoggedIn()) {
    // 保存目标页面，登录后跳转回来
    uni.setStorageSync('redirect_after_login', url)
    
    uni.showToast({
      title: '请先登录',
      icon: 'none',
      duration: 1500
    })
    
    // 延迟跳转登录页
    setTimeout(() => {
      uni.navigateTo({
        url: '/pages/login/login'
      })
    }, 1500)
    
    return false
  }
  
  return true
}

/**
 * 登录后跳转到之前保存的页面
 */
export function navigateAfterLogin() {
  const redirectUrl = uni.getStorageSync('redirect_after_login')
  uni.removeStorageSync('redirect_after_login')
  
  if (redirectUrl) {
    // 延迟跳转，确保登录成功提示已显示
    setTimeout(() => {
      uni.reLaunch({
        url: redirectUrl
      })
    }, 500)
  } else {
    // 默认跳转到首页
    setTimeout(() => {
      uni.switchTab({
        url: '/pages/index/index'
      })
    }, 500)
  }
}

/**
 * 初始化路由守卫
 * 在 App.vue 的 onLaunch 中调用
 */
export function initRouteGuard() {
  // 只在非登录状态下拦截
  if (!isLoggedIn()) {
    interceptNavigation()
  }
}

/**
 * 检查当前页面权限
 * 在页面 onLoad 中调用
 */
export function checkPageAuth() {
  const pages = getCurrentPages()
  if (pages.length === 0) return true
  
  const currentPage = pages[pages.length - 1]
  const route = currentPage.route || ''
  const path = '/' + route
  
  return checkAuth(path)
}

export default {
  initRouteGuard,
  checkAuth,
  checkPageAuth,
  navigateAfterLogin,
  needLogin
}
