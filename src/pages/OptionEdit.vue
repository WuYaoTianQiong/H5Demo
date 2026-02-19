<template>
  <div class="option-edit-page">
    <!-- 顶部导航栏 -->
    <div class="hero">
      <div class="hero-inner">
        <div class="hero-left-section">
          <button class="back-btn" @click="navigateBack">
            <n-icon :component="ArrowLeftOutlined" />
          </button>
        </div>
        <div class="hero-center">
          <span class="hero-title">{{ pageTitle }}</span>
        </div>
        <div class="hero-right-section"></div>
      </div>
    </div>

    <div class="edit-container">
      <div class="edit-content">
        <n-form :model="form" label-placement="top" class="edit-form">
          <!-- 选项标题 -->
          <n-form-item label="选项标题" required>
            <n-input
              v-model:value="form.title"
              placeholder="给这个选项起个名字吧"
              maxlength="50"
              show-count
              round
              class="custom-input"
            />
          </n-form-item>

          <!-- 行程地点 -->
          <n-form-item label="行程地点">
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
              <div v-if="hasLocationCoords" class="location-brief-hint-wrapper">
                <div class="location-brief-hint">
                  <span class="hint-text" @click="openLocationPicker">{{ form.locationText || '已设置定位' }}</span>
                  <span class="hint-clear" @click.stop="clearLocation">×</span>
                </div>
              </div>
            </div>
          </n-form-item>

          <!-- 卡片类型 -->
          <n-form-item label="卡片类型">
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

          <!-- 开始时间 -->
          <n-form-item label="开始时间">
            <n-time-picker
              v-model:formatted-value="form.startTime"
              value-format="HH:mm"
              placeholder="选择时间"
              class="custom-time-picker"
              clearable
            />
          </n-form-item>

          <!-- 结束时间 -->
          <n-form-item label="结束时间">
            <n-time-picker
              v-model:formatted-value="form.endTime"
              value-format="HH:mm"
              placeholder="选择时间"
              class="custom-time-picker"
              clearable
            />
          </n-form-item>

          <!-- 持续时间 -->
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

          <!-- 选项状态 -->
          <n-form-item label="选项状态">
            <div class="state-buttons">
              <button
                :class="['state-btn', { active: form.state === 'active' }]"
                @click="form.state = 'active'"
              >
                <n-icon :component="CheckCircleOutlined" />
                有效
              </button>
              <button
                :class="['state-btn', 'inactive', { active: form.state === 'inactive' }]"
                @click="form.state = 'inactive'"
              >
                <n-icon :component="PauseCircleOutlined" />
                停用
              </button>
            </div>
          </n-form-item>

          <!-- 优先级 -->
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

          <!-- 费用 -->
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

          <!-- 标签区域 -->
          <n-form-item label="选项标签">
            <div class="tags-section">
              <!-- 输入行：输入框 + 添加按钮 -->
              <div class="tag-input-row">
                <n-input
                  v-model:value="tagInputValue"
                  placeholder="输入标签，按回车或点击+添加"
                  round
                  class="tag-input"
                  @keyup.enter="addTag"
                />
                <button
                  class="tag-add-btn"
                  :class="{ active: tagInputValue.trim() }"
                  @click="addTag"
                  :disabled="!tagInputValue.trim()"
                  type="button"
                >
                  <n-icon :component="PlusOutlined" />
                </button>
              </div>
              <!-- 色块选择器 - 直接展示 -->
              <div class="tag-color-picker">
                <div
                  v-for="color in tagColors"
                  :key="color.value"
                  class="color-dot"
                  :style="{ backgroundColor: color.hex }"
                  :class="{ active: selectedTagColor === color.value }"
                  @click="selectTagColor(color.value)"
                  :title="color.label"
                >
                  <span v-if="selectedTagColor === color.value" class="color-check">✓</span>
                </div>
              </div>
              <!-- 标签列表 -->
              <div v-if="form.tags.length > 0" class="tags-list">
                <div
                  v-for="(tag, index) in form.tags"
                  :key="index"
                  class="tag-item"
                  :class="tag.color || 'default'"
                >
                  <div class="tag-actions">
                    <div
                      class="tag-color-dot"
                      :style="{ backgroundColor: getTagColorHex(tag.color) }"
                      @click="openTagColorPicker(index)"
                      title="点击切换颜色"
                    ></div>
                  </div>
                  <span class="tag-text">{{ tag.text }}</span>
                  <div class="tag-delete-icon" @click="removeTag(index)" title="删除标签">
                    <span class="delete-x">×</span>
                  </div>
                </div>
              </div>
              <div v-else class="tag-empty">
                <span class="empty-text">暂无标签，添加一个吧~</span>
              </div>
            </div>
          </n-form-item>

          <!-- 选项描述 -->
          <n-form-item label="选项描述">
            <n-input
              v-model:value="form.description"
              type="textarea"
              placeholder="简单描述一下这个选项..."
              :autosize="{ minRows: 2 }"
              maxlength="200"
              show-count
              round
              class="custom-textarea"
            />
          </n-form-item>

          <!-- 详细信息 -->
          <n-form-item label="详细信息">
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
        </n-form>
      </div>

      <div class="edit-footer">
        <button class="btn-secondary" @click="navigateBack">
          <n-icon :component="CloseOutlined" />
          取消
        </button>
        <button class="btn-primary" @click="saveAndReturn">
          <n-icon :component="CheckOutlined" />
          确定
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NButton,
  NTimePicker,
  NIcon,
  useMessage
} from 'naive-ui'
import {
  ArrowLeftOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  PauseCircleOutlined,
  PlusOutlined,
  CloseOutlined,
  CheckOutlined
} from '@vicons/antd'
import StepButton from '../components/StepButton.vue'

