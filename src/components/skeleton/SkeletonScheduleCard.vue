<template>
  <div class="skeleton-schedule-card">
    <div class="skeleton-time-row">
      <div class="skeleton-time"></div>
      <div class="skeleton-weather"></div>
    </div>
    <div class="skeleton-title"></div>
    <div class="skeleton-desc"></div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.skeleton-schedule-card {
  background: var(--bg-primary);
  border-radius: var(--card-radius);
  padding: 16px;
  box-shadow: var(--shadow-sm);
}

.skeleton-time-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.skeleton-time {
  width: 50px;
  height: 18px;
  background: linear-gradient(90deg, var(--border-light) 25%, var(--border-color) 50%, var(--border-light) 75%);
  background-size: 200% 100%;
  border-radius: 4px;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-weather {
  width: 60px;
  height: 18px;
  background: linear-gradient(90deg, var(--border-light) 25%, var(--border-color) 50%, var(--border-light) 75%);
  background-size: 200% 100%;
  border-radius: 4px;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-title {
  width: 70%;
  height: 20px;
  background: linear-gradient(90deg, var(--border-light) 25%, var(--border-color) 50%, var(--border-light) 75%);
  background-size: 200% 100%;
  border-radius: 4px;
  animation: skeleton-loading 1.5s infinite;
  margin-bottom: 10px;
}

.skeleton-desc {
  width: 90%;
  height: 14px;
  background: linear-gradient(90deg, var(--border-light) 25%, var(--border-color) 50%, var(--border-light) 75%);
  background-size: 200% 100%;
  border-radius: 4px;
  animation: skeleton-loading 1.5s infinite;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
