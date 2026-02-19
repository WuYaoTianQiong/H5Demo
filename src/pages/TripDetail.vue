<template>
  <div class="trip-detail-page" :class="{ 'has-error-or-loading': loading || error }">
    <div v-if="loading" class="page-loading">
      <n-spin size="large" />
      <span class="loading-text">加载中...</span>
    </div>

    <div v-else-if="error" class="error-container">
      <n-empty description="加载失败">
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
        :isLoggedIn="isLoggedIn"
        :isOwner="isOwner"
        @back="handleBack"
        @edit="handleEdit"
      />

      <TripDayTabs
        v-if="days.length > 0"
        :days="days"
        :activeDayIndex="activeDayIndex"
        :dayProgressPercent="progressPercent"
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
        ref="tripCardListRef"
        :currentDayHasCards="currentDayHasCards"
        :currentDayCards="currentDayCards"
        :isLoggedIn="isLoggedIn"
        :progressPercent="progressPercent"
        :completedCount="completedCount"
        :totalCount="totalCount"
        :distances="distances"
        :mergeState="mergeState"
        :loading="dayLoading"
        @card-click="handleCardClick"
        @add-event="handleAddEventAtIndex"
        @edit="handleCardEdit"
        @delete="handleDelete"
        @toggle-status="handleToggleStatus"
        @toggle-complete="handleToggleComplete"
        @toggle-expand="handleToggleExpand"
        @switch-option="handleSwitchOption"
        @toggle-option-complete="handleToggleOptionComplete"
        @navigate="handleNavigate"
        @navigate-option="handleNavigateOption"
        @sort-start="onCardSortStart"
        @sort-end="onCardSortEnd"
        @sort-change="onCardSortChange"
        @start-merge="handleStartMerge"
        @split="handleSplit"
        @toggle-slide="handleToggleSlide"
      />

      <div class="bottom-safe-area"></div>

      <n-button
        v-if="isLoggedIn && !mergeState.isMerging"
        class="fab-add-btn"
        type="primary"
        circle
        size="large"
        @click="handleAddEvent"
      >
        <template #icon>
          <n-icon :component="PlusOutlined" />
        </template>
      </n-button>

      <div v-if="mergeState.isMerging" class="merge-action-bar">
        <div class="merge-action-content">
          <span class="merge-hint">已选择 {{ mergeState.selectedCards.length }} 个卡片</span>
          <div class="merge-action-btns">
            <n-button class="merge-btn-cancel" @click="cancelMerge">取消</n-button>
            <n-button 
              type="primary" 
              class="merge-btn-confirm" 
              :disabled="mergeState.selectedCards.length === 0"
              @click="confirmMerge"
            >
              确认合并
            </n-button>
          </div>
        </div>
      </div>

      <div class="action-bar">
        <div class="action-item" @click="handleShare">
          <n-icon :component="ShareAltOutlined" size="20" />
          <span>分享</span>
        </div>
        <div
          class="action-item"
          :class="{ readonly: !isLoggedIn }"
          @click="isLoggedIn && handleVisibility()"
        >
          <n-icon :component="getVisibilityIcon()" size="20" :style="{ color: getVisibilityColor() }" />
          <span :style="{ color: getVisibilityColor() }">{{ getVisibilityText() }}</span>
        </div>
        <div class="action-item" @click="handleExport">
          <n-icon :component="DownloadOutlined" size="20" />
          <span>导出</span>
        </div>
      </div>

      <div v-if="trip.footerText" class="footer">
        <span>{{ trip.footerText }}</span>
      </div>
    </div>

    <n-empty v-else description="行程不存在或已删除" />

    <TripModal
      :show="showEditModal"
      :editing-trip="trip"
      @close="showEditModal = false"
      @save="handleSave"
    />

    <n-modal
      v-model:show="showExportModal"
      preset="card"
      title="导出行程"
      class="trip-modal"
      :style="{ width: isMobile ? '96%' : '500px', maxWidth: '95vw', borderRadius: '16px', maxHeight: isMobile ? '80vh' : '85vh' }"
      :header-style="{ background: 'linear-gradient(135deg, #ff6b6b, #ff8e53)', padding: isMobile ? '12px 16px' : '14px 20px', borderRadius: '16px 16px 0 0' }"
      :content-style="{ padding: isMobile ? '16px' : '20px', background: '#fafafa', borderRadius: '0 0 16px 16px', maxHeight: isMobile ? 'calc(80vh - 60px)' : 'calc(85vh - 60px)', overflowY: 'auto' }"
    >
      <TripExporter
        :trip-id="tripId"
        :days="days"
        :current-day-id="currentDayId"
        :is-owner="isOwner"
        :trip-title="tripTitle"
        :trip-year="tripYear"
        :trip-date-range="tripDateRange"
        :trip-days="tripDays"
        :trip-budget="tripBudget"
        :trip-locations="tripLocations"
        @close="showExportModal = false"
      />
    </n-modal>

    <n-modal
      v-model:show="showShareModal"
      preset="card"
      title="分享行程"
      class="trip-modal"
      :style="{ width: isMobile ? '96%' : '400px', maxWidth: '90vw', borderRadius: '16px', maxHeight: isMobile ? '80vh' : '85vh' }"
      :header-style="{ background: 'linear-gradient(135deg, #ff6b6b, #ff8e53)', padding: isMobile ? '12px 16px' : '14px 20px', borderRadius: '16px 16px 0 0' }"
      :content-style="{ padding: isMobile ? '16px' : '20px', background: '#fafafa', borderRadius: '0 0 16px 16px', maxHeight: isMobile ? 'calc(80vh - 60px)' : 'calc(85vh - 60px)', overflowY: 'auto' }"
    >
      <div class="share-options">
        <div class="share-option" @click="handleShareOption('link')">
          <n-icon :component="LinkOutlined" size="24" />
          <span>复制分享链接</span>
        </div>
        <div class="share-option" @click="handleShareOption('poster')">
          <n-icon :component="FileImageOutlined" size="24" />
          <span>生成分享海报</span>
        </div>
        <div v-if="isWechatEnvironment" class="share-option" @click="handleShareOption('wechat')">
          <n-icon :component="WechatOutlined" size="24" />
          <span>分享给微信好友</span>
        </div>
      </div>
    </n-modal>

    <n-modal
      v-model:show="showVisibilityModal"
      preset="card"
      title="设置可见性"
      class="trip-modal"
      :style="{ width: isMobile ? '96%' : '400px', maxWidth: '90vw', borderRadius: '16px', maxHeight: isMobile ? '80vh' : '85vh' }"
      :header-style="{ background: 'linear-gradient(135deg, #ff6b6b, #ff8e53)', padding: isMobile ? '12px 16px' : '14px 20px', borderRadius: '16px 16px 0 0' }"
      :content-style="{ padding: isMobile ? '16px' : '20px', background: '#fafafa', borderRadius: '0 0 16px 16px', maxHeight: isMobile ? 'calc(80vh - 120px)' : 'calc(85vh - 120px)', overflowY: 'auto' }"
      :footer-style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '12px 16px' : '16px 20px', background: '#ffffff', borderTop: '1px solid #f0f0f0', gap: '12px', borderRadius: '0 0 16px 16px' }"
    >
      <div class="visibility-options">
        <div
          v-for="option in visibilityOptions"
          :key="option.value"
          class="visibility-option"
          :class="{ active: selectedVisibility === option.value }"
          @click="selectedVisibility = option.value"
        >
          <span>{{ option.label }}</span>
          <n-icon v-if="selectedVisibility === option.value" :component="CheckOutlined" size="18" />
        </div>
      </div>
      <template #footer>
        <div class="modal-footer">
          <n-button class="btn-secondary" @click="showVisibilityModal = false">
            <template #icon>
              <n-icon :component="CloseOutlined" />
            </template>
            取消
          </n-button>
          <n-button type="primary" class="btn-primary" @click="handleVisibilityConfirm">
            <template #icon>
              <n-icon :component="CheckOutlined" />
            </template>
            确定
          </n-button>
        </div>
      </template>
    </n-modal>

    <n-modal
      v-model:show="showPosterModal"
      preset="card"
      title="分享海报"
      class="trip-modal poster-modal"
      :style="{ width: isMobile ? '96%' : '420px', maxWidth: '95vw', borderRadius: '16px' }"
      :header-style="{ background: 'linear-gradient(135deg, #ff6b6b, #ff8e53)', padding: isMobile ? '12px 16px' : '14px 20px', borderRadius: '16px 16px 0 0' }"
      :content-style="{ padding: isMobile ? '12px' : '16px', background: '#fafafa', borderRadius: '0 0 16px 16px' }"
    >
      <SharePoster
        ref="sharePosterRef"
        :tripId="tripId"
        :tripData="trip"
        :visibility="trip?.visibility || 'private'"
        @visibilityChange="handlePosterVisibilityChange"
        @close="showPosterModal = false"
      />
    </n-modal>

    <!-- 拆分确认弹窗 -->
    <ConfirmModal
      v-model:show="showSplitModal"
      title="拆分为单选卡"
      :content="splitModalContent"
      confirm-text="确认拆分"
      cancel-text="取消"
      @close="showSplitModal = false"
      @confirm="handleSplitConfirm"
    />

    <!-- 合并确认弹窗 -->
    <ConfirmModal
      v-model:show="showMergeModal"
      title="确认合并"
      :content="mergeModalContent"
      confirm-text="确认合并"
      cancel-text="取消"
      @close="showMergeModal = false"
      @confirm="handleMergeConfirm"
    />

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
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

