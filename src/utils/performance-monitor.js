/**
 * 性能监控工具
 * 用于监控 API 请求耗时、页面加载性能等
 */

// 性能日志存储
const PERF_STORAGE_KEY = 'performance_logs'
const MAX_LOGS = 200 // 最多保留200条日志

/**
 * 获取存储的性能日志
 */
function getStoredLogs() {
  try {
    const logs = uni.getStorageSync(PERF_STORAGE_KEY)
    return logs || []
  } catch (e) {
    return []
  }
}

/**
 * 保存性能日志
 * 优化：处理存储溢出，自动清理旧日志
 */
function saveLogs(logs) {
  try {
    uni.setStorageSync(PERF_STORAGE_KEY, logs.slice(0, MAX_LOGS))
  } catch (e) {
    // 存储空间不足，清理一半旧日志
    if (e.message?.includes('quota') || e.name === 'QuotaExceededError') {
      console.warn('[Performance] 存储空间不足，清理旧日志')
      try {
        const reducedLogs = logs.slice(0, Math.floor(MAX_LOGS / 2))
        uni.setStorageSync(PERF_STORAGE_KEY, reducedLogs)
      } catch (e2) {
        // 仍然失败，清空存储
        console.error('[Performance] 清理后仍无法保存，清空日志')
        uni.removeStorageSync(PERF_STORAGE_KEY)
      }
    } else {
      console.error('[Performance] 保存日志失败:', e)
    }
  }
}

/**
 * 添加性能日志
 */
function addLog(type, data) {
  const logs = getStoredLogs()
  const log = {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    timestamp: Date.now(),
    dateTime: new Date().toISOString(),
    ...data
  }
  logs.unshift(log)
  saveLogs(logs)
  return log
}

/**
 * 监控 API 请求耗时（在业务层使用）
 * @param {string} apiName - API 名称
 * @param {Function} requestFn - 请求函数
 * @param {...any} args - 请求参数
 */
export async function monitorApiRequest(apiName, requestFn, ...args) {
  const startTime = Date.now()
  const startMemory = getMemoryInfo()
  
  console.log(`[Performance] 开始请求 ${apiName}`)
  
  try {
    const result = await requestFn(...args)
    
    const endTime = Date.now()
    const duration = endTime - startTime
    const endMemory = getMemoryInfo()
    
    const log = addLog('api_request', {
      apiName,
      duration,
      startTime,
      endTime,
      success: true,
      memoryDelta: endMemory - startMemory,
      args: args.map(arg => typeof arg === 'object' ? '[Object]' : arg)
    })
    
    // 根据耗时打印不同级别的日志
    if (duration > 3000) {
      console.error(`[Performance][SLOW] ${apiName} 耗时: ${duration}ms`)
    } else if (duration > 1000) {
      console.warn(`[Performance][WARN] ${apiName} 耗时: ${duration}ms`)
    } else {
      console.log(`[Performance][OK] ${apiName} 耗时: ${duration}ms`)
    }
    
    return result
  } catch (error) {
    const endTime = Date.now()
    const duration = endTime - startTime
    
    addLog('api_request', {
      apiName,
      duration,
      startTime,
      endTime,
      success: false,
      error: error.message || 'Unknown error',
      args: args.map(arg => typeof arg === 'object' ? '[Object]' : arg)
    })
    
    console.error(`[Performance][ERROR] ${apiName} 耗时: ${duration}ms, 错误: ${error.message}`)
    throw error
  }
}

/**
 * 获取内存信息（如果支持）
 */
function getMemoryInfo() {
  // #ifdef APP-PLUS || H5
  if (typeof performance !== 'undefined' && performance.memory) {
    return performance.memory.usedJSHeapSize || 0
  }
  // #endif
  return 0
}

/**
 * 监控页面加载性能
 */
export function monitorPageLoad(pageName) {
  const startTime = Date.now()
  
  // #ifdef H5
  if (typeof window !== 'undefined' && window.performance) {
    const navigation = window.performance.timing
    const pageLoadTime = navigation.loadEventEnd - navigation.navigationStart
    const domReadyTime = navigation.domContentLoadedEventEnd - navigation.navigationStart
    
    addLog('page_load', {
      pageName,
      pageLoadTime,
      domReadyTime,
      navigation: {
        dns: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcp: navigation.connectEnd - navigation.connectStart,
        request: navigation.responseEnd - navigation.requestStart,
        dom: navigation.domComplete - navigation.domLoading
      }
    })
    
    console.log(`[Performance] 页面 ${pageName} 加载完成:`)
    console.log(`  - 总加载时间: ${pageLoadTime}ms`)
    console.log(`  - DOM Ready: ${domReadyTime}ms`)
  }
  // #endif
  
  // 返回一个函数用于记录页面离开
  return function onPageUnload() {
    const duration = Date.now() - startTime
    addLog('page_stay', {
      pageName,
      duration
    })
    console.log(`[Performance] 页面 ${pageName} 停留时间: ${duration}ms`)
  }
}

/**
 * 监控组件渲染性能
 */
export function monitorComponentRender(componentName) {
  const startTime = Date.now()
  
  return {
    markRendered: () => {
      const duration = Date.now() - startTime
      addLog('component_render', {
        componentName,
        duration
      })
      
      if (duration > 100) {
        console.warn(`[Performance] 组件 ${componentName} 渲染较慢: ${duration}ms`)
      } else {
        console.log(`[Performance] 组件 ${componentName} 渲染: ${duration}ms`)
      }
    }
  }
}

