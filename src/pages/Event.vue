<template>
  <div class="event-page">
    <!-- 顶部导航栏 -->
    <div class="hero">
      <div class="hero-inner">
        <div class="hero-left-section">
          <button class="back-btn" @click="goBack">
            <n-icon :component="ArrowLeftOutlined" />
          </button>
        </div>
        <div class="hero-center">
          <span class="hero-title">{{ pageTitle }}</span>
        </div>
        <div class="hero-right-section"></div>
      </div>
    </div>

    <div class="event-modal">

      <div class="modal-content">
        <n-form ref="formRef" :model="form" :rules="rules" label-placement="top" class="event-form">
          <n-form-item label="卡片类型" path="selectionMode">
            <div class="type-buttons">
              <button
                :class="['type-btn', { active: form.selectionMode === 'single' }]"
                @click="handleSelectionModeChange('single')"
              >
                <n-icon :component="CheckCircleOutlined" />
                单选卡片
              </button>
              <button
                :class="['type-btn', { active: form.selectionMode === 'multi' }]"
                @click="handleSelectionModeChange('multi')"
              >
                <n-icon :component="AppstoreOutlined" />
                多选卡片
              </button>
            </div>
          </n-form-item>

          <n-form-item label="所属日期" path="dayId">
            <n-select
              v-model:value="form.dayId"
              :options="dayOptions"
              placeholder="选择日期"
              class="custom-select"
            />
          </n-form-item>

          <n-form-item label="插入位置" path="insertMode">
            <div class="insert-mode-buttons">
              <button
                v-for="opt in insertModeOptions"
                :key="opt.value"
                :class="['insert-mode-btn', { active: form.insertMode === opt.value }]"
                @click="form.insertMode = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
          </n-form-item>

          <n-form-item label="卡片标题" path="title">
            <div class="title-input-wrapper">
              <n-input
                v-model:value="form.title"
                placeholder="给这个行程起个名字吧"
                maxlength="50"
                show-count
                round
                class="custom-input"
                @focus="showTitleHistory = titleHistoryList.length > 0"
                @blur="setTimeout(() => showTitleHistory = false, 200)"
              />
              <!-- 标题历史下拉框 -->
              <div v-if="showTitleHistory && titleHistoryList.length > 0" class="history-dropdown">
                <div class="history-header">
                  <span class="history-title">历史记录</span>
                  <span class="history-clear" @click="clearTitleHistory">清空</span>
                </div>
                <div class="history-list">
                  <div
                    v-for="(item, index) in titleHistoryList"
                    :key="index"
                    class="history-item"
                    @click="form.title = item.value; showTitleHistory = false"
                  >
                    <span class="history-text">{{ item.value }}</span>
                    <n-icon :component="ClockCircleOutlined" class="history-icon" />
                  </div>
                </div>
              </div>
            </div>
          </n-form-item>

          <template v-if="form.selectionMode === 'single'">
            <n-form-item label="行程类型" path="type">
              <div class="type-tags">
                <button
                  v-for="t in typeOptions"
                  :key="t.value"
                  :class="['type-tag', { active: form.type === t.value }]"
                  @click="form.type = t.value"
                >
                  {{ t.emoji }} {{ t.label }}
                </button>
              </div>
            </n-form-item>

            <n-form-item label="开始时间" path="startTime">
              <n-time-picker
                v-model:formatted-value="form.startTime"
                value-format="HH:mm"
                placeholder="选择时间"
                class="custom-time-picker"
                clearable
              />
            </n-form-item>

            <n-form-item label="结束时间" path="endTime">
              <n-time-picker
                v-model:formatted-value="form.endTime"
                value-format="HH:mm"
                placeholder="选择时间"
                class="custom-time-picker"
                clearable
              />
            </n-form-item>

            <n-form-item label="持续时间">
              <div class="duration-row">
                <StepButton label="-" @click="form.durationHours = Math.max(0, (form.durationHours || 0) - 1)" />
                <n-input-number v-model:value="form.durationHours" placeholder="小时" class="duration-input" :show-button="false" round />
                <span class="duration-label">小时</span>
                <StepButton label="+" @click="form.durationHours = Math.min(23, (form.durationHours || 0) + 1)" />
                <StepButton label="-" @click="form.durationMinutes = Math.max(0, (form.durationMinutes || 0) - 1)" />
                <n-input-number v-model:value="form.durationMinutes" placeholder="分钟" class="duration-input" :show-button="false" round />
                <span class="duration-label">分钟</span>
                <StepButton label="+" @click="form.durationMinutes = Math.min(59, (form.durationMinutes || 0) + 1)" />
              </div>
            </n-form-item>

            <n-form-item label="行程地点" path="location">
              <div class="location-section">
                <div class="location-input-wrapper">
                  <n-input
                    v-model:value="form.locationText"
                    placeholder="输入地点名称"
                    round
                    class="custom-input location-text-input"
                  />
                  <div class="location-icon-btn" :class="{ 'has-location': hasLocationCoords }" @click="openLocationPicker">
                    <n-icon :component="EnvironmentOutlined" size="20" />
                  </div>
                </div>
                <!-- 定位信息提示（有定位时显示） -->
                <div v-if="hasLocationCoords" class="location-brief-hint-wrapper">
                  <div class="location-brief-hint">
                    <span class="hint-text" @click="openLocationPicker">{{ form.locationText || '已设置定位' }}</span>
                    <span class="hint-clear" @click.stop="clearLocation">×</span>
                  </div>
                </div>
              </div>
            </n-form-item>

            <!-- 标签区域 -->
            <n-form-item label="行程标签">
              <div class="tags-section">
                <!-- 输入框和色块选择 -->
                <div class="tag-input-row">
                  <n-input
                    v-model:value="tagInputValue"
                    placeholder="输入标签，选择色块添加"
                    round
                    class="tag-input"
                    @keyup.enter="addTag"
                  />
                  <button
                    class="tag-add-btn"
                    :class="{ active: tagInputValue.trim() }"
                    @click="addTag"
                    :disabled="!tagInputValue.trim()"
                  >
                    <n-icon :component="PlusOutlined" />
                  </button>
                </div>
                <!-- 色块选择器 -->
                <div class="tag-color-picker">
                  <div
                    v-for="color in tagColors"
                    :key="color.value"
                    class="color-dot"
                    :style="{ backgroundColor: color.hex }"
                    :class="{ active: selectedTagColor === color.value }"
                    @click="selectTagColor(color.value)"
                  >
                    <span v-if="selectedTagColor === color.value" class="color-check">✓</span>
                  </div>
                </div>
                <span class="color-hint">选择颜色{{ tagInputValue.trim() ? '并添加标签' : '' }}</span>
                <!-- 标签列表 -->
                <div v-if="form.tags.length > 0" class="tags-list">
                  <div
                    v-for="(tag, index) in form.tags"
                    :key="index"
                    class="tag-item"
                    :class="tag.color || 'default'"
                  >
                    <div
                      class="tag-color-dot"
                      :style="{ backgroundColor: getTagColorHex(tag.color) }"
                      @click="openTagColorPicker(index)"
                    ></div>
                    <span class="tag-text">{{ tag.text }}</span>
                    <div class="tag-delete-icon" @click="removeTag(index)">
                      <span class="delete-x">×</span>
                    </div>
                  </div>
                </div>
                <div v-else class="tag-empty">
                  <span class="empty-text">暂无标签，添加一个吧~</span>
                </div>
              </div>
            </n-form-item>

            <n-form-item label="详细信息" path="detail">
              <n-input
                v-model:value="form.detail"
                type="textarea"
                placeholder="输入详细信息..."
                :autosize="{ minRows: 3 }"
                maxlength="500"
                show-count
                round
                class="custom-textarea"
              />
            </n-form-item>

            <n-form-item label="行程描述" path="description">
              <n-input
                v-model:value="form.description"
                type="textarea"
                placeholder="简单描述一下这个行程..."
                :autosize="{ minRows: 2 }"
                maxlength="200"
                show-count
                round
                class="custom-textarea"
              />
            </n-form-item>

            <n-form-item label="优先级（数字越大优先级越高）">
              <div class="priority-buttons">
                <button
                  v-for="n in 6"
                  :key="n - 1"
                  :class="['priority-btn', { active: form.priority === n - 1 }]"
                  @click="form.priority = n - 1"
                >
                  {{ n - 1 }}
                </button>
              </div>
            </n-form-item>

            <n-form-item label="费用">
              <div class="cost-row">
                <StepButton label="-" @click="form.cost = Math.max(0, (form.cost || 0) - 10)" />
                <n-input-number
                  v-model:value="form.cost"
                  placeholder="输入费用金额"
                  :min="0"
                  :precision="2"
                  class="cost-input"
                  round
                  clearable
                  :show-button="false"
                />
                <StepButton label="+" @click="form.cost = (form.cost || 0) + 10" />
                <div class="currency-buttons">
                  <button
                    :class="['currency-btn', { active: form.costCurrency === 'CNY' }]"
                    @click="form.costCurrency = 'CNY'"
                  >
                    ¥
                  </button>
                  <button
                    :class="['currency-btn', { active: form.costCurrency === 'USD' }]"
                    @click="form.costCurrency = 'USD'"
                  >
                    $
                  </button>
                </div>
              </div>
            </n-form-item>

            <n-form-item label="完成状态" path="state">
              <div class="state-buttons">
                <button
                  :class="['state-btn', { active: form.state === 'active' }]"
                  @click="form.state = 'active'"
                >
                  <n-icon :component="ClockCircleOutlined" />
                  进行中
                </button>
                <button
                  :class="['state-btn', 'completed', { active: form.state === 'completed' }]"
                  @click="form.state = 'completed'"
                >
                  <n-icon :component="CheckOutlined" />
                  已完成
                </button>
              </div>
            </n-form-item>
          </template>

          <template v-if="form.selectionMode === 'multi'">
            <div class="options-section">
              <div class="section-header">
                <span class="section-title">选项列表</span>
                <span class="section-hint">最多添加6个选项</span>
              </div>

              <div class="options-list">
                <div v-for="(opt, index) in options" :key="opt.id" class="option-card">
                  <div class="option-main">
                    <div class="option-info">
                      <span class="option-index">{{ index + 1 }}</span>
                      <div class="option-details">
                        <span class="option-name">{{ opt.title || `选项 ${index + 1}` }}</span>
                        <span v-if="opt.startTime" class="option-time">{{ opt.startTime }}</span>
                      </div>
                    </div>
                    <div class="option-actions">
                      <button class="action-btn edit" @click="editOption(index)">
                        <n-icon :component="EditOutlined" />
                      </button>
                      <button class="action-btn delete" @click="deleteOption(index)">
                        <n-icon :component="DeleteOutlined" />
                      </button>
                    </div>
                  </div>
                  <div v-if="opt.location?.name" class="option-location">
                    <n-icon :component="EnvironmentOutlined" />
                    {{ opt.location.name }}
                  </div>
                </div>
              </div>

              <button v-if="options.length < 6" class="add-option-btn" @click="addOption">
                <n-icon :component="PlusOutlined" />
                添加新选项
              </button>
            </div>
          </template>
        </n-form>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="goBack">
          <n-icon :component="CloseOutlined" />
          取消
        </button>
        <button class="btn-primary" :disabled="saving" @click="handleSave">
          <n-icon :component="CheckOutlined" />
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NForm, NFormItem, NInput, NInputNumber, NSelect, NTimePicker, NButton, NIcon, useMessage, useDialog
} from 'naive-ui'
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  CheckCircleOutlined,
  AppstoreOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  RightOutlined
} from '@vicons/antd'
import { scheduleApi, tripApi } from '@/services/api'
import StepButton from '../components/StepButton.vue'
import { useFormHistory, useInputHistory } from '@/composables/useFormHistory.js'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const mode = ref('create')
const tripId = ref('')
const eventId = ref('')
const saving = ref(false)
// 表单历史记录管理
const { formData: savedFormData, saveHistory: saveFormHistory, clearHistory: clearFormHistory } = useFormHistory({
  formId: `event-${route.params.tripId || 'new'}`,
  initialData: {
    selectionMode: 'single',
    dayId: '',
    insertMode: 'end',
    title: '',
    type: 'scenic',
    startTime: null,
    endTime: null,
    durationHours: null,
    durationMinutes: null,
    locationText: '',
    description: '',
    detail: '',
    state: 'active',
    priority: 0,
    tags: [],
    images: [],
    cost: null,
    costCurrency: 'CNY'
  },
  fields: ['selectionMode', 'dayId', 'insertMode', 'title', 'type', 'startTime', 'endTime', 'durationHours', 'durationMinutes', 'locationText', 'description', 'detail', 'state', 'priority', 'tags', 'images', 'cost', 'costCurrency'],
  debounceMs: 500,
  expireDays: 1 // 1天后过期
})

