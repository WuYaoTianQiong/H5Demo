<template>
  <div class="card-section">
    <div class="card-header">
      <n-icon :component="icon" class="icon" />
      <span class="title">{{ title }}</span>
    </div>
    <div class="card-content">
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
