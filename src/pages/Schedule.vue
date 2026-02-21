<template>
  <div class="schedule-page">
    <n-page-header @back="goBack" title="日程管理" />

    <n-spin :show="loading">
      <div v-if="error" class="error-container">
        <n-empty description="加载失败" />
        <n-button @click="loadSchedule">重试</n-button>
      </div>

      <div v-else-if="tripData" class="schedule-container">
        <!-- 行程头部信息 -->
        <n-card class="trip-header-card">
          <div class="trip-header">
            <h2 class="trip-title">{{ tripData.title }}</h2>
            <n-tag :type="getStatusType(tripData.status)">
              {{ getStatusLabel(tripData.status) }}
            </n-tag>
          </div>
        </n-card>

        <!-- 日期选择器 -->
        <div class="day-selector">
          <n-scrollbar ref="dayTabsScrollRef" x-scrollable>
            <div class="day-tabs">
              <div
                v-for="(day, index) in days"
                :key="day.id || day.date"
                class="day-tab"
                :class="{ active: currentDayIndex === index }"
                @click="handleDayChange(index)"
              >
                <span class="day-name">{{ day.name || `第${index + 1}天` }}</span>
                <div v-if="currentDayIndex === index" class="active-indicator"></div>
              </div>
            </div>
          </n-scrollbar>
        </div>

        <!-- 日程列表 -->
        <div ref="scheduleListRef" class="schedule-list">
          <!-- 加载中骨架屏 -->
          <div v-if="dayLoading" class="skeleton-container">
            <SkeletonScheduleCard v-for="i in 3" :key="i" />
          </div>
          <!-- 日程内容 -->
          <div v-else-if="currentDayEvents.length > 0" class="events-container">
            <ScheduleCard
              v-for="event in currentDayEvents"
              :key="event.uid || event.id"
              :id="event.uid || event.id"
              :type="event.type || 'other'"
              :time="event.time"
              :title="event.title"
              :description="event.description"
              :location="event.location"
              :completed="event.state === 'completed'"
              @click="handleEditEvent(event)"
              @toggle-complete="handleToggleComplete"
            />
          </div>
          <n-empty v-else description="暂无日程安排，点击右下角按钮添加" />
        </div>
      </div>

      <n-empty v-else description="行程不存在" />
    </n-spin>

    <!-- 添加按钮 -->
    <n-button
      class="fab-button"
      type="primary"
      circle
      size="large"
      @click="handleAddEvent"
    >
      <template #icon>
        <n-icon :component="PlusOutlined" />
      </template>
    </n-button>

    <!-- 事件编辑弹窗 -->
    <n-modal
      v-model:show="showEventModal"
      :title="editingEvent ? '编辑日程' : '新增日程'"
      preset="card"
      class="schedule-modal"
      :style="{ width: isMobile ? '96%' : '500px', maxWidth: '90vw', borderRadius: '16px', maxHeight: isMobile ? '80vh' : '85vh' }"
      :header-style="{ background: 'linear-gradient(135deg, #ff6b6b, #ff8e53)', padding: isMobile ? '12px 16px' : '14px 20px', borderRadius: '16px 16px 0 0' }"
      :content-style="{ padding: isMobile ? '16px' : '20px', background: '#fafafa', borderRadius: '0 0 16px 16px', maxHeight: isMobile ? 'calc(80vh - 120px)' : 'calc(85vh - 120px)', overflowY: 'auto' }"
      :footer-style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '12px 16px' : '16px 20px', background: '#ffffff', borderTop: '1px solid #f0f0f0', gap: '12px', borderRadius: '0 0 16px 16px' }"
    >
      <n-form
        ref="eventFormRef"
        :model="eventFormData"
        :rules="eventFormRules"
        label-placement="top"
        class="schedule-form"
      >
        <n-form-item label="时间" path="time">
          <n-time-picker
            v-model:formatted-value="eventFormData.time"
            value-format="HH:mm"
            placeholder="选择时间"
            class="custom-time-picker"
          />
        </n-form-item>

        <n-form-item label="标题" path="title">
          <n-input
            v-model:value="eventFormData.title"
            placeholder="请输入标题"
            maxlength="50"
            round
            class="custom-input"
          />
        </n-form-item>

        <n-form-item label="类型" path="type">
          <n-radio-group v-model:value="eventFormData.type" class="type-radio-group">
            <n-radio-button
              v-for="type in EVENT_TYPE_SIMPLE_OPTIONS"
              :key="type.value"
              :value="type.value"
              class="type-radio-btn"
            >
              {{ type.label }}
            </n-radio-button>
          </n-radio-group>
        </n-form-item>

        <n-form-item label="描述" path="description">
          <n-input
            v-model:value="eventFormData.description"
            type="textarea"
            placeholder="请输入描述"
            maxlength="200"
            :autosize="{ minRows: 2, maxRows: 4 }"
            round
            class="custom-textarea"
          />
        </n-form-item>

        <n-form-item label="地点" path="location">
          <n-input
            v-model:value="eventFormData.location"
            placeholder="请输入地点"
            maxlength="100"
            round
            class="custom-input"
          />
        </n-form-item>
      </n-form>

      <template #footer>
        <div class="modal-footer">
          <n-button v-if="editingEvent" type="error" class="btn-delete" @click="handleDeleteEvent">
            <template #icon>
              <n-icon :component="CloseOutlined" />
            </template>
            删除
          </n-button>
          <n-button class="btn-secondary" @click="closeEventModal">
            <template #icon>
              <n-icon :component="CloseOutlined" />
            </template>
            取消
          </n-button>
          <n-button type="primary" class="btn-primary" :loading="saving" @click="handleSaveEvent">
            <template #icon>
              <n-icon :component="CheckOutlined" />
            </template>
            保存
          </n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NPageHeader,
  NCard,
  NTag,
  NSpin,
  NEmpty,
  NButton,
  NIcon,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NRadioGroup,
  NRadioButton,
  NTimePicker,
  NScrollbar,
  NSpace,
  useMessage,
  useDialog
} from 'naive-ui'
import { PlusOutlined, CheckOutlined, CloseOutlined } from '@vicons/antd'
import { tripApi, scheduleApi } from '@/services/api'
import { useDevice } from '@/composables/useDevice'
import { EVENT_TYPE_SIMPLE_OPTIONS } from '@/constants/dictionaries'
import ScheduleCard from '@/components/ScheduleCard.vue'
import SkeletonScheduleCard from '@/components/skeleton/SkeletonScheduleCard.vue'
import { getJSON, setJSON } from '@/utils/storage.js'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const { isMobile } = useDevice()