// 用于存储子选项切换的防抖定时器
const optionSwitchTimers = new Map()
import { useRoute, useRouter } from 'vue-router'
import {
  NSpin,
  NEmpty,
  NButton,
  NIcon,
  NModal,
  useMessage,
  useDialog
} from 'naive-ui'
import {
  PlusOutlined,
  ShareAltOutlined,
  DownloadOutlined,
  LockOutlined,
  LinkOutlined,
  GlobalOutlined,
  FileTextOutlined,
  FileImageOutlined,
  CheckOutlined,
  CloseOutlined,
  WechatOutlined
} from '@vicons/antd'
import { useTripStore } from '@/stores/trip'
import { useUserStore } from '@/stores/user'
import { useDevice } from '@/composables/useDevice'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { scheduleApi, tripShareApi, exportApi, clearCache } from '@/services/api'
import { getShareBaseUrl } from '@/utils/storage.js'
import TripModal from '@/components/TripModal.vue'
import TripDetailHeader from '@/components/trip/TripDetailHeader.vue'
import TripDayTabs from '@/components/trip/TripDayTabs.vue'
import TripMapCard from '@/components/trip/TripMapCard.vue'
import TripCardList from '@/components/trip/TripCardList.vue'
import SharePoster from '@/components/SharePoster.vue'
import TripExporter from '@/components/TripExporter.vue'
import MapSelectorModal from '@/components/MapSelectorModal.vue'
import { loadAMapSDK } from '@/composables/useAMap.js'
import { useNavigation } from '@/composables/useNavigation.js'

// ========== 高德地图API配置 ==========
// 使用后端代理，避免前端直接调用高德 API 的跨域和 Key 平台限制
const AMAP_REGEO_PROXY = '/api/amap/regeo'
const AMAP_WEATHER_PROXY = '/api/amap/weather'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const tripStore = useTripStore()
const userStore = useUserStore()
const { isMobile } = useDevice()

// ========== 响应式数据 ==========
const loading = ref(true)
const dayLoading = ref(false)
const error = ref('')
const trip = ref(null)
const days = ref([])
const scheduleData = ref({})
const activeDayIndex = ref(0)
const distances = ref([])
const showEditModal = ref(false)
const showExportModal = ref(false)
const showPosterModal = ref(false)
const sharePosterRef = ref(null)
const mapExpanded = ref(false)
const mapFullscreen = ref(false)
const mapDomId = ref('')
const mapStats = ref({ spotCount: 0, totalKm: 0, typeCount: 0 })
const amapMap = ref(null)
const amapMarkers = ref([])
const amapPolylines = ref([])
const locationsHash = ref('')
const mergeState = ref({
  isMerging: false,
  sourceCard: null,
  selectedCards: []
})

// 弹窗状态
const showSplitModal = ref(false)
const showMergeModal = ref(false)
const showMapSelector = ref(false)
const splitModalContent = ref('')
const mergeModalContent = ref('')
const splitModalCard = ref(null)
const mergeModalData = ref({ sourceCard: null, selectedCards: [] })

// 地图导航相关
const {
  preferredMap,
  loadNavigationPreference,
  saveNavigationPreference,
  openNavigation
} = useNavigation()

const pendingNavigation = ref(null) // 存储待执行的导航信息
const fallbackNavigation = ref(null) // 存储兜底导航信息（用户拒绝APP时）

// TripCardList 组件引用
const tripCardListRef = ref(null)

// ========== 天气相关 ==========
const weatherData = ref({})
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

// ========== 滚动位置恢复相关 ==========
const scrollSaveTimer = ref(null)
const scrollRestoreDone = ref(false)
const scrollRestoreTarget = ref(0)

// ========== 分享相关 ==========
const showShareModal = ref(false)
const showVisibilityModal = ref(false)
const selectedVisibility = ref('private')

// ========== 计算属性 ==========
const tripId = computed(() => route.params.id)

const isLoggedIn = computed(() => userStore.isLoggedIn)

const isWechatEnvironment = computed(() => {
  // 检查是否在微信环境或APP环境
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes('micromessenger') || ua.includes('wechat')
})

const isOwner = computed(() => {
  if (!isLoggedIn.value || !trip.value) return false
  const currentUserId = userStore.userInfo?.id || userStore.userInfo?.userId
  return currentUserId && String(currentUserId) === String(trip.value.userId)
})

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
  if (Array.isArray(data)) {
    return data
  }
  return []
})

const totalCount = computed(() => currentDayCards.value.length)

const completedCount = computed(() => {
  return currentDayCards.value.filter(card => card.completed || String(card.state || '').trim().toLowerCase() === 'completed').length
})

