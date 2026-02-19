<template>
  <div
    v-if="currentDayHasLocations"
    class="map-container"
    :class="{ 'map-fullscreen': mapFullscreen }"
  >
    <!-- 头部 -->
    <div class="map-header">
      <div class="map-header-left">
        <span class="map-header-icon">📍</span>
        <span class="map-header-title">今日行程</span>
      </div>
      <div class="map-header-actions">
        <button
          v-if="mapExpanded"
          class="map-btn"
          @click.stop="$emit('reset-view')"
        >
          重置
        </button>
        <button
          v-if="mapExpanded"
          class="map-btn"
          @click.stop="$emit('refresh')"
        >
          刷新
        </button>
        <button
          class="map-btn"
          @click.stop="$emit('toggle-fullscreen')"
        >
          {{ mapFullscreen ? '退出全屏' : '全屏' }}
        </button>
        <button class="map-btn" @click.stop="$emit('toggle-map')">
          {{ mapExpanded ? '收起地图' : '展开地图' }}
        </button>
      </div>
    </div>

    <!-- 地图内容 -->
    <div
      v-show="mapExpanded"
      class="map-content"
    >
      <div class="map-visualization">
        <div :id="mapDomId" class="amap-jsapi-map"></div>
      </div>

      <!-- 图例和统计合并 -->
      <div class="map-info-bar">
        <div class="legend-items">
          <div class="legend-item">
            <div class="legend-dot transport"></div>
            <span>交通</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot hotel"></div>
            <span>住宿</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot scenic"></div>
            <span>景点</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot food"></div>
            <span>美食</span>
          </div>
        </div>
        <div class="stat-summary">
          {{ mapStats.spotCount }}个景点 · {{ mapStats.totalKm }}km · {{ mapStats.typeCount }}种类型
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  currentDayHasLocations: {
    type: Boolean,
    default: false,
  },
  mapExpanded: {
    type: Boolean,
    default: false,
  },
  mapFullscreen: {
    type: Boolean,
    default: false,
  },
  mapDomId: {
    type: String,
    default: "",
  },
  mapStats: {
    type: Object,
    default: () => ({
      spotCount: 0,
      totalKm: 0,
      typeCount: 0,
    }),
  },
})

defineEmits(["reset-view", "refresh", "toggle-fullscreen", "toggle-map"])
</script>

<style scoped>
.map-container {
  margin: 0 auto 12px;
  width: 96%;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
  border: 2px solid rgba(0, 0, 0, 0.03);
  overflow: hidden;
  transition: all 0.3s ease;
}

.map-container.map-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1000;
  border-radius: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.map-container.map-fullscreen .map-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 0;
}

/* 头部样式 */
.map-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, #ff835a, #ff9a6e);
  border-bottom: none;
}

.map-header-left {
  display: flex;
  align-items: center;
  gap: 0px;
  flex-shrink: 0;
}

.map-header-icon {
  font-size: 20px;
}

.map-header-title {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
}

.map-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  justify-content: flex-end;
}

.map-btn {
  padding: 6px 0px;
  background: rgba(255, 255, 255, 0.9);
  color: #64748b;
  border: none;
  border-radius: 16px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.map-btn:hover {
  background: #fff;
  color: #ff835a;
}

.map-btn:active {
  transform: scale(0.95);
}

.map-btn-primary {
  background: rgba(255, 255, 255, 0.95);
  color: #ff6b6b;
  font-weight: 500;
}

.map-btn-primary:hover {
  background: #fff;
  color: #ff4757;
}

/* 内容区域 */
.map-content {
  padding: 0;
}

.map-visualization {
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #f8fafc;
  overflow: hidden;
  margin-bottom: 0;
}

.map-container.map-fullscreen .map-visualization {
  flex: 1;
  width: 100%;
  height: auto;
  aspect-ratio: auto;
  min-height: 0;
}

.amap-jsapi-map {
  width: 100%;
  height: 100%;
  min-height: 300px;
}

.map-container.map-fullscreen .amap-jsapi-map {
  height: 100%;
  min-height: 0;
}

/* 调整高德地图水印层级，避免覆盖其他内容 */
.amap-jsapi-map :deep(.amap-copyright),
.amap-jsapi-map :deep(.amap-logo) {
  z-index: 1 !important;
}

.amap-jsapi-map :deep(.amap-copyright) {
  bottom: 5px !important;
}

/* 图例和统计合并 */
.map-info-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #f8fafc;
  border-top: 1px solid #f1f5f9;
  flex-wrap: wrap;
  gap: 8px;
}

.legend-items {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #64748b;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-dot.transport {
  background: #ef4444;
}

.legend-dot.hotel {
  background: #f59e0b;
}

.legend-dot.scenic {
  background: #3b82f6;
}

.legend-dot.food {
  background: #22c55e;
}

.stat-summary {
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
}

/* 响应式 */
@media (max-width: 480px) {
  .map-header {
    padding: 12px 16px;
  }

  .map-header-title {
    font-size: 15px;
  }

  .map-btn {
    padding: 5px 10px;
    font-size: 12px;
  }

  .map-info-bar {
    padding: 8px 12px;
    gap: 6px;
  }

  .legend-items {
    gap: 10px;
  }

  .legend-item {
    font-size: 11px;
  }

  .stat-summary {
    font-size: 11px;
  }
}
</style>
