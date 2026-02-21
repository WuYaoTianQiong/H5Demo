import { get, post, put, del, requestWithCache, requestFresh, clearCache, sha256 } from '@/utils/http.js'
import { getItem, removeItem, setItem, setJSON } from '@/utils/storage.js'

const CACHE_STRATEGY = {
  memory: {
    'trip:list': 60000,
    'trip:detail': 30000,
    'schedule:fetch': 10000,
    'user:profile': 300000,
    default: 30000
  },
  storage: {
    'trip:list': 300000,
    'trip:detail': 180000,
    'user:profile': 600000,
    default: 60000
  }
}

function getCacheTime(cacheType, key) {
  const strategy = CACHE_STRATEGY[cacheType]
  for (const [pattern, time] of Object.entries(strategy)) {
    if (key.includes(pattern.replace(':', ':'))) return time
  }
  return strategy.default
}

export const authApi = {
  login: async (data) => {
    const encryptedData = { ...data, password: await sha256(data.password) }
    return post('/api/auth/login', encryptedData)
  },

  register: async (data) => {
    const encryptedData = { ...data, password: await sha256(data.password) }
    return post('/api/auth/register', encryptedData)
  },

  logout: () => post('/api/auth/logout'),

  me: () => get('/api/auth/me'),

  forgotPassword: (data) => post('/api/auth/forgot-password', data),

  verifyResetToken: (data) => post('/api/auth/verify-reset-token', data),

  resetPassword: async (data) => {
    const encryptedData = { ...data, newPassword: await sha256(data.newPassword) }
    return post('/api/auth/reset-password', encryptedData)
  },

  verifyEmail: (data) => post('/api/auth/verify-email', data),

  resendVerify: (data) => post('/api/auth/resend-verify', data),

  updateProfile: (data) => put('/api/auth/profile', data)
}

export const tripApi = {
  list: (params = {}, options = {}) => {
    const { useCache = true, useStorage = true } = options
    const queryParams = { ...params }
    const cacheKey = `trip:list:v2:${JSON.stringify(queryParams)}`

    if (!useCache) return requestFresh('/api/trips', queryParams)

    return requestWithCache('/api/trips', queryParams, cacheKey, { useStorage })
  },

  get: (tripId, options = {}) => {
    const { useCache = false, useStorage = false, template = 'detail' } = options
    const url = `/api/trips/${encodeURIComponent(tripId)}?template=${template}`

    if (!useCache) return get(url)

    const cacheKey = `trip:detail:v2:${tripId}:${template}`
    return requestWithCache(url, {}, cacheKey, { useStorage })
  },

  create: (data) => {
    clearCache('trip:list')
    return post('/api/trips', data)
  },

  update: (tripId, data) => {
    clearCache(`trip:detail:v2:${tripId}`)
    clearCache('trip:list')
    return put(`/api/trips/${encodeURIComponent(tripId)}`, data)
  },

  delete: (tripId) => {
    clearCache(`trip:detail:v2:${tripId}`)
    clearCache('trip:list')
    return del(`/api/trips/${encodeURIComponent(tripId)}`)
  },

  listV2: (params = {}, options = {}) => {
    const { schema, template = 'card', useCache = true, useStorage = true } = options
    const queryParams = { ...params }

    if (schema) {
      queryParams.schema = JSON.stringify(schema)
    } else {
      queryParams.template = template
    }

    const cacheKey = `trip:list:v2:${JSON.stringify(queryParams)}`

    if (!useCache) return requestFresh('/api/trips', queryParams)

    return requestWithCache('/api/trips', queryParams, cacheKey, { useStorage })
  },

  getV2: (tripId, options = {}) => {
    const { schema, template = 'detail', useCache = true, useStorage = true } = options
    let url = `/api/trips/${encodeURIComponent(tripId)}`

    const queryParts = []
    if (schema) {
      queryParts.push(`schema=${encodeURIComponent(JSON.stringify(schema))}`)
    } else {
      queryParts.push(`template=${template}`)
    }

    if (queryParts.length > 0) url += `?${queryParts.join('&')}`

    if (!useCache) return get(url)

    const cacheKey = `trip:detail:v2:${tripId}:${template}`
    return requestWithCache(url, {}, cacheKey, { useStorage })
  },

  getProgress: (tripId) => get(`/api/trips/${encodeURIComponent(tripId)}/progress`)
}