const tripId = ref('')
const tripData = ref(null)
const days = ref([])
const currentDayIndex = ref(0)
const loading = ref(false)
const dayLoading = ref(false)
const error = ref('')
const saving = ref(false)

// DOM 引用
const dayTabsScrollRef = ref(null)
const scheduleListRef = ref(null)

// 存储 key
const getStorageKey = (type) => `schedule:${type}:${route.params.id}`

const getSavedDayIndex = () => {
  const key = getStorageKey('dayIndex')
  const saved = getJSON(key)
  if (saved && typeof saved.index === 'number') {
    return saved.index
  }
  return 0
}

const saveDayIndex = (index) => {
  const key = getStorageKey('dayIndex')
  setJSON(key, {
    index,
    timestamp: Date.now()
  })
}

const saveDayTabsScroll = () => {
  const scrollbar = dayTabsScrollRef.value?.$el?.querySelector('.n-scrollbar-container')
  if (scrollbar) {
    const scrollLeft = scrollbar.scrollLeft
    if (scrollLeft > 10) {
      const key = getStorageKey('tabsScroll')
      setJSON(key, {
        x: scrollLeft,
        timestamp: Date.now()
      })
    }
  }
}

const restoreDayTabsScroll = async () => {
  await nextTick()
  setTimeout(() => {
    const key = getStorageKey('tabsScroll')
    const saved = getJSON(key)
    const scrollbar = dayTabsScrollRef.value?.$el?.querySelector('.n-scrollbar-container')
    if (saved && typeof saved.x === 'number' && scrollbar) {
      scrollbar.scrollLeft = saved.x
    }
  }, 100)
}

