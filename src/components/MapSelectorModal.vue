<template>
  <n-modal
    v-model:show="isVisible"
    preset="card"
    :title="title"
    class="map-selector-modal"
    :style="modalStyle"
    :header-style="headerStyle"
    :content-style="contentStyle"
  >
    <div class="map-options">
      <div
        v-for="map in availableMaps"
        :key="map.key"
        class="map-option"
        :class="{ 
          active: selectedMap === map.key,
          recommended: map.recommended 
        }"
        @click="selectMap(map.key)"
      >
        <div class="map-icon" :style="{ background: map.color }">
          <span class="map-icon-text">{{ map.icon }}</span>
        </div>
        <div class="map-info">
          <span class="map-name">{{ map.name }}</span>
          <span class="map-desc">{{ map.description }}</span>
        </div>
        <div class="map-check">
          <n-icon v-if="selectedMap === map.key" :component="CheckOutlined" size="20" color="#ff6b6b" />
        </div>
        <div v-if="map.recommended" class="recommended-badge">推荐</div>
      </div>
    </div>

    <div class="remember-option">
      <n-checkbox v-model:checked="rememberChoice">
        记住我的选择，下次不再询问
      </n-checkbox>
    </div>

    <template #footer>
      <div class="modal-footer">
        <n-button
          v-if="showCancel"
          class="btn-secondary"
          @click="handleCancel"
        >
          取消
        </n-button>
        <n-button
          type="primary"
          class="btn-primary"
          :disabled="!selectedMap"
          @click="handleConfirm"
        >
          开始导航
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NModal, NButton, NIcon, NCheckbox } from 'naive-ui'
import { CheckOutlined } from '@vicons/antd'
import { useDevice } from '@/composables/useDevice'

export interface MapOption {
  key: string
  name: string
  icon: string
  color: string
  description: string
  scheme: string
  recommended?: boolean
}

const props = defineProps<{
  show: boolean
  title?: string
  showCancel?: boolean
  defaultSelected?: string
}>()

const emit = defineEmits<{
  close: []
  confirm: [mapKey: string, remember: boolean]
}>()

const { isMobile } = useDevice()
const isVisible = ref(false)
const selectedMap = ref('')
const rememberChoice = ref(false)

// 同步 show 属性
watch(() => props.show, (newVal) => {
  isVisible.value = newVal
  if (newVal) {
    selectedMap.value = props.defaultSelected || ''
    rememberChoice.value = false
  }
})

// 可用的地图选项
const availableMaps = computed<MapOption[]>(() => {
  const ua = navigator.userAgent.toLowerCase()
  const isIOS = /iphone|ipad|ipod/.test(ua)
  const isAndroid = /android/.test(ua)
  
  const maps: MapOption[] = [
    {
      key: 'amap',
      name: '高德地图',
      icon: '📍',
      color: '#4285f4',
      description: '路线规划精准，实时路况',
      scheme: isIOS ? 'iosamap://' : 'amapuri://',
      recommended: true
    },
    {
      key: 'baidu',
      name: '百度地图',
      icon: '🗺️',
      color: '#2932e1',
      description: 'POI数据丰富，街景清晰',
      scheme: 'baidumap://'
    },
    {
      key: 'tencent',
      name: '腾讯地图',
      icon: '🧭',
      color: '#00bfff',
      description: '微信生态，社交分享方便',
      scheme: 'qqmap://'
    },
    {
      key: 'apple',
      name: 'Apple 地图',
      icon: '🍎',
      color: '#007aff',
      description: 'iOS 原生体验，隐私保护',
      scheme: 'http://maps.apple.com/',
      recommended: isIOS
    },
    {
      key: 'google',
      name: 'Google 地图',
      icon: '🌐',
      color: '#4285f4',
      description: '全球覆盖，海外出行首选',
      scheme: 'comgooglemaps://'
    },
    {
      key: 'web',
      name: '浏览器打开',
      icon: '🌐',
      color: '#666666',
      description: '无需安装APP，直接网页导航',
      scheme: 'https://'
    }
  ]
  
  // 根据平台调整推荐
  return maps.map(map => ({
    ...map,
    recommended: map.key === 'amap' || (isIOS && map.key === 'apple')
  }))
})

// 弹窗样式
const modalStyle = computed(() => ({
  width: isMobile.value ? '96%' : '420px',
  maxWidth: '90vw',
  borderRadius: '16px'
}))

const headerStyle = computed(() => ({
  background: 'linear-gradient(135deg, #ff6b6b, #ff8e53)',
  padding: isMobile.value ? '12px 16px' : '14px 20px',
  borderRadius: '16px 16px 0 0'
}))

const contentStyle = computed(() => ({
  padding: isMobile.value ? '16px' : '20px',
  background: '#fafafa',
  borderRadius: '0 0 16px 16px'
}))

const title = computed(() => props.title || '选择导航方式')

const selectMap = (key: string) => {
  selectedMap.value = key
}

const handleCancel = () => {
  isVisible.value = false
  emit('close')
}

const handleConfirm = () => {
  if (selectedMap.value) {
    emit('confirm', selectedMap.value, rememberChoice.value)
    isVisible.value = false
  }
}
</script>

<style scoped lang="scss">
.map-selector-modal {
  :deep(.n-card) {
    border-radius: 16px !important;
    overflow: hidden !important;
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.18) !important;
    border: none !important;
  }

  :deep(.n-card-header__main) {
    color: #ffffff !important;
    font-size: 17px !important;
    font-weight: 700 !important;
    text-align: center !important;
  }

  :deep(.n-card__content) {
    padding: 0 !important;
  }

  :deep(.n-card__footer) {
    border-top: 1px solid #f0f0f0;
    padding: 12px 16px;
  }
}

.map-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.map-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #ffffff;
  border-radius: 12px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.25s ease;
  position: relative;

  &:hover {
    border-color: rgba(255, 107, 107, 0.3);
    transform: translateX(4px);
  }

  &.active {
    border-color: #ff6b6b;
    background: linear-gradient(135deg, rgba(255, 107, 107, 0.05), rgba(255, 159, 67, 0.1));
  }

  &.recommended {
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 60%;
      background: linear-gradient(180deg, #ff6b6b, #ff8e53);
      border-radius: 0 2px 2px 0;
    }
  }
}

.map-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.map-icon-text {
  font-size: 22px;
}

.map-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.map-name {
  font-size: 15px;
  font-weight: 600;
  color: #2d3436;
}

.map-desc {
  font-size: 12px;
  color: #636e72;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.map-check {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.recommended-badge {
  position: absolute;
  top: -6px;
  right: 12px;
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(255, 107, 107, 0.3);
}

.remember-option {
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-secondary {
  border-radius: 12px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
}

.btn-primary {
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  border: none;
  border-radius: 12px;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 4px 14px rgba(255, 107, 107, 0.35);

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(255, 107, 107, 0.45);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// 响应式
@media screen and (max-width: 768px) {
  .map-options {
    padding: 12px;
    gap: 8px;
    max-height: 350px;
  }

  .map-option {
    padding: 12px 14px;
  }

  .map-icon {
    width: 40px;
    height: 40px;
  }

  .map-icon-text {
    font-size: 20px;
  }

  .map-name {
    font-size: 14px;
  }

  .map-desc {
    font-size: 11px;
  }
}
</style>
