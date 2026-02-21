<template>
  <div class="page-loading">
    <n-spin :size="size">
      <template #icon>
        <n-icon :component="LoadingOutlined" />
      </template>
    </n-spin>
    <span v-if="text" class="loading-text">{{ text }}</span>
  </div>
</template>

<script setup lang="ts">
import { NSpin, NIcon } from 'naive-ui'
import { LoadingOutlined } from '@vicons/antd'

withDefaults(defineProps<{
  text?: string
  size?: 'small' | 'medium' | 'large'
}>(), {
  text: '加载中...',
  size: 'large'
})
</script>

<style scoped>
.page-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: var(--bg-body);
  z-index: 100;
}

.loading-text {
  color: var(--text-tertiary);
  font-size: 14px;
}
</style>
