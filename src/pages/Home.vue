<template>
  <div class="container">
    <div class="hero">
      <div class="responsive-container hero-inner">
        <div class="hero-left">
          <span class="hero-title">旅游攻略库</span>
        </div>
        <div class="hero-right">
          <n-button class="profile-btn" @click="navigateToProfile">
            <template #icon>
              <n-icon><UserOutlined /></n-icon>
            </template>
            {{ userStore.isLoggedIn ? '我的' : '登录' }}
          </n-button>
        </div>
      </div>
    </div>

    <div class="responsive-container main-content">
      <div class="filter-bar">
        <div class="filter-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            class="tab-btn"
            :class="{ active: currentStatus === tab.value }"
            @click="handleStatusChange(tab.value)"
          >
            {{ tab.label }}
          </button>
        </div>
        <n-button
          class="filter-search"
          :type="isSearchVisible ? 'primary' : 'default'"
          :ghost="!isSearchVisible"
          circle
          size="small"
          @click="toggleSearch"
        >
          <template #icon>
            <n-icon><SearchOutlined /></n-icon>
          </template>
        </n-button>
      </div>

      <div class="search-bar" :class="{ 'search-bar-hidden': !isSearchVisible }">
        <n-input
          v-model:value="searchQuery"
          placeholder="搜索行程标题"
          clearable
          round
          @keyup.enter="handleSearchSubmit"
        >
          <template #prefix>
            <n-icon><SearchOutlined /></n-icon>
          </template>
        </n-input>
      </div>

      <!-- 骨架屏 loading -->
      <div v-if="tripStore.loading.list" class="skeleton-grid">
        <div v-for="i in 6" :key="i" class="skeleton-trip-card">
          <div class="skeleton-image"></div>
          <div class="skeleton-content">
            <div class="skeleton-title"></div>
            <div class="skeleton-meta">
              <div class="skeleton-meta-item"></div>
              <div class="skeleton-meta-item"></div>
            </div>
            <div class="skeleton-tags">
              <div class="skeleton-tag"></div>
              <div class="skeleton-tag"></div>
            </div>
          </div>
        </div>
      </div>
      <!-- 实际内容 -->
      <div v-else-if="tripStore.tripList.length > 0" class="trip-grid">
        <TripSummaryCard
          v-for="trip in tripStore.tripList"
          :key="trip.id"
          :trip="trip"
          :is-logged-in="userStore.isLoggedIn"
          @click="handleTripClick"
          @edit="handleTripEdit"
          @delete="handleTripDelete"
        />
      </div>
      <n-empty v-else description="暂无行程数据" />

      <div v-if="totalItems > 0" class="pagination-container">
        <n-pagination
          v-model:page="currentPage"
          :page-count="totalPages"
          show-size-picker
          :page-sizes="[10, 20, 50]"
          :page-size="pageSize"
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
        />
      </div>
    </div>

    <n-button
      v-if="userStore.isLoggedIn"
      class="fab-button"
      circle
      type="primary"
      size="large"
      @click="handleCreateTrip"
    >
      <template #icon>
        <n-icon><PlusOutlined /></n-icon>
      </template>
    </n-button>

    <TripModal
      :show="showTripModal"
      :editing-trip="editingTrip"
      @close="showTripModal = false"
      @save="handleTripSave"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NIcon,
  NSpin,
  NEmpty,
  NInput,
  NPagination,
  useMessage,
  useDialog
} from 'naive-ui'
import { PlusOutlined, SearchOutlined, UserOutlined } from '@vicons/antd'
import { useUserStore } from '@/stores/user'
import { useTripStore } from '@/stores/trip'
import TripSummaryCard from '@/components/TripSummaryCard.vue'
import TripModal from '@/components/TripModal.vue'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const userStore = useUserStore()
const tripStore = useTripStore()

const showTripModal = ref(false)
const editingTrip = ref(null)
const searchQuery = ref('')
const currentStatus = ref('published')
const currentPage = ref(1)
const pageSize = ref(20)
const isSearchVisible = ref(false)
const totalItems = ref(0)