// 标题输入历史
const { 
  inputValue: titleHistoryValue, 
  historyList: titleHistoryList,
  showHistoryDropdown: showTitleHistory,
  saveHistory: saveTitleHistory,
  selectHistory: selectTitleHistory,
  removeHistoryItem: removeTitleHistoryItem,
  clearAllHistory: clearTitleHistory
} = useInputHistory('event-title', { maxHistory: 10, expireDays: 30 })

const form = reactive({ ...savedFormData.value })

// 同步表单数据到历史记录
watch(() => form, () => {
  Object.assign(savedFormData.value, form)
}, { deep: true })

const options = ref([])
const dayOptions = ref([])

const typeOptions = [
  { label: '景点', value: 'scenic', emoji: '🏞️' },
  { label: '美食', value: 'food', emoji: '🍜' },
  { label: '住宿', value: 'hotel', emoji: '🏨' },
  { label: '交通', value: 'transport', emoji: '🚗' },
  { label: '活动', value: 'activity', emoji: '🎯' },
  { label: '购物', value: 'shopping', emoji: '🛒' },
  { label: '其他', value: 'other', emoji: '📌' }
]

const currencyOptions = [
  { label: 'CNY ¥', value: 'CNY' },
  { label: 'USD $', value: 'USD' },
  { label: 'EUR €', value: 'EUR' },
  { label: 'JPY ¥', value: 'JPY' },
  { label: 'GBP £', value: 'GBP' }
]

