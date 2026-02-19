<template>
  <div class="share-poster-wrapper">
    <!-- 海报展示区域 -->
    <div class="canvas-wrapper">
      <canvas
        ref="posterCanvas"
        class="poster-canvas"
        :width="canvasWidth"
        :height="canvasHeight"
      ></canvas>

      <!-- 预览图 -->
      <img
        v-if="posterImage"
        :src="posterImage"
        class="poster-preview"
        @click="previewImage"
      />

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-mask">
        <n-spin size="medium" />
        <span class="loading-text">正在绘制海报...</span>
      </div>
    </div>

    <!-- 提示文字 -->
    <div v-if="posterImage" class="poster-hint-row">
      <span class="poster-hint" @click="previewImage">点击查看大图</span>
      <span class="poster-refresh" @click="refreshPoster">↻ 重新生成</span>
    </div>

    <!-- 操作按钮 -->
    <div class="poster-actions">
      <n-button
        v-if="posterImage"
        type="primary"
        size="large"
        class="save-btn"
        @click="savePoster"
      >
        <template #icon>
          <n-icon :component="DownloadOutlined" />
        </template>
        保存海报
      </n-button>
      <n-button
        v-else
        type="primary"
        size="large"
        class="save-btn"
        :loading="loading"
        @click="generatePoster"
      >
        生成海报
      </n-button>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { NSpin, NButton, NIcon, useMessage } from 'naive-ui'
import { DownloadOutlined } from '@vicons/antd'
import QRCode from 'qrcode'
import { tripShareApi } from '@/services/api'
import { getShareBaseUrl } from '@/utils/storage.js'

const props = defineProps({
  tripId: {
    type: String,
    default: ''
  },
  tripData: {
    type: Object,
    default: null
  },
  visibility: {
    type: String,
    default: 'private'
  }
})

const emit = defineEmits(['visibilityChange', 'close'])

const message = useMessage()
const posterCanvas = ref(null)
const loading = ref(false)
const posterImage = ref('')
const posterImageHD = ref('')
const shareToken = ref('')
const canvasWidth = 375
const canvasHeight = 600

// 手绘风格配色
const colors = {
  bg: '#faf8f5',           // 米白背景
  paper: '#fffdf9',        // 便签纸色
  primary: '#ff9a8b',      // 珊瑚粉
  secondary: '#a8e6cf',    // 薄荷绿
  accent: '#ffd3b6',       // 杏色
  text: '#5d4e37',         // 深棕文字
  textLight: '#8b7d6b',    // 浅棕文字
  line: '#e8ddd4',         // 线条色
  shadow: 'rgba(93, 78, 55, 0.08)'
}

