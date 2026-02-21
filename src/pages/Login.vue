<template>
  <div class="login-page">
    <div class="bg-decoration">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
      <div class="circle circle-3"></div>
    </div>

    <div class="login-header">
      <div class="logo-wrapper" @click="goHome">
        <div class="logo-icon">
          <n-icon :size="36" color="#fff">
            <CompassOutlined />
          </n-icon>
        </div>
        <span class="logo-text">旅途印记</span>
      </div>
    </div>

    <div class="login-card-wrapper">
      <div class="card-auth">
        <div class="card-header">
          <h2 class="card-title">欢迎回来</h2>
          <p class="card-subtitle">请登录您的账号</p>
        </div>

        <n-form
          ref="formRef"
          class="login-form"
          :model="formData"
          :rules="rules"
          :show-label="false"
        >
          <n-form-item path="email">
            <div class="input-wrapper">
              <div class="input-icon">
                <n-icon :size="18" color="var(--primary-light)">
                  <MailOutlined />
                </n-icon>
              </div>
              <n-input
                v-model:value="formData.email"
                placeholder="请输入邮箱"
                @keyup.enter="handleLogin"
              />
            </div>
          </n-form-item>

          <n-form-item path="password">
            <div class="input-wrapper">
              <div class="input-icon">
                <n-icon :size="18" color="var(--primary-light)">
                  <LockOutlined />
                </n-icon>
              </div>
              <n-input
                v-model:value="formData.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入密码"
                @keyup.enter="handleLogin"
              >
                <template #suffix>
                  <n-icon
                    :size="18"
                    :component="showPassword ? EyeOutlined : EyeInvisibleOutlined"
                    @click="togglePassword"
                    style="cursor: pointer; color: var(--text-muted);"
                  />
                </template>
              </n-input>
            </div>
          </n-form-item>

          <div class="form-options">
            <n-checkbox v-model:checked="rememberMe" class="remember-checkbox">
              <span class="checkbox-text">记住我</span>
            </n-checkbox>
            <n-button text class="forgot-link" @click="goToForgotPassword">
              忘记密码？
            </n-button>
          </div>

          <n-form-item>
            <n-button
              type="primary"
              block
              class="btn-primary btn-xl"
              :loading="userStore.loading"
              @click="handleLogin"
            >
              <template #icon>
                <n-icon :size="18">
                  <LoginOutlined />
                </n-icon>
              </template>
              立即登录
            </n-button>
          </n-form-item>
        </n-form>

        <div class="divider">
          <span class="divider-text">还没有账号？</span>
        </div>

        <n-button block class="register-btn" @click="goToRegister">
          创建新账号
        </n-button>
      </div>
    </div>

    <div class="login-footer">
      <p>© 2024 旅途印记</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NForm, NFormItem, NInput, NButton, NCheckbox, NIcon, useMessage } from 'naive-ui'
import { CompassOutlined, MailOutlined, LockOutlined, LoginOutlined, EyeOutlined, EyeInvisibleOutlined } from '@vicons/antd'
import { useUserStore } from '@/stores/user'
import { getItem } from '@/utils/storage'

const router = useRouter()
const message = useMessage()
const userStore = useUserStore()

const formRef = ref(null)
const rememberMe = ref(false)
const showPassword = ref(false)

const formData = reactive({ email: '', password: '' })

onMounted(() => {
  const savedEmail = getItem('savedEmail')
  const rememberMeValue = getItem('rememberMe')
  if (savedEmail && rememberMeValue === 'true') {
    formData.email = savedEmail
    rememberMe.value = true
  }
})

const togglePassword = () => {
  showPassword.value = !showPassword.value
}

const rules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  try {
    await formRef.value?.validate()
    const result = await userStore.login({
      email: formData.email,
      password: formData.password,
      rememberMe: rememberMe.value
    })
    if (result.success) {
      message.success('登录成功')
      router.push('/')
    } else {
      message.error(result.error || '登录失败')
    }
  } catch (error) {
    console.error('登录出错:', error)
  }
}

