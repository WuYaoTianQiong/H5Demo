<template>
  <n-modal
    v-model:show="isVisible"
    preset="card"
    :title="title"
    class="confirm-modal"
    :style="modalStyle"
    :header-style="headerStyle"
    :content-style="contentStyle"
    :footer-style="footerStyle"
    :mask-closable="maskClosable"
    @update:show="handleShowUpdate"
    @mask-click="handleMaskClick"
  >
    <div class="confirm-content">
      <p class="confirm-text">{{ content }}</p>
    </div>
    <template #footer>
      <div class="confirm-footer">
        <n-button
          class="confirm-btn cancel-btn"
          :disabled="loading"
          @click="handleCancel"
        >
          <template #icon>
            <n-icon :component="CloseOutlined" />
          </template>
          {{ cancelText }}
        </n-button>
        <n-button
          type="primary"
          class="confirm-btn confirm-btn-primary"
          :loading="loading"
          @click="handleConfirm"
        >
          <template #icon>
            <n-icon :component="CheckOutlined" />
          </template>
          {{ confirmText }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NModal, NButton, NIcon } from 'naive-ui'
import { CheckOutlined, CloseOutlined } from '@vicons/antd'
import { useDevice } from '@/composables/useDevice'

const props = defineProps<{
  show: boolean
  title: string
  content: string
  confirmText?: string
  cancelText?: string
  loading?: boolean
  maskClosable?: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: []
  maskClick: []
}>()

const { isMobile } = useDevice()
const isVisible = ref(false)

// 同步 show 属性
watch(() => props.show, (newVal) => {
  isVisible.value = newVal
})

// 弹窗容器样式
const modalStyle = computed(() => ({
  width: isMobile.value ? '96%' : '400px',
  maxWidth: '90vw',
  borderRadius: '16px'
}))

// 头部样式 - 渐变背景
const headerStyle = computed(() => ({
  background: 'linear-gradient(135deg, #ff6b6b, #ff8e53)',
  padding: isMobile.value ? '12px 16px' : '14px 20px',
  borderRadius: '16px 16px 0 0'
}))

// 内容区域样式
const contentStyle = computed(() => ({
  padding: isMobile.value ? '16px' : '20px',
  background: '#fafafa',
  borderRadius: '0 0 16px 16px'
}))

// 底部样式
const footerStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: isMobile.value ? '12px 16px' : '16px 20px',
  background: '#ffffff',
  borderTop: '1px solid #f0f0f0',
  gap: '12px',
  borderRadius: '0 0 16px 16px'
}))

let isMaskClick = false

const handleShowUpdate = (val: boolean) => {
  if (!val) {
    // 如果是通过 mask 点击关闭的，不触发 close 事件（由 mask-click 处理）
    if (!isMaskClick) {
      emit('close')
    }
    isMaskClick = false
  }
}

const handleCancel = () => {
  isVisible.value = false
  emit('close')
}

const handleConfirm = () => {
  emit('confirm')
}

const handleMaskClick = () => {
  isMaskClick = true
  isVisible.value = false
  emit('maskClick')
}
</script>

<style scoped lang="scss">
// 确认弹窗样式 - 完全独立的样式，不依赖全局样式
.confirm-modal {
  :deep(.n-card) {
    border-radius: 16px !important;
    overflow: hidden !important;
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.18) !important;
    border: none !important;
  }

  // 头部样式
  :deep(.n-card__header) {
    position: relative !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  // 标题样式 - 绝对居中
  :deep(.n-card-header__main) {
    color: #ffffff !important;
    font-size: 17px !important;
    font-weight: 700 !important;
    text-align: center !important;
    position: absolute !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    white-space: nowrap !important;
  }

  // 关闭按钮样式
  :deep(.n-card-header__close) {
    margin-left: auto !important;
    color: rgba(255, 255, 255, 0.8) !important;
    position: relative !important;
    z-index: 1 !important;

    &:hover {
      color: #ffffff !important;
    }
  }

  // 内容区域
  :deep(.n-card__content) {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    min-height: 80px !important;
  }

  // 底部区域
  :deep(.n-card__footer) {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;
  }
}

// 确认内容
.confirm-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.confirm-text {
  font-size: 15px;
  color: #333;
  line-height: 1.6;
  text-align: center;
  margin: 0;
}

// 底部按钮容器
.confirm-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
}

// 按钮基础样式
.confirm-btn {
  flex: 1 1 50%;
  height: 44px;
  border-radius: 16px;
  font-size: 15px;
  font-weight: 500;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

// 取消按钮
.cancel-btn {
  border: 1.5px solid #e8e8e8;
  background: #ffffff;
  color: #666;
  transition: all 0.3s ease;

  &:hover {
    border-color: #ff6b6b;
    color: #ff6b6b;
    background: #fff5f5;
  }

  &:active {
    background: #ffeeee;
    transform: scale(0.98);
  }

  &:focus {
    outline: none;
    box-shadow: none;
  }
}

// 确认按钮
.confirm-btn-primary {
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  border: none;
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 4px 14px rgba(255, 107, 107, 0.35);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(255, 107, 107, 0.45);
  }

  &:active {
    transform: scale(0.98);
  }

  &:focus {
    outline: none;
    box-shadow: 0 4px 14px rgba(255, 107, 107, 0.35);
  }
}

// 响应式
@media screen and (max-width: 768px) {
  .confirm-modal {
    :deep(.n-card-header__main) {
      font-size: 16px !important;
    }
  }

  .confirm-btn {
    height: 44px;
    font-size: 15px;
  }

  .confirm-footer {
    gap: 8px;
  }
}
</style>
