/**
 * JSON Schema 字段选择器
 * 用于动态构建 SQL 查询字段，实现精确数据返回
 */

// 数据库字段映射表：前端字段名 -> 数据库字段名
const DB_FIELD_MAP = {
  // trip 表字段映射
  trip: {
    id: 'trip_id',
    tripId: 'trip_id',
    userId: 'user_id',
    slug: 'slug',
    title: 'title',
    year: 'year',
    description: 'description',
    startDate: 'start_date',
    endDate: 'end_date',
    days: 'days',
    cityList: 'city_list',
    coverImage: 'cover_image',
    status: 'status',
    visibility: 'visibility',
    footerText: 'footer_text',
    travelerCount: 'traveler_count',
    budgetPerPersonMin: 'budget_per_person_min',
    budgetPerPersonMax: 'budget_per_person_max',
    budgetUnit: 'budget_unit',
    completed: 'completed',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  // day 表字段映射
  day: {
    id: 'day_id',
    dayId: 'day_id',
    tripId: 'trip_id',
    dayOrder: 'day_order',
    date: 'date',
    shortDate: 'short_date',
    location: 'location',
    title: 'title',
    description: 'description',
    coverImage: 'cover_image',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  // event 表字段映射
  event: {
    id: 'event_id',
    eventId: 'event_id',
    uid: 'event_id',
    dayId: 'day_id',
    tripId: 'trip_id',
    eventOrder: 'event_order',
    type: 'type',
    state: 'state',
    cardType: 'card_type',
    title: 'title',
    description: 'description',
    detail: 'detail',
    startTime: 'start_time',
    endTime: 'end_time',
    time: 'start_time',
    durationMin: 'duration_min',
    duration: 'duration_min',
    priority: 'priority',
    locationId: 'location_id',
    locationName: 'location_name',
    tags: 'tags',
    images: 'images',
    cost: 'cost',
    costCurrency: 'cost_currency',
    parentEventId: 'parent_event_id',
    // 注意：activeOptionIndex 字段在数据库中不存在，已注释掉
    // activeOptionIndex: 'active_option_index',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  // location 表字段映射
  location: {
    id: 'location_id',
    locationId: 'location_id',
    name: 'name',
    address: 'address',
    lat: 'lat',
    lng: 'lng',
    images: 'images',
    tags: 'tags',
    rating: 'rating',
    openTime: 'open_time',
    price: 'price',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
};

// 前端字段默认值映射（用于构建返回对象）
const DEFAULT_VALUES = {
  trip: {
    id: '',
    title: '',
    year: null,
    description: '',
    startDate: '',
    endDate: '',
    days: 0,
    cityList: [],
    coverImage: '',
    status: 'draft',
    visibility: 'private',
    footerText: '',
    travelerCount: 1,
    budgetPerPersonMin: null,
    budgetPerPersonMax: null,
    budgetUnit: '元',
    completed: 0,
    createdAt: 0,
    updatedAt: 0
  },
  day: {
    id: '',
    tripId: '',
    dayOrder: 0,
    date: '',
    shortDate: '',
    location: '',
    title: '',
    description: '',
    coverImage: '',
    createdAt: 0,
    updatedAt: 0
  },
  event: {
    id: '',
    dayId: '',
    tripId: '',
    eventOrder: 0,
    type: 'scenic',
    state: 'active',
    cardType: 'single',
    title: '',
    description: '',
    detail: '',
    startTime: '',
    endTime: '',
    durationMin: null,
    priority: 0,
    locationId: null,
    locationName: '',
    tags: null,
    images: null,
    cost: null,
    costCurrency: 'CNY',
    parentEventId: null,
    // 注意：activeOptionIndex 字段在数据库中不存在，已注释掉
    // activeOptionIndex: 0,
    createdAt: 0,
    updatedAt: 0
  },
  location: {
    id: '',
    name: '',
    address: '',
    lat: null,
    lng: null,
    images: null,
    tags: null,
    rating: null,
    openTime: '',
    price: null,
    createdAt: 0,
    updatedAt: 0
  }
};

/**
 * 构建 SQL SELECT 字段列表
 * @param {string} table - 表名: 'trip' | 'day' | 'event' | 'location'
 * @param {string[]} fields - 前端字段名数组
 * @returns {string} SQL 字段列表
 */
export function buildSelectFields(table, fields) {
  if (!fields || fields.length === 0) {
    return '*';
  }

  const map = DB_FIELD_MAP[table];
  if (!map) {
    return '*';
  }

  const dbFields = fields
    .map(f => map[f])
    .filter(Boolean);

  if (dbFields.length === 0) {
    return '*';
  }

  return dbFields.join(', ');
}

/**
 * 根据 Schema 过滤对象字段
 * @param {object} row - 数据库原始行数据
 * @param {string} table - 表名
 * @param {string[]} fields - 需要保留的前端字段名数组
 * @returns {object} 过滤后的对象
 */
export function filterFields(row, table, fields) {
  console.log('[filterFields Debug] table:', table, 'fields:', fields);
  console.log('[filterFields Debug] row:', row);
  
  if (!row || typeof row !== 'object') {
    return null;
  }

  const map = DB_FIELD_MAP[table];
  const defaults = DEFAULT_VALUES[table];

  if (!map) {
    return { ...row };
  }

  // 如果 fields 为 null 或空数组，返回所有映射的字段
  const fieldsToProcess = fields || Object.keys(map);
  console.log('[filterFields Debug] fieldsToProcess:', fieldsToProcess);

  const result = {};

  for (const field of fieldsToProcess) {
    // duration 是派生字段，需要后端特殊处理，这里跳过
    if (field === 'duration') {
      continue;
    }

    const dbField = map[field];
    console.log(`[filterFields Debug] field: ${field}, dbField: ${dbField}, exists in row: ${dbField && dbField in row}`);
    
    if (dbField && dbField in row) {
      let value = row[dbField];

      // 特殊处理 JSON 字段
      if ((field === 'tags' || field === 'images' || field === 'cityList') && typeof value === 'string') {
        try {
          value = JSON.parse(value);
        } catch {
          value = null;
        }
      }

      result[field] = value !== undefined ? value : (defaults?.[field] ?? null);
    } else {
      // 字段不存在，使用默认值
      result[field] = defaults?.[field] ?? null;
    }
  }

  console.log('[filterFields Debug] result:', result);
  return result;
}

/**
 * 解析请求中的 Schema
 * @param {URL} url - 请求 URL
 * @param {object} body - 请求体（POST 请求）
 * @returns {object|null} 解析后的 Schema 对象
 */
export function parseSchema(url, body = null) {
  // 1. 尝试从 URL 参数获取
  const schemaParam = url.searchParams.get('schema');
  if (schemaParam) {
    try {
      return JSON.parse(schemaParam);
    } catch {
      // 解析失败，继续尝试其他方式
    }
  }

  // 2. 尝试从请求体获取
  if (body && body.schema) {
    return body.schema;
  }

  // 3. 尝试从 fields 参数获取（简化版）
  const fieldsParam = url.searchParams.get('fields');
  if (fieldsParam) {
    const fields = fieldsParam.split(',').map(f => f.trim()).filter(Boolean);
    return {
      event: fields,
      location: ['id', 'name', 'lat', 'lng', 'address']
    };
  }

  return null;
}

/**
 * 预定义的 Schema 模板
 */
export const SCHEMA_TEMPLATES = {
  // 卡片列表页 - 包含卡片展示所需的完整字段
  card: {
    trip: ['id', 'title', 'year', 'description', 'startDate', 'endDate', 'days', 'cityList', 'coverImage', 'status', 'visibility', 'footerText', 'travelerCount', 'budgetPerPersonMin', 'budgetPerPersonMax', 'budgetUnit', 'completed'],
    day: ['id', 'date', 'shortDate', 'location'],
    // 注意：activeOptionIndex 字段在数据库中不存在，已从列表中移除
    // location 字段用于 attachLocations 函数识别需要关联 location 数据
    event: ['id', 'type', 'title', 'description', 'detail', 'state', 'startTime', 'endTime', 'time', 'durationMin', 'duration', 'locationId', 'locationName', 'location', 'tags', 'images', 'cost', 'costCurrency', 'cardType', 'completed', 'options', 'parentEventId'],
    location: ['id', 'name', 'lat', 'lng', 'address', 'images', 'tags', 'rating', 'openTime', 'price']
  },

  // 卡片详情页
  detail: {
    trip: ['id', 'userId', 'title', 'description', 'coverImage', 'cityList', 'visibility', 'status', 'startDate', 'endDate', 'days', 'travelerCount', 'budgetPerPersonMin', 'budgetPerPersonMax', 'budgetUnit'],
    day: ['id', 'date', 'shortDate', 'location', 'title', 'description'],
    // 注意：activeOptionIndex 字段在数据库中不存在，已注释掉
    // location 字段用于 attachLocations 函数识别需要关联 location 数据
    event: ['id', 'type', 'title', 'description', 'detail', 'state', 'startTime', 'endTime', 'durationMin', 'locationId', 'locationName', 'location', 'tags', 'images', 'cost', 'costCurrency', 'cardType'],
    location: ['id', 'name', 'address', 'lat', 'lng', 'images', 'tags', 'rating', 'openTime', 'price']
  },

  // 编辑页 - 需要全部字段
  edit: {
    trip: null, // null 表示全部字段
    day: null,
    event: null,
    location: null
  }
};

/**
 * 获取 Schema 模板
 * @param {string} templateName - 模板名称
 * @returns {object|null} Schema 对象
 */
export function getSchemaTemplate(templateName) {
  return SCHEMA_TEMPLATES[templateName] || null;
}

/**
 * 合并 Schema
 * @param {object} base - 基础 Schema
 * @param {object} override - 覆盖 Schema
 * @returns {object} 合并后的 Schema
 */
export function mergeSchema(base, override) {
  if (!base) return override;
  if (!override) return base;

  const result = { ...base };

  for (const key of Object.keys(override)) {
    if (override[key] === null) {
      // null 表示全部字段
      result[key] = null;
    } else if (Array.isArray(override[key])) {
      if (result[key] === null) {
        // 基础是全字段，覆盖是部分字段，取并集
        result[key] = null;
      } else {
        // 合并数组并去重
        result[key] = [...new Set([...(result[key] || []), ...override[key]])];
      }
    }
  }

  return result;
}

export default {
  buildSelectFields,
  filterFields,
  parseSchema,
  getSchemaTemplate,
  mergeSchema,
  SCHEMA_TEMPLATES,
  DB_FIELD_MAP
};
