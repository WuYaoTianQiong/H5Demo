<template>
  <div class="trip-exporter">
    <div v-if="step === 'options'" class="export-options">
      <!-- 日期选择区域 -->
      <div v-if="days.length > 0" class="days-section">
        <div class="section-header">
          <div class="section-title">
            <n-icon :component="CalendarOutlined" class="title-icon" />
            <span>选择日期</span>
          </div>
          <button 
            type="button"
            class="select-all-btn"
            :class="{ active: isAllSelected }"
            @click="toggleSelectAll"
          >
            {{ isAllSelected ? '取消全选' : '全选' }}
          </button>
        </div>
        
        <div class="day-grid">
          <div
            v-for="(day, index) in days"
            :key="day.id"
            class="day-item"
            :class="{ active: selectedDays.includes(day.id) }"
            @click="toggleDay(day.id)"
          >
            <span class="day-name">第{{ index + 1 }}天</span>
            <span class="day-date">{{ formatDateShort(day.date) }}</span>
          </div>
        </div>
        
        <div class="selection-hint">
          <n-icon :component="InfoCircleOutlined" />
          <span>已选择 <strong>{{ selectedDays.length }}</strong> / {{ days.length }} 天</span>
        </div>
      </div>

      <!-- 导出格式选择 -->
      <div class="format-section">
        <div class="section-header">
          <div class="section-title">
            <n-icon :component="ExportOutlined" class="title-icon" />
            <span>导出格式</span>
          </div>
        </div>
        
        <div class="format-grid">
          <div
            class="format-item"
            :class="{ active: selectedFormat === 'image' }"
            @click="selectedFormat = 'image'"
          >
            <span class="format-name">图片</span>
            <span class="format-desc">生成海报</span>
          </div>

          <div
            v-if="isOwner"
            class="format-item"
            :class="{ active: selectedFormat === 'json' }"
            @click="selectedFormat = 'json'"
          >
            <span class="format-name">JSON</span>
            <span class="format-desc">导出数据</span>
          </div>
        </div>
      </div>

      <!-- 导出按钮 -->
      <n-button
        type="primary"
        size="large"
        class="export-btn"
        :disabled="!canExport"
        :loading="isExporting"
        @click="startExport"
      >
        <template #icon>
          <n-icon :component="ExportOutlined" />
        </template>
        开始导出
      </n-button>
    </div>

    <!-- 导出进度 -->
    <div v-if="step === 'exporting'" class="export-progress">
      <div class="progress-animation">
        <n-spin size="large" />
      </div>
      <span class="progress-title">正在生成行程海报</span>
      <span class="progress-text">{{ progressText }}</span>
      <div class="progress-bar-wrapper">
        <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <span class="progress-percent">{{ progressPercent }}%</span>
    </div>

    <!-- 导出结果 -->
    <div v-if="step === 'result'" class="export-result">
      <!-- 图片预览区域 - 作为主要展示内容 -->
      <div class="preview-section">
        <div class="preview-grid">
          <div
            v-for="(img, index) in exportedImages"
            :key="index"
            class="preview-card"
            @click="previewImage(index)"
          >
            <div class="preview-image-wrapper">
              <img :src="img.path" class="preview-image" />
              <div class="preview-overlay">
                <n-icon :component="EyeOutlined" />
                <span>预览</span>
              </div>
            </div>
            <div class="preview-info">
              <span class="preview-day">{{ img.dayName }}</span>
              <span v-if="img.dateText" class="preview-date">{{ img.dateText }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 成功提示 - 缩小为次要信息 -->
      <div class="success-section">
        <n-icon :component="CheckCircleFilled" class="success-icon" />
        <span class="result-desc">共 {{ exportedImages.length }} 张行程海报</span>
      </div>

      <n-button type="primary" size="large" class="download-btn" @click="saveAllImages">
        <template #icon>
          <n-icon :component="DownloadOutlined" />
        </template>
        保存全部图片
      </n-button>
    </div>

    <!-- 隐藏的 Canvas 用于生成图片 -->
    <div class="canvas-container">
      <canvas
        ref="exportCanvas"
        :width="canvasWidth"
        :height="canvasHeight"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import {
  NButton,
  NSpin,
  NIcon,
  useMessage
} from 'naive-ui'
import {
  FileImageOutlined,
  FileTextOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  CalendarOutlined,
  ExportOutlined,
  InfoCircleOutlined,
  EyeOutlined
} from '@vicons/antd'
import { exportApi, scheduleApi } from '@/services/api'
import { getJSON, setJSON } from '@/utils/storage.js'

// 高德地图逆地理编码代理地址
const AMAP_REGEO_PROXY = '/api/amap/regeo'

// 逆地理编码缓存配置
const CACHE_KEY = 'regeo_cache'
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000 // 30天有效期
const memoryCache = new Map() // 内存缓存

/**
 * 获取缓存的位置信息
 */
const getCachedRegeo = (key: string): any => {
  // 先查内存
  if (memoryCache.has(key)) {
    return memoryCache.get(key)
  }
  
  // 再查 localStorage
  const stored = getJSON(CACHE_KEY)
  if (stored && stored[key]) {
    const { data, expireTime } = stored[key]
    if (Date.now() < expireTime) {
      // 回填内存
      memoryCache.set(key, data)
      return data
    }
  }
  return null
}

/**
 * 设置缓存的位置信息
 */
const setCachedRegeo = (key: string, data: any) => {
  // 写入内存
  memoryCache.set(key, data)
  
  // 写入 localStorage
  const stored = getJSON(CACHE_KEY) || {}
  stored[key] = {
    data,
    expireTime: Date.now() + CACHE_TTL
  }
  setJSON(CACHE_KEY, stored)
}

interface LocationInfo {
  name?: string
  lng?: number
  lat?: number
}

interface DayEvent {
  id: string
  time?: string
  title?: string
  locationName?: string
  location?: LocationInfo
  city?: string // 城市级别信息 - 使用高德逆地理编码获取
  type?: string
  duration?: string
  tags?: string[]
  isMulti?: boolean
  options?: Array<{
    title?: string
    name?: string
    locationName?: string
    location?: LocationInfo
    city?: string
    type?: string
    time?: string
  }>
}

interface Day {
  id: string
  label?: string
  date?: string
  events?: DayEvent[]
}

interface ExportedImage {
  path: string
  hdPath: string
  dayName: string
  dateText: string
  dayId: string
  fileName: string
}

const props = defineProps<{
  tripId?: string
  days?: Day[]
  currentDayId?: string
  isOwner?: boolean
  tripTitle?: string
  tripYear?: string
  tripDateRange?: string
  tripDays?: number
  tripBudget?: string
  tripLocations?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const message = useMessage()

type Step = 'options' | 'exporting' | 'result'
type ExportFormat = 'image' | 'json'

const step = ref<Step>('options')
const selectedFormat = ref<ExportFormat>('image')
const selectedDays = ref<string[]>(props.currentDayId ? [props.currentDayId] : [])
const progressPercent = ref(0)
const progressText = ref('')
const exportedImages = ref<ExportedImage[]>([])
const canvasWidth = 375
const hdCanvasWidth = 1125  // 3倍宽度直接绘制，不使用scale
const canvasHeight = ref(800)
const isExporting = ref(false)
const exportCanvas = ref<HTMLCanvasElement | null>(null)
const daysData = ref<Record<string, DayEvent[]>>({})

const days = computed(() => props.days || [])

const isAllSelected = computed(() => {
  return days.value.length > 0 && selectedDays.value.length === days.value.length
})

const canExport = computed(() => {
  return selectedDays.value.length > 0
})

const formatDateShort = (dateStr?: string): string => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

/**
 * 使用高德逆地理编码获取精确的行政区划信息
 * 支持自动重试机制
 * @param lng 经度
 * @param lat 纬度
 * @param retryCount 重试次数
 * @returns 行政区划信息 { province, city, district, street }
 */
const fetchRegeoInfo = async (lng: number, lat: number, retryCount = 2): Promise<any> => {
  const cacheKey = `${lng.toFixed(6)},${lat.toFixed(6)}`

  // 检查缓存
  const cached = getCachedRegeo(cacheKey)
  if (cached) {
    return cached
  }

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const res = await fetch(`${AMAP_REGEO_PROXY}?location=${cacheKey}`)
      
      // 如果是QPS超限，等待后重试
      if (res.status === 429 || res.status === 503) {
        if (attempt < retryCount) {
          const waitTime = 1000 * (attempt + 1) // 1s, 2s, 3s...
          console.warn(`[Regeo] QPS超限，${waitTime}ms后重试...`)
          await delay(waitTime)
          continue
        }
      }
      
      if (!res.ok) {
        console.error('[Regeo] 逆地理编码请求失败:', res.status)
        return null
      }

      const data = await res.json()
      
      // 处理高德API返回的QPS限制错误
      if (data?.infocode === '10021' || data?.info?.includes('LIMIT')) {
        if (attempt < retryCount) {
          const waitTime = 1000 * (attempt + 1)
          console.warn(`[Regeo] 高德API限流，${waitTime}ms后重试...`)
          await delay(waitTime)
          continue
        }
        console.error('[Regeo] 高德API限流，重试次数已用完')
        return null
      }
      
      if (data?.status === '1' && data?.regeocode?.addressComponent) {
        const component = data.regeocode.addressComponent
        const result = {
          province: component.province || '',
          city: component.city || '',
          district: component.district || '',
          street: component.street || component.streetNumber?.street || '',
          township: component.township || '',
          adcode: component.adcode || ''
        }

        // 缓存结果（内存 + localStorage）
        setCachedRegeo(cacheKey, result)

        return result
      }
      
      // 其他错误，直接返回
      return null
    } catch (err) {
      console.error(`[Regeo] 逆地理编码失败 (尝试${attempt + 1}/${retryCount + 1}):`, err)
      if (attempt < retryCount) {
        await delay(500)
      }
    }
  }

  return null
}

