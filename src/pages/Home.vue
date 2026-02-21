<template>
  <div class="container">
    <PageHeader title="旅游攻略库">
      <template #right>
        <n-button class="profile-btn" @click="navigateToProfile">
          <template #icon>
            <n-icon><UserOutlined /></n-icon>
          </template>
          {{ userStore.isLoggedIn ? '我的' : '登录' }}
        </n-button>
      </template>
    </PageHeader>

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

      <div v-if="tripStore.loading.list" class="skeleton-grid">
        <SkeletonCard v-for="i in 6" :key="i" />
      </div>

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

    <FabButton v-if="userStore.isLoggedIn" @click="handleCreateTrip" />

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
  NEmpty,
  NInput,
  NPagination,
  useMessage,
  useDialog
} from 'naive-ui'
import { SearchOutlined, UserOutlined } from '@vicons/antd'
import { useUserStore } from '@/stores/user'
import { useTripStore } from '@/stores/trip'
import PageHeader from '@/components/PageHeader.vue'
import FabButton from '@/components/FabButton.vue'
import TripSummaryCard from '@/components/TripSummaryCard.vue'
import TripModal from '@/components/TripModal.vue'
import SkeletonCard from '@/components/skeleton/SkeletonCard.vue'

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

const HOME_STATE_KEY = 'home:state'

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

const restoreState = () => {
  try {
    const saved = localStorage.getItem(HOME_STATE_KEY)
    if (saved) {
      const state = JSON.parse(saved)
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

  params.status = currentStatus.value === 'all' ? undefined : currentStatus.value

  const result = await tripStore.fetchTripList(params)
  if (result.success) {
    totalItems.value = tripStore.tripListTotal || 0
  } else {
    message.error(result.error || '获取行程列表失败')
  }
}

onMounted(async () => {
  const savedScrollTop = restoreState()
  await refreshTrips()
  if (savedScrollTop > 0) {
    nextTick(() => {
      window.scrollTo({ top: savedScrollTop, behavior: 'auto' })
    })
  }
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
  const token = localStorage.getItem('token')
  if (token) {
    router.push('/profile')
  } else {
    router.push('/login')
  }
}

const handleCreateTrip = () => {
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

let scrollTimer = null
const handleScroll = () => {
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    saveState()
  }, 200)
}

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  if (scrollTimer) clearTimeout(scrollTimer)
})
</script>

<style scoped>
@import '@/styles/home.scss';

.container {
  min-height: 100vh;
  background: var(--bg-body);
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
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: 0 12px;
  height: 48px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-sm);
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
  color: var(--text-primary);
  cursor: pointer;
  position: relative;
  transition: color var(--transition-fast);
}

.tab-btn:hover {
  color: var(--primary-color);
}

.tab-btn.active {
  color: var(--primary-color);
  font-weight: 500;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 25%;
  right: 25%;
  height: 2px;
  background: var(--primary-color);
  border-radius: 2px;
}

.filter-search {
  flex-shrink: 0;
  margin-left: 16px;
}

.search-bar {
  margin-bottom: 16px;
  transition: all var(--transition-base);
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
  border-radius: var(--radius-md);
}

.profile-btn {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: var(--radius-full);
}

.profile-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

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

@media screen and (min-width: 1024px) {
  .trip-grid,
  .skeleton-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media screen and (max-width: 768px) {
  .trip-grid,
  .skeleton-grid {
    grid-template-columns: 1fr;
  }
}
</style>
