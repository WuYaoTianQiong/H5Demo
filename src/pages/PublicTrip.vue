<template>
  <div class="public-trip-page" :class="{ 'has-error-or-loading': loading || error }">
    <div v-if="loading" class="page-loading">
      <n-spin size="large" />
      <span class="loading-text">加载中...</span>
    </div>

    <div v-else-if="error" class="error-container">
      <n-empty :description="error">
        <template #extra>
          <n-button type="primary" @click="loadTrip">重试</n-button>
        </template>
      </n-empty>
    </div>

    <div v-else-if="trip" class="trip-detail">
      <TripDetailHeader
        :title="tripTitle"
        :year="tripYear"
        :dateRange="tripDateRange"
        :days="tripDays"
        :budget="tripBudget"
        :locations="tripLocations"
        :isLoggedIn="false"
        :isOwner="false"
        @back="handleBack"
      />

      <TripDayTabs
        v-if="days.length > 0"
        :days="days"
        :activeDayIndex="activeDayIndex"
        :dayProgressPercent="0"
        @switch-day="switchDay"
      />

      <TripMapCard
        :currentDayHasLocations="currentDayHasLocations"
        :mapExpanded="mapExpanded"
        :mapFullscreen="mapFullscreen"
        :mapDomId="mapDomId"
        :mapStats="mapStats"
        @reset-view="resetDayMapView"
        @refresh="refreshMap"
        @toggle-fullscreen="handleMapFullscreen"
        @toggle-map="toggleMap"
      />

      <TripCardList
        :currentDayHasCards="currentDayHasCards"
        :currentDayCards="currentDayCards"
        :isLoggedIn="false"
        :progressPercent="0"
        :completedCount="0"
        :totalCount="currentDayCards.length"
        :distances="distances"
        :mergeState="{ isMerging: false, sourceCard: null, selectedCards: [] }"
        :loading="dayLoading"
        @card-click="handleCardClick"
        @toggle-expand="handleToggleExpand"
        @navigate="handleNavigate"
        @navigate-option="handleNavigateOption"
      />

      <div class="bottom-safe-area"></div>

      <div v-if="trip.footerText" class="footer">
        <span>{{ trip.footerText }}</span>
      </div>
    </div>

    <n-empty v-else description="行程不存在或已删除" />

    <!-- 地图选择弹窗 -->
    <MapSelectorModal
      v-model:show="showMapSelector"
      :default-selected="preferredMap"
      @close="handleMapSelectorClose"
      @confirm="handleMapSelectorConfirm"
    />

    <!-- 导航加载提示 -->
    <n-modal
      v-model:show="isNavigating"
      preset="dialog"
      title="正在打开导航"
      :closable="false"
      :mask-closable="true"
      :auto-focus="false"
      class="navigation-loading-modal"
      @mask-click="handleNavigationLoadingCancel"
    >
      <div class="navigation-loading-content">
        <n-spin size="large" />
        <p class="loading-text">正在尝试打开 {{ navigationMapName }}...</p>
        <p class="loading-hint">如果已打开APP，请忽略此提示</p>
      </div>
    </n-modal>

    <!-- 导航确认弹窗 -->
    <ConfirmModal
      v-model:show="showNavigationConfirm"
      :title="'导航状态确认'"
      :content="navigationConfirmContent"
      :confirm-text="'已成功打开'"
      :cancel-text="'使用网页版'"
      :mask-closable="true"
      @close="handleNavigationConfirmWeb"
      @confirm="handleNavigationConfirmSuccess"
      @mask-click="handleNavigationConfirmMaskClick"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NSpin, NEmpty, NButton, useMessage, useDialog } from 'naive-ui'
import { tripApi, tripShareApi, scheduleApi } from '@/services/api'
import TripDetailHeader from '@/components/trip/TripDetailHeader.vue'
import TripDayTabs from '@/components/trip/TripDayTabs.vue'
import TripMapCard from '@/components/trip/TripMapCard.vue'
import TripCardList from '@/components/trip/TripCardList.vue'
import MapSelectorModal from '@/components/MapSelectorModal.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { loadAMapSDK } from '@/composables/useAMap.js'
import { useNavigation } from '@/composables/useNavigation.js'

// ========== 高德地图API配置 ==========
const AMAP_REGEO_PROXY = '/api/amap/regeo'
const AMAP_WEATHER_PROXY = '/api/amap/weather'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()

// 导航功能
const {
  preferredMap,
  loadNavigationPreference,
  saveNavigationPreference,
  openNavigation
} = useNavigation()

// 地图选择弹窗
const showMapSelector = ref(false)
const pendingNavigation = ref(null)

// 导航加载状态
const isNavigating = ref(false)
const navigationMapName = ref('')
let isNavigationCancelled = false // 标记用户是否取消了导航

// 导航确认弹窗
const showNavigationConfirm = ref(false)
const navigationConfirmContent = ref('')
const navigationConfirmWebUrl = ref('')

