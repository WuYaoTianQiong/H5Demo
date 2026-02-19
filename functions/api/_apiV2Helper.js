/**
 * API V2 通用辅助函数
 * 为所有接口提供统一的字段选择、权限控制和响应精简功能
 */

import {
  buildSelectFields,
  filterFields,
  parseSchema,
  getSchemaTemplate
} from './_fieldSchema.js';

/**
 * 敏感字段列表 - 这些字段默认不会返回给客户端
 */
export const SENSITIVE_FIELDS = [
  'user_id',
  'password_hash',
  'password',
  'token',
  'secret',
  'api_key'
];

/**
 * 表字段白名单 - 每个表可以安全返回的字段
 */
export const TABLE_FIELD_WHITELIST = {
  trip: [
    'trip_id', 'user_id', 'title', 'year', 'description', 'start_date', 'end_date',
    'days', 'city_list', 'footer_text', 'traveler_count', 'budget_per_person_min',
    'budget_per_person_max', 'budget_unit', 'visibility', 'completed',
    'cover_image', 'status', 'created_at', 'updated_at'
    // 排除: slug
  ],
  day: [
    'day_id', 'trip_id', 'day_order', 'date', 'short_date', 'location',
    'title', 'description', 'cover_image', 'created_at', 'updated_at'
  ],
  event: [
    'event_id', 'day_id', 'trip_id', 'event_order', 'type', 'state',
    'card_type', 'title', 'description', 'detail', 'start_time', 'end_time',
    'duration_min', 'priority', 'location_id', 'location_name', 'tags',
    'images', 'cost', 'cost_currency', 'parent_event_id',
    'created_at', 'updated_at'
  ],
  location: [
    'location_id', 'name', 'address', 'lat', 'lng', 'images', 'tags',
    'rating', 'open_time', 'price', 'created_at', 'updated_at'
  ],
  users: [
    'user_id', 'email', 'username', 'email_verified', 'role', 'avatar',
    'created_at', 'updated_at'
    // 排除: password_hash
  ]
};

/**
 * 检查字段是否是敏感字段
 * @param {string} field - 字段名
 * @returns {boolean}
 */
export function isSensitiveField(field) {
  return SENSITIVE_FIELDS.includes(field.toLowerCase());
}

/**
 * 过滤敏感字段
 * @param {object} data - 原始数据对象
 * @param {object} options - 选项
 * @param {string} options.table - 表名，用于判断哪些敏感字段可以保留
 * @param {boolean} options.isOwner - 是否是数据所有者
 * @returns {object} 过滤后的数据
 */
