import { generateEventId } from "../../src/utils/id-generator.js";

export function toInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

export function normalizeDayObject(day) {
  if (!day || typeof day !== "object") return null;
  const id = String(day.id || "").trim();
  if (!id) return null;
  const cleaned = { ...day };
  delete cleaned.events;
  cleaned.id = id;
  return cleaned;
}

export function generateShortDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return "";
  const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return "";
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  return `${month}月${day}日`;
}

export function ensureEventUid(dayId, evt, existingUid) {
  const uid = String(existingUid || evt?.uid || "").trim();
  return uid || generateEventId();
}

export function normalizeEventObject(dayId, evt, existingUid) {
  if (!evt || typeof evt !== "object") return null;
  const uid = ensureEventUid(dayId, evt, existingUid);
  const cleaned = { ...evt, uid };

  if (evt.time !== undefined && evt.startTime === undefined) cleaned.startTime = evt.time;
  if (evt.end_time !== undefined && evt.endTime === undefined) cleaned.endTime = evt.end_time;

  if (evt.duration !== undefined && evt.durationMin === undefined) {
    const durationText = String(evt.duration || "");
    let totalMinutes = 0;
    const hourMatch = durationText.match(/(\d+)\s*小时/);
    const minuteMatch = durationText.match(/(\d+)\s*分钟/);
    if (hourMatch) totalMinutes += parseInt(hourMatch[1]) * 60;
    if (minuteMatch) totalMinutes += parseInt(minuteMatch[1]);
    cleaned.durationMin = totalMinutes > 0 ? totalMinutes : null;
  }

  if (evt.location && typeof evt.location === "object") {
    const loc = evt.location;
    cleaned.locationId = loc.locationId || loc.id || loc.poi?.id || null;
    cleaned.locationName = loc.name || null;
  }

  cleaned.priority = toInt(cleaned.priority, 0);
  cleaned.images = cleaned.images || [];
  
  // 处理 cost 字段 - 支持 cost (camelCase)
  // 注意：如果 cost 是 undefined，设为 null；否则保留原值（数字或 null）
  if (cleaned.cost === undefined) {
    cleaned.cost = null;
  } else if (cleaned.cost !== null && cleaned.cost !== '') {
    const numCost = Number(cleaned.cost);
    cleaned.cost = isNaN(numCost) ? null : numCost;
  }
  
  // 处理 costCurrency 字段 - 支持 costCurrency (camelCase) 和 cost_currency (snake_case)
  cleaned.costCurrency = cleaned.costCurrency || cleaned.cost_currency || 'CNY';
  cleaned.cardType = cleaned.cardType || cleaned.card_type || 'single';
  cleaned.state = cleaned.state || 'active';
  cleaned.type = cleaned.type || 'activity';
  
  // 保留天气数据
  if (evt.weather) {
    cleaned.weather = evt.weather;
  }

  return cleaned;
}

export function normalizeLocationId(value) {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  return i > 0 ? String(i) : null;
}

export async function hasColumn(db, tableName, columnName) {
  try {
    const { results } = await db.prepare(`PRAGMA table_info(${tableName})`).bind().all();
    return (results || []).some(row => String(row?.name || "").toLowerCase() === columnName.toLowerCase());
  } catch { return false; }
}

export async function getMaxDayOrder(db, tripId) {
  const row = await db.prepare("SELECT MAX(day_order) AS n FROM day WHERE trip_id = ?").bind(tripId).first();
  return toInt(row?.n, -1);
}

export async function shiftDayOrders(db, tripId, fromInclusive, delta) {
  await db.prepare("UPDATE day SET day_order = day_order + ? WHERE trip_id = ? AND day_order >= ?").bind(delta, tripId, fromInclusive).run();
}

export async function getMaxEventOrder(db, tripId, dayId) {
  const row = await db.prepare("SELECT MAX(event_order) AS n FROM event WHERE trip_id = ? AND day_id = ?").bind(tripId, dayId).first();
  return toInt(row?.n, -1);
}

