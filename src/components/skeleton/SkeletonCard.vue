<template>
  <div class="skeleton-card">
    <div v-if="showImage" class="skeleton-image"></div>
    <div class="skeleton-content">
      <div class="skeleton-title"></div>
      <div class="skeleton-meta">
        <div class="skeleton-meta-item"></div>
        <div class="skeleton-meta-item"></div>
      </div>
      <div v-if="showTags" class="skeleton-tags">
        <div class="skeleton-tag"></div>
        <div class="skeleton-tag"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  showImage?: boolean
  showTags?: boolean
}>(), {
  showImage: true,
  showTags: true
})
</script>

<style scoped>
.skeleton-card {
  background: var(--bg-primary);
  border-radius: var(--card-radius);
  overflow: hidden;
  box-shadow: var(--shadow-md);
}

.skeleton-image {
  width: 100%;
  height: 160px;
  background: linear-gradient(90deg, var(--border-light) 25%, var(--border-color) 50%, var(--border-light) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-title {
  width: 80%;
  height: 20px;
  background: linear-gradient(90deg, var(--border-light) 25%, var(--border-color) 50%, var(--border-light) 75%);
  background-size: 200% 100%;
  border-radius: 4px;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-meta {
  display: flex;
  gap: 16px;
}

.skeleton-meta-item {
  width: 60px;
  height: 14px;
  background: linear-gradient(90deg, var(--border-light) 25%, var(--border-color) 50%, var(--border-light) 75%);
  background-size: 200% 100%;
  border-radius: 4px;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-tags {
  display: flex;
  gap: 8px;
}

.skeleton-tag {
  width: 50px;
  height: 24px;
  background: linear-gradient(90deg, var(--border-light) 25%, var(--border-color) 50%, var(--border-light) 75%);
  background-size: 200% 100%;
  border-radius: var(--radius-lg);
  animation: skeleton-loading 1.5s infinite;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
