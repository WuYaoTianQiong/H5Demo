<template>
  <div class="form-section">
    <div class="section-header">
      <n-icon :component="icon" class="section-icon" />
      <span class="section-title">{{ title }}</span>
    </div>
    <div class="section-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { NIcon } from 'naive-ui'

defineProps<{
  title: string
  icon: Component
}>()
</script>

<style scoped lang="scss">
.form-section {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
  margin-bottom: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);

  &:last-child {
    margin-bottom: 0;
  }
}

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background: linear-gradient(135deg, #fff8f6 0%, #fff 100%);
  border-bottom: 1px solid #f0f0f0;
}

.section-icon {
  font-size: 14px;
  color: #ff6b6b;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.section-content {
  padding: 10px;
}

@media screen and (max-width: 768px) {
  .form-section {
    margin-bottom: 8px;
    border-radius: 16px;
  }

  .section-header {
    padding: 8px 10px;
  }

  .section-title {
    font-size: 12px;
  }

  .section-content {
    padding: 8px;
  }
}

@media screen and (max-width: 375px) {
  .section-content {
    padding: 6px;
  }
}
</style>