const progressPercent = computed(() => {
  if (totalCount.value === 0) return 0
  return Math.round((completedCount.value / totalCount.value) * 100)
})

const currentDayHasCards = computed(() => currentDayCards.value.length > 0)

const currentDayId = computed(() => {
  return days.value && days.value.length > 0 && days.value[activeDayIndex.value]
    ? days.value[activeDayIndex.value].id
    : ''
})

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

const visibilityOptions = [
  { label: '🔒 私密（仅自己可见）', value: 'private' },
  { label: '🔗 链接分享（知道链接的人可见）', value: 'link' },
  { label: '🌍 完全公开（可被搜索）', value: 'public' }
]



// ========== 方法 ==========
const getVisibilityText = () => {
  const visibility = trip.value?.visibility || 'private'
  const texts = { private: '私密', link: '链接分享', public: '公开' }
  return texts[visibility] || '私密'
}

const getVisibilityIcon = () => {
  const visibility = trip.value?.visibility || 'private'
  const icons = { private: LockOutlined, link: LinkOutlined, public: GlobalOutlined }
  return icons[visibility] || LockOutlined
}

const getVisibilityColor = () => {
  const visibility = trip.value?.visibility || 'private'
  const colors = { private: '#999', link: '#2979ff', public: '#52c41a' }
  return colors[visibility] || '#999'
}

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

  // 3. 检查天气缓存
  const now = Date.now()
  const cacheKey = `weather_${city}_${extensions}`
  if (weatherCache.value[cacheKey] && (now - weatherCache.value[cacheKey].timestamp < 3600000)) {
    return weatherCache.value[cacheKey].data
  }

  // 4. 请求天气
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
      const dayId = currentDayId.value
      if (dayId && scheduleData.value[dayId]) {
        scheduleData.value[dayId] = [...scheduleData.value[dayId]]
      }
    }
  }))
}

// ========== 滚动位置相关方法 ==========
const getScrollTop = () => {
  return new Promise((resolve) => {
    resolve(window.pageYOffset || document.documentElement.scrollTop || 0)
  })
}

const saveScrollPosition = () => {
  if (!tripId.value) return
  const top = window.pageYOffset || document.documentElement.scrollTop || 0
  
  // 只保存有意义的滚动位置（大于 50px）
  if (top < 50) return
  
  try {
    localStorage.setItem(`trip_${tripId.value}_scrollTop`, String(top))
    localStorage.setItem(`trip_${tripId.value}_scrollTs`, String(Date.now()))
    localStorage.setItem(`trip_${tripId.value}_lastScrollTop`, String(top))
    localStorage.setItem(`trip_${tripId.value}_lastScrollTs`, String(Date.now()))
  } catch (err) {
    console.error('保存滚动位置失败:', err)
  }
}

const restoreScrollPosition = () => {
  if (!tripId.value) return
  
  try {
    const savedScrollTop = localStorage.getItem(`trip_${tripId.value}_scrollTop`)
    const savedTs = localStorage.getItem(`trip_${tripId.value}_scrollTs`)
    
    // 如果是 1 小时内的滚动位置，则尝试恢复
    if (savedScrollTop && savedTs && (Date.now() - parseInt(savedTs) < 3600000)) {
      scrollRestoreTarget.value = Number(savedScrollTop)
    } else {
      scrollRestoreDone.value = true
    }
    
    const savedDayIndex = localStorage.getItem(`trip_${tripId.value}_activeDayIndex`)
    if (savedDayIndex !== null && savedDayIndex !== undefined) {
      activeDayIndex.value = parseInt(savedDayIndex, 10) || 0
    }
  } catch (e) {
    console.error('恢复滚动位置失败:', e)
    scrollRestoreDone.value = true
  }
}

const handlePageScroll = () => {
  // 实时保存滚动位置，不再检查 scrollRestoreDone
  // 因为页面卸载时可能已经是 0 了
  saveScrollPosition()
}

// ========== 数据加载 ==========
const loadTrip = async (silent = false) => {
  if (!tripId.value) {
    error.value = '行程ID不能为空'
    loading.value = false
    return
  }

  if (!silent) {
    loading.value = true
  }
  error.value = ''

  try {
    // 记录当前滚动位置
    const currentScrollTop = await getScrollTop()
    
    const result = await tripStore.fetchTripDetail(tripId.value)
    if (!result.success) {
      throw new Error(result.error || '获取行程详情失败')
    }

    trip.value = tripStore.currentTrip
    days.value = tripStore.currentTripDays || []

    // 先关闭整体 loading，让页面显示出来
    if (!silent) {
      loading.value = false
    }

    if (days.value.length > 0) {
      await loadDaySchedule(activeDayIndex.value, false, silent)
    }

    nextTick(() => {
      // 如果是静默刷新，尝试恢复滚动位置
      if (silent && currentScrollTop > 0) {
        window.scrollTo({ top: currentScrollTop, behavior: 'auto' })
      }

      // 刷新/重进页面：从 storage 恢复一次滚动位置
      if (!silent && !scrollRestoreDone.value && scrollRestoreTarget.value > 0) {
        const target = scrollRestoreTarget.value
        scrollRestoreDone.value = true
        scrollRestoreTarget.value = 0
        setTimeout(() => {
          window.scrollTo({ top: target, behavior: 'auto' })
        }, 100)
      }
    })
  } catch (err) {
    error.value = err.message || '加载失败'
    message.error(err.message || '加载失败')
    if (!silent) {
      loading.value = false
    }
  }
}

const loadDaySchedule = async (dayIndex, forceReload = false, silent = false) => {
  if (dayIndex < 0 || dayIndex >= days.value.length) return
  const day = days.value[dayIndex]
  if (!day || !day.id) return

  const dayId = String(day.id)
  const existingData = scheduleData.value[dayId]
  if (!forceReload && Array.isArray(existingData) && existingData._loaded) return
  if (Array.isArray(existingData) && existingData._loading) return

  // 设置加载状态
  if (!silent) {
    dayLoading.value = true
  }

  // 确保 scheduleData[dayId] 是数组，同时保留 _loading 标记
  const currentData = Array.isArray(scheduleData.value[dayId]) ? scheduleData.value[dayId] : []
  currentData._loading = true
  scheduleData.value[dayId] = currentData

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
    cards._loading = false
    scheduleData.value[dayId] = cards

    if (cards.length > 0) {
      cards[0].active = true
    }

    // 加载卡片对应位置的实时天气
    await attachWeatherForCards(cards)
  } catch (err) {
    console.error('[loadDaySchedule] 加载日程失败:', err)
    const emptyArr = []
    emptyArr._loaded = true
    emptyArr._loading = false
    scheduleData.value[dayId] = emptyArr
  } finally {
    dayLoading.value = false
  }
}

const parseDetail = (detail) => {
  if (!detail) return ''
  if (typeof detail === 'string') {
    try {
      const parsed = JSON.parse(detail)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(item => `${item.label || ''}\n${item.text || ''}`).join('\n\n')
      }
      return detail
    } catch (e) {
      return detail
    }
  }
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map(e => `${e.label || ''}\n${e.text || ''}`).join('\n\n')
  }
  return ''
}