const savePageScroll = () => {
  const y = window.pageYOffset || document.documentElement.scrollTop
  if (y > 10) {
    const key = getStorageKey('pageScroll')
    setJSON(key, {
      y,
      timestamp: Date.now()
    })
  }
}

const restorePageScroll = () => {
  const key = getStorageKey('pageScroll')
  const saved = getJSON(key)
  if (saved && typeof saved.y === 'number') {
    setTimeout(() => {
      window.scrollTo(0, saved.y)
    }, 100)
  }
}

// 事件缓存
const dayEventsCache = ref({})

// 弹窗相关
const showEventModal = ref(false)
const editingEvent = ref(null)
const eventFormRef = ref(null)
const eventFormData = ref({
  time: null,
  title: '',
  type: 'scenic',
  description: '',
  location: ''
})

const eventFormRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  time: [{ required: true, message: '请选择时间', trigger: 'change' }]
}

const currentDay = computed(() => days.value[currentDayIndex.value])
const currentDayId = computed(() => currentDay.value?.id || currentDay.value?.date)

const currentDayEvents = computed(() => {
  const dayId = currentDayId.value
  if (!dayId) return []
  return dayEventsCache.value[dayId] || []
})

// 页面加载时恢复状态
onMounted(() => {
  console.log('[Schedule] onMounted, route.params.id:', route.params.id)
  tripId.value = route.params.id
  if (tripId.value) {
    loadSchedule()
  } else {
    error.value = '行程ID不能为空'
  }

  // 添加滚动监听
  window.addEventListener('scroll', savePageScroll, { passive: true })
  console.log('[Schedule] onMounted complete')
})

// 页面卸载时保存状态
onUnmounted(() => {
  console.log('[Schedule] onUnmounted, saving state')
  saveDayIndex(currentDayIndex.value)
  saveDayTabsScroll()
  savePageScroll()
  window.removeEventListener('scroll', savePageScroll)
  console.log('[Schedule] onUnmounted complete')
})

const getStatusLabel = (status) => {
  const labels = { draft: '草稿', published: '已发布', archived: '已归档' }
  return labels[status] || status
}

const getStatusType = (status) => {
  const types = { draft: 'default', published: 'success', archived: 'info' }
  return types[status] || 'default'
}

const loadSchedule = async () => {
  loading.value = true
  error.value = ''

  try {
    const res = await tripApi.getV2(tripId.value, { template: 'card' })
    const trip = res?.trip

    if (!trip) {
      throw new Error('行程数据为空')
    }

    tripData.value = trip

    if (trip.days?.length > 0) {
      days.value = trip.days.map((day, index) => ({
        ...day,
        name: day.shortDate || day.date || `第${index + 1}天`
      }))
      const savedIndex = getSavedDayIndex()
      const targetIndex = savedIndex < days.value.length ? savedIndex : 0
      
      dayLoading.value = true
      currentDayIndex.value = targetIndex
      
      loading.value = false
      
      await loadDayEvents(targetIndex)
      
      restoreDayTabsScroll()
      restorePageScroll()
    } else {
      days.value = []
      loading.value = false
    }
  } catch (err) {
    error.value = err.message || '加载失败'
    message.error(err.message || '加载失败')
    loading.value = false
  }
}

