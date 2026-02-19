/**
 * 高德地图 SDK 封装 Composable
 * 统一处理高德地图 JSAPI 的加载、初始化和常用功能
 */
import { AMAP_CONFIG } from '@/utils/amap-config.js'

let amapLoadPromise = null

export function loadAMapSDK() {
  if (!AMAP_CONFIG.AMAP_JSAPI_KEY) {
    return Promise.reject(new Error('缺少高德地图Key配置'))
  }

  if (amapLoadPromise) {
    return amapLoadPromise
  }

  amapLoadPromise = new Promise((resolve, reject) => {
    try {
      if (window.AMap) {
        resolve(window.AMap)
        return
      }

      window._AMapSecurityConfig = {
        securityJsCode: AMAP_CONFIG.AMAP_JSAPI_SECURITY,
      }

      const scriptId = 'amap-jsapi'
      const existing = document.getElementById(scriptId)
      if (existing) {
        const checkAMap = setInterval(() => {
          if (window.AMap) {
            clearInterval(checkAMap)
            resolve(window.AMap)
          }
        }, 100)
        setTimeout(() => {
          clearInterval(checkAMap)
          reject(new Error('AMap load timeout'))
        }, 10000)
        return
      }

      const script = document.createElement('script')
      script.id = scriptId
      script.async = true
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(
        AMAP_CONFIG.AMAP_JSAPI_KEY
      )}&plugin=AMap.PlaceSearch,AMap.AutoComplete,AMap.PlacePicker,AMap.Geolocation`

      script.onload = () => {
        const checkAMap = setInterval(() => {
          if (window.AMap) {
            clearInterval(checkAMap)
            resolve(window.AMap)
          }
        }, 100)
        setTimeout(() => {
          clearInterval(checkAMap)
          reject(new Error('AMap load timeout'))
        }, 10000)
      }
      script.onerror = (err) => {
        reject(err)
      }

      document.head.appendChild(script)
    } catch (err) {
      reject(err)
    }
  })

  return amapLoadPromise
}

export async function initMap(containerId, options = {}) {
  const AMap = await loadAMapSDK()
  
  const defaultOptions = {
    zoom: 15,
    viewMode: '2D',
    resizeEnable: true,
  }

  await waitForContainer(containerId)

  const map = new AMap.Map(containerId, {
    ...defaultOptions,
    ...options,
  })

  return new Promise((resolve) => {
    map.on('complete', () => resolve(map))
  })
}

function waitForContainer(containerId, maxRetries = 30) {
  return new Promise((resolve, reject) => {
    let retries = 0
    const check = () => {
      const container = document.getElementById(containerId)
      if (container) {
        resolve()
        return
      }
      if (retries >= maxRetries) {
        reject(new Error(`Container #${containerId} not found`))
        return
      }
      retries++
      setTimeout(check, 100)
    }
    check()
  })
}

export async function createPlaceSearch(options = {}) {
  const AMap = await loadAMapSDK()
  
  return new Promise((resolve) => {
    AMap.plugin(['AMap.PlaceSearch'], () => {
      const placeSearch = new AMap.PlaceSearch({
        pageSize: 20,
        pageIndex: 1,
        extensions: 'all',
        ...options,
      })
      resolve(placeSearch)
    })
  })
}

export async function createAutoComplete(options = {}) {
  const AMap = await loadAMapSDK()
  
  return new Promise((resolve) => {
    AMap.plugin(['AMap.AutoComplete'], () => {
      const autoComplete = new AMap.AutoComplete({
        city: '全国',
        ...options,
      })
      resolve(autoComplete)
    })
  })
}

export function searchPlace(placeSearch, keyword) {
  return new Promise((resolve) => {
    placeSearch.search(keyword, (status, result) => {
      if (status === 'complete' && result?.poiList?.pois) {
        resolve(result.poiList.pois.map(normalizePoi))
      } else {
        resolve([])
      }
    })
  })
}

export function searchNearby(placeSearch, center, radius = 800) {
  return new Promise((resolve) => {
    placeSearch.searchNearBy('', center, radius, (status, result) => {
      if (status === 'complete' && result?.poiList?.pois) {
        resolve(result.poiList.pois.map(normalizePoi))
      } else {
        resolve([])
      }
    })
  })
}

export function autoCompleteSearch(autoComplete, keyword) {
  return new Promise((resolve) => {
    autoComplete.search(keyword, (status, result) => {
      if (status === 'complete' && result?.tips) {
        resolve(result.tips)
      } else {
        resolve([])
      }
    })
  })
}

function normalizePoi(poi) {
  if (!poi) return null
  return {
    id: poi.id,
    name: poi.name,
    address: poi.address,
    location: poi.location,
    distance: poi.distance,
    type: poi.type,
    cityname: poi.cityname,
    adname: poi.adname,
    pname: poi.pname,
    adcode: poi.adcode,
  }
}

export function parseLocation(location) {
  if (!location) return null
  const [lng, lat] = String(location).split(',').map(Number)
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
  return { lng, lat }
}

export function getPoiIcon(poi) {
  const type = poi?.type || ''
  if (type.includes('景点') || type.includes('旅游')) return '🏔️'
  if (type.includes('餐厅') || type.includes('美食')) return '🍽️'
  if (type.includes('酒店') || type.includes('住宿')) return '🏨'
  if (type.includes('商场') || type.includes('购物')) return '🛍️'
  if (type.includes('医院') || type.includes('医疗')) return '🏥'
  if (type.includes('银行')) return '🏦'
  if (type.includes('学校') || type.includes('教育')) return '🏫'
  if (type.includes('交通') || type.includes('车站')) return '🚗'
  if (type.includes('加油站')) return '⛽'
  if (type.includes('停车场')) return '🅿️'
  return '📍'
}

export function useAMap() {
  return {
    loadAMapSDK,
    initMap,
    createPlaceSearch,
    createAutoComplete,
    searchPlace,
    searchNearby,
    autoCompleteSearch,
    parseLocation,
    getPoiIcon,
  }
}