const processTags = (tags, isMulti = false) => {
  if (!Array.isArray(tags) || tags.length === 0) return []
  return tags.map((tag, index) => {
    const tagText = typeof tag === 'string' ? tag : tag.text || tag.name || ''
    const tagColor = typeof tag === 'object' ? (tag.color || tag.class || 'default') : 'default'
    return { text: tagText, color: tagColor, class: tagColor, icon: getTagIcon(tagColor), active: index === 0 }
  })
}

const getTagIcon = (color) => {
  const icons = { red: '🔴', green: '🟢', yellow: '🟡', blue: '🔵', purple: '🟣', default: '📍' }
  return icons[color] || icons.default
}

const buildDurationTag = (durationMin) => {
  if (durationMin === undefined || durationMin === null || durationMin === '') return null
  const total = parseInt(durationMin, 10)
  if (!Number.isFinite(total) || total <= 0) return null
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  let text = ''
  if (hours > 0) text += `${hours}小时`
  if (minutes > 0) text += `${minutes}分钟`
  if (!text) text = `${total}分钟`
  return { text, color: 'yellow', class: 'yellow' }
}

const buildCardTags = (tags, isMulti, evt, location) => {
  const baseTags = processTags(tags, isMulti)
  const durationTag = buildDurationTag(evt?.durationMin ?? evt?.duration_min)
  if (durationTag) return [durationTag, ...baseTags]
  return baseTags
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

  const detailText = parseDetail(evt.detail)
  const description = evt.description || ''
  const detailDescription = parseDetail(evt.detail) || parseDetail(evt.expand) || ''

  const card = {
    // 核心标识字段
    id: String(evt.id || evt.uid || `card_${idx}`),
    uid: evt.uid || evt.id || `card_${idx}`,
    dayId: dayId,
    tripId: evt.tripId || '',
    parentEventId: evt.parentEventId || null,
    
    // 类型和状态
    type: String(evt.type || 'scenic'),
    cardType: evt.cardType || evt.card_type || 'single',
    isMulti: isMulti,
    state: evt.state || 'active',
    status: evt.state || '',
    completed: String(evt.state || '').trim().toLowerCase() === 'completed',
    disabled: evt.disabled || false,
    priority: evt.priority || 0,
    
    // 时间相关
    time: evt.time || evt.startTime || '',
    startTime: evt.startTime || evt.time || '',
    endTime: evt.endTime || '',
    duration: evt.durationMin ? `${evt.durationMin}分钟` : (evt.duration || ''),
    durationMin: evt.durationMin || evt.duration_min || evt.duration || '',
    
    // 内容
    title: evt.title || '',
    description: description,
    detailDescription: detailDescription,
    detail: evt.detail || '',
    
    // 标签和多媒体
    tags: buildCardTags(evt.tags, isMulti, evt, location),
    images: evt.images || null,
    
    // 位置和天气
    location: location,
    locationId: evt.locationId || evt.location_id || null,
    locationName: evt.locationName || location?.name || '',
    weather: evt.weather || null,
    weatherJson: evt.weather_json || evt.weatherJson || null,
    
    // 费用
    cost: evt.cost,
    costCurrency: evt.costCurrency || evt.cost_currency || 'CNY',
    
    // UI 状态
    active: idx === 0,
    expanded: false,
    descExpanded: false,
    slided: false,
    activeOptionIndex: evt.activeOptionIndex || 0,
    
    // 原始数据和元数据
    rawEvent: evt,
    createdAt: evt.createdAt || evt.created_at || 0,
    updatedAt: evt.updatedAt || evt.updated_at || 0
  }

  if (isMulti) {
    let tabsData = evt.tabs || evt.options || []
    if (!Array.isArray(tabsData) || tabsData.length === 0) {
      tabsData = [{
        id: evt.id || evt.uid || `opt_${idx}_0`,
        title: evt.title || '',
        name: evt.title || '',
        type: evt.type || 'scenic',
        time: evt.time || evt.startTime || '',
        duration: evt.duration || '',
        durationMin: evt.durationMin || evt.duration_min || evt.duration || '',
        state: evt.state || 'active',
        description: evt.description || '',
        detail: evt.detail || '',
        locationId: evt.locationId || evt.location_id,
        location: location,
        tags: evt.tags || []
      }]
    }
    card.options = tabsData.map((tab, tabIdx) => {
      let tabLocation = tab.location || null
      if (!tabLocation && (tab.locationId || tab.location_id)) {
        const tabLocId = tab.locationId || tab.location_id
        tabLocation = locationMap.get(tabLocId) || locationMap.get(String(tabLocId)) || null
      }
      return {
        // 核心标识字段
        id: tab.uid || tab.id || `opt_${idx}_${tabIdx}`,
        uid: tab.uid || tab.id || `opt_${idx}_${tabIdx}`,
        parentEventId: evt.id || evt.uid,
        
        // 类型和状态
        type: tab.type || evt.type || 'scenic',
        state: tab.state || 'active',
        completed: String(tab.state || '').trim().toLowerCase() === 'completed',
        priority: tab.priority || evt.priority || 0,
        
        // 时间相关
        time: tab.time || tab.startTime || '',
        startTime: tab.startTime || tab.time || '',
        endTime: tab.endTime || '',
        duration: tab.duration || tab.durationMin || '',
        durationMin: tab.durationMin || tab.duration_min || tab.duration || '',
        
        // 内容
        name: tab.title || tab.name || `选项${tabIdx + 1}`,
        title: tab.title || tab.name || '',
        description: tab.description || '',
        detail: tab.detail || '',
        
        // 标签和多媒体
        tags: buildCardTags(tab.tags, false, tab, tabLocation),
        images: tab.images || null,
        
        // 位置
        locationId: tab.locationId || tab.location_id || null,
        location: tabLocation,
        locationName: tab.locationName || tabLocation?.name || '',
        
        // 费用
        cost: tab.cost,
        costCurrency: tab.costCurrency || tab.cost_currency || 'CNY'
      }
    })
  }

  return card
}

const switchDay = async (index) => {
  activeDayIndex.value = index
  // 保存当前选中的日期索引
  if (tripId.value) {
    try {
      localStorage.setItem(`trip_${tripId.value}_activeDayIndex`, String(index))
    } catch (e) {
      console.error('保存日期索引失败:', e)
    }
  }
  await loadDaySchedule(index)
}