const route = useRoute()
const router = useRouter()
const message = useMessage()

// 状态
const mode = ref('create')
const optionIndex = ref(-1)
const parentEventId = ref('')
const parentInfo = ref({ type: 'scenic', startTime: '', durationHours: '', durationMinutes: '' })

const form = reactive({
  id: '',
  title: '',
  type: 'scenic',
  startTime: null,
  endTime: null,
  durationHours: null,
  durationMinutes: null,
  state: 'active',
  priority: 0,
  tags: [],
  description: '',
  detail: '',
  location: null,
  locationText: '',
  lng: undefined,
  lat: undefined,
  images: [],
  cost: null,
  costCurrency: 'CNY'
})

const typeOptions = [
  { label: '景点', value: 'scenic', emoji: '🏞️' },
  { label: '美食', value: 'food', emoji: '🍜' },
  { label: '酒店', value: 'hotel', emoji: '🏨' },
  { label: '交通', value: 'transport', emoji: '🚗' },
  { label: '活动', value: 'activity', emoji: '🎉' },
  { label: '购物', value: 'shopping', emoji: '🛍️' },
  { label: '其他', value: 'other', emoji: '📌' }
]

const currencyOptions = [
  { label: 'CNY ¥', value: 'CNY' },
  { label: 'USD $', value: 'USD' },
  { label: 'EUR €', value: 'EUR' },
  { label: 'JPY ¥', value: 'JPY' },
  { label: 'GBP £', value: 'GBP' }
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
const showColorDropdown = ref(false)
const colorDropdownRef = ref(null)

// 切换颜色下拉框
function toggleColorDropdown() {
  showColorDropdown.value = !showColorDropdown.value
}

// 点击外部关闭下拉框
function handleClickOutside(event) {
  if (colorDropdownRef.value && !colorDropdownRef.value.contains(event.target)) {
    showColorDropdown.value = false
  }
}

// 计算属性
const pageTitle = computed(() => mode.value === 'edit' ? '编辑选项' : '添加选项')

const priorityHint = computed(() => {
  const hints = ['最低', '较低', '普通', '较高', '高', '最高']
  return `优先级：${hints[form.priority] || '普通'}`
})

const hasLocationCoords = computed(() => {
  return form.lng !== undefined && form.lat !== undefined && form.lng !== null && form.lat !== null
})

// 生命周期
onMounted(() => {
  mode.value = route.query.mode || 'create'
  optionIndex.value = parseInt(route.query.optionIndex) || -1
  parentEventId.value = route.query.parentEventId || ''

  // 从 localStorage 获取初始化数据
  const initData = localStorage.getItem('optionEditInit')
  if (initData) {
    try {
      const data = JSON.parse(initData)
      initFormData(data)
      localStorage.removeItem('optionEditInit')
    } catch (e) {
      console.error('解析初始化数据失败:', e)
    }
  }

  // 检查是否有从地图选择页面返回的数据
  checkLocationPickerResult()

  // 添加点击外部关闭颜色下拉框的事件监听
  document.addEventListener('click', handleClickOutside)
})

function initFormData(data) {
  parentInfo.value = data.parentInfo || {}
  if (data.optionIndex != null) {
    optionIndex.value = data.optionIndex
  }
  if (data.mode === 'edit' && data.option) {
    const o = data.option
    Object.assign(form, {
      id: o.id || '',
      title: o.title || '',
      type: o.type || parentInfo.value.type || 'scenic',
      startTime: o.startTime || parentInfo.value.startTime || null,
      durationHours: o.durationHours || parentInfo.value.durationHours || null,
      durationMinutes: o.durationMinutes || parentInfo.value.durationMinutes || null,
      state: o.state || 'active',
      tags: Array.isArray(o.tags) ? o.tags.map(t => typeof t === 'string' ? { text: t } : t) : [],
      description: o.description || '',
      detail: o.detail || '',
      location: o.location || null,
      locationText: o.location?.name || '',
      lng: o.location?.lng,
      lat: o.location?.lat
    })
  } else {
    Object.assign(form, {
      id: generateOptionId(),
      type: parentInfo.value.type || 'scenic',
      startTime: parentInfo.value.startTime || null,
      durationHours: parentInfo.value.durationHours || null,
      durationMinutes: parentInfo.value.durationMinutes || null
    })
  }
}

function generateOptionId() {
  return `opt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

function checkLocationPickerResult() {
  const result = localStorage.getItem('locationPickerResult')
  if (result) {
    try {
      const data = JSON.parse(result)
      form.location = data
      form.locationText = data.name
      form.lng = data.lng
      form.lat = data.lat
      localStorage.removeItem('locationPickerResult')
    } catch (e) {
      console.error('解析位置选择结果失败:', e)
    }
  }
}

function navigateBack() {
  router.back()
}

function openLocationPicker() {
  localStorage.setItem('optionEditDraft', JSON.stringify(form))
  router.push({
    path: '/location-picker',
    query: {
      keyword: form.locationText || '',
      from: 'option-edit'
    }
  })
}

function clearLocation() {
  form.location = null
  form.locationText = ''
  form.lng = undefined
  form.lat = undefined
}

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
  // 点击颜色点循环切换颜色
  const currentColor = form.tags[index].color || 'default'
  const currentIndex = tagColors.findIndex(c => c.value === currentColor)
  const nextIndex = (currentIndex + 1) % tagColors.length
  form.tags[index].color = tagColors[nextIndex].value
}

function validate() {
  if (!form.title || !form.title.trim()) {
    message.error('请输入选项标题')
    return false
  }
  return true
}

function saveAndReturn() {
  if (!validate()) return

  const option = {
    id: form.id,
    title: form.title,
    type: form.type,
    startTime: form.startTime,
    endTime: form.endTime,
    durationHours: form.durationHours,
    durationMinutes: form.durationMinutes,
    state: form.state,
    priority: form.priority,
    tags: form.tags,
    description: form.description,
    detail: form.detail,
    location: hasLocationCoords.value ? {
      name: form.locationText,
      lng: form.lng,
      lat: form.lat
    } : null,
    images: form.images,
    cost: form.cost,
    costCurrency: form.costCurrency
  }

  const result = {
    mode: mode.value,
    optionIndex: optionIndex.value,
    option
  }

  localStorage.setItem('optionEditResult', JSON.stringify(result))
  router.back()
}
</script>

<style scoped lang="scss">
.option-edit-page {
  min-height: 100vh;
  background: #fafafa;
  display: flex;
  flex-direction: column;
}

/* 顶部导航栏 - 与 Event.vue 完全一致 */
.hero {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
  padding: 12px 16px;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 4px 20px rgba(255, 107, 107, 0.3);
}

.hero-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.hero-left-section,
.hero-right-section {
  flex: 0 0 auto;
  width: 40px;
}

.hero-center {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.hero-title {
  color: #ffffff;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 1px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 16px;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
}

/* 编辑容器 - 去掉弹窗效果，直接展示 */
.edit-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.edit-content {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-form :deep(.n-form-item-label) {
  color: #444;
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 8px;
  padding: 0;
}

.edit-form :deep(.n-form-item) {
  margin-bottom: 0;
}

.edit-form :deep(.n-form-item-label__asterisk) {
  color: #ff6b6b;
  margin-left: 2px;
}

/* 输入框样式 */
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

/* 类型标签 */
.type-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.type-tag {
  padding: 8px 14px;
  border-radius: 20px;
  border: 1.5px solid #e8e8e8;
  background: #ffffff;
  color: #666;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 4px;

  &:hover {
    border-color: #ffb8a8;
    background: #fff8f6;
  }

  &.active {
    background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
    color: #ffffff;
    border-color: transparent;
    box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
  }
}

/* 持续时间 - 一行展示，占满宽度 */
.duration-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: nowrap;
  white-space: nowrap;
  width: 100%;
}

.duration-input {
  flex: 1;
  min-width: 60px;
  max-width: 120px;
}

.duration-input :deep(.n-input__wrapper) {
  border-radius: 50px !important;
  border: 1.5px solid #e8e8e8 !important;
}

.duration-label {
  font-size: 13px;
  color: #666;
  white-space: nowrap;
  flex-shrink: 0;
}

/* 状态按钮 */
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

  &.inactive.active {
    background: linear-gradient(135deg, #94a3b8, #64748b);
  }
}

/* 标签区域样式 - 无框布局 */
.tags-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

/* 输入行 - 与上下容器对齐，无边框 */
.tag-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
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
  border: 1.5px solid #e8e8e8 !important;
  background: #ffffff !important;
  transition: all 0.3s ease;
  width: 100% !important;
}

.tag-input :deep(.n-input__wrapper:hover) {
  border-color: #ffb8a8;
}

.tag-input :deep(.n-input__wrapper:focus-within) {
  border-color: #ff6b6b;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

/* 色块选择器 - 直接展示，均匀铺满 */
.tag-color-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.color-dot {
  width: calc((100% - 60px) / 6);
  height: calc((100% - 60px) / 6);
  max-width: 60px;
  max-height: 60px;
  min-width: 32px;
  min-height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 1;
}

.color-dot:hover {
  transform: scale(1.15);
}

.color-dot.active {
  border-color: #374151;
  transform: scale(1.1);
}

.color-check {
  font-size: 12px;
  color: #fff;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* 添加按钮 */
.tag-add-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: #e2e8f0;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 16px;
  flex-shrink: 0;
}

.tag-add-btn.active {
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  box-shadow: 0 2px 8px rgba(255, 107, 107, 0.35);
}

.tag-add-btn:active {
  transform: scale(0.9);
}

.tag-add-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 标签列表 - 更紧凑 */
.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 16px;
  transition: all 0.2s ease;
  min-height: 32px;
  font-size: 13px;
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
  font-weight: 500;
  margin: 0 6px;
  flex: 1;
}

.tag-actions {
  display: flex;
  align-items: center;
  gap: 6px;
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

.tag-color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: transform 0.2s ease;
}

.tag-color-dot:hover {
  transform: scale(1.2);
}

.tag-delete-icon {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag-delete-icon:hover {
  background: rgba(255, 107, 107, 0.9);
}

.tag-delete-icon:hover .delete-x {
  color: #fff;
}

.delete-x {
  font-size: 11px;
  font-weight: bold;
  color: #888;
  line-height: 1;
  transition: color 0.2s ease;
}

.tag-empty {
  padding: 16px 0;
  text-align: center;
}

.empty-text {
  font-size: 14px;
  color: #9ca3af;
}

/* 文本域样式 */
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

/* 时间选择器 */
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

/* 底部操作栏 */
.edit-footer {
  padding: 16px 20px calc(16px + env(safe-area-inset-bottom));
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.btn-secondary {
  padding: 12px 24px;
  border-radius: 50px;
  border: 1.5px solid #e8e8e8;
  background: #ffffff;
  color: #666;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    border-color: #ff6b6b;
    color: #ff6b6b;
    background: #fff8f6;
  }
}

.btn-primary {
  padding: 12px 32px;
  border-radius: 50px;
  border: none;
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 16px rgba(255, 107, 107, 0.35);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
}

/* 响应式优化 */
@media screen and (max-width: 768px) {
  .option-edit-page {
    background: #fafafa;
  }

  .hero {
    border-bottom-left-radius: 20px;
    border-bottom-right-radius: 20px;
  }

  .edit-content {
    padding: 16px;
  }

  .type-tags {
    gap: 6px;
  }

  .type-tag {
    padding: 6px 10px;
    font-size: 12px;
  }

  /* 移动端标签区域优化 */
  .tag-input-row {
    gap: 8px;
  }

  .color-dot {
    width: 24px;
    height: 24px;
  }

  .tag-add-btn {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }

  .tag-item {
    padding: 5px 10px;
    min-height: 28px;
    font-size: 12px;
  }

  .tag-color-dot {
    width: 12px;
    height: 12px;
  }

  .tag-delete-icon {
    width: 14px;
    height: 14px;
  }

  .delete-x {
    font-size: 10px;
  }

  .edit-footer {
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  }

  .btn-secondary,
  .btn-primary {
    flex: 1;
    justify-content: center;
  }
}
</style>