export async function shiftEventOrders(db, tripId, dayId, fromInclusive, delta) {
  await db.prepare("UPDATE event SET event_order = event_order + ? WHERE trip_id = ? AND day_id = ? AND event_order >= ?").bind(delta, tripId, dayId, fromInclusive).run();
}

export async function saveLocation(db, location) {
  const locationId = normalizeLocationId(location.locationId || location.id || location.poi?.id);
  if (!locationId) return null;

  const now = Date.now();
  await db.prepare(`
    INSERT OR REPLACE INTO location (location_id, name, address, lng, lat, meta_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    locationId, location.name || null, location.address || null,
    location.lng || null, location.lat || null,
    location.poi ? JSON.stringify(location.poi) : null, now, now
  ).run();
  return locationId;
}

/**
 * 解析 dayId，支持数字索引或字符串 ID
 * @param {Object} db - 数据库连接
 * @param {string} tripId - 行程 ID
 * @param {string|number} dayIdInput - 输入的 dayId（可能是数字索引或字符串 ID）
 * @returns {Promise<string|null>} - 返回解析后的 dayId 或 null
 */
export async function resolveDayId(db, tripId, dayIdInput) {
  if (!dayIdInput) return null;

  // 如果是纯数字，尝试作为索引查找
  const dayIndex = toInt(dayIdInput, -1);
  if (dayIndex >= 0) {
    const day = await db.prepare(
      "SELECT day_id FROM day WHERE trip_id = ? ORDER BY day_order ASC LIMIT 1 OFFSET ?"
    ).bind(tripId, dayIndex).first();
    if (day) return day.day_id;
  }

  // 否则作为 day_id 直接查询
  const day = await db.prepare(
    "SELECT day_id FROM day WHERE trip_id = ? AND day_id = ?"
  ).bind(tripId, String(dayIdInput)).first();

  return day ? day.day_id : null;
}

/**
 * 将数据库事件行数据转换为前端格式（驼峰命名）
 * @param {Object} row - 数据库原始行数据
 * @returns {Object} 前端格式的事件对象
 */
export function formatEventResponse(row) {
  if (!row) return null;
  
  return {
    uid: row.event_id,
    id: row.event_id,
    dayId: row.day_id,
    tripId: row.trip_id,
    type: row.type,
    state: row.state,
    cardType: row.card_type,
    title: row.title,
    description: row.description,
    detail: row.detail,
    startTime: row.start_time,
    endTime: row.end_time,
    time: row.start_time,
    durationMin: row.duration_min,
    priority: row.priority,
    locationId: row.location_id,
    locationName: row.location_name,
    tags: safeParseJSON(row.tags),
    images: safeParseJSON(row.images),
    cost: row.cost,
    costCurrency: row.cost_currency || 'CNY',
    parentEventId: row.parent_event_id,
    weather: safeParseJSON(row.weather_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * 安全解析 JSON 字符串
 * @param {string} value - JSON 字符串
 * @returns {any} 解析后的值，解析失败返回 null
 */
function safeParseJSON(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * 查询事件及其子选项（多选卡）
 * @param {Object} db - 数据库连接
 * @param {string} tripId - 行程 ID
 * @param {string} eventId - 事件 ID
 * @returns {Promise<Object>} 完整的事件对象（包含 options）
 */
export async function getEventWithOptions(db, tripId, eventId) {
  const event = await db.prepare("SELECT * FROM event WHERE trip_id = ? AND event_id = ?")
    .bind(tripId, eventId).first();
  
  if (!event) return null;
  
  const eventResponse = formatEventResponse(event);
  
  // 如果是多选卡，查询子选项
  if (eventResponse.cardType === 'multi') {
    const { results: childEvents } = await db.prepare(
      "SELECT * FROM event WHERE parent_event_id = ? ORDER BY event_order ASC"
    ).bind(eventId).all();
    
    eventResponse.options = (childEvents || []).map(formatEventResponse);
  }
  
  return eventResponse;
}