/**
 * 获取格式化的城市/区县名称
 * 优先使用高德逆地理编码结果，精确到区县级别
 * 
 * 显示规则：
 * - 直辖市：北京·朝阳、上海·浦东
 * - 县级市：直接显示县级市名称（如：大理、景洪、腾冲）
 * - 普通市辖区：市·区（如：昆明·西山）
 */
const getFormattedLocation = async (location?: LocationInfo): Promise<string> => {
  if (!location) return ''

  const lng = location.lng
  const lat = location.lat

  // 如果有坐标，使用高德逆地理编码
  if (lng && lat) {
    const regeoInfo = await fetchRegeoInfo(lng, lat)
    if (regeoInfo) {
      const district = regeoInfo.district || ''
      const city = regeoInfo.city || ''
      const province = regeoInfo.province || ''

      // 直辖市特殊处理：显示"北京市·朝阳区"
      const isDirectCity = ['北京市', '上海市', '天津市', '重庆市'].includes(province)
      if (isDirectCity) {
        const cityName = province // 保留"市"后缀：北京**市**
        const districtName = district // 保留"区/县"后缀：朝阳**区**
        return districtName ? `${cityName}·${districtName}` : cityName
      }

      // 判断是否为县级市（district以"市"结尾，且city和district不同名）
      const isCountyLevelCity = district.endsWith('市') && district !== city

      if (isCountyLevelCity) {
        // 县级市：显示完整名称（保留"市"后缀）
        // 例如：大理市、景洪市、腾冲市
        return district
      } else {
        // 普通市辖区：没有县级市，显示地级市
        // 例如：昆明市·官渡区 → 昆明市
        // 例如：普洱市·思茅区 → 普洱市
        if (city) {
          return city
        } else if (district) {
          return district
        }
      }
    }
  }

  // 降级：返回空字符串（避免显示具体地址）
  return ''
}

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedDays.value = []
  } else {
    selectedDays.value = days.value.map(d => d.id)
  }
}

/**
 * 延迟函数
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 为所有事件的位置信息添加精确的行政区划数据
 * 使用高德逆地理编码API
 * 
 * 优化策略：
 * 1. 先查缓存，缓存命中不走API
 * 2. 去重：相同坐标只请求一次
 * 3. 串行请求：避免QPS超限（高德免费版限制约1-2次/秒）
 * 4. 请求间隔：每200ms发一个请求
 */
const enrichLocationInfo = async () => {
  // 收集所有需要解析的坐标（去重）
  const locationMap = new Map<string, { lng: number, lat: number, events: any[] }>()
  
  Object.values(daysData.value).forEach((events: DayEvent[]) => {
    events.forEach((evt: DayEvent) => {
      // 主事件位置
      if (evt.location?.lng && evt.location?.lat) {
        const key = `${evt.location.lng.toFixed(6)},${evt.location.lat.toFixed(6)}`
        if (!locationMap.has(key)) {
          locationMap.set(key, { lng: evt.location.lng, lat: evt.location.lat, events: [] })
        }
        locationMap.get(key)!.events.push(evt)
      }
      
      // 选项位置
      if (evt.options) {
        evt.options.forEach((opt: any) => {
          if (opt.location?.lng && opt.location?.lat) {
            const key = `${opt.location.lng.toFixed(6)},${opt.location.lat.toFixed(6)}`
            if (!locationMap.has(key)) {
              locationMap.set(key, { lng: opt.location.lng, lat: opt.location.lat, events: [] })
            }
            locationMap.get(key)!.events.push(opt)
          }
        })
      }
    })
  })
  
  const uniqueLocations = Array.from(locationMap.entries())
  const total = uniqueLocations.length
  
  // 先统计缓存命中数
  let cacheHit = 0
  let apiCall = 0
  
  for (let i = 0; i < total; i++) {
    const [key, { lng, lat, events }] = uniqueLocations[i]
    
    // 检查缓存
    const cached = getCachedRegeo(key)
    if (cached) {
      // 缓存命中，直接填充
      events.forEach((evt: any) => {
        evt.city = formatRegeoResult(cached)
      })
      cacheHit++
      continue
    }
    
    // 缓存未命中，走API
    apiCall++
    progressText.value = `正在解析位置信息 (${i + 1}/${total}，API请求${apiCall})...`
    
    try {
      const regeoInfo = await fetchRegeoInfo(lng, lat)
      const cityName = regeoInfo ? formatRegeoResult(regeoInfo) : ''
      
      // 填充所有使用此坐标的事件
      events.forEach((evt: any) => {
        evt.city = cityName
      })
    } catch (err) {
      console.error('[Regeo] 请求失败:', err)
    }
    
    // 请求间隔200ms，控制QPS在5次/秒以下
    if (i < total - 1) {
      await delay(200)
    }
  }
  
  console.log(`[Regeo] 总计${total}个位置，缓存命中${cacheHit}，API请求${apiCall}`)
}

/**
 * 格式化逆地理编码结果为显示字符串
 *
 * 显示规则：
 * - 直辖市：北京市·朝阳区、上海市·浦东新区
 * - 县级市：景洪市、大理市、腾冲市（完整名称）
 * - 普通市辖区：只显示到县级市，没有县级市就精确到地级市
 *   例如：西双版纳州·景洪市 → 景洪市
 *   例如：昆明市·官渡区 → 昆明市（没有县级市，显示地级市）
 */
const formatRegeoResult = (regeoInfo: any): string => {
  const district = regeoInfo.district || ''
  const city = regeoInfo.city || ''
  const province = regeoInfo.province || ''

  // 直辖市特殊处理：显示"北京市·朝阳区"
  const isDirectCity = ['北京市', '上海市', '天津市', '重庆市'].includes(province)
  if (isDirectCity) {
    return district ? `${province}·${district}` : province
  }

  // 判断是否为县级市（district以"市"结尾，且city和district不同名）
  // 例如：景洪市 ≠ 西双版纳州，大理市 ≠ 大理州
  const isCountyLevelCity = district.endsWith('市') && district !== city
  if (isCountyLevelCity) {
    return district
  }

  // 普通市辖区：没有县级市，显示地级市
  // 例如：昆明市·官渡区 → 昆明市
  // 例如：普洱市·思茅区 → 普洱市
  if (city) {
    return city
  } else if (district) {
    return district
  }

  return ''
}

const toggleDay = (dayId: string) => {
  const index = selectedDays.value.indexOf(dayId)
  if (index > -1) {
    selectedDays.value = selectedDays.value.filter(id => id !== dayId)
  } else {
    selectedDays.value = [...selectedDays.value, dayId]
  }
}



// 获取类型图标
const getTypeEmoji = (type?: string): string => {
  const typeMap: Record<string, string> = {
    scenic: '🏞️',
    food: '🍜',
    hotel: '🏨',
    transport: '🚗',
    activity: '🎉',
    shopping: '🛍️',
    other: '📌'
  }
  return typeMap[type || ''] || '📍'
}

// 获取类型颜色
const getTypeColor = (type?: string): string => {
  const colorMap: Record<string, string> = {
    scenic: '#3b82f6',
    food: '#22c55e',
    hotel: '#f59e0b',
    transport: '#ef4444',
    activity: '#8b5cf6',
    shopping: '#ec4899',
    other: '#6b7280'
  }
  return colorMap[type || ''] || '#ff6b6b'
}

