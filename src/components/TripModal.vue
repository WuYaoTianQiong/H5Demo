<template>
  <n-modal
    :show="isModalVisible"
    :title="modalTitle"
    preset="card"
    :style="mainModalStyle"
    :bordered="false"
    size="huge"
    class="trip-modal"
    :content-style="contentStyle"
    :header-style="headerStyle"
    :footer-style="footerStyle"
    @update:show="handleModalShowUpdate"
  >
    <n-form
      ref="formRef"
      :model="tripFormData"
      :rules="formRules"
      label-placement="top"
      class="trip-form"
    >
      <n-form-item label="行程标题" path="title" required>
        <n-input
          v-model:value="tripFormData.title"
          placeholder="给你的行程起个名字吧"
          maxlength="20"
          show-count
          round
          class="custom-input"
        />
      </n-form-item>

      <n-form-item label="行程描述" path="description">
        <n-input
          v-model:value="tripFormData.description"
          type="textarea"
          placeholder="简单描述一下这次旅行的计划..."
          maxlength="200"
          show-count
          :autosize="{ minRows: 2 }"
          round
          class="custom-textarea"
        />
      </n-form-item>

      <n-form-item label="出行日期" path="dateRange" required>
        <div class="date-inputs-row">
          <div class="date-input-item">
            <n-date-picker
              :value="startDateValue"
              type="date"
              clearable
              placeholder="开始日期"
              class="single-date-picker"
              :is-date-disabled="disablePreviousDate"
              @update:value="handleStartDateChange"
            />
          </div>
          <div class="date-separator">
            <n-icon :component="ArrowRightOutlined" />
          </div>
          <div class="date-input-item">
            <n-date-picker
              :value="endDateValue"
              type="date"
              clearable
              placeholder="结束日期"
              class="single-date-picker"
              :is-date-disabled="disableEndDate"
              @update:value="handleEndDateChange"
            />
          </div>
        </div>
      </n-form-item>

      <n-form-item label="行程天数" path="days">
        <div class="days-row">
          <div class="days-input-group">
            <StepButton label="-" @click="tripFormData.days = Math.max(1, (tripFormData.days || 0) - 1)" />
            <n-input-number v-model:value="tripFormData.days" placeholder="天数" class="days-input" :show-button="false" round />
            <span class="days-label">天</span>
            <StepButton label="+" @click="tripFormData.days = Math.min(365, (tripFormData.days || 0) + 1)" />
          </div>
          <div class="days-input-group">
            <StepButton label="-" @click="tripFormData.nights = Math.max(0, (tripFormData.nights || 0) - 1)" />
            <n-input-number v-model:value="tripFormData.nights" placeholder="夜数" class="days-input" :show-button="false" round />
            <span class="days-label">夜</span>
            <StepButton label="+" @click="tripFormData.nights = Math.min(365, (tripFormData.nights || 0) + 1)" />
          </div>
        </div>
      </n-form-item>

      <n-form-item label="人均预算" path="budget">
        <div class="budget-row">
          <div class="budget-input-group">
            <StepButton label="-" @click="tripFormData.budgetPerPersonMin = Math.max(0, (tripFormData.budgetPerPersonMin || 0) - 100)" />
            <n-input-number v-model:value="tripFormData.budgetPerPersonMin" placeholder="最低" class="budget-input" :show-button="false" round />
            <StepButton label="+" @click="tripFormData.budgetPerPersonMin = (tripFormData.budgetPerPersonMin || 0) + 100" />
          </div>
          <span class="budget-separator">~</span>
          <div class="budget-input-group">
            <StepButton label="-" @click="tripFormData.budgetPerPersonMax = Math.max(0, (tripFormData.budgetPerPersonMax || 0) - 100)" />
            <n-input-number v-model:value="tripFormData.budgetPerPersonMax" placeholder="最高" class="budget-input" :show-button="false" round />
            <StepButton label="+" @click="tripFormData.budgetPerPersonMax = (tripFormData.budgetPerPersonMax || 0) + 100" />
          </div>
          <n-select
            v-model:value="tripFormData.budgetUnit"
            :options="budgetUnitOptions"
            size="small"
            class="unit-select"
          />
        </div>
      </n-form-item>

      <n-form-item label="出行人数" path="travelerCount">
        <div class="traveler-row">
          <StepButton label="-" @click="tripFormData.travelerCount = Math.max(1, (tripFormData.travelerCount || 0) - 1)" />
          <n-input-number v-model:value="tripFormData.travelerCount" placeholder="请输入" class="traveler-input" :show-button="false" round />
          <span class="traveler-label">人</span>
          <StepButton label="+" @click="tripFormData.travelerCount = Math.min(999, (tripFormData.travelerCount || 0) + 1)" />
        </div>
      </n-form-item>

      <n-form-item label="发布状态" path="status">
        <div class="status-buttons">
          <n-button
            v-for="status in tripStatusOptions"
            :key="status.value"
            :type="tripFormData.status === status.value ? 'primary' : 'default'"
            class="status-btn"
            @click="tripFormData.status = status.value"
          >
            <template #icon>
              <n-icon :component="status.icon" />
            </template>
            {{ status.label }}
          </n-button>
        </div>
      </n-form-item>
    </n-form>

    <template #footer>
      <div class="modal-footer">
        <n-button class="btn-secondary" @click="handleModalClose">
          <template #icon>
            <n-icon :component="CloseOutlined" />
          </template>
          取消
        </n-button>
        <n-button type="primary" class="btn-primary" :loading="loading" @click="handleFormSubmit">
          <template #icon>
            <n-icon :component="CheckOutlined" />
          </template>
          {{ submitButtonText }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import StepButton from './StepButton.vue'
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NButton,
  NIcon,
  NDatePicker,
  NSelect,
  useMessage,
  type FormRules
} from 'naive-ui'
import {
  CheckOutlined,
  CloseOutlined,
  EditFilled,
  EyeFilled,
  FolderFilled,
  ArrowRightOutlined
} from '@vicons/antd'
import { useUserStore } from '@/stores/user'
import { useDevice } from '@/composables/useDevice'
import { formatDate, calculateDaysBetween, calculateNights, getYearFromDate, isDateBeforeToday, isDateBefore } from '@/utils/date'
import type { TripFormData, TripStatusOption, Trip } from '@/types/trip'

