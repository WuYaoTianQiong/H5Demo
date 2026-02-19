/**
 * Pinia Store 入口
 * 集中管理全局状态
 * 
 * Store 列表：
 * - useUserStore: 用户状态（登录信息、个人信息）
 * - useTripStore: 行程状态（当前行程、行程列表）
 * - useScheduleStore: 日程状态（当前日程、卡片）
 * - useAppStore: 应用状态（全局设置、缓存）
 */

import { createPinia } from 'pinia'

// 创建 Pinia 实例
export const pinia = createPinia()

// 导出各个 Store
export { useUserStore } from './user'
export { useTripStore } from './trip'
export { useScheduleStore } from './schedule'
export { useAppStore } from './app'

export default pinia
