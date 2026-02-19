# 开发规范

## 一、核心开发环境与适配规则

- **技术框架**: uni-app + uView Pro（均采用最新稳定版本，跨三端开发），本地使用 sqlitecloud 的云端 SQLite，生产环境为 Cloudflare Workers + D1 数据库。
- **端适配优先级**: 优先实现手机端的交互逻辑与展示效果，在手机端基础上兼容 PC 端的展示布局与基础交互，保证两端无适配冲突。
- **开发范围**: 覆盖基础功能开发、组件复用、工具调用、页面搭建，均遵循 uView Pro 官方规范。

## 二、核心开发约束（强制遵循）

### 组件开发
- 所有 UI / 功能组件实现，必须先检索本文档内 uView Pro 组件目录
- **优先使用框架现成组件**，禁止重复开发同功能组件
- 仅当框架无对应组件时，再进行轻量自定义开发
- 自定义组件需兼容 uni-app 跨端特性与 uView Pro 设计规范

### 工具使用
- 所有通用功能（数据处理、网络请求、加密、格式转换等），必须先检索本文档内便捷工具目录
- **优先调用 uView Pro 内置工具库**，禁止重复编写工具类代码
- 工具库统一通过 `$u` 调用，遵循官方调用规范

### 页面搭建
- 开发同类业务页面（登录、订单、地址管理等），先检索本文档内开源模板目录
- **优先参考框架提供的开源模板**进行适配开发

### 接口对接
- 前后端接口交互必须使用 uView Pro 内置 Http 工具 + 配套组件
- 遵循统一的接口请求 / 响应规范，禁止自定义网络请求逻辑

## 三、uView Pro 完整可复用资源目录

### （一）全品类组件目录

**基础组件**: Color 色彩、Icon 图标、Image 图片、Button 按钮、Layout 布局、Cell 单元格、Badge 徽标数、Tag 标签、Text 文本、Fab 悬浮按钮、Transition 过渡动画

**表单组件**: Form 表单、Input 输入框、Textarea 文本域、Calendar 日历、Select 列选择器、Keyboard 键盘、Picker 选择器、Rate 评分、Search 搜索、NumberBox 步进器、Upload 上传、VerificationCode 验证码倒计时、Field 输入框、Checkbox 复选框、Radio 单选框、Switch 开关选择器、Slider 滑动选择器

**数据组件**: CircleProgress 圆形进度条、LineProgress 线形进度条、Table 表格、CountDown 倒计时、CountTo 数字滚动

**反馈组件**: ActionSheet 操作菜单、AlertTips 警告提示、Toast 消息提示、NoticeBar 滚动通知、TopTips 顶部提示、Collapse 折叠面板、Popup 弹出层、SwipeAction 滑动单元格、Modal 模态框、FullScreen 压窗屏

**布局组件**: Line 线条、Card 卡片、Mask 遮罩层、NoNetwork 无网络提示、Grid 宫格布局、Swiper 轮播图、TimeLine 时间轴、Skeleton 骨架屏、Sticky 吸顶、Waterfall 瀑布流、Divider 分割线

**导航组件**: Dropdown 下拉菜单、Tabbar 底部导航栏、BackTop 返回顶部、Navbar 导航栏、Tabs 标签、TabsSwiper 全屏选项卡、Subsection 分段器、IndexList 索引列表、Steps 步骤条、Empty 内容为空、Link 超链接、Section 查看更多、Pagination 分页

**其他组件**: MessageInput 验证码输入、Loadmore 加载更多、ReadMore 展开阅读更多、LazyLoad 懒加载、Gap 间隔槽、Avatar 头像、Loading 加载动画、LoadingPopup 加载弹窗

### （二）便捷工具目录

**网络工具**: Http 请求（uView Pro 内置接口对接核心工具，基于 uni.request 封装，支持 GET/POST 等请求方式、全局配置、请求 / 响应拦截器、文件上传 / 下载）

**工具库**: 节流防抖、对象深度克隆、对象深度合并、时间格式化、路由跳转、数组乱序、全局唯一标识符、颜色转换、颜色值、对象转 URL 参数、规则校验、md5 加密、随机数值、去除空格、节点布局信息

### （三）接口对接配套组件

- **表单提交**: Form/Field 组件（校验后对接接口）
- **文件上传**: Upload 组件（直接对接上传接口）
- **验证码交互**: VerificationCode 组件（对接验证码发送接口）
- **分页加载**: Loadmore 组件（对接列表分页接口）

### （四）开源模板目录

**部件模板**: Coupon 优惠券

**页面模板**: 微信个人中心页、自定义键盘支付、垂直分类、提交订单栏、评论列表、订单列表、登录界面、收货地址、城市选择

## 四、代码输出规范

### 组件使用
- 直接使用 uView Pro 官方组件标签，无需自定义封装
- 若需二次封装，需基于原组件扩展，保留原组件核心能力

### 工具调用
- 工具库统一通过 `$u` 全局调用
- 网络请求、路由跳转等按 uView Pro 官方语法编写

### 接口对接
- 必须使用 uView Pro 内置 Http 工具发起请求
- 统一配置 baseUrl、请求头、拦截器（处理 Token、加载状态、接口错误）
- 按业务模块封装接口方法，避免重复编写请求代码

### 端适配细节
- 手机端需保证交互流畅、屏幕自适应
- PC 端需适配布局宽度、鼠标交互、组件自适应
- 避免出现布局错乱、交互失效问题

### 代码标注
- 输出代码时，标注所使用的 uView Pro 组件名 / 工具名 / 模板名
- 方便核对与后续维护
