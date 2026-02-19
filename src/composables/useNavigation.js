import { ref } from 'vue'

const NAVIGATION_PREFERENCE_KEY = 'navigation_preference'

// 地图配置
const mapConfigs = {
  amap: {
    name: '高德地图',
    scheme: (lat, lng, name, isIOS) => isIOS
      ? `iosamap://path?sourceApplication=TravelApp&dlat=${lat}&dlon=${lng}&dname=${encodeURIComponent(name)}&dev=0&t=0`
      : `amapuri://route/plan/?sid=&did=${lng},${lat},${encodeURIComponent(name)}&dlat=${lat}&dlon=${lng}&dname=${encodeURIComponent(name)}&dev=0&t=0`,
    universalLink: (lat, lng, name) => `https://uri.amap.com/navigation?to=${lng},${lat},${encodeURIComponent(name)}&mode=car&policy=1`,
    web: (lat, lng, name) => `https://uri.amap.com/navigation?to=${lng},${lat},${encodeURIComponent(name)}&mode=car&policy=1`
  },
  baidu: {
    name: '百度地图',
    scheme: (lat, lng, name) => `baidumap://map/direction?destination=${lat},${lng}&coord_type=wgs84&mode=driving&src=TravelApp`,
    web: (lat, lng, name) => `https://map.baidu.com/dir/${lat},${lng}/${encodeURIComponent(name)}`
  },
  tencent: {
    name: '腾讯地图',
    scheme: (lat, lng, name) => `qqmap://map/routeplan?type=drive&to=${encodeURIComponent(name)}&tocoord=${lat},${lng}&coord_type=1`,
    web: (lat, lng, name) => `https://map.qq.com/?type=drive&to=${encodeURIComponent(name)}&tocoord=${lat},${lng}`
  },
  apple: {
    name: 'Apple 地图',
    scheme: (lat, lng, name) => `http://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(name)}`,
    web: (lat, lng, name) => `http://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(name)}`
  },
  google: {
    name: 'Google 地图',
    scheme: (lat, lng, name) => `comgooglemaps://?daddr=${lat},${lng}&q=${encodeURIComponent(name)}`,
    web: (lat, lng, name) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  },
  web: {
    name: '浏览器打开',
    scheme: (lat, lng, name) => `https://uri.amap.com/navigation?to=${lng},${lat},${encodeURIComponent(name)}&mode=car&policy=1`,
    web: (lat, lng, name) => `https://uri.amap.com/navigation?to=${lng},${lat},${encodeURIComponent(name)}&mode=car&policy=1`
  }
}

export function useNavigation() {
  const preferredMap = ref('')

  // 加载用户偏好的地图
  const loadNavigationPreference = () => {
    try {
      const saved = localStorage.getItem(NAVIGATION_PREFERENCE_KEY)
      if (saved) {
        preferredMap.value = saved
      }
    } catch (e) {
      console.warn('[Navigation] 加载偏好设置失败:', e)
    }
  }

  // 保存用户偏好的地图
  const saveNavigationPreference = (mapKey) => {
    try {
      localStorage.setItem(NAVIGATION_PREFERENCE_KEY, mapKey)
      preferredMap.value = mapKey
    } catch (e) {
      console.warn('[Navigation] 保存偏好设置失败:', e)
    }
  }

  // 清除用户偏好的地图
  const clearNavigationPreference = () => {
    try {
      localStorage.removeItem(NAVIGATION_PREFERENCE_KEY)
      preferredMap.value = ''
    } catch (e) {
      console.warn('[Navigation] 清除偏好设置失败:', e)
    }
  }

  // 打开导航
  // options: {
  //   onLoading: () => void - 开始唤起APP时的回调（显示加载提示）
  //   onResult: (result) => void - 唤起结果回调（成功/失败/需要确认）
  // }
  const openNavigation = (mapKey, lng, lat, name = '目的地', options = {}) => {
    const ua = navigator.userAgent.toLowerCase()
    const isIOS = /iphone|ipad|ipod/.test(ua)
    const isAndroid = /android/.test(ua)
    const isHarmonyOS = /harmony|harmonyos|openharmony/.test(ua) ||
      (navigator.userAgent.includes('Huawei') && !isAndroid)

    const config = mapConfigs[mapKey] || mapConfigs.web

    // PC 端直接打开 Web 版
    // 注意：开发者工具的"手机模拟"只是改变了 UA 和 viewport，并不支持 scheme 唤起
    const isPC = !isIOS && !isAndroid && !isHarmonyOS
    if (isPC) {
      window.open(config.web(lat, lng, name), '_blank', 'noopener,noreferrer')
      return Promise.resolve({ success: true, type: 'web' })
    }

    // 浏览器打开直接跳转
    if (mapKey === 'web') {
      window.location.href = config.web(lat, lng, name)
      return Promise.resolve({ success: true, type: 'web' })
    }

    // 移动端尝试唤起 APP
    return new Promise((resolve) => {
      let hasResponded = false
      let startTime = Date.now()

      const urlToOpen = config.scheme(lat, lng, name, isIOS)
      const webUrl = config.web(lat, lng, name)

      if (options.onLoading) {
        options.onLoading()
      }

      const iframe = document.createElement('iframe')
      iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;visibility:hidden;'
      iframe.src = urlToOpen
      document.body.appendChild(iframe)

      setTimeout(() => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe)
        }
      }, 100)

      const handleVisibilityChange = () => {
        if (document.hidden && !hasResponded) {
          hasResponded = true
          cleanup()
          resolve({ success: true, type: 'app', mapKey })
        }
      }

      const handleBlur = () => {
        if (!hasResponded) {
          hasResponded = true
          cleanup()
          resolve({ success: true, type: 'app', mapKey })
        }
      }

      const cleanup = () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('blur', handleBlur)
        if (timeoutId) clearTimeout(timeoutId)
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('blur', handleBlur)

      let timeoutId = setTimeout(() => {
        cleanup()

        if (!hasResponded && !document.hidden) {
          const result = { success: false, type: 'need_confirm', webUrl, mapKey, mapName: config.name }

          if (options.onResult) {
            options.onResult(result)
          }

          resolve(result)
        }
      }, 2500)
    })
  }

  // 获取地图配置
  const getMapConfig = (key) => mapConfigs[key]

  // 获取所有可用地图
  const getAvailableMaps = () => {
    const ua = navigator.userAgent.toLowerCase()
    const isIOS = /iphone|ipad|ipod/.test(ua)

    return [
      { key: 'amap', name: '高德地图', icon: '📍', color: '#4285f4', description: '路线规划精准，实时路况', recommended: true },
      { key: 'baidu', name: '百度地图', icon: '🗺️', color: '#2932e1', description: 'POI数据丰富，街景清晰' },
      { key: 'tencent', name: '腾讯地图', icon: '🧭', color: '#00bfff', description: '微信生态，社交分享方便' },
      { key: 'apple', name: 'Apple 地图', icon: '🍎', color: '#007aff', description: 'iOS 原生体验，隐私保护', recommended: isIOS },
      { key: 'google', name: 'Google 地图', icon: '🌐', color: '#4285f4', description: '全球覆盖，海外出行首选' },
      { key: 'web', name: '浏览器打开', icon: '🌐', color: '#666666', description: '无需安装APP，直接网页导航' }
    ]
  }

  return {
    preferredMap,
    loadNavigationPreference,
    saveNavigationPreference,
    clearNavigationPreference,
    openNavigation,
    getMapConfig,
    getAvailableMaps
  }
}
