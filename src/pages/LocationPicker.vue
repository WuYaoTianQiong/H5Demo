<template>
  <div class="location-picker-page">
    <!-- 加载状态 -->
    <div v-if="pageLoading" class="page-loading">
      <n-spin size="large" />
      <span class="loading-text">加载中...</span>
    </div>

    <div v-else class="page-content">
      <!-- 顶部导航栏 -->
      <div class="hero">
        <div class="hero-content">
          <div class="hero-back" @click="navigateBack">
            <n-icon :component="ArrowLeftOutlined" size="20" color="#ffffff" />
          </div>
          <span class="hero-title">选择位置</span>
          <div class="hero-spacer"></div>
        </div>
      </div>

      <!-- 搜索栏 -->
      <div class="search-bar">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <n-input
            v-model:value="keyword"
            placeholder="输入地点名称，如：大理古城、洱海公园"
            :bordered="false"
            clearable
            @keyup.enter="handleSearch"
            @input="handleInput"
            class="search-input"
          />
        </div>
        <n-button
          type="primary"
          size="medium"
          class="search-btn"
          @click="handleSearch"
        >
          搜索
        </n-button>
      </div>

      <!-- 搜索建议列表 -->
      <div v-if="showSuggestions && suggestions.length > 0" class="suggestions">
        <div
          v-for="(item, idx) in suggestions"
          :key="idx"
          class="suggestion-item"
          @click="selectSuggestion(item)"
        >
          <span class="suggestion-name">{{ item.name }}</span>
          <span class="suggestion-addr">{{ item.district || item.address || '' }}</span>
        </div>
      </div>

      <!-- 快捷搜索标签 -->
      <div v-if="!keyword && hotTags.length > 0" class="hot-tags">
        <div
          v-for="tag in hotTags"
          :key="tag"
          class="hot-tag"
          @click="quickSearch(tag)"
        >
          <span class="tag-text">{{ tag }}</span>
        </div>
      </div>

      <!-- 主体内容 -->
      <div class="body">
        <!-- 地图区域 -->
        <div class="map-section">
          <div class="map-header">
            <span class="map-title">📍 地图选点</span>
            <div class="map-controls">
              <div class="control-btn" @click="locateAndNearby">
                <span class="control-icon">🎯</span>
                <span class="control-text">定位</span>
              </div>
              <div class="control-btn" @click="resetMap">
                <span class="control-icon">🔄</span>
                <span class="control-text">重置</span>
              </div>
            </div>
          </div>
          <div class="map-wrap">
            <div id="amap-container" class="map"></div>
            <div class="map-center-marker">
              <div class="marker-pin"></div>
            </div>
            <div v-if="mapLoading" class="map-loading">
              <n-spin size="medium" />
              <span class="loading-text">地图加载中...</span>
            </div>
          </div>
        </div>

        <!-- 位置列表 -->
        <div class="list-section">
          <div class="list-header">
            <span class="list-title">{{ searchKeyword ? '搜索结果' : '附近位置' }}</span>
            <span v-if="displayPois.length > 0" class="list-count">({{ displayPois.length }}{{ hasMorePois ? '+' : '' }})</span>
          </div>

          <div class="list">
            <div v-if="displayPois.length > 0" class="poi-list">
              <div
                v-for="(item, idx) in displayPois"
                :key="idx"
                class="poi-card"
                :class="{ active: selectedIndex === idx }"
                @click="selectPoi(idx)"
              >
                <div class="poi-left">
                  <div class="poi-icon">
                    <span class="icon-text">{{ getPoiIcon(item) }}</span>
                  </div>
                  <div class="poi-info">
                    <div class="poi-name">{{ item.name }}</div>
                    <div class="poi-addr">{{ item.address || '暂无地址信息' }}</div>
                    <div class="poi-meta">
                      <span v-if="item.distance" class="poi-distance">📍 {{ item.distance }}m</span>
                      <span v-if="item.type" class="poi-type">{{ item.type }}</span>
                    </div>
                  </div>
                </div>
                <div class="poi-right">
                  <div v-if="selectedIndex === idx" class="selected-indicator">
                    <n-icon :component="CheckOutlined" size="16" color="#fff" />
                  </div>
                </div>
              </div>

              <!-- 加载更多按钮 -->
              <div v-if="hasMorePois" class="load-more" @click="loadMorePois">
                <span class="load-more-text">点击加载更多</span>
              </div>
            </div>

            <div v-else-if="!mapLoading" class="empty-state">
              <div class="empty-icon">🗺️</div>
              <span class="empty-title">暂无位置信息</span>
              <span class="empty-desc">请尝试搜索或检查网络连接</span>
              <n-button
                type="primary"
                size="small"
                class="retry-btn"
                @click="locateAndNearby"
              >
                重新定位
              </n-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div class="footer-bar">
        <div class="footer-content">
          <n-button
            type="primary"
            size="large"
            class="confirm-btn"
            :disabled="selectedIndex === null"
            :style="{
              background: selectedIndex === null ? '#d1d5db' : 'linear-gradient(135deg, #ff6b6b, #ff8e53)',
              boxShadow: selectedIndex !== null ? '0 4px 12px rgba(255, 107, 107, 0.35)' : 'none'
            }"
            @click="confirm"
          >
            {{ selectedIndex === null ? '请选择位置' : `确认选择：${pois[selectedIndex]?.name}` }}
          </n-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NSpin, NInput, NButton, NIcon, useMessage } from 'naive-ui'