const loadDayEvents = async (dayIndex) => {
  if (dayIndex < 0 || dayIndex >= days.value.length) return

  const day = days.value[dayIndex]
  const dayId = day.id || day.date

  // 先设置 loading 状态，再切换日期
  dayLoading.value = true
  currentDayIndex.value = dayIndex

  // 如果缓存中有数据，先显示缓存数据，同时后台刷新
  const hasCache = dayEventsCache.value[dayId]

  try {
    const res = await scheduleApi.fetchV2(tripId.value, dayId, { template: 'card' })
    const dayDataList = res?.data || []
    const events = Array.isArray(dayDataList) && dayDataList[0]?.events ? dayDataList[0].events : []

    dayEventsCache.value[dayId] = events
  } catch (err) {
    if (!hasCache) {
      dayEventsCache.value[dayId] = []
    }
  } finally {
    dayLoading.value = false
  }
}

const handleDayChange = (index) => {
  saveDayIndex(index)
  loadDayEvents(index)
}

const goBack = () => {
  router.back()
}

const handleAddEvent = () => {
  editingEvent.value = null
  eventFormData.value = {
    time: null,
    title: '',
    type: 'scenic',
    description: '',
    location: ''
  }
  showEventModal.value = true
}

const handleEditEvent = (event) => {
  editingEvent.value = event
  eventFormData.value = {
    time: event.time,
    title: event.title,
    type: event.type || 'scenic',
    description: event.description || '',
    location: event.location || ''
  }
  showEventModal.value = true
}

const closeEventModal = () => {
  showEventModal.value = false
  editingEvent.value = null
}

const handleSaveEvent = async () => {
  try {
    await eventFormRef.value?.validate()

    saving.value = true
    const dayId = currentDayId.value
    const eventData = {
      time: eventFormData.value.time,
      title: eventFormData.value.title,
      type: eventFormData.value.type,
      description: eventFormData.value.description,
      location: eventFormData.value.location,
      state: editingEvent.value?.state || 'active'
    }

    if (editingEvent.value) {
      await scheduleApi.updateEvent(tripId.value, dayId, editingEvent.value.uid, eventData)
      message.success('修改成功')
    } else {
      await scheduleApi.createEvent(tripId.value, dayId, eventData)
      message.success('添加成功')
    }

    closeEventModal()
    // 清除缓存并重新加载当前日期
    delete dayEventsCache.value[dayId]
    await loadDayEvents(currentDayIndex.value)
  } catch (err) {
    message.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleDeleteEvent = () => {
  if (!editingEvent.value) return

  dialog.warning({
    title: '确认删除',
    content: '确定要删除这个日程吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const eventId = editingEvent.value.uid || editingEvent.value.id
        const dayId = currentDayId.value
        await scheduleApi.deleteEvent(tripId.value, eventId)
        message.success('删除成功')
        closeEventModal()
        // 清除缓存并重新加载
        delete dayEventsCache.value[dayId]
        await loadDayEvents(currentDayIndex.value)
      } catch (err) {
        message.error(err.message || '删除失败')
      }
    }
  })
}

const handleToggleComplete = async ({ id, completed }) => {
  try {
    const dayId = currentDayId.value
    const newState = completed ? 'completed' : 'active'
    await scheduleApi.updateEvent(tripId.value, dayId, id, { state: newState })

    // 更新本地缓存状态
    const events = dayEventsCache.value[dayId]
    const event = events.find(e => (e.uid || e.id) === id)
    if (event) {
      event.state = newState
    }
  } catch (err) {
    message.error(err.message || '操作失败')
  }
}
</script>

<style scoped>
.schedule-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  min-height: 100vh;
  background: #FFF9E9;
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 48px 0;
}

.trip-header-card {
  margin-bottom: 16px;
}

.trip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.trip-title {
  margin: 0;
  font-size: 20px;
}

.day-selector {
  margin-bottom: 16px;
  background: white;
  border-radius: 8px;
  padding: 8px;
}

.day-tabs {
  display: flex;
  gap: 8px;
}

.day-tab {
  padding: 12px 24px;
  cursor: pointer;
  position: relative;
  white-space: nowrap;
  border-radius: 4px;
  transition: all 0.3s;
}

.day-tab:hover {
  background: #f5f5f5;
}

