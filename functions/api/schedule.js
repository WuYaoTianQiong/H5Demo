/**
 * Schedule API V2 - JSON Schema 字段选择版本
 * 提供按需返回字段的能力，减少数据传输量
 *
 * 优化点：
 * 1. 使用 _tableSchema.js 模块缓存表结构，避免每次请求执行 PRAGMA
 * 2. 在应用启动时初始化表结构缓存
 */
import { handleOptions } from "./_auth.js";
import { jsonOk, jsonFail } from "./_resp.js";
import { getD1 } from "../config/env.js";
import {
  buildSelectFields,
  filterFields,
  parseSchema,
  getSchemaTemplate,
} from "./_fieldSchema.js";
import {
  initTableSchemaCache,
  getTableFields,
  isTableSchemaInitialized
} from "./_tableSchema.js";

function toInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

/**
 * 解析字段列表，返回安全的字段选择
 * 使用缓存的表结构，自动过滤不存在的字段
 */
function resolveEventSelectFields(eventFields) {
  const selectFields = buildSelectFields("event", eventFields);
  const requiredFields = ['card_type', 'parent_event_id'];

  if (selectFields === "*") {
    const dbFields = getTableFields("event");
    if (dbFields.length > 0) {
      const fieldSet = new Set(dbFields.map(f => f.toLowerCase()));
      const finalFields = [...dbFields];
      for (const f of requiredFields) {
        if (!fieldSet.has(f.toLowerCase())) {
          finalFields.push(f);
        }
      }
      return finalFields.join(", ");
    }
    return "*";
  }

  const parts = selectFields.split(",").map(p => p.trim()).filter(Boolean);
  const fieldSet = new Set(parts.map(p => p.toLowerCase()));
  let needsAdd = false;
  for (const f of requiredFields) {
    if (!fieldSet.has(f.toLowerCase())) {
      needsAdd = true;
      break;
    }
  }
  if (needsAdd) {
    for (const f of requiredFields) {
      if (!fieldSet.has(f.toLowerCase())) {
        parts.push(f);
      }
    }
  }

  return parts.join(", ");
}

function resolveLocationSelectFields(locationFields) {
  const selectFields = buildSelectFields("location", locationFields);
  if (!locationFields || locationFields.length === 0) {
    return selectFields;
  }

  // 使用缓存的表结构
  const dbFields = getTableFields("location");
  if (dbFields.length === 0) {
    return selectFields;
  }

  const available = new Set(dbFields.map(f => f.toLowerCase()));

  const parts = selectFields
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const resolved = parts.map((part) => {
    const base = part.split(/\s+AS\s+/i)[0]?.trim();
    if (!base) {
      return part;
    }
    if (!available.has(base.toLowerCase())) {
      return `NULL AS ${base}`;
    }
    return part;
  });

  return resolved.join(", ");
}

/**
 * 构建精简版日程数据 - 优化版本
 * @param {D1Database} db
 * @param {string} tripId
 * @param {string|null} dayId
 * @param {object} schema - 字段选择 Schema
 * @param {string|null} eventId - 可选，指定事件ID（精准查询）
 */
