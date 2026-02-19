/**
 * 旧版 API 工具（兼容导出）
 * 
 * ⚠️ 注意：此文件已弃用，请使用 @/services/api.js
 * 
 * 新用法：
 *   import { authApi, tripApi, scheduleApi } from '@/services/api.js'
 * 
 * 或直接使用 uView Pro：
 *   const { http } = uni.$u
 *   http.get('/api/trips')
 */

import { getHttp, authApi, tripApi, scheduleApi, clearCache } from '@/services/api.js'

/**
 * 清除所有缓存
 * @deprecated 使用 services/api.js 中的 clearCache
 */
function clearRequestCache() {
  clearCache()
}

/**
 * 兼容旧版 API 导出
 * @deprecated 请迁移到 services/api.js
 */
export const api = {
  clearCache: clearRequestCache,
  trips: {
    list: (params) => tripApi.list(params),
    get: (id) => tripApi.get(id),
    create: (data) => tripApi.create(data),
    update: (id, data) => tripApi.update(id, data),
    delete: (id) => tripApi.delete(id),
  },
  schedule: {
    get: (tripId) => scheduleApi.fetch(tripId),
    update: (tripId, data) => scheduleApi.updateAll(tripId, data),
    addEvent: (tripId, dayId, event) => scheduleApi.createEvent(tripId, dayId, event),
    updateEvent: (tripId, dayId, eventId, event) => scheduleApi.updateEvent(tripId, dayId, eventId, event),
    deleteEvent: (tripId, dayId, eventId) => scheduleApi.deleteEvent(tripId, eventId),
    toggleEventComplete: (tripId, dayId, eventId) => {
      // 旧版接口不存在，使用新版
      console.warn('toggleEventComplete 请直接使用 scheduleApi')
      return Promise.reject(new Error('请使用 scheduleApi'))
    },
    fetch: (tripId) => scheduleApi.fetch(tripId),
    updateAll: (tripId, data) => scheduleApi.updateAll(tripId, data),
    reorderDayEvents: (tripId, dayId, order) => scheduleApi.reorderDayEvents(tripId, dayId, order),
    distance: (tripId, fromId, toId, fallback) => scheduleApi.distance(tripId, fromId, toId, fallback),
    locations: (tripId) => scheduleApi.locations(tripId),
    createDay: (tripId, day) => scheduleApi.createDay(tripId, day),
    createEvent: (tripId, dayId, event) => scheduleApi.createEvent(tripId, dayId, event),
  },
  auth: {
    login: (data) => authApi.login(data),
    register: (data) => authApi.register(data),
    logout: () => authApi.logout(),
    me: () => authApi.me(),
    forgotPassword: (data) => authApi.forgotPassword(data),
    resetPassword: (data) => authApi.resetPassword(data),
    verifyEmail: (data) => authApi.verifyEmail(data),
    resendVerify: (data) => authApi.resendVerify(data),
    updateProfile: (data) => authApi.updateProfile(data),
  },
}

// 导出 http 实例供直接使用
export { http }

// 默认导出兼容旧代码
export default api
