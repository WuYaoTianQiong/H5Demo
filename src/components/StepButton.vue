<template>
  <button
    type="button"
    class="step-button"
    :class="{ 'is-disabled': disabled }"
    :disabled="disabled"
    @click="handleClick"
  >
    <slot>{{ label }}</slot>
  </button>
</template>

<script setup>
const props = defineProps({
  label: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

function handleClick(e) {
  if (!props.disabled) {
    emit('click', e)
  }
}
</script>

<style scoped>
.step-button {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1.5px solid #e8e8e8;
  background: #ffffff;
  color: #666;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  outline: none;
}

.step-button:hover:not(.is-disabled) {
  border-color: #ff6b6b;
  color: #ff6b6b;
}

.step-button:active:not(.is-disabled) {
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  border-color: transparent;
  color: #ffffff;
  transform: scale(0.9);
}

.step-button.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