.day-tab.active {
  color: #ff6b6b;
  font-weight: bold;
}

.active-indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 3px;
  background: #ff6b6b;
  border-radius: 2px;
}

.schedule-list {
  min-height: 300px;
}

.events-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-container {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.fab-button {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 56px;
  height: 56px;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
  z-index: 200;
}

/* 弹窗统一样式 */
.schedule-modal :deep(.n-card) {
  border-radius: 16px !important;
  overflow: hidden;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.18);
  border: none;
}

.schedule-modal :deep(.n-card-header__main) {
  color: #ffffff !important;
  font-size: 17px !important;
  font-weight: 700 !important;
  letter-spacing: 0.5px;
  text-align: center;
}

/* 表单样式 */
.schedule-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.schedule-form :deep(.n-form-item-label) {
  color: #444;
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 8px;
  padding: 0;
}

.schedule-form :deep(.n-form-item) {
  margin-bottom: 12px;
}

.schedule-form :deep(.n-form-item:last-child) {
  margin-bottom: 0;
}

/* 输入框样式 */
.schedule-form :deep(.custom-input .n-input__wrapper) {
  border: 1.5px solid #e8e8e8 !important;
  background: #ffffff !important;
  transition: all 0.3s ease;
  box-shadow: none !important;
}

.schedule-form :deep(.custom-input .n-input__wrapper:hover) {
  border-color: #ffb8a8;
  box-shadow: 0 2px 12px rgba(255, 107, 107, 0.08);
}

.schedule-form :deep(.custom-input .n-input__wrapper:focus-within) {
  border-color: #ff6b6b;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

/* 文本域样式 */
.schedule-form :deep(.custom-textarea) {
  border-radius: 20px !important;
}

.schedule-form :deep(.custom-textarea .n-input) {
  border-radius: 20px !important;
}

.schedule-form :deep(.custom-textarea .n-input__wrapper) {
  border: 1.5px solid #e8e8e8 !important;
  background: #ffffff !important;
  transition: all 0.3s ease;
  box-shadow: none !important;
  border-radius: 20px !important;
}

.schedule-form :deep(.custom-textarea .n-input__textarea-el) {
  border-radius: 20px !important;
}

.schedule-form :deep(.custom-textarea .n-input__wrapper:hover) {
  border-color: #ffb8a8;
  box-shadow: 0 2px 12px rgba(255, 107, 107, 0.08);
}

.schedule-form :deep(.custom-textarea .n-input__wrapper:focus-within) {
  border-color: #ff6b6b;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

/* 时间选择器样式 */
.custom-time-picker {
  width: 100%;
}

.custom-time-picker :deep(.n-input) {
  border-radius: 50px !important;
}

.custom-time-picker :deep(.n-input__wrapper) {
  border-radius: 50px !important;
  border: 1.5px solid #e8e8e8 !important;
  background: #ffffff !important;
  transition: all 0.3s ease;
}

.custom-time-picker :deep(.n-input__wrapper:hover) {
  border-color: #ffb8a8;
  box-shadow: 0 2px 12px rgba(255, 107, 107, 0.08);
}

.custom-time-picker :deep(.n-input__wrapper--focused) {
  border-color: #ff6b6b;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

/* 类型选择按钮 */
.type-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.type-radio-group :deep(.n-radio-button) {
  border-radius: 16px;
  height: 36px;
  padding: 0 16px;
}

.type-radio-group :deep(.n-radio-button--checked) {
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  border-color: transparent;
}

/* 弹窗居中显示 */
:global(.n-modal-container) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* 底部按钮 - Schedule 有三个按钮 */
.modal-footer .btn-delete {
  flex: 1 1 33%;
  height: 44px;
  border-radius: 16px;
  font-size: 15px;
  font-weight: 500;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ff4d4f;
  border: none;
  color: #ffffff;
  transition: all 0.3s ease;
}

.btn-delete:hover {
  background: #ff7875;
  transform: translateY(-1px);
}
</style>
