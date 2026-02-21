<template>
  <n-button
    class="fab-button"
    :class="{ 'fab-button--extended': label }"
    :type="type"
    circle
    size="large"
    @click="$emit('click')"
  >
    <template #icon>
      <n-icon :component="icon" />
    </template>
    <span v-if="label" class="fab-label">{{ label }}</span>
  </n-button>
</template>

<script setup lang="ts">
import { NButton, NIcon } from 'naive-ui'
import { PlusOutlined } from '@vicons/antd'
import type { Component } from 'vue'

withDefaults(defineProps<{
  icon?: Component
  label?: string
  type?: 'primary' | 'default' | 'info' | 'success' | 'warning' | 'error'
}>(), {
  icon: PlusOutlined,
  type: 'primary'
})

defineEmits<{
  click: []
}>()
</script>

<style scoped>
.fab-button {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 56px;
  height: 56px;
  background: var(--primary-gradient);
  border: none;
  box-shadow: var(--shadow-primary);
  z-index: 100;
  transition: all var(--transition-base);
}

.fab-button:hover {
  transform: scale(1.1);
  box-shadow: var(--shadow-primary-hover);
}

.fab-button:active {
  transform: scale(0.95);
}

.fab-button--extended {
  width: auto;
  padding: 0 24px;
  border-radius: 28px;
}

.fab-label {
  margin-left: 8px;
  font-weight: 600;
}

@media screen and (max-width: 768px) {
  .fab-button {
    right: 16px;
    bottom: 16px;
  }
}
</style>