const insertModeOptions = [
  { label: '添加到末尾', value: 'end' },
  { label: '添加到开头', value: 'start' },
  { label: '添加到当前之后', value: 'after_current' }
]

// 标签颜色选项 - 与源码一致
const tagColors = [
  { value: 'default', hex: '#6b7280', label: '默认' },
  { value: 'red', hex: '#ff5252', label: '红色' },
  { value: 'green', hex: '#4caf50', label: '绿色' },
  { value: 'yellow', hex: '#ffc107', label: '黄色' },
  { value: 'blue', hex: '#2196f3', label: '蓝色' },
  { value: 'purple', hex: '#9c27b0', label: '紫色' }
]

// 标签输入状态
const tagInputValue = ref('')
const selectedTagColor = ref('default')
const editingTagIndex = ref(-1)

const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  dayId: [{ required: true, message: '请选择日期', trigger: 'change' }]
}

const pageTitle = computed(() => mode.value === 'edit' ? '编辑卡片' : '新增卡片')

const priorityHint = computed(() => {
  const hints = ['最低', '较低', '普通', '较高', '高', '最高']
  return `优先级：${hints[form.priority] || '普通'}`
})

const hasLocationCoords = computed(() => {
  return form.lng !== undefined && form.lat !== undefined && form.lng !== null && form.lat !== null
})

