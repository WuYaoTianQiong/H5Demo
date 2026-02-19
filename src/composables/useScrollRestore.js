import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { getJSON, setJSON } from '@/utils/storage.js'

const SCROLL_STORAGE_KEY = 'scroll_positions'

/**
 * 页面滚动位置恢复 - 增强版
 * 支持页面刷新后恢复、多个滚动容器、日期导航栏等场景
 * 
 * @param {Object} options - 配置选项
 * @param {string} options.container - 滚动容器选择器，默认为 window
 * @param {boolean} options.immediate - 是否立即恢复，默认为 true
 * @param {number} options.delay - 恢复延迟时间(ms)，默认为 300
 * @param {string[]} options.excludeRoutes - 排除的路由名称列表
 * @param {boolean} options.persist - 是否持久化到 localStorage，默认为 true
 * @returns {Object} { saveScrollPosition, restoreScrollPosition, clearScrollPosition, scrollRef }
 */
export function useScrollRestore(options = {}) {
  const {
    container = null,
    immediate = true,
    delay = 300,
    excludeRoutes = [],
    persist = true
  } = options

  const route = useRoute()
  const scrollRef = ref(null)
  const isRestored = ref(false)

  // 生成存储 key - 使用页面路径作为 key
  const generateKey = () => {
    const path = route.fullPath.split('?')[0] // 去掉 query 参数
    return `${SCROLL_STORAGE_KEY}:${path}`
  }

  // 获取滚动元素
  const getScrollElement = () => {
    if (scrollRef.value) return scrollRef.value
    if (container) {
      const el = document.querySelector(container)
      if (el) return el
    }
    return window
  }

  // 获取当前滚动位置
  const getScrollPosition = () => {
    const el = getScrollElement()
    if (el === window) {
      return {
        x: window.pageXOffset || document.documentElement.scrollLeft || 0,
        y: window.pageYOffset || document.documentElement.scrollTop || 0
      }
    }
    return {
      x: el.scrollLeft || 0,
      y: el.scrollTop || 0
    }
  }

  // 设置滚动位置
  const setScrollPosition = (x, y) => {
    const el = getScrollElement()
    if (el === window) {
      window.scrollTo(x, y)
    } else {
      el.scrollLeft = x
      el.scrollTop = y
    }
  }

  // 保存滚动位置
  const saveScrollPosition = () => {
    if (!persist) return
    if (excludeRoutes.includes(route.name)) return
    
    const position = getScrollPosition()
    // 只保存有意义的滚动位置（大于 10px）
    if (position.x > 10 || position.y > 10) {
      const key = generateKey()
      setJSON(key, {
        x: position.x,
        y: position.y,
        timestamp: Date.now()
      })
    }
  }

  // 恢复滚动位置
  const restoreScrollPosition = async () => {
    if (!persist || isRestored.value) return
    if (excludeRoutes.includes(route.name)) return

    const key = generateKey()
    const saved = getJSON(key)

    if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
      // 检查是否过期（7天）
      const now = Date.now()
      const expireTime = 7 * 24 * 60 * 60 * 1000
      if (now - saved.timestamp > expireTime) {
        localStorage.removeItem(key)
        return
      }

      await nextTick()
      // 延迟执行，确保 DOM 完全渲染
      setTimeout(() => {
        setScrollPosition(saved.x, saved.y)
        isRestored.value = true
      }, delay)
    }
  }

  // 清除当前页面的滚动位置
  const clearScrollPosition = () => {
    const key = generateKey()
    localStorage.removeItem(key)
  }

  // 清除所有过期的滚动位置
  const clearExpiredPositions = () => {
    const now = Date.now()
    const expireTime = 7 * 24 * 60 * 60 * 1000

    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(SCROLL_STORAGE_KEY)) {
          const data = getJSON(key)
          if (data && data.timestamp && (now - data.timestamp > expireTime)) {
            localStorage.removeItem(key)
          }
        }
      })
    } catch (e) {
      console.error('[useScrollRestore] 清除过期位置失败:', e)
    }
  }

  // 监听滚动事件（防抖保存）
  let scrollTimer = null
  const handleScroll = () => {
    if (scrollTimer) clearTimeout(scrollTimer)
    scrollTimer = setTimeout(() => {
      saveScrollPosition()
    }, 500)
  }

  onMounted(() => {
    if (immediate) {
      restoreScrollPosition()
    }
    clearExpiredPositions()

    // 添加滚动监听
    const el = getScrollElement()
    if (el) {
      el.addEventListener('scroll', handleScroll, { passive: true })
    }
  })

  onUnmounted(() => {
    if (scrollTimer) clearTimeout(scrollTimer)
    saveScrollPosition()

    const el = getScrollElement()
    if (el) {
      el.removeEventListener('scroll', handleScroll)
    }
  })

  return {
    saveScrollPosition,
    restoreScrollPosition,
    clearScrollPosition,
    scrollRef,
    isRestored
  }
}

