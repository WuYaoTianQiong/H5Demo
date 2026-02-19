<template>
  <n-config-provider :theme-overrides="themeOverrides" :locale="zhCN" :date-locale="dateZhCN">
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <router-view />
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NNotificationProvider,
  zhCN,
  dateZhCN
} from 'naive-ui'
import { themeOverrides } from '@/config/theme.js'
</script>

<style>
html,
body,
#app {
  margin: 0;
  padding: 0;
  height: 100%;
  background-color: #fcfaf2;
  color: #2d3436;
  font-family: "PingFang SC", "Microsoft YaHei", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

#app {
  min-height: 100vh;
}

.primary-gradient {
  background: linear-gradient(135deg, var(--u-type-primary), var(--u-type-warning));
}

.primary-color {
  color: var(--u-type-primary);
}

.bg-primary {
  background-color: var(--u-type-primary);
}

@media screen and (min-width: 768px) {
  #app {
    max-width: 1200px;
    margin: 0 auto;
  }
}
</style>