const formatCoords = (lng, lat) => {
  if (lng === undefined || lat === undefined || lng === null || lat === null) return ''
  return `${lng.toFixed(4)}, ${lat.toFixed(4)}`
}

onMounted(async () => {
  mode.value = route.query.mode || 'create'
  tripId.value = route.params.tripId || route.query.tripId || ''
  eventId.value = route.query.eventId || ''

  // 检查是否有从地图选择页面返回的数据
  checkLocationPickerResult()

  // 检查是否有从选项编辑页面返回的数据
  checkOptionEditResult()

  if (tripId.value) {
    await loadDays()
  }

  // 如果是编辑模式，加载已有事件数据
  if (mode.value === 'edit' && eventId.value) {
    await loadEventData()
  }

  // 从 query 参数设置 dayId（使用 dayDate 作为值，因为它对应日期字符串）
  if (route.query.dayDate) {
    form.dayId = route.query.dayDate
  } else if (route.query.dayId) {
    form.dayId = route.query.dayId
  }
})

async function loadDays() {
  try {
    const res = await tripApi.getV2(tripId.value, { template: 'card' })
    const trip = res?.trip
    if (trip?.startDate && trip?.endDate) {
      const start = new Date(trip.startDate)
      const end = new Date(trip.endDate)
      const days = []
      let current = new Date(start)
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0]
        days.push({ label: dateStr, value: dateStr })
        current.setDate(current.getDate() + 1)
      }
      dayOptions.value = days
      if (days.length > 0 && !form.dayId) {
        form.dayId = days[0].value
      }
    }
  } catch (error) {
    console.error('加载天数失败:', error)
  }
}

async function loadEventData() {
  try {
    // 从路由参数获取事件数据
    const eventData = route.query.eventData
    if (eventData) {
      const event = JSON.parse(decodeURIComponent(eventData))
      form.title = event.title || ''
      form.type = event.type || 'scenic'
      form.startTime = event.startTime || null
      form.locationText = event.location?.name || ''
      form.location = event.location?.name || ''
      form.lng = event.location?.lng
      form.lat = event.location?.lat
      form.description = event.description || ''
      form.state = event.state || 'active'
      // 设置卡片类型（单选/多选）
      form.selectionMode = event.cardType === 'multi' ? 'multi' : 'single'
      if (event.options) {
        options.value = event.options
      }
    }
  } catch (error) {
    console.error('加载事件数据失败:', error)
  }
}

function handleSelectionModeChange(newMode) {
  // 如果模式没有变化，不做任何操作
  if (form.selectionMode === newMode) return

  // 在编辑模式下，如果从多选切换到单选且有选项数据，提示用户
  if (mode.value === 'edit' && form.selectionMode === 'multi' && newMode === 'single' && options.value.length > 0) {
    dialog.warning({
      title: '切换为单选卡片',
      content: `当前多选卡片有 ${options.value.length} 个选项，切换后将只保留第一个选项「${options.value[0]?.title || '选项1'}」作为单选卡片内容，是否继续？`,
      positiveText: '确认切换',
      negativeText: '取消',
      onPositiveClick: () => {
        // 将第一个选项的数据转移到单选卡
        const firstOption = options.value[0]
        if (firstOption) {
          form.type = firstOption.type || form.type
          form.startTime = firstOption.startTime || form.startTime
          form.durationHours = firstOption.durationHours || form.durationHours
          form.durationMinutes = firstOption.durationMinutes || form.durationMinutes
          form.description = firstOption.description || form.description
          form.detail = firstOption.detail || form.detail
          if (firstOption.location) {
            form.locationText = firstOption.location.name || ''
            form.lng = firstOption.location.lng
            form.lat = firstOption.location.lat
          }
        }
        // 清空选项数据
        options.value = []
        form.selectionMode = newMode
      }
    })
    return
  }

  // 从单选切换到多选，将单选信息作为第一个子选项
  if (newMode === 'multi') {
    // 创建第一个选项，包含当前单选卡片的信息
    const firstOption = {
      id: `opt_${Date.now()}`,
      title: form.title || '选项1',
      type: form.type || 'scenic',
      startTime: form.startTime || '',
      durationHours: form.durationHours || '',
      durationMinutes: form.durationMinutes || '',
      description: form.description || '',
      detail: form.detail || '',
      state: form.state || 'active',
      location: form.locationText ? {
        name: form.locationText,
        lng: form.lng,
        lat: form.lat
      } : null,
      tags: form.tags || [],
      cost: form.cost,
      costCurrency: form.costCurrency
    }
    options.value = [firstOption]
  }
  form.selectionMode = newMode
}