const loading = ref(true)
const dayLoading = ref(false)
const error = ref('')
const trip = ref(null)
const days = ref([])
const scheduleData = ref({})
const activeDayIndex = ref(0)
const distances = ref([])
const mapExpanded = ref(false)
const mapFullscreen = ref(false)
const mapDomId = ref('')
const mapStats = ref({ spotCount: 0, totalKm: 0, typeCount: 0 })
const amapMap = ref(null)
const amapMarkers = ref([])
const amapPolylines = ref([])
const locationsHash = ref('')

// ========== 天气相关 ==========
const weatherCache = ref({})

// 天气缓存工具函数
const WEATHER_CACHE_KEY = 'amap_weather_cache'
const REGEO_CACHE_KEY = 'amap_regeo_cache'
const CACHE_DURATION = 2 * 60 * 60 * 1000 // 2小时缓存

const loadPersistentCache = (key) => {
  try {
    const data = localStorage.getItem(key)
    if (data) {
      const parsed = JSON.parse(data)
      // 清理过期数据
      const now = Date.now()
      const valid = {}
      for (const [k, v] of Object.entries(parsed)) {
        if (v.timestamp && (now - v.timestamp < CACHE_DURATION)) {
          valid[k] = v
        }
      }
      return valid
    }
  } catch (e) {
    console.warn('[Weather] 加载缓存失败:', e)
  }
  return {}
}

const savePersistentCache = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.warn('[Weather] 保存缓存失败:', e)
  }
}

// 初始化时加载持久化缓存
const regeoCache = loadPersistentCache(REGEO_CACHE_KEY)
const weatherDataCache = loadPersistentCache(WEATHER_CACHE_KEY)
weatherCache.value = { ...regeoCache, ...weatherDataCache }

const tripId = computed(() => trip.value?.id)

const tripTitle = computed(() => trip.value?.title || '行程详情')
const tripYear = computed(() => trip.value?.year || '')
const tripDateRange = computed(() => {
  if (!trip.value) return ''
  const start = formatDateShort(trip.value.startDate)
  const end = formatDateShort(trip.value.endDate)
  if (!start && !end) return ''
  if (start === end) return start
  return `${start} - ${end}`
})
const tripDays = computed(() => trip.value?.days || 0)
const tripBudget = computed(() => {
  if (!trip.value) return ''
  const min = trip.value.budgetPerPersonMin || trip.value.budget_per_person_min
  const max = trip.value.budgetPerPersonMax || trip.value.budget_per_person_max
  const unit = trip.value.budgetUnit || trip.value.budget_unit || '元'
  if (min && max) return `${min}-${max}${unit}`
  if (min) return `${min}${unit}起`
  if (max) return `最高${max}${unit}`
  return ''
})
const tripLocations = computed(() => {
  if (trip.value?.cityList?.length > 0) return trip.value.cityList.join(' · ')
  return ''
})

const currentDayCards = computed(() => {
  if (!days.value || days.value.length === 0) return []
  const currentDay = days.value[activeDayIndex.value]
  if (!currentDay || !currentDay.id) return []
  const data = scheduleData.value[currentDay.id]
  if (Array.isArray(data)) return data
  return []
})

const currentDayHasCards = computed(() => currentDayCards.value.length > 0)

const currentDayHasLocations = computed(() => {
  const currentDay = days.value[activeDayIndex.value]
  if (!currentDay) return false
  const cards = scheduleData.value[currentDay.id]
  if (!Array.isArray(cards)) return false
  return cards.some((card) => {
    const loc = getCardLocation(card)
    const hasCoords = (loc && (loc.lng !== undefined && loc.lat !== undefined)) ||
                      (loc && (loc.longitude !== undefined && loc.latitude !== undefined))
    return hasCoords
  })
})

const formatDateShort = (date) => {
  if (!date) return ''
  if (typeof date === 'string') {
    const parts = date.split('-')
    if (parts.length === 3) {
      const month = parseInt(parts[1], 10)
      const day = parseInt(parts[2], 10)
      if (!isNaN(month) && !isNaN(day)) return `${month}月${day}日`
    }
  }
  return date
}

const getCardLocation = (card) => {
  if (!card) return null
  let loc = null
  if (card.isMulti && card.options && card.options.length > 0) {
    const activeOption = card.options[card.activeOptionIndex || 0]
    loc = activeOption?.locationInfo || activeOption?.location
  }
  if (!loc) {
    loc = card.locationInfo || card.location
  }
  if (loc) {
    if (loc.longitude !== undefined && loc.latitude !== undefined) {
      loc.lng = loc.longitude
      loc.lat = loc.latitude
    }
    if (loc.lng !== undefined && loc.lat !== undefined) {
      loc.longitude = loc.lng
      loc.latitude = loc.lat
    }
  }
  return loc
}

