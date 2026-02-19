// 工具函数模块类型声明

declare module '@/utils/storage' {
  /**
   * 获取 localStorage 值
   */
  export function getItem(key: string): string | null

  /**
   * 设置 localStorage 值
   */
  export function setItem(key: string, value: string): void

  /**
   * 移除 localStorage 值
   */
  export function removeItem(key: string): void

  /**
   * 获取 JSON 对象
   */
  export function getJSON<T = any>(key: string): T | null

  /**
   * 设置 JSON 对象
   */
  export function setJSON(key: string, value: any): void
}

declare module '@/utils/date' {
  /**
   * 格式化日期为 YYYY-MM-DD
   */
  export function formatDate(date: Date): string

  /**
   * 计算两个日期之间的天数（包含起止日期）
   */
  export function calculateDaysBetween(startDate: Date, endDate: Date): number

  /**
   * 计算住宿晚数
   */
  export function calculateNights(days: number): number

  /**
   * 从日期获取年份
   */
  export function getYearFromDate(date: Date): string

  /**
   * 判断时间戳是否早于今天
   */
  export function isDateBeforeToday(timestamp: number): boolean

  /**
   * 判断时间戳是否早于参考时间戳
   */
  export function isDateBefore(timestamp: number, referenceTimestamp: number): boolean
}

declare module '@/composables/useAMap' {
  import { Ref } from 'vue'

  export interface AMapInstance {
    Map: any
    Marker: any
    Polyline: any
    InfoWindow: any
    Geocoder: any
    Autocomplete: any
    PlaceSearch: any
    [key: string]: any
  }

  export interface UseAMapReturn {
    aMap: Ref<AMapInstance | null>
    mapInstance: Ref<any>
    isReady: Ref<boolean>
    error: Ref<Error | null>
    initMap: (container: string | HTMLElement, options?: any) => Promise<any>
    destroyMap: () => void
  }

  export function useAMap(): UseAMapReturn
  export function loadAMapSDK(): Promise<AMapInstance>
}

declare module '@/composables/useDevice' {
  import { Ref } from 'vue'

  export interface DeviceInfo {
    isMobile: Ref<boolean>
  }

  export function useDevice(): DeviceInfo
}

declare module '@/utils/navigateHelper' {
  /**
   * 导航到指定页面
   */
  export function navigateTo(url: string, options?: { replace?: boolean }): void

  /**
   * 返回上一页
   */
  export function navigateBack(delta?: number): void

  /**
   * 重定向到登录页
   */
  export function redirectToLogin(returnUrl?: string): void

  /**
   * 获取当前页面路径
   */
  export function getCurrentPage(): string
}

declare module '@/utils/routeGuard' {
  import { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'

  export function authGuard(
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext
  ): void
}