/**
 * 水平滚动位置管理（用于日期导航栏等）
 * 支持组件实例（如 naive-ui 的 n-scrollbar）和 DOM 元素
 * 
 * @param {string} key - 存储 key 后缀
 * @returns {Object} { saveHorizontalScroll, restoreHorizontalScroll, scrollRef }
 */
export function useHorizontalScrollRestore(key) {
  const scrollRef = ref(null)
  const storageKey = `${SCROLL_STORAGE_KEY}:h:${key}`
  const isComponent = ref(false)

  // 获取实际的滚动容器
  const getScrollContainer = () => {
    if (!scrollRef.value) return null
    // 如果是组件实例（如 n-scrollbar），获取其 $el
    if (scrollRef.value.$el) {
      isComponent.value = true
      return scrollRef.value.$el.querySelector('.n-scrollbar-container') || scrollRef.value.$el
    }
    return scrollRef.value
  }

  const saveHorizontalScroll = () => {
    const container = getScrollContainer()
    if (!container) return
    const scrollLeft = container.scrollLeft || 0
    if (scrollLeft > 10) {
      setJSON(storageKey, {
        x: scrollLeft,
        timestamp: Date.now()
      })
    }
  }

  const restoreHorizontalScroll = async (delay = 300) => {
    const saved = getJSON(storageKey)
    if (saved && typeof saved.x === 'number') {
      // 检查过期
      const now = Date.now()
      const expireTime = 7 * 24 * 60 * 60 * 1000
      if (now - saved.timestamp > expireTime) {
        localStorage.removeItem(storageKey)
        return
      }

      await nextTick()
      setTimeout(() => {
        const container = getScrollContainer()
        if (container) {
          container.scrollLeft = saved.x
        }
      }, delay)
    }
  }

  const clearHorizontalScroll = () => {
    localStorage.removeItem(storageKey)
  }

  // 监听滚动
  let scrollTimer = null
  const handleScroll = () => {
    if (scrollTimer) clearTimeout(scrollTimer)
    scrollTimer = setTimeout(saveHorizontalScroll, 500)
  }

  onMounted(() => {
    // 延迟执行，确保组件已挂载
    setTimeout(() => {
      const container = getScrollContainer()
      if (container) {
        container.addEventListener('scroll', handleScroll, { passive: true })
        restoreHorizontalScroll()
      }
    }, 100)
  })

  onUnmounted(() => {
    if (scrollTimer) clearTimeout(scrollTimer)
    saveHorizontalScroll()
    const container = getScrollContainer()
    if (container) {
      container.removeEventListener('scroll', handleScroll)
    }
  })

  return {
    scrollRef,
    saveHorizontalScroll,
    restoreHorizontalScroll,
    clearHorizontalScroll
  }
}

/**
 * 在路由配置中使用的 scrollBehavior
 * 最主流的方案，在 router/index.ts 中使用
 * 
 * @param {Object} options - 配置选项
 * @param {number} options.delay - 延迟时间(ms)
 * @returns {Function} scrollBehavior 函数
 */
export function createScrollBehavior(options = {}) {
  const { delay = 0 } = options

  return (to, from, savedPosition) => {
    // 如果有 savedPosition（浏览器前进/后退按钮），优先使用
    if (savedPosition) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ left: savedPosition.left, top: savedPosition.top })
        }, delay)
      })
    }

    // 尝试从 localStorage 恢复
    const key = `${SCROLL_STORAGE_KEY}:${to.fullPath.split('?')[0]}`
    const stored = getJSON(key)

    if (stored && typeof stored.x === 'number' && typeof stored.y === 'number') {
      // 检查过期
      const now = Date.now()
      const expireTime = 7 * 24 * 60 * 60 * 1000
      if (now - stored.timestamp <= expireTime) {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ left: stored.x, top: stored.y })
          }, delay)
        })
      } else {
        localStorage.removeItem(key)
      }
    }

    // 默认滚动到顶部
    return { left: 0, top: 0 }
  }
}

export default useScrollRestore
