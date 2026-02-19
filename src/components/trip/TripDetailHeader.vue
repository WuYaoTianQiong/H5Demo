<template>
  <div class="trip-detail-header">
    <div class="header-inner">
      <div class="header-left-section">
        <n-button class="back-btn" circle @click="handleBack">
          <template #icon>
            <n-icon><ArrowLeftOutlined /></n-icon>
          </template>
        </n-button>
      </div>
      <div class="header-center">
        <div class="title-row">
          <span class="trip-title">{{ title }}</span>
          <n-tag v-if="year" size="small" :bordered="false" class="year-tag">
            {{ year }}
          </n-tag>
        </div>
        <div v-if="dateRange" class="date-range">
          <n-icon :component="CalendarOutlined" size="14" />
          <span>{{ dateRange }}</span>
        </div>
      </div>
      <div class="header-right-section">
        <n-button v-if="isLoggedIn && isOwner" class="edit-btn" @click="handleEdit">
          <template #icon>
            <n-icon :component="EditOutlined" size="18" />
          </template>
        </n-button>
      </div>
    </div>
    <div v-if="days || budget || locations" class="header-meta-bar">
      <div class="meta-inner">
        <div v-if="days" class="meta-item">
          <n-icon :component="ClockCircleOutlined" size="14" />
          <span>{{ days }}天</span>
        </div>
        <div v-if="budget" class="meta-item">
          <n-icon :component="MoneyCollectOutlined" size="14" />
          <span>{{ budget }}</span>
        </div>
        <div v-if="locations" class="meta-item">
          <n-icon :component="EnvironmentOutlined" size="14" />
          <span>{{ locations }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { NIcon, NTag, NButton } from 'naive-ui'
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  MoneyCollectOutlined,
  EnvironmentOutlined,
  EditOutlined
} from '@vicons/antd'

const props = defineProps({
  title: {
    type: String,
    default: '行程详情'
  },
  year: {
    type: String,
    default: ''
  },
  dateRange: {
    type: String,
    default: ''
  },
  days: {
    type: [Number, String],
    default: 0
  },
  budget: {
    type: String,
    default: ''
  },
  locations: {
    type: String,
    default: ''
  },
  isLoggedIn: {
    type: Boolean,
    default: false
  },
  isOwner: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['back', 'edit'])

const handleBack = () => {
  emit('back')
}

const handleEdit = () => {
  emit('edit')
}
</script>

<style scoped>
.trip-detail-header {
  background: linear-gradient(135deg, var(--u-type-primary), var(--u-type-warning));
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;
  box-shadow: 0 6px 16px rgba(255, 107, 107, 0.25);
  position: relative;
  overflow: hidden;
  margin-bottom: 16px;
}

.trip-detail-header::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255, 0.1) 0%, transparent 70%);
  pointer-events: none;
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  position: relative;
  padding: 20px max(var(--tg-spacing-screen), 16px);
  min-height: 56px;
}

.header-left-section {
  display: flex;
  align-items: center;
  z-index: 1;
  flex: 1;
  margin-left: 8px;
}

.header-center {
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 1;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.header-right-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  z-index: 1;
  margin-right: 8px;
}

.back-btn {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 24px;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

.edit-btn {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  padding: 0;
}

.edit-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.trip-title {
  font-size: var(--tg-font-size-h1);
  font-weight: 800;
  color: #ffffff;
  line-height: 1.2;
  letter-spacing: 0.5px;
  text-align: center;
  white-space: nowrap;
}

.year-tag {
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
}

.header-meta-bar {
  position: relative;
  padding: 8px max(var(--tg-spacing-screen), 16px) 12px;
}

.meta-inner {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  padding-bottom: 8px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.95);
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 10px;
  border-radius: 12px;
}
</style>