import { ArrowLeftOutlined, CheckOutlined } from '@vicons/antd'
import {
  initMap,
  createPlaceSearch,
  createAutoComplete,
  searchPlace,
  searchNearby,
  autoCompleteSearch,
  getPoiIcon,
  parseLocation,
} from '@/composables/useAMap.js'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const keyword = ref('')
const searchKeyword = ref('')
const map = ref(null)
const placeSearch = ref(null)
const autoComplete = ref(null)
const pois = ref([])
const suggestions = ref([])
const showSuggestions = ref(false)
const selectedIndex = ref(null)
const center = ref({ lng: 102.71594, lat: 25.05184 })
const mapLoading = ref(false)
const pageLoading = ref(true)
const currentPage = ref(1)
const pageSize = 6
const searchTimer = ref(null)

const hotTags = ['景点', '餐厅', '酒店', '商场', '医院', '银行', '加油站', '停车场']

const displayPois = computed(() => {
  return pois.value.slice(0, currentPage.value * pageSize)
})

const hasMorePois = computed(() => {
  return pois.value.length > currentPage.value * pageSize
})

onMounted(() => {
  keyword.value = route.query.keyword ? decodeURIComponent(route.query.keyword) : ''
  searchKeyword.value = keyword.value
  bootstrap()
})

const bootstrap = async () => {
  pageLoading.value = false

  try {
    mapLoading.value = true

    // 并行初始化地图和搜索服务
    const [mapInstance, placeSearchInstance, autoCompleteInstance] = await Promise.all([
      initMap('amap-container', {
        zoom: 15,
        center: [center.value.lng, center.value.lat],
      }),
      createPlaceSearch(),
      createAutoComplete(),
    ])

    map.value = mapInstance
    placeSearch.value = placeSearchInstance
    autoComplete.value = autoCompleteInstance

    // 绑定地图拖动事件
    map.value.on('dragend', handleMapMoveEnd)

    // 初始加载
    if (keyword.value) {
      await handleSearch()
    }
    // 空数据时不自动搜索，等待用户操作
  } catch (e) {
    console.error('地图初始化失败:', e)
    message.error('地图加载失败')
  } finally {
    mapLoading.value = false
  }
}

const handleMapMoveEnd = async () => {
  if (!map.value || !placeSearch.value) return

  const mapCenter = map.value.getCenter()
  center.value = { lng: mapCenter.lng, lat: mapCenter.lat }

  const results = await searchNearby(
    placeSearch.value,
    [mapCenter.lng, mapCenter.lat],
    800
  )

  pois.value = results
  currentPage.value = 1
  selectedIndex.value = results.length ? 0 : null

  // 只有在用户没有主动输入关键词时，才将第一个POI名称赋值到搜索框
  if (!keyword.value && results.length > 0 && results[0].name) {
    keyword.value = results[0].name
    searchKeyword.value = results[0].name
  }
}

const handleInput = (value) => {
  keyword.value = value
  clearTimeout(searchTimer.value)
  if (value && value.length > 0) {
    searchTimer.value = setTimeout(() => {
      fetchSuggestions(value)
    }, 300)
  } else {
    showSuggestions.value = false
    suggestions.value = []
  }
}

const fetchSuggestions = async (kw) => {
  if (!autoComplete.value) return

  const results = await autoCompleteSearch(autoComplete.value, kw)
  suggestions.value = results
  showSuggestions.value = results.length > 0
}

const selectSuggestion = (item) => {
  keyword.value = item.name
  searchKeyword.value = item.name
  showSuggestions.value = false
  handleSearch()
}

