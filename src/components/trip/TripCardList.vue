<template>
  <div class="trip-card-list">
    <!-- 全局 loading 遮罩 -->
    <div v-if="isSorting || isProcessing || savingCompleteIds.size > 0" class="global-overlay">
      <n-spin size="medium" />
      <span class="global-text">{{ isSorting ? '保存排序中...' : (isProcessing ? processingText : '保存中...') }}</span>
    </div>

    <!-- 加载中骨架屏 -->
    <div v-if="loading" class="skeleton-container">
      <div class="skeleton-progress">
        <div class="skeleton-progress-label"></div>
        <div class="skeleton-progress-bar"></div>
        <div class="skeleton-progress-count"></div>
      </div>
      <div v-for="i in 3" :key="i" class="skeleton-card">
        <div class="skeleton-time-row">
          <div class="skeleton-time"></div>
          <div class="skeleton-weather"></div>
        </div>
        <div class="skeleton-title"></div>
        <div class="skeleton-desc"></div>
      </div>
    </div>

    <div v-else-if="currentDayHasCards" class="cards-container">
      <div class="progress-header">
        <div class="progress-row">
          <span class="progress-label">完成进度</span>
          <n-progress
            type="line"
            :percentage="progressPercent"
            :height="6"
            :border-radius="3"
            :color="'linear-gradient(90deg, #ff9f43, #ff6b6b)'"
            :rail-color="'#f1f5f9'"
            :show-indicator="false"
            class="inline-progress"
          />
          <span class="progress-count">{{ completedCount }}/{{ totalCount }}</span>
        </div>
      </div>

      <div class="cards-list" ref="cardsListRef">
        <!-- DEBUG: 卡片总数 {{ currentDayCards.length }} -->
        <div
          v-for="(card, index) in currentDayCards"
          :key="card.id || card.uid || index"
          class="card-wrapper"
          :data-card-id="card.id"
        >
          <!-- DEBUG: 卡片 {{ index }} - id: {{ card.id }}, uid: {{ card.uid }}, cost: {{ card.cost }}, currency: {{ card.costCurrency }}, isMulti: {{ card.isMulti }} -->
          <div
            v-if="index > 0"
            class="card-divider"
            :class="{ 'has-distance': getCardDistance(index) > 0 }"
          >
            <div v-if="getCardDistance(index) > 0" class="distance-badge">
              <span class="distance-text">🚗 {{ getCardDistance(index).toFixed(2) }}km ▼</span>
            </div>
            <div
              v-if="isLoggedIn"
              class="add-card-btn-inline"
              @click.stop="handleAddEventAtIndex(index)"
            >
              <span class="add-card-icon">+</span>
            </div>
          </div>

          <!-- DEBUG: 卡片 {{ index }} - {{ card.title }} - tags: {{ card.tags?.length }} -->
          <div
            class="event-card"
            :class="getCardClasses(card)"
            :style="getCardStyle(card)"
            :data-card-title="card.title"
            :data-card-index="index"
            @click="handleCardClick(card)"
            @touchstart="handleTouchStart($event, card)"
            @touchmove="handleTouchMove($event, card)"
            @touchend="handleTouchEnd($event, card)"
            @mousedown="handleMouseDown($event, card)"
            @mousemove="handleMouseMove($event, card)"
            @mouseup="handleMouseUp($event, card)"
            @mouseleave="handleMouseLeave($event, card)"
          >
            <div v-if="card.mergeSelectable || (mergeState.sourceCard && mergeState.sourceCard.id === card.id)" class="merge-indicator">
              <div class="merge-checkbox" :class="{ checked: card.mergeSelected, source: mergeState.sourceCard && mergeState.sourceCard.id === card.id }">
                <span v-if="card.mergeSelected" class="merge-check-icon">✓</span>
                <span v-else-if="mergeState.sourceCard && mergeState.sourceCard.id === card.id" class="merge-source-text">源</span>
              </div>
            </div>

            <div
              v-if="isLoggedIn"
              class="card-actions-container"
              :class="{ visible: card.slided }"
            >
              <div class="card-action-btn edit-btn" @click.stop="handleEdit(card)">
                <span class="card-action-text">编辑</span>
              </div>
              <div v-if="!card.isMulti" class="card-action-btn merge-btn" @click.stop="handleStartMerge(card)">
                <span class="card-action-text">合并</span>
              </div>
              <div v-if="card.isMulti" class="card-action-btn split-btn" @click.stop="handleSplit(card)">
                <span class="card-action-text">拆分</span>
              </div>
              <div class="card-action-btn state-btn" :class="{ inactive: card.disabled }" @click.stop="handleToggleStatus(card)">
                <span class="card-action-text">{{ card.disabled ? '启用' : '停用' }}</span>
              </div>
              <div class="card-action-btn delete-btn" @click.stop="handleDelete(card)">
                <span class="card-action-text">删除</span>
              </div>
            </div>

            <div
              v-if="showTimeRow(card)"
              class="time-row"
              :data-title="card.title"
              :data-tags-count="card.tags?.length || 0"
              :data-is-multi="card.isMulti"
            >
              <div class="time-main" :class="{ 'has-cost': !!card.cost || (card.isMulti && !!getActiveOption(card)?.cost) }">
                <div class="time-left">
                  <!-- 时间显示：单选卡显示卡片时间，多选卡显示当前子选项时间 -->
                  <span v-if="!card.isMulti && card.time" class="time-label">{{ card.time }}</span>
                  <span v-if="card.isMulti && getActiveOption(card)?.time" class="time-label">{{ getActiveOption(card).time }}</span>
                  <span v-if="card.weather" class="weather-badge">
                    {{ getWeatherEmoji(card.weather) }} {{ getWeatherTemp(card.weather) }}
                  </span>
                </div>
                <div class="time-middle">
                  <!-- 标签显示：单选卡显示卡片标签，多选卡显示当前子选项标签 -->
                  <span v-if="!card.isMulti && card.tags && card.tags.length > 0" class="tags-container">
                    <span v-for="(tag, tagIndex) in card.tags" :key="tagIndex" class="tag">{{ typeof tag === 'string' ? tag : tag.text }}</span>
                  </span>
                  <span v-if="card.isMulti && getActiveOption(card)?.tags && getActiveOption(card).tags.length > 0" class="tags-container">
                    <span v-for="(tag, tagIndex) in getActiveOption(card).tags" :key="tagIndex" class="tag">{{ typeof tag === 'string' ? tag : tag.text }}</span>
                  </span>
                </div>
              </div>
              <div class="time-right">
                <!-- 金额显示：单选卡显示卡片金额，多选卡显示当前子选项金额 -->
                <span v-if="!card.isMulti && card.cost" class="cost-badge">
                  {{ getCurrencySymbol(card.costCurrency) }}{{ formatCost(card.cost) }}
                </span>
                <span v-if="card.isMulti && getActiveOption(card)?.cost" class="cost-badge">
                  {{ getCurrencySymbol(getActiveOption(card).costCurrency) }}{{ formatCost(getActiveOption(card).cost) }}
                </span>
              </div>
            </div>

            <div v-if="!card.isMulti" class="title">
              {{ card.title }}
            </div>

            <div
              v-if="card.isMulti && card.options && card.options.length > 0"
              class="tab-buttons-wrapper"
            >
              <div class="tab-buttons" :class="{ 'has-scrollbar': card.options.length > 1 }">
                <div
                  v-for="(option, optIndex) in getSortedOptions(card.options)"
                  :key="option.id || option.uid || `opt-${optIndex}`"
                  class="tab-btn"
                  :class="{
                    active: card.activeOptionIndex === optIndex,
                    'tab-completed': option.completed || option.state === 'completed',
                    'tab-inactive': option.state === 'inactive' || option.disabled,
                  }"
                  @click.stop="switchOption(card, optIndex)"
                >
                  <span v-if="isLoggedIn" class="tab-check" :class="{ checked: option.completed || option.state === 'completed' }" @click.stop="toggleOptionComplete(card, optIndex)">
                    <span v-if="option.completed || option.state === 'completed'" class="tab-check-icon">✓</span>
                  </span>
                  <span class="tab-name">{{ option.name || option.title || `选项${optIndex + 1}` }}</span>
                </div>
              </div>
              <!-- 灰色指示器 - 显示当前选中位置 -->
              <div v-if="card.options.length > 1" class="tab-indicator-bar">
                <div
                  v-for="(option, index) in getSortedOptions(card.options)"
                  :key="`indicator-${index}`"
                  class="tab-indicator-segment"
                  :class="{ active: card.activeOptionIndex === index }"
                ></div>
              </div>
            </div>

            <div v-if="card.isMulti && card.options && card.options.length > 0" class="tab-contents">
              <div
                v-for="(option, optIndex) in getSortedOptions(card.options)"
                :key="option.id || option.uid || `content-${optIndex}`"
                class="tab-content"
                :class="{
                  active: card.activeOptionIndex === optIndex,
                  'tab-content-inactive': option.state === 'inactive' || option.disabled,
                }"
              >
                <div v-if="option.description" class="desc">{{ option.description }}</div>
                <div v-if="option.detail && card.expanded" class="desc">{{ option.detail }}</div>
                <div v-if="option.detail || option.location" class="action-row">
                  <div class="action-row-left">
                    <div v-if="option.detail" class="expand-hint" :class="{ expanded: card.expanded }" @click.stop="toggleExpand(card)">
                      <span>{{ card.expanded ? '收起详情' : '点击查看详情' }}</span>
                    </div>
                  </div>
                  <div class="action-row-right">
                    <div v-if="option.location" class="action-buttons-container" @click.stop="handleNavigateOption(option)">
                      <span class="action-btn-nav">📍 {{ option.location.name || option.name || '导航' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="!card.isMulti && card.description" class="desc">{{ card.description }}</div>
            <div v-if="!card.isMulti && card.expanded && card.detailDescription" class="desc">{{ card.detailDescription }}</div>

            <div v-if="!card.isMulti && (hasExpandContent(card) || hasNavigateButton(card))" class="action-row">
              <div class="action-row-left">
                <div v-if="hasExpandContent(card)" class="expand-hint" :class="{ expanded: card.expanded }" @click.stop="toggleExpand(card)">
                  <span>{{ card.expanded ? '收起详情' : '点击查看详情' }}</span>
                </div>
              </div>
              <div class="action-row-right">
                <div v-if="hasNavigateButton(card)" class="action-buttons-container" @click.stop="handleNavigate(card)">
                  <span class="action-btn-nav">📍 {{ getNavigateTarget(card) }}</span>
                </div>
              </div>
            </div>

            <div v-if="isLoggedIn" class="check-button" :class="{ completed: card.completed }" @click.stop="toggleComplete(card)">
              <span v-if="card.completed" class="check-icon">✓</span>
            </div>

            <div v-if="isLoggedIn" class="swipe-hint" :class="{ slided: card.slided }" @click.stop="toggleSlide(card)">
              <span class="swipe-hint-icon">{{ card.slided ? '‹' : '‹' }}</span>
            </div>
          </div>
        </div>

        <div v-if="isLoggedIn" class="card-divider last-divider">
          <div class="add-card-btn-inline" @click.stop="handleAddEventAtIndex(currentDayCards.length)">
            <span class="add-card-icon">+</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <n-empty description="暂无日程安排">
        <template #extra>
          <n-button type="primary" size="small" @click="handleAddEvent">
            添加日程
          </n-button>
        </template>
      </n-empty>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { NProgress, NEmpty, NButton, NSpin } from 'naive-ui'
import Sortable from 'sortablejs'

const props = defineProps({
  currentDayHasCards: {
    type: Boolean,
    default: false
  },
  currentDayCards: {
    type: Array,
    default: () => []
  },
  isLoggedIn: {
    type: Boolean,
    default: false
  },
  progressPercent: {
    type: Number,
    default: 0
  },
  completedCount: {
    type: Number,
    default: 0
  },
  totalCount: {
    type: Number,
    default: 0
  },
  distances: {
    type: Array,
    default: () => []
  },
  mergeState: {
    type: Object,
    default: () => ({ isMerging: false, sourceCard: null, selectedCards: [] })
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'card-click',
  'add-event',
  'edit',
  'delete',
  'toggle-status',
  'toggle-complete',
  'switch-option',
  'toggle-option-complete',
  'navigate',
  'navigate-option',
  'start-merge',
  'split',
  'toggle-slide',
  'sort-start',
  'sort-end',
  'sort-change'
])

const cardsListRef = ref(null)

// 记录正在保存完成状态的卡片 ID
const savingCompleteIds = ref(new Set())

// 记录是否正在保存排序
const isSorting = ref(false)

// 记录是否正在执行其他操作（合并、删除等）
const isProcessing = ref(false)
const processingText = ref('处理中...')

let sortableInstance = null

const initSortable = () => {
  if (!cardsListRef.value || !props.isLoggedIn) return
  
  if (sortableInstance) {
    sortableInstance.destroy()
  }
  
  sortableInstance = new Sortable(cardsListRef.value, {
    animation: 200,
    draggable: '.card-wrapper',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    filter: '.card-divider',
    preventOnFilter: true,
    delay: 200,
    delayOnTouchOnly: true,
    touchStartThreshold: 5,
    onChoose: (evt) => {
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    },
    onStart: (evt) => {
      emit('sort-start', { oldIndex: evt.oldIndex })
    },
    onEnd: (evt) => {
      emit('sort-end', {
        oldIndex: evt.oldIndex,
        newIndex: evt.newIndex
      })
      if (evt.oldIndex !== evt.newIndex) {
        emit('sort-change', {
          oldIndex: evt.oldIndex,
          newIndex: evt.newIndex
        })
      }
    }
  })
}

const destroySortable = () => {
  if (sortableInstance) {
    sortableInstance.destroy()
    sortableInstance = null
  }
}

watch(() => props.isLoggedIn, (newVal) => {
  nextTick(() => {
    if (newVal) {
      initSortable()
    } else {
      destroySortable()
    }
  })
})

watch(() => props.currentDayCards.length, () => {
  nextTick(() => {
    if (props.isLoggedIn) {
      initSortable()
    }
  })
})

// 关闭所有滑动状态的卡片
const closeAllSlides = () => {
  const hasSlidedCard = props.currentDayCards.some(card => card.slided)
  if (hasSlidedCard) {
    props.currentDayCards.forEach(card => {
      if (card.slided) {
        card.slided = false
      }
    })
  }
}

// 处理点击外部区域收回卡片
const handleDocumentClick = (e) => {
  // 如果点击的是卡片内部或操作按钮，不处理
  const cardElement = e.target.closest('.event-card')
  const actionButton = e.target.closest('.card-action-btn')
  const swipeHint = e.target.closest('.swipe-hint')
  const checkButton = e.target.closest('.check-button')
  const tabCheck = e.target.closest('.tab-check')

  // 如果点击的是操作按钮、滑动提示、勾选按钮或子选项勾选，不收回
  if (actionButton || swipeHint || checkButton || tabCheck) {
    return
  }

  // 如果点击的是卡片本身，让卡片的点击事件处理
  if (cardElement) {
    return
  }

  // 点击外部，收回所有卡片
  closeAllSlides()
}

onMounted(() => {
  if (props.isLoggedIn) {
    nextTick(() => {
      initSortable()
    })
  }
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  destroySortable()
  // 移除全局点击监听
  document.removeEventListener('click', handleDocumentClick)
})

const getCardClasses = (card) => {
  let cardType = card.type
  if (card.isMulti && card.options && card.options.length > 0) {
    const activeOption = card.options[card.activeOptionIndex || 0]
    cardType = activeOption?.type || card.type
  }
  return {
    'event-completed': card.completed,
    'event-disabled': card.disabled,
    'is-multi': card.isMulti,
    swiping: card.swiping,
    active: card.active,
    slided: card.slided,
    'merge-selectable': card.mergeSelectable,
    'merge-selected': card.mergeSelected,
    'merge-source': props.mergeState.sourceCard && props.mergeState.sourceCard.id === card.id,
    [cardType]: true
  }
}

const getCardStyle = (card) => {
  const style = {}
  if (card.slided) {
    style.transform = 'translateX(-100px)'
  }
  return style
}

const showTimeRow = (card) => {
  const result = !card.isMulti
    ? card.time || (card.tags && card.tags.length > 0)
    : card.options && card.options.length > 0
  return result
}

const getActiveOption = (card) => {
  if (!card.isMulti || !card.options || card.options.length === 0) return null
  const sortedOptions = getSortedOptions(card.options)
  return sortedOptions[card.activeOptionIndex || 0]
}

// 按优先级排序子选项（数字越大优先级越高，排在前面）
const getSortedOptions = (options) => {
  if (!options || options.length === 0) return []
  return [...options].sort((a, b) => (b.priority || 0) - (a.priority || 0))
}

// 计算进度条宽度（显示当前选中位置）
const getTabProgressWidth = (card) => {
  if (!card.isMulti || !card.options || card.options.length === 0) return 0
  const activeIndex = card.activeOptionIndex || 0
  const total = card.options.length
  if (total <= 1) return 100
  // 计算进度条宽度百分比（第一个选项显示约 1/total 的宽度）
  return ((activeIndex + 1) / total) * 100
}

const getWeatherEmoji = (weather) => {
  if (!weather || !weather.raw) return '🌤️'
  const weatherText = weather.raw.weather || ''
  if (weatherText.includes('雨')) return '🌧️'
  if (weatherText.includes('雪')) return '❄️'
  if (weatherText.includes('阴')) return '☁️'
  if (weatherText.includes('晴')) return '☀️'
  if (weatherText.includes('云') || weatherText.includes('多云')) return '⛅'
  if (weatherText.includes('雾') || weatherText.includes('霾')) return '🌫️'
  if (weatherText.includes('雷')) return '⛈️'
  return '🌤️'
}

const getWeatherTemp = (weather) => {
  if (!weather || !weather.raw) return ''
  return weather.raw.temperature ? `${weather.raw.temperature}℃` : ''
}

const getCurrencySymbol = (currency) => {
  const symbols = {
    'CNY': '¥',
    'USD': '$',
    'EUR': '€',
    'JPY': '¥',
    'GBP': '£'
  }
  return symbols[currency] || '¥'
}

const formatCost = (cost) => {
  if (cost === null || cost === undefined || cost === '') return ''
  const num = parseFloat(cost)
  if (isNaN(num)) return ''
  // 如果是整数，不显示小数点
  if (Number.isInteger(num)) {
    return num.toString()
  }
  // 如果有小数，保留两位
  return num.toFixed(2)
}

const getCardDistance = (index) => {
  if (index <= 0 || index >= props.currentDayCards.length) return 0
  const prevCard = props.currentDayCards[index - 1]
  const currCard = props.currentDayCards[index]
  const prevLocation = getCardLocation(prevCard)
  const currLocation = getCardLocation(currCard)
  if (!prevLocation || !currLocation) return 0
  const prevLat = prevLocation.latitude || prevLocation.lat
  const prevLng = prevLocation.longitude || prevLocation.lng
  const currLat = currLocation.latitude || currLocation.lat
  const currLng = currLocation.longitude || currLocation.lng
  if (!prevLat || !prevLng || !currLat || !currLng) return 0
  return calculateDistance(prevLat, prevLng, currLat, currLng)
}

const getCardLocation = (card) => {
  if (!card) return null
  if (card.isMulti && card.options && card.options.length > 0) {
    const activeOption = card.options[card.activeOptionIndex || 0]
    const optionLocation = activeOption?.locationInfo || activeOption?.location
    if (optionLocation) return optionLocation
  }
  return card.locationInfo || card.location
}

const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 100) / 100
}

const toRad = (value) => {
  return (value * Math.PI) / 180
}

const hasExpandContent = (card) => {
  return card.detailDescription && card.detailDescription.length > 0
}

const hasNavigateButton = (card) => {
  const location = getCardLocation(card)
  if (!location) return false
  const hasCoords = location.lng !== undefined && location.lat !== undefined
  const hasNameOrAddress = location.name || location.address || card.title
  return hasCoords && hasNameOrAddress
}

const hasLocationInfo = (card) => {
  const location = getCardLocation(card)
  if (!location) return false
  return location.lng !== undefined && location.lat !== undefined
}

const hasOptionLocationInfo = (option) => {
  if (!option) return false
  const location = option.locationInfo || option.location
  if (!location) return false
  return location.lng !== undefined && location.lat !== undefined
}

const getNavigateTarget = (card) => {
  const location = getCardLocation(card)
  const locationText = String(location?.name || location?.address || '').trim()

  if (locationText) return locationText

  const title = String(card?.title || '')
  if (!title) return '目的地'

  return title
    .replace(/[（(].*?[)）]/g, '')
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    .trim()
}

const handleCardClick = (card) => {
  // 如果有其他卡片已滑动，先收回它们
  const hasOtherSlidedCard = props.currentDayCards.some(c => c.slided && (c.id || c.uid) !== (card.id || card.uid))
  if (hasOtherSlidedCard) {
    props.currentDayCards.forEach(c => {
      if ((c.id || c.uid) !== (card.id || card.uid)) {
        c.slided = false
      }
    })
  }
  emit('card-click', card)
}

const handleAddEvent = () => {
  emit('add-event')
}

const handleAddEventAtIndex = (index) => {
  emit('add-event', index)
}

const handleEdit = (card) => {
  emit('edit', card)
}

const handleDelete = (card) => {
  emit('delete', card)
}

const handleToggleStatus = (card) => {
  emit('toggle-status', card)
}

const toggleComplete = (card) => {
  const cardId = card.id || card.uid
  if (savingCompleteIds.value.has(cardId)) return

  savingCompleteIds.value.add(cardId)
  // 通知父组件切换完成状态，父组件完成后需要调用 setCardCompleteLoading(cardId, false)
  emit('toggle-complete', { card, completed: !card.completed })
}

// 设置排序状态
const setSorting = (value) => {
  isSorting.value = value
}

// 设置处理状态（合并、删除等）
const setProcessing = (value, text = '处理中...') => {
  isProcessing.value = value
  processingText.value = text
}

// 设置卡片完成状态 loading（由父组件调用）
const setCardCompleteLoading = (cardId, isLoading) => {
  if (isLoading) {
    savingCompleteIds.value.add(cardId)
  } else {
    savingCompleteIds.value.delete(cardId)
  }
}

// 暴露方法给父组件
defineExpose({
  setSorting,
  setProcessing,
  setCardCompleteLoading
})

const toggleExpand = (card) => {
  card.expanded = !card.expanded
}

const toggleSlide = (card) => {
  emit('toggle-slide', card)
}

const switchOption = (card, optIndex) => {
  emit('switch-option', { card, optIndex })
}

const toggleOptionComplete = (card, optIndex) => {
  emit('toggle-option-complete', { card, optIndex, option: card.options[optIndex] })
}

const handleNavigate = (card) => {
  emit('navigate', card)
}

const handleNavigateOption = (option) => {
  emit('navigate-option', option)
}

const handleStartMerge = (card) => {
  emit('start-merge', card)
}

const handleSplit = (card) => {
  emit('split', card)
}

// 检查触摸点是否在子选项区域内
const isTouchInTabButtons = (touchX, touchY) => {
  const tabButtons = document.querySelectorAll('.tab-buttons')
  for (const el of tabButtons) {
    const rect = el.getBoundingClientRect()
    if (touchX >= rect.left && touchX <= rect.right &&
        touchY >= rect.top && touchY <= rect.bottom) {
      return true
    }
  }
  return false
}

const handleTouchStart = (e, card) => {
  const touchX = e.touches[0].clientX
  const touchY = e.touches[0].clientY

  // 如果触摸在子选项区域内，标记为子选项滑动，不触发卡片左滑
  if (isTouchInTabButtons(touchX, touchY)) {
    card.isTabButtonSwipe = true
    return
  }

  card.touchStartX = touchX
  card.touchStartY = touchY
  card.swiping = false
  card.isTabButtonSwipe = false
}

const handleTouchMove = (e, card) => {
  // 如果是子选项滑动，不处理卡片左滑逻辑
  if (card.isTabButtonSwipe) return

  if (!card.touchStartX || !card.touchStartY) return
  const touchX = e.touches[0].clientX
  const touchY = e.touches[0].clientY
  const deltaX = card.touchStartX - touchX
  const deltaY = card.touchStartY - touchY
  if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 30) {
    card.swiping = true
  }
}

