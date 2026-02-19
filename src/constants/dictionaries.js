/**
 * 统一字典常量定义
 * 集中管理项目中所有枚举类型和字典数据
 */

// ============ 事件/卡片类型 ============
export const EVENT_TYPES = {
  SCENIC: 'scenic',
  FOOD: 'food',
  HOTEL: 'hotel',
  TRANSPORT: 'transport',
  ACTIVITY: 'activity',
  SHOPPING: 'shopping',
  OTHER: 'other'
};

// 类型标签映射
export const EVENT_TYPE_LABELS = {
  [EVENT_TYPES.SCENIC]: '景点',
  [EVENT_TYPES.FOOD]: '美食',
  [EVENT_TYPES.HOTEL]: '住宿',
  [EVENT_TYPES.TRANSPORT]: '交通',
  [EVENT_TYPES.ACTIVITY]: '活动',
  [EVENT_TYPES.SHOPPING]: '购物',
  [EVENT_TYPES.OTHER]: '其他'
};

// 类型图标映射
export const EVENT_TYPE_ICONS = {
  [EVENT_TYPES.SCENIC]: '🏔️',
  [EVENT_TYPES.FOOD]: '🍜',
  [EVENT_TYPES.HOTEL]: '🏨',
  [EVENT_TYPES.TRANSPORT]: '🚗',
  [EVENT_TYPES.ACTIVITY]: '🎉',
  [EVENT_TYPES.SHOPPING]: '🛍️',
  [EVENT_TYPES.OTHER]: '📌'
};

// 类型颜色映射
export const EVENT_TYPE_COLORS = {
  [EVENT_TYPES.SCENIC]: '#52c41a',
  [EVENT_TYPES.FOOD]: '#fa8c16',
  [EVENT_TYPES.HOTEL]: '#722ed1',
  [EVENT_TYPES.TRANSPORT]: '#1890ff',
  [EVENT_TYPES.ACTIVITY]: '#eb2f96',
  [EVENT_TYPES.SHOPPING]: '#fa541c',
  [EVENT_TYPES.OTHER]: '#8c8c8c'
};

// 类型选项数组（用于下拉选择）
export const EVENT_TYPE_OPTIONS = [
  { value: EVENT_TYPES.SCENIC, label: EVENT_TYPE_LABELS[EVENT_TYPES.SCENIC], icon: EVENT_TYPE_ICONS[EVENT_TYPES.SCENIC] },
  { value: EVENT_TYPES.FOOD, label: EVENT_TYPE_LABELS[EVENT_TYPES.FOOD], icon: EVENT_TYPE_ICONS[EVENT_TYPES.FOOD] },
  { value: EVENT_TYPES.HOTEL, label: EVENT_TYPE_LABELS[EVENT_TYPES.HOTEL], icon: EVENT_TYPE_ICONS[EVENT_TYPES.HOTEL] },
  { value: EVENT_TYPES.TRANSPORT, label: EVENT_TYPE_LABELS[EVENT_TYPES.TRANSPORT], icon: EVENT_TYPE_ICONS[EVENT_TYPES.TRANSPORT] },
  { value: EVENT_TYPES.SHOPPING, label: EVENT_TYPE_LABELS[EVENT_TYPES.SHOPPING], icon: EVENT_TYPE_ICONS[EVENT_TYPES.SHOPPING] },
  { value: EVENT_TYPES.ACTIVITY, label: EVENT_TYPE_LABELS[EVENT_TYPES.ACTIVITY], icon: EVENT_TYPE_ICONS[EVENT_TYPES.ACTIVITY] },
  { value: EVENT_TYPES.OTHER, label: EVENT_TYPE_LABELS[EVENT_TYPES.OTHER], icon: EVENT_TYPE_ICONS[EVENT_TYPES.OTHER] }
];

// 简化的类型选项
export const EVENT_TYPE_SIMPLE_OPTIONS = EVENT_TYPE_OPTIONS.map(({ value, label }) => ({ value, label }));

// ============ 事件状态 ============
export const EVENT_STATES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
};

export const EVENT_STATE_LABELS = {
  [EVENT_STATES.ACTIVE]: '有效',
  [EVENT_STATES.INACTIVE]: '暂时无效'
};

// ============ 卡片状态 ============
export const CARD_STATES = {
  DRAFT: 'draft',
  PLANNED: 'planned',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

export const CARD_STATE_LABELS = {
  [CARD_STATES.DRAFT]: '草稿',
  [CARD_STATES.PLANNED]: '计划中',
  [CARD_STATES.CONFIRMED]: '已确认',
  [CARD_STATES.COMPLETED]: '已完成',
  [CARD_STATES.CANCELLED]: '已取消'
};

// ============ 标签颜色 ============
export const TAG_COLORS = {
  DEFAULT: {
    value: 'default',
    hex: '#6b7280',
    bg: '#f3f4f6',
    text: '#636e72',
    label: '默认'
  },
  RED: {
    value: 'red',
    hex: '#ef4444',
    bg: '#ffebee',
    text: '#ff5252',
    label: '红色'
  },
  GREEN: {
    value: 'green',
    hex: '#22c55e',
    bg: '#e8f5e9',
    text: '#4caf50',
    label: '绿色'
  },
  YELLOW: {
    value: 'yellow',
    hex: '#f59e0b',
    bg: '#fff8e1',
    text: '#ffc107',
    label: '黄色'
  },
  BLUE: {
    value: 'blue',
    hex: '#3b82f6',
    bg: '#e3f2fd',
    text: '#2196f3',
    label: '蓝色'
  },
  PURPLE: {
    value: 'purple',
    hex: '#a855f7',
    bg: '#f3e5f5',
    text: '#9c27b0',
    label: '紫色'
  }
};

// ============ 辅助函数 ============
export function getEventTypeLabel(type) {
  return EVENT_TYPE_LABELS[type] || EVENT_TYPE_LABELS[EVENT_TYPES.OTHER];
}

export function getEventTypeIcon(type) {
  return EVENT_TYPE_ICONS[type] || EVENT_TYPE_ICONS[EVENT_TYPES.OTHER];
}

export function getEventTypeColor(type) {
  return EVENT_TYPE_COLORS[type] || EVENT_TYPE_COLORS[EVENT_TYPES.OTHER];
}
