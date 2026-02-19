# Vue3 H5 项目模板

基于 Vue 3 + Vite + Naive UI 开发的 H5 项目模板，支持 Cloudflare Pages 部署和本地后端开发。

## 技术栈

### 前端
- **框架**: Vue 3 + TypeScript
- **构建工具**: Vite 5
- **UI 组件库**: Naive UI
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **样式**: SCSS
- **其他**: qrcode (二维码)、sortablejs (拖拽排序)

### 后端（可选）
- **Cloudflare Pages Functions**: Serverless 部署
- **本地开发服务器**: Express + SQLite Cloud
- **数据库**: Cloudflare D1 / SQLite

## 项目结构

```
project/
├── src/                        # 前端代码
│   ├── components/             # 通用组件
│   │   └── trip/               # 业务组件示例（可删除）
│   ├── composables/            # 组合式函数
│   │   ├── useDevice.ts        # 设备检测
│   │   ├── useNavigation.js    # 导航工具
│   │   ├── useScrollRestore.js # 滚动恢复
│   │   └── useFormHistory.js   # 表单历史
│   ├── config/                 # 配置文件 ⭐新增
│   │   ├── index.js            # 应用配置
│   │   └── theme.js            # 主题配置
│   ├── constants/              # 常量定义
│   ├── pages/                  # 页面组件
│   ├── plugins/                # 插件
│   │   └── a11y-focus-fix.ts   # 无障碍焦点修复
│   ├── router/                 # 路由配置
│   │   └── index.ts            # 路由定义 + 认证守卫
│   ├── services/               # API 服务层
│   │   └── api.js              # 业务 API
│   ├── stores/                 # 状态管理 (Pinia)
│   │   ├── index.js            # Store 入口
│   │   ├── user.js             # 用户状态
│   │   └── app.js              # 应用状态
│   ├── styles/                 # 样式文件
│   │   ├── variables.scss      # 变量定义
│   │   ├── mixins.scss         # 混入
│   │   └── components.scss     # 组件样式
│   ├── types/                  # TypeScript 类型
│   ├── utils/                  # 工具函数
│   │   ├── http.js             # HTTP 核心封装 ⭐新增
│   │   ├── storage.js          # 本地存储封装
│   │   ├── api.js              # API 工具（兼容层）
│   │   ├── date.ts             # 日期处理
│   │   └── id-generator.js     # ID 生成器
│   ├── App.vue                 # 应用入口
│   └── main.ts                 # 主入口
├── functions/                  # Cloudflare Pages Functions (后端)
│   ├── api/                    # API 接口
│   │   ├── auth/               # 认证相关
│   │   ├── _auth.js            # 认证中间件
│   │   ├── _resp.js            # 响应工具
│   │   └── _userAuth.js        # 用户认证工具
│   ├── config/                 # 配置文件
│   │   ├── env.js              # 环境变量
│   │   └── mail.*.js           # 邮件配置
│   ├── database/               # 数据库脚本
│   │   └── sql/                # SQL 文件
│   ├── dev-server/             # 本地开发服务器
│   │   ├── server.js           # Express 服务器
│   │   └── db.js               # 数据库连接
│   └── src/                    # 后端工具函数
│       ├── id-generator.js     # ID 生成
│       └── password-crypto.js  # 密码加密
├── public/                     # 公共静态资源
│   ├── static/                 # 静态文件
│   └── _routes.json            # Cloudflare 路由配置
├── docs/                       # 项目文档
├── .dev.vars.example           # 环境变量模板
├── package.json                # 项目配置
├── vite.config.ts              # Vite 配置
├── tsconfig.json               # TypeScript 配置
└── wrangler.pages.toml         # Cloudflare Pages 配置
```

## 快速开始

### 1. 克隆并安装依赖

```bash
# 复制项目模板
cp -r this-project new-project
cd new-project

# 安装依赖
npm install
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .dev.vars.example .dev.vars

# 编辑 .dev.vars 填入实际配置
```

### 3. 启动开发服务器

```bash
# 前端开发服务器 (端口 8080)
npm run dev

# 本地后端服务器 (端口 8787) - 可选
npm run server
```

### 4. 构建生产版本

```bash
npm run build
npm run preview
```

## 架构说明

### 前端分层架构

```
┌─────────────────────────────────────────────────────────┐
│                      Pages (页面)                        │
├─────────────────────────────────────────────────────────┤
│                   Components (组件)                      │
├─────────────────────────────────────────────────────────┤
│                    Stores (状态)                         │
├─────────────────────────────────────────────────────────┤
│                  Services (业务 API)                     │
├─────────────────────────────────────────────────────────┤
│                   Utils (工具层)                         │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│   │   http.js   │  │ storage.js  │  │  date.ts    │    │
│   │ (HTTP核心)  │  │ (存储封装)  │  │ (日期工具)  │    │
│   └─────────────┘  └─────────────┘  └─────────────┘    │
├─────────────────────────────────────────────────────────┤
│                    Config (配置)                         │
└─────────────────────────────────────────────────────────┘
```

