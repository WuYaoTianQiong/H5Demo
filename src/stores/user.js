import { defineStore } from 'pinia'
import { authApi } from '@/services/api.js'
import { getItem, setItem, removeItem, getJSON, setJSON } from '@/utils/storage.js'

/**
 * User Store - 用户状态管理
 *
 * State:
 * - token: 登录令牌
 * - userInfo: 用户信息
 * - isLoggedIn: 登录状态
 * - permissions: 权限列表
 *
 * Actions:
 * - login: 登录
 * - logout: 登出
 * - fetchUserInfo: 获取用户信息
 * - updateProfile: 更新资料
 */

const TOKEN_KEY = 'token'
const USER_INFO_KEY = 'userInfo'
const REMEMBER_ME_KEY = 'rememberMe'

// 从 Storage 恢复状态
function getInitialState() {
  let token = ''
  let userInfo = null

  try {
    token = getItem(TOKEN_KEY) || ''
    const storedUser = getJSON(USER_INFO_KEY)
    if (storedUser) {
      userInfo = storedUser
    }


  } catch (e) {
    console.error('[UserStore] 从 Storage 恢复失败:', e)
  }

  return {
    token,
    userInfo,
    isLoggedIn: !!token,
    loading: false,
    error: null
  }
}

export const useUserStore = defineStore('user', {
  state: () => getInitialState(),

  getters: {
    // 用户ID
    userId: (state) => state.userInfo?.id || '',

    // 用户名
    username: (state) => state.userInfo?.username || '',

    // 头像
    avatar: (state) => state.userInfo?.avatar || '',

    // 邮箱
    email: (state) => state.userInfo?.email || '',

    // 是否已认证邮箱
    isEmailVerified: (state) => state.userInfo?.emailVerified || false
  },

  actions: {
    async login(credentials) {
      this.loading = true
      this.error = null

      try {
        const response = await authApi.login(credentials)

        const token = response?.token
        const user = response?.user

        if (token) {
          this.token = token
          this.userInfo = user || null
          this.isLoggedIn = true

          setItem(TOKEN_KEY, token)
          if (user) {
            setJSON(USER_INFO_KEY, user)
          }

          if (credentials.rememberMe) {
            setItem(REMEMBER_ME_KEY, 'true')
            setItem('savedEmail', credentials.email)
          } else {
            removeItem(REMEMBER_ME_KEY)
            removeItem('savedEmail')
          }

          return { success: true }
        } else {
          throw new Error('登录失败：未返回令牌')
        }
      } catch (error) {
        this.error = error.message || '登录失败'
        console.error('[UserStore] Login error:', error)
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },

    async logout() {
      try {
        await authApi.logout()
      } catch (e) {
        console.warn('[UserStore] 登出请求失败:', e)
      }

      this.token = ''
      this.userInfo = null
      this.isLoggedIn = false
      this.error = null

      removeItem(TOKEN_KEY)
      removeItem(USER_INFO_KEY)

      return { success: true }
    },

    async fetchUserInfo() {
      if (!this.isLoggedIn) return

      this.loading = true

      try {
        const response = await authApi.me()
        const user = response?.user || response
        this.userInfo = user
        setJSON(USER_INFO_KEY, user)
        return { success: true, data: user }
      } catch (error) {
        this.error = error.message

        if (error.status !== 401 && error.code !== 40100) {
          console.warn('[UserStore] 获取用户信息失败:', error.message)
        }

        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    },

    async updateProfile(profile) {
      this.loading = true

      try {
        const response = await authApi.updateProfile(profile)
        const updated = response?.user || response
        this.userInfo = { ...this.userInfo, ...updated }
        setJSON(USER_INFO_KEY, this.userInfo)
        return { success: true, data: this.userInfo }
      } catch (error) {
        this.error = error.message
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    },

    /**
     * 设置 Token（用于第三方登录等场景）
     * @param {string} token
     */
    setToken(token) {
      this.token = token
      this.isLoggedIn = !!token
      if (token) {
        setItem(TOKEN_KEY, token)
      } else {
        removeItem(TOKEN_KEY)
      }
    },

    /**
     * 清除错误状态
     */
    clearError() {
      this.error = null
    }
  }
})