function addOption() {
  const parentInfo = {
    type: form.type,
    startTime: form.startTime,
    durationHours: '',
    durationMinutes: ''
  }

  localStorage.setItem('optionEditInit', JSON.stringify({
    mode: 'create',
    parentInfo: parentInfo
  }))

  router.push({
    path: '/option-edit',
    query: {
      mode: 'create',
      parentEventId: eventId.value || 'new'
    }
  })
}

function editOption(index) {
  const opt = options.value[index]
  const parentInfo = {
    type: form.type,
    startTime: form.startTime,
    durationHours: '',
    durationMinutes: ''
  }

  localStorage.setItem('optionEditInit', JSON.stringify({
    mode: 'edit',
    optionIndex: index,
    option: opt,
    parentInfo: parentInfo
  }))

  router.push({
    path: '/option-edit',
    query: {
      mode: 'edit',
      optionIndex: index,
      parentEventId: eventId.value || 'new'
    }
  })
}

function deleteOption(index) {
  options.value.splice(index, 1)
}

function applyOptionResult(data) {
  if (!data || !data.option) return

  const opt = {
    id: data.option.id || `opt_${Date.now()}`,
    title: data.option.title,
    type: data.option.type,
    startTime: data.option.startTime || '',
    durationHours: data.option.durationHours || '',
    durationMinutes: data.option.durationMinutes || '',
    state: data.option.state || 'active',
    tags: data.option.tags || [],
    description: data.option.description || '',
    detail: data.option.detail || '',
    location: data.option.location
  }

  if (data.mode === 'edit' && data.optionIndex >= 0) {
    options.value[data.optionIndex] = opt
  } else {
    options.value.push(opt)
  }
}