// 获取类型标签文字
const getTypeLabel = (type?: string): string => {
  const labelMap: Record<string, string> = {
    scenic: '景点',
    food: '美食',
    hotel: '住宿',
    transport: '交通',
    activity: '活动',
    shopping: '购物',
    other: '其他'
  }
  return labelMap[type || ''] || ''
}

// 获取日程数据
const fetchDaySchedule = async (dayId: string): Promise<DayEvent[]> => {
  if (!props.tripId) return []

  try {
    const res = await scheduleApi.fetchV2(props.tripId, dayId, { template: 'card' })
    const dayDataList = res?.data || []
    const dayData = Array.isArray(dayDataList) ? dayDataList[0] : null
    const events = dayData?.events || []

    // 获取位置信息
    const allLocations = res?.locations || []
    const locationMap = new Map()
    allLocations.forEach(loc => {
      const id = loc.id || loc.locationId || loc.location_id || loc.uid
      if (id) {
        locationMap.set(String(id), loc)
      }
    })

    return events.map((evt: any) => {
      const location = evt.location || locationMap.get(String(evt.locationId || evt.location_id))
      
      // 提取位置坐标
      const locationInfo: LocationInfo = location ? {
        name: location.name || evt.locationName || '',
        lng: location.lng || location.longitude,
        lat: location.lat || location.latitude
      } : undefined
      
      // 处理多选卡片的选项
      const isMulti = evt.cardType === 'multi' || evt.isMulti
      let options = []
      if (isMulti && Array.isArray(evt.options)) {
        options = evt.options.map((opt: any) => {
          const optLocation = opt.location
          const optLocationInfo: LocationInfo = optLocation ? {
            name: optLocation.name || opt.locationName || '',
            lng: optLocation.lng || optLocation.longitude,
            lat: optLocation.lat || optLocation.latitude
          } : undefined
          
          return {
            title: opt.title || opt.name || '未命名',
            name: opt.name || opt.title || '未命名',
            locationName: optLocation?.name || opt.locationName || '',
            location: optLocationInfo,
            city: '', // 稍后通过逆地理编码填充
            type: opt.type || evt.type || 'scenic',
            time: opt.time || opt.startTime || ''
          }
        })
      }
      
      return {
        id: String(evt.id || evt.uid || `evt_${Date.now()}`),
        time: evt.time || evt.startTime || '--:--',
        title: evt.title || '未命名',
        locationName: location?.name || evt.locationName || '',
        location: locationInfo,
        city: '', // 稍后通过逆地理编码填充
        type: evt.type || 'scenic',
        duration: evt.durationMin ? `${Math.floor(evt.durationMin / 60)}小时${evt.durationMin % 60}分钟` : evt.duration || '',
        tags: Array.isArray(evt.tags) ? evt.tags.map((t: any) => typeof t === 'string' ? t : t.text || t.name || '').filter(Boolean) : [],
        isMulti,
        options
      }
    })
  } catch (err) {
    console.error('获取日程失败:', err)
    return []
  }
}

const startExport = async () => {
  if (selectedFormat.value === 'json') {
    await exportJSON()
    return
  }

  isExporting.value = true
  step.value = 'exporting'
  progressPercent.value = 0
  progressText.value = '正在准备...'

  try {
    const daysToExport = days.value.filter(d => selectedDays.value.includes(d.id))

    // 先获取所有选中天的日程数据
    progressText.value = '正在加载行程数据...'
    daysData.value = {}
    for (let i = 0; i < daysToExport.length; i++) {
      const day = daysToExport[i]
      progressText.value = `正在加载第 ${i + 1}/${daysToExport.length} 天数据...`
      const events = await fetchDaySchedule(day.id)
      daysData.value[day.id] = events
      progressPercent.value = Math.round(((i + 1) / daysToExport.length) * 20)
    }

    // 使用高德逆地理编码获取精确的城市/区县信息
    progressText.value = '正在解析位置信息...'
    await enrichLocationInfo()
    progressPercent.value = 30

    // 等待 canvas 准备好
    await nextTick()
    await delay(50)

    const canvas = exportCanvas.value
    if (!canvas) {
      throw new Error('Canvas not found')
    }

    exportedImages.value = []
    const totalDays = daysToExport.length

    for (let i = 0; i < totalDays; i++) {
      const day = daysToExport[i]

      // 获取这个天数在原始 days 数组中的真实索引（用于显示正确的天数编号）
      const originalIndex = days.value.findIndex(d => d.id === day.id)

      progressPercent.value = 30 + Math.round((i / totalDays) * 70)
      progressText.value = `正在生成第 ${originalIndex + 1}天...`

      // 计算当前天的高度
      const dayHeight = calculateCanvasHeight({ ...day, events: daysData.value[day.id] || [] })
      canvasHeight.value = dayHeight

      // 等待 canvas 更新高度
      await nextTick()
      await delay(50)

      const ctx = canvas.getContext('2d')
      if (!ctx) continue

      // 绘制行程卡片（预览图）
      const dayWithEvents = { ...day, events: daysData.value[day.id] || [] }
      await drawTripCard(ctx, dayWithEvents, dayHeight, originalIndex, totalDays)

      // 生成预览图
      const previewPath = canvas.toDataURL('image/png', 0.95)

      // 生成高清图（3倍分辨率直接绘制）
      progressText.value = `正在生成第 ${originalIndex + 1}天高清图...`
      const hdCanvas = document.createElement('canvas')
      const hdHeight = dayHeight * 3
      hdCanvas.width = hdCanvasWidth
      hdCanvas.height = hdHeight

      const hdCtx = hdCanvas.getContext('2d')
      let hdPath = previewPath
      if (hdCtx) {
        await drawHDTripCard(hdCtx, dayWithEvents, dayHeight, originalIndex, totalDays)
        hdPath = hdCanvas.toDataURL('image/png', 1.0)
      }

      const fileName = generateFileName(day.label, originalIndex)

      // 获取日期显示文本
      const dayName = `第${originalIndex + 1}天`
      const dateText = day.date ? formatDateShort(day.date) : ''

      exportedImages.value.push({
        path: previewPath,
        hdPath: hdPath,
        dayName: dayName,
        dateText: dateText,
        dayId: day.id,
        fileName
      })

      await delay(100)
    }

    progressPercent.value = 100
    await delay(200)
    step.value = 'result'
  } catch (error) {
    console.error('导出失败:', error)
    message.error('导出失败')
    step.value = 'options'
  } finally {
    isExporting.value = false
  }
}

// 计算标题区域高度（根据内容动态）
const calculateHeaderHeight = (): number => {
  const tripTitle = props.tripTitle || '行程详情'
  const tripDateRange = props.tripDateRange
  const hasMetaInfo = props.tripDays || props.tripBudget || props.tripLocations
  
  let height = 80 // 基础高度（标题区域）
  
  if (tripDateRange) {
    height += 25 // 日期范围
  }
  
  if (hasMetaInfo) {
    height += 45 // 信息栏区域
  }
  
  return height + 20 // 底部padding
}

const calculateCanvasHeight = (day: Day): number => {
  const events = day.events || []
  const headerHeight = calculateHeaderHeight()
  const dayHeaderHeight = 100 // 第X天标题区域
  const footerHeight = 60
  const minHeight = 800

  let contentHeight = headerHeight + dayHeaderHeight + footerHeight
  
  if (events.length > 0) {
    events.forEach(event => {
      if (event.isMulti && event.options && event.options.length > 0) {
        // 多选卡片：基础高度 + 每个选项的高度
        contentHeight += 60 + event.options.length * 55
      } else {
        // 单选卡片
        contentHeight += 110
      }
    })
  } else {
    contentHeight += 140
  }

  return Math.max(contentHeight, minHeight)
}