export const tripShareApi = {
  create: (tripId, options = {}) => post(`/api/trips/${encodeURIComponent(tripId)}/share`, options),

  list: (tripId) => get(`/api/trips/${encodeURIComponent(tripId)}/shares`),

  revoke: (shareId) => del(`/api/shares/${encodeURIComponent(shareId)}`),

  validate: (token) => get(`/api/shares/${encodeURIComponent(token)}`),

  updateVisibility: (tripId, visibility) => put(`/api/trips/${encodeURIComponent(tripId)}/visibility`, { visibility })
}

export const exportApi = {
  json: (tripId) => get(`/api/trips/${encodeURIComponent(tripId)}/export?format=json`),

  create: (tripId, options = {}) => post(`/api/trips/${encodeURIComponent(tripId)}/export`, options),

  status: (exportId) => get(`/api/exports/${encodeURIComponent(exportId)}`)
}

export const scheduleApi = {
  fetch: (tripId, dayId) => {
    let url = `/api/schedule?tripId=${encodeURIComponent(tripId)}`
    if (dayId) url += `&dayId=${encodeURIComponent(dayId)}`
    return get(url)
  },

  updateAll: (tripId, data) => put(`/api/trips/${encodeURIComponent(tripId)}`, { data }),

  createDay: (tripId, day) => post(`/api/trips/${encodeURIComponent(tripId)}/days`, { day }),

  createEvent: (tripId, dayId, event, position) => {
    const payload = { event };
    if (position !== undefined && position !== null) payload.position = position;
    return post(`/api/trips/${encodeURIComponent(tripId)}/days/${encodeURIComponent(dayId)}/events`, payload);
  },

  batchCreateEvents: (tripId, dayId, events, position) => {
    const payload = { events };
    if (position !== undefined && position !== null) payload.position = position;
    return post(`/api/trips/${encodeURIComponent(tripId)}/days/${encodeURIComponent(dayId)}/events`, payload);
  },

  updateEvent: (tripId, dayId, eventId, event) => {
    return put(`/api/trips/${encodeURIComponent(tripId)}/events/${encodeURIComponent(eventId)}`, { event, dayId });
  },

  deleteEvent: (tripId, eventId) => {
    const url = `/api/trips/${encodeURIComponent(tripId)}/events/${encodeURIComponent(eventId)}`;
    console.log('[API deleteEvent] 发送DELETE请求:', url, 'tripId:', tripId, 'eventId:', eventId);
    return del(url).then(result => {
      console.log('[API deleteEvent] 请求成功:', result);
      return result;
    }).catch(err => {
      console.error('[API deleteEvent] 请求失败:', err);
      throw err;
    });
  },

  batchDeleteEvents: (tripId, eventIds) => {
    return del(`/api/trips/${encodeURIComponent(tripId)}/events`, { eventIds });
  },

  reorderDayEvents: (tripId, dayId, orderedEventIds) => {
    return put(`/api/trips/${encodeURIComponent(tripId)}/days/${encodeURIComponent(dayId)}/reorder`, { order: orderedEventIds });
  },

  locations: (tripId) => get(`/api/trips/${encodeURIComponent(tripId)}/locations`),

  distance: (tripId, fromId, toId, fallback = 1) => get(
    `/api/trips/${encodeURIComponent(tripId)}/routes?from=${encodeURIComponent(fromId)}&to=${encodeURIComponent(toId)}&fallback=${encodeURIComponent(fallback)}`
  ),

  fetchV2: (tripId, dayId, options = {}) => {
    const { schema, template = 'card', eventId = null, includeTrip = false, useCache = false, useStorage = false } = options;

    let url = `/api/schedule?tripId=${encodeURIComponent(tripId)}`;
    if (dayId) url += `&dayId=${encodeURIComponent(dayId)}`;
    if (schema) {
      url += `&schema=${encodeURIComponent(JSON.stringify(schema))}`;
    } else {
      url += `&template=${encodeURIComponent(template)}`;
    }
    if (eventId) url += `&eventId=${encodeURIComponent(eventId)}`;
    if (includeTrip) url += `&includeTrip=true`;

    if (!useCache) return get(url);
    const cacheKey = `schedule:fetch:v2:${tripId}:${dayId || 'all'}:${template}`;
    return requestWithCache(url, {}, cacheKey, { useStorage });
  }
}

export { clearCache }
export const api = {
  clearCache,
  auth: authApi,
  trips: tripApi,
  tripShare: tripShareApi,
  export: exportApi,
  schedule: scheduleApi
}

export function getHttp() {
  return { get, post, put, delete: del }
}

export const http = { get, post, put, delete: del }

export default api