const goToRegister = () => router.push('/register')
const goToForgotPassword = () => router.push('/forgot-password')
const goHome = () => router.push('/')
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, var(--primary-light) 0%, var(--primary-color) 50%, var(--primary-light) 100%);
  position: relative;
  overflow: hidden;
}

.bg-decoration {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}

.circle-1 { width: 200px; height: 200px; top: -60px; right: -60px; animation: float 6s ease-in-out infinite; }
.circle-2 { width: 120px; height: 120px; bottom: 20%; left: -30px; animation: float 8s ease-in-out infinite reverse; }
.circle-3 { width: 80px; height: 80px; top: 30%; right: 5%; animation: float 7s ease-in-out infinite; }

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-15px) scale(1.05); }
}

.login-header {
  text-align: center;
  padding: 40px 0 20px;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all var(--transition-base);
  padding: 10px 20px;
  border-radius: 40px;
}

.logo-wrapper:hover {
  transform: scale(1.05);
  background: rgba(255, 255, 255, 0.15);
}

.logo-icon {
  width: 56px;
  height: 56px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.logo-text {
  font-size: 26px;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  letter-spacing: 2px;
}

.login-card-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 2% 20px;
  position: relative;
  z-index: 1;
}

.card-header {
  text-align: center;
  margin-bottom: 20px;
}

.card-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 4px;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.card-subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
}

.login-form { width: 100%; }
.login-form :deep(.n-form-item) { margin-bottom: 0; }

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 12px 0 16px;
}

.remember-checkbox { --n-color-checked: var(--primary-color); --n-border-checked: var(--primary-color); }
.checkbox-text { font-size: 14px; color: var(--text-tertiary); margin-left: 4px; }

.forgot-link {
  font-size: 14px;
  color: var(--primary-color);
  font-weight: 500;
  position: relative;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all var(--transition-base);
}

.forgot-link:hover { background: rgba(255, 107, 107, 0.1); }
.forgot-link::after {
  content: '';
  position: absolute;
  bottom: 2px;
  left: 8px;
  right: 8px;
  height: 2px;
  background: var(--primary-gradient);
  transform: scaleX(0);
  transition: transform var(--transition-base);
  border-radius: 1px;
}
.forgot-link:hover::after { transform: scaleX(1); }

.divider {
  display: flex;
  align-items: center;
  margin: 12px 0;
}

.divider::before, .divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, #e0e0e0);
}
.divider::after { background: linear-gradient(90deg, #e0e0e0, transparent); }

.divider-text {
  padding: 0 12px;
  font-size: 13px;
  color: var(--text-muted);
  white-space: nowrap;
}

.register-btn {
  height: 42px;
  font-size: 15px;
  font-weight: 500;
  border-radius: var(--radius-md);
  border: 1.5px solid var(--border-hover);
  color: var(--primary-color);
  background: transparent;
  transition: all var(--transition-base);
}

.register-btn:hover { border-color: var(--primary-color); background: rgba(255, 107, 107, 0.05); }

.login-footer {
  text-align: center;
  padding: 16px;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}

.login-footer p { font-size: 12px; color: rgba(255, 255, 255, 0.8); margin: 0; }

@media screen and (max-height: 700px) {
  .login-header { padding: 24px 0 16px; }
  .logo-icon { width: 48px; height: 48px; }
  .logo-text { font-size: 22px; }
  .card-auth { padding: 20px 18px; }
  .card-title { font-size: 20px; }
}

@media screen and (max-height: 600px) {
  .login-header { padding: 16px 0 12px; }
  .logo-icon { width: 44px; height: 44px; }
  .logo-text { font-size: 20px; }
  .card-auth { padding: 18px 16px; }
  .card-header { margin-bottom: 16px; }
  .form-options { margin: 12px 0 16px; }
  .divider { margin: 16px 0; }
}

@media screen and (min-width: 768px) {
  .card-auth { max-width: 420px; padding: 32px 28px; }
}
</style>