// 绘制单选事件卡片
const drawSingleEvent = (ctx: CanvasRenderingContext2D, event: DayEvent, startY: number, w: number): number => {
  const eventY = startY
  
  ctx.strokeStyle = '#e8ecf1'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(50, eventY + 25)
  ctx.lineTo(50, eventY + 95)
  ctx.stroke()

  const typeColor = getTypeColor(event.type)
  ctx.fillStyle = typeColor + '30'
  ctx.beginPath()
  ctx.arc(50, eventY + 18, 12, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = typeColor
  ctx.beginPath()
  ctx.arc(50, eventY + 18, 8, 0, Math.PI * 2)
  ctx.fill()

  // 时间显示在时间点上（如果有）
  if (event.time) {
    ctx.fillStyle = typeColor
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(event.time, 70, eventY + 23)
  }

  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.04)'
  ctx.shadowBlur = 12
  ctx.shadowOffsetY = 3
  ctx.beginPath()
  ctx.roundRect(70, eventY + 35, w - 100, 65, 12)
  ctx.fill()
  ctx.shadowColor = 'transparent'

  // 计算右侧需要预留的宽度（时间 + 类型标签）
  // 过滤掉无效的时间值
  let timeText = event.time
  if (!timeText || timeText === '---' || timeText === '--:--') {
    timeText = ''
  }
  const typeLabel = getTypeLabel(event.type)
  let rightWidth = 8 // 右边距（更紧凑）
  
  if (timeText) {
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
    rightWidth += ctx.measureText(timeText).width + 6
  }
  if (typeLabel) {
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
    rightWidth += ctx.measureText(typeLabel).width + 12 + 4
  }
  
  // 标题（不带emoji）
  ctx.fillStyle = '#1a1a2e'
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'left'
  let title = (event.title || '未命名').trim()
  // 移除标题开头的emoji
  title = title.replace(/^[\u{1F300}-\u{1F9FF}]\s*/u, '')
  
  const maxTitleWidth = w - 95 - rightWidth
  let displayTitle = title
  if (ctx.measureText(title).width > maxTitleWidth) {
    let truncated = title
    while (ctx.measureText(truncated + '...').width > maxTitleWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1)
    }
    displayTitle = truncated + '...'
  }
  ctx.fillText(displayTitle, 85, eventY + 60)

  // 右侧内容：时间 + 类型标签
  // 卡片右边缘是 w - 30（从70开始，宽度w-100）
  let rightX = w - 35 // 更靠近右边框
  
  // 类型标签（紧靠右边框）
  if (typeLabel) {
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
    const labelWidth = ctx.measureText(typeLabel).width + 10 // 更紧凑的padding
    
    // 标签背景
    ctx.fillStyle = typeColor + '20'
    ctx.beginPath()
    ctx.roundRect(rightX - labelWidth, eventY + 45, labelWidth, 20, 4)
    ctx.fill()
    
    // 标签文字
    ctx.fillStyle = typeColor
    ctx.textAlign = 'center'
    ctx.fillText(typeLabel, rightX - labelWidth / 2, eventY + 59)
    ctx.textAlign = 'left'
    
    rightX -= labelWidth + 6 // 更紧凑的间距
  }
  
  // 时间（在标签左侧）
  if (timeText) {
    ctx.fillStyle = '#94a3b8'
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(timeText, rightX, eventY + 59)
    ctx.textAlign = 'left'
  }

  if (event.locationName) {
    ctx.fillStyle = '#64748b'
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText(`📍 ${event.locationName}`, 85, eventY + 85)
  } else if (event.duration) {
    ctx.fillStyle = '#64748b'
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText(`⏱️ ${event.duration}`, 85, eventY + 85)
  }
  
  return startY + 110
}

// 绘制多选事件卡片 - 展示所有选项
const drawMultiEvent = (ctx: CanvasRenderingContext2D, event: DayEvent, startY: number, w: number): number => {
  const eventY = startY
  const options = event.options || []
  
  // 绘制时间线
  const totalHeight = 35 + options.length * 55
  ctx.strokeStyle = '#e8ecf1'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(50, eventY + 15)
  ctx.lineTo(50, eventY + totalHeight - 10)
  ctx.stroke()

  // 绘制时间点（多选用紫色）
  const multiColor = '#8b5cf6'
  ctx.fillStyle = multiColor + '30'
  ctx.beginPath()
  ctx.arc(50, eventY + 10, 12, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = multiColor
  ctx.beginPath()
  ctx.arc(50, eventY + 10, 8, 0, Math.PI * 2)
  ctx.fill()

  // 绘制多选标题（不带emoji）
  ctx.fillStyle = '#1a1a2e'
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'left'
  const title = event.title || '多选'
  ctx.fillText(title, 70, eventY + 15)

  // 绘制每个选项
  options.forEach((option, index) => {
    const optionY = eventY + 35 + index * 55
    
    // 选项背景
    ctx.fillStyle = '#ffffff'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.04)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 2
    ctx.beginPath()
    ctx.roundRect(70, optionY, w - 100, 48, 8)
    ctx.fill()
    ctx.shadowColor = 'transparent'
    
    // 选项序号圆圈
    const optionColor = getTypeColor(option.type)
    ctx.fillStyle = optionColor
    ctx.beginPath()
    ctx.arc(95, optionY + 24, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(String(index + 1), 95, optionY + 28)
    
    // 选项标题（移除可能存在的emoji前缀）
    ctx.fillStyle = '#1a1a2e'
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'left'
    let optionTitle = (option.title || option.name || '未命名').trim()
    // 移除标题开头的emoji
    optionTitle = optionTitle.replace(/^[\u{1F300}-\u{1F9FF}]\s*/u, '')
    
    // 计算右侧需要预留的宽度（时间 + 类型标签）
    // 过滤掉无效的时间值（空字符串、null、undefined、---等）
    let timeText = option.time || event.time
    if (!timeText || timeText === '---' || timeText === '--:--') {
      timeText = ''
    }
    const typeLabel = getTypeLabel(option.type)
    let rightWidth = 8 // 右边距（更紧凑）
    
    if (timeText) {
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
      rightWidth += ctx.measureText(timeText).width + 6
    }
    if (typeLabel) {
      ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
      rightWidth += ctx.measureText(typeLabel).width + 12 + 4 // 标签宽度 + padding + 间距
    }
    
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
    const maxWidth = w - 125 - rightWidth
    let displayTitle = optionTitle
    if (ctx.measureText(optionTitle).width > maxWidth) {
      let truncated = optionTitle
      while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
        truncated = truncated.slice(0, -1)
      }
      displayTitle = truncated + '...'
    }
    ctx.fillText(displayTitle, 115, optionY + 28)
    
    // 右侧内容：时间 + 类型标签
    // 从卡片右边缘开始计算（卡片宽度 w-100，从 70 开始，所以右边缘是 w-30）
    let rightX = w - 35 // 更靠近右边框
    
    // 类型标签（紧靠右边框）
    if (typeLabel) {
      ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
      const labelWidth = ctx.measureText(typeLabel).width + 10 // 更紧凑的padding
      
      // 标签背景
      ctx.fillStyle = optionColor + '20'
      ctx.beginPath()
      ctx.roundRect(rightX - labelWidth, optionY + 14, labelWidth, 20, 4)
      ctx.fill()
      
      // 标签文字
      ctx.fillStyle = optionColor
      ctx.textAlign = 'center'
      ctx.fillText(typeLabel, rightX - labelWidth / 2, optionY + 28)
      ctx.textAlign = 'left'
      
      rightX -= labelWidth + 6 // 更紧凑的间距
    }
    
    // 时间（在标签左侧）
    if (timeText) {
      ctx.fillStyle = '#94a3b8'
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(timeText, rightX, optionY + 28)
      ctx.textAlign = 'left'
    }
    
    // 选项地点（如果有）
    if (option.locationName) {
      ctx.fillStyle = '#64748b'
      ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
      ctx.fillText(`📍 ${option.locationName}`, 115, optionY + 42)
    }
  })
  
  return startY + totalHeight
}