const handleTouchEnd = (e, card) => {
  // 如果是子选项滑动，只重置状态，不触发卡片左滑
  if (card.isTabButtonSwipe) {
    card.isTabButtonSwipe = false
    return
  }

  if (card.swiping) {
    emit('toggle-slide', card)
  }
  card.touchStartX = null
  card.touchStartY = null
  card.swiping = false
}

const handleMouseDown = (e, card) => {
  if (e.button !== 0) return

  // 如果鼠标在子选项区域内，标记为子选项滑动，不触发卡片左滑
  if (isTouchInTabButtons(e.clientX, e.clientY)) {
    card.isTabButtonMouseSwipe = true
    return
  }

  card.mouseStartX = e.clientX
  card.mouseStartY = e.clientY
  card.mouseSwiping = false
  card.isMouseDown = true
  card.isTabButtonMouseSwipe = false
}

const handleMouseMove = (e, card) => {
  // 如果是子选项滑动，不处理卡片左滑逻辑
  if (card.isTabButtonMouseSwipe) return

  if (!card.isMouseDown || !card.mouseStartX || !card.mouseStartY) return
  const deltaX = card.mouseStartX - e.clientX
  const deltaY = card.mouseStartY - e.clientY
  if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 30) {
    card.mouseSwiping = true
  }
}

