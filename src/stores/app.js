import { defineStore } from 'pinia'
import { getItem, setItem, removeItem, getJSON, setJSON } from '@/utils/storage.js'

/**
 * App Store - 应用全局状态管理
 *
 * State:
 * - settings: 应用设置
 * - networkStatus: 网络状态
 * - systemInfo: 系统信息
 * - lastVisitedRoute: 最后访问的路由
 *
 * Actions:
 * - loadSettings: 加载设置
 * - saveSettings: 保存设置
 * - updateNetworkStatus: 更新网络状态
 */

const SETTINGS_KEY = 'app:settings'

// 默认设置
const DEFAULT_SETTINGS = {
  // 主题设置
  theme: 'light', // light | dark
  primaryColor: '#ff6b6b',

  // 通知设置
  enableNotification: true,
  enableSound: true,

  // 地图设置
  defaultMapType: 'standard', // standard | satellite
  showTraffic: false,

  // 缓存设置
  autoClearCache: true,
  cacheRetentionDays: 7,

  // 显示设置
  compactMode: false,
  showDistance: true,
  showProgress: true,

  // 隐私设置
  shareLocation: false
}

// 从 Storage 加载设置
function loadSettingsFromStorage() {
  try {
    const stored = getItem(SETTINGS_KEY)
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
    }
  } catch (e) {
    console.error('[AppStore] 加载设置失败:', e)
  }
  return { ...DEFAULT_SETTINGS }
}

export const useAppStore = defineStore('app', {
  state: () => ({
    // 应用设置
    settings: loadSettingsFromStorage(),

    // 网络状态
    networkStatus: {
      isConnected: true,
      networkType: 'wifi' // wifi | 4g | 3g | 2g | none
    },

    // 系统信息
    systemInfo: null,

    // 最后访问的路由（用于登录后跳转回来）
    lastVisitedRoute: '',

    // 应用状态
    isReady: false,
    isBackground: false,

    // 全局消息
    globalMessage: null
  }),

  getters: {
    // 是否深色模式
    isDarkMode: (state) => state.settings.theme === 'dark',

    // 是否在线
    isOnline: (state) => state.networkStatus.isConnected,

    // 是否 WiFi
    isWifi: (state) => state.networkStatus.networkType === 'wifi'
  },

  actions: {
    /**
     * 初始化应用
     */
    async initApp() {
      // 获取系统信息（Web 环境简化版）
      try {
        this.systemInfo = {
          platform: 'web',
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          language: navigator.language,
          version: navigator.userAgent
        }
      } catch (e) {
        console.error('[AppStore] 获取系统信息失败:', e)
      }

      // 监听网络状态
      this.watchNetworkStatus()

      // 应用就绪
      this.isReady = true

      return { success: true }
    },

    /**
     * 监听网络状态
     */
    watchNetworkStatus() {
      if (typeof window === 'undefined') return

      // 使用 Navigator.onLine API
      const updateNetworkStatus = () => {
        const isConnected = navigator.onLine
        this.networkStatus = {
          isConnected,
          networkType: isConnected ? 'wifi' : 'none'
        }

        if (!isConnected) {
          this.showGlobalMessage({
            type: 'warning',
            content: '网络已断开，部分功能可能无法使用'
          })
        }
      }

      window.addEventListener('online', updateNetworkStatus)
      window.addEventListener('offline', updateNetworkStatus)

      // 初始状态
      updateNetworkStatus()
    },

    /**
     * 更新设置
     * @param {Object} newSettings - 新设置
     */
    updateSettings(newSettings) {
      this.settings = { ...this.settings, ...newSettings }
      this.saveSettingsToStorage()
    },

    /**
     * 保存设置到 Storage
     */
    saveSettingsToStorage() {
      try {
        setItem(SETTINGS_KEY, JSON.stringify(this.settings))
      } catch (e) {
        console.error('[AppStore] 保存设置失败:', e)
      }
    },

    /**
     * 重置设置为默认
     */
    resetSettings() {
      this.settings = { ...DEFAULT_SETTINGS }
      this.saveSettingsToStorage()
    },

    /**
     * 设置最后访问的路由
     * @param {string} route - 路由路径
     */
    setLastVisitedRoute(route) {
      this.lastVisitedRoute = route
    },

    /**
     * 显示全局消息
     * @param {Object} message - { type, content, duration }
     */
    showGlobalMessage(message) {
      this.globalMessage = {
        ...message,
        id: Date.now()
      }

      // 自动清除
      if (message.duration !== 0) {
        setTimeout(() => {
          this.clearGlobalMessage()
        }, message.duration || 3000)
      }
    },

    /**
     * 清除全局消息
     */
    clearGlobalMessage() {
      this.globalMessage = null
    },

    /**
     * 应用进入后台
     */
    enterBackground() {
      this.isBackground = true
    },

    /**
     * 应用进入前台
     */
    enterForeground() {
      this.isBackground = false
    },

    /**
     * 清除缓存
     */
    clearCache() {
      // 清除 Storage 中的缓存数据（保留设置、token 等）
      const keysToKeep = [SETTINGS_KEY, 'token', 'userInfo']

      try {
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (!keysToKeep.includes(key) && !key.startsWith('api_cache_')) {
            removeItem(key)
          }
        })

        this.showGlobalMessage({
          type: 'success',
          content: '缓存已清除'
        })

        return { success: true }
      } catch (e) {
        return { success: false, error: e.message }
      }
    }
  }
})
