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
        <div class="card-header">
          <h2 class="card-title">重置密码</h2>
          <p class="card-subtitle">设置您的新密码</p>
        </div>

        <n-form ref="formRef" class="auth-form" :model="formData" :rules="rules" :show-label="false">
          <n-form-item path="password">
            <div class="input-wrapper">
              <div class="input-icon">
                <n-icon :size="18" color="#ff8e53"><LockOutlined /></n-icon>
              </div>
              <n-input 
                v-model:value="formData.password" 
                :type="showPassword ? 'text' : 'password'" 
                placeholder="请输入新密码"
              >
                <template #suffix>
                  <n-icon 
                    :size="18" 
                    :component="showPassword ? EyeOutlined : EyeInvisibleOutlined"
                    @click="togglePassword('password')"
                    style="cursor: pointer; color: #999;"
                  />
                </template>
              </n-input>
            </div>
          </n-form-item>

          <n-form-item path="confirmPassword">
            <div class="input-wrapper">
              <div class="input-icon">
                <n-icon :size="18" color="#ff8e53"><SafetyOutlined /></n-icon>
              </div>
              <n-input 
                v-model:value="formData.confirmPassword" 
                :type="showConfirmPassword ? 'text' : 'password'" 
                placeholder="请确认新密码"
                @keyup.enter="handleSubmit"
              >
                <template #suffix>
                  <n-icon 
                    :size="18" 
                    :component="showConfirmPassword ? EyeOutlined : EyeInvisibleOutlined"
                    @click="togglePassword('confirm')"
                    style="cursor: pointer; color: #999;"
                  />
                </template>
              </n-input>
            </div>
          </n-form-item>

          <n-form-item style="margin-top: 16px;">
            <n-button type="primary" block class="auth-btn" :loading="loading" @click="handleSubmit">
              <template #icon><n-icon :size="18"><CheckCircleOutlined /></n-icon></template>
              确认重置
            </n-button>
          </n-form-item>
        </n-form>
      </div>
    </div>

    <div class="auth-footer"><p>© 2024 旅途印记</p></div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NForm, NFormItem, NInput, NButton, NIcon, useMessage } from 'naive-ui'
import { CompassOutlined, LockOutlined, SafetyOutlined, CheckCircleOutlined, EyeOutlined, EyeInvisibleOutlined } from '@vicons/antd'
import { authApi } from '@/services/api'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const formRef = ref(null)
const loading = ref(false)
const token = ref('')
const formData = reactive({ password: '', confirmPassword: '' })
const showPassword = ref(false)
const showConfirmPassword = ref(false)

const togglePassword = (type) => {
  if (type === 'password') {
    showPassword.value = !showPassword.value
  } else {
    showConfirmPassword.value = !showConfirmPassword.value
  }
}

const validatePasswordSame = (rule, value) => value === formData.password

const rules = {
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validatePasswordSame, message: '两次输入的密码不一致', trigger: 'blur' }
  ]
}

onMounted(() => {
  token.value = route.query.token || ''
  if (!token.value) {
    message.error('无效的重置链接')
    router.push('/login')
  }
})

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    loading.value = true
    await authApi.resetPassword({ token: token.value, newPassword: formData.password })
    message.success('密码重置成功，请登录')
    router.push('/login')
  } catch (error) {
    message.error(error.message || '重置失败')
  } finally {
    loading.value = false
  }
}

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

.auth-card { width: 100%; max-width: 400px; background: rgba(255, 255, 255, 0.98); border-radius: 18px; padding: 24px 20px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15); animation: slideUp 0.4s ease-out; }

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.card-header { text-align: center; margin-bottom: 20px; }

.card-title { font-size: 22px; font-weight: 700; margin: 0 0 4px; background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

.card-subtitle { font-size: 13px; color: #999; margin: 0; }

.auth-form { width: 100%; }
.auth-form :deep(.n-form-item) { margin-bottom: 0; }

.input-wrapper { display: flex; align-items: center; width: 100%; background: #f8f9fa; border: 1.5px solid #f0f0f0; border-radius: 10px; padding: 0 12px; transition: all 0.3s ease; box-sizing: border-box; }

.input-wrapper:hover { border-color: #ffccbc; background: #fff; }
.input-wrapper:focus-within { border-color: #ff6b6b; background: #fff; box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1); }

.input-icon { width: 32px; height: 44px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

.input-wrapper :deep(.n-input) { flex: 1; background: transparent !important; }

.input-wrapper :deep(.n-input .n-input__wrapper),
.input-wrapper :deep(.n-input .n-input__wrapper--focused),
.input-wrapper :deep(.n-input .n-input__wrapper--hovered) {
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
  outline: none !important;
}

.input-wrapper :deep(.n-input .n-input__border),
.input-wrapper :deep(.n-input .n-input__state-border) {
  display: none !important;
  border: none !important;
  box-shadow: none !important;
}

.input-wrapper :deep(.n-input .n-input__input-el) { height: 44px; font-size: 15px; padding: 0; background: transparent; }

.input-wrapper :deep(.n-input .n-input__placeholder) { color: #bbb; font-size: 14px; }

/* 密码眼睛图标样式 - 确保可点击 */
.input-wrapper :deep(.n-input .n-input__suffix) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  padding: 0 8px !important;
  color: #999 !important;
  transition: color 0.3s ease !important;
  pointer-events: auto !important;
  z-index: 10 !important;
}

.input-wrapper :deep(.n-input .n-input__suffix:hover) {
  color: #ff6b6b !important;
}

.input-wrapper :deep(.n-input .n-base-icon) {
  cursor: pointer !important;
  pointer-events: auto !important;
}

.input-wrapper :deep(.n-input__eye) {
  cursor: pointer !important;
  pointer-events: auto !important;
}

.auth-btn { height: 46px; font-size: 16px; font-weight: 600; border-radius: 10px; background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%); border: none; box-shadow: 0 4px 15px rgba(255, 107, 107, 0.35); transition: all 0.3s ease; }

.auth-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(255, 107, 107, 0.45); }
.auth-btn:active { transform: translateY(0); }

.auth-footer { text-align: center; padding: 16px; position: relative; z-index: 1; flex-shrink: 0; }

.auth-footer p { font-size: 12px; color: rgba(255, 255, 255, 0.8); margin: 0; }

@media screen and (max-height: 700px) {
  .auth-header { padding: 24px 0 16px; }
  .logo-icon { width: 48px; height: 48px; }
  .logo-text { font-size: 22px; }
  .auth-card { padding: 20px 18px; }
  .card-title { font-size: 20px; }
}

@media screen and (max-height: 600px) {
  .auth-header { padding: 16px 0 12px; }
  .logo-icon { width: 44px; height: 44px; }
  .logo-text { font-size: 20px; }
  .auth-card { padding: 18px 16px; }
  .card-header { margin-bottom: 16px; }
}

@media screen and (min-width: 768px) {
  .auth-card { max-width: 420px; padding: 32px 28px; }
}
</style>