const handleMouseUp = (e, card) => {
  // 如果是子选项滑动，只重置状态，不触发卡片左滑
  if (card.isTabButtonMouseSwipe) {
    card.isTabButtonMouseSwipe = false
    return
  }

  if (card.mouseSwiping) {
    emit('toggle-slide', card)
  }
  card.mouseStartX = null
  card.mouseStartY = null
  card.mouseSwiping = false
  card.isMouseDown = false
}

const handleMouseLeave = (e, card) => {
  card.mouseStartX = null
  card.mouseStartY = null
  card.mouseSwiping = false
  card.isMouseDown = false
  card.isTabButtonMouseSwipe = false
}
</script>

<style scoped>
.trip-card-list {
  padding: 0;
  width: 100%;
  box-sizing: border-box;
  position: relative;
}

/* 全局 loading 遮罩 - 固定在屏幕正中央 */
.global-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  z-index: 99999;
}

.global-overlay .n-spin {
  transform: scale(1.5);
}

.global-text {
  font-size: 18px;
  color: #ff6b6b;
  font-weight: 600;
  letter-spacing: 1px;
}

.cards-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.progress-header {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  margin: 0 auto 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  width: 96%;
  max-width: 96%;
  box-sizing: border-box;
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.progress-label {
  font-size: 14px;
  color: #64748b;
  white-space: nowrap;
  flex-shrink: 0;
}

.inline-progress {
  flex: 1;
  min-width: 0;
}

.progress-count {
  font-size: 14px;
  font-weight: 600;
  color: #ff6b6b;
  white-space: nowrap;
  flex-shrink: 0;
}

.cards-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  width: 96%;
  max-width: 96%;
  margin: 0 auto;
}

