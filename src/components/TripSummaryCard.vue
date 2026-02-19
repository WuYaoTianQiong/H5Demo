<template>
  <div class="trip-card" @click="handleCardClick">
    <div class="trip-card-inner">
      <div class="trip-header">
        <div class="trip-title-row">
          <div class="trip-title">{{ trip.title }}</div>
          <n-tag
            :type="getTripStatusType(trip.status)"
            size="small"
            round
          >
            {{ getTripStatusLabel(trip.status) }}
          </n-tag>
        </div>
        <div class="trip-actions" v-if="isLoggedIn">
          <n-button
            circle
            size="small"
            type="primary"
            @click.stop="handleEditButtonClick"
          >
            <template #icon>
              <n-icon><EditOutlined /></n-icon>
            </template>
          </n-button>
          <n-button
            circle
            size="small"
            type="error"
            @click.stop="handleDeleteButtonClick"
          >
            <template #icon>
              <n-icon><DeleteOutlined /></n-icon>
            </template>
          </n-button>
        </div>
      </div>

      <div v-if="trip.description" class="trip-subtitle">
        <n-ellipsis :line-clamp="2" :tooltip="false">
          {{ trip.description }}
        </n-ellipsis>
      </div>

      <div class="trip-info">
        <span v-if="trip.year" class="trip-year-tag">{{ trip.year }}</span>
        <div
          v-if="trip.startDate && trip.endDate"
          class="trip-info-item"
        >
          <n-icon :component="CalendarOutlined" class="trip-icon" />
          <span class="trip-date-text">{{ formatTripDateRange(trip.startDate, trip.endDate) }}</span>
        </div>
        <div v-if="trip.days" class="trip-info-item">
          <n-icon :component="ClockCircleOutlined" class="trip-icon" />
          <span class="trip-info-text">{{ trip.days }}天{{ trip.days > 1 ? ` ${trip.days - 1}夜` : '' }}</span>
        </div>
        <div v-if="trip.budgetPerPersonMin || trip.budgetPerPersonMax" class="trip-info-item trip-budget-item">
          <n-icon :component="MoneyCollectOutlined" class="trip-icon" />
          <span class="trip-info-text trip-budget-text"
            >{{ trip.budgetPerPersonMin || '?' }}{{ trip.budgetUnit || '元' }}{{ trip.budgetPerPersonMax ? ` - ${trip.budgetPerPersonMax}${trip.budgetUnit || '元'}` : '起' }}</span
          >
        </div>
      </div>

      <div v-if="trip.completed !== undefined" class="trip-progress">
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" :style="{ width: trip.completed + '%' }"></div>
        </div>
        <span class="trip-progress-text">{{ trip.completed }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { NTag, NButton, NIcon, NEllipsis } from 'naive-ui'
import {
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  MoneyCollectOutlined
} from '@vicons/antd'

const STATUS_LABELS = {
  draft: "草稿",
  published: "已发布",
  archived: "已归档",
}

const STATUS_TYPES = {
  draft: "default",
  published: "warning",
  archived: "info",
}

const props = defineProps({
  trip: {
    type: Object,
    required: true
  },
  isLoggedIn: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click', 'edit', 'delete'])

const getTripStatusLabel = (status) => {
  return STATUS_LABELS[status] || status || "未知"
}

const getTripStatusType = (status) => {
  return STATUS_TYPES[status] || "default"
}

const formatTripDateRange = (startDate, endDate) => {
  const format = (date) => {
    if (!date) return ''
    const parts = date.split('-')
    if (parts.length >= 3) {
      return `${parts[1]}-${parts[2]}`
    }
    return date
  }
  return `${format(startDate)} - ${format(endDate)}`
}

const handleCardClick = () => {
  emit('click', props.trip.id)
}

const handleEditButtonClick = () => {
  emit('edit', props.trip)
}

const handleDeleteButtonClick = () => {
  emit('delete', props.trip)
}
</script>

<style scoped>
.trip-card {
  background: var(--u-bg-white);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(0, 0, 0, 0.03);
  cursor: pointer;
  width: 100%;
  box-sizing: border-box;
}

.trip-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.12);
}

.trip-card:active {
  transform: translateY(-2px) scale(0.98);
}

.trip-card-inner {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.trip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.trip-title-row {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.trip-title {
  font-size: var(--tg-font-size-h2);
  font-weight: 700;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}

.trip-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.trip-subtitle {
  font-size: var(--tg-font-size-base);
  color: var(--u-content-color);
  line-height: 1.5;
}

.trip-info {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  padding: 8px 0;
}

.trip-info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: #fef3f2;
  border-radius: 8px;
  font-size: var(--tg-font-size-base);
}

.trip-year-tag {
  font-size: 12px;
  color: #ffffff;
  background: linear-gradient(135deg, var(--u-type-primary), var(--u-type-warning));
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 700;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
}

.trip-icon {
  color: #ef4444;
  font-size: 14px;
}

.trip-date-text {
  font-size: var(--tg-font-size-base);
  color: #ef4444;
  font-weight: 500;
}

.trip-info-text {
  font-size: var(--tg-font-size-base);
  color: #ef4444;
  font-weight: 500;
}

.trip-budget-item {
  background: #fef3f2;
}

.trip-budget-text {
  color: #ef4444;
  font-weight: 600;
}

.trip-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 6px;
}

.progress-bar-bg {
  flex: 1;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--u-type-warning), #ffaa77);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.trip-progress-text {
  font-size: var(--tg-font-size-base);
  color: var(--u-type-warning);
  min-width: 40px;
  text-align: right;
  font-weight: 600;
}
</style>