// 存储键
const HOME_STATE_KEY = 'home:state'

// 保存状态到 localStorage
const saveState = () => {
  try {
    const state = {
      currentStatus: currentStatus.value,
      currentPage: currentPage.value,
      pageSize: pageSize.value,
      scrollTop: window.pageYOffset || document.documentElement.scrollTop,
      timestamp: Date.now()
    }
    localStorage.setItem(HOME_STATE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('保存首页状态失败:', e)
  }
}

// 从 localStorage 恢复状态
const restoreState = () => {
  try {
    const saved = localStorage.getItem(HOME_STATE_KEY)
    if (saved) {
      const state = JSON.parse(saved)
      // 只恢复 1 小时内的状态
      if (state.timestamp && Date.now() - state.timestamp < 3600000) {
        if (state.currentStatus) currentStatus.value = state.currentStatus
        if (state.currentPage) currentPage.value = state.currentPage
        if (state.pageSize) pageSize.value = state.pageSize
        return state.scrollTop || 0
      }
    }
  } catch (e) {
    console.error('恢复首页状态失败:', e)
  }
  return 0
}

const totalPages = computed(() => Math.ceil(totalItems.value / pageSize.value))

const tabs = [
  { value: 'published', label: '已发布' },
  { value: 'draft', label: '草稿' },
  { value: 'archived', label: '已归档' },
  { value: 'all', label: '全部' }
]

const refreshTrips = async () => {
  const params = {
    limit: pageSize.value,
    offset: (currentPage.value - 1) * pageSize.value
  }

  if (searchQuery.value) {
    params.q = searchQuery.value
  }

  // 明确设置 status，即使是 'all' 也要设置，以覆盖之前的 status
  params.status = currentStatus.value === 'all' ? undefined : currentStatus.value

  const result = await tripStore.fetchTripList(params)
  if (result.success) {
    totalItems.value = tripStore.tripListTotal || 0
  } else {
    message.error(result.error || '获取行程列表失败')
  }
}

onMounted(async () => {
  // 恢复之前的状态
  const savedScrollTop = restoreState()
  await refreshTrips()
  // 恢复滚动位置
  if (savedScrollTop > 0) {
    nextTick(() => {
      window.scrollTo({ top: savedScrollTop, behavior: 'auto' })
    })
  }
  // 添加滚动监听
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onActivated(async () => {
  await refreshTrips()
})

const toggleSearch = () => {
  isSearchVisible.value = !isSearchVisible.value
}

const handleSearchSubmit = () => {
  currentPage.value = 1
  refreshTrips()
}

const handleStatusChange = (value) => {
  currentStatus.value = value
  currentPage.value = 1
  saveState()
  refreshTrips()
}

const handlePageChange = () => {
  saveState()
  refreshTrips()
}

const handlePageSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  saveState()
  refreshTrips()
}

const navigateToProfile = () => {
  // 直接从 localStorage 检查 token，不依赖可能未同步的 store 状态
  const token = localStorage.getItem('token')
  if (token) {
    router.push('/profile')
  } else {
    router.push('/login')
  }
}

const handleCreateTrip = () => {
  // 直接从 localStorage 检查 token
  const token = localStorage.getItem('token')
  if (!token) {
    message.warning('请先登录')
    router.push('/login')
    return
  }
  editingTrip.value = null
  showTripModal.value = true
}

const handleTripEdit = (trip) => {
  if (!userStore.isLoggedIn) {
    message.warning('请先登录')
    router.push('/login')
    return
  }
  editingTrip.value = trip
  showTripModal.value = true
}

const handleTripSave = async (formData, editingTripData) => {
  try {
    if (editingTripData) {
      const result = await tripStore.updateTrip(editingTripData.id, formData)
      if (result.success) {
        message.success('行程更新成功')
        await refreshTrips()
      } else {
        message.error(result.error || '更新失败')
      }
    } else {
      const result = await tripStore.createTrip(formData)
      if (result.success) {
        message.success('行程创建成功')
        await refreshTrips()
      } else {
        message.error(result.error || '创建失败')
      }
    }
  } catch (error) {
    message.error(error.message || '操作失败')
  }
}

const handleTripClick = (tripId) => {
  router.push(`/trip/${tripId}`)
}

const handleTripDelete = (trip) => {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除行程 "${trip.title}" 吗？此操作不可恢复。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      const result = await tripStore.deleteTrip(trip.id)
      if (result.success) {
        message.success('删除成功')
        await refreshTrips()
      } else {
        message.error(result.error || '删除失败')
      }
    }
  })
}

