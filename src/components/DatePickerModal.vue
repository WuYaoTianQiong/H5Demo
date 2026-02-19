<template>
  <n-modal
    :show="show"
    title="选择出行日期"
    preset="card"
    class="trip-modal"
    :style="{ width: isMobile ? '96%' : '400px', maxWidth: '90vw', borderRadius: '16px' }"
    :header-style="{ background: 'linear-gradient(135deg, #ff6b6b, #ff8e53)', padding: isMobile ? '12px 16px' : '14px 20px', borderRadius: '16px 16px 0 0' }"
    :content-style="{ padding: isMobile ? '16px' : '20px', background: '#fafafa', borderRadius: '0 0 16px 16px' }"
    :footer-style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '12px 16px' : '16px 20px', background: '#ffffff', borderTop: '1px solid #f0f0f0', gap: '12px', borderRadius: '0 0 16px 16px' }"
    @update:show="$emit('update:show', $event)"
  >
    <div class="date-picker-content">
      <div class="date-picker-hint">
        <n-icon :component="InfoCircleOutlined" />
        <span>请选择行程的开始和结束日期</span>
      </div>
      <div class="date-inputs-row">
        <div class="date-input-item">
          <label class="date-input-label">开始日期</label>
          <n-date-picker
            :value="startDate"
            type="date"
            clearable
            placeholder="选择开始日期"
            class="single-date-picker"
            :is-date-disabled="disablePreviousDate"
            @update:value="$emit('update:startDate', $event)"
          />
        </div>
        <div class="date-separator">
          <n-icon :component="ArrowRightOutlined" />
        </div>
        <div class="date-input-item">
          <label class="date-input-label">结束日期</label>
          <n-date-picker
            :value="endDate"
            type="date"
            clearable
            placeholder="选择结束日期"
            class="single-date-picker"
            :is-date-disabled="disableEndDate"
            @update:value="$emit('update:endDate', $event)"
          />
        </div>
      </div>
    </div>
    <template #footer>
      <div class="modal-footer">
        <n-button class="btn-secondary" @click="$emit('update:show', false)">
          <template #icon>
            <n-icon :component="CloseOutlined" />
          </template>
          取消
        </n-button>
        <n-button type="primary" class="btn-primary" @click="$emit('confirm')">
          <template #icon>
            <n-icon :component="CheckOutlined" />
          </template>
          确定
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { NModal, NDatePicker, NButton, NIcon } from 'naive-ui'
import { InfoCircleOutlined, ArrowRightOutlined, CheckOutlined, CloseOutlined } from '@vicons/antd'
import { useDevice } from '@/composables/useDevice'
import { isDateBeforeToday, isDateBefore } from '@/utils/date'

const props = defineProps<{
  show: boolean
  startDate: number | null
  endDate: number | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  'update:startDate': [value: number | null]
  'update:endDate': [value: number | null]
  confirm: []
}>()

const { isMobile } = useDevice()

function disablePreviousDate(ts: number) {
  return isDateBeforeToday(ts)
}

function disableEndDate(ts: number) {
  if (!props.startDate) return isDateBeforeToday(ts)
  return isDateBefore(ts, props.startDate)
}
</script>

<style scoped lang="scss">
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

.date-picker-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.date-picker-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #f0f0f0;
  border-radius: 12px;
  color: #666;
  font-size: 13px;
}

.date-picker-hint .n-icon {
  color: #ff6b6b;
  font-size: 16px;
}

.date-inputs-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.date-input-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.date-input-label {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.date-separator {
  padding-bottom: 10px;
  color: #ff6b6b;
  font-size: 16px;
}

.single-date-picker {
  width: 100%;
}

.single-date-picker :deep(.n-input) {
  border-radius: 50px !important;
}

.single-date-picker :deep(.n-input__wrapper) {
  border-radius: 50px !important;
  border: 1.5px solid #e8e8e8 !important;
  background: #ffffff !important;
  transition: all 0.3s ease;
}

.single-date-picker :deep(.n-input__wrapper:hover) {
  border-color: #ffb8a8;
  box-shadow: 0 2px 12px rgba(255, 107, 107, 0.08);
}

.single-date-picker :deep(.n-input__wrapper--focused) {
  border-color: #ff6b6b;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

@media screen and (max-width: 768px) {
  .trip-modal :deep(.n-card) {
    border-radius: 20px 20px 0 0;
    margin-top: auto;
    margin-bottom: 0;
    width: 100%;
    max-width: 100%;
  }

  .date-picker-content {
    gap: 10px;
  }

  .date-picker-hint {
    padding: 8px 10px;
    font-size: 12px;
  }

  .date-inputs-row {
    flex-direction: column;
    gap: 10px;
  }

  .date-separator {
    display: none;
  }

  .date-input-label {
    font-size: 12px;
  }
}
</style>