### 后端架构

```
┌─────────────────────────────────────────────────────────┐
│                   API Routes (路由)                      │
│   /api/auth/*  /api/trips/*  /api/exports/*            │
├─────────────────────────────────────────────────────────┤
│                   Middlewares (中间件)                   │
│   _auth.js (CORS)  _userAuth.js (认证)                  │
├─────────────────────────────────────────────────────────┤
│                    Core (核心层)                         │
│   _resp.js (响应)  _tripsCore.js (业务)                 │
├─────────────────────────────────────────────────────────┤
│                  Database (数据层)                       │
│   D1 (Cloudflare) / SQLite Cloud (本地)                │
└─────────────────────────────────────────────────────────┘
```

## 核心功能模块

### 认证系统
- 登录/注册/登出
- 密码加密（SHA-256 + PBKDF2）
- Token 认证
- 路由守卫
- 邮箱验证
- 密码重置

### API 服务层
- 统一请求封装
- 分层缓存（内存 + Storage）
- 请求去重
- 自动 Token 注入
- 401 自动处理
- 请求/响应拦截器

### 状态管理
- 用户状态持久化
- 响应式数据同步
- TypeScript 类型支持

## 部署方式

### 方式一：Cloudflare Pages（推荐）

1. 在 Cloudflare Dashboard 创建 D1 数据库
2. 连接 Git 仓库到 Cloudflare Pages
3. 配置构建命令：`npm run build`
4. 配置输出目录：`dist`
5. 设置环境变量

### 方式二：自定义后端

1. 修改 `vite.config.ts` 中的 `apiBaseUrl`
2. 修改 `src/services/api.js` 中的 API 路径
3. 实现自己的后端 API

## 自定义开发

### 添加新页面

1. 在 `src/pages/` 创建 Vue 组件
2. 在 `src/router/index.ts` 添加路由
3. 如需认证，确保不在白名单中

### 添加新 API

1. 在 `src/services/api.js` 添加 API 方法
2. 在 `functions/api/` 创建对应的处理函数

### 添加新 Store

1. 在 `src/stores/` 创建 Store 文件
2. 在 `src/stores/index.js` 导出

### 自定义主题

修改 `src/config/theme.js`：

```javascript
export const themeOverrides = {
  common: {
    primaryColor: '#your-color',
    // ...
  }
}
```

### 添加请求拦截器

```javascript
import { addRequestInterceptor, addResponseInterceptor } from '@/utils/http.js'

addRequestInterceptor((options, url) => {
  console.log('Request:', url)
  return options
})

addResponseInterceptor((result, response) => {
  console.log('Response:', result)
  return result
})
```

## 环境变量说明

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `VITE_AMAP_KEY` | 高德地图 JSAPI Key | 地图功能需要 |
| `VITE_AMAP_SECURITY` | 高德地图安全密钥 | 地图功能需要 |
| `VITE_API_BASE_URL` | API 基础地址 | 是 |
| `SQLITE_CLOUD_URL` | SQLite Cloud 连接 URL | 本地开发需要 |
| `EMAIL_FROM` | 发件人邮箱 | 邮件功能需要 |
| `EMAIL_API_KEY` | 邮件服务 API Key | 邮件功能需要 |

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动前端开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览构建结果 |
| `npm run server` | 启动本地后端服务器 |

## 公共模块说明

### 可直接复用的模块

| 模块 | 路径 | 说明 |
|------|------|------|
| HTTP 核心 | `src/utils/http.js` | HTTP 请求 + 缓存 + 拦截器 |
| Storage 工具 | `src/utils/storage.js` | localStorage 封装 |
| 应用配置 | `src/config/index.js` | 统一配置管理 |
| 主题配置 | `src/config/theme.js` | Naive UI 主题 |
| 用户 Store | `src/stores/user.js` | 用户状态管理 |
| 应用 Store | `src/stores/app.js` | 应用全局状态 |
| 认证中间件 | `functions/api/_auth.js` | CORS + 认证 |
| 响应工具 | `functions/api/_resp.js` | 统一响应格式 |
| ID 生成器 | `functions/src/id-generator.js` | 雪花 ID |
| 密码加密 | `functions/src/password-crypto.js` | PBKDF2 加密 |

### 需要根据业务修改的模块

- `src/pages/` - 页面组件
- `src/components/trip/` - 业务组件
- `src/stores/trip.js` - 业务状态
- `functions/api/trips/` - 业务 API
- `functions/database/sql/` - 数据库结构

## 扩展建议

### 添加 Python 后端支持

1. 创建 `backend/` 目录
2. 使用 FastAPI/Flask 搭建 API
3. 修改 `vite.config.ts` 代理配置

### 添加测试

```bash
npm install -D vitest @vue/test-utils
```

### 添加 PWA 支持

```bash
npm install -D vite-plugin-pwa
```

## 许可证

MIT
