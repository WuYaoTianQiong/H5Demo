import { getItem, setItem, removeItem, getJSON, setJSON } from '@/utils/storage.js'
import { useUserStore } from '@/stores/user.js'

const memoryCache = new Map()
const pendingRequests = new Map()

const CACHE_STRATEGY = {
  memory: {
    default: 30000
  },
  storage: {
    default: 60000
  }
}

const STORAGE_CACHE_PREFIX = 'api_cache_'

function getCacheTime(cacheType, key) {
  const strategy = CACHE_STRATEGY[cacheType]
  for (const [pattern, time] of Object.entries(strategy)) {
    if (key.includes(pattern)) return time
  }
  return strategy.default
}

function getStorageCache(key) {
  try {
    const storageKey = STORAGE_CACHE_PREFIX + key
    const data = getItem(storageKey)
    if (!data) return null
    const { value, expireTime } = JSON.parse(data)
    if (Date.now() > expireTime) {
      removeItem(storageKey)
      return null
    }
    return value
  } catch (e) {
    return null
  }
}

function setStorageCache(key, value, ttl) {
  try {
    const storageKey = STORAGE_CACHE_PREFIX + key
    const data = { value, expireTime: Date.now() + ttl }
    setItem(storageKey, JSON.stringify(data))
  } catch (e) {
    cleanExpiredStorageCache()
  }
}

function cleanExpiredStorageCache() {
  try {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(STORAGE_CACHE_PREFIX)) {
        try {
          const data = getItem(key)
          if (data) {
            const { expireTime } = JSON.parse(data)
            if (Date.now() > expireTime) removeItem(key)
          }
        } catch (e) { }
      }
    })
  } catch (e) { }
}

function handleAuthError() {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
  if (currentPath && currentPath.includes('/login')) return
  if (typeof window !== 'undefined' && window.__isLoggingOut) return
  if (typeof window !== 'undefined') window.__isLoggingOut = true

  try {
    const message = window.$message || window.message
    if (message && message.error) {
      message.error('登录已过期，请重新登录')
    } else {
      alert('登录已过期，请重新登录')
    }
  } catch (e) {
    console.log('[API] 登录已过期')
  }

  setTimeout(() => {
    removeItem('token')
    removeItem('userInfo')
    const returnUrl = encodeURIComponent(window.location.href)
    window.location.href = `/login?returnUrl=${returnUrl}`
    window.__isLoggingOut = false
  }, 1500)
}

function getBaseUrl() {
  return ''
}

function getHeaders() {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
  const token = getItem('token')
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

function unwrapResponse(result) {
  if (!result || typeof result !== 'object') return result
  if ('code' in result && 'data' in result) {
    if (result.code === 0 && result.data !== undefined) return result.data
  }
  return result
}

const requestInterceptors = []
const responseInterceptors = []

export function addRequestInterceptor(fn) {
  requestInterceptors.push(fn)
}

export function addResponseInterceptor(fn) {
  responseInterceptors.push(fn)
}

async function httpRequest(method, url, data = null, params = null) {
  let fullUrl = url.startsWith('http') ? url : `${getBaseUrl()}${url}`

  if (params) {
    const queryParts = []
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      }
    }
    if (queryParts.length > 0) {
      fullUrl += `${fullUrl.includes('?') ? '&' : '?'}${queryParts.join('&')}`
    }
  }

  let options = {
    method,
    headers: getHeaders(),
    credentials: 'include'
  }

  if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
    options.body = JSON.stringify(data)
  }

  for (const interceptor of requestInterceptors) {
    options = await interceptor(options, fullUrl)
  }

  try {
    const response = await fetch(fullUrl, options)

    let result
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      result = await response.json()
    } else {
      result = await response.text()
    }

    for (const interceptor of responseInterceptors) {
      result = await interceptor(result, response)
    }

    if (!response.ok) {
      if (response.status === 401) handleAuthError()
      const errorData = unwrapResponse(result)
      const error = new Error(errorData?.message || result.message || result.error || `HTTP ${response.status}`)
      error.status = response.status
      error.data = errorData
      error.code = result.code || response.status
      throw error
    }

    return unwrapResponse(result)
  } catch (error) {
    console.error(`[API] ${method} ${url} failed:`, error)
    throw error
  }
}

export function get(url, params = null) {
  return httpRequest('GET', url, null, params)
}

export function post(url, data = null) {
  return httpRequest('POST', url, data)
}

export function put(url, data = null) {
  return httpRequest('PUT', url, data)
}

export function del(url, data = null) {
  return httpRequest('DELETE', url, data)
}

export function getHttp() {
  return { get, post, put, delete: del }
}

export function requestWithCache(url, params = {}, cacheKey, options = {}) {
  const { useStorage = true, memoryTTL, storageTTL } = options

  if (cacheKey && memoryCache.has(cacheKey)) {
    return Promise.resolve(memoryCache.get(cacheKey))
  }

  if (cacheKey && useStorage) {
    const storageData = getStorageCache(cacheKey)
    if (storageData) {
      memoryCache.set(cacheKey, storageData)
      const ttl = memoryTTL || getCacheTime('memory', cacheKey)
      setTimeout(() => memoryCache.delete(cacheKey), ttl)
      return Promise.resolve(storageData)
    }
  }

  if (cacheKey && pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)
  }

  const promise = get(url, params).then((data) => {
    if (cacheKey) {
      memoryCache.set(cacheKey, data)
      const memTTL = memoryTTL || getCacheTime('memory', cacheKey)
      setTimeout(() => memoryCache.delete(cacheKey), memTTL)
      if (useStorage) {
        const storTTL = storageTTL || getCacheTime('storage', cacheKey)
        setStorageCache(cacheKey, data, storTTL)
      }
    }
    return data
  }).finally(() => {
    if (cacheKey) pendingRequests.delete(cacheKey)
  })

  if (cacheKey) pendingRequests.set(cacheKey, promise)
  return promise
}

export function requestFresh(url, params = {}) {
  return get(url, params)
}

export function clearCache(pattern = null) {
  if (pattern) {
    for (const key of memoryCache.keys()) {
      if (key.includes(pattern)) memoryCache.delete(key)
    }
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(STORAGE_CACHE_PREFIX) && key.includes(pattern)) {
          removeItem(key)
        }
      })
    } catch (e) { }
  } else {
    memoryCache.clear()
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(STORAGE_CACHE_PREFIX)) removeItem(key)
      })
    } catch (e) { }
  }
  pendingRequests.clear()
}

export function getCacheStats() {
  const memorySize = memoryCache.size
  let storageSize = 0
  try {
    const keys = Object.keys(localStorage)
    storageSize = keys.filter(k => k.startsWith(STORAGE_CACHE_PREFIX)).length
  } catch (e) { }
  return { memory: memorySize, storage: storageSize, pending: pendingRequests.size }
}

if (typeof window !== 'undefined') clearCache()

async function sha256(string) {
  if (!string) return ''
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(string)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch (error) {
    console.error('SHA-256 hash error:', error)
    return string
  }
}

export const http = { get, post, put, delete: del }

export { sha256 }