const loadTrip = async () => {
  const shareToken = route.params.token
  const publicId = route.params.id || route.query.id

  if (!shareToken && !publicId) {
    error.value = '缺少行程ID或分享令牌'
    loading.value = false
    return
  }

  loading.value = true
  error.value = ''

  try {
    let tripIdToLoad = publicId

    if (shareToken) {
      const shareRes = await tripShareApi.validate(shareToken)
      
      const shareData = shareRes?.data || shareRes
      tripIdToLoad = shareData?.tripId
      
      if (!tripIdToLoad) {
        throw new Error('无效的分享链接')
      }
    }

    const response = await tripApi.getV2(tripIdToLoad, { template: 'detail', useCache: false })

    const data = response?.data || response
    trip.value = data?.trip || data
    days.value = data?.days || data?.daysList || data?.trip?.days || []

    if (trip.value && days.value.length > 0) {
      await loadDaySchedule(activeDayIndex.value)
    }

    // 恢复滚动位置
    nextTick(() => {
      if (!scrollRestoreDone.value && scrollRestoreTarget.value > 0) {
        const target = scrollRestoreTarget.value
        scrollRestoreDone.value = true
        scrollRestoreTarget.value = 0
        setTimeout(() => {
          window.scrollTo({ top: target, behavior: 'auto' })
        }, 100)
      }
    })
  } catch (err) {
    console.error('[PublicTrip] 加载失败:', err)
    error.value = err.message || '加载失败'
  } finally {
    loading.value = false
  }
}

const loadDaySchedule = async (dayIndex) => {
  if (dayIndex < 0 || dayIndex >= days.value.length) return
  const day = days.value[dayIndex]
  if (!day || !day.id) return

  const dayId = String(day.id)
  if (scheduleData.value[dayId]?._loaded) return

  dayLoading.value = true

  try {
    const res = await scheduleApi.fetchV2(tripId.value, dayId, { template: 'card' })
    const dayDataList = res?.data || []
    const dayData = Array.isArray(dayDataList) ? dayDataList[0] : null
    const events = dayData?.events || []
    const allLocations = res?.locations || []

    const locationMap = new Map()
    allLocations.forEach(loc => {
      const id = loc.id || loc.locationId || loc.location_id || loc.uid
      if (id) {
        locationMap.set(String(id), loc)
        locationMap.set(Number(id), loc)
        if (loc.longitude !== undefined && loc.latitude !== undefined) {
          loc.lng = loc.longitude
          loc.lat = loc.latitude
        }
      }
    })

    const cards = events.map((evt, idx) => createCardFromEvent(evt, idx, dayId, locationMap))
    cards._loaded = true
    scheduleData.value[dayId] = cards

    // 计算距离
    calculateDayDistances()

    // 加载卡片对应位置的天气
    await attachWeatherForCards(cards)
  } catch (err) {
    console.error('[PublicTrip] 加载日程失败:', err)
    scheduleData.value[dayId] = []
    scheduleData.value[dayId]._loaded = true
  } finally {
    dayLoading.value = false
  }
}

const createCardFromEvent = (evt, idx, dayId, locationMap) => {
  const isMulti = evt.cardType === 'multi' || evt.card_type === 'multi' ||
    (Array.isArray(evt.tabs) && evt.tabs.length > 0) ||
    (Array.isArray(evt.options) && evt.options.length > 0)

  let location = evt.location || null
  const locId = evt.locationId || evt.location_id || evt.location_uid
  if (!location && locId) {
    location = locationMap.get(locId) || locationMap.get(String(locId)) || locationMap.get(Number(locId)) || null
  }

  if (location && location.longitude !== undefined && location.latitude !== undefined) {
    location.lng = location.longitude
    location.lat = location.latitude
  }

  const card = {
    id: String(evt.id || evt.uid || `card_${idx}`),
    type: String(evt.type || 'scenic'),
    time: evt.time || evt.startTime || '',
    duration: evt.durationMin ? `${evt.durationMin}分钟` : (evt.duration || ''),
    status: evt.state || '',
    title: evt.title || '',
    description: evt.description || '',
    tags: Array.isArray(evt.tags) ? evt.tags.map(tag => ({
      text: typeof tag === 'string' ? tag : tag.text || tag.name || '',
      color: typeof tag === 'object' ? (tag.color || 'default') : 'default'
    })) : [],
    completed: String(evt.state || '') === 'completed',
    state: evt.state || 'active',
    disabled: evt.disabled || false,
    active: idx === 0,
    expanded: false,
    slided: false,
    location: location,
    locationName: evt.locationName || location?.name || '',
    dayId: dayId,
    rawEvent: evt,
    cardType: evt.cardType || evt.card_type || 'single',
    isMulti: isMulti,
    activeOptionIndex: evt.activeOptionIndex || 0
  }

  if (isMulti) {
    let tabsData = evt.tabs || evt.options || []
    card.options = tabsData.map((tab, tabIdx) => ({
      id: tab.uid || tab.id || `opt_${idx}_${tabIdx}`,
      name: tab.title || tab.name || `选项${tabIdx + 1}`,
      title: tab.title || tab.name || '',
      type: tab.type || evt.type || 'scenic',
      time: tab.time || tab.startTime || '',
      duration: tab.duration || tab.durationMin || '',
      state: tab.state || 'active',
      description: tab.description || '',
      locationId: tab.locationId || tab.location_id,
      location: tab.location,
      tags: Array.isArray(tab.tags) ? tab.tags.map(tag => ({
        text: typeof tag === 'string' ? tag : tag.text || tag.name || '',
        color: typeof tag === 'object' ? (tag.color || 'default') : 'default'
      })) : []
    }))
  }

  return card
}

