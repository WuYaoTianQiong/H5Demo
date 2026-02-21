<template>
  <div
    class="card-schedule"
    :class="[cardTypeClass, { 'is-active': isActive, 'is-completed': isCompleted }]"
    @click="handleCardClick"
  >
    <div class="time-header" :data-title="title">
      <div class="time" :data-has-weather="!!weatherText">
        <span class="time-label">{{ timeText }}</span>
        <span v-if="weatherText" class="weather">{{ weatherText }}</span>
      </div>
      <div
        v-if="durationText || statusText || tagItems.length"
        class="time-tags"
        :data-duration="durationText"
        :data-status="statusText"
        :data-tags-count="tagItems.length"
      >
        <span v-if="durationText" class="duration">{{ durationText }}</span>
        <n-tag v-if="statusText" size="small" type="info">{{ statusText }}</n-tag>
        <n-tag
          v-for="(tag, index) in tagItems"
          :key="index"
          :color="{ textColor: tag.color, borderColor: tag.bgColor }"
          size="small"
          class="tag-item"
        >
          {{ tag.text }}
        </n-tag>
      </div>
    </div>

    <div class="card-content">
      <div v-if="hasTabs" class="tab-list">
        <n-tag
          v-for="(tab, index) in normalizedTabs"
          :key="tab.key"
          :type="index === activeTabIndex ? 'primary' : 'default'"
          size="small"
          class="tab-item"
          @click.stop="handleTabClick(index)"
        >
          {{ tab.title }}
        </n-tag>
      </div>
      <div class="title">{{ title }}</div>
      <div v-if="description" class="desc">{{ description }}</div>
    </div>

    <div
      class="check-button"
      :class="{ completed: isCompleted, loading: savingCompleteIds.has(props.id) }"
      @click.stop="toggleComplete"
    >
      <n-spin v-if="savingCompleteIds.has(props.id)" size="small" :stroke-width="12" />
      <span v-else-if="isCompleted" class="check-icon">✓</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { NTag, NSpin } from 'naive-ui'

const savingCompleteIds = ref(new Set())

const props = defineProps({
  id: { type: String, default: '' },
  type: {
    type: String,
    default: 'scenic',
    validator: (value) => ['scenic', 'food', 'hotel', 'transport', 'activity', 'shopping', 'other'].includes(value)
  },
  time: { type: String, default: '' },
  duration: { type: String, default: '' },
  weather: { type: String, default: '' },
  status: { type: String, default: '' },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  tags: { type: Array, default: () => [] },
  tabs: { type: Array, default: () => [] },
  activeTabIndex: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
  active: { type: Boolean, default: false }
})

const emit = defineEmits(['click', 'toggle-complete', 'tab-change'])

const cardTypeClass = computed(() => `type-${props.type || 'scenic'}`)

const tagItems = computed(() => {
  const source = Array.isArray(props.tags) ? props.tags : []
  return source.map(tag => {
    const tagText = String(tag || '')
    const tagLower = tagText.toLowerCase()
    let bgColor = '#f0f2f5'
    let color = '#636e72'
    if (tagLower.includes('餐') || tagLower.includes('食') || tagLower.includes('美食')) {
      bgColor = '#fff5e6'
      color = '#ff9f43'
    } else if (tagLower.includes('警') || tagLower.includes('注意') || tagLower.includes('重要')) {
      bgColor = '#ffebee'
      color = '#ff5252'
    } else if (tagLower.includes('推荐') || tagLower.includes('必去')) {
      bgColor = '#e8f5e9'
      color = '#4caf50'
    } else if (tagLower.includes('交通') || tagLower.includes('出行')) {
      bgColor = '#e3f2fd'
      color = '#2196f3'
    } else if (tagLower.includes('价格') || tagLower.includes('预算')) {
      bgColor = '#fff8e1'
      color = '#ffc107'
    }
    return { text: tagText, bgColor, color }
  })
})

const isActive = computed(() => props.active)
const isCompleted = computed(() => props.completed)
const timeText = computed(() => props.time || '')
const weatherText = computed(() => props.weather || '')
const durationText = computed(() => props.duration || '')
const statusText = computed(() => props.status || '')
const hasTabs = computed(() => Array.isArray(props.tabs) && props.tabs.length > 0)

const normalizedTabs = computed(() => {
  const source = Array.isArray(props.tabs) ? props.tabs : []
  return source.map((tab, index) => {
    const title = String(tab?.title || tab?.name || tab?.label || '').trim()
    return {
      key: String(tab?.id || tab?.uid || tab?.name || tab?.title || index),
      title: title || `选项${index + 1}`
    }
  })
})

const handleCardClick = () => {
  emit('click', { id: props.id, type: props.type, title: props.title })
}

const toggleComplete = async () => {
  if (savingCompleteIds.value.has(props.id)) return
  savingCompleteIds.value.add(props.id)
  try {
    await emit('toggle-complete', { id: props.id, completed: !isCompleted.value })
  } finally {
    savingCompleteIds.value.delete(props.id)
  }
}

const handleTabClick = (index) => {
  emit('tab-change', { id: props.id, index })
}
</script>

<style scoped>
.card-schedule {
  background: var(--bg-primary);
  border-radius: var(--card-radius);
  padding: 18px;
  position: relative;
  box-shadow: var(--card-shadow);
  border: 1px solid rgba(0, 0, 0, 0.02);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: pointer;
}

