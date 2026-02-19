/**
 * Trips API V2 核心函数
 * 供 trips/[[id]].js 和其他模块共享使用
 */
import {
  buildSafeSelectFields,
  safeFilterResponse,
} from './_apiV2Helper.js';
import { getSchemaTemplate } from './_fieldSchema.js';

function toInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

/**
 * 获取行程的日期列表
 */
export async function getTripDaysList(db, tripId) {
  try {
    const { results } = await db
      .prepare(`
        SELECT day_id, date, short_date, location, day_order
        FROM day
        WHERE trip_id = ?
        ORDER BY day_order ASC, date ASC
      `)
      .bind(tripId)
      .all();

    return (results || []).map(row => ({
      id: String(row.day_id || ''),
      date: String(row.date || ''),
      shortDate: String(row.short_date || ''),
      location: String(row.location || ''),
      order: Number(row.day_order || 0)
    }));
  } catch (error) {
    console.error(`[getTripDaysList] Error for trip ${tripId}:`, error);
    return [];
  }
}

/**
 * 计算行程完成进度 - 优化版本
 * 支持多选卡：如果父卡片有子选项，根据子选项的完成状态计算
 */
export async function calculateTripProgress(db, tripId) {
  try {
    const { results: allEvents } = await db
      .prepare(`
        SELECT 
          event_id,
          parent_event_id,
          state,
          card_type
        FROM event
        WHERE trip_id = ? AND COALESCE(is_deleted, 0) = 0
      `)
      .bind(tripId)
      .all();

    if (!allEvents || allEvents.length === 0) {
      return 0;
    }

    const mainEvents = [];
    const childEventsMap = new Map();

    for (const event of allEvents) {
      if (event.parent_event_id === null) {
        mainEvents.push(event);
      } else {
        const parentId = event.parent_event_id;
        if (!childEventsMap.has(parentId)) {
          childEventsMap.set(parentId, []);
        }
        childEventsMap.get(parentId).push(event);
      }
    }

    let total = 0;
    let completed = 0;

    for (const event of mainEvents) {
      const children = childEventsMap.get(event.event_id);

      if (children && children.length > 0) {
        for (const child of children) {
          total++;
          if (child.state === 'completed' || child.state === 'inactive') {
            completed++;
          }
        }
      } else {
        total++;
        if (event.state === 'completed') {
          completed++;
        }
      }
    }

    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  } catch (error) {
    console.error(`[calculateTripProgress] Error for trip ${tripId}:`, error);
    return 0;
  }
}

/**
 * 获取行程列表（V2）
 */
export async function getTripsV2(db, url, userId, options = {}) {
  const { schema, template = 'card' } = options;

  const fieldConfig = schema?.trip || getSchemaTemplate(template)?.trip;

  const selectFields = buildSafeSelectFields('trip', fieldConfig, {
    isOwner: false,
    includeSensitive: false
  });

  const search = url.searchParams.get('q') || '';
  const year = url.searchParams.get('year') || '';
  const status = url.searchParams.get('status') || '';
  const limit = toInt(url.searchParams.get('limit'), 20);
  const offset = toInt(url.searchParams.get('offset'), 0);

  const conditions = [];
  const params = [];

  if (userId) {
    conditions.push('(user_id = ? OR (visibility = ? AND status = ?))');
    params.push(userId, 'public', 'published');
  } else {
    conditions.push('(visibility = ? AND status = ?)');
    params.push('public', 'published');
  }

  if (search) {
    conditions.push('(trip_id LIKE ? OR title LIKE ? OR description LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  if (year) {
    conditions.push('year = ?');
    params.push(toInt(year));
  }

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*) as total FROM trip ${where}`;
  const countResult = await db.prepare(countSql).bind(...params).first();
  const total = toInt(countResult?.total, 0);

  const dataSql = `
    SELECT ${selectFields}
    FROM trip
    ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);

  const { results } = await db.prepare(dataSql).bind(...params).all();

  const trips = (results || []).map(row => {
    let trip = safeFilterResponse(row, 'trip', { fields: fieldConfig });

    if (trip.city_list && typeof trip.city_list === 'string') {
      try {
        trip.city_list = JSON.parse(trip.city_list);
      } catch {
        trip.city_list = [];
      }
    }

    return trip;
  });

  if (!fieldConfig || fieldConfig.includes('completed')) {
    for (let i = 0; i < trips.length; i++) {
      const originalRow = results[i];
      const tripId = originalRow?.trip_id || trips[i].id || trips[i].tripId;
      trips[i].completed = await calculateTripProgress(db, tripId);
    }
  }

  return {
    trips,
    pagination: {
      limit,
      offset,
      total
    }
  };
}

/**
 * 获取单个行程（V2）- 优化版本
 */
export async function getTripV2(db, tripId, userId, options = {}) {
  const { schema, template = 'detail', includeDays = true } = options;

  const fieldConfig = schema?.trip || getSchemaTemplate(template)?.trip;

  const selectFields = buildSafeSelectFields('trip', fieldConfig, {
    isOwner: false,
    includeSensitive: false
  });

  const sql = `SELECT ${selectFields}, user_id, visibility, status FROM trip WHERE trip_id = ?`;
  const row = await db.prepare(sql).bind(tripId).first();

  if (!row) {
    return null;
  }

  const visibility = row.visibility || 'private';
  const status = row.status || 'draft';
  const isOwner = String(row.user_id) === String(userId);

  const isPublic = visibility === 'public' && status === 'published';
  const isLinkShared = visibility === 'link';
  if (!isPublic && !isLinkShared && !isOwner) {
    return null;
  }

  const needProgress = !fieldConfig || fieldConfig.includes('completed');
  
  const [progressResult, daysListResult] = await Promise.all([
    needProgress ? calculateTripProgress(db, tripId) : Promise.resolve(0),
    includeDays ? getTripDaysList(db, tripId) : Promise.resolve([])
  ]);

  let trip = safeFilterResponse(row, 'trip', { fields: fieldConfig, isOwner });

  if (trip.city_list && typeof trip.city_list === 'string') {
    try {
      trip.city_list = JSON.parse(trip.city_list);
    } catch {
      trip.city_list = [];
    }
  }

  trip.completed = progressResult;

  return {
    trip,
    daysList: daysListResult
  };
}

export { toInt };
