<template>
  <div class="auth-page">
    <div class="bg-decoration">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
      <div class="circle circle-3"></div>
    </div>

    <div class="auth-header">
      <div class="logo-wrapper" @click="goHome">
        <div class="logo-icon">
          <n-icon :size="36" color="#fff">
            <CompassOutlined />
          </n-icon>
        </div>
        <span class="logo-text">旅途印记</span>
      </div>
    </div>

    <div class="auth-card-wrapper">
      <div class="auth-card">
        <div class="verify-content">
          <n-spin :show="loading">
            <template v-if="verified">
              <div class="verify-icon success">
                <n-icon :size="64" color="#19be6b"><CheckCircleOutlined /></n-icon>
              </div>
              <h2 class="verify-title">验证成功</h2>
              <p class="verify-desc">您的邮箱已成功验证</p>
              <n-button type="primary" class="verify-btn" @click="goToLogin">去登录</n-button>
            </template>

            <template v-else-if="error">
              <div class="verify-icon error">
                <n-icon :size="64" color="#fa3534"><CloseCircleOutlined /></n-icon>
              </div>
              <h2 class="verify-title">验证失败</h2>
              <p class="verify-desc">{{ error }}</p>
              <n-button class="verify-btn secondary" @click="goToLogin">返回登录</n-button>
            </template>

            <template v-else>
              <div class="verify-icon loading">
                <n-icon :size="64" color="#ff6b6b"><MailOutlined /></n-icon>
              </div>
              <h2 class="verify-title">正在验证...</h2>
              <p class="verify-desc">请稍候，正在验证您的邮箱</p>
            </template>
          </n-spin>
        </div>
      </div>
    </div>

    <div class="auth-footer"><p>© 2024 旅途印记</p></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NSpin, NIcon, NButton, useMessage } from 'naive-ui'
import { CompassOutlined, CheckCircleOutlined, CloseCircleOutlined, MailOutlined } from '@vicons/antd'
import { authApi } from '@/services/api'

const router = useRouter()
const route = useRoute()
const message = useMessage()

const loading = ref(true)
const verified = ref(false)
const error = ref('')

onMounted(async () => {
  const token = route.query.token || ''
  if (!token) {
    error.value = '无效的验证链接'
    loading.value = false
    return
  }

  try {
    await authApi.verifyEmail({ token })
    verified.value = true
  } catch (err) {
    error.value = err.message || '验证失败'
  } finally {
    loading.value = false
  }
})

const goToLogin = () => router.push('/login')
const goHome = () => router.push('/')
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #ff9a56 0%, #ff6b6b 50%, #ff8e53 100%);
  position: relative;
  overflow: hidden;
}

.bg-decoration { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }

.circle { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.08); }
.circle-1 { width: 200px; height: 200px; top: -60px; right: -60px; animation: float 6s ease-in-out infinite; }
.circle-2 { width: 120px; height: 120px; bottom: 20%; left: -30px; animation: float 8s ease-in-out infinite reverse; }
.circle-3 { width: 80px; height: 80px; top: 30%; right: 5%; animation: float 7s ease-in-out infinite; }

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-15px) scale(1.05); }
}

.auth-header { text-align: center; padding: 40px 0 20px; position: relative; z-index: 1; flex-shrink: 0; }

.logo-wrapper { display: inline-flex; align-items: center; gap: 12px; cursor: pointer; transition: all 0.3s ease; padding: 10px 20px; border-radius: 40px; }
.logo-wrapper:hover { transform: scale(1.05); background: rgba(255, 255, 255, 0.15); }

.logo-icon { width: 56px; height: 56px; background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid rgba(255, 255, 255, 0.3); }

.logo-text { font-size: 26px; font-weight: 800; color: #fff; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2); letter-spacing: 2px; }

.auth-card-wrapper { flex: 1; display: flex; align-items: center; justify-content: center; padding: 10px 2% 20px; position: relative; z-index: 1; }

.auth-card { width: 100%; max-width: 400px; background: rgba(255, 255, 255, 0.98); border-radius: 18px; padding: 40px 24px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15); animation: slideUp 0.4s ease-out; }

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.verify-content { text-align: center; }

.verify-icon { margin-bottom: 20px; display: flex; justify-content: center; }

.verify-title { font-size: 22px; font-weight: 700; margin: 0 0 8px; color: #333; }

.verify-desc { font-size: 14px; color: #666; margin: 0 0 24px; }

.verify-btn { min-width: 140px; height: 44px; font-size: 15px; font-weight: 600; border-radius: 10px; }

.verify-btn:not(.secondary) { background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%); border: none; box-shadow: 0 4px 15px rgba(255, 107, 107, 0.35); }

.verify-btn.secondary { border: 1.5px solid #ffccbc; color: #ff6b6b; background: transparent; }

.auth-footer { text-align: center; padding: 16px; position: relative; z-index: 1; flex-shrink: 0; }

.auth-footer p { font-size: 12px; color: rgba(255, 255, 255, 0.8); margin: 0; }

@media screen and (max-height: 700px) {
  .auth-header { padding: 24px 0 16px; }
  .logo-icon { width: 48px; height: 48px; }
  .logo-text { font-size: 22px; }
  .auth-card { padding: 32px 20px; }
  .verify-title { font-size: 20px; }
}

@media screen and (max-height: 600px) {
  .auth-header { padding: 16px 0 12px; }
  .logo-icon { width: 44px; height: 44px; }
  .logo-text { font-size: 20px; }
  .auth-card { padding: 24px 16px; }
  .verify-icon { margin-bottom: 16px; }
  .verify-desc { margin-bottom: 20px; }
}

@media screen and (min-width: 768px) {
  .auth-card { max-width: 420px; padding: 48px 32px; }
}
</style>
