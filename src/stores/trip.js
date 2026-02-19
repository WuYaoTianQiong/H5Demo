import { defineStore } from 'pinia'
import { tripApi } from '@/services/api.js'

/**
 * Trip Store - 行程状态管理
 * 
 * State:
 * - tripList: 行程列表
 * - currentTrip: 当前行程
 * - currentTripDays: 当前行程天数列表
 * - loading: 加载状态
 * 
 * Actions:
 * - fetchTripList: 获取行程列表
 * - fetchTripDetail: 获取行程详情
 * - createTrip: 创建行程
 * - updateTrip: 更新行程
 * - deleteTrip: 删除行程
 */

const TRIP_LIST_CACHE_KEY = 'trip:list:cache'
const CURRENT_TRIP_CACHE_KEY = 'trip:current:cache'

export const useTripStore = defineStore('trip', {
  state: () => ({
    // 行程列表
    tripList: [],
    tripListTotal: 0,
    tripListParams: { page: 1, limit: 20 },
    
    // 当前行程
    currentTrip: null,
    currentTripDays: [],
    
    // 加载状态
    loading: {
      list: false,
      detail: false,
      save: false
    },
    
    // 错误信息
    error: null
  }),
  
  getters: {
    // 行程数量
    tripCount: (state) => state.tripList.length,
    
    // 当前行程ID
    currentTripId: (state) => state.currentTrip?.id || '',
    
    // 是否正在加载列表
    isLoadingList: (state) => state.loading.list,
    
    // 是否正在加载详情
    isLoadingDetail: (state) => state.loading.detail,
    
    // 根据 ID 获取行程
    getTripById: (state) => (id) => {
      return state.tripList.find(trip => trip.id === id)
    }
  },
  
  actions: {
    /**
     * 获取行程列表
     * @param {Object} params - 查询参数
     * @param {boolean} refresh - 是否强制刷新
     */
    async fetchTripList(params = {}, refresh = false) {
      this.loading.list = true
      this.error = null
      
      // 合并参数，但明确处理 status 字段
      // 如果 params 中有 status（即使是 undefined），使用 params 的 status
      // 否则使用 this.tripListParams 的 status
      const queryParams = { 
        ...this.tripListParams, 
        ...params,
        // 如果 params 中明确传了 status（包括 undefined），使用它
        status: 'status' in params ? params.status : this.tripListParams.status
      }
      
      const page = queryParams.page || 1
      const limit = queryParams.limit || 20
      const offset = (page - 1) * limit
      
      const apiParams = {
        limit,
        offset,
        status: queryParams.status,
        q: queryParams.q,
        year: queryParams.year
      }
      
      try {
        const response = await tripApi.listV2(apiParams, {
          useCache: !refresh,
          useStorage: !refresh
        })
        
        const trips = response?.trips || []
        const total = response?.pagination?.total || trips.length
        
        this.tripList = trips
        this.tripListTotal = total
        this.tripListParams = queryParams
        
        return { success: true, data: trips, total }
      } catch (error) {
        this.error = error.message || '获取行程列表失败'
        return { success: false, error: this.error }
      } finally {
        this.loading.list = false
      }
    },
    
    async fetchTripDetail(tripId, useCache = true) {
      if (!tripId) {
        return { success: false, error: '行程ID不能为空' }
      }
      
      this.loading.detail = true
      this.error = null
      
      try {
        const response = await tripApi.getV2(tripId, {
          template: 'detail',
          useCache,
          useStorage: useCache
        })
        
        const trip = response?.trip || null
        const days = response?.daysList || []
        
        this.currentTrip = trip
        this.currentTripDays = days
        
        return { success: true, data: trip, days }
      } catch (error) {
        this.error = error.message || '获取行程详情失败'
        return { success: false, error: this.error }
      } finally {
        this.loading.detail = false
      }
    },
    
    async createTrip(tripData) {
      this.loading.save = true
      this.error = null
      
      try {
        const response = await tripApi.create(tripData)
        const newTrip = response?.trip || response
        
        if (newTrip) {
          this.tripList.unshift(newTrip)
        }
        
        return { success: true, data: newTrip }
      } catch (error) {
        this.error = error.message || '创建行程失败'
        return { success: false, error: this.error }
      } finally {
        this.loading.save = false
      }
    },
    
    async updateTrip(tripId, tripData) {
      this.loading.save = true
      this.error = null
      
      try {
        const response = await tripApi.update(tripId, tripData)
        const updatedTrip = response?.trip || response
        
        if (this.currentTrip?.id === tripId) {
          this.currentTrip = { ...this.currentTrip, ...updatedTrip }
        }
        
        const index = this.tripList.findIndex(t => t.id === tripId)
        if (index > -1) {
          this.tripList[index] = { ...this.tripList[index], ...updatedTrip }
        }
        
        return { success: true, data: updatedTrip }
      } catch (error) {
        this.error = error.message || '更新行程失败'
        return { success: false, error: this.error }
      } finally {
        this.loading.save = false
      }
    },
    
    /**
     * 删除行程
     * @param {string} tripId - 行程ID
     */
    async deleteTrip(tripId) {
      this.error = null
      
      try {
        await tripApi.delete(tripId)
        
        // 从列表中移除
        this.tripList = this.tripList.filter(t => t.id !== tripId)
        
        // 如果删除的是当前行程，清空当前行程
        if (this.currentTrip?.id === tripId) {
          this.currentTrip = null
          this.currentTripDays = []
        }
        
        return { success: true }
      } catch (error) {
        this.error = error.message || '删除行程失败'
        return { success: false, error: this.error }
      }
    },
    
    /**
     * 设置当前行程（不触发请求）
     * @param {Object} trip - 行程数据
     */
    setCurrentTrip(trip) {
      this.currentTrip = trip
      this.currentTripDays = trip?.days || []
    },
    
    /**
     * 更新当前行程天数
     * @param {Array} days - 天数列表
     */
    setCurrentTripDays(days) {
      this.currentTripDays = days
    },
    
    /**
     * 清空当前行程
     */
    clearCurrentTrip() {
      this.currentTrip = null
      this.currentTripDays = []
    },
    
    /**
     * 清空列表
     */
    clearTripList() {
      this.tripList = []
      this.tripListTotal = 0
    },
    
    /**
     * 清除错误状态
     */
    clearError() {
      this.error = null
    }
  }
})