export function filterSensitiveFields(data, options = {}) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const { table, isOwner = false } = options;

  const result = {};
  for (const [key, value] of Object.entries(data)) {
    // 对于 trip 表，user_id 不是敏感字段（用于前端判断所有权）
    if (key === 'user_id' && table === 'trip') {
      result[key] = value;
      continue;
    }

    if (!isSensitiveField(key)) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * 构建安全的 SQL 查询字段
 * @param {string} table - 表名
 * @param {string[]} requestedFields - 请求的字段
 * @param {object} options - 选项
 * @param {boolean} options.isOwner - 是否是数据所有者
 * @param {boolean} options.includeSensitive - 是否包含敏感字段（仅所有者）
 * @returns {string} SQL 字段列表
 */
export function buildSafeSelectFields(table, requestedFields, options = {}) {
  const { isOwner = false, includeSensitive = false } = options;

  // 获取表的白名单字段
  const whitelist = TABLE_FIELD_WHITELIST[table];
  if (!whitelist) {
    // 如果表没有白名单，且不是所有者，返回空（安全默认）
    return isOwner ? buildSelectFields(table, requestedFields) : '*';
  }

  // 如果没有指定字段，使用白名单
  if (!requestedFields || requestedFields.length === 0) {
    return whitelist.join(', ');
  }

  // 过滤字段：只保留白名单中的字段
  const allowedFields = requestedFields.filter(field => {
    const dbField = getDbFieldName(table, field);
    // 检查是否在白名单中
    const isAllowed = whitelist.includes(dbField);
    // 检查是否是敏感字段
    const isSensitive = isSensitiveField(dbField);

    // 敏感字段只有所有者可访问
    if (isSensitive) {
      return isOwner && includeSensitive;
    }

    return isAllowed;
  });

  if (allowedFields.length === 0) {
    // 如果没有允许的字段，返回白名单
    return whitelist.join(', ');
  }

  return buildSelectFields(table, allowedFields);
}

/**
 * 获取数据库字段名
 * @param {string} table - 表名
 * @param {string} frontendField - 前端字段名
 * @returns {string|null}
 */
function getDbFieldName(table, frontendField) {
  const map = {
    trip: {
      id: 'trip_id', title: 'title', year: 'year', description: 'description',
      startDate: 'start_date', endDate: 'end_date', days: 'days',
      cityList: 'city_list', coverImage: 'cover_image', status: 'status',
      visibility: 'visibility', footerText: 'footer_text',
      travelerCount: 'traveler_count', budgetPerPersonMin: 'budget_per_person_min',
      budgetPerPersonMax: 'budget_per_person_max', budgetUnit: 'budget_unit',
      completed: 'completed', userId: 'user_id'
    },
    day: {
      id: 'day_id', tripId: 'trip_id', dayOrder: 'day_order', date: 'date',
      shortDate: 'short_date', location: 'location', title: 'title',
      description: 'description', coverImage: 'cover_image'
    },
    event: {
      id: 'event_id', dayId: 'day_id', tripId: 'trip_id', eventOrder: 'event_order',
      type: 'type', state: 'state', cardType: 'card_type', title: 'title',
      description: 'description', detail: 'detail', startTime: 'start_time',
      endTime: 'end_time', durationMin: 'duration_min', priority: 'priority',
      locationId: 'location_id', locationName: 'location_name', tags: 'tags',
      images: 'images', cost: 'cost', costCurrency: 'cost_currency'
    },
    location: {
      id: 'location_id', name: 'name', address: 'address', lat: 'lat', lng: 'lng',
      images: 'images', tags: 'tags', rating: 'rating', openTime: 'open_time',
      price: 'price'
    },
    users: {
      id: 'user_id', email: 'email', username: 'username',
      emailVerified: 'email_verified', role: 'role', avatar: 'avatar'
    }
  };

  return map[table]?.[frontendField] || frontendField;
}

/**
 * 安全地过滤响应数据
 * @param {object|array} data - 原始数据
 * @param {string} table - 表名
 * @param {object} options - 选项
 * @returns {object|array} 过滤后的数据
 */
export function safeFilterResponse(data, table, options = {}) {
  const { fields, isOwner = false } = options;

  if (Array.isArray(data)) {
    return data.map(item => safeFilterResponse(item, table, options));
  }

  if (!data || typeof data !== 'object') {
    return data;
  }

  // 1. 先过滤敏感字段（传递 table 参数）
  let result = filterSensitiveFields(data, { table, isOwner });

  // 2. 如果指定了字段，进行字段过滤
  if (fields && fields.length > 0) {
    result = filterFields(result, table, fields);
  }

  return result;
}

/**
 * 创建标准化的 V2 API 响应
 * @param {object} data - 响应数据
 * @param {object} meta - 元数据
 * @returns {object}
 */
export function createV2Response(data, meta = {}) {
  return {
    version: '2.0',
    timestamp: Date.now(),
    ...meta,
    data
  };
}

/**
 * 解析 V2 请求参数
 * @param {URL} url - 请求 URL
 * @param {object} body - 请求体
 * @returns {object} 解析后的参数
 */
export function parseV2Request(url, body = null) {
  const schema = parseSchema(url, body);
  const template = url.searchParams.get('template');

  return {
    schema,
    template,
    fields: url.searchParams.get('fields'),
    include: url.searchParams.get('include'), // 关联数据，如 'locations,distances'
    page: parseInt(url.searchParams.get('page') || '1', 10),
    limit: parseInt(url.searchParams.get('limit') || '20', 10)
  };
}

/**
 * 验证用户是否是资源所有者
 * @param {D1Database} db
 * @param {string} table - 表名
 * @param {string} resourceId - 资源 ID
 * @param {string} userId - 用户 ID
 * @returns {Promise<boolean>}
 */
export async function verifyResourceOwnership(db, table, resourceId, userId) {
  if (!db || !resourceId || !userId) {
    return false;
  }

  const idField = table === 'trip' ? 'trip_id' :
                  table === 'day' ? 'day_id' :
                  table === 'event' ? 'event_id' : 'id';

  try {
    const row = await db
      .prepare(`SELECT user_id FROM ${table} WHERE ${idField} = ?`)
      .bind(resourceId)
      .first();

    return row && String(row.user_id) === String(userId);
  } catch (error) {
    console.error(`[verifyResourceOwnership] Error:`, error);
    return false;
  }
}

export default {
  SENSITIVE_FIELDS,
  TABLE_FIELD_WHITELIST,
  isSensitiveField,
  filterSensitiveFields,
  buildSafeSelectFields,
  safeFilterResponse,
  createV2Response,
  parseV2Request,
  verifyResourceOwnership
};