// ========== 天气相关方法 ==========
const fetchWeatherByLocation = async (location, extensions = 'base') => {
  if (!location) {
    return null
  }

  let city = location.adcode || location.citycode || location.cityname || location.adname || location.pname
  const lng = location.lng || location.longitude
  const lat = location.lat || location.latitude

  if (!city && lng && lat) {
    const locationStr = `${lng},${lat}`
    if (weatherCache.value[locationStr]) {
      city = weatherCache.value[locationStr].adcode || weatherCache.value[locationStr]
    } else {
      try {
        const regeoRes = await fetch(`${AMAP_REGEO_PROXY}?location=${locationStr}`)
        if (!regeoRes.ok) {
          console.error('[Weather] 逆地理编码请求失败:', regeoRes.status, regeoRes.statusText)
        } else {
          const contentType = regeoRes.headers.get('content-type')
          if (!contentType || !contentType.includes('application/json')) {
            const text = await regeoRes.text()
            console.error('[Weather] 逆地理编码返回非JSON:', text.substring(0, 200))
          } else {
            const regeoData = await regeoRes.json()
            if (regeoData?.status === '1' && regeoData?.regeocode?.addressComponent?.adcode) {
              city = regeoData.regeocode.addressComponent.adcode
              weatherCache.value[locationStr] = { adcode: city, timestamp: Date.now() }
              savePersistentCache(REGEO_CACHE_KEY, weatherCache.value)
            }
          }
        }
      } catch (e) {
        console.error('[Weather] 逆地理编码失败:', e)
      }
    }
  }

  if (!city) {
    return null
  }

  // 检查天气缓存
  const now = Date.now()
  const cacheKey = `weather_${city}_${extensions}`
  if (weatherCache.value[cacheKey] && (now - weatherCache.value[cacheKey].timestamp < 3600000)) {
    return weatherCache.value[cacheKey].data
  }

  // 请求天气
  try {
    const res = await fetch(`${AMAP_WEATHER_PROXY}?city=${city}&extensions=${extensions}`)
    const data = await res.json()

    if (data?.status === '1') {
      let weatherInfo = null
      if (extensions === 'base' && data?.lives?.length > 0) {
        const live = data.lives[0]
        weatherInfo = {
          text: `${live.weather} ${live.temperature}℃`,
          type: 'base',
          raw: live
        }
      } else if (extensions === 'all' && data?.forecasts?.length > 0) {
        const forecast = data.forecasts[0]
        weatherInfo = {
          type: 'all',
          casts: forecast.casts,
          raw: forecast
        }
      }

      if (weatherInfo) {
        weatherCache.value[cacheKey] = {
          data: weatherInfo,
          timestamp: now
        }
        savePersistentCache(WEATHER_CACHE_KEY, weatherCache.value)
        return weatherInfo
      }
    }

    console.warn('[Weather] 天气接口无有效数据:', {
      status: data?.status,
      info: data?.info,
      infocode: data?.infocode,
      extensions,
      city
    })
  } catch (e) {
    console.error('[Weather] 天气请求失败:', e)
  }
  return null
}