.card-divider {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin: -6px 0;
  position: relative;
  z-index: 3;
  height: 28px;
  width: 100%;
  pointer-events: none;
}

.card-divider.last-divider {
  justify-content: flex-end;
}

.distance-badge {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  background: #e8f0fe;
  color: #4285f4;
  padding: 4px 12px;
  border-radius: 14px;
  font-size: 11px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 1px 4px rgba(66, 133, 244, 0.15);
  pointer-events: auto;
}

.distance-text {
  font-size: 11px;
  color: #4285f4;
}

.add-card-btn-inline {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  pointer-events: auto;
  margin-right: calc(33.33% - 28px);
}

.card-divider.last-divider .add-card-btn-inline {
  margin-right: calc(33.33% - 28px);
}

.add-card-btn-inline:active {
  transform: scale(0.9);
}

.add-card-btn-inline .add-card-icon {
  color: #ff9f43;
  font-size: 24px;
  font-weight: bold;
  line-height: 1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.card-wrapper {
  width: 100%;
  position: relative;
  overflow: visible;
  border-radius: 14px;
}

.event-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 16px;
  margin: 0;
  width: 100%;
  min-height: 60px;
  position: relative;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.02);
  transition: transform 0.28s cubic-bezier(0.22, 0.61, 0.36, 1),
    border-color 0.28s ease, box-shadow 0.28s ease, opacity 0.28s ease;
  cursor: pointer;
  overflow: visible;
  will-change: transform;
  box-sizing: border-box;
}