.card-schedule + .card-schedule {
  margin-top: 22px;
}

.card-schedule::before {
  content: "";
  position: absolute;
  left: -10px;
  top: -7px;
  width: 14px;
  height: 14px;
  background: var(--bg-tertiary);
  border: 3px solid #b2bec3;
  border-radius: 50%;
  z-index: 1;
  transition: all var(--transition-base);
}

.card-schedule.is-active {
  position: relative;
  z-index: 2;
}

.card-schedule.is-active::before {
  width: 16px;
  height: 16px;
  left: -11px;
  top: -7px;
}

.card-schedule.is-completed {
  opacity: 0.6;
  background: var(--bg-input);
}

.card-schedule.type-scenic { border-left: 4px solid var(--primary-color); }
.card-schedule.type-food { border-left: 4px solid #4d96ff; }
.card-schedule.type-hotel { border-left: 4px solid #ffd93d; }
.card-schedule.type-transport { border-left: 4px solid #4d96ff; }
.card-schedule.type-activity { border-left: 4px solid #eb2f96; }
.card-schedule.type-shopping { border-left: 4px solid #fa541c; }
.card-schedule.type-other { border-left: 4px solid var(--archive-color); }

.card-schedule.type-scenic.is-active {
  box-shadow: 0 0 0 4px rgba(255, 107, 107, 0.1), 0 10px 30px rgba(255, 107, 107, 0.25);
}
.card-schedule.type-scenic.is-active::before {
  border-color: var(--primary-color);
  background-color: var(--primary-color);
  box-shadow: inset 0 0 0 3px white;
}

.card-schedule.type-food.is-active,
.card-schedule.type-transport.is-active {
  box-shadow: 0 0 0 4px rgba(77, 150, 255, 0.1), 0 10px 30px rgba(77, 150, 255, 0.25);
}
.card-schedule.type-food.is-active::before,
.card-schedule.type-transport.is-active::before {
  border-color: #4d96ff;
  background-color: #4d96ff;
  box-shadow: inset 0 0 0 3px white;
}

.card-schedule.type-hotel.is-active {
  box-shadow: 0 0 0 4px rgba(255, 217, 61, 0.1), 0 10px 30px rgba(255, 217, 61, 0.25);
}
.card-schedule.type-hotel.is-active::before {
  border-color: #ffd93d;
  background-color: #ffd93d;
  box-shadow: inset 0 0 0 3px white;
}

.card-schedule.type-activity.is-active {
  box-shadow: 0 0 0 4px rgba(235, 47, 150, 0.1), 0 10px 30px rgba(235, 47, 150, 0.25);
}
.card-schedule.type-activity.is-active::before {
  border-color: #eb2f96;
  background-color: #eb2f96;
  box-shadow: inset 0 0 0 3px white;
}

.card-schedule.type-shopping.is-active {
  box-shadow: 0 0 0 4px rgba(250, 84, 28, 0.1), 0 10px 30px rgba(250, 84, 28, 0.25);
}
.card-schedule.type-shopping.is-active::before {
  border-color: #fa541c;
  background-color: #fa541c;
  box-shadow: inset 0 0 0 3px white;
}

.card-schedule.type-other.is-active {
  box-shadow: 0 0 0 4px rgba(140, 140, 140, 0.1), 0 10px 30px rgba(140, 140, 140, 0.25);
}
.card-schedule.type-other.is-active::before {
  border-color: var(--archive-color);
  background-color: var(--archive-color);
  box-shadow: inset 0 0 0 3px white;
}

.time-header {
  margin-bottom: 12px;
}

.time {
  font-size: 15px;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
}

.time-label {
  flex-shrink: 0;
}

.weather {
  font-weight: normal;
  font-size: 13px;
  color: #4d96ff;
}

.time-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.duration {
  font-weight: normal;
  font-size: 12px;
  color: var(--text-tertiary);
  background: #f0f2f5;
  padding: 3px 8px;
  border-radius: 6px;
  flex-shrink: 0;
}

.card-content {
  padding-right: 24px;
}

.title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.card-schedule.is-completed .title {
  color: #b2bec3;
  text-decoration: line-through;
}

.desc {
  font-size: 14px;
  color: #636e72;
  line-height: 1.6;
  margin-bottom: 12px;
}

.card-schedule.is-completed .desc,
.card-schedule.is-completed .time-label {
  color: #b2bec3;
}

.time-tags .tag-item {
  margin: 0;
}

.tab-list {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.tab-item {
  cursor: pointer;
}

.check-button {
  position: absolute;
  right: -12px;
  top: -8px;
  width: 20px;
  height: 20px;
  background: #f0f2f5;
  border: 3px solid #b2bec3;
  border-radius: 50%;
  cursor: pointer;
  transition: all var(--transition-base);
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-button:active {
  transform: scale(0.9);
}

.check-button.completed {
  background: #b2bec3;
  border-color: #b2bec3;
}

.check-button.loading {
  background: #f0f2f5;
  border-color: var(--primary-color);
  cursor: not-allowed;
}

.check-button.loading :deep(.n-spin) {
  width: 16px;
  height: 16px;
}

.check-button.loading :deep(.n-spin .n-base-loading__icon) {
  color: var(--primary-color);
}

.check-icon {
  color: white;
  font-size: 14px;
  font-weight: bold;
}
</style>
