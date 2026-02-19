// ============================================
// 高德地图配置 - 从环境变量读取
// ============================================
// 本地开发: 从根目录 .dev.vars 读取 (VITE_ 前缀)
// 云端部署: 从 Cloudflare Pages 环境变量读取
// ============================================

// 获取环境变量（支持 import.meta.env 和 process.env）
const getEnv = (key, defaultValue = '') => {
  // Vite 环境变量
  if (import.meta.env && import.meta.env[key] !== undefined) {
    return import.meta.env[key]
  }
  // 普通环境变量
  if (typeof process !== 'undefined' && process.env && process.env[key] !== undefined) {
    return process.env[key]
  }
  return defaultValue
}

// 高德地图配置
export const AMAP_CONFIG = {
  // JSAPI Key (用于加载地图 SDK)
  AMAP_JSAPI_KEY: getEnv('VITE_AMAP_KEY', ''),
  // JSAPI 安全密钥
  AMAP_JSAPI_SECURITY: getEnv('VITE_AMAP_SECURITY', ''),
  // Web服务 Key (用于后端 API 调用)
  AMAP_KEY: getEnv('VITE_AMAP_KEY', ''),
}

// 验证配置是否完整
export function validateAMapConfig() {
  const missing = []
  if (!AMAP_CONFIG.AMAP_JSAPI_KEY) missing.push('VITE_AMAP_KEY')
  if (!AMAP_CONFIG.AMAP_JSAPI_SECURITY) missing.push('VITE_AMAP_SECURITY')

  if (missing.length > 0) {
    console.warn('[AMap] 缺少高德地图配置:', missing.join(', '))
    console.warn('[AMap] 请在根目录 .dev.vars (本地) 或 Cloudflare Pages 环境变量 (云端) 中设置')
    return false
  }
  return true
}

export default AMAP_CONFIG