// ========== 导航和返回 ==========
const handleBack = () => {
  // 检查历史记录，如果有则返回，否则返回首页
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

const handleEdit = () => {
  showEditModal.value = true
}

const handleSave = async (formData) => {
  try {
    const result = await tripStore.updateTrip(tripId.value, formData)
    if (result.success) {
      message.success('行程更新成功')
      showEditModal.value = false
      trip.value = tripStore.currentTrip
    } else {
      message.error(result.error || '更新失败')
    }
  } catch (err) {
    message.error(err.message || '更新失败')
  }
}

// ========== 卡片操作 ==========
const handleCardClick = (card) => {
  if (mergeState.value.isMerging) {
    if (card.slided) closeAllSlides()
    toggleMergeSelect(card)
    return
  }
  
  if (card.slided) {
    closeAllSlides()
    return
  }

  if (!isLoggedIn.value) {
    message.warning('请先登录')
    router.push('/login')
    return
  }

  const dayId = days.value[activeDayIndex.value]?.id
  const cards = scheduleData.value[dayId]
  if (Array.isArray(cards)) {
    cards.forEach(c => { c.active = false })
  }
  card.active = true
}

const handleAddEvent = () => {
  if (!isLoggedIn.value) {
    message.warning('请先登录')
    router.push('/login')
    return
  }
  
  const currentDay = days.value[activeDayIndex.value]
  const dayId = currentDay?.id || ''
  const dayDate = currentDay?.date || currentDay?.id || ''
  
  router.push({
    path: `/trip/${tripId.value}/event`,
    query: {
      dayId,
      dayDate: dayDate ? dayDate.substring(0, 10) : '',
      mode: 'create'
    }
  })
}

const handleAddEventAtIndex = (index) => {
  if (!isLoggedIn.value) {
    message.warning('请先登录')
    router.push('/login')
    return
  }
  
  const currentDay = days.value[activeDayIndex.value]
  const dayId = currentDay?.id || ''
  const dayDate = currentDay?.date || currentDay?.id || ''
  const insertIndex = index + 1
  
  router.push({
    path: `/trip/${tripId.value}/event`,
    query: {
      dayId,
      dayDate: dayDate ? dayDate.substring(0, 10) : '',
      mode: 'create',
      insertIndex
    }
  })
}

const handleCardEdit = (card) => {
  if (!isLoggedIn.value) {
    message.warning('请先登录')
    router.push('/login')
    return
  }
  closeAllSlides()

  const currentDay = days.value[activeDayIndex.value]
  const dayId = card?.dayId || currentDay?.id || ''
  const dayDate = currentDay?.date || currentDay?.id || ''
  const eventId = card?.rawEvent?.uid || card?.rawEvent?.id || card?.id || ''

  // 准备事件数据
  const eventData = {
    title: card?.title || card?.rawEvent?.title || '',
    type: card?.type || card?.rawEvent?.type || 'scenic',
    startTime: card?.time || card?.rawEvent?.startTime || null,
    location: card?.locationInfo || card?.rawEvent?.location || null,
    description: card?.description || card?.rawEvent?.description || '',
    state: card?.state || card?.rawEvent?.state || 'active',
    options: card?.options || card?.rawEvent?.options || [],
    cardType: card?.cardType || card?.rawEvent?.cardType || 'single'
  }

  router.push({
    path: `/trip/${tripId.value}/event/${eventId}`,
    query: {
      dayId,
      dayDate: dayDate ? dayDate.substring(0, 10) : '',
      mode: 'edit',
      eventId,
      eventData: encodeURIComponent(JSON.stringify(eventData))
    }
  })
}

const handleDelete = async (card) => {
  if (!isLoggedIn.value) return
  closeAllSlides()

  tripCardListRef.value?.setProcessing(true, '删除中...')
  try {
    const dayId = days.value[activeDayIndex.value]?.id
    const eventId = card.rawEvent?.event_id || card.rawEvent?.id || card.rawEvent?.uid || card.id
    await scheduleApi.deleteEvent(tripId.value, eventId)
    message.success('已删除')

    // 从本地数据中移除
    const cards = scheduleData.value[dayId]
    if (Array.isArray(cards)) {
      const index = cards.findIndex(c => (c.id || c.uid) === (card.id || card.uid))
      if (index > -1) cards.splice(index, 1)
    }
  } catch (err) {
    message.error(err.message || '删除失败')
  } finally {
    tripCardListRef.value?.setProcessing(false)
  }
}

const handleToggleStatus = async (card) => {
  if (!isLoggedIn.value) return
  closeAllSlides()

  tripCardListRef.value?.setProcessing(true, card.disabled ? '启用中...' : '停用中...')
  try {
    const dayId = days.value[activeDayIndex.value]?.id
    const newDisabled = !card.disabled
    await scheduleApi.updateEvent(tripId.value, dayId, card.id || card.uid, { disabled: newDisabled })

    const cards = scheduleData.value[dayId]
    const targetCard = cards.find(c => (c.id || c.uid) === (card.id || card.uid))
    if (targetCard) {
      targetCard.disabled = newDisabled
    }

    message.success(newDisabled ? '已停用' : '已启用')
  } catch (err) {
    message.error(err.message || '操作失败')
  } finally {
    tripCardListRef.value?.setProcessing(false)
  }
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

// 开始导航流程
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

// 导航加载状态
const isNavigating = ref(false)
const navigationMapName = ref('')
let isNavigationCancelled = false // 标记用户是否取消了导航

// 导航确认弹窗
const showNavigationConfirm = ref(false)
const navigationConfirmContent = ref('')
const navigationConfirmWebUrl = ref('')

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
      isNavigating.value = true
    },
    onResult: (result) => {
      isNavigating.value = false

      if (isNavigationCancelled) {
        return
      }

      if (result.type === 'need_confirm') {
        showNavigationConfirmDialog(result)
      }
    }
  }).then((result) => {
    if (result.success) {
      isNavigating.value = false
    }
  })
}

const showNavigationConfirmDialog = (result) => {
  const { webUrl, mapName } = result
  navigationConfirmContent.value = `是否成功打开${mapName}APP？`
  navigationConfirmWebUrl.value = webUrl
  showNavigationConfirm.value = true
}

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

// 地图选择器关闭
const handleMapSelectorClose = () => {
  showMapSelector.value = false
  pendingNavigation.value = null
}

// 地图选择器确认
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

// ========== 合并功能 ==========
const handleStartMerge = (card) => {
  if (!isLoggedIn.value) return
  closeAllSlides()
  
  if (card.isMulti) {
    message.warning('多选卡不能作为合并源')
    return
  }
  
  const dayId = days.value[activeDayIndex.value]?.id
  const cards = scheduleData.value[dayId]
  const otherSingleCards = cards.filter(c => !c.isMulti && c.id !== card.id && !c.disabled)
  
  if (otherSingleCards.length === 0) {
    message.warning('没有其他可合并的单选卡')
    return
  }
  
  mergeState.value.isMerging = true
  mergeState.value.sourceCard = card
  mergeState.value.selectedCards = []
  
  cards.forEach(c => {
    c.mergeSelectable = !c.isMulti && c.id !== card.id && !c.disabled
    c.mergeSelected = false
  })
  
  message.info('请选择要合并的卡片')
}

const toggleMergeSelect = (card) => {
  if (!mergeState.value.isMerging || !card.mergeSelectable) return
  
  card.mergeSelected = !card.mergeSelected
  
  if (card.mergeSelected) {
    mergeState.value.selectedCards.push(card)
  } else {
    const idx = mergeState.value.selectedCards.findIndex(c => c.id === card.id)
    if (idx > -1) mergeState.value.selectedCards.splice(idx, 1)
  }
}

