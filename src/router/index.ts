import { createRouter, createWebHistory, RouteRecordRaw, NavigationGuardNext, RouteLocationNormalized, RouterScrollBehavior } from 'vue-router'
import { getJSON } from '@/utils/storage.js'

// 不需要认证的页面白名单
const whiteList = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/public', '/share']

const SCROLL_STORAGE_KEY = 'scroll_positions'

// 创建 scrollBehavior - 处理页面滚动位置恢复
const createScrollBehavior = (): RouterScrollBehavior => {
  return (to, from, savedPosition) => {
    // 如果有 savedPosition（浏览器前进/后退按钮），优先使用
    if (savedPosition) {
      return savedPosition
    }

    // 尝试从 localStorage 恢复
    const key = `${SCROLL_STORAGE_KEY}:${to.fullPath.split('?')[0]}`
    const stored = getJSON(key)

    if (stored && typeof stored.x === 'number' && typeof stored.y === 'number') {
      // 检查过期（7天）
      const now = Date.now()
      const expireTime = 7 * 24 * 60 * 60 * 1000
      if (now - stored.timestamp <= expireTime) {
        return { left: stored.x, top: stored.y }
      } else {
        localStorage.removeItem(key)
      }
    }

    // 默认滚动到顶部
    return { left: 0, top: 0 }
  }
}

// 检查是否需要认证
function isAuthRequired(path: string): boolean {
  return !whiteList.some(whitePath => path.startsWith(whitePath))
}

// 从 localStorage 直接获取 token（避免封装层问题）
function getToken(): string | null {
  try {
    return localStorage.getItem('token')
  } catch (e) {
    console.error('[Router] localStorage access error:', e)
    return null
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/Home.vue')
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/Login.vue')
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/pages/Register.vue')
  },
  {
    path: '/trip/:id',
    name: 'trip-detail',
    component: () => import('@/pages/TripDetail.vue')
  },
  {
    path: '/trip/:id/schedule',
    name: 'trip-schedule',
    component: () => import('@/pages/Schedule.vue')
  },
  {
    path: '/trip/:tripId/event',
    name: 'event-create',
    component: () => import('@/pages/Event.vue')
  },
  {
    path: '/trip/:tripId/event/:eventId',
    name: 'event-edit',
    component: () => import('@/pages/Event.vue')
  },
  {
    path: '/location-picker',
    name: 'location-picker',
    component: () => import('@/pages/LocationPicker.vue')
  },
  {
    path: '/option-edit',
    name: 'option-edit',
    component: () => import('@/pages/OptionEdit.vue')
  },
  {
    path: '/public/:id',
    name: 'public-trip',
    component: () => import('@/pages/PublicTrip.vue')
  },
  {
    path: '/share/:token',
    name: 'share-trip',
    component: () => import('@/pages/PublicTrip.vue')
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/pages/Profile.vue')
  },
  {
    path: '/profile/edit',
    name: 'edit-profile',
    component: () => import('@/pages/EditProfile.vue')
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/pages/ForgotPassword.vue')
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('@/pages/ResetPassword.vue')
  },
  {
    path: '/verify-email',
    name: 'verify-email',
    component: () => import('@/pages/VerifyEmail.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/NotFound.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  // 使用原生 scrollBehavior 处理滚动位置恢复（最主流方案）
  scrollBehavior: createScrollBehavior()
})

// 全局前置守卫 - 统一处理认证
router.beforeEach((to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
  const token = getToken()
  const requiresAuth = isAuthRequired(to.path)

  // 1. 如果已登录，访问登录页等白名单页面，跳转到首页
  if (token && whiteList.includes(to.path)) {
    next('/')
    return
  }

  // 2. 如果需要认证但没有 token，跳转到登录页
  if (requiresAuth && !token) {
    next(`/login?returnUrl=${encodeURIComponent(to.fullPath)}`)
    return
  }

  // 3. 其他情况正常通过
  next()
})

export default router