async function buildScheduleDataV2(db, tripId, dayId, schema, eventId = null) {
  const perf = { start: Date.now(), steps: {} };
  const eventFields = schema?.event;
  const dayFields = schema?.day;
  const locationFields = schema?.location;

  // 处理 dayId：如果是日期格式（如 2025-02-11），需要转换为 day_id
  let actualDayId = dayId;

  if (dayId && dayId.includes("-")) {
    // 按 date 字段查询对应的 day_id
    const row = await db
      .prepare("SELECT day_id FROM day WHERE trip_id = ? AND date = ?")
      .bind(tripId, dayId)
      .first();
    actualDayId = row?.day_id ? String(row.day_id).trim() : null;

    // 如果找不到对应的 day_id，尝试直接使用日期作为 day_id（兼容旧数据）
    if (!actualDayId) {
      actualDayId = dayId;
    }
  }

  // 1. 并行准备：查询 Day 数据和解析字段
  const daySql = `SELECT ${buildSelectFields("day", dayFields)} FROM day WHERE trip_id = ?${actualDayId ? " AND day_id = ?" : ""} ORDER BY day_order ASC`;
  const dayStmt = actualDayId
    ? db.prepare(daySql).bind(tripId, actualDayId)
    : db.prepare(daySql).bind(tripId);

  // 并行执行 Day 查询和字段解析
  const eventSelectFields = resolveEventSelectFields(eventFields);
  perf.steps.beforeDayQuery = Date.now() - perf.start;

  const dayResult = await dayStmt.all();
  perf.steps.dayQuery = Date.now() - perf.start - perf.steps.beforeDayQuery;

  let { results: days } = dayResult;

  // 如果没有找到 day 记录，但有 actualDayId，创建一个虚拟的 day 对象
  if ((!days || days.length === 0) && actualDayId) {
    days = [{
      day_id: actualDayId,
      date: actualDayId.includes('-') ? actualDayId : '',
      short_date: actualDayId.includes('-') ? generateShortDate(actualDayId) : '',
      location: ''
    }];
  }

  // 2. 批量查询所有天的事件（主事件+子事件一次性查询，解决 N+1 问题）
  const locationIds = new Set();
  const schedule = [];

  perf.steps.beforeEventQuery = Date.now() - perf.start;

  const dayIds = (days || []).map(d => d.day_id).filter(Boolean);
  
  if (dayIds.length > 0) {
    const placeholders = dayIds.map(() => "?").join(",");
    const allEventsSql = eventId
      ? `
      SELECT ${eventSelectFields}, day_id, parent_event_id,
             CASE WHEN parent_event_id IS NULL THEN 0 ELSE 1 END as is_child
      FROM event
      WHERE trip_id = ? AND day_id IN (${placeholders}) AND COALESCE(is_deleted, 0) = 0
        AND (event_id = ? OR parent_event_id = ?)
      ORDER BY event_order ASC
    `
      : `
      SELECT ${eventSelectFields}, day_id, parent_event_id,
             CASE WHEN parent_event_id IS NULL THEN 0 ELSE 1 END as is_child
      FROM event
      WHERE trip_id = ? AND day_id IN (${placeholders}) AND COALESCE(is_deleted, 0) = 0
      ORDER BY event_order ASC
    `;

    const params = eventId 
      ? [tripId, ...dayIds, eventId, eventId]
      : [tripId, ...dayIds];

    const { results: allEvents } = await db.prepare(allEventsSql).bind(...params).all();
    perf.steps.eventQuery = Date.now() - perf.start - perf.steps.beforeEventQuery;

    // 按 day_id 分组存储事件
    const eventsByDay = new Map();
    const childEventsByParent = new Map();

    for (const e of allEvents || []) {
      // 收集 locationId
      const shouldCollectLocation = eventFields === null || eventFields?.includes("locationId") || eventFields?.includes("location");
      if (shouldCollectLocation && e.location_id) {
        locationIds.add(e.location_id);
      }

      if (e.is_child === 0 || e.parent_event_id === null) {
        if (!eventsByDay.has(e.day_id)) eventsByDay.set(e.day_id, []);
        eventsByDay.get(e.day_id).push(e);
      } else {
        const parentId = e.parent_event_id;
        if (!childEventsByParent.has(parentId)) childEventsByParent.set(parentId, []);
        childEventsByParent.get(parentId).push(e);
      }
    }

    // 组装数据
    for (const d of days || []) {
      const dayObj = filterFields(d, "day", dayFields);
      dayObj._rawDayId = d.day_id;
      const dayEvents = eventsByDay.get(d.day_id) || [];

      dayObj.events = dayEvents.map(e => {
        const eventObj = filterFields(e, "event", eventFields);
        if (e.card_type === "multi" && (!eventFields || eventFields?.includes("options"))) {
          const children = childEventsByParent.get(e.event_id) || [];
          eventObj.options = children.map(child => {
            const childObj = filterFields(child, "event", eventFields);
            if (child.location_id) childObj.locationId = child.location_id;
            if (child.location_name) childObj.locationName = child.location_name;
            return childObj;
          });
        }
        return eventObj;
      });
      schedule.push(dayObj);
    }
  } else {
    // 处理没有天数的情况
    for (const d of days || []) {
      const dayObj = filterFields(d, "day", dayFields);
      dayObj._rawDayId = d.day_id;
      dayObj.events = [];
      schedule.push(dayObj);
    }
  }

  perf.steps.afterEvents = Date.now() - perf.start;

  // 3. 按需查询 locations
  let locations = [];
  console.log('[buildScheduleDataV2 Debug] locationFields:', locationFields, 'locationIds.size:', locationIds.size);
  console.log('[buildScheduleDataV2 Debug] locationIds:', Array.from(locationIds));
  // 当 locationFields 为 null（表示全部字段）或有指定字段且 locationIds 不为空时，查询 location 表
  if ((locationFields === null || locationFields) && locationIds.size > 0) {
    const ids = Array.from(locationIds);
    const placeholders = ids.map(() => "?").join(",");
    const locationSelectFields = resolveLocationSelectFields(locationFields);
    const locationSql = `SELECT ${locationSelectFields} FROM location WHERE location_id IN (${placeholders})`;
    console.log('[buildScheduleDataV2 Debug] locationSql:', locationSql);

    const locationQueryStart = Date.now();
    const { results: locResults } = await db
      .prepare(locationSql)
      .bind(...ids)
      .all();
    perf.steps.locationQuery = Date.now() - locationQueryStart;
    console.log('[buildScheduleDataV2 Debug] locResults count:', locResults?.length || 0);

    locations = (locResults || []).map((l) => filterFields(l, "location", locationFields));
  }

  perf.steps.total = Date.now() - perf.start;
  console.log(`[Schedule V2] 性能分析:`, JSON.stringify(perf.steps));

  return { schedule, locations, perf: perf.steps };
}