const drawTripCard = async (ctx: CanvasRenderingContext2D, day: Day, height: number, dayIndex: number = 0, totalDays: number = 1) => {
  const w = canvasWidth
  const h = height
  const events = day.events || []

  // 获取行程信息
  const tripTitle = props.tripTitle || '行程详情'
  const tripYear = props.tripYear || ''
  const tripDateRange = props.tripDateRange || ''
  const tripDays = props.tripDays || totalDays
  const tripBudget = props.tripBudget || ''
  const tripLocations = props.tripLocations || ''

  // 获取当天信息
  const dayNumber = dayIndex + 1
  const dayDate = day.date ? formatDateShort(day.date) : ''

  // ===== 计算当天统计信息 =====
  const dayEvents = events || []
  const eventTypes: Record<string, number> = {}
  const dayCities: string[] = []

  // 类型映射（将相似类型归类）
  const typeMapping: Record<string, string> = {
    scenic: 'scenic',
    spot: 'scenic',
    food: 'food',
    hotel: 'hotel',
    transport: 'transport',
    activity: 'activity',
    shopping: 'shopping',
    other: 'other'
  }

  dayEvents.forEach(event => {
    // 统计事件类型（合并相似类型）
    const rawType = event.type || 'other'
    const mappedType = typeMapping[rawType] || 'other'
    eventTypes[mappedType] = (eventTypes[mappedType] || 0) + 1

    // 收集城市级别地点（不是具体地点）
    if (event.city && !dayCities.includes(event.city)) {
      dayCities.push(event.city)
    }

    // 多选卡片的选项城市
    if (event.isMulti && event.options) {
      event.options.forEach((opt: any) => {
        if (opt.city && !dayCities.includes(opt.city)) {
          dayCities.push(opt.city)
        }
      })
    }
  })

  // 生成当天统计文本
  const typeLabels: Record<string, string> = {
    scenic: '景点',
    food: '美食',
    hotel: '住宿',
    transport: '交通',
    activity: '活动',
    shopping: '购物',
    other: '其他'
  }
  const dayStats = Object.entries(eventTypes)
    .filter(([_, count]) => count > 0)
    .map(([type, count]) => `${count}${typeLabels[type] || typeLabels.other}`)
    .join('·')

  // 当天主要城市（取前2个，与顶部地点精度一致）
  const dayMainCities = dayCities.slice(0, 2).join('·')

  // ===== 顶部标题区域 - 完整行程信息（复用 TripDetailHeader 样式）=====
  const hasDateRange = !!tripDateRange
  const hasMetaInfo = !!(tripDays || tripBudget || tripLocations)
  // padding-top(20) + title(24) + gap(4) + date(16) + gap(8) + meta(28) + padding-bottom(12)
  const headerHeight = 20 + 24 + (hasDateRange ? 4 + 16 : 0) + (hasMetaInfo ? 8 + 28 : 0) + 12

  // 白色背景
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)

  // 顶部渐变背景
  const gradient = ctx.createLinearGradient(0, 0, w, headerHeight)
  gradient.addColorStop(0, '#ff7b7b')
  gradient.addColorStop(1, '#ffa07a')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.roundRect(0, 0, w, headerHeight, [0, 0, 20, 20])
  ctx.fill()

  // 顶部装饰效果
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.beginPath()
  ctx.arc(w * 0.8, -headerHeight * 0.2, headerHeight * 0.6, 0, Math.PI * 2)
  ctx.fill()

  // ===== header-inner =====
  let currentY = 40 // padding-top 20 + 标题基线

  // 行程标题 + 年份标签
  ctx.fillStyle = '#ffffff'
  ctx.font = '800 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'

  const titleText = tripYear ? `${tripTitle} ${tripYear}` : tripTitle
  ctx.fillText(titleText, w / 2, currentY)

  // 日期范围
  if (tripDateRange) {
    currentY += 24
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText(tripDateRange, w / 2, currentY)
  }

  // 信息栏 - 展示完整行程信息
  if (hasMetaInfo) {
    currentY += 28

    const metaItems = []
    if (tripDays) metaItems.push(`${tripDays}天`)
    if (tripBudget) metaItems.push(tripBudget)
    // 显示完整地点信息（不截断）
    if (tripLocations) {
      metaItems.push(tripLocations)
    }

    if (metaItems.length > 0) {
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'

      // 计算总宽度
      let totalMetaWidth = 0
      const itemWidths = metaItems.map(text => {
        const width = ctx.measureText(text).width + 20 // padding: 10px
        totalMetaWidth += width
        return width
      })
      totalMetaWidth += (metaItems.length - 1) * 12 // gap: 12px

      let metaX = (w - totalMetaWidth) / 2
      const metaY = currentY

      metaItems.forEach((text, index) => {
        const itemWidth = itemWidths[index]

        // 标签背景
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
        ctx.beginPath()
        ctx.roundRect(metaX, metaY - 12, itemWidth, 24, 12)
        ctx.fill()

        // 标签文字
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
        ctx.fillText(text, metaX + itemWidth / 2, metaY + 4)

        metaX += itemWidth + 12
      })
    }
  }

  // ===== 内容区域背景 =====
  const contentStartY = headerHeight + 12 // margin-bottom: 12px
  ctx.fillStyle = '#f8f9fa'
  ctx.fillRect(16, contentStartY, w - 32, h - contentStartY - 60)

  // 圆角裁剪
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(16, contentStartY, w - 32, h - contentStartY - 60, 20)
  ctx.clip()
  ctx.fillStyle = '#f5f7fa'
  ctx.fillRect(16, contentStartY, w - 32, h - contentStartY - 60)
  ctx.restore()

  // ===== 当天标题区域 - 增加当天信息 =====
  currentY = contentStartY + 30
  
  // 第一行：第X天 + 日期
  ctx.fillStyle = '#1a1a2e'
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`第${dayNumber}天`, 32, currentY)
  
  // 日期 - 右侧显示
  if (dayDate) {
    ctx.fillStyle = '#64748b'
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(dayDate, w - 32, currentY)
    ctx.textAlign = 'left'
  }
  
  // 第二行：当天统计信息
  // 格式：昆明·玉溪｜2住宿·3交通·4景点·1美食
  // 如果超长则换行显示，换行后不显示分隔符
  currentY += 22
  const maxLineWidth = w - 64 // 左右各32px边距
  
  if (dayMainCities && dayStats) {
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
    
    const citiesWidth = ctx.measureText(dayMainCities).width
    const separatorWidth = ctx.measureText('｜').width
    const statsWidth = ctx.measureText(dayStats).width
    const totalWidth = citiesWidth + separatorWidth + statsWidth
    
    // 判断是否超长
    if (totalWidth > maxLineWidth) {
      // 超长：换行显示，不显示分隔符
      // 第一行：城市
      ctx.fillStyle = '#64748b'
      ctx.textAlign = 'left'
      ctx.fillText(dayMainCities, 32, currentY)
      
      // 第二行：统计
      currentY += 18
      ctx.fillText(dayStats, 32, currentY)
    } else {
      // 未超长：单行显示，带分隔符
      // 绘制城市部分（灰色）
      ctx.fillStyle = '#64748b'
      ctx.textAlign = 'left'
      ctx.fillText(dayMainCities, 32, currentY)
      
      // 绘制分隔符（主题橘色）
      ctx.fillStyle = '#ff7b7b'
      ctx.fillText('｜', 32 + citiesWidth, currentY)
      
      // 绘制统计部分（灰色）
      ctx.fillStyle = '#64748b'
      ctx.fillText(dayStats, 32 + citiesWidth + separatorWidth, currentY)
    }
  } else if (dayMainCities) {
    ctx.fillStyle = '#64748b'
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText(dayMainCities, 32, currentY)
  } else if (dayStats) {
    ctx.fillStyle = '#64748b'
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText(dayStats, 32, currentY)
  }

  // 分隔线
  currentY += 18
  const lineGradient = ctx.createLinearGradient(32, 0, w - 32, 0)
  lineGradient.addColorStop(0, '#ff7b7b')
  lineGradient.addColorStop(0.5, '#ffd4d4')
  lineGradient.addColorStop(1, 'transparent')
  ctx.strokeStyle = lineGradient
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(32, currentY)
  ctx.lineTo(w - 32, currentY)
  ctx.stroke()

  currentY += 30

  if (events.length === 0) {
    ctx.fillStyle = '#94a3b8'
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('暂无安排', w / 2, currentY + 40)
    ctx.font = '48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText('📝', w / 2, currentY - 10)
  } else {
    for (let i = 0; i < events.length; i++) {
      const event = events[i]
      
      // 判断是否为多选卡片
      if (event.isMulti && event.options && event.options.length > 0) {
        // 绘制多选卡片
        currentY = drawMultiEvent(ctx, event, currentY, w)
      } else {
        // 绘制单选卡片
        currentY = drawSingleEvent(ctx, event, currentY, w)
      }
    }
  }

  const footerGradient = ctx.createLinearGradient(0, h - 60, 0, h)
  footerGradient.addColorStop(0, '#f8fafc')
  footerGradient.addColorStop(1, '#f1f5f9')
  ctx.fillStyle = footerGradient
  ctx.fillRect(0, h - 60, w, 60)

  ctx.fillStyle = '#94a3b8'
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`由 云南旅行 生成 · ${formatDate(new Date())}`, w / 2, h - 25)
}