const handleSearch = async () => {
  const kw = String(keyword.value || '').trim()
  searchKeyword.value = kw
  showSuggestions.value = false

  if (!kw) {
    await nearby()
    return
  }

  if (!placeSearch.value) return

  mapLoading.value = true

  const results = await searchPlace(placeSearch.value, kw)

  mapLoading.value = false
  pois.value = results
  currentPage.value = 1
  selectedIndex.value = results.length ? 0 : null

  // 将第一个POI位置设为地图中心
  if (results.length > 0 && results[0].location) {
    const loc = parseLocation(results[0].location)
    if (loc && map.value) {
      map.value.setCenter([loc.lng, loc.lat])
      center.value = loc
    }
  }
}

const clearSearch = () => {
  keyword.value = ''
  searchKeyword.value = ''
  showSuggestions.value = false
  currentPage.value = 1
  nearby()
}

const loadMorePois = () => {
  if (hasMorePois.value) {
    currentPage.value++
  }
}

const quickSearch = (tag) => {
  keyword.value = tag
  handleSearch()
}

const locateAndNearby = async () => {
  return new Promise((resolve) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          center.value = { lng: position.coords.longitude, lat: position.coords.latitude }
          if (map.value) {
            map.value.setCenter([center.value.lng, center.value.lat])
          }
          await nearby()
          resolve()
        },
        async () => {
          await nearby()
          resolve()
        }
      )
    } else {
      nearby().then(resolve)
    }
  })
}

const resetMap = () => {
  center.value = { lng: 102.71594, lat: 25.05184 }
  if (map.value) {
    map.value.setCenter([center.value.lng, center.value.lat])
    map.value.setZoom(15)
  }
  nearby()
  selectedIndex.value = null
}

const nearby = async () => {
  if (!placeSearch.value) return

  const results = await searchNearby(
    placeSearch.value,
    [center.value.lng, center.value.lat],
    800
  )

  pois.value = results
  currentPage.value = 1
  selectedIndex.value = results.length ? 0 : null

  // 只有在用户没有主动输入关键词时，才将第一个POI名称赋值到搜索框
  if (!keyword.value && results.length > 0 && results[0].name) {
    keyword.value = results[0].name
    searchKeyword.value = results[0].name
  }
}

const selectPoi = (idx) => {
  selectedIndex.value = idx

  const poi = pois.value[idx]
  if (poi?.location) {
    const loc = parseLocation(poi.location)
    if (loc && map.value) {
      map.value.setCenter([loc.lng, loc.lat])
    }
  }

  // 将选中的地址名称赋值到搜索输入框
  if (poi?.name) {
    keyword.value = poi.name
    searchKeyword.value = poi.name
  }
}

const confirm = () => {
  if (selectedIndex.value === null) return

  const poi = pois.value[selectedIndex.value]
  const loc = parseLocation(poi.location)

  const payload = {
    name: poi.name,
    address: poi.address,
    lng: loc?.lng,
    lat: loc?.lat,
    poi,
  }

  // 存储结果到 localStorage
  localStorage.setItem('locationPickerResult', JSON.stringify(payload))

  message.success('位置选择成功')
  setTimeout(() => {
    router.back()
  }, 300)
}

const navigateBack = () => {
  router.back()
}
</script>

<style scoped>
.location-picker-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #fef9f6 0%, #f8f4f1 100%);
  display: flex;
  flex-direction: column;
}

.page-content {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* 页面加载状态 */
.page-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, #fef9f6 0%, #f8f4f1 100%);
  z-index: 999;
  gap: 16px;
}

.page-loading .loading-text {
  font-size: 16px;
  color: #ff6b6b;
  font-weight: 500;
}

/* 顶部导航栏 - 统一使用 hero 风格 */
.hero {
  padding: 12px 16px;
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;
  box-shadow: 0 6px 16px rgba(255, 107, 107, 0.25);
  position: sticky;
  top: 0;
  z-index: 100;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255, 0.1) 0%, transparent 70%);
  pointer-events: none;
}

.hero-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 1;
}

.hero-back {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s;
}

.hero-back:active {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(0.95);
}

.hero-title {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
}

.hero-spacer {
  width: 28px;
}

/* 搜索栏 - 位于顶部容器下方 */
.search-bar {
  padding: 12px 16px;
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 18px;
  padding: 0 12px;
  height: 36px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e2e8f0;
}

.search-icon {
  font-size: 14px;
  color: #94a3b8;
  margin-right: 8px;
}