/**
 * 构建 location 映射表
 */
function buildLocationMap(locations) {
  const map = new Map();
  for (const loc of locations || []) {
    const id = loc.id || loc.locationId;
    if (id) {
      map.set(String(id), loc);
      map.set(Number(id), loc);
    }
  }
  return map;
}

/**
 * 将 location 关联到 events
 */
function attachLocations(schedule, locationMap, schema) {
  const eventFields = schema?.event;
  console.log('[attachLocations Debug] schema.event:', eventFields);
  // 当 schema.event 为 null（表示全部字段）或包含 "location" 时，执行关联
  if (eventFields !== null && !eventFields?.includes("location")) {
    console.log('[attachLocations Debug] Skipping location attachment - location not in schema.event');
    return schedule;
  }

  for (const day of schedule || []) {
    for (const event of day.events || []) {
      if (event.locationId) {
        event.location =
          locationMap.get(String(event.locationId)) ||
          locationMap.get(Number(event.locationId)) ||
          null;
      }

      // 处理多选卡的 location
      if (event.options) {
        console.log('[attachLocations Debug] Processing multi-card options:', event.options.length);
        for (const option of event.options) {
          console.log('[attachLocations Debug] Option:', option.id || option.title, 'locationId:', option.locationId);
          if (option.locationId) {
            const locFromMap = locationMap.get(String(option.locationId)) || locationMap.get(Number(option.locationId));
            console.log('[attachLocations Debug] Found location in map:', !!locFromMap);
            option.location = locFromMap || null;
          }
        }
      }
    }
  }

  return schedule;
}

/**
 * 生成短日期格式（如 "2.11"）
 * @param {string} dateStr - 日期字符串（如 "2025-02-11"）
 * @returns {string} 短日期格式（如 "2.11"）
 */
