// API 服务模块类型声明

declare module '@/services/api' {
  // 通用响应类型
  export interface ApiResponse<T = any> {
    code: number
    message: string
    data: T
  }

  // 登录相关
  export interface LoginData {
    token: string
    user: {
      id: string
      username: string
      email: string
      avatar?: string
      emailVerified?: boolean
    }
  }

  export interface LoginCredentials {
    email: string
    password: string
    rememberMe?: boolean
  }

  export interface RegisterCredentials {
    email: string
    password: string
    username: string
  }

  // 行程相关
  export interface Trip {
    id: string
    title: string
    destination: string
    startDate: string
    endDate: string
    days: number
    cover?: string
    budget?: number
    travelers?: number
    description?: string
    isPublic?: boolean
    createdAt?: string
    updatedAt?: string
    status?: string
  }

  export interface TripListParams {
    status?: string
    q?: string
    year?: string | number
    limit?: number
    offset?: number
  }

  export interface TripListOptions {
    useCache?: boolean
    useStorage?: boolean
  }

  export interface TripGetOptions {
    useCache?: boolean
    useStorage?: boolean
    template?: string
  }

  // 分享相关
  export interface ShareOptions {
    expiresInDays?: number
    maxViews?: number
    password?: string
  }

  export interface ShareInfo {
    id: string
    token: string
    tripId: string
    expiresAt?: string
    maxViews?: number
    currentViews?: number
    password?: string
    createdAt: string
  }

  // 导出相关
  export interface ExportOptions {
    format: 'json' | 'image' | 'pdf'
    dayId?: string
  }

  export interface ExportTask {
    id: string
    status: 'pending' | 'processing' | 'completed' | 'failed'
    url?: string
    format: string
    createdAt: string
    completedAt?: string
  }

  // 日程相关
  export interface ScheduleDay {
    id: string
    tripId: string
    date: string
    dayNumber: number
    events: ScheduleEvent[]
  }

  export interface ScheduleEvent {
    id: string
    title: string
    time?: string
    location?: string
    type?: string
    notes?: string
    order: number
    latitude?: number
    longitude?: number
    options?: any[]
    activeOptionIndex?: number
  }

  export interface ScheduleFetchResult {
    data: ScheduleDay[]
    locations: any[]
  }

  export interface ScheduleFetchOptions {
    schema?: object
    template?: string
    eventId?: string | null
    includeTrip?: boolean
    useCache?: boolean
    useStorage?: boolean
  }

  // API 函数
  export const authApi: {
    login(data: LoginCredentials): Promise<LoginData>
    register(data: RegisterCredentials): Promise<any>
    logout(): Promise<any>
    me(): Promise<{ user: any }>
    forgotPassword(data: { email: string }): Promise<any>
    verifyResetToken(data: { token: string }): Promise<any>
    resetPassword(data: { token: string; newPassword: string }): Promise<any>
    verifyEmail(data: { token: string }): Promise<any>
    resendVerify(data: { email: string }): Promise<any>
    updateProfile(data: any): Promise<any>
  }

  export const tripApi: {
    list(params?: TripListParams, options?: TripListOptions): Promise<Trip[]>
    get(tripId: string, options?: TripGetOptions): Promise<Trip>
    create(data: Partial<Trip>): Promise<Trip>
    update(tripId: string, data: Partial<Trip>): Promise<Trip>
    delete(tripId: string): Promise<any>
    listV2(params?: TripListParams, options?: any): Promise<Trip[]>
    getV2(tripId: string, options?: any): Promise<Trip>
    getProgress(tripId: string): Promise<any>
  }

  export const tripShareApi: {
    create(tripId: string, options?: ShareOptions): Promise<ShareInfo>
    list(tripId: string): Promise<ShareInfo[]>
    revoke(shareId: string): Promise<any>
    validate(token: string): Promise<Trip>
    updateVisibility(tripId: string, visibility: 'private' | 'public' | 'link'): Promise<any>
  }

  export const exportApi: {
    json(tripId: string): Promise<any>
    create(tripId: string, options?: ExportOptions): Promise<ExportTask>
    status(exportId: string): Promise<ExportTask>
  }

  export const scheduleApi: {
    fetch(tripId: string, dayId?: string): Promise<ScheduleDay[]>
    updateAll(tripId: string, data: any): Promise<any>
    createDay(tripId: string, day: Partial<ScheduleDay>): Promise<ScheduleDay>
    createEvent(tripId: string, dayId: string, event: Partial<ScheduleEvent>, position?: number): Promise<ScheduleEvent>
    batchCreateEvents(tripId: string, dayId: string, events: Partial<ScheduleEvent>[], position?: number): Promise<ScheduleEvent[]>
    updateEvent(tripId: string, dayId: string, eventId: string, event: Partial<ScheduleEvent>): Promise<ScheduleEvent>
    updateActiveOptionIndex(tripId: string, dayId: string, eventId: string, activeOptionIndex: number): Promise<ScheduleEvent>
    deleteEvent(tripId: string, eventId: string): Promise<any>
    batchDeleteEvents(tripId: string, eventIds: string[]): Promise<any>
    reorderDayEvents(tripId: string, dayId: string, orderedEventIds: string[]): Promise<any>
    locations(tripId: string): Promise<any[]>
    distance(tripId: string, fromId: string, toId: string, fallback?: number): Promise<any>
    fetchV2(tripId: string, dayId?: string, options?: ScheduleFetchOptions): Promise<ScheduleFetchResult>
  }

  // HTTP 方法
  export const http: {
    get(url: string, params?: any): Promise<any>
    post(url: string, data?: any): Promise<any>
    put(url: string, data?: any): Promise<any>
    delete(url: string, data?: any): Promise<any>
  }

  // 缓存相关
  export function clearCache(pattern?: string | null): void
  export function getCacheStats(): { memory: number; storage: number; pending: number }

  // 旧版兼容导出
  export const api: {
    clearCache: typeof clearCache
    auth: typeof authApi
    trips: typeof tripApi
    tripShare: typeof tripShareApi
    export: typeof exportApi
    schedule: typeof scheduleApi
  }

  export default api
}
