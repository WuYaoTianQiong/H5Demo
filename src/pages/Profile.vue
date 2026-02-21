<template>
  <div class="profile-page">
    <PageLoading v-if="loading" text="加载中..." />

    <template v-else>
      <ConfirmModal
        v-model:show="showLogoutModal"
        title="确认退出"
        content="确定要退出登录吗？"
        confirm-text="退出"
        cancel-text="取消"
        @confirm="executeLogout"
      />

      <PageHeader title="个人中心" show-back @back="goBack" />

      <div class="responsive-container main-content">
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
import { NIcon, useMessage } from 'naive-ui'
import {
  UserOutlined,
  EditOutlined,
  CompassOutlined,
  StarOutlined,
  SettingOutlined,
  LogoutOutlined,
  RightOutlined
} from '@vicons/antd'
import { useUserStore } from '@/stores/user'
import PageHeader from '@/components/PageHeader.vue'
import PageLoading from '@/components/PageLoading.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'

const router = useRouter()
const message = useMessage()
const userStore = useUserStore()

const loading = ref(false)
const showLogoutModal = ref(false)

onMounted(async () => {
  loading.value = true
  const result = await userStore.fetchUserInfo()
  loading.value = false

  if (!result?.success && result?.error?.includes('401')) {
    return
  }
})

const goBack = () => router.back()
const handleEditProfile = () => router.push('/profile/edit')
const handleMyTrips = () => router.push('/')
const handleFavorites = () => message.info('收藏功能开发中...')
const handleSettings = () => message.info('设置功能开发中...')
const handleLogout = () => { showLogoutModal.value = true }

const executeLogout = async () => {
  await userStore.logout()
  message.success('已退出登录')
  router.push('/login')
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: var(--bg-body);
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 16px;
}

.user-card {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-sm);
}

.user-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--primary-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bg-primary);
  flex-shrink: 0;
}

.user-details {
  flex: 1;
}

.user-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.user-email {
  font-size: 14px;
  color: var(--text-muted);
}

.stats-card {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  justify-content: space-around;
  box-shadow: var(--shadow-sm);
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
  color: var(--primary-color);
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
}

.menu-card {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: 8px;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-sm);
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
}

.menu-item:hover {
  background: var(--bg-tertiary);
}

.menu-item-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.menu-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bg-primary);
}

.menu-icon.edit { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.menu-icon.trip { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.menu-icon.fav { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.menu-icon.setting { background: linear-gradient(135deg, #30cfd0 0%, #330867 100%); }
.menu-icon.logout-icon { background: var(--primary-gradient); }

.menu-title {
  font-size: 15px;
  color: var(--text-primary);
  font-weight: 500;
}

.menu-arrow {
  color: var(--text-muted);
}

.menu-item.logout .menu-title {
  color: var(--primary-color);
}
</style>