const cancelMerge = () => {
  const dayId = days.value[activeDayIndex.value]?.id
  const cards = scheduleData.value[dayId]
  if (Array.isArray(cards)) {
    cards.forEach(c => {
      c.mergeSelectable = false
      c.mergeSelected = false
    })
  }
  mergeState.value.isMerging = false
  mergeState.value.sourceCard = null
  mergeState.value.selectedCards = []
}

const handleSplit = (card) => {
  if (!isLoggedIn.value) return
  closeAllSlides()

  if (!card.isMulti || !card.options || card.options.length === 0) {
    message.warning('只有多选卡片可以拆分')
    return
  }

  splitModalCard.value = card
  splitModalContent.value = `将多选卡片「${card.title}」拆分为 ${card.options.length} 个单选卡片？`
  showSplitModal.value = true
}

const handleSplitConfirm = async () => {
  showSplitModal.value = false
  if (splitModalCard.value) {
    await executeSplit(splitModalCard.value)
    splitModalCard.value = null
  }
}

const executeSplit = async (card) => {
  tripCardListRef.value?.setProcessing(true, '拆分卡片中...')
  try {
    const dayId = days.value[activeDayIndex.value]?.id
    const eventId = card.rawEvent?.uid || card.rawEvent?.id || card.id
    const options = card.options || []

    // 1. 删除原多选卡
    await scheduleApi.deleteEvent(tripId.value, eventId)

    // 2. 为每个选项创建一个单选卡
    const createdEvents = []
    for (let i = 0; i < options.length; i++) {
      const option = options[i]
      const payload = {
        uid: `${Date.now()}_${i}`,
        title: option.title || option.name || `选项${i + 1}`,
        type: option.type || 'scenic',
        time: option.startTime || option.time || '',
        description: option.description || '',
        detail: option.detail || '',
        state: option.state || 'active',
        cardType: 'single',
        location: option.location ? { name: option.location.name } : null,
        cost: option.cost,
        costCurrency: option.costCurrency,
        priority: option.priority || 0
      }

      const res = await scheduleApi.createEvent(tripId.value, dayId, payload, i)
      createdEvents.push(res)
    }

    message.success(`已拆分为 ${createdEvents.length} 个单选卡片`)

    // 3. 刷新数据
    await loadDaySchedule(activeDayIndex.value, true)
  } catch (err) {
    message.error(err.message || '拆分失败')
  } finally {
    tripCardListRef.value?.setProcessing(false)
  }
}

const confirmMerge = async () => {
  const { sourceCard, selectedCards } = mergeState.value
  
  if (!sourceCard || selectedCards.length === 0) {
    message.warning('请选择要合并的卡片')
    return
  }
  
  mergeModalData.value = { sourceCard, selectedCards }
  mergeModalContent.value = `将 ${selectedCards.length} 个卡片合并到「${sourceCard.title}」？`
  showMergeModal.value = true
}

const handleMergeConfirm = async () => {
  showMergeModal.value = false
  const { sourceCard, selectedCards } = mergeModalData.value
  if (sourceCard && selectedCards.length > 0) {
    await executeMerge(sourceCard, selectedCards)
    mergeModalData.value = { sourceCard: null, selectedCards: [] }
  }
}

const executeMerge = async (sourceCard, selectedCards) => {
  tripCardListRef.value?.setProcessing(true, '合并卡片中...')
  try {
    const dayId = days.value[activeDayIndex.value]?.id

    const options = [
      {
        id: sourceCard.rawEvent?.uid || sourceCard.id,
        title: sourceCard.title,
        name: sourceCard.title,
        type: sourceCard.type,
        time: sourceCard.time,
        duration: sourceCard.duration,
        durationMin: sourceCard.durationMin,
        state: sourceCard.state,
        description: sourceCard.description,
        location: sourceCard.location,
        locationId: sourceCard.location?.id,
        tags: sourceCard.tags
      },
      ...selectedCards.map(card => ({
        id: card.rawEvent?.uid || card.id,
        title: card.title,
        name: card.title,
        type: card.type,
        time: card.time,
        duration: card.duration,
        durationMin: card.durationMin,
        state: card.state,
        description: card.description,
        location: card.location,
        locationId: card.location?.id,
        tags: card.tags
      }))
    ]

    const payload = {
      cardType: 'multi',
      title: sourceCard.title,
      type: sourceCard.type,
      options: options,
      activeOptionIndex: 0
    }

    // 如果源卡片有天气数据，一并保存
    if (sourceCard.weather) {
      payload.weather = sourceCard.weather
    }

    await scheduleApi.updateEvent(tripId.value, dayId, sourceCard.rawEvent?.uid || sourceCard.id, payload)

    // 删除被选中的卡片
    for (const card of selectedCards) {
      try {
        await scheduleApi.deleteEvent(tripId.value, card.rawEvent?.uid || card.id)
      } catch (e) {
        console.error('删除合并卡片失败:', e)
      }
    }

    cancelMerge()
    message.success('合并成功')

    // 重新加载数据，不修改本地数据避免重复
    await loadDaySchedule(activeDayIndex.value, true)
  } catch (error) {
    message.error(error.message || '合并失败')
  } finally {
    tripCardListRef.value?.setProcessing(false)
  }
}

// ========== 卡片滑动操作 ==========
const handleToggleSlide = (card) => {
  // 关闭其他卡片的滑动状态
  const dayId = days.value[activeDayIndex.value]?.id
  const cards = scheduleData.value[dayId]
  if (Array.isArray(cards)) {
    cards.forEach(c => {
      if ((c.id || c.uid) !== (card.id || card.uid)) {
        c.slided = false
      }
    })
  }
  // 切换当前卡片的滑动状态
  card.slided = !card.slided
}

const closeAllSlides = () => {
  const dayId = days.value[activeDayIndex.value]?.id
  const cards = scheduleData.value[dayId]
  if (Array.isArray(cards)) {
    cards.forEach(c => { c.slided = false })
  }
}

// ========== 完成状态切换 ==========
const handleToggleComplete = async ({ card, completed }) => {
  if (!isLoggedIn.value) return

  const cardId = card.id || card.uid

  try {
    const dayId = days.value[activeDayIndex.value]?.id
    const newState = completed ? 'completed' : 'active'

    // 构建完整的事件数据，保留原有字段
    const eventData = {
      ...card.rawEvent,
      state: newState
    }

    // 如果卡片有天气数据，一并保存
    if (card.weather) {
      eventData.weather = card.weather
    }

    await scheduleApi.updateEvent(tripId.value, dayId, cardId, eventData)

    const cards = scheduleData.value[dayId]
    const targetCard = cards.find(c => (c.id || c.uid) === cardId)
    if (targetCard) {
      targetCard.state = newState
      targetCard.completed = completed
    }

    message.success(completed ? '已标记为完成' : '已取消完成')
  } catch (err) {
    message.error(err.message || '操作失败')
  } finally {
    // 通知组件移除 loading 状态
    tripCardListRef.value?.setCardCompleteLoading(cardId, false)
  }
}