const attachWeatherForCards = async (cards) => {
  if (!Array.isArray(cards) || cards.length === 0) return

  // 同一时间只对同一个地区(adcode)请求一次天气，避免触发 QPS 限制
  const adcodeToCards = new Map()
  const cardsNeedResolve = []
  const cardsWithStoredWeather = []

  cards.forEach((card) => {
    // 优先使用已存储的天气数据
    if (card.weatherJson) {
      try {
        card.weather = typeof card.weatherJson === 'string' ? JSON.parse(card.weatherJson) : card.weatherJson
        cardsWithStoredWeather.push(card)
        return
      } catch (e) {
        console.warn('[Weather] 解析存储的天气数据失败:', e)
      }
    }

    const loc = getCardLocation(card)
    if (!loc) return

    const lng = loc.lng || loc.longitude
    const lat = loc.lat || loc.latitude
    const adcode = loc.adcode || loc.citycode || loc.cityname || loc.adname || loc.pname

    // 若已有 adcode，先按 adcode 分组；否则后面走逆地理
    if (adcode) {
      const key = String(adcode)
      if (!adcodeToCards.has(key)) adcodeToCards.set(key, [])
      adcodeToCards.get(key).push({ card, loc })
    } else if (lng && lat) {
      cardsNeedResolve.push({ card, loc, locationStr: `${lng},${lat}` })
    }
  })

  if (cardsWithStoredWeather.length > 0) {
    console.log('[Weather] 使用已存储天气数据的卡片数:', cardsWithStoredWeather.length)
  }

  // 1) 先把缺 adcode 的卡片通过逆地理补齐 adcode，并加入分组
  await Promise.all(cardsNeedResolve.map(async (item) => {
    const { card, loc, locationStr } = item
    let adcode = weatherCache.value[locationStr]?.adcode || weatherCache.value[locationStr]
    if (!adcode) {
      try {
        const regeoRes = await fetch(`${AMAP_REGEO_PROXY}?location=${locationStr}`)
        if (!regeoRes.ok) {
          console.error('[Weather] (批量) 逆地理编码请求失败:', regeoRes.status, regeoRes.statusText)
        } else {
          const contentType = regeoRes.headers.get('content-type')
          if (!contentType || !contentType.includes('application/json')) {
            const text = await regeoRes.text()
            console.error('[Weather] (批量) 逆地理编码返回非JSON:', text.substring(0, 200))
          } else {
            const regeoData = await regeoRes.json()
            if (regeoData?.status === '1' && regeoData?.regeocode?.addressComponent?.adcode) {
              adcode = regeoData.regeocode.addressComponent.adcode
              weatherCache.value[locationStr] = { adcode, timestamp: Date.now() }
              savePersistentCache(REGEO_CACHE_KEY, weatherCache.value)
            }
          }
        }
      } catch (e) {
        console.error('[Weather] (批量) 逆地理编码失败:', e)
      }
    }

    if (adcode) {
      // 把 adcode 写回 loc，后续复用
      loc.adcode = adcode
      const key = String(adcode)
      if (!adcodeToCards.has(key)) adcodeToCards.set(key, [])
      adcodeToCards.get(key).push({ card, loc })
    }
  }))

  // 2) 对每个 adcode 请求一次天气，并回填到该组所有卡片
  const adcodes = Array.from(adcodeToCards.keys())

  // 用一个"inflight"表共享同一个请求 Promise，避免竞态并发重复请求
  const weatherInflight = {}

  await Promise.all(adcodes.map(async (adcode) => {
    const group = adcodeToCards.get(adcode) || []
    if (group.length === 0) return

    if (!weatherInflight[adcode]) {
      weatherInflight[adcode] = fetchWeatherByLocation({ adcode })
    }

    const weather = await weatherInflight[adcode]
    if (weather) {
      group.forEach(({ card }) => {
        card.weather = weather
      })
      // 强制触发响应式更新，确保卡片显示天气
      const dayId = days.value[activeDayIndex.value]?.id
      if (dayId && scheduleData.value[dayId]) {
        scheduleData.value[dayId] = [...scheduleData.value[dayId]]
      }
    }
  }))
}

const switchDay = async (index) => {
  activeDayIndex.value = index

  // 保存当前选中的日期索引
  const shareToken = route.params.token
  const publicId = route.params.id || route.query.id
  const tripIdentifier = shareToken || publicId
  if (tripIdentifier) {
    try {
      localStorage.setItem(`public_trip_${tripIdentifier}_activeDayIndex`, String(index))
    } catch (e) {
      console.error('保存日期索引失败:', e)
    }
  }

  await loadDaySchedule(index)
  calculateDayDistances()
  if (mapExpanded.value) {
    nextTick(() => renderDayMap())
  }
}

