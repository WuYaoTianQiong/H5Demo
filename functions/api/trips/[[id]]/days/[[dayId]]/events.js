import { handleOptions } from "../../../../_auth.js";
import { requireUser } from "../../../../_userAuth.js";
import { jsonOk, jsonFail } from "../../../../_resp.js";
import { 
  normalizeEventObject, 
  saveLocation,
  getMaxEventOrder,
  shiftEventOrders,
  toInt,
  getEventWithOptions
} from "../../../../_scheduleCore.js";
import { getD1 } from "../../../../../config/env.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return handleOptions(context);

  let db;
  try {
    db = getD1(env);
  } catch (error) {
    return jsonFail(request, env, 503, 50300, "D1 binding not configured: " + error.message);
  }

  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  
  // 路径解析: /api/trips/:tripId/days/:dayId/events
  const tripsIndex = pathParts.indexOf("trips");
  const tripId = pathParts[tripsIndex + 1] ? decodeURIComponent(pathParts[tripsIndex + 1]) : null;
  const daysIndex = pathParts.indexOf("days");
  const dayId = pathParts[daysIndex + 1] ? decodeURIComponent(pathParts[daysIndex + 1]) : null;

  if (!tripId || !dayId) {
    return jsonFail(request, env, 400, 40001, "TripId and DayId required");
  }

  // 处理 dayId：如果是日期格式（如 2025-02-11），需要转换为 day_id
  let actualDayId = dayId;
  if (dayId && dayId.includes("-")) {
    // 按 date 字段查询对应的 day_id
    const row = await db
      .prepare("SELECT day_id FROM day WHERE trip_id = ? AND date = ?")
      .bind(tripId, dayId)
      .first();
    actualDayId = row?.day_id ? String(row.day_id).trim() : null;
    // 如果找不到对应的 day_id，返回错误
    if (!actualDayId) {
      return jsonFail(request, env, 404, 40401, "Day not found for the given date");
    }
  }

  // 鉴权
  const auth = await requireUser(db, request);
  if (!auth.ok) return jsonFail(request, env, 401, 40100, "Login required");
  
  // 检查权限
  const trip = await db.prepare("SELECT user_id FROM trip WHERE trip_id = ? AND COALESCE(is_deleted, 0) = 0").bind(tripId).first();
  if (!trip) return jsonFail(request, env, 404, 40400, "Trip not found");
  if (String(trip.user_id) !== String(auth.user.id)) return jsonFail(request, env, 403, 40300, "Permission denied");

  const now = Date.now();

  // POST /api/trips/:tripId/days/:dayId/events -> 创建事件
  if (request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    
    // 支持批量创建 (多选卡片拆分)
    const events = body.events;
    if (Array.isArray(events) && events.length > 0) {
      const startPosition = toInt(body.position, -1);
      const createdEventIds = [];

      if (startPosition >= 0) {
        await shiftEventOrders(db, tripId, actualDayId, startPosition, events.length);
      }

      for (let i = 0; i < events.length; i++) {
        const evtObj = normalizeEventObject(actualDayId, events[i], null);
        if (!evtObj) continue;

        if (events[i].location) await saveLocation(db, events[i].location);

        const order = startPosition >= 0 ? startPosition + i : await getMaxEventOrder(db, tripId, actualDayId) + 1;

        await db.prepare(`
          INSERT INTO event (event_id, day_id, trip_id, event_order, type, state, card_type, title, description, detail, start_time, end_time, duration_min, priority, location_id, location_name, tags, images, cost, cost_currency, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          evtObj.uid, actualDayId, tripId, order, evtObj.type, evtObj.state, evtObj.cardType,
          evtObj.title || null, evtObj.description || null, evtObj.detail || null, evtObj.startTime || null,
          evtObj.endTime || null, evtObj.durationMin || null, evtObj.priority,
          evtObj.locationId || null, evtObj.locationName || null,
          JSON.stringify(evtObj.tags), JSON.stringify(evtObj.images),
          evtObj.cost, evtObj.costCurrency, now, now
        ).run();

        createdEventIds.push(evtObj.uid);
      }

      // 查询批量创建后的事件数据并返回
      const createdEvents = [];
      for (const eventId of createdEventIds) {
        const eventResponse = await getEventWithOptions(db, tripId, eventId);
        if (eventResponse) {
          createdEvents.push(eventResponse);
        }
      }
      
      return jsonOk(request, env, { events: createdEvents, eventIds: createdEventIds, count: createdEventIds.length }, "created", 201);
    }

    // 单个创建
    const evtObj = normalizeEventObject(actualDayId, body.event || body, null);
    if (!evtObj) return jsonFail(request, env, 400, 40002, "Invalid event data");

    if (body.event?.location || body.location) {
      await saveLocation(db, body.event?.location || body.location);
    }

    const maxOrder = await getMaxEventOrder(db, tripId, actualDayId);
    const posRaw = body.position;
    let eventOrder = maxOrder + 1;
    if (posRaw !== undefined && posRaw !== null) {
      const pos = Math.max(0, Math.min(maxOrder + 1, toInt(posRaw, maxOrder + 1)));
      await shiftEventOrders(db, tripId, actualDayId, pos, 1);
      eventOrder = pos;
    }

    await db.prepare(`
      INSERT INTO event (event_id, day_id, trip_id, event_order, type, state, card_type, title, description, detail, start_time, end_time, duration_min, priority, location_id, location_name, tags, images, cost, cost_currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      evtObj.uid, actualDayId, tripId, eventOrder, evtObj.type, evtObj.state, evtObj.cardType,
      evtObj.title || null, evtObj.description || null, evtObj.detail || null, evtObj.startTime || null,
      evtObj.endTime || null, evtObj.durationMin || null, evtObj.priority,
      evtObj.locationId || null, evtObj.locationName || null,
      JSON.stringify(evtObj.tags), JSON.stringify(evtObj.images),
      evtObj.cost, evtObj.costCurrency, now, now
    ).run();

    // 处理多选子项
    if (evtObj.cardType === 'multi' && Array.isArray(body.event?.options || body.options)) {
      const options = body.event?.options || body.options;
      for (let i = 0; i < options.length; i++) {
        const opt = normalizeEventObject(actualDayId, options[i], null);
        if (options[i].location) await saveLocation(db, options[i].location);
        await db.prepare(`
          INSERT INTO event (event_id, day_id, trip_id, event_order, type, state, card_type, title, description, detail, start_time, end_time, duration_min, priority, location_id, location_name, tags, images, cost, cost_currency, parent_event_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          opt.uid, actualDayId, tripId, i, opt.type, opt.state, 'single', opt.title || null,
          opt.description || null, opt.detail || null, opt.startTime || null, opt.endTime || null,
          opt.durationMin || null, opt.priority, opt.locationId || null, opt.locationName || null,
          JSON.stringify(opt.tags), JSON.stringify(opt.images), opt.cost, opt.costCurrency, evtObj.uid, now, now
        ).run();
      }
    }

    // 查询创建后的事件数据并返回
    const eventResponse = await getEventWithOptions(db, tripId, evtObj.uid);
    
    return jsonOk(request, env, { event: eventResponse, eventId: evtObj.uid, eventOrder }, "created", 201);
  }

  return jsonFail(request, env, 405, 40500, "Method not allowed");
}