// 绘制单选事件卡片（高清）
const drawSingleEventHD = (ctx: CanvasRenderingContext2D, event: DayEvent, startY: number, w: number, scale: number): number => {
  const eventY = startY
  
  ctx.strokeStyle = '#e8ecf1'
  ctx.lineWidth = 2 * scale
  ctx.beginPath()
  ctx.moveTo(50 * scale, eventY + 25 * scale)
  ctx.lineTo(50 * scale, eventY + 95 * scale)
  ctx.stroke()

  const typeColor = getTypeColor(event.type)
  ctx.fillStyle = typeColor + '30'
  ctx.beginPath()
  ctx.arc(50 * scale, eventY + 18 * scale, 12 * scale, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = typeColor
  ctx.beginPath()
  ctx.arc(50 * scale, eventY + 18 * scale, 8 * scale, 0, Math.PI * 2)
  ctx.fill()

  // 时间显示在时间点上（如果有）
  if (event.time) {
    ctx.fillStyle = typeColor
    ctx.font = `bold ${13 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'left'
    ctx.fillText(event.time, 70 * scale, eventY + 23 * scale)
  }

  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.04)'
  ctx.shadowBlur = 12 * scale
  ctx.shadowOffsetY = 3 * scale
  ctx.beginPath()
  ctx.roundRect(70 * scale, eventY + 35 * scale, w - 100 * scale, 65 * scale, 12 * scale)
  ctx.fill()
  ctx.shadowColor = 'transparent'

  // 计算右侧需要预留的宽度（时间 + 类型标签）
  // 过滤掉无效的时间值
  let timeText = event.time
  if (!timeText || timeText === '---' || timeText === '--:--') {
    timeText = ''
  }
  const typeLabel = getTypeLabel(event.type)
  let rightWidth = 8 * scale // 右边距（更紧凑）
  
  if (timeText) {
    ctx.font = `${11 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
    rightWidth += ctx.measureText(timeText).width + 6 * scale
  }
  if (typeLabel) {
    ctx.font = `${10 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
    rightWidth += ctx.measureText(typeLabel).width + 12 * scale + 4 * scale
  }
  
  // 标题（不带emoji）
  ctx.fillStyle = '#1a1a2e'
  ctx.font = `bold ${14 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
  ctx.textAlign = 'left'
  let title = (event.title || '未命名').trim()
  // 移除标题开头的emoji
  title = title.replace(/^[\u{1F300}-\u{1F9FF}]\s*/u, '')
  
  const maxTitleWidth = w - 95 * scale - rightWidth
  let displayTitle = title
  if (ctx.measureText(title).width > maxTitleWidth) {
    let truncated = title
    while (ctx.measureText(truncated + '...').width > maxTitleWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1)
    }
    displayTitle = truncated + '...'
  }
  ctx.fillText(displayTitle, 85 * scale, eventY + 60 * scale)

  // 右侧内容：时间 + 类型标签
  // 卡片右边缘是 w - 30*scale（从70*scale开始，宽度w-100*scale）
  let rightX = w - 35 * scale // 更靠近右边框
  
  // 类型标签（紧靠右边框）
  if (typeLabel) {
    ctx.font = `${10 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
    const labelWidth = ctx.measureText(typeLabel).width + 10 * scale // 更紧凑的padding
    
    // 标签背景
    ctx.fillStyle = typeColor + '20'
    ctx.beginPath()
    ctx.roundRect(rightX - labelWidth, eventY + 45 * scale, labelWidth, 20 * scale, 4 * scale)
    ctx.fill()
    
    // 标签文字
    ctx.fillStyle = typeColor
    ctx.textAlign = 'center'
    ctx.fillText(typeLabel, rightX - labelWidth / 2, eventY + 59 * scale)
    ctx.textAlign = 'left'
    
    rightX -= labelWidth + 6 * scale // 更紧凑的间距
  }
  
  // 时间（在标签左侧）
  if (timeText) {
    ctx.fillStyle = '#94a3b8'
    ctx.font = `${11 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'right'
    ctx.fillText(timeText, rightX, eventY + 59 * scale)
    ctx.textAlign = 'left'
  }

  if (event.locationName) {
    ctx.fillStyle = '#64748b'
    ctx.font = `${11 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.fillText(`📍 ${event.locationName}`, 85 * scale, eventY + 85 * scale)
  } else if (event.duration) {
    ctx.fillStyle = '#64748b'
    ctx.font = `${11 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.fillText(`⏱️ ${event.duration}`, 85 * scale, eventY + 85 * scale)
  }
  
  return startY + 110 * scale
}

// 绘制多选事件卡片（高清）- 展示所有选项
const drawMultiEventHD = (ctx: CanvasRenderingContext2D, event: DayEvent, startY: number, w: number, scale: number): number => {
  const eventY = startY
  const options = event.options || []
  
  // 绘制时间线
  const totalHeight = (35 + options.length * 55) * scale
  ctx.strokeStyle = '#e8ecf1'
  ctx.lineWidth = 2 * scale
  ctx.beginPath()
  ctx.moveTo(50 * scale, eventY + 15 * scale)
  ctx.lineTo(50 * scale, eventY + totalHeight - 10 * scale)
  ctx.stroke()

  // 绘制时间点（多选用紫色）
  const multiColor = '#8b5cf6'
  ctx.fillStyle = multiColor + '30'
  ctx.beginPath()
  ctx.arc(50 * scale, eventY + 10 * scale, 12 * scale, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = multiColor
  ctx.beginPath()
  ctx.arc(50 * scale, eventY + 10 * scale, 8 * scale, 0, Math.PI * 2)
  ctx.fill()

  // 绘制多选标题（不带emoji）
  ctx.fillStyle = '#1a1a2e'
  ctx.font = `bold ${14 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
  ctx.textAlign = 'left'
  const title = event.title || '多选'
  ctx.fillText(title, 70 * scale, eventY + 15 * scale)

  // 绘制每个选项
  options.forEach((option, index) => {
    const optionY = eventY + (35 + index * 55) * scale
    
    // 选项背景
    ctx.fillStyle = '#ffffff'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.04)'
    ctx.shadowBlur = 8 * scale
    ctx.shadowOffsetY = 2 * scale
    ctx.beginPath()
    ctx.roundRect(70 * scale, optionY, (w - 100 * scale), 48 * scale, 8 * scale)
    ctx.fill()
    ctx.shadowColor = 'transparent'
    
    // 选项序号圆圈
    const optionColor = getTypeColor(option.type)
    ctx.fillStyle = optionColor
    ctx.beginPath()
    ctx.arc(95 * scale, optionY + 24 * scale, 10 * scale, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${10 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(String(index + 1), 95 * scale, optionY + 28 * scale)
    
    // 选项标题（移除可能存在的emoji前缀）
    ctx.fillStyle = '#1a1a2e'
    ctx.font = `${13 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'left'
    let optionTitle = (option.title || option.name || '未命名').trim()
    // 移除标题开头的emoji
    optionTitle = optionTitle.replace(/^[\u{1F300}-\u{1F9FF}]\s*/u, '')
    
    // 计算右侧需要预留的宽度（时间 + 类型标签）
    // 过滤掉无效的时间值
    let timeText = option.time || event.time
    if (!timeText || timeText === '---' || timeText === '--:--') {
      timeText = ''
    }
    const typeLabel = getTypeLabel(option.type)
    let rightWidth = 8 * scale // 右边距（更紧凑）
    
    if (timeText) {
      ctx.font = `${11 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
      rightWidth += ctx.measureText(timeText).width + 6 * scale
    }
    if (typeLabel) {
      ctx.font = `${10 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
      rightWidth += ctx.measureText(typeLabel).width + 12 * scale + 4 * scale
    }
    
    ctx.font = `${13 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
    const maxWidth = w - 125 * scale - rightWidth
    let displayTitle = optionTitle
    if (ctx.measureText(optionTitle).width > maxWidth) {
      let truncated = optionTitle
      while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
        truncated = truncated.slice(0, -1)
      }
      displayTitle = truncated + '...'
    }
    ctx.fillText(displayTitle, 115 * scale, optionY + 28 * scale)
    
    // 右侧内容：时间 + 类型标签
    // 从卡片右边缘开始计算（卡片宽度 w-100*scale，从 70*scale 开始，所以右边缘是 w - 30*scale）
    let rightX = w - 35 * scale // 更靠近右边框
    
    // 类型标签（紧靠右边框）
    if (typeLabel) {
      ctx.font = `${10 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
      const labelWidth = ctx.measureText(typeLabel).width + 10 * scale // 更紧凑的padding
      
      // 标签背景
      ctx.fillStyle = optionColor + '20'
      ctx.beginPath()
      ctx.roundRect(rightX - labelWidth, optionY + 14 * scale, labelWidth, 20 * scale, 4 * scale)
      ctx.fill()
      
      // 标签文字
      ctx.fillStyle = optionColor
      ctx.textAlign = 'center'
      ctx.fillText(typeLabel, rightX - labelWidth / 2, optionY + 28 * scale)
      ctx.textAlign = 'left'
      
      rightX -= labelWidth + 6 * scale // 更紧凑的间距
    }
    
    // 时间（在标签左侧）
    if (timeText) {
      ctx.fillStyle = '#94a3b8'
      ctx.font = `${11 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
      ctx.textAlign = 'right'
      ctx.fillText(timeText, rightX, optionY + 28 * scale)
      ctx.textAlign = 'left'
    }
    
    // 选项地点（如果有）
    if (option.locationName) {
      ctx.fillStyle = '#64748b'
      ctx.font = `${10 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
      ctx.fillText(`📍 ${option.locationName}`, 115 * scale, optionY + 42 * scale)
    }
  })
  
  return startY + totalHeight
}

// 绘制高清行程图 - 使用 scale 缩放绘制，确保与预览图比例一致
const drawHDTripCard = async (ctx: CanvasRenderingContext2D, day: Day, height: number, dayIndex: number = 0, totalDays: number = 1) => {
  const scale = 3
  const w = canvasWidth * scale
  const h = height * scale
  const events = day.events || []

  // 获取行程信息
  const tripTitle = props.tripTitle || '行程详情'
  const tripYear = props.tripYear || ''
  const tripDateRange = props.tripDateRange || ''
  const tripDays = props.tripDays || totalDays
  const tripBudget = props.tripBudget || ''
  const tripLocations = props.tripLocations || ''

  // 获取当天信息
  const dayNumber = dayIndex + 1
  const dayDate = day.date ? formatDateShort(day.date) : ''

  // ===== 计算当天统计信息 =====
  const dayEvents = events || []
  const eventTypes: Record<string, number> = {}
  const dayCities: string[] = []

  // 类型映射（将相似类型归类）
  const typeMapping: Record<string, string> = {
    scenic: 'scenic',
    spot: 'scenic',
    food: 'food',
    hotel: 'hotel',
    transport: 'transport',
    activity: 'activity',
    shopping: 'shopping',
    other: 'other'
  }

  dayEvents.forEach(event => {
    // 统计事件类型（合并相似类型）
    const rawType = event.type || 'other'
    const mappedType = typeMapping[rawType] || 'other'
    eventTypes[mappedType] = (eventTypes[mappedType] || 0) + 1

    // 收集城市级别地点（不是具体地点）
    if (event.city && !dayCities.includes(event.city)) {
      dayCities.push(event.city)
    }

    // 多选卡片的选项城市
    if (event.isMulti && event.options) {
      event.options.forEach((opt: any) => {
        if (opt.city && !dayCities.includes(opt.city)) {
          dayCities.push(opt.city)
        }
      })
    }
  })

  // 生成当天统计文本
  const typeLabels: Record<string, string> = {
    scenic: '景点',
    food: '美食',
    hotel: '住宿',
    transport: '交通',
    activity: '活动',
    shopping: '购物',
    other: '其他'
  }
  const dayStats = Object.entries(eventTypes)
    .filter(([_, count]) => count > 0)
    .map(([type, count]) => `${count}${typeLabels[type] || typeLabels.other}`)
    .join('·')

  // 当天主要城市（取前2个，与顶部地点精度一致）
  const dayMainCities = dayCities.slice(0, 2).join('·')

  // ===== 顶部标题区域 - 完整行程信息 =====
  const hasDateRange = !!tripDateRange
  const hasMetaInfo = !!(tripDays || tripBudget || tripLocations)
  const headerHeight = 20 + 24 + (hasDateRange ? 4 + 16 : 0) + (hasMetaInfo ? 8 + 28 : 0) + 12

  // 高清模式设置
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // 白色背景
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)

  // 顶部渐变背景
  const gradient = ctx.createLinearGradient(0, 0, w, headerHeight * scale)
  gradient.addColorStop(0, '#ff7b7b')
  gradient.addColorStop(1, '#ffa07a')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.roundRect(0, 0, w, headerHeight * scale, [0, 0, 20 * scale, 20 * scale])
  ctx.fill()

  // 顶部装饰效果
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.beginPath()
  ctx.arc(w * 0.8, -headerHeight * scale * 0.2, headerHeight * scale * 0.6, 0, Math.PI * 2)
  ctx.fill()

  // ===== header-inner =====
  let currentY = 40 * scale

  // 行程标题 + 年份标签
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 ${20 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
  ctx.textAlign = 'center'

  const titleText = tripYear ? `${tripTitle} ${tripYear}` : tripTitle
  ctx.fillText(titleText, w / 2, currentY)

  // 日期范围
  if (tripDateRange) {
    currentY += 24 * scale
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.font = `${13 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.fillText(tripDateRange, w / 2, currentY)
  }

  // 信息栏 - 展示完整行程信息
  if (hasMetaInfo) {
    currentY += 28 * scale

    const metaItems = []
    if (tripDays) metaItems.push(`${tripDays}天`)
    if (tripBudget) metaItems.push(tripBudget)
    if (tripLocations) {
      metaItems.push(tripLocations)
    }

    if (metaItems.length > 0) {
      ctx.font = `${12 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`

      let totalMetaWidth = 0
      const itemWidths = metaItems.map(text => {
        const width = ctx.measureText(text).width + 20 * scale
        totalMetaWidth += width
        return width
      })
      totalMetaWidth += (metaItems.length - 1) * 12 * scale

      let metaX = (w - totalMetaWidth) / 2
      const metaY = currentY

      metaItems.forEach((text, index) => {
        const itemWidth = itemWidths[index]

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
        ctx.beginPath()
        ctx.roundRect(metaX, metaY - 12 * scale, itemWidth, 24 * scale, 12 * scale)
        ctx.fill()

        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
        ctx.fillText(text, metaX + itemWidth / 2, metaY + 4 * scale)

        metaX += itemWidth + 12 * scale
      })
    }
  }

  // ===== 内容区域背景 =====
  const contentStartY = (headerHeight + 12) * scale
  ctx.fillStyle = '#f8f9fa'
  ctx.fillRect(16 * scale, contentStartY, w - 32 * scale, h - contentStartY - 60 * scale)

  // 圆角裁剪
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(16 * scale, contentStartY, w - 32 * scale, h - contentStartY - 60 * scale, 20 * scale)
  ctx.clip()
  ctx.fillStyle = '#f5f7fa'
  ctx.fillRect(16 * scale, contentStartY, w - 32 * scale, h - contentStartY - 60 * scale)
  ctx.restore()

  // ===== 当天标题区域 - 增加当天信息 =====
  currentY = contentStartY + 30 * scale

  // 第一行：第X天 + 日期
  ctx.fillStyle = '#1a1a2e'
  ctx.font = `bold ${24 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
  ctx.textAlign = 'left'
  ctx.fillText(`第${dayNumber}天`, 32 * scale, currentY)

  // 日期 - 右侧显示
  if (dayDate) {
    ctx.fillStyle = '#64748b'
    ctx.font = `${14 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'right'
    ctx.fillText(dayDate, w - 32 * scale, currentY)
    ctx.textAlign = 'left'
  }

  // 第二行：当天统计信息
  // 格式：昆明·玉溪｜2住宿·3交通·4景点·1美食
  currentY += 22 * scale
  if (dayMainCities && dayStats) {
    // 绘制城市部分（灰色）
    ctx.fillStyle = '#64748b'
    ctx.font = `${12 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'left'
    ctx.fillText(dayMainCities, 32 * scale, currentY)
    
    // 计算城市部分宽度
    const citiesWidth = ctx.measureText(dayMainCities).width
    
    // 绘制分隔符（主题橘色）
    ctx.fillStyle = '#ff7b7b'
    ctx.fillText('｜', 32 * scale + citiesWidth, currentY)
    
    // 计算分隔符宽度
    const separatorWidth = ctx.measureText('｜').width
    
    // 绘制统计部分（灰色）
    ctx.fillStyle = '#64748b'
    ctx.fillText(dayStats, 32 * scale + citiesWidth + separatorWidth, currentY)
  } else if (dayMainCities) {
    ctx.fillStyle = '#64748b'
    ctx.font = `${12 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.fillText(dayMainCities, 32 * scale, currentY)
  } else if (dayStats) {
    ctx.fillStyle = '#64748b'
    ctx.font = `${12 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.fillText(dayStats, 32 * scale, currentY)
  }

  // 分隔线
  currentY += 18 * scale
  const lineGradient = ctx.createLinearGradient(32 * scale, 0, w - 32 * scale, 0)
  lineGradient.addColorStop(0, '#ff7b7b')
  lineGradient.addColorStop(0.5, '#ffd4d4')
  lineGradient.addColorStop(1, 'transparent')
  ctx.strokeStyle = lineGradient
  ctx.lineWidth = 2 * scale
  ctx.beginPath()
  ctx.moveTo(32 * scale, currentY)
  ctx.lineTo(w - 32 * scale, currentY)
  ctx.stroke()

  currentY += 30 * scale

  if (events.length === 0) {
    ctx.fillStyle = '#94a3b8'
    ctx.font = `${14 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('暂无安排', w / 2, currentY + 40 * scale)
    ctx.font = `${48 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    ctx.fillText('📝', w / 2, currentY - 10 * scale)
  } else {
    for (let i = 0; i < events.length; i++) {
      const event = events[i]
      
      // 判断是否为多选卡片
      if (event.isMulti && event.options && event.options.length > 0) {
        // 绘制多选卡片（高清）
        currentY = drawMultiEventHD(ctx, event, currentY, w, scale)
      } else {
        // 绘制单选卡片（高清）
        currentY = drawSingleEventHD(ctx, event, currentY, w, scale)
      }
    }
  }

  // 底部
  const footerGradient = ctx.createLinearGradient(0, h - 60 * scale, 0, h)
  footerGradient.addColorStop(0, '#f8fafc')
  footerGradient.addColorStop(1, '#f1f5f9')
  ctx.fillStyle = footerGradient
  ctx.fillRect(0, h - 60 * scale, w, 60 * scale)

  ctx.fillStyle = '#94a3b8'
  ctx.font = `${11 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
  ctx.textAlign = 'center'
  ctx.fillText(`由 云南旅行 生成 · ${formatDate(new Date())}`, w / 2, h - 25 * scale)
}

const generateFileName = (dayLabel: string | undefined, index: number): string => {
  const labelParts = (dayLabel || `第${index + 1}天`).split(/[\s（(]/)
  const dayName = labelParts[0] || `第${index + 1}天`
  const dateText = labelParts[1] ? labelParts[1].replace(/[)）]/, '') : ''
  return `行程_${dayName}_${dateText || ''}`.replace(/_+$/, '')
}

const formatDate = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const exportJSON = async () => {
  try {
    const data = await exportApi.json(props.tripId || '')
    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const link = document.createElement('a')
    link.download = `行程_${props.tripId}_${Date.now()}.json`
    link.href = URL.createObjectURL(blob)
    link.click()
    message.success('JSON 导出成功')
    emit('close')
  } catch (error) {
    console.error('导出 JSON 失败:', error)
    message.error('导出失败')
  }
}

const saveAllImages = () => {
  exportedImages.value.forEach((img, index) => {
    setTimeout(() => {
      const link = document.createElement('a')
      link.download = `${img.fileName || '行程'}.png`
      link.href = img.hdPath || img.path
      link.click()
    }, index * 500)
  })
  message.success('图片下载已开始')
  emit('close')
}

const previewImage = (index: number) => {
  const img = exportedImages.value[index]
  if (img && img.path) {
    const newWindow = window.open('', '_blank')
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>行程海报预览 - ${img.dayName}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                align-items: center;
                min-height: 100vh;
                background: #1a1a1a;
                padding: 20px;
              }
              .image-container {
                max-width: 100%;
                overflow: auto;
              }
              img {
                width: 375px;
                max-width: 100%;
                height: auto;
                object-fit: contain;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                border-radius: 8px;
              }
              .info {
                margin-top: 16px;
                color: #fff;
                font-size: 14px;
                text-align: center;
              }
              @media (max-width: 480px) {
                img {
                  width: 100%;
                }
              }
            </style>
          </head>
          <body>
            <div class="image-container">
              <img src="${img.hdPath || img.path}" alt="${img.dayName}" />
            </div>
            <div class="info">${img.dayName} ${img.dateText ? '- ' + img.dateText : ''}</div>
          </body>
        </html>
      `)
      newWindow.document.close()
    }
  }
}
</script>

<style scoped>
.trip-exporter {
  padding: 0;
}

/* 区域标题 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.title-icon {
  color: #ff6b6b;
  font-size: 14px;
}

.select-all-btn {
  padding: 4px 12px;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}

.select-all-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.select-all-btn.active {
  color: #ff6b6b;
  background: #fff5f5;
  border-color: #ffd4d4;
}

.select-all-btn.active:hover {
  background: #ffe8e8;
  border-color: #ffb8a8;
}

/* 日期区域 */
.days-section {
  margin-bottom: 12px;
}

/* 日期网格 - 强制双列 */
.day-grid {
  display: grid;
  grid-template-columns: 1fr 1fr !important;
  gap: 8px;
  margin-bottom: 8px;
}

.day-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 8px 4px;
  background: #ffffff;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s ease;
  border: 1.5px solid #e5e7eb;
}

.day-item:hover {
  border-color: #d1d5db;
}

.day-item.active {
  background: #fff5f5;
  border-color: #ff6b6b;
}

.day-item.active:hover {
  background: #ffe8e8;
  border-color: #ff6b6b;
}

.day-item.active .day-name {
  color: #ff6b6b;
}

.day-name {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.day-date {
  font-size: 11px;
  color: #6b7280;
}

.selection-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px;
  font-size: 12px;
  color: #6b7280;
}

.selection-hint strong {
  color: #ff6b6b;
  font-weight: 600;
}

/* 格式选择区域 */
.format-section {
  margin-bottom: 12px;
}

/* 格式网格 - 双列 */
.format-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.format-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  padding: 6px 4px;
  background: #ffffff;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1.5px solid #e5e7eb;
}

.format-item:hover {
  border-color: #ffb8a8;
  background: #fffafa;
}

.format-item.active {
  background: #fff5f5;
  border-color: #ff6b6b;
}

.format-item.active .format-name {
  color: #ff6b6b;
}

.format-name {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.format-desc {
  font-size: 10px;
  color: #6b7280;
}

/* 导出按钮 */
.export-btn {
  width: 100%;
  height: 44px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  margin-top: 8px;
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
  border: none;
  box-shadow: 0 4px 16px rgba(255, 107, 107, 0.35);
  transition: all 0.3s ease;
}

.export-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 107, 107, 0.45);
}

.export-btn:disabled {
  background: #e5e7eb;
  box-shadow: none;
}

/* 导出进度 */
.export-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  gap: 20px;
}

.progress-animation {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fff5f5 0%, #ffffff 100%);
  border-radius: 50%;
}

.progress-title {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

.progress-text {
  font-size: 14px;
  color: #6b7280;
}

.progress-bar-wrapper {
  width: 100%;
  max-width: 280px;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #ff6b6b 0%, #ff8e53 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-percent {
  font-size: 14px;
  font-weight: 600;
  color: #ff6b6b;
}

/* 导出结果 */
.export-result {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px;
}

/* 成功提示 - 缩小为简洁的条状信息 */
.success-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
  border-radius: 20px;
  border: 1px solid #86efac;
  align-self: center;
}

.success-icon {
  font-size: 16px;
  color: #22c55e;
}

.result-desc {
  font-size: 13px;
  color: #166534;
  font-weight: 500;
}

/* 预览区域 - 作为主要展示内容，增大显示 */
.preview-section {
  background: #f8f9fa;
  border-radius: 16px;
  padding: 16px;
  max-height: 420px;
  overflow-y: auto;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.preview-card {
  cursor: pointer;
  transition: transform 0.3s ease;
}

.preview-card:hover {
  transform: translateY(-4px);
}

.preview-image-wrapper {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  aspect-ratio: 3/4;
  background: #e5e7eb;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.preview-card:hover .preview-overlay {
  opacity: 1;
}

.preview-overlay .n-icon {
  font-size: 28px;
  color: white;
}

.preview-overlay span {
  font-size: 13px;
  color: white;
  font-weight: 500;
}

.preview-info {
  margin-top: 10px;
  text-align: center;
}

.preview-day {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.preview-date {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

/* 下载按钮 */
.download-btn {
  width: 100%;
  height: 52px;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #22c55e 0%, #4ade80 100%);
  border: none;
  box-shadow: 0 4px 16px rgba(34, 197, 94, 0.35);
  transition: all 0.3s ease;
}

.download-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(34, 197, 94, 0.45);
}

.canvas-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 375px;
  height: 1200px;
  visibility: hidden;
  pointer-events: none;
  z-index: -1;
}

.canvas-container canvas {
  display: block;
}

/* 响应式 */
@media screen and (max-width: 480px) {
  .day-grid {
    grid-template-columns: 1fr;
  }
  
  .preview-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