const handleBack = () => {
  // 检查历史记录，如果有则返回，否则返回首页
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

const handleCardClick = (card) => {
  const dayId = days.value[activeDayIndex.value]?.id
  const cards = scheduleData.value[dayId]
  if (Array.isArray(cards)) {
    cards.forEach(c => { c.active = false })
  }
  card.active = true
}

const handleToggleExpand = (card) => {
  card.expanded = !card.expanded
}

// ========== 导航功能 ==========
const handleNavigate = (card) => {
  // 设置选中效果
  const dayId = days.value[activeDayIndex.value]?.id
  const cards = scheduleData.value[dayId]
  if (Array.isArray(cards)) {
    cards.forEach(c => { c.active = false })
  }
  card.active = true

  const location = card.location || card.rawEvent?.location
  if (!location) {
    message.warning('暂无位置信息')
    return
  }
  const lat = location.latitude || location.lat
  const lng = location.longitude || location.lng
  const name = location.name || card.title
  if (lat && lng) {
    startNavigation(lng, lat, name)
  } else {
    message.warning('位置坐标不完整')
  }
}

const handleNavigateOption = (option, card) => {
  // 设置选中效果（如果传入了卡片）
  if (card) {
    const dayId = days.value[activeDayIndex.value]?.id
    const cards = scheduleData.value[dayId]
    if (Array.isArray(cards)) {
      cards.forEach(c => { c.active = false })
    }
    card.active = true
  }

  const location = option?.location
  if (!location) {
    message.warning('暂无位置信息')
    return
  }
  const lat = location.latitude || location.lat
  const lng = location.longitude || location.lng
  const name = location.name || option.name || option.title
  if (lat && lng) {
    startNavigation(lng, lat, name)
  } else {
    message.warning('位置坐标不完整')
  }
}

const startNavigation = (lng, lat, name) => {
  const isMobile = /mobile|webos|iphone|ipad|ipod|android/i.test(navigator.userAgent.toLowerCase())

  // PC 端直接打开 Web 版
  if (!isMobile) {
    openNavigation('web', lng, lat, name)
    return
  }

  // 移动端：如果有偏好设置，直接使用；否则显示选择器
  if (preferredMap.value) {
    executeNavigation(preferredMap.value, lng, lat, name)
  } else {
    // 存储待导航信息，等待用户选择
    pendingNavigation.value = { lng, lat, name }
    showMapSelector.value = true
  }
}

// 执行导航（带加载提示和确认）
const executeNavigation = (mapKey, lng, lat, name) => {
  const mapNames = {
    amap: '高德地图',
    baidu: '百度地图',
    tencent: '腾讯地图',
    apple: 'Apple 地图',
    google: 'Google 地图'
  }
  navigationMapName.value = mapNames[mapKey] || '地图'

  // 重置取消标记
  isNavigationCancelled = false

  openNavigation(mapKey, lng, lat, name, {
    onLoading: () => {
      // 显示加载提示
      isNavigating.value = true
    },
    onResult: (result) => {
      // 隐藏加载提示
      isNavigating.value = false

      // 如果用户取消了导航，不再显示确认弹窗
      if (isNavigationCancelled) {
        console.log('[Navigation] 用户已取消导航，不显示确认弹窗')
        return
      }

      if (result.type === 'need_confirm') {
        // 显示确认对话框，让用户自己确认状态
        showNavigationConfirmDialog(result)
      }
    }
  }).then((result) => {
    // 如果成功唤起APP，隐藏加载提示
    if (result.success) {
      isNavigating.value = false
    }
  })
}

// 显示导航确认对话框
const showNavigationConfirmDialog = (result) => {
  const { webUrl, mapName } = result
  navigationConfirmContent.value = `是否成功打开${mapName}APP？`
  navigationConfirmWebUrl.value = webUrl
  showNavigationConfirm.value = true
}

// 导航确认成功（APP已打开）
const handleNavigationConfirmSuccess = () => {
  showNavigationConfirm.value = false
}

const handleNavigationConfirmWeb = () => {
  showNavigationConfirm.value = false
  if (navigationConfirmWebUrl.value) {
    window.location.href = navigationConfirmWebUrl.value
  }
}

const handleNavigationConfirmMaskClick = () => {
  showNavigationConfirm.value = false
}

const handleNavigationLoadingCancel = () => {
  isNavigationCancelled = true
  isNavigating.value = false
}

const handleMapSelectorClose = () => {
  showMapSelector.value = false
  pendingNavigation.value = null
}

const handleMapSelectorConfirm = (mapKey, remember) => {
  if (remember) {
    saveNavigationPreference(mapKey)
  }

  if (pendingNavigation.value) {
    const { lng, lat, name } = pendingNavigation.value
    executeNavigation(mapKey, lng, lat, name)
    pendingNavigation.value = null
  }
}

const toggleMap = () => {
  mapExpanded.value = !mapExpanded.value
  if (mapExpanded.value) {
    mapDomId.value = `amap-jsmap-public-${tripId.value || 'trip'}-${activeDayIndex.value}`
    nextTick(() => {
      initDayMap()
    })
  } else {
    if (mapFullscreen.value) {
      mapFullscreen.value = false
      document.body.classList.remove('map-fullscreen-open')
    }
  }
}

const resetDayMapView = () => {
  if (amapMap.value && typeof amapMap.value.setFitView === 'function') {
    amapMap.value.setFitView()
  }
}

const refreshMap = () => {
  if (!mapExpanded.value) return
  nextTick(async () => {
    await renderDayMap(true)
    message.success('地图已刷新')
  })
}

const handleMapFullscreen = () => {
  if (!mapExpanded.value) {
    mapExpanded.value = true
    mapDomId.value = `amap-jsmap-public-${tripId.value || 'trip'}-${activeDayIndex.value}`
    nextTick(() => {
      initDayMap()
      toggleMapFullscreen()
    })
  } else {
    toggleMapFullscreen()
  }
}

const toggleMapFullscreen = () => {
  mapFullscreen.value = !mapFullscreen.value
  const cls = 'map-fullscreen-open'
  if (mapFullscreen.value) {
    document.body.classList.add(cls)
  } else {
    document.body.classList.remove(cls)
  }
  nextTick(() => {
    if (mapFullscreen.value) {
      renderDayMap(true)
    } else {
      if (amapMap.value && typeof amapMap.value.resize === 'function') {
        amapMap.value.resize()
      }
      if (amapMap.value && typeof amapMap.value.setFitView === 'function') {
        amapMap.value.setFitView()
      }
    }
  })
}

const initDayMap = () => {
  if (!mapDomId.value) {
    mapDomId.value = `amap-jsmap-public-${tripId.value || 'trip'}-${activeDayIndex.value}`
  }
  nextTick(() => {
    renderDayMap()
  })
}

const processOverlappingMarkers = (locations, cards) => {
  const processed = locations.map((loc, index) => ({
    originalLoc: loc,
    card: cards[index],
    index: index,
    lng: parseFloat(loc.lng || loc.longitude),
    lat: parseFloat(loc.lat || loc.latitude),
    offsetLng: 0,
    offsetLat: 0,
    labelOnLeft: index % 2 === 1,
  }))
  return processed
}

const waitForMapContainer = () => {
  return new Promise((resolve, reject) => {
    let retries = 0
    const maxRetries = 50
    const check = () => {
      const container = document.getElementById(mapDomId.value)
      if (container && container.offsetWidth > 0) {
        resolve()
        return
      }
      if (retries >= maxRetries) {
        reject(new Error('Map container not ready'))
        return
      }
      retries++
      setTimeout(check, 100)
    }
    check()
  })
}

const updateMapStats = (cards, locations) => {
  const typeSet = new Set(cards.map((c) => c.type).filter(Boolean))
  let totalKm = 0
  for (let i = 0; i < locations.length - 1; i++) {
    const d = calculateDistance(
      parseFloat(locations[i].lat || locations[i].latitude),
      parseFloat(locations[i].lng || locations[i].longitude),
      parseFloat(locations[i + 1].lat || locations[i + 1].latitude),
      parseFloat(locations[i + 1].lng || locations[i + 1].longitude)
    )
    totalKm += d
  }
  mapStats.value = {
    spotCount: locations.length,
    totalKm: Math.round(totalKm * 10) / 10,
    typeCount: typeSet.size,
  }
}

const renderDayMap = async (forceRefresh = false) => {
  const currentDay = days.value[activeDayIndex.value]
  if (!currentDay) {
    return
  }

  const rawCards = scheduleData.value[currentDay.id]
  const cards = Array.isArray(rawCards) ? rawCards : []

  const locations = cards
    .map((card, idx) => {
      const loc = getCardLocation(card)
      return loc
    })
    .filter((loc) => {
      const hasCoords = loc && (
        (loc.lng !== undefined && loc.lng !== null && loc.lat !== undefined && loc.lat !== null) ||
        (loc.longitude !== undefined && loc.longitude !== null && loc.latitude !== undefined && loc.latitude !== null)
      )
      return hasCoords
    })

  if (locations.length === 0) {
    return
  }

  const newHash = JSON.stringify(locations.map((l) => [l.lng || l.longitude, l.lat || l.latitude]))
  if (!forceRefresh && locationsHash.value === newHash && amapMap.value) return
  locationsHash.value = newHash

  try {
    const AMap = await loadAMapSDK()
    await waitForMapContainer()

    if (amapMap.value) {
      amapMap.value.destroy()
      amapMap.value = null
    }

    amapMarkers.value.forEach((m) => m?.setMap?.(null))
    amapPolylines.value.forEach((p) => p?.setMap?.(null))
    amapMarkers.value = []
    amapPolylines.value = []

    const processedMarkers = processOverlappingMarkers(locations, cards)

    const centerLng = locations.reduce((sum, l) => sum + (parseFloat(l.lng || l.longitude) || 0), 0) / locations.length
    const centerLat = locations.reduce((sum, l) => sum + (parseFloat(l.lat || l.latitude) || 0), 0) / locations.length

    amapMap.value = new AMap.Map(mapDomId.value, {
      zoom: 12,
      center: [centerLng, centerLat],
      viewMode: '2D',
      mapStyle: 'amap://styles/normal',
    })

    // 地图标记颜色与行程卡片类型颜色保持一致
    const typeColors = {
      transport: '#ff6b6b',
      hotel: '#ffa502',
      scenic: '#3742fa',
      food: '#2ed573',
      activity: '#eb2f96',
      shopping: '#fa541c',
      other: '#8c8c8c',
      default: '#6366f1'
    }

    processedMarkers.forEach((item) => {
      const { originalLoc, card, index, lng, lat, labelOnLeft } = item
      const placeName = originalLoc.name || card?.title || `地点${index + 1}`
      const cardType = card?.type || 'default'
      const typeColor = typeColors[cardType] || typeColors.default

      const markerContent = `
        <div style="position: relative; width: 28px; height: 28px;">
          <div style="
            position: absolute;
            bottom: 0;
            left: 50%;
            width: 28px;
            height: 28px;
            margin-left: -14px;
            background: #fff;
            border: 3px solid ${typeColor};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          ">
            <span style="
              color: ${typeColor};
              font-size: 12px;
              font-weight: bold;
              transform: rotate(45deg);
            ">${index + 1}</span>
          </div>
          <div style="
            position: absolute;
            bottom: 0;
            ${labelOnLeft ? 'right: 32px;' : 'left: 32px;'}
            background: rgba(255, 255, 255, 0.95);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 14px;
            color: ${typeColor};
            font-weight: 700;
            white-space: nowrap;
            box-shadow: 0 1px 4px rgba(0,0,0,0.15);
            max-width: 180px;
            overflow: hidden;
            text-overflow: ellipsis;
          ">${placeName}</div>
        </div>
      `

      const marker = new AMap.Marker({
        position: [lng, lat],
        title: placeName,
        content: markerContent,
        anchor: 'bottom-center',
      })

      marker.setMap(amapMap.value)
      amapMarkers.value.push(marker)

      const realPoint = new AMap.CircleMarker({
        center: [lng, lat],
        radius: 8,
        fillColor: typeColor,
        fillOpacity: 0.6,
        strokeColor: '#fff',
        strokeWeight: 2,
      })
      realPoint.setMap(amapMap.value)
      amapPolylines.value.push(realPoint)
    })

    if (locations.length > 1) {
      const path = locations.map((l) => [parseFloat(l.lng || l.longitude), parseFloat(l.lat || l.latitude)])
      const polyline = new AMap.Polyline({
        path: path,
        strokeColor: '#3b82f6',
        strokeWeight: 3,
        strokeOpacity: 0.8,
        strokeStyle: 'solid',
      })
      polyline.setMap(amapMap.value)
      amapPolylines.value.push(polyline)
    }

    amapMap.value.setFitView()
    updateMapStats(cards, locations)

  } catch (error) {
    console.error('[PublicTrip] 地图渲染失败:', error)
  }
}

const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const calculateDayDistances = () => {
  const currentDay = days.value[activeDayIndex.value]
  if (!currentDay) return
  const rawCards = scheduleData.value[currentDay.id]
  const cards = Array.isArray(rawCards) ? rawCards : []
  const locations = cards.map(card => getCardLocation(card)).filter(loc => loc && loc.lng && loc.lat)
  distances.value = []
  for (let i = 0; i < locations.length - 1; i++) {
    const distance = calculateDistance(
      locations[i].lat,
      locations[i].lng,
      locations[i + 1].lat,
      locations[i + 1].lng
    )
    distances.value.push({ fromIndex: i, toIndex: i + 1, distance: Math.round(distance) })
  }
}

// ========== 滚动位置相关方法 ==========
const scrollRestoreDone = ref(false)
const scrollRestoreTarget = ref(0)

const saveScrollPosition = () => {
  const shareToken = route.params.token
  const publicId = route.params.id || route.query.id
  const tripIdentifier = shareToken || publicId
  if (!tripIdentifier) return

  const top = window.pageYOffset || document.documentElement.scrollTop || 0

  // 只保存有意义的滚动位置（大于 50px）
  if (top < 50) return

  try {
    localStorage.setItem(`public_trip_${tripIdentifier}_scrollTop`, String(top))
    localStorage.setItem(`public_trip_${tripIdentifier}_scrollTs`, String(Date.now()))
  } catch (err) {
    console.error('保存滚动位置失败:', err)
  }
}

const restoreScrollPosition = () => {
  const shareToken = route.params.token
  const publicId = route.params.id || route.query.id
  const tripIdentifier = shareToken || publicId
  if (!tripIdentifier) return

  try {
    const savedScrollTop = localStorage.getItem(`public_trip_${tripIdentifier}_scrollTop`)
    const savedTs = localStorage.getItem(`public_trip_${tripIdentifier}_scrollTs`)

    // 如果是 1 小时内的滚动位置，则尝试恢复
    if (savedScrollTop && savedTs && (Date.now() - parseInt(savedTs) < 3600000)) {
      scrollRestoreTarget.value = Number(savedScrollTop)
    } else {
      scrollRestoreDone.value = true
    }

    const savedDayIndex = localStorage.getItem(`public_trip_${tripIdentifier}_activeDayIndex`)
    if (savedDayIndex !== null && savedDayIndex !== undefined) {
      activeDayIndex.value = parseInt(savedDayIndex, 10) || 0
    }
  } catch (e) {
    console.error('恢复滚动位置失败:', e)
    scrollRestoreDone.value = true
  }
}

const handlePageScroll = () => {
  saveScrollPosition()
}

onMounted(() => {
  restoreScrollPosition()
  loadTrip()
  loadNavigationPreference()
  window.addEventListener('scroll', handlePageScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handlePageScroll)
})
</script>

<style scoped>
.public-trip-page {
  min-height: 100vh;
  background: #fcfaf2;
  padding-bottom: 20px;
}

.public-trip-page.has-error-or-loading {
  padding-bottom: 0;
  min-height: auto;
  height: 100vh;
  overflow: hidden;
}

.page-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: #fcfaf2;
  z-index: 100;
}

.loading-text {
  font-size: 14px;
  color: #64748b;
}

.error-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: #fcfaf2;
  z-index: 100;
}

.trip-detail {
  min-height: auto;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
}

.bottom-safe-area {
  height: 20px;
}

.footer {
  padding: 20px 16px;
  text-align: center;
  font-size: 12px;
  color: #94a3b8;
}

/* 导航加载提示 */
.navigation-loading-modal :deep(.n-modal-body) {
  padding: 24px;
}

.navigation-loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 16px 0;
}

.navigation-loading-content .loading-text {
  font-size: 16px;
  color: #333;
  font-weight: 500;
  margin: 0;
}

.navigation-loading-content .loading-hint {
  font-size: 13px;
  color: #999;
  margin: 0;
}


</style>
