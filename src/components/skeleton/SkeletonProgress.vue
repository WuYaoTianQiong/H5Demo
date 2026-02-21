<template>
  <div class="skeleton-progress">
    <div class="skeleton-progress-label"></div>
    <div class="skeleton-progress-bar"></div>
    <div class="skeleton-progress-count"></div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.skeleton-progress {
  background: var(--bg-primary);
  border-radius: var(--card-radius);
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.skeleton-progress-label {
  width: 60px;
  height: 16px;
  background: linear-gradient(90deg, var(--border-light) 25%, var(--border-color) 50%, var(--border-light) 75%);
  background-size: 200% 100%;
  border-radius: 4px;
  animation: skeleton-loading 1.5s infinite;
  flex-shrink: 0;
}

.skeleton-progress-bar {
  flex: 1;
  height: 6px;
  background: linear-gradient(90deg, var(--border-light) 25%, var(--border-color) 50%, var(--border-light) 75%);
  background-size: 200% 100%;
  border-radius: 3px;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-progress-count {
  width: 40px;
  height: 16px;
  background: linear-gradient(90deg, var(--border-light) 25%, var(--border-color) 50%, var(--border-light) 75%);
  background-size: 200% 100%;
  border-radius: 4px;
  animation: skeleton-loading 1.5s infinite;
  flex-shrink: 0;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