// 生成海报
const generatePoster = async (forceRefresh = false) => {
  if (loading.value) return
  if (!forceRefresh && posterImage.value) return

  loading.value = true

  try {
    // 始终创建分享链接用于海报二维码，确保扫描后可以直接访问
    let shareUrl = ''
    const result = await tripShareApi.create(props.tripId, { expiresInDays: 30 })
    shareToken.value = result?.shareToken || ''
    const baseUrl = getShareBaseUrl()
    shareUrl = result?.shareUrl ? `${baseUrl}${result.shareUrl}` : ''

    // 如果原来是私密状态，通知父组件 visibility 已改变
    if (props.visibility === 'private') {
      emit('visibilityChange', 'link')
    }

    const canvas = posterCanvas.value
    if (!canvas) throw new Error('Canvas not found')

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Cannot get canvas context')

    await drawPoster(ctx, props.tripData, shareUrl)
    posterImage.value = canvas.toDataURL('image/png', 0.95)

    // 同时生成高清图用于保存
    await generateHDPoster(shareUrl)

    if (props.visibility === 'private') {
      message.success('海报生成成功，可见性已自动调整为"链接分享"')
    } else {
      message.success('海报生成成功')
    }
  } catch (error) {
    console.error('生成海报失败:', error)
    message.error('生成海报失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 生成高清海报
const generateHDPoster = async (shareUrl) => {
  const hdCanvas = document.createElement('canvas')
  const hdWidth = canvasWidth * 3
  const hdHeight = canvasHeight * 3
  hdCanvas.width = hdWidth
  hdCanvas.height = hdHeight

  const ctx = hdCanvas.getContext('2d')
  if (!ctx) return

  ctx.scale(3, 3)

  await drawPoster(ctx, props.tripData, shareUrl)
  posterImageHD.value = hdCanvas.toDataURL('image/png', 1.0)
}

// 绘制海报内容 - 手绘小清新风格
const drawPoster = async (ctx, tripData, shareUrl) => {
  const w = canvasWidth
  const h = canvasHeight

  // 1. 背景 - 带纹理的米白色
  ctx.fillStyle = colors.bg
  ctx.fillRect(0, 0, w, h)
  
  // 添加细微纹理
  drawPaperTexture(ctx, w, h)

  // 2. 手绘边框装饰
  drawHandDrawnBorder(ctx, w, h)

  // 3. 顶部装饰 - 手绘云朵/波浪
  drawTopDecoration(ctx, w)

  // 4. 标题区域
  const title = tripData?.title || '美好旅程'
  const dateRange = formatDateRange(tripData?.startDate, tripData?.endDate)
  const days = tripData?.days || 1

  // 日期标签 - 手绘风格标签
  drawHandDrawnLabel(ctx, w / 2, 55, dateRange, colors.accent)

  // 标题 - 手写风格
  ctx.fillStyle = colors.text
  ctx.font = 'bold 26px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  
  // 标题阴影效果
  ctx.fillStyle = colors.shadow
  ctx.fillText(title, w / 2 + 2, 102)
  ctx.fillStyle = colors.text
  ctx.fillText(title, w / 2, 100)

  // 天数便签 - 手绘贴纸风格
  drawDaysSticker(ctx, w - 70, 130, days)

  // 5. 城市路线 - 手绘地图风格
  const cities = tripData?.cityList || []
  if (cities.length > 0) {
    drawHandDrawnRoute(ctx, w, cities)
  }

  // 6. 描述文字 - 手写便签风格
  const description = tripData?.description || ''
  let noteBottomY = 390
  if (description) {
    noteBottomY = drawHandwrittenNote(ctx, w, h, description)
  }

  // 7. 装饰元素 - 手绘小图案
  drawDecorations(ctx, w, h, noteBottomY)

  // 8. 二维码 - 右下角
  await drawQRCode(ctx, w, h, shareUrl)
}

// 绘制纸张纹理
const drawPaperTexture = (ctx, w, h) => {
  ctx.save()
  ctx.globalAlpha = 0.03
  for (let i = 0; i < w; i += 4) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, h)
    ctx.strokeStyle = colors.text
    ctx.lineWidth = 0.5
    ctx.stroke()
  }
  ctx.restore()
}

// 绘制手绘边框
const drawHandDrawnBorder = (ctx, w, h) => {
  const padding = 8
  ctx.strokeStyle = colors.line
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  
  // 手绘不规则边框
  ctx.beginPath()
  const points = [
    [padding + random(-2, 2), padding + random(-2, 2)],
    [w - padding + random(-2, 2), padding + random(-2, 2)],
    [w - padding + random(-2, 2), h - padding + random(-2, 2)],
    [padding + random(-2, 2), h - padding + random(-2, 2)]
  ]
  
  ctx.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i++) {
    const cpX = (points[i][0] + points[i-1][0]) / 2 + random(-3, 3)
    const cpY = (points[i][1] + points[i-1][1]) / 2 + random(-3, 3)
    ctx.quadraticCurveTo(cpX, cpY, points[i][0], points[i][1])
  }
  ctx.closePath()
  ctx.stroke()
}

// 绘制顶部装饰
const drawTopDecoration = (ctx, w) => {
  // 手绘云朵
  ctx.fillStyle = colors.secondary
  ctx.globalAlpha = 0.3
  
  // 左边云朵
  drawCloud(ctx, 50, 25, 25)
  // 右边云朵
  drawCloud(ctx, w - 50, 30, 20)
  
  ctx.globalAlpha = 1
}

// 绘制云朵
const drawCloud = (ctx, x, y, size) => {
  ctx.beginPath()
  ctx.arc(x, y, size, 0, Math.PI * 2)
  ctx.arc(x + size * 0.6, y - size * 0.2, size * 0.7, 0, Math.PI * 2)
  ctx.arc(x + size * 1.2, y, size * 0.8, 0, Math.PI * 2)
  ctx.arc(x + size * 0.6, y + size * 0.3, size * 0.6, 0, Math.PI * 2)
  ctx.fill()
}

