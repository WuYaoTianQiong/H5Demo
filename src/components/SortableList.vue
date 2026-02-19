<template>
  <div class="sortable-list">
    <div :id="listId" class="sortable-container">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import Sortable from 'sortablejs'

const props = defineProps({
  listId: {
    type: String,
    default: 'sortable-list'
  }
})

const emit = defineEmits(['start', 'end', 'change', 'choose'])

const sortableInstance = ref(null)

const initSortable = () => {
  const container = document.getElementById(props.listId || 'sortable-list')
  if (!container) {
    setTimeout(() => initSortable(), 100)
    return
  }

  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  sortableInstance.value = new Sortable(container, {
    animation: 200,
    delay: isTouchDevice ? 300 : 0,
    delayOnTouchOnly: true,
    touchStartThreshold: 5,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    draggable: '.sortable-item',
    onChoose: (evt) => {
      emit('choose', { oldIndex: evt.oldIndex })
    },
    onStart: (evt) => {
      emit('start', { oldIndex: evt.oldIndex })
    },
    onEnd: (evt) => {
      emit('end', {
        oldIndex: evt.oldIndex,
        newIndex: evt.newIndex
      })
      if (evt.oldIndex !== evt.newIndex) {
        emit('change', {
          oldIndex: evt.oldIndex,
          newIndex: evt.newIndex
        })
      }
    }
  })
}

const destroySortable = () => {
  if (sortableInstance.value) {
    sortableInstance.value.destroy()
    sortableInstance.value = null
  }
}

watch(() => props.listId, (newId, oldId) => {
  if (newId !== oldId) {
    destroySortable()
    nextTick(() => initSortable())
  }
})

onMounted(() => {
  nextTick(() => initSortable())
})

onUnmounted(() => {
  destroySortable()
})
</script>

<style scoped>
.sortable-list {
  width: 100%;
}

.sortable-container {
  position: relative;
}
</style>