async function handleSave() {
  if (!form.title) {
    message.warning('请输入标题')
    return
  }
  if (!form.dayId) {
    message.warning('请选择日期')
    return
  }

  saving.value = true
  try {
    const payload = {
      uid: mode.value === 'edit' ? eventId.value : `${Date.now()}`,
      title: form.title,
      type: form.type,
      time: form.startTime || '',
      endTime: form.endTime || '',
      durationHours: form.durationHours,
      durationMinutes: form.durationMinutes,
      description: form.description,
      detail: form.detail,
      state: form.state,
      priority: form.priority,
      cardType: form.selectionMode,
      insertMode: form.insertMode,
      location: form.locationText ? { name: form.locationText } : null,
      images: form.images,
      cost: form.cost,
      costCurrency: form.costCurrency
    }

    if (form.selectionMode === 'multi') {
      payload.options = options.value
    }

    if (mode.value === 'edit') {
      await scheduleApi.updateEvent(tripId.value, form.dayId, eventId.value, payload)
      message.success('更新成功')
    } else {
      await scheduleApi.createEvent(tripId.value, form.dayId, payload)
      message.success('创建成功')
    }

    // 保存标题到历史记录
    titleHistoryValue.value = form.title
    saveTitleHistory()
    
    // 清除表单历史（保存成功后不需要再恢复）
    clearFormHistory()

    window.dispatchEvent(new CustomEvent('trip-event-saved', {
      detail: { dayId: form.dayId, mode: mode.value }
    }))

    router.back()
  } catch (error) {
    message.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.back()
}

function openLocationPicker() {
  // 保存当前表单数据到 localStorage，以便返回后恢复
  localStorage.setItem('eventFormDraft', JSON.stringify(form))
  router.push({
    path: '/location-picker',
    query: {
      keyword: form.locationText || '',
      from: 'event',
      tripId: tripId.value
    }
  })
}

function clearLocation() {
  form.location = ''
  form.locationText = ''
  form.lng = undefined
  form.lat = undefined
}

// 标签相关方法
function removeTag(index) {
  form.tags.splice(index, 1)
}

function selectTagColor(color) {
  selectedTagColor.value = color
  // 如果输入框有内容，自动添加标签
  if (tagInputValue.value.trim()) {
    addTag()
  }
}

function addTag() {
  const value = tagInputValue.value.trim()
  if (!value) return

  // 检查是否已存在
  if (form.tags.some(t => t.text === value)) {
    message.warning('标签已存在')
    return
  }

  form.tags.push({
    text: value,
    color: selectedTagColor.value
  })
  tagInputValue.value = ''
}

function getTagColorHex(colorValue) {
  const color = tagColors.find(c => c.value === colorValue)
  return color ? color.hex : '#6b7280'
}

function openTagColorPicker(index) {
  editingTagIndex.value = index
  // 这里可以打开颜色选择弹窗，简化版直接循环切换颜色
  const currentColor = form.tags[index].color || 'default'
  const currentIndex = tagColors.findIndex(c => c.value === currentColor)
  const nextIndex = (currentIndex + 1) % tagColors.length
  form.tags[index].color = tagColors[nextIndex].value
}

// 检查是否有从地图选择页面返回的数据
function checkLocationPickerResult() {
  const result = localStorage.getItem('locationPickerResult')
  if (result) {
    try {
      const data = JSON.parse(result)
      form.locationText = data.name
      form.location = data.name
      form.lng = data.lng
      form.lat = data.lat
      localStorage.removeItem('locationPickerResult')
    } catch (e) {
      console.error('解析位置选择结果失败:', e)
    }
  }
}

// 检查是否有从选项编辑页面返回的数据
function checkOptionEditResult() {
  const result = localStorage.getItem('optionEditResult')
  if (result) {
    try {
      const data = JSON.parse(result)
      applyOptionResult(data)
      localStorage.removeItem('optionEditResult')
    } catch (e) {
      console.error('解析选项编辑结果失败:', e)
    }
  }
}

</script>

<style scoped lang="scss">
.event-page {
  min-height: 100vh;
  background: #fcfaf2;
  display: flex;
  flex-direction: column;
}

/* 顶部导航栏 - 参考 Profile.vue */
.hero {
  padding: 12px 0;
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;
  box-shadow: 0 6px 16px rgba(255, 107, 107, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  min-height: 44px;
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

.hero-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 560px;
  position: relative;
  padding: 0 16px;
}

.hero-left-section {
  display: flex;
  align-items: center;
  z-index: 1;
  flex: 1;
}

.hero-center {
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 1;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.hero-title {
  font-size: 17px;
  font-weight: 800;
  color: #ffffff;
  line-height: 1.2;
  letter-spacing: 0.5px;
  text-align: center;
}

.hero-right-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  z-index: 1;
}

.back-btn {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 24px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 18px;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
}

.event-modal {
  width: 100%;
  max-width: 560px;
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 8px 40px rgba(255, 107, 107, 0.12);
  overflow: hidden;
  margin: 16px auto;
  flex: 1;
}

.modal-content {
  padding: 20px;
  background: #fafafa;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.event-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.event-form :deep(.n-form-item-label) {
  color: #444;
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 8px;
  padding: 0;
}

.event-form :deep(.n-form-item) {
  margin-bottom: 0;
}

.event-form :deep(.n-form-item-label__asterisk) {
  color: #ff6b6b;
  margin-left: 2px;
}

.custom-input :deep(.n-input__wrapper) {
  border: 1.5px solid #e8e8e8 !important;
  background: #ffffff !important;
  border-radius: 50px !important;
  transition: all 0.3s ease;
  box-shadow: none !important;
}

.custom-input :deep(.n-input__wrapper:hover) {
  border-color: #ffb8a8;
  box-shadow: 0 2px 12px rgba(255, 107, 107, 0.08);
}

.custom-input :deep(.n-input__wrapper:focus-within) {
  border-color: #ff6b6b;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

/* 标题输入框历史记录下拉框 */
.title-input-wrapper {
  position: relative;
  width: 100%;
}

.history-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid #f0f0f0;
  z-index: 100;
  overflow: hidden;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: linear-gradient(135deg, #fff8f6, #ffffff);
  border-bottom: 1px solid #f0f0f0;
}

.history-title {
  font-size: 12px;
  font-weight: 600;
  color: #666;
}

.history-clear {
  font-size: 12px;
  color: #ff6b6b;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: #ff4757;
  }
}

.history-list {
  max-height: 200px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid #f8f8f8;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #fff8f6;
  }
}

.history-text {
  font-size: 14px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 8px;
}

.history-icon {
  color: #999;
  font-size: 14px;
  flex-shrink: 0;
}

/* 地点输入框样式 */
.location-section {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.location-input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.location-text-input {
  flex: 1;
  min-width: 0;
}

.location-icon-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
  color: #ff6b6b;
  border-radius: 50%;
}

.location-icon-btn:hover {
  transform: scale(1.1);
}

.location-icon-btn:active {
  transform: scale(0.95);
}

.location-icon-btn.has-location {
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  color: #fff;
  box-shadow: 0 2px 8px rgba(255, 107, 107, 0.35);
}

/* 定位信息简要提示 - 绿色样式 */
.location-brief-hint-wrapper {
  margin-top: 8px;
  width: calc(100% - 44px);
}

.location-brief-hint {
  padding: 8px 12px;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(34, 197, 94, 0.04));
  border-radius: 8px;
  border-left: 3px solid #22c55e;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.location-brief-hint .hint-text {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: #16a34a;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.location-brief-hint .hint-clear {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #16a34a;
  opacity: 0.75;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.location-brief-hint .hint-clear:hover {
  opacity: 1;
  background: rgba(34, 197, 94, 0.1);
}

/* 文本域样式 - 椭圆倒角 */
.custom-textarea {
  border-radius: 20px !important;
}

.custom-textarea :deep(.n-input) {
  border-radius: 20px !important;
}

.custom-textarea :deep(.n-input__wrapper) {
  border: 1.5px solid #e8e8e8 !important;
  background: #ffffff !important;
  border-radius: 20px !important;
  transition: all 0.3s ease;
  box-shadow: none !important;
}

.custom-textarea :deep(.n-input__textarea-el) {
  border-radius: 20px !important;
}

.custom-textarea :deep(.n-input__wrapper:hover) {
  border-color: #ffb8a8;
  box-shadow: 0 2px 12px rgba(255, 107, 107, 0.08);
}

.custom-textarea :deep(.n-input__wrapper:focus-within) {
  border-color: #ff6b6b;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

.custom-select :deep(.n-base-selection) {
  border-radius: 50px !important;
}

.custom-select :deep(.n-base-selection-label) {
  border-radius: 50px !important;
}

.custom-select :deep(.n-base-selection__border) {
  border-radius: 50px !important;
  border: 1.5px solid #e8e8e8 !important;
}

.custom-select :deep(.n-base-selection:hover .n-base-selection__border) {
  border-color: #ffb8a8 !important;
}

.custom-select :deep(.n-base-selection--focus .n-base-selection__border) {
  border-color: #ff6b6b !important;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1) !important;
}

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
}

.custom-time-picker :deep(.n-input__wrapper:hover) {
  border-color: #ffb8a8;
}

.custom-time-picker :deep(.n-input__wrapper:focus-within) {
  border-color: #ff6b6b;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

/* 插入位置按钮样式 */
.insert-mode-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.insert-mode-btn {
  flex: 1;
  height: 44px;
  border-radius: 16px;
  border: 1.5px solid #e8e8e8;
  background: #ffffff;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.insert-mode-btn:hover {
  border-color: #ffb8a8;
  color: #ff6b6b;
}

.insert-mode-btn.active {
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  border: none;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.25);
}

/* 持续时间样式 */
.duration-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  flex-wrap: nowrap;
}

