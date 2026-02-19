import { defineStore } from 'pinia'
import { scheduleApi } from '@/services/api.js'

/**
 * Schedule Store - 日程状态管理
 * 
 * State:
 * - scheduleData: 日程数据（按 dayId 分组）
 * - currentDayId: 当前选中的日期ID
 * - locations: 地点列表
 * - distances: 距离数据
 * 
 * Actions:
 * - fetchSchedule: 获取日程数据
 * - createEvent: 创建事件
 * - updateEvent: 更新事件
 * - deleteEvent: 删除事件
 * - reorderEvents: 重新排序事件
 */

export const useScheduleStore = defineStore('schedule', {
  state: () => ({
    // 日程数据缓存 { dayId: events[] }
    scheduleData: {},
    
    // 当前日期ID
    currentDayId: '',
    
    // 地点列表
    locations: [],
    
    // 距离数据 { 'from-to': distance }
    distances: {},
    
    // 加载状态
    loading: {
      schedule: false,
      save: false
    },
    
    // 错误信息
    error: null
  }),
  
  getters: {
    // 当前日期的卡片列表
    currentDayCards: (state) => {
      return state.scheduleData[state.currentDayId] || []
    },
    
    // 当前日期卡片数量
    currentDayCardCount: (state) => {
      return (state.scheduleData[state.currentDayId] || []).length
    },
    
    // 获取指定日期的卡片
    getDayCards: (state) => (dayId) => {
      return state.scheduleData[dayId] || []
    },
    
    // 是否正在加载日程
    isLoadingSchedule: (state) => state.loading.schedule,
    
    // 计算完成进度
    completionProgress: (state) => {
      const cards = state.scheduleData[state.currentDayId] || []
      if (cards.length === 0) return 0
      const completed = cards.filter(c => c.completed).length
      return Math.round((completed / cards.length) * 100)
    }
  },
  
  actions: {
    /**
     * 获取日程数据
     * @param {string} tripId - 行程ID
     * @param {string} dayId - 日期ID（可选）
     * @param {boolean} useCache - 是否使用缓存
     */
    async fetchSchedule(tripId, dayId = null, useCache = false) {
      this.loading.schedule = true
      this.error = null
      
      try {
        const response = await scheduleApi.fetchV2(tripId, dayId, {
          template: 'card',
          useCache,
          useStorage: false // 日程实时性高，默认不缓存到 Storage
        })
        
        // 处理响应数据
        const days = response?.data?.days || response?.days || []
        
        // 更新日程数据
        days.forEach(day => {
          const dayId = day.id
          const events = day.events || []
          this.scheduleData[dayId] = events
        })
        
        // 如果没有指定 dayId，设置第一个为当前日期
        if (!dayId && days.length > 0) {
          this.currentDayId = days[0].id
        } else if (dayId) {
          this.currentDayId = dayId
        }
        
        return { success: true, data: days }
      } catch (error) {
        this.error = error.message || '获取日程失败'
        return { success: false, error: this.error }
      } finally {
        this.loading.schedule = false
      }
    },
    
    /**
     * 创建事件
     * @param {string} tripId - 行程ID
     * @param {string} dayId - 日期ID
     * @param {Object} eventData - 事件数据
     */
    async createEvent(tripId, dayId, eventData) {
      this.loading.save = true
      this.error = null
      
      try {
        const response = await scheduleApi.createEvent(tripId, dayId, eventData)
        const newEvent = response?.event || response?.data?.event || response
        
        // 添加到对应日期的列表
        if (!this.scheduleData[dayId]) {
          this.scheduleData[dayId] = []
        }
        this.scheduleData[dayId].push(newEvent)
        
        return { success: true, data: newEvent }
      } catch (error) {
        this.error = error.message || '创建事件失败'
        return { success: false, error: this.error }
      } finally {
        this.loading.save = false
      }
    },
    
    /**
     * 更新事件
     * @param {string} tripId - 行程ID
     * @param {string} dayId - 日期ID
     * @param {string} eventId - 事件ID
     * @param {Object} eventData - 事件数据
     */
    async updateEvent(tripId, dayId, eventId, eventData) {
      this.loading.save = true
      this.error = null
      
      try {
        const response = await scheduleApi.updateEvent(tripId, dayId, eventId, eventData)
        const updatedEvent = response?.event || response?.data?.event || eventData
        
        // 更新本地数据
        const events = this.scheduleData[dayId] || []
        const index = events.findIndex(e => e.id === eventId || e.uid === eventId)
        if (index > -1) {
          events[index] = { ...events[index], ...updatedEvent }
        }
        
        return { success: true, data: updatedEvent }
      } catch (error) {
        this.error = error.message || '更新事件失败'
        return { success: false, error: this.error }
      } finally {
        this.loading.save = false
      }
    },
    
    /**
     * 删除事件
     * @param {string} tripId - 行程ID
     * @param {string} dayId - 日期ID
     * @param {string} eventId - 事件ID
     */
    async deleteEvent(tripId, dayId, eventId) {
      this.error = null
      
      try {
        await scheduleApi.deleteEvent(tripId, eventId)
        
        // 从本地数据移除
        const events = this.scheduleData[dayId] || []
        this.scheduleData[dayId] = events.filter(e => e.id !== eventId)
        
        return { success: true }
      } catch (error) {
        this.error = error.message || '删除事件失败'
        return { success: false, error: this.error }
      }
    },
    
    /**
     * 重新排序事件
     * @param {string} tripId - 行程ID
     * @param {string} dayId - 日期ID
     * @param {Array} orderedEventIds - 排序后的事件ID数组
     */
    async reorderEvents(tripId, dayId, orderedEventIds) {
      this.error = null
      
      try {
        await scheduleApi.reorderDayEvents(tripId, dayId, orderedEventIds)
        
        // 更新本地顺序
        const events = this.scheduleData[dayId] || []
        const sortedEvents = orderedEventIds
          .map(id => events.find(e => e.id === id))
          .filter(Boolean)
        this.scheduleData[dayId] = sortedEvents
        
        return { success: true }
      } catch (error) {
        this.error = error.message || '排序失败'
        return { success: false, error: this.error }
      }
    },
    
    /**
     * 切换事件状态（完成/未完成）
     * @param {string} dayId - 日期ID
     * @param {string} eventId - 事件ID
     */
    toggleEventStatus(dayId, eventId) {
      const events = this.scheduleData[dayId] || []
      const event = events.find(e => e.id === eventId)
      if (event) {
        event.completed = !event.completed
        event.state = event.completed ? 'completed' : 'active'
      }
    },
    
    /**
     * 设置当前日期
     * @param {string} dayId - 日期ID
     */
    setCurrentDay(dayId) {
      this.currentDayId = dayId
    },
    
    /**
     * 设置地点列表
     * @param {Array} locations - 地点列表
     */
    setLocations(locations) {
      this.locations = locations
    },
    
    /**
     * 设置距离数据
     * @param {Object} distances - 距离数据
     */
    setDistances(distances) {
      this.distances = distances
    },
    
    /**
     * 清空日程数据
     */
    clearSchedule() {
      this.scheduleData = {}
      this.currentDayId = ''
      this.locations = []
      this.distances = {}
    },
    
    /**
     * 清除错误状态
     */
    clearError() {
      this.error = null
    }
  }
})