// 滚动监听
let scrollTimer = null
const handleScroll = () => {
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    saveState()
  }, 200)
}

// 移除滚动监听
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  if (scrollTimer) clearTimeout(scrollTimer)
})
</script>

<style scoped>
@import '@/styles/home.scss';

.container {
  min-height: 100vh;
  background: var(--u-bg-color);
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.filter-bar {
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 12px;
  padding: 0 12px;
  height: 48px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.filter-tabs {
  flex: 1;
  display: flex;
  gap: 8px;
}

.tab-btn {
  flex: 1;
  height: 36px;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
}

.tab-btn:hover {
  color: var(--u-type-primary);
}

.tab-btn.active {
  color: var(--u-type-primary);
  font-weight: 500;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 25%;
  right: 25%;
  height: 2px;
  background: var(--u-type-primary);
  border-radius: 2px;
}

.filter-search {
  flex-shrink: 0;
  margin-left: 16px;
}

.search-bar {
  margin-bottom: 16px;
  transition: all 0.3s ease;
  overflow: hidden;
}

.search-bar-hidden {
  height: 0;
  margin-bottom: 0;
  opacity: 0;
}

.trip-grid {
  display: grid;
  grid-template-columns: repeat(var(--tg-card-grid-cols), 1fr);
  gap: var(--tg-grid-gap);
  width: 100%;
  padding-bottom: 14px;
}

.trip-grid > * {
  max-width: 600px;
  justify-self: center;
  width: 100%;
}

.pagination-container {
  padding: 24px 0;
  display: flex;
  justify-content: center;
  background: transparent;
}

.pagination-container :deep(.n-pagination-item) {
  border-radius: 8px;
}

.pagination-container :deep(.n-pagination-item--active) {
  border-radius: 8px;
}

.pagination-container :deep(.n-base-select) {
  border-radius: 8px;
}

.pagination-container :deep(.n-base-selection) {
  border-radius: 8px;
}

.fab-button {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, var(--u-type-primary), var(--u-type-warning));
  border: none;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
  z-index: 100;
}

.fab-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(255, 107, 107, 0.5);
}

.profile-btn {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 24px;
}

.profile-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

@media screen and (min-width: 1024px) {
  .trip-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media screen and (max-width: 768px) {
  .trip-grid {
    grid-template-columns: 1fr;
  }
}

/* 骨架屏样式 */
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(var(--tg-card-grid-cols), 1fr);
  gap: var(--tg-grid-gap);
  width: 100%;
  padding-bottom: 14px;
}

.skeleton-grid > * {
  max-width: 600px;
  justify-self: center;
  width: 100%;
}

.skeleton-trip-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.skeleton-image {
  width: 100%;
  height: 160px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-title {
  width: 80%;
  height: 20px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: 4px;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-meta {
  display: flex;
  gap: 16px;
}

.skeleton-meta-item {
  width: 60px;
  height: 14px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: 4px;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-tags {
  display: flex;
  gap: 8px;
}

.skeleton-tag {
  width: 50px;
  height: 24px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: 12px;
  animation: skeleton-loading 1.5s infinite;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media screen and (min-width: 1024px) {
  .skeleton-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media screen and (max-width: 768px) {
  .skeleton-grid {
    grid-template-columns: 1fr;
  }
}
</style>