.duration-input {
  width: 70px;
}

.duration-input :deep(.n-input__wrapper) {
  border-radius: 50px !important;
  border: 1.5px solid #e8e8e8 !important;
}

.duration-label {
  font-size: 13px;
  color: #666;
  white-space: nowrap;
}

/* 优先级按钮样式 */
.priority-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.priority-btn {
  flex: 1;
  height: 40px;
  border-radius: 12px;
  border: 1.5px solid #e8e8e8;
  background: #ffffff;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.priority-btn:hover {
  border-color: #ffb8a8;
  color: #ff6b6b;
}

.priority-btn.active {
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  border: none;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.25);
}

.priority-hint {
  font-size: 12px;
  color: #999;
  margin-top: 6px;
  display: block;
}

/* 费用样式 */
.cost-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.cost-input {
  flex: 1;
}

.cost-input :deep(.n-input__wrapper) {
  border-radius: 50px !important;
}

.currency-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.currency-btn {
  width: 44px;
  height: 36px;
  border-radius: 18px;
  border: 1.5px solid #e8e8e8;
  background: #ffffff;
  color: #666;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.currency-btn:hover {
  border-color: #ffb8a8;
  color: #ff6b6b;
}

.currency-btn.active {
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  border: none;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.25);
}

.type-buttons {
  display: flex;
  gap: 10px;
  width: 100%;
}

.type-btn {
  flex: 1;
  height: 48px;
  border-radius: 16px;
  border: 1.5px solid #e8e8e8;
  background: #ffffff;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover {
    border-color: #ffb8a8;
    color: #ff6b6b;
    background: linear-gradient(135deg, #fff8f6 0%, #fff 100%);
  }

  &.active {
    background: linear-gradient(135deg, #ff6b6b, #ff8e53);
    border: none;
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(255, 107, 107, 0.25);
  }
}

.type-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  &.small {
    .type-tag {
      height: 36px;
      padding: 0 12px;
      font-size: 16px;
    }
  }
}

.type-tag {
  height: 40px;
  padding: 0 14px;
  border-radius: 20px;
  border: 1.5px solid #e8e8e8;
  background: #ffffff;
  color: #666;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;

  &:hover {
    border-color: #ffb8a8;
    color: #ff6b6b;
  }

  &.active {
    background: linear-gradient(135deg, #ff6b6b, #ff8e53);
    border: none;
    color: #ffffff;
    box-shadow: 0 3px 10px rgba(255, 107, 107, 0.25);
  }
}

.state-buttons {
  display: flex;
  gap: 10px;
  width: 100%;
}

.state-btn {
  flex: 1;
  height: 44px;
  border-radius: 16px;
  border: 1.5px solid #e8e8e8;
  background: #ffffff;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  &:hover {
    border-color: #ffb8a8;
    color: #ff6b6b;
  }

  &.active {
    background: linear-gradient(135deg, #ff6b6b, #ff8e53);
    border: none;
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(255, 107, 107, 0.25);
  }

  &.completed.active {
    background: linear-gradient(135deg, #52c41a, #73d13d);
  }
}

.options-section {
  margin-top: 8px;
}

/* 标签区域样式 - 与源码一致 */
.tags-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

/* 输入框行 */
.tag-input-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.tag-input {
  flex: 1;
  width: 100%;
  min-width: 0;
}

.tag-input :deep(.n-input) {
  width: 100%;
}

.tag-input :deep(.n-input__wrapper) {
  border-radius: 50px !important;
  width: 100% !important;
}

.tag-add-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: none;
  background: #e2e8f0;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 18px;
}

.tag-add-btn.active {
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
}

.tag-add-btn:active {
  transform: scale(0.95);
}

.tag-add-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 色块选择器 */
.tag-color-picker {
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-top: 8px;
}

.color-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s ease;
}