// ========== 选项切换（本地状态 + 延迟保存到后端）==========
const handleSwitchOption = ({ card, optIndex }) => {
  if (!card.isMulti) return

  // 立即更新本地状态
  const dayId = days.value[activeDayIndex.value]?.id
  const cards = scheduleData.value[dayId]
  const targetCard = cards.find(c => (c.id || c.uid) === (card.id || card.uid))
  if (!targetCard) return

  targetCard.activeOptionIndex = optIndex

  // 延迟保存到后端（防抖3秒）
  if (isLoggedIn.value) {
    const cardKey = `${tripId.value}-${dayId}-${card.id || card.uid}`

    // 清除之前的定时器
    if (optionSwitchTimers.has(cardKey)) {
      clearTimeout(optionSwitchTimers.get(cardKey))
    }

    // 设置新的定时器，3秒后保存
    const timer = setTimeout(async () => {
      try {
        await scheduleApi.updateEvent(tripId.value, dayId, card.id || card.uid, {
          activeOptionIndex: optIndex
        })
        console.log(`[TripDetail] 子选项选中状态已保存: ${cardKey} -> ${optIndex}`)
      } catch (err) {
        console.error('[TripDetail] 保存子选项选中状态失败:', err)
      }
      optionSwitchTimers.delete(cardKey)
    }, 3000)

    optionSwitchTimers.set(cardKey, timer)
  }
}

// ========== 子选项勾选完成状态（需要保存到后端）==========
const handleToggleOptionComplete = async ({ card, optIndex, option }) => {
  if (!isLoggedIn.value) return

  tripCardListRef.value?.setProcessing(true, '保存中...')
  try {
    const dayId = days.value[activeDayIndex.value]?.id
    const optionId = option.id || option.uid
    const newState = (option.completed || option.state === 'completed') ? 'active' : 'completed'

    // 更新后端状态
    await scheduleApi.updateEvent(tripId.value, optionId, { state: newState, dayId })

    // 更新本地状态
    const cards = scheduleData.value[dayId]
    const targetCard = cards.find(c => (c.id || c.uid) === (card.id || card.uid))
    if (targetCard && targetCard.options) {
      const targetOption = targetCard.options[optIndex]
      if (targetOption) {
        targetOption.state = newState
        targetOption.completed = newState === 'completed'
      }
    }

    message.success(newState === 'completed' ? '标记完成' : '取消完成')
  } catch (err) {
    message.error(err.message || '操作失败')
  } finally {
    tripCardListRef.value?.setProcessing(false)
  }
}

// ========== 展开/收起（纯前端状态，不存储）==========
const handleToggleExpand = (card) => {
  card.expanded = !card.expanded
}

// ========== 拖拽排序 ==========
const onCardSortStart = (evt) => {
  closeAllSlides()
}

const onCardSortEnd = (evt) => {
}

const onCardSortChange = async (evt) => {
  const { oldIndex, newIndex } = evt
  if (oldIndex === newIndex) return

  const currentDay = days.value && days.value.length > 0 ? days.value[activeDayIndex.value] : null
  const dayId = currentDay ? String(currentDay.id || '').trim() : ''

  if (!dayId || !Array.isArray(scheduleData.value[dayId])) return

  tripCardListRef.value?.setSorting(true)

  try {
    moveCardInArray(scheduleData.value[dayId], oldIndex, newIndex)
    await persistCurrentDayOrder()
  } finally {
    tripCardListRef.value?.setSorting(false)
  }
}

const moveCardInArray = (arr, fromIndex, toIndex) => {
  if (!Array.isArray(arr)) return
  if (fromIndex === toIndex) return
  if (fromIndex < 0 || fromIndex >= arr.length) return
  if (toIndex < 0) toIndex = 0
  if (toIndex >= arr.length) toIndex = arr.length - 1
  const item = arr.splice(fromIndex, 1)[0]
  arr.splice(toIndex, 0, item)
}

const persistCurrentDayOrder = async () => {
  const currentDay = days.value && days.value.length > 0 ? days.value[activeDayIndex.value] : null
  const dayId = currentDay ? String(currentDay.id || '').trim() : ''
  if (!dayId) return
  
  const rawCards = scheduleData.value[dayId]
  const cards = Array.isArray(rawCards) ? rawCards : []
  const orderedIds = cards.map(c => String(c?.rawEvent?.uid || c?.id || '').trim()).filter(Boolean)
  
  if (!orderedIds.length) return
  
  try {
    await scheduleApi.reorderDayEvents(tripId.value, dayId, orderedIds)
    calculateDayDistances()
    if (mapExpanded.value) {
      nextTick(() => { renderDayMap(true) })
    }
  } catch (e) {
    console.error('[TripDetail] reorderDayEvents error:', e)
    message.error(e?.message || '顺序保存失败')
  }
}

// ========== 距离计算 ==========
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

// ========== 分享功能 ==========
const handleShare = () => {
  showShareModal.value = true
}

const handleShareOption = async (option) => {
  showShareModal.value = false
  
  if (option === 'link') {
    await handleCopyShareLink()
  } else if (option === 'poster') {
    handleGeneratePoster()
  } else if (option === 'wechat') {
    handleWechatShare()
  }
}

const handleCopyShareLink = async () => {
  const visibility = trip.value?.visibility || 'private'

  tripCardListRef.value?.setProcessing(true, '创建分享链接中...')
  try {
    let shareUrl = ''
    const baseUrl = getShareBaseUrl()
    if (!isLoggedIn.value && visibility === 'public') {
      shareUrl = `${baseUrl}${window.location.pathname}${window.location.search}`
    } else {
      const result = await tripShareApi.create(tripId.value, { expiresInDays: 30 })
      shareUrl = result?.shareUrl || `${baseUrl}${window.location.pathname}`

      // 后端会自动将 visibility 从 private 改为 link
      // 前端同步更新状态
      if (visibility === 'private' && trip.value) {
        trip.value.visibility = 'link'
        message.success('分享链接已复制，可见性已自动调整为"链接分享"')
      } else {
        message.success('分享链接已复制到剪贴板')
      }
    }
    // 如果是相对路径，拼接成完整 URL
    if (shareUrl && !shareUrl.startsWith('http')) {
      shareUrl = `${baseUrl}${shareUrl.startsWith('/') ? '' : '/'}${shareUrl}`
    }
    await navigator.clipboard.writeText(shareUrl)
  } catch (err) {
    message.error(err.message || '创建分享链接失败')
  } finally {
    tripCardListRef.value?.setProcessing(false)
  }
}

const handleGeneratePoster = () => {
  showPosterModal.value = true
  nextTick(() => {
    if (sharePosterRef.value) {
      sharePosterRef.value.generatePoster()
    }
  })
}

const handleWechatShare = () => {
  // 微信分享逻辑
  message.info('请在微信中点击右上角菜单进行分享')
}

// 海报生成后同步更新可见性
const handlePosterVisibilityChange = (newVisibility) => {
  if (trip.value && trip.value.visibility !== newVisibility) {
    trip.value.visibility = newVisibility
  }
}

// ========== 可见性设置 ==========
const handleVisibility = () => {
  if (!isLoggedIn.value) {
    message.warning('请先登录')
    return
  }
  selectedVisibility.value = trip.value?.visibility || 'private'
  showVisibilityModal.value = true
}