// 绘制手绘标签
const drawHandDrawnLabel = (ctx, x, y, text, bgColor) => {
  ctx.font = '13px "Microsoft YaHei", sans-serif'
  const textWidth = ctx.measureText(text).width
  const paddingX = 16
  const paddingY = 8
  const w = textWidth + paddingX * 2
  const h = 28

  // 标签背景 - 手绘不规则矩形
  ctx.fillStyle = bgColor
  ctx.beginPath()
  ctx.moveTo(x - w/2 + random(-2, 2), y - h/2 + random(-2, 2))
  ctx.lineTo(x + w/2 + random(-2, 2), y - h/2 + random(-2, 2))
  ctx.lineTo(x + w/2 + random(-2, 2), y + h/2 + random(-2, 2))
  ctx.lineTo(x - w/2 + random(-2, 2), y + h/2 + random(-2, 2))
  ctx.closePath()
  ctx.fill()

  // 标签文字
  ctx.fillStyle = colors.text
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y + 1)
}

// 绘制天数贴纸
const drawDaysSticker = (ctx, x, y, days) => {
  const size = 65
  
  // 贴纸阴影
  ctx.fillStyle = colors.shadow
  ctx.beginPath()
  ctx.arc(x + 3, y + 3, size/2, 0, Math.PI * 2)
  ctx.fill()
  
  // 贴纸主体 - 圆形带不规则边缘
  ctx.fillStyle = colors.primary
  ctx.beginPath()
  for (let i = 0; i <= 360; i += 10) {
    const angle = (i * Math.PI) / 180
    const r = size/2 + random(-3, 3)
    const px = x + Math.cos(angle) * r
    const py = y + Math.sin(angle) * r
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
  
  // 内圈
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(x, y, size/2 - 10, 0, Math.PI * 2)
  ctx.fill()
  
  // 先测量数字宽度，用于后续对齐
  ctx.font = 'bold 32px "Microsoft YaHei", sans-serif'
  const numMetrics = ctx.measureText(String(days))
  const numWidth = numMetrics.width
  const numHeight = numMetrics.actualBoundingBoxAscent + numMetrics.actualBoundingBoxDescent
  
  // 天数数字 - 在圆内完美居中
  ctx.fillStyle = colors.primary
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(days), x, y)
  
  // "天"字 - 黑色，放在数字右侧，与数字中间齐平
  ctx.fillStyle = colors.text
  ctx.font = 'bold 16px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('天', x + numWidth/2 + 25, y)
}

// 绘制手绘路线
const drawHandDrawnRoute = (ctx, w, cities) => {
  const routeY = 240
  const startX = 45
  const endX = w - 45
  
  const cityList = cities.slice(0, 5)
  const cityCount = cityList.length
  const spacing = (endX - startX) / Math.max(cityCount - 1, 1)
  
  const positions = cityList.map((city, i) => ({
    x: startX + spacing * i,
    y: routeY + (i % 2 === 0 ? 15 : -15),
    city
  }))
  
  // 绘制手绘虚线路径
  ctx.strokeStyle = colors.primary
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'
  ctx.setLineDash([8, 6])
  
  ctx.beginPath()
  ctx.moveTo(positions[0].x, positions[0].y)
  
  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1]
    const curr = positions[i]
    const cpX = (prev.x + curr.x) / 2 + random(-10, 10)
    const cpY = (prev.y + curr.y) / 2 + random(-15, 15)
    ctx.quadraticCurveTo(cpX, cpY, curr.x, curr.y)
  }
  ctx.stroke()
  ctx.setLineDash([])
  
  // 绘制城市点
  positions.forEach((pos, i) => {
    const isTop = i % 2 === 1
    
    // 外圈光晕
    ctx.fillStyle = colors.primary + '30'
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2)
    ctx.fill()
    
    // 外圈
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 9, 0, Math.PI * 2)
    ctx.fill()
    
    // 内圈 - 手绘风格
    ctx.fillStyle = colors.primary
    ctx.beginPath()
    for (let angle = 0; angle <= 360; angle += 20) {
      const rad = (angle * Math.PI) / 180
      const r = 6 + random(-1, 1)
      const px = pos.x + Math.cos(rad) * r
      const py = pos.y + Math.sin(rad) * r
      if (angle === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
    
    // 城市名
    ctx.fillStyle = colors.text
    ctx.font = 'bold 12px "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    const textY = isTop ? pos.y - 22 : pos.y + 28
    let displayCity = pos.city
    if (displayCity.length > 4) displayCity = displayCity.slice(0, 4)
    ctx.fillText(displayCity, pos.x, textY)
  })
}