.color-dot:hover {
  transform: scale(1.1);
}

.color-dot.active {
  border-color: #374151;
  transform: scale(1.1);
}

.color-check {
  font-size: 12px;
  color: #fff;
  font-weight: bold;
}

.color-hint {
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
}

/* 标签列表 */
.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
}

.tag-item {
  display: flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 20px;
  transition: all 0.2s ease;
  min-height: 36px;
  gap: 8px;
}

/* 标签类型样式 - 浅色背景 + 深色文字 */
.tag-item.default {
  background: #f3f4f6;
}

.tag-item.default .tag-text {
  color: #636e72;
}

.tag-item.red {
  background: #ffebee;
}

.tag-item.red .tag-text {
  color: #ff5252;
}

.tag-item.green {
  background: #e8f5e9;
}

.tag-item.green .tag-text {
  color: #4caf50;
}

.tag-item.yellow {
  background: #fff8e1;
}

.tag-item.yellow .tag-text {
  color: #ffc107;
}

.tag-item.blue {
  background: #e3f2fd;
}

.tag-item.blue .tag-text {
  color: #2196f3;
}

.tag-item.purple {
  background: #f3e5f5;
}

.tag-item.purple .tag-text {
  color: #9c27b0;
}

.tag-text {
  font-size: 14px;
  font-weight: 500;
}

.tag-color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s ease;
}

.tag-color-dot:hover {
  transform: scale(1.1);
}

.tag-delete-icon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag-delete-icon:hover {
  background: rgba(0, 0, 0, 0.2);
}

.delete-x {
  font-size: 12px;
  font-weight: bold;
  color: #666;
  line-height: 1;
}

.tag-empty {
  padding: 20px 0;
  text-align: center;
}

.empty-text {
  font-size: 14px;
  color: #9ca3af;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #444;
}

.section-hint {
  font-size: 12px;
  color: #999;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.option-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 14px;
  border: 1.5px solid #f0f0f0;
  transition: all 0.3s ease;

  &:hover {
    border-color: #ffb8a8;
    box-shadow: 0 4px 16px rgba(255, 107, 107, 0.08);
  }
}

.option-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.option-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.option-index {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.option-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.option-time {
  font-size: 12px;
  color: #999;
}

.option-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 1.5px solid #e8e8e8;
  background: #ffffff;
  color: #999;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;

  &:hover {
    border-color: #ffb8a8;
    color: #ff6b6b;
  }

  &.delete:hover {
    border-color: #ff4d4f;
    color: #ff4d4f;
  }
}

.option-location {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #f0f0f0;
  font-size: 12px;
  color: #888;
  display: flex;
  align-items: center;
  gap: 4px;
}

.add-option-btn {
  width: 100%;
  height: 48px;
  border-radius: 14px;
  border: 2px dashed #e8e8e8;
  background: #fafafa;
  color: #999;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;

  &:hover {
    border-color: #ffb8a8;
    color: #ff6b6b;
    background: #fff8f6;
  }
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background: #ffffff;
  border-top: 1px solid #f0f0f0;
}

.btn-secondary,
.btn-primary {
  flex: 1;
  height: 46px;
  border-radius: 16px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  &.small {
    flex: 0 0 auto;
    padding: 0 24px;
    height: 40px;
    font-size: 14px;
  }
}

.btn-secondary {
  border: 1.5px solid #e8e8e8;
  background: #ffffff;
  color: #666;

  &:hover {
    border-color: #ffb8a8;
    color: #ff6b6b;
    background: linear-gradient(135deg, #fff8f6 0%, #fff 100%);
  }
}

.btn-primary {
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  border: none;
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 4px 14px rgba(255, 107, 107, 0.35);

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(255, 107, 107, 0.45);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
}

@media screen and (max-width: 768px) {
  .event-page {
    background: #fafafa;
  }

  .hero {
    border-bottom-left-radius: 20px;
    border-bottom-right-radius: 20px;
  }

  .hero-inner {
    max-width: 100%;
    padding: 0 max(16px, env(safe-area-inset-left));
  }

  .event-modal {
    max-width: 100%;
    border-radius: 0;
    margin: 0;
    box-shadow: none;
  }

  .modal-content {
    max-height: calc(100vh - 140px);
    padding: 16px;
  }

  .type-btn {
    height: 44px;
    font-size: 13px;
  }

  .type-tag {
    height: 36px;
    padding: 0 12px;
    font-size: 12px;
  }

  .state-btn {
    height: 40px;
    font-size: 13px;
  }

  .btn-secondary,
  .btn-primary {
    height: 42px;
    font-size: 14px;
  }
}
</style>
