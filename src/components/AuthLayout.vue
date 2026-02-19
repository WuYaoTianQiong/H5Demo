<template>
  <div class="auth-layout">
    <div class="auth-header">
      <div class="auth-header-content">
        <div class="auth-logo" @click="goHome">
          <n-icon :size="26" color="#fff">
            <CompassOutlined />
          </n-icon>
          <span class="auth-logo-text">旅途印记</span>
        </div>
      </div>
    </div>

    <div class="auth-container">
      <div class="auth-card-wrapper">
        <n-card class="auth-card" :title="title" size="large">
          <slot />
        </n-card>
      </div>
    </div>

    <div class="auth-footer">
      <p>© 2024 旅途印记</p>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { NCard, NIcon } from 'naive-ui'
import { CompassOutlined } from '@vicons/antd'

const router = useRouter()

defineProps({
  title: {
    type: String,
    required: true
  }
})

const goHome = () => {
  router.push('/')
}
</script>

<style scoped>
.auth-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  /* 护眼米白色背景 */
  background: linear-gradient(180deg, #faf8f5 0%, #f5f2ed 100%);
}

.auth-header {
  width: 96%;
  margin: 12px auto 0;
  background: linear-gradient(135deg, #ff9a56 0%, #ff6b6b 50%, #ff8e53 100%);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(255, 107, 107, 0.25);
  position: sticky;
  top: 12px;
  z-index: 100;
  flex-shrink: 0;
}

.auth-header-content {
  width: 100%;
  padding: 14px 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 6px 14px;
  border-radius: 20px;
}

.auth-logo:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.02);
}

.auth-logo-text {
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.auth-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
  width: 100%;
}

.auth-card-wrapper {
  width: 96%;
  max-width: 400px;
  animation: slideUp 0.5s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.auth-card {
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.auth-card :deep(.n-card-header) {
  text-align: center;
  padding: 20px 16px 12px;
}

.auth-card :deep(.n-card-header__main) {
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.auth-card :deep(.n-card__content) {
  padding: 8px 16px 20px;
}

.auth-footer {
  text-align: center;
  padding: 16px;
  color: #999;
  font-size: 12px;
  flex-shrink: 0;
}

.auth-footer p {
  margin: 0;
}

/* 平板适配 */
@media screen and (min-width: 481px) and (max-width: 768px) {
  .auth-card-wrapper {
    width: 96%;
    max-width: 420px;
  }
}

/* PC端适配 */
@media screen and (min-width: 769px) {
  .auth-card-wrapper {
    width: 96%;
    max-width: 440px;
  }
}
</style>
