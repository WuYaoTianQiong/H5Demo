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
      <div class="modal-footer-btns">
        <n-button
          class="btn-secondary"
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
          class="btn-primary"
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

watch(() => props.show, (newVal) => {
  isVisible.value = newVal
})

const modalStyle = computed(() => ({
  width: isMobile.value ? '96%' : '400px',
  maxWidth: '90vw',
  borderRadius: 'var(--modal-radius)'
}))

const headerStyle = computed(() => ({
  background: 'var(--primary-gradient)',
  padding: isMobile.value ? '12px 16px' : '14px 20px',
  borderRadius: 'var(--modal-radius) var(--modal-radius) 0 0'
}))

const contentStyle = computed(() => ({
  padding: isMobile.value ? '16px' : '20px',
  background: 'var(--bg-secondary)',
  borderRadius: '0 0 var(--modal-radius) var(--modal-radius)'
}))

const footerStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: isMobile.value ? '12px 16px' : '16px 20px',
  background: 'var(--bg-primary)',
  borderTop: '1px solid var(--border-light)',
  gap: '12px',
  borderRadius: '0 0 var(--modal-radius) var(--modal-radius)'
}))

let isMaskClick = false

const handleShowUpdate = (val: boolean) => {
  if (!val) {
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
.confirm-modal {
  :deep(.n-card) {
    border-radius: var(--modal-radius) !important;
    overflow: hidden !important;
    box-shadow: var(--modal-shadow) !important;
    border: none !important;
  }

  :deep(.n-card__header) {
    position: relative !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  :deep(.n-card-header__main) {
    color: var(--bg-primary) !important;
    font-size: 17px !important;
    font-weight: 700 !important;
    text-align: center !important;
    position: absolute !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    white-space: nowrap !important;
  }

  :deep(.n-card-header__close) {
    margin-left: auto !important;
    color: rgba(255, 255, 255, 0.8) !important;
    position: relative !important;
    z-index: 1 !important;

    &:hover {
      color: var(--bg-primary) !important;
    }
  }

  :deep(.n-card__content) {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    min-height: 80px !important;
  }

  :deep(.n-card__footer) {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;
  }
}

.confirm-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.confirm-text {
  font-size: 15px;
  color: var(--text-primary);
  line-height: 1.6;
  text-align: center;
  margin: 0;
}

@media screen and (max-width: 768px) {
  .confirm-modal {
    :deep(.n-card-header__main) {
      font-size: 16px !important;
    }
  }
}
</style>