const handleVisibilityConfirm = async () => {
  const currentVisibility = trip.value?.visibility || 'private'
  const newVisibility = selectedVisibility.value

  showVisibilityModal.value = false

  if (newVisibility !== currentVisibility) {
    tripCardListRef.value?.setProcessing(true, '更新可见性中...')
    try {
      await tripShareApi.updateVisibility(tripId.value, newVisibility)
      trip.value.visibility = newVisibility
      message.success('可见性已更新')
    } catch (err) {
      message.error(err.message || '更新失败')
    } finally {
      tripCardListRef.value?.setProcessing(false)
    }
  }
}

// ========== 导出功能 ==========
const handleExport = () => {
  showExportModal.value = true
}

// ========== 辅助方法 ==========
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

// ========== 地图相关 ==========
const toggleMap = () => {
  mapExpanded.value = !mapExpanded.value
  if (mapExpanded.value) {
    mapDomId.value = `amap-jsmap-${tripId.value || 'trip'}-${activeDayIndex.value}`
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
    mapDomId.value = `amap-jsmap-${tripId.value || 'trip'}-${activeDayIndex.value}`
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
    mapDomId.value = `amap-jsmap-${tripId.value || 'trip'}-${activeDayIndex.value}`
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
    console.error('[TripDetail] 地图渲染失败:', error)
  }
}

// ========== 事件处理 ==========
const handleEventSaved = async (payload) => {
  const savedDayId = payload?.dayId
  if (savedDayId) {
    const idx = days.value.findIndex(d => String(d.id) === String(savedDayId))
    if (idx >= 0) activeDayIndex.value = idx
  }
  await loadDaySchedule(activeDayIndex.value, true)
  if (mapExpanded.value) {
    nextTick(() => renderDayMap(true))
  }
}

// ========== 监听 ==========
watch(() => route.params.id, (newId) => {
  if (newId) {
    // 重置滚动恢复状态
    scrollRestoreDone.value = false
    scrollRestoreTarget.value = 0
    restoreScrollPosition()
    loadTrip()
  }
})

watch(() => route.query.refresh, (newVal) => {
  if (newVal === 'true') {
    loadDaySchedule(activeDayIndex.value, true)
  }
})

watch(activeDayIndex, async (newVal) => {
  mapDomId.value = `amap-jsmap-${tripId.value || 'trip'}-${activeDayIndex.value}`
  if (mapExpanded.value) {
    nextTick(() => {
      renderDayMap(true)
    })
  }
  await loadDaySchedule(newVal)
  
  // 保存当前选中的日期索引
  try {
    localStorage.setItem(`trip_${tripId.value}_activeDayIndex`, String(newVal))
  } catch (e) {
    console.error('保存日期索引失败:', e)
  }
})

// ========== 生命周期 ==========
onMounted(() => {
  // 恢复滚动位置和日期索引
  restoreScrollPosition()
  loadTrip()
  
  // 加载导航偏好设置
  loadNavigationPreference()
  
  // 监听事件保存
  window.addEventListener('trip-event-saved', handleEventSaved)
  
  // 监听滚动
  window.addEventListener('scroll', handlePageScroll)
})

onUnmounted(() => {
  window.removeEventListener('trip-event-saved', handleEventSaved)
  window.removeEventListener('scroll', handlePageScroll)
  
  // 清理定时器
  if (scrollSaveTimer.value) {
    clearTimeout(scrollSaveTimer.value)
  }
  
  // 清理地图
  if (amapMap.value) {
    amapMap.value.destroy()
    amapMap.value = null
  }
  
  // 清理全屏样式
  document.body.classList.remove('map-fullscreen-open')
})
</script>

<style scoped>
.trip-detail-page {
  min-height: 100vh;
  background: #fcfaf2;
  padding-bottom: 100px;
}

.trip-detail-page.has-error-or-loading {
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
  min-height: 100vh;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
}

.bottom-safe-area {
  height: calc(100px + env(safe-area-inset-bottom));
}

.fab-add-btn {
  position: fixed;
  right: 20px;
  bottom: calc(80px + env(safe-area-inset-bottom));
  width: 50px;
  height: 50px;
  box-shadow: 0 4px 16px rgba(255, 107, 107, 0.4);
  background: linear-gradient(135deg, #ff9f43, #ff6b6b);
  border: none;
  z-index: 200;
}

.fab-add-btn:hover {
  transform: scale(1.05);
}

.merge-action-bar {
  position: fixed;
  bottom: calc(60px + env(safe-area-inset-bottom));
  left: 0;
  right: 0;
  background: #fff;
  padding: 16px 24px;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.12);
  z-index: 200;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.merge-action-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 600px;
  margin: 0 auto;
}

.merge-hint {
  font-size: 15px;
  color: #64748b;
  font-weight: 500;
}

.merge-action-btns {
  display: flex;
  gap: 12px;
}

.merge-btn-cancel {
  background: #f1f5f9 !important;
  color: #64748b !important;
  border: none !important;
  padding: 10px 24px !important;
  border-radius: 24px !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  height: 44px !important;
}

.merge-btn-cancel:hover {
  background: #e2e8f0 !important;
}

.merge-btn-confirm {
  background: linear-gradient(135deg, #ff9f43, #ff6b6b) !important;
  color: #fff !important;
  border: none !important;
  padding: 10px 28px !important;
  border-radius: 24px !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  height: 44px !important;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.35);
}

.merge-btn-confirm:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(255, 107, 107, 0.45);
}

.merge-btn-confirm:disabled {
  opacity: 0.5 !important;
  pointer-events: none;
  box-shadow: none !important;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  z-index: 200;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 8px 24px;
  border-radius: 8px;
  transition: all 0.2s;
}

.action-item:hover {
  background: #f8fafc;
}

.action-item:active {
  background: #f1f5f9;
}

.action-item span {
  font-size: 12px;
  color: #666;
}

.action-item.readonly {
  opacity: 0.5;
  pointer-events: none;
}

.footer {
  padding: 20px 16px;
  text-align: center;
  font-size: 12px;
  color: #94a3b8;
}

.share-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.share-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.share-option:hover {
  background: #f1f5f9;
}

.share-option span {
  font-size: 14px;
  color: #334155;
}

.visibility-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.visibility-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #f8fafc;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.visibility-option:hover {
  background: #f1f5f9;
}

.visibility-option.active {
  background: #eff6ff;
  border-color: #3b82f6;
}

.visibility-option span {
  font-size: 14px;
  color: #334155;
}

.visibility-option.active span {
  color: #3b82f6;
  font-weight: 500;
}

/* 弹窗居中显示 */
:global(.n-modal-container) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* 弹窗统一样式 */
.trip-modal :deep(.n-card) {
  border-radius: 16px !important;
  overflow: hidden;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.18);
  border: none;
}

.trip-modal :deep(.n-card-header__main) {
  color: #ffffff !important;
  font-size: 17px !important;
  font-weight: 700 !important;
  letter-spacing: 0.5px;
  text-align: center;
}

/* 地图全屏样式 */
:global(.map-fullscreen-open) {
  overflow: hidden;
}
</style>