/**
 * 获取性能报告
 */
export function getPerformanceReport(options = {}) {
  const { 
    startTime = Date.now() - 24 * 60 * 60 * 1000, // 默认最近24小时
    endTime = Date.now(),
    type = null 
  } = options
  
  const logs = getStoredLogs()
  const filteredLogs = logs.filter(log => {
    const inTimeRange = log.timestamp >= startTime && log.timestamp <= endTime
    const matchType = type ? log.type === type : true
    return inTimeRange && matchType
  })
  
  // API 请求统计
  const apiRequests = filteredLogs.filter(log => log.type === 'api_request')
  const apiStats = {
    total: apiRequests.length,
    success: apiRequests.filter(l => l.success).length,
    failed: apiRequests.filter(l => !l.success).length,
    avgDuration: 0,
    maxDuration: 0,
    minDuration: Infinity,
    slowRequests: []
  }
  
  if (apiRequests.length > 0) {
    const durations = apiRequests.map(l => l.duration)
    apiStats.avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    apiStats.maxDuration = Math.max(...durations)
    apiStats.minDuration = Math.min(...durations)
    apiStats.slowRequests = apiRequests
      .filter(l => l.duration > 1000)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
  }
  
  // 按 API 名称分组统计
  const apiByName = {}
  apiRequests.forEach(log => {
    const name = log.apiName
    if (!apiByName[name]) {
      apiByName[name] = { count: 0, totalDuration: 0, avgDuration: 0 }
    }
    apiByName[name].count++
    apiByName[name].totalDuration += log.duration
  })
  
  Object.keys(apiByName).forEach(name => {
    apiByName[name].avgDuration = Math.round(apiByName[name].totalDuration / apiByName[name].count)
  })
  
  return {
    timeRange: { startTime, endTime },
    totalLogs: filteredLogs.length,
    apiStats,
    apiByName,
    logs: filteredLogs.slice(0, 50) // 最多返回50条详细日志
  }
}

/**
 * 打印性能报告到控制台
 */
export function printPerformanceReport(options = {}) {
  const report = getPerformanceReport(options)
  
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║                   性能监控报告                              ║')
  console.log('╠════════════════════════════════════════════════════════════╣')
  console.log(`║ 统计时间范围: ${new Date(report.timeRange.startTime).toLocaleString()}`.slice(0, 58).padEnd(58) + ' ║')
  console.log(`║            至 ${new Date(report.timeRange.endTime).toLocaleString()}`.slice(0, 58).padEnd(58) + ' ║')
  console.log('╠════════════════════════════════════════════════════════════╣')
  console.log('║ API 请求统计:                                              ║')
  console.log(`║   总请求数: ${report.apiStats.total.toString().padEnd(45)} ║`)
  console.log(`║   成功: ${report.apiStats.success.toString().padEnd(49)} ║`)
  console.log(`║   失败: ${report.apiStats.failed.toString().padEnd(49)} ║`)
  console.log(`║   平均耗时: ${(report.apiStats.avgDuration + 'ms').padEnd(45)} ║`)
  console.log(`║   最大耗时: ${(report.apiStats.maxDuration + 'ms').padEnd(45)} ║`)
  console.log(`║   最小耗时: ${(report.apiStats.minDuration + 'ms').padEnd(45)} ║`)
  console.log('╠════════════════════════════════════════════════════════════╣')
  
  if (report.apiStats.slowRequests.length > 0) {
    console.log('║ 慢请求 TOP 10 ( > 1000ms ):                                ║')
    report.apiStats.slowRequests.forEach((req, index) => {
      console.log(`║  ${index + 1}. ${req.apiName}: ${req.duration}ms`.slice(0, 58).padEnd(58) + ' ║')
    })
  }
  
  console.log('╠════════════════════════════════════════════════════════════╣')
  console.log('║ 各 API 平均耗时:                                           ║')
  Object.entries(report.apiByName)
    .sort((a, b) => b[1].avgDuration - a[1].avgDuration)
    .forEach(([name, stats]) => {
      console.log(`║  ${name}: ${stats.avgDuration}ms (${stats.count}次)`.slice(0, 58).padEnd(58) + ' ║')
    })
  
  console.log('╚════════════════════════════════════════════════════════════╝')
  
  return report
}

/**
 * 清除性能日志
 */
export function clearPerformanceLogs() {
  try {
    uni.removeStorageSync(PERF_STORAGE_KEY)
    console.log('[Performance] 已清除所有性能日志')
  } catch (e) {
    console.error('[Performance] 清除日志失败:', e)
  }
}

/**
 * 导出性能数据（用于分享或上报）
 */
export function exportPerformanceData() {
  const logs = getStoredLogs()
  const report = getPerformanceReport()
  
  return {
    exportTime: new Date().toISOString(),
    userAgent: '',
    logs,
    report
  }
}

// 默认导出
export default {
  monitorApiRequest,
  monitorPageLoad,
  monitorComponentRender,
  getPerformanceReport,
  printPerformanceReport,
  clearPerformanceLogs,
  exportPerformanceData
}
