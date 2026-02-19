<template>
  <div class="trip-day-tabs">
    <n-scrollbar ref="scrollbarRef" x-scrollable>
      <div class="tabs-inner" :style="{ width: innerWidth }">
        <div
          v-for="(day, index) in days"
          :key="day.id || index"
          :id="'nav-tab-' + index"
          class="day-tab"
          :class="{ active: activeDayIndex === index }"
          @click="handleSwitchDay(index)"
        >
          <span class="day-name">第{{ day.dayNumber || index + 1 }}天({{ formatDate(day.date) }})</span>
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { NScrollbar } from 'naive-ui'

const props = defineProps({
  days: {
    type: Array,
    default: () => []
  },
  activeDayIndex: {
    type: Number,
    default: 0
  },
  dayProgressPercent: {
    type: Number,
    default: 0
  },
  tripId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['switch-day'])

const scrollbarRef = ref(null)

const innerWidth = computed(() => {
  const count = props.days.length || 1
  return `${count * 100}px`
})

const formatDate = (date) => {
  if (!date) return '待定'
  if (typeof date === 'string') {
    const parts = date.split('-')
    if (parts.length === 3) {
      const month = parseInt(parts[1], 10)
      const day = parseInt(parts[2], 10)
      if (!isNaN(month) && !isNaN(day)) return `${month}/${day}`
    }
  }
  return date
}

const handleSwitchDay = (index) => {
  emit('switch-day', index)
}

// 滚动到指定 tab
const scrollToTab = (index, behavior = 'smooth') => {
  nextTick(() => {
    // 通过 DOM 查询获取 n-scrollbar 的滚动容器
    // n-scrollbar 组件结构: .n-scrollbar > .n-scrollbar-container
    const scrollbar = document.querySelector('.trip-day-tabs .n-scrollbar-container')
    const el = document.getElementById('nav-tab-' + index)
    
    if (scrollbar && el) {
      // 计算目标滚动位置：让选中的 tab 居中显示
      const scrollbarWidth = scrollbar.clientWidth
      const elLeft = el.offsetLeft
      const elWidth = el.offsetWidth
      const targetScrollLeft = elLeft - (scrollbarWidth / 2) + (elWidth / 2)
      
      // 确保不滚动到负数位置
      const finalScrollLeft = Math.max(0, targetScrollLeft)
      
      if (behavior === 'smooth') {
        scrollbar.scrollTo({ left: finalScrollLeft, behavior: 'smooth' })
      } else {
        scrollbar.scrollLeft = finalScrollLeft
      }
    }
  })
}

// 监听 activeDayIndex 变化
watch(() => props.activeDayIndex, () => {
  scrollToTab(props.activeDayIndex)
})

// 页面加载时滚动到当前选中的 tab
onMounted(() => {
  // 延迟执行，确保父组件数据已加载
  setTimeout(() => {
    // 使用 auto 行为，避免页面加载时的动画
    scrollToTab(props.activeDayIndex, 'auto')
  }, 200)
})
</script>

<style scoped>
.trip-day-tabs {
  background: #fff;
  padding: 12px 16px 0;
  margin: 0 auto 16px;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  position: relative;
  width: 96%;
  max-width: 96%;
  box-sizing: border-box;
  overflow: hidden;
}

.tabs-inner {
  display: flex;
  gap: 8px;
  padding-bottom: 12px;
}

.day-tab {
  flex-shrink: 0;
  padding: 10px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.3s ease;
  position: relative;
  min-width: 80px;
}

.day-tab:hover {
  background: #f8fafc;
}

.day-tab.active {
  background: linear-gradient(135deg, #fff5f0, #ffe8df);
}

.day-name {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.day-tab.active .day-name {
  color: #ff6b6b;
}

.day-date {
  font-size: 12px;
  color: #94a3b8;
}

.day-tab.active .day-date {
  color: #ff9f43;
}

:deep(.n-scrollbar-container) {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

:deep(.n-scrollbar-container::-webkit-scrollbar) {
  display: none;
}
</style>
