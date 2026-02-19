export const appConfig = {
  name: 'Vue3 H5 Template',
  version: '1.0.0',
  
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || '',
    timeout: 30000
  },
  
  amap: {
    key: import.meta.env.VITE_AMAP_KEY || '',
    security: import.meta.env.VITE_AMAP_SECURITY || ''
  },
  
  auth: {
    tokenKey: 'token',
    userInfoKey: 'userInfo',
    sessionTTL: 14 * 24 * 60 * 60 * 1000
  },
  
  cache: {
    defaultMemoryTTL: 30000,
    defaultStorageTTL: 60000
  },
  
  storage: {
    prefix: 'app_'
  }
}

export function validateConfig() {
  const errors = []
  
  if (!appConfig.api.baseUrl && import.meta.env.PROD) {
    errors.push('VITE_API_BASE_URL is required in production')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

export default appConfig
