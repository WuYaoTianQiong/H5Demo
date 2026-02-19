/**
 * 表结构缓存模块
 * 在应用启动时动态获取表结构并缓存，避免每次请求都执行 PRAGMA
 */

// 表结构缓存
const schemaCache = new Map();
let isInitialized = false;

async function ensureEventOrderColumn(db) {
  const { results } = await db.prepare('PRAGMA table_info(event)').bind().all();
  const cols = new Set((results || []).map(r => String(r.name || '').toLowerCase()));

  if (cols.has('event_order')) {
    return;
  }

  await db.prepare('ALTER TABLE event ADD COLUMN event_order INTEGER NOT NULL DEFAULT 0').bind().run();

  // 尽可能回填一个稳定顺序（使用 rowid 作为历史数据的顺序兜底）
  try {
    await db.prepare('UPDATE event SET event_order = rowid WHERE COALESCE(event_order, 0) = 0').bind().run();
  } catch {
    // ignore
  }

  // 索引幂等创建
  try {
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_event_day_order ON event (day_id, event_order)').bind().run();
  } catch {
    // ignore
  }
}


/**
 * 初始化表结构缓存
 * 在应用启动时调用一次，获取所有表的字段信息
 * @param {D1Database} db - D1 数据库实例
 */
export async function initTableSchemaCache(db) {
  if (isInitialized) {
    return;
  }

  const tables = ['event', 'location', 'day', 'trip'];

  // 兼容老库：确保关键字段存在（幂等）。
  // 若线上/本地存在历史数据库未执行最新 schema.sql，会导致查询 event_order 等字段时报错。
  try {
    await ensureEventOrderColumn(db);
  } catch (e) {
    console.error('[TableSchema] ensureEventOrderColumn failed:', e);
  }

  for (const tableName of tables) {
    try {
      const { results } = await db
        .prepare(`PRAGMA table_info(${tableName})`)
        .bind()
        .all();

      const fields = (results || []).map(row => row.name);
      schemaCache.set(tableName, {
        fields,
        fieldSet: new Set(fields.map(f => f.toLowerCase())),
        timestamp: Date.now()
      });

      console.log(`[TableSchema] 缓存表结构: ${tableName}, 字段数: ${fields.length}`);
    } catch (error) {
      console.error(`[TableSchema] 获取表结构失败: ${tableName}`, error);
      // 如果获取失败，使用空缓存，避免后续查询报错
      schemaCache.set(tableName, {
        fields: [],
        fieldSet: new Set(),
        timestamp: Date.now()
      });
    }
  }

  isInitialized = true;
}

/**
 * 获取表的字段列表
 * @param {string} tableName - 表名
 * @returns {string[]} 字段列表
 */
export function getTableFields(tableName) {
  const cached = schemaCache.get(tableName);
  return cached?.fields || [];
}

/**
 * 检查表是否有指定字段
 * @param {string} tableName - 表名
 * @param {string} fieldName - 字段名
 * @returns {boolean}
 */
export function hasTableField(tableName, fieldName) {
  const cached = schemaCache.get(tableName);
  return cached?.fieldSet?.has(fieldName.toLowerCase()) || false;
}

/**
 * 获取表结构信息
 * @param {string} tableName - 表名
 * @returns {object|null} 表结构信息
 */
export function getTableSchema(tableName) {
  return schemaCache.get(tableName) || null;
}

/**
 * 清除表结构缓存
 * 用于开发环境或需要重新加载时
 */
export function clearTableSchemaCache() {
  schemaCache.clear();
  isInitialized = false;
  console.log('[TableSchema] 缓存已清除');
}

/**
 * 检查缓存是否已初始化
 * @returns {boolean}
 */
export function isTableSchemaInitialized() {
  return isInitialized;
}

/**
 * 构建安全的 SELECT 字段列表
 * 自动过滤掉不存在的字段
 * @param {string} tableName - 表名
 * @param {string[]} requestedFields - 请求的字段列表
 * @returns {string} SQL SELECT 字段列表
 */
export function buildSafeSelectFields(tableName, requestedFields) {
  const cached = schemaCache.get(tableName);

  if (!cached || !cached.fields.length) {
    // 如果没有缓存，返回 *（让数据库处理）
    return '*';
  }

  if (!requestedFields || requestedFields.length === 0) {
    return cached.fields.join(', ');
  }

  // 过滤掉不存在的字段
  const validFields = requestedFields.filter(field =>
    cached.fieldSet.has(field.toLowerCase())
  );

  if (validFields.length === 0) {
    return '*';
  }

  return validFields.join(', ');
}