.event-card.transport {
  border-left: 4px solid #ff6b6b;
}

.event-card.hotel {
  border-left: 4px solid #ffa502;
}

.event-card.scenic {
  border-left: 4px solid #3742fa;
}

.event-card.food {
  border-left: 4px solid #2ed573;
}

.event-card.activity {
  border-left: 4px solid #eb2f96;
}

.event-card.shopping {
  border-left: 4px solid #fa541c;
}

.event-card.other {
  border-left: 4px solid #8c8c8c;
}

.event-card.event-completed {
  opacity: 0.7;
  background: #f8f9fa;
}

.event-card.event-completed .title {
  text-decoration: line-through;
  color: #95a5a6;
}

.event-card.event-completed .desc {
  color: #b2bec3;
}

.event-card.event-disabled {
  opacity: 0.5;
  background: #f1f2f6;
}

.event-card.event-disabled .title,
.event-card.event-disabled .desc,
.event-card.event-disabled .time {
  color: #b2bec3;
}

.card-actions-container {
  position: absolute;
  top: 0;
  bottom: 0;
  right: -100px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 6px;
  width: 100px;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease, visibility 0.2s ease;
  z-index: 10;
  pointer-events: none;
  padding-left: 10px;
  box-sizing: border-box;
}

.card-actions-container.visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.card-action-btn {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 2px;
  transition: all 0.15s ease;
  padding: 0 2px;
  user-select: none;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.card-action-text {
  writing-mode: horizontal-tb;
  text-orientation: mixed;
  text-align: center;
  line-height: 1;
  letter-spacing: 0;
  white-space: nowrap;
}

.card-action-btn:active {
  filter: brightness(0.92);
}

.card-action-btn.edit-btn {
  background: linear-gradient(135deg, #67c23a 0%, #529b2f 100%);
  color: white;
}

.card-action-btn.delete-btn {
  background: linear-gradient(135deg, #f56c6c 0%, #c45656 100%);
  color: white;
}

.card-action-btn.state-btn {
  background: linear-gradient(135deg, #909399 0%, #73767a 100%);
  color: white;
}

.card-action-btn.state-btn.inactive {
  background: linear-gradient(135deg, #e6a23c 0%, #b8822f 100%);
  color: white;
}

.card-action-btn.merge-btn {
  background: linear-gradient(135deg, #9254de 0%, #7443b1 100%);
  color: white;
}

.card-action-btn.split-btn {
  background: linear-gradient(135deg, #409eff 0%, #337ecc 100%);
  color: white;
}

.time-row {
  font-size: 14px;
  font-weight: 700;
  color: #ff6b6b;
  margin-bottom: 10px;
  position: relative;
}

.time-main {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: flex-start;
}

.time-main.has-cost {
  padding-right: 50px;
}

.time-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.time-middle {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
}

.time-right {
  position: absolute;
  right: 0;
  top: 0;
}

.time-label {
  flex-shrink: 0;
}

.tags-container {
  display: contents;
}

.tag {
  margin: 2px;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  background: #f3f4f6;
  color: #636e72;
  white-space: nowrap;
}

.weather-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: #e8f4fd;
  color: #1890ff;
  flex-shrink: 0;
}

.cost-badge {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ff9f43, #ff6b6b);
  color: white;
  font-weight: 600;
  flex-shrink: 0;
  margin-left: auto;
  box-shadow: 0 2px 6px rgba(255, 107, 107, 0.25);
}

.event-card .title {
  font-size: 16px;
  font-weight: 700;
  color: #2d3436;
  margin: 0 0 6px 0;
  line-height: 1.4;
  display: flex;
  align-items: center;
  gap: 6px;
}

.location-badge {
  font-size: 12px;
  color: #ff6b6b;
  opacity: 0.8;
  flex-shrink: 0;
}

.event-card .desc {
  font-size: 13px;
  color: #636e72;
  margin: 0 0 6px 0;
  line-height: 1.5;
}

.tab-buttons-wrapper {
  margin-bottom: 10px;
}

.tab-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tab-buttons.has-scrollbar {
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding-bottom: 4px;
}

.tab-buttons.has-scrollbar::-webkit-scrollbar {
  display: none;
}

.tab-indicator-bar {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  padding: 0 4px;
}

.tab-indicator-segment {
  flex: 1;
  height: 3px;
  background: #e2e8f0;
  border-radius: 2px;
  transition: background 0.3s ease;
}

.tab-indicator-segment.active {
  background: #94a3b8;
}

.tab-btn {
  padding: 6px 12px;
  background: #f1f5f9;
  border-radius: 16px;
  font-size: 13px;
  color: #64748b;
  border: 1px solid transparent;
  transition: all 0.2s ease;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab-check {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #cbd5e1;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.tab-check:hover {
  border-color: #ff9f43;
}

.tab-check.checked {
  background: #4caf50;
  border-color: #4caf50;
}

.tab-check-icon {
  color: white;
  font-size: 10px;
  font-weight: bold;
}

.tab-name {
  flex: 1;
}

.tab-btn.active {
  background: linear-gradient(135deg, #ff9f43, #ff6b6b);
  color: #fff;
}

.tab-btn.tab-completed {
  background: #e8f5e9;
  color: #4caf50;
}

.tab-btn.tab-inactive {
  background: #f3f4f6;
  color: #9ca3af;
}

.tab-location-badge {
  font-size: 10px;
  margin-left: 4px;
  opacity: 0.7;
}

.tab-contents {
  position: relative;
}

.tab-content {
  display: none;
}

.tab-content.active {
  display: block;
}

.tab-content-inactive {
  opacity: 0.6;
}

.action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.action-row-left {
  flex: 0 0 auto;
}

.action-row-right {
  flex: 0 1 auto;
  text-align: center;
}

.expand-hint {
  font-size: 12px;
  color: #4d96ff;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  position: relative;
  z-index: 5;
  padding: 4px 8px;
}

.expand-hint::after {
  content: '▼';
  transition: transform 0.3s;
  font-size: 10px;
}

.expand-hint.expanded::after {
  transform: rotate(180deg);
}

.action-buttons-container {
  display: inline-flex;
}

.action-btn-nav {
  flex: 0 1 auto;
  text-align: center;
  padding: 8px 12px;
  background: white;
  border: 1px solid #dfe6e9;
  color: #2d3436;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s;
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
}

.action-btn-nav:active {
  background: #f8f9fa;
  transform: translateY(1px);
}

.event-card.active .action-btn-nav {
  background: linear-gradient(135deg, #ff9f43, #ff6b6b);
  color: #fff;
  border-color: transparent;
}

.check-button {
  position: absolute;
  right: 2px;
  top: 2px;
  width: 20px;
  height: 20px;
  background: #f0f2f5;
  border: 3px solid #b2bec3;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 200;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.check-button::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 14px;
  font-weight: bold;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.check-button.completed {
  background: #b2bec3;
  border-color: #b2bec3;
}

.check-button.completed::after {
  opacity: 1;
}

.swipe-hint {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
  pointer-events: auto;
}

.swipe-hint-icon {
  font-size: 18px;
  color: #cbd5e1;
  transition: all 0.3s ease;
  display: inline-block;
}

.swipe-hint.slided .swipe-hint-icon {
  color: #94a3b8;
  transform: rotate(180deg);
}

.empty-state {
  padding: 60px 0;
  text-align: center;
}

/* 骨架屏样式 */
.skeleton-container {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-progress {
  background: white;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.skeleton-progress-label {
  width: 60px;
  height: 16px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: 4px;
  animation: skeleton-loading 1.5s infinite;
  flex-shrink: 0;
}

.skeleton-progress-bar {
  flex: 1;
  height: 6px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: 3px;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-progress-count {
  width: 40px;
  height: 16px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: 4px;
  animation: skeleton-loading 1.5s infinite;
  flex-shrink: 0;
}

.skeleton-card {
  background: white;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.skeleton-time-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.skeleton-time {
  width: 50px;
  height: 18px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: 4px;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-weather {
  width: 60px;
  height: 18px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: 4px;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-title {
  width: 70%;
  height: 20px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: 4px;
  animation: skeleton-loading 1.5s infinite;
  margin-bottom: 10px;
}

.skeleton-desc {
  width: 90%;
  height: 14px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: 4px;
  animation: skeleton-loading 1.5s infinite;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.event-card.active {
  position: relative;
  z-index: 2;
  border-radius: 16px;
  box-shadow:
    0 0 0 4px rgba(255, 107, 107, 0.1),
    0 10px 30px rgba(255, 107, 107, 0.25);
}

.event-card.active::before {
  content: '';
  position: absolute;
  left: -10px;
  top: -7px;
  width: 16px;
  height: 16px;
  background: #ff6b6b;
  border: 3px solid #ff6b6b;
  border-radius: 50%;
  z-index: 1;
  box-shadow: inset 0 0 0 3px white;
}

.event-card.transport.active {
  box-shadow:
    0 0 0 4px rgba(255, 107, 107, 0.1),
    0 10px 30px rgba(255, 107, 107, 0.25);
}

.event-card.transport.active::before {
  background: #ff6b6b;
  border-color: #ff6b6b;
}

.event-card.hotel.active {
  box-shadow:
    0 0 0 4px rgba(255, 165, 2, 0.1),
    0 10px 30px rgba(255, 165, 2, 0.25);
}

.event-card.hotel.active::before {
  background: #ffa502;
  border-color: #ffa502;
}

.event-card.scenic.active {
  box-shadow:
    0 0 0 4px rgba(55, 66, 250, 0.1),
    0 10px 30px rgba(55, 66, 250, 0.25);
}

.event-card.scenic.active::before {
  background: #3742fa;
  border-color: #3742fa;
}

.event-card.food.active {
  box-shadow:
    0 0 0 4px rgba(46, 213, 115, 0.1),
    0 10px 30px rgba(46, 213, 115, 0.25);
}

.event-card.food.active::before {
  background: #2ed573;
  border-color: #2ed573;
}

.event-card.activity.active {
  box-shadow:
    0 0 0 4px rgba(235, 47, 150, 0.1),
    0 10px 30px rgba(235, 47, 150, 0.25);
}

.event-card.activity.active::before {
  background: #eb2f96;
  border-color: #eb2f96;
}

.event-card.shopping.active {
  box-shadow:
    0 0 0 4px rgba(250, 84, 28, 0.1),
    0 10px 30px rgba(250, 84, 28, 0.25);
}

.event-card.shopping.active::before {
  background: #fa541c;
  border-color: #fa541c;
}

.event-card.other.active {
  box-shadow:
    0 0 0 4px rgba(140, 140, 140, 0.1),
    0 10px 30px rgba(140, 140, 140, 0.25);
}

.event-card.other.active::before {
  background: #8c8c8c;
  border-color: #8c8c8c;
}

.event-card.merge-selectable,
.event-card.merge-selected,
.event-card.merge-source {
  cursor: pointer;
  transition: all 0.2s ease;
  padding-left: 48px;
}

.event-card.merge-selectable:hover {
  box-shadow: 0 0 0 2px rgba(255, 107, 107, 0.3);
}

.event-card.merge-selected {
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.5);
  background: linear-gradient(135deg, rgba(255, 107, 107, 0.05), rgba(255, 159, 67, 0.1));
}

.merge-indicator {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
}

.merge-checkbox {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 3px solid #c0c0c0;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.merge-checkbox.checked {
  background: linear-gradient(135deg, #ff6b6b, #ff9f43);
  border-color: #ff6b6b;
  box-shadow: 0 2px 8px rgba(255, 107, 107, 0.4);
}

.merge-checkbox.source {
  background: linear-gradient(135deg, #ffd93d, #f1c40f);
  border-color: #f39c12;
  box-shadow: 0 2px 8px rgba(243, 156, 18, 0.4);
}

.merge-check-icon {
  color: white;
  font-size: 16px;
  font-weight: bold;
}

.merge-source-text {
  color: #2d3436;
  font-size: 11px;
  font-weight: bold;
}

.sortable-ghost {
  opacity: 0.3 !important;
  background: rgba(102, 126, 234, 0.08) !important;
  border: 2px dashed rgba(102, 126, 234, 0.8) !important;
  border-radius: 14px !important;
}

.sortable-ghost .event-card {
  opacity: 0 !important;
}

.sortable-chosen {
  z-index: 1000;
}

.sortable-chosen .event-card {
  transform: scale(1.02) !important;
  transition: all 0.2s ease !important;
}

.sortable-chosen .event-card.transport {
  box-shadow: 0 8px 24px rgba(255, 107, 107, 0.35) !important;
  border-color: rgba(255, 107, 107, 0.6) !important;
}

.sortable-chosen .event-card.hotel {
  box-shadow: 0 8px 24px rgba(255, 165, 2, 0.35) !important;
  border-color: rgba(255, 165, 2, 0.6) !important;
}

.sortable-chosen .event-card.scenic {
  box-shadow: 0 8px 24px rgba(55, 66, 250, 0.35) !important;
  border-color: rgba(55, 66, 250, 0.6) !important;
}

.sortable-chosen .event-card.food {
  box-shadow: 0 8px 24px rgba(46, 213, 115, 0.35) !important;
  border-color: rgba(46, 213, 115, 0.6) !important;
}

.sortable-chosen .event-card.activity {
  box-shadow: 0 8px 24px rgba(235, 47, 150, 0.35) !important;
  border-color: rgba(235, 47, 150, 0.6) !important;
}

.sortable-chosen .event-card.shopping {
  box-shadow: 0 8px 24px rgba(250, 84, 28, 0.35) !important;
  border-color: rgba(250, 84, 28, 0.6) !important;
}

.sortable-chosen .event-card.other {
  box-shadow: 0 8px 24px rgba(140, 140, 140, 0.35) !important;
  border-color: rgba(140, 140, 140, 0.6) !important;
}

.sortable-drag {
  opacity: 1 !important;
  z-index: 1001;
}

.sortable-drag .event-card {
  opacity: 1 !important;
  background: white !important;
  border-radius: 14px !important;
  transform: scale(1.03) !important;
  border-width: 2px !important;
  border-style: solid !important;
}

.sortable-drag .event-card.transport {
  box-shadow: 0 12px 32px rgba(255, 107, 107, 0.45) !important;
  border-color: rgba(255, 107, 107, 0.8) !important;
}

.sortable-drag .event-card.hotel {
  box-shadow: 0 12px 32px rgba(255, 165, 2, 0.45) !important;
  border-color: rgba(255, 165, 2, 0.8) !important;
}

.sortable-drag .event-card.scenic {
  box-shadow: 0 12px 32px rgba(55, 66, 250, 0.45) !important;
  border-color: rgba(55, 66, 250, 0.8) !important;
}

.sortable-drag .event-card.food {
  box-shadow: 0 12px 32px rgba(46, 213, 115, 0.45) !important;
  border-color: rgba(46, 213, 115, 0.8) !important;
}

.sortable-drag .event-card.activity {
  box-shadow: 0 12px 32px rgba(235, 47, 150, 0.45) !important;
  border-color: rgba(235, 47, 150, 0.8) !important;
}

.sortable-drag .event-card.shopping {
  box-shadow: 0 12px 32px rgba(250, 84, 28, 0.45) !important;
  border-color: rgba(250, 84, 28, 0.8) !important;
}

.sortable-drag .event-card.other {
  box-shadow: 0 12px 32px rgba(140, 140, 140, 0.45) !important;
  border-color: rgba(140, 140, 140, 0.8) !important;
}
</style>