.search-input {
  flex: 1;
}

.search-input :deep(.n-input__input-el) {
  color: #374151 !important;
}

.search-input :deep(.n-input__input-el::placeholder) {
  color: #94a3b8 !important;
}

.search-btn {
  background: linear-gradient(135deg, #ff6b6b, #ff8e53) !important;
  border: none !important;
  border-radius: 18px !important;
  height: 36px !important;
  padding: 0 16px !important;
  font-weight: 600;
}

/* 搜索建议列表 */
.suggestions {
  position: absolute;
  top: 100px;
  left: 16px;
  right: 16px;
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 50;
  max-height: 200px;
  overflow-y: auto;
}

.suggestion-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
}

.suggestion-item:hover {
  background: #f9fafb;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-name {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.suggestion-addr {
  font-size: 12px;
  color: #9ca3af;
}

/* 热门标签 */
.hot-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 16px 8px;
}

.hot-tag {
  padding: 4px 10px;
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
  cursor: pointer;
}

.hot-tag:hover {
  background: #fef2f2;
  border-color: #ff6b6b;
}

.hot-tag:active {
  transform: scale(0.95);
}

.tag-text {
  font-size: 12px;
  color: #64748b;
}

/* 加载更多 */
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 0;
  cursor: pointer;
}

.load-more:hover {
  background: #f9fafb;
}

.load-more-text {
  font-size: 12px;
  color: #9ca3af;
}

/* 主体内容 */
.body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 12px 12px;
  gap: 12px;
}

/* 地图区域 */
.map-section {
  background: #fff;
  border-radius: 14px;
  padding: 12px 0 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}

.map-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 0 12px;
}

.map-title {
  font-size: 15px;
  font-weight: 700;
  color: #374151;
}

.map-controls {
  display: flex;
  gap: 6px;
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: #f9fafb;
  border-radius: 10px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.control-btn:hover {
  background: #f3f4f6;
}

.control-btn:active {
  transform: scale(0.95);
}

.control-icon {
  font-size: 12px;
}

.control-text {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.map-wrap {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.map {
  height: 230px;
  width: 100%;
  background: #e5e7eb;
  min-height: 160px;
}

.map-center-marker {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -100%);
  z-index: 10;
  pointer-events: none;
}

.marker-pin {
  width: 28px;
  height: 28px;
  background: #ff0000;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  border: 2px solid #fff;
}

.map-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 20;
}

.map-loading .loading-text {
  font-size: 12px;
  color: #6b7280;
}

/* 列表区域 */
.list-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.list-header {
  display: flex;
  align-items: center;
  padding: 12px 14px 8px;
  border-bottom: 1px solid #f3f4f6;
}

.list-title {
  font-size: 15px;
  font-weight: 700;
  color: #374151;
}

.list-count {
  font-size: 13px;
  color: #9ca3af;
  margin-left: 4px;
}

.list {
  flex: 1;
  padding: 8px 14px;
  overflow-y: auto;
}

.poi-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.poi-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #f9fafb;
  border-radius: 10px;
  border: 1px solid transparent;
  transition: all 0.3s ease;
  cursor: pointer;
}

.poi-card:hover {
  background: #f3f4f6;
}

.poi-card:active {
  transform: scale(0.98);
}

.poi-card.active {
  background: linear-gradient(135deg, rgba(255, 107, 107, 0.08), rgba(255, 142, 83, 0.08));
  border-color: #ff6b6b;
}

.poi-left {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  overflow: hidden;
}

.poi-icon {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-text {
  font-size: 14px;
  color: #fff;
}

.poi-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.poi-name {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.poi-addr {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.poi-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.poi-distance {
  font-size: 11px;
  color: #9ca3af;
}

.poi-type {
  font-size: 11px;
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
  padding: 2px 6px;
  border-radius: 6px;
}

.poi-right {
  margin-left: 10px;
}

.selected-indicator {
  width: 20px;
  height: 20px;
  background: #ff6b6b;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.empty-desc {
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 12px;
}

.retry-btn {
  background: linear-gradient(135deg, #ff6b6b, #ff8e53) !important;
  border: none !important;
}

/* 底部操作栏 */
.footer-bar {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.06);
  z-index: 100;
}

.footer-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.confirm-btn {
  width: 100%;
  height: 44px !important;
  border-radius: 22px !important;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 1px;
  border: none !important;
}

/* 响应式优化 */
@media (max-width: 375px) {
  .hot-tags {
    justify-content: center;
  }

  .poi-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