const props = defineProps<{
  show: boolean
  editingTrip?: Trip | null
}>()

const emit = defineEmits<{
  close: []
  save: [data: TripFormData, editingTrip: Trip | null | undefined]
}>()

const message = useMessage()
const userStore = useUserStore()
const { isMobile } = useDevice()

const isModalVisible = ref(false)
const formRef = ref<InstanceType<typeof NForm> | null>(null)
const loading = ref(false)
const startDateValue = ref<number | null>(null)
const endDateValue = ref<number | null>(null)

const tripFormData = reactive<TripFormData>({
  title: '',
  description: '',
  year: '',
  startDate: '',
  endDate: '',
  days: null,
  nights: null,
  status: 'draft',
  budgetPerPersonMin: null,
  budgetPerPersonMax: null,
  budgetUnit: '元',
  travelerCount: null
})

const tripStatusOptions: TripStatusOption[] = [
  { label: '草稿', value: 'draft', icon: EditFilled },
  { label: '已发布', value: 'published', icon: EyeFilled },
  { label: '已归档', value: 'archived', icon: FolderFilled }
]

const budgetUnitOptions = [
  { label: '元', value: '元' },
  { label: '万', value: '万' }
]

const formRules: FormRules = {
  title: [
    { required: true, message: '请输入行程标题', trigger: 'blur' },
    { max: 20, message: '标题不能超过20个字符', trigger: 'blur' }
  ],
  description: [
    { max: 200, message: '描述不能超过200个字符', trigger: 'blur' }
  ],
  dateRange: [
    {
      validator: () => {
        return !!(tripFormData.startDate && tripFormData.endDate)
      },
      message: '请选择出行日期',
      trigger: 'change'
    }
  ]
}

const modalTitle = computed(() => props.editingTrip ? '编辑行程' : '新增行程')

const submitButtonText = computed(() => props.editingTrip ? '保存修改' : '创建行程')

const mainModalStyle = computed(() => ({
  width: isMobile.value ? '96%' : '600px',
  maxHeight: isMobile.value ? '80vh' : '90vh',
  borderRadius: '16px'
}))

