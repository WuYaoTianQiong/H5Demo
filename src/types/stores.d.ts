// Stores 模块类型声明
// 为 JavaScript 编写的 Pinia stores 提供 TypeScript 类型支持

declare module '@/stores/user' {
  import { StoreDefinition } from 'pinia'

  export interface UserInfo {
    id: string
    username: string
    avatar?: string
    email?: string
    emailVerified?: boolean
  }

  export interface UserState {
    token: string
    userInfo: UserInfo | null
    isLoggedIn: boolean
    loading: boolean
    error: string | null
  }

  export interface LoginCredentials {
    email: string
    password: string
    rememberMe?: boolean
  }

  export interface LoginResult {
    success: boolean
    error?: string
  }

  export interface UserStoreActions {
    login(credentials: LoginCredentials): Promise<LoginResult>
    logout(): Promise<{ success: boolean }>
    fetchUserInfo(): Promise<{ success: boolean; data?: UserInfo; error?: string }>
    updateProfile(profile: Partial<UserInfo>): Promise<{ success: boolean; data?: UserInfo; error?: string }>
    setToken(token: string): void
    clearError(): void
  }

  export interface UserStoreGetters {
    userId: string
    username: string
    avatar: string
    email: string
    isEmailVerified: boolean
  }

  export const useUserStore: StoreDefinition<
    'user',
    UserState,
    UserStoreGetters,
    UserStoreActions
  >
}

declare module '@/stores/trip' {
  import { StoreDefinition } from 'pinia'

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
  }

  export interface TripState {
    trips: Trip[]
    currentTrip: Trip | null
    loading: boolean
    error: string | null
  }

  export const useTripStore: StoreDefinition<string, TripState, any, any>
}

declare module '@/stores/schedule' {
  import { StoreDefinition } from 'pinia'

  export interface ScheduleItem {
    id: string
    tripId: string
    day: number
    title: string
    time?: string
    location?: string
    type?: string
    notes?: string
    order: number
  }

  export interface ScheduleState {
    schedules: ScheduleItem[]
    currentSchedule: ScheduleItem | null
    loading: boolean
    error: string | null
  }

  export const useScheduleStore: StoreDefinition<string, ScheduleState, any, any>
}

declare module '@/stores/app' {
  import { StoreDefinition } from 'pinia'

  export interface AppState {
    theme: 'light' | 'dark'
    locale: string
    sidebarCollapsed: boolean
    loading: boolean
  }

  export const useAppStore: StoreDefinition<string, AppState, any, any>
}

declare module '@/stores/index' {
  export { useUserStore } from '@/stores/user'
  export { useTripStore } from '@/stores/trip'
  export { useScheduleStore } from '@/stores/schedule'
  export { useAppStore } from '@/stores/app'
}
