<template>
  <div class="edit-profile-page">
    <n-page-header title="编辑资料" @back="goBack" />

    <n-card class="edit-card">
      <n-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-placement="left"
        label-width="80"
      >
        <n-form-item label="头像">
          <n-upload
            :max="1"
            accept="image/*"
            :custom-request="handleUpload"
            :show-file-list="false"
          >
            <n-avatar :size="80" :src="formData.avatar">
              <template #fallback>
                <n-icon :size="40" :component="UserOutlined" />
              </template>
            </n-avatar>
            <n-button style="margin-left: 16px">更换头像</n-button>
          </n-upload>
        </n-form-item>

        <n-form-item label="用户名" path="username">
          <n-input
            v-model:value="formData.username"
            placeholder="请输入用户名"
            maxlength="20"
          />
        </n-form-item>

        <n-form-item label="邮箱" path="email">
          <n-input
            v-model:value="formData.email"
            placeholder="请输入邮箱"
            disabled
          />
        </n-form-item>

        <n-form-item label="简介" path="bio">
          <n-input
            v-model:value="formData.bio"
            type="textarea"
            placeholder="介绍一下自己吧"
            maxlength="200"
            :autosize="{ minRows: 3, maxRows: 5 }"
          />
        </n-form-item>

        <n-form-item>
          <n-space>
            <n-button type="primary" :loading="saving" @click="handleSave">
              保存修改
            </n-button>
            <n-button @click="goBack">取消</n-button>
          </n-space>
        </n-form-item>
      </n-form>
    </n-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  NPageHeader,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NButton,
  NSpace,
  NAvatar,
  NIcon,
  NUpload,
  useMessage
} from 'naive-ui'
import { UserOutlined } from '@vicons/antd'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const message = useMessage()
const userStore = useUserStore()

const formRef = ref(null)
const saving = ref(false)

const formData = reactive({
  avatar: '',
  username: '',
  email: '',
  bio: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度应在2-20个字符之间', trigger: 'blur' }
  ]
}

onMounted(async () => {
  // 路由守卫已处理认证检查，这里直接获取用户信息
  const result = await userStore.fetchUserInfo()

  // 如果获取用户信息失败且是 401 错误，API 层已自动处理跳转
  if (!result?.success && result?.error?.includes('401')) {
    return
  }

  const user = userStore.userInfo
  if (user) {
    formData.avatar = user.avatar || ''
    formData.username = user.username || ''
    formData.email = user.email || ''
    formData.bio = user.bio || ''
  }
})

const handleUpload = async ({ file }) => {
  try {
    const formDataObj = new FormData()
    formDataObj.append('file', file.file)
    const result = await userStore.uploadAvatar(formDataObj)
    if (result.success) {
      formData.avatar = result.url
      message.success('头像上传成功')
    }
  } catch (error) {
    message.error('上传失败')
  }
}

const handleSave = async () => {
  try {
    await formRef.value?.validate()
    saving.value = true

    const result = await userStore.updateProfile({
      username: formData.username,
      bio: formData.bio,
      avatar: formData.avatar
    })

    if (result.success) {
      message.success('保存成功')
      router.push('/profile')
    } else {
      message.error(result.error || '保存失败')
    }
  } catch (error) {
    message.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const goBack = () => {
  router.back()
}
</script>

<style scoped>
.edit-profile-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
  min-height: 100vh;
  background: #fcfaf2;
}

.edit-card {
  margin-top: 24px;
  border-radius: 16px;
}
</style>