function generateShortDate(dateStr) {
  if (!dateStr) return "";
  const match = String(dateStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return "";
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);
  return `${m}.${d}`;
}

/**
 * 格式化时长为文本
 * @param {number} minutes - 分钟数
 * @returns {string} 格式化后的文本，如 "1小时30分钟"
 */
function formatDurationText(minutes) {
  if (!minutes || minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}小时${mins}分钟`;
  } else if (hours > 0) {
    return `${hours}小时`;
  } else {
    return `${mins}分钟`;
  }
}

/**
 * 处理 events 数据，添加派生字段
 * - time: 与 startTime 相同，用于统一时间字段
 * - duration: 将 durationMin 转换为对象 {hours, minutes, text}
 */
function processEvents(schedule, schema) {
  const eventFields = schema?.event;
  if (!eventFields) return schedule;

  const needsTime = eventFields === null || eventFields.includes('time');
  const needsDuration = eventFields === null || eventFields.includes('duration');

  if (!needsTime && !needsDuration) return schedule;

  for (const day of schedule || []) {
    for (const event of day.events || []) {
      // 添加 time 字段（与 startTime 相同）
      if (needsTime && event.startTime) {
        event.time = event.startTime;
      }

      // 将 durationMin 转换为 duration 对象
      if (needsDuration && event.durationMin) {
        const mins = parseInt(event.durationMin, 10) || 0;
        event.duration = {
          hours: Math.floor(mins / 60),
          minutes: mins % 60,
          text: formatDurationText(mins)
        };
      }

      // 处理多选卡的 options
      if (event.options) {
        for (const option of event.options) {
          if (needsTime && option.startTime) {
            option.time = option.startTime;
          }
          if (needsDuration && option.durationMin) {
            const mins = parseInt(option.durationMin, 10) || 0;
            option.duration = {
              hours: Math.floor(mins / 60),
              minutes: mins % 60,
              text: formatDurationText(mins)
            };
          }
        }
      }
    }
  }

  return schedule;
}

/**
 * 获取行程基本信息
 * @param {D1Database} db
 * @param {string} tripId
 * @returns {object|null} 行程信息
 */
async function getTripBasicInfo(db, tripId) {
  try {
    const trip = await db
      .prepare("SELECT * FROM trip WHERE trip_id = ?")
      .bind(tripId)
      .first();

    if (!trip) return null;

    return {
      id: trip.trip_id,
      tripId: trip.trip_id,
      title: trip.title,
      description: trip.description,
      startDate: trip.start_date,
      endDate: trip.end_date,
      days: trip.days,
      cityList: trip.city_list ? JSON.parse(trip.city_list) : [],
      coverImage: trip.cover_image,
      status: trip.status,
      visibility: trip.visibility,
      footerText: trip.footer_text,
      travelerCount: trip.traveler_count,
      budgetPerPersonMin: trip.budget_per_person_min,
      budgetPerPersonMax: trip.budget_per_person_max,
      budgetUnit: trip.budget_unit,
      completed: trip.completed,
      createdAt: trip.created_at,
      updatedAt: trip.updated_at
    };
  } catch (error) {
    console.error("[Schedule V2] 获取行程信息失败:", error);
    return null;
  }
}

/**
 * 从行程日期范围构建天数列表
 * @param {object} trip
 * @returns {array} 天数列表
 */
function buildDaysFromTrip(trip) {
  if (!trip?.startDate || !trip?.endDate) return [];

  const days = [];
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  const dayMs = 24 * 60 * 60 * 1000;
  const daysCount = Math.max(1, Math.floor((end - start) / dayMs) + 1);

  for (let i = 0; i < daysCount; i++) {
    const date = new Date(start.getTime() + i * dayMs);
    const dateStr = date.toISOString().split('T')[0];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    days.push({
      id: dateStr,
      date: dateStr,
      shortDate: `${month}.${day}`,
      location: ''
    });
  }

  return days;
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return handleOptions(context);
  }

  let db;
  try {
    db = getD1(env);
  } catch (error) {
    return jsonFail(request, env, 503, 50300, "D1 binding not configured: " + error.message);
  }

  // 初始化表结构缓存（只在首次请求时执行）
  if (!isTableSchemaInitialized()) {
    try {
      await initTableSchemaCache(db);
    } catch (error) {
      console.error("[Schedule V2] 初始化表结构缓存失败:", error);
      // 继续执行，使用默认行为
    }
  }

  const url = new URL(request.url);
  const tripId =
    url.searchParams.get("tripId") || url.searchParams.get("scheduleId");

  if (!tripId) {
    return jsonFail(request, env, 400, 40001, "Missing tripId or scheduleId parameter");
  }

  try {
    // 解析 Schema
    let body = null;
    if (request.method === "POST") {
      try {
        body = await request.json();
      } catch {
        // 忽略解析错误
      }
    }

    let schema = parseSchema(url, body);

    // 如果没有提供 schema，尝试使用 template 参数
    if (!schema) {
      const template = url.searchParams.get("template");
      if (template) {
        schema = getSchemaTemplate(template);
      }
    }

    // 默认使用 card 模板
    if (!schema) {
      schema = getSchemaTemplate("card");
    }

    const dayId = url.searchParams.get("dayId") || null;
    const eventId = url.searchParams.get("eventId") || null;
    const includeTrip = url.searchParams.get("includeTrip") === "true";

    // 构建数据
    const { schedule, locations, perf } = await buildScheduleDataV2(
      db,
      tripId,
      dayId,
      schema,
      eventId, // 传递 eventId 用于精准查询
    );

    // 构建 location 映射并关联
    const locationMap = buildLocationMap(locations);
    const scheduleWithLocations = attachLocations(
      schedule,
      locationMap,
      schema,
    );

    // 处理 events 数据，添加派生字段（time, duration 等）
    const processedSchedule = processEvents(scheduleWithLocations, schema);

    // 返回精简数据
    const responseData = {
      tripId,
      data: processedSchedule,
    };

    // 当 schema.location 为 null（表示全部字段）或有值且 locations 不为空时，返回 locations
    if ((schema?.location === null || schema?.location) && locations.length > 0) {
      responseData.locations = locations;
    }

    // 如果请求包含行程信息，从数据库查询所有 day 记录返回天数列表
    if (includeTrip) {
      const { results: allDays } = await db
        .prepare("SELECT day_id, date, short_date, location, day_order FROM day WHERE trip_id = ? ORDER BY day_order ASC, date ASC")
        .bind(tripId)
        .all();

      if (allDays && allDays.length > 0) {
        responseData.daysList = allDays.map(d => ({
          id: String(d.day_id || ''),
          date: String(d.date || ''),
          shortDate: String(d.short_date || ''),
          location: String(d.location || ''),
          order: Number(d.day_order || 0)
        }));
      } else {
        const tripInfo = await getTripBasicInfo(db, tripId);
        if (tripInfo) {
          responseData.daysList = buildDaysFromTrip(tripInfo);
        }
      }
    }

    // DEBUG: 返回调试信息（仅在显式开启时返回）
    const debugEnabled = url.searchParams.get("debug") === "1" || url.searchParams.get("debug") === "true";
    if (debugEnabled) {
      const firstDay = processedSchedule[0];
      responseData._debug = {
        dayId,
        firstDayRawDayId: firstDay?._rawDayId,
        firstDayId: firstDay?.id,
        eventId,
        eventCount: firstDay?.events?.length || 0,
        perf
      };
    }

    return jsonOk(request, env, responseData);
  } catch (error) {
    console.error("[Schedule V2] Error:", error);
    return jsonFail(request, env, 500, 50000, "Internal server error", { message: error.message });
  }
}
