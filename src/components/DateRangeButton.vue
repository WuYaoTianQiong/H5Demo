<template>
  <n-button
    block
    class="date-picker-btn"
    :class="{ 'has-value': value }"
    @click="$emit('click')"
  >
    <template #icon>
      <n-icon :component="CalendarOutlined" class="btn-icon" />
    </template>
    <span class="btn-text">{{ displayText }}</span>
    <n-icon v-if="value" :component="CheckCircleFilled" class="check-icon" />
  </n-button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NIcon } from 'naive-ui'
import { CalendarOutlined, CheckCircleFilled } from '@vicons/antd'

const props = defineProps<{
  value: string
}>()

defineEmits<{
  click: []
}>()

const displayText = computed(() => props.value || '点击选择出行日期')
</script>

<style scoped lang="scss">
.date-picker-btn {
  height: 48px;
  border: 1.5px solid #e8e8e8;
  background: #ffffff;
  justify-content: flex-start;
  padding: 0 18px;
  transition: all 0.3s ease;

  &:hover {
    border-color: #ffb8a8;
    background: linear-gradient(135deg, #fff8f6 0%, #fff 100%);
    box-shadow: 0 2px 12px rgba(255, 107, 107, 0.08);
  }

  &.has-value {
    border-color: #ff6b6b;
    background: linear-gradient(135deg, #fff8f6 0%, #fff 100%);
  }
}

.btn-icon {
  color: #ff8e53;
  margin-right: 10px;
  font-size: 18px;
}

.btn-text {
  color: #666;
  font-size: 15px;
  flex: 1;
  text-align: left;
}

.has-value .btn-text {
  color: #333;
  font-weight: 500;
}

.check-icon {
  color: #52c41a;
  font-size: 18px;
  margin-left: 8px;
}

@media screen and (max-width: 768px) {
  .date-picker-btn {
    height: 44px;
    padding: 0 14px;
  }

  .btn-text {
    font-size: 14px;
  }
}
</style>
