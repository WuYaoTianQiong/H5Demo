<template>
  <n-input-number
    :value="modelValue"
    :placeholder="placeholder"
    :min="0"
    class="custom-input-number budget-input"
    @update:value="$emit('update:modelValue', $event)"
  >
    <template #prefix>
      <span class="currency-prefix">¥</span>
    </template>
  </n-input-number>
</template>

<script setup lang="ts">
import { NInputNumber } from 'naive-ui'

defineProps<{
  modelValue: number | null
  placeholder: string
}>()

defineEmits<{
  'update:modelValue': [value: number | null]
}>()
</script>

<style scoped lang="scss">
.budget-input {
  width: 120px;
  flex-shrink: 0;
}

.currency-prefix {
  color: #ff6b6b;
  font-weight: 600;
  font-size: 14px;
}

@media screen and (max-width: 768px) {
  .budget-input {
    width: 110px;
  }
}

@media screen and (max-width: 375px) {
  .budget-input {
    width: 95px;
  }
}
</style>
