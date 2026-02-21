<template>
  <button
    type="button"
    class="btn-step"
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
