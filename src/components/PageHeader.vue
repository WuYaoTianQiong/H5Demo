<template>
  <div class="page-header">
    <div class="responsive-container header-inner">
      <div class="header-left">
        <slot name="left">
          <n-button
            v-if="showBack"
            class="back-btn"
            circle
            @click="handleBack"
          >
            <template #icon>
              <n-icon :component="ArrowLeftOutlined" />
            </template>
          </n-button>
        </slot>
      </div>
      <div class="header-center">
        <slot name="title">
          <span class="header-title">{{ title }}</span>
        </slot>
      </div>
      <div class="header-right">
        <slot name="right"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NButton, NIcon } from 'naive-ui'
import { ArrowLeftOutlined } from '@vicons/antd'

const props = defineProps<{
  title?: string
  showBack?: boolean
}>()

const emit = defineEmits<{
  back: []
}>()

const handleBack = () => {
  emit('back')
}
</script>

<style scoped>
.page-header {
  padding: 12px 0;
  background: var(--primary-gradient);
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;
  box-shadow: 0 6px 16px rgba(255, 107, 107, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.page-header::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  pointer-events: none;
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  position: relative;
  padding: 0 max(var(--tg-spacing-screen), 16px);
}

.header-left {
  display: flex;
  align-items: center;
  z-index: 1;
  flex: 1;
  min-width: 48px;
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

.header-title {
  font-size: var(--tg-font-size-h1);
  font-weight: 800;
  color: #ffffff;
  line-height: 1.2;
  letter-spacing: 0.5px;
  text-align: center;
}

.header-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  z-index: 1;
  min-width: 48px;
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
</style>