const contentStyle = computed(() => ({
  padding: isMobile.value ? '16px 16px 12px 16px' : '20px 20px 16px 20px',
  background: '#fafafa',
  maxHeight: isMobile.value ? 'calc(80vh - 60px)' : 'calc(90vh - 60px)',
  overflowY: 'auto' as const,
  overflowX: 'hidden' as const,
  borderRadius: '0 0 16px 16px'
}))

const headerStyle = computed(() => ({
  background: 'linear-gradient(135deg, #ff6b6b, #ff8e53)',
  padding: isMobile.value ? '12px 16px' : '14px 20px',
  borderRadius: '16px 16px 0 0',
  width: '100%'
}))

const footerStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: isMobile.value ? '12px 16px' : '16px 20px',
  background: '#ffffff',
  borderTop: '1px solid #f0f0f0',
  gap: '12px',
  borderRadius: '0 0 16px 16px',
  width: '100%',
  boxSizing: 'border-box'
}))

function disablePreviousDate(ts: number) {
  return isDateBeforeToday(ts)
}

function disableEndDate(ts: number) {
  if (!startDateValue.value) return isDateBeforeToday(ts)
  return isDateBefore(ts, startDateValue.value)
}

function handleStartDateChange(value: number | null) {
  startDateValue.value = value
  if (value) {
    const start = new Date(value)
    tripFormData.startDate = formatDate(start)
    tripFormData.year = getYearFromDate(start)
    // 如果结束日期已存在且早于新的开始日期，则清空结束日期
    if (endDateValue.value && endDateValue.value < value) {
      endDateValue.value = null
      tripFormData.endDate = ''
      tripFormData.days = null
      tripFormData.nights = null
    } else if (endDateValue.value) {
      // 重新计算天数
      const end = new Date(endDateValue.value)
      const days = calculateDaysBetween(start, end)
      tripFormData.days = days
      tripFormData.nights = calculateNights(days)
    }
  } else {
    tripFormData.startDate = ''
    tripFormData.year = ''
    tripFormData.days = null
    tripFormData.nights = null
  }
}

function handleEndDateChange(value: number | null) {
  endDateValue.value = value
  if (value) {
    const end = new Date(value)
    tripFormData.endDate = formatDate(end)
    if (startDateValue.value) {
      const start = new Date(startDateValue.value)
      const days = calculateDaysBetween(start, end)
      tripFormData.days = days
      tripFormData.nights = calculateNights(days)
    }
  } else {
    tripFormData.endDate = ''
    tripFormData.days = null
    tripFormData.nights = null
  }
}

watch(() => props.show, (newVal) => {
  isModalVisible.value = newVal
  if (newVal && props.editingTrip) {
    initFormData(props.editingTrip)
  } else if (newVal) {
    resetFormData()
  }
})

watch(() => props.editingTrip, (newVal) => {
  if (newVal && isModalVisible.value) {
    initFormData(newVal)
  }
})

function resetFormData() {
  Object.assign(tripFormData, {
    title: '',
    description: '',
    year: '',
    startDate: '',
    endDate: '',
    days: null,
    nights: null,
    status: 'draft',
    budgetPerPersonMin: null,
    budgetPerPersonMax: null,
    budgetUnit: '元',
    travelerCount: null
  })
  startDateValue.value = null
  endDateValue.value = null
}

function initFormData(trip: Trip) {
  Object.assign(tripFormData, {
    title: trip.title || '',
    description: trip.description || '',
    year: trip.year || '',
    startDate: trip.startDate || '',
    endDate: trip.endDate || '',
    days: trip.days || null,
    nights: null,
    status: trip.status || 'draft',
    budgetPerPersonMin: trip.budgetPerPersonMin ?? null,
    budgetPerPersonMax: trip.budgetPerPersonMax ?? null,
    budgetUnit: trip.budgetUnit || '元',
    travelerCount: trip.travelerCount ?? null
  })

  if (trip.startDate && trip.endDate) {
    const start = new Date(trip.startDate).getTime()
    const end = new Date(trip.endDate).getTime()
    startDateValue.value = start
    endDateValue.value = end
    const days = calculateDaysBetween(new Date(trip.startDate), new Date(trip.endDate))
    tripFormData.days = days
    tripFormData.nights = calculateNights(days)
  }
}