// 计算文字需要多少行
const calculateTextLines = (ctx, text, maxWidth, maxChars) => {
  let displayText = text
  if (displayText.length > maxChars) displayText = displayText.slice(0, maxChars) + '...'
  
  const words = displayText.split('')
  const lines = []
  let line = ''
  
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i]
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && i > 0) {
      lines.push(line)
      line = words[i]
    } else {
      line = testLine
    }
  }
  lines.push(line)
  return lines
}

// 绘制手写便签 - 高度根据文字自动调整，返回便签底部Y坐标
const drawHandwrittenNote = (ctx, w, h, description) => {
  const noteX = 30
  const noteY = 300
  const noteW = w - 60
  
  ctx.font = '13px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'left'
  
  // 先计算文字需要多少行
  const maxWidth = noteW - 30
  const lines = calculateTextLines(ctx, description, maxWidth, 200)
  const lineHeight = 20
  const paddingTop = 35
  const paddingBottom = 20
  const noteH = Math.max(90, paddingTop + lines.length * lineHeight + paddingBottom)
  
  ctx.save()
  ctx.translate(noteX + noteW/2, noteY + noteH/2)
  ctx.rotate(-0.02)
  
  ctx.fillStyle = colors.shadow
  ctx.fillRect(-noteW/2 + 3, -noteH/2 + 3, noteW, noteH)
  
  ctx.fillStyle = colors.paper
  ctx.fillRect(-noteW/2, -noteH/2, noteW, noteH)
  
  ctx.strokeStyle = '#f0e6dc'
  ctx.lineWidth = 1
  // 绘制横线，但要留出底部padding空间
  const lineStartY = -noteH/2 + 25
  const lineEndY = noteH/2 - 15
  for (let i = lineStartY; i <= lineEndY; i += 20) {
    ctx.beginPath()
    ctx.moveTo(-noteW/2 + 10, i)
    ctx.lineTo(noteW/2 - 10, i)
    ctx.stroke()
  }
  
  ctx.fillStyle = colors.secondary + '60'
  ctx.fillRect(-noteW/2 - 5, -noteH/2 - 8, 40, 16)
  
  ctx.restore()
  
  ctx.fillStyle = colors.text
  
  let y = noteY + 35
  for (const line of lines) {
    ctx.fillText(line, noteX + 15, y)
    y += lineHeight
  }
  
  // 返回便签底部Y坐标
  return noteY + noteH
}

// 绘制装饰元素
const drawDecorations = (ctx, w, h, noteBottomY) => {
  // 顶部装饰 - 城市路线上方
  drawFlower(ctx, 40, 165, 8, colors.secondary)
  drawFlower(ctx, w - 45, 170, 6, colors.accent)
  drawStar(ctx, w - 50, 145, 4, colors.primary)
  
  // 便签下方的装饰元素，根据便签底部位置动态调整
  const decorationY = Math.max(noteBottomY + 25, 430)
  drawFlower(ctx, 55, decorationY, 5, colors.primary)
  drawLeaf(ctx, w - 55, decorationY - 15, 12, colors.secondary)
  drawLeaf(ctx, 40, decorationY - 35, 10, colors.accent)
  drawStar(ctx, 50, decorationY + 25, 3, colors.accent)
}

