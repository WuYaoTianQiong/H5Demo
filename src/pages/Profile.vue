<template>
  <div class="profile-page">
    <!-- 页面加载状态 -->
    <div v-if="loading" class="page-loading">
      <n-spin size="large" />
      <span class="loading-text">加载中...</span>
    </div>

    <template v-else>
      <!-- 退出登录确认弹窗 -->
      <ConfirmModal
        v-model:show="showLogoutModal"
        title="确认退出"
        content="确定要退出登录吗？"
        confirm-text="退出"
        cancel-text="取消"
        @confirm="executeLogout"
      />
      <!-- 顶部导航栏 -->
      <div class="hero">
        <div class="responsive-container hero-inner">
          <div class="hero-left-section">
            <n-button class="back-btn" circle @click="goBack">
              <template #icon>
                <n-icon><ArrowLeftOutlined /></n-icon>
              </template>
            </n-button>
          </div>
          <div class="hero-center">
            <span class="hero-title">个人中心</span>
          </div>
          <div class="hero-right-section"></div>
        </div>
      </div>

      <div class="responsive-container main-content">
        <!-- 用户信息卡片 -->
        <div class="user-card">
          <div class="user-avatar">
            <n-icon :component="UserOutlined" :size="48" />
          </div>
          <div v-if="userStore.userInfo" class="user-details">
            <div class="user-name">{{ userStore.userInfo.username || userStore.userInfo.email }}</div>
            <div class="user-email">{{ userStore.userInfo.email }}</div>
          </div>
          <div v-else class="user-details">
            <div class="user-name">未登录</div>
            <div class="user-email">登录后查看更多信息</div>
          </div>
        </div>

        <!-- 统计区域 -->
        <div v-if="userStore.userInfo" class="stats-card">
          <div class="stat-item">
            <span class="stat-value">{{ userStore.userInfo.tripCount || 0 }}</span>
            <span class="stat-label">我的行程</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ userStore.userInfo.favoriteCount || 0 }}</span>
            <span class="stat-label">收藏</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ userStore.userInfo.viewCount || 0 }}</span>
            <span class="stat-label">浏览</span>
          </div>
        </div>

        <!-- 菜单列表 -->
        <div class="menu-card">
          <div class="menu-item" @click="handleEditProfile">
            <div class="menu-item-left">
              <div class="menu-icon edit">
                <n-icon :component="EditOutlined" :size="20" />
              </div>
              <span class="menu-title">编辑资料</span>
            </div>
            <n-icon :component="RightOutlined" :size="16" class="menu-arrow" />
          </div>

          <div class="menu-item" @click="handleMyTrips">
            <div class="menu-item-left">
              <div class="menu-icon trip">
                <n-icon :component="CompassOutlined" :size="20" />
              </div>
              <span class="menu-title">我的行程</span>
            </div>
            <n-icon :component="RightOutlined" :size="16" class="menu-arrow" />
          </div>

          <div class="menu-item" @click="handleFavorites">
            <div class="menu-item-left">
              <div class="menu-icon fav">
                <n-icon :component="StarOutlined" :size="20" />
              </div>
              <span class="menu-title">我的收藏</span>
            </div>
            <n-icon :component="RightOutlined" :size="16" class="menu-arrow" />
          </div>

          <div class="menu-item" @click="handleSettings">
            <div class="menu-item-left">
              <div class="menu-icon setting">
                <n-icon :component="SettingOutlined" :size="20" />
              </div>
              <span class="menu-title">设置</span>
            </div>
            <n-icon :component="RightOutlined" :size="16" class="menu-arrow" />
          </div>

          <div class="menu-item logout" @click="handleLogout">
            <div class="menu-item-left">
              <div class="menu-icon logout-icon">
                <n-icon :component="LogoutOutlined" :size="20" />
              </div>
              <span class="menu-title">退出登录</span>
            </div>
            <n-icon :component="RightOutlined" :size="16" class="menu-arrow" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  NSpin,
  NIcon,
  NButton,
  useMessage
} from 'naive-ui'
import {
  ArrowLeftOutlined,
  UserOutlined,
  EditOutlined,
  CompassOutlined,
  StarOutlined,
  SettingOutlined,
  LogoutOutlined,
  RightOutlined
} from '@vicons/antd'
import { useUserStore } from '@/stores/user'
import ConfirmModal from '@/components/ConfirmModal.vue'

const router = useRouter()
const message = useMessage()
const userStore = useUserStore()

const loading = ref(false)
const showLogoutModal = ref(false)

onMounted(async () => {
  // 路由守卫已处理认证检查，这里直接获取用户信息
  loading.value = true
  const result = await userStore.fetchUserInfo()
  loading.value = false

  // 如果获取用户信息失败且是 401 错误，API 层已自动处理跳转
  if (!result?.success && result?.error?.includes('401')) {
    return
  }
})

const goBack = () => {
  router.back()
}

const handleEditProfile = () => {
  router.push('/profile/edit')
}

const handleMyTrips = () => {
  router.push('/')
}

const handleFavorites = () => {
  message.info('收藏功能开发中...')
}

const handleSettings = () => {
  message.info('设置功能开发中...')
}

const handleLogout = () => {
  showLogoutModal.value = true
}

const executeLogout = async () => {
  await userStore.logout()
  message.success('已退出登录')
  router.push('/login')
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: var(--u-bg-color);
  display: flex;
  flex-direction: column;
}

.page-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: var(--u-bg-color);
  z-index: 100;
}

.loading-text {
  color: #666;
  font-size: 14px;
}

/* 顶部导航栏 - 完全参考 Home.vue */
.hero {
  padding: 12px 0;
  background: linear-gradient(135deg, var(--u-type-primary), var(--u-type-warning));
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;
  box-shadow: 0 6px 16px rgba(255, 107, 107, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255, 0.1) 0%, transparent 70%);
  pointer-events: none;
}

.hero-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  position: relative;
  padding: 0 max(var(--tg-spacing-screen), 16px);
}

.hero-left-section {
  display: flex;
  align-items: center;
  z-index: 1;
  flex: 1;
  margin-left: 8px;
}

.hero-center {
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 1;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.hero-title {
  font-size: var(--tg-font-size-h1);
  font-weight: 800;
  color: #ffffff;
  line-height: 1.2;
  letter-spacing: 0.5px;
  text-align: center;
}

.hero-right-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  z-index: 1;
  margin-right: 8px;
}

.back-btn {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 24px;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

/* 主内容区 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 16px;
}

/* 用户信息卡片 - 白色卡片风格 */
.user-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.user-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--u-type-primary), var(--u-type-warning));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  flex-shrink: 0;
}

.user-details {
  flex: 1;
}

.user-name {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.user-email {
  font-size: 14px;
  color: #999;
}

/* 统计卡片 */
.stats-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  justify-content: space-around;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--u-type-primary);
}

.stat-label {
  font-size: 12px;
  color: #999;
}

/* 菜单卡片 */
.menu-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.menu-item:hover {
  background: #f5f5f5;
}

.menu-item-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.menu-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
}

.menu-icon.edit {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.menu-icon.trip {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.menu-icon.fav {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.menu-icon.setting {
  background: linear-gradient(135deg, #30cfd0 0%, #330867 100%);
}

.menu-icon.logout-icon {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
}

.menu-title {
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

.menu-arrow {
  color: #ccc;
}

.menu-item.logout .menu-title {
  color: #ff6b6b;
}
</style>