function handleModalShowUpdate(val: boolean) {
  if (!val) {
    emit('close')
  }
}

function handleModalClose() {
  isModalVisible.value = false
  emit('close')
}



async function handleFormSubmit() {
  if (!userStore.isLoggedIn) {
    message.warning('请先登录')
    handleModalClose()
    return
  }

  try {
    await formRef.value?.validate()

    if (!tripFormData.startDate || !tripFormData.endDate) {
      message.error('请选择出行日期')
      return
    }

    loading.value = true
    emit('save', { ...tripFormData }, props.editingTrip)
    handleModalClose()
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
/* 弹窗居中显示 */
:global(.n-modal-container) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* TripModal 特有样式 */
.trip-modal :deep(.n-card__content) {
  overflow-x: hidden !important;
}

/* 表单布局 */
.trip-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
}

.trip-form :deep(.n-form-item-label) {
  color: #444;
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 8px;
  padding: 0;
}

.trip-form :deep(.n-form-item) {
  margin-bottom: 12px;
  width: 100%;
  box-sizing: border-box;
}

.trip-form :deep(.n-form-item:last-child) {
  margin-bottom: 0;
}

.trip-form :deep(.n-form-item-label__asterisk) {
  color: #ff6b6b;
  margin-left: 2px;
}

.trip-form :deep(.n-form-item-feedback-wrapper) {
  padding-top: 3px;
  min-height: 0;
}

/* 输入框样式 */
.trip-form :deep(.custom-input .n-input__wrapper) {
  border: 1.5px solid #e8e8e8 !important;
  background: #ffffff !important;
  transition: all 0.3s ease;
  box-shadow: none !important;
}

/* 文本域样式 - 椭圆倒角 */
.trip-form :deep(.custom-textarea) {
  border-radius: 20px !important;
}

.trip-form :deep(.custom-textarea .n-input) {
  border-radius: 20px !important;
}

.trip-form :deep(.custom-textarea .n-input__wrapper) {
  border: 1.5px solid #e8e8e8 !important;
  background: #ffffff !important;
  transition: all 0.3s ease;
  box-shadow: none !important;
  border-radius: 20px !important;
}

.trip-form :deep(.custom-textarea .n-input__textarea-el) {
  border-radius: 20px !important;
}

.trip-form :deep(.custom-input .n-input__wrapper:hover),
.trip-form :deep(.custom-textarea .n-input__wrapper:hover) {
  border-color: #ffb8a8;
  box-shadow: 0 2px 12px rgba(255, 107, 107, 0.08);
}

.trip-form :deep(.custom-input .n-input__wrapper:focus-within),
.trip-form :deep(.custom-textarea .n-input__wrapper:focus-within) {
  border-color: #ff6b6b;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

/* 所有按钮触发时变成橘色 */
:deep(.n-button:not(.n-button--disabled):active) {
  background: #ff8e53 !important;
  border-color: #ff8e53 !important;
  color: #ffffff !important;
}

:deep(.n-button--primary:active) {
  background: #ff8e53 !important;
  border-color: #ff8e53 !important;
}

:deep(.n-button--default:active) {
  background: #ff8e53 !important;
  border-color: #ff8e53 !important;
  color: #ffffff !important;
}

.trip-form :deep(.custom-input .n-input__input-el),
.trip-form :deep(.custom-textarea .n-input__textarea-el) {
  color: #333;
  font-size: 14px;
}

.trip-form :deep(.custom-input .n-input__input-el::placeholder),
.trip-form :deep(.custom-textarea .n-input__textarea-el::placeholder) {
  color: #bbb;
}

/* 行程天数 */
.days-row {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.days-input-group {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.days-input {
  flex: 1;
  text-align: center;
  min-width: 0;
}

.days-label {
  white-space: nowrap;
  color: #666;
}

.step-btn {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.step-btn:active {
  background: linear-gradient(135deg, #ff6b6b, #ff8e53) !important;
  border-color: transparent !important;
  color: #ffffff !important;
  transform: scale(0.9);
}

/* 人均预算 */
.budget-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  flex-wrap: nowrap;
}

.budget-input-group {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 60px;
}

.budget-input {
  flex: 1;
  text-align: center;
  min-width: 50px;
}

.budget-separator {
  color: #999;
  font-size: 14px;
  flex-shrink: 0;
  padding: 0 2px;
}

.unit-select {
  width: 60px;
  flex-shrink: 0;
}

.unit-select :deep(.n-base-selection) {
  border-radius: 12px !important;
}

.unit-select :deep(.n-base-selection-label) {
  font-size: 12px;
}

/* 出行人数 */
.traveler-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.traveler-input {
  flex: 1;
  text-align: center;
  min-width: 0;
}

.traveler-label {
  color: #666;
  font-size: 14px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* 日期选择器行布局 */
.date-inputs-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.date-input-item {
  flex: 1;
  min-width: 0;
}

.date-separator {
  color: #999;
  font-size: 14px;
  display: flex;
  align-items: center;
  padding: 0 4px;
  flex-shrink: 0;
}

.single-date-picker {
  width: 100%;
}

/* 日期选择器圆角样式 */
.single-date-picker :deep(.n-input) {
  border-radius: 50px !important;
}

.single-date-picker :deep(.n-input__wrapper) {
  border-radius: 50px !important;
  border: 1.5px solid #e8e8e8 !important;
  background: #ffffff !important;
  transition: all 0.3s ease;
}

.single-date-picker :deep(.n-input__input-el) {
  border-radius: 50px !important;
}

.single-date-picker :deep(.n-input__wrapper:hover) {
  border-color: #ffb8a8;
  box-shadow: 0 2px 12px rgba(255, 107, 107, 0.08);
}

.single-date-picker :deep(.n-input__wrapper--focused) {
  border-color: #ff6b6b;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

.input-separator {
  color: #999;
  font-size: 14px;
  font-weight: 500;
}

/* 数字输入框圆角样式 - 全局 */
:deep(.n-input-number .n-input) {
  border-radius: 50px !important;
}

:deep(.n-input-number .n-input__wrapper) {
  border-radius: 50px !important;
}

:deep(.n-input-number .n-input__input-el) {
  border-radius: 50px !important;
}

/* 状态按钮 */
.status-buttons {
  display: flex;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.status-btn {
  flex: 1;
  height: 40px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
  min-width: 0;
}

.status-btn.n-button--default {
  border: 1.5px solid #e8e8e8;
  background: #ffffff;
  color: #666;
}

.status-btn.n-button--default:hover {
  border-color: #ffb8a8;
  color: #ff6b6b;
  background: linear-gradient(135deg, #fff8f6 0%, #fff 100%);
}

.status-btn.n-button--primary {
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  border: none;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.25);
}

/* 响应式 */
@media screen and (max-width: 768px) {
  .trip-modal :deep(.n-card) {
    max-height: 85vh;
    border-radius: 20px 20px 0 0;
    margin-top: auto;
    margin-bottom: 0;
    width: 100% !important;
  }

  .trip-modal :deep(.n-card-header) {
    padding: 12px 16px !important;
    margin: 0 !important;
    width: 100% !important;
    border-radius: 20px 20px 0 0 !important;
  }

  .trip-modal :deep(.n-card-header__main) {
    font-size: 16px !important;
  }



  .trip-form {
    gap: 8px;
  }

  .trip-form :deep(.n-form-item-label) {
    font-size: 12px;
    margin-bottom: 4px;
  }

  .form-row {
    gap: 8px;
  }

  .traveler-input {
    width: 100%;
  }

  .status-btn {
    height: 36px;
    font-size: 13px;
  }

  .trip-modal :deep(.n-card__footer) {
    padding: 12px 16px !important;
    gap: 8px !important;
  }

  .trip-modal :deep(.n-card__footer .n-button) {
    height: 44px !important;
    font-size: 15px !important;
  }

  .unit-btn {
    height: 32px;
    padding: 0 12px;
    font-size: 12px;
  }

  .days-row {
    gap: 12px;
  }

  .budget-row {
    gap: 6px;
  }

  .traveler-row {
    gap: 6px;
  }

  .date-inputs-row {
    gap: 6px;
  }
}

@media screen and (max-width: 375px) {
  .trip-form {
    gap: 6px;
  }

  .form-row {
    gap: 6px;
  }

  .budget-row {
    gap: 4px;
  }

  .days-row {
    gap: 8px;
  }
}
</style>