// 绘制花朵
const drawFlower = (ctx, x, y, size, color) => {
  ctx.fillStyle = color
  for (let i = 0; i < 5; i++) {
    const angle = (i * 72 * Math.PI) / 180
    const px = x + Math.cos(angle) * size * 0.6
    const py = y + Math.sin(angle) * size * 0.6
    ctx.beginPath()
    ctx.arc(px, py, size * 0.4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(x, y, size * 0.25, 0, Math.PI * 2)
  ctx.fill()
}

// 绘制叶子
const drawLeaf = (ctx, x, y, size, color) => {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.ellipse(x, y, size, size * 0.5, Math.PI / 4, 0, Math.PI * 2)
  ctx.fill()
  
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x - size * 0.5, y - size * 0.2)
  ctx.lineTo(x + size * 0.5, y + size * 0.2)
  ctx.stroke()
}

// 绘制星星
const drawStar = (ctx, x, y, size, color) => {
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const angle = (i * 144 - 90) * Math.PI / 180
    const px = x + Math.cos(angle) * size
    const py = y + Math.sin(angle) * size
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
}

// 绘制二维码 - 右下角
const drawQRCode = async (ctx, w, h, shareUrl) => {
  const qrSize = 93
  const qrX = w - qrSize - 10
  const qrY = h - qrSize - 10
  
  try {
    // 生成二维码数据URL
    const qrDataUrl = await QRCode.toDataURL(shareUrl, {
      width: qrSize * 4,
      margin: 1,
      color: {
        dark: colors.text,
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
    
    // 创建图片对象并绘制
    const img = new Image()
    img.src = qrDataUrl
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
    })
    
    // 绘制二维码
    ctx.drawImage(img, qrX, qrY, qrSize, qrSize)
    
    // 绘制小图标在二维码中心
    const iconSize = 16
    ctx.fillStyle = colors.primary
    ctx.beginPath()
    ctx.arc(qrX + qrSize/2, qrY + qrSize/2, iconSize/2 + 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 10px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('GO', qrX + qrSize/2, qrY + qrSize/2)
    
  } catch (err) {
    console.error('二维码生成失败:', err)
    // 绘制错误提示
    ctx.fillStyle = '#fff'
    ctx.fillRect(qrX, qrY, qrSize, qrSize)
    ctx.strokeStyle = colors.line
    ctx.lineWidth = 2
    ctx.strokeRect(qrX, qrY, qrSize, qrSize)

    ctx.fillStyle = colors.text
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('二维码生成失败', qrX + qrSize/2, qrY + qrSize/2)
  }
}

// 随机数辅助函数
const random = (min, max) => Math.random() * (max - min) + min

// 格式化日期范围
const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return '日期待定'
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  const format = (d) => `${d.getMonth() + 1}月${d.getDate()}日`
  
  if (start.getFullYear() === end.getFullYear()) {
    return `${start.getFullYear()}年 ${format(start)} - ${format(end)}`
  }
  
  return `${start.getFullYear()}年${format(start)} - ${end.getFullYear()}年${format(end)}`
}

// 刷新海报
const refreshPoster = () => {
  posterImage.value = ''
  generatePoster(true)
}

// 预览图片
const previewImage = () => {
  if (posterImage.value) {
    const newWindow = window.open('', '_blank')
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>海报预览</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: #1a1a1a;
              }
              img {
                max-width: 90vw;
                max-height: 90vh;
                object-fit: contain;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
              }
            </style>
          </head>
          <body>
            <img src="${posterImage.value}" alt="海报预览" />
          </body>
        </html>
      `)
      newWindow.document.close()
    }
  }
}

// 保存海报
const savePoster = () => {
  if (!posterImage.value) {
    message.warning('请先生成海报')
    return
  }

  const link = document.createElement('a')
  link.href = posterImageHD.value || posterImage.value
  link.download = `行程海报_${props.tripData?.title || '旅行'}_${Date.now()}.png`
  link.click()
  message.success('海报已保存')
  emit('close')
}

defineExpose({
  generatePoster
})
</script>

<style scoped>
.share-poster-wrapper {
  max-width: 100%;
  box-sizing: border-box;
}

.canvas-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f5f0e8;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(93, 78, 55, 0.08);
}

.poster-canvas {
  display: block;
  max-width: 100%;
  height: auto;
  background: #faf8f5;
  border-radius: 8px;
}

.poster-preview {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #faf8f5;
  cursor: zoom-in;
  border-radius: 8px;
}

.loading-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(250, 248, 245, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 10;
  border-radius: 8px;
}

.loading-text {
  font-size: 14px;
  color: #8b7d6b;
  font-weight: 500;
}

.poster-hint-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
}

.poster-hint {
  font-size: 12px;
  color: #a09080;
  cursor: pointer;
}

.poster-refresh {
  font-size: 12px;
  color: #ff9a8b;
  cursor: pointer;
  font-weight: 500;
}

.poster-refresh:hover {
  color: #ff7b6b;
}

.poster-actions {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

.save-btn {
  min-width: 160px;
  background: linear-gradient(135deg, #ff9a8b 0%, #ff7b6b 100%);
  border: none;
  box-shadow: 0 4px 16px rgba(255, 154, 139, 0.4);
}

.save-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 154, 139, 0.5);
}
</style>
