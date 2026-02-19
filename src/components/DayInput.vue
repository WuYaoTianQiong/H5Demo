<template>
  <div class="day-input-wrapper">
    <n-input-number
      :value="modelValue"
      :placeholder="label"
      :min="min"
      :max="max"
      class="custom-input-number day-input"
      @update:value="$emit('update:modelValue', $event)"
    />
    <span class="input-label">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
import { NInputNumber } from 'naive-ui'

defineProps<{
  modelValue: number | null
  label: string
  min: number
  max: number
}>()

defineEmits<{
  'update:modelValue': [value: number | null]
}>()
</script>

<style scoped lang="scss">
.day-input-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.day-input {
  width: 90px;
  flex-shrink: 0;
}

.input-label {
  color: #666;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

@media screen and (max-width: 768px) {
  .day-input {
    width: 80px;
  }

  .input-label {
    font-size: 13px;
  }
}

@media screen and (max-width: 375px) {
  .day-input {
    width: 70px;
  }
}
</style>
