import { handleOptions } from "../../../_auth.js";
import { requireUser } from "../../../_userAuth.js";
import { jsonOk, jsonFail } from "../../../_resp.js";
import { 
  normalizeEventObject, 
  saveLocation,
  hasColumn,
  toInt,
  getEventWithOptions
} from "../../../_scheduleCore.js";
import { getD1 } from "../../../../config/env.js";

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
  
  // 路径解析: /api/trips/:tripId/events/:eventId
  const tripsIndex = pathParts.indexOf("trips");
  const tripId = pathParts[tripsIndex + 1] ? decodeURIComponent(pathParts[tripsIndex + 1]) : null;
  const eventsIndex = pathParts.indexOf("events");
  const eventId = pathParts[eventsIndex + 1] ? decodeURIComponent(pathParts[eventsIndex + 1]) : null;

  if (!tripId || !eventId) {
    return jsonFail(request, env, 400, 40001, "TripId and EventId required");
  }

  // 鉴权
  const auth = await requireUser(db, request);
  if (!auth.ok) return jsonFail(request, env, 401, 40100, "Login required");
  
  // 检查权限
  const trip = await db.prepare("SELECT user_id FROM trip WHERE trip_id = ? AND COALESCE(is_deleted, 0) = 0").bind(tripId).first();
  if (!trip) return jsonFail(request, env, 404, 40400, "Trip not found");
  if (String(trip.user_id) !== String(auth.user.id)) return jsonFail(request, env, 403, 40300, "Permission denied");

  const now = Date.now();

  // PUT /api/trips/:tripId/events/:eventId -> 更新事件
  if (request.method === "PUT" || request.method === "PATCH") {
    const body = await request.json().catch(() => ({}));
    console.log(`[backend] PUT event ${eventId} start. body keys:`, Object.keys(body));
    
    // 查询当前事件完整数据
    const current = await db.prepare("SELECT * FROM event WHERE trip_id = ? AND event_id = ?").bind(tripId, eventId).first();
    if (!current) return jsonFail(request, env, 404, 40401, "Event not found");

    // 合并现有数据与更新数据
    const mergedData = {
      ...current,
      type: current.type,
      state: current.state,
      card_type: current.card_type,
      title: current.title,
      description: current.description,
      detail: current.detail,
      start_time: current.start_time,
      end_time: current.end_time,
      duration_min: current.duration_min,
      priority: current.priority,
      location_id: current.location_id,
      location_name: current.location_name,
      tags: current.tags,
      images: current.images,
      cost: current.cost,
      cost_currency: current.cost_currency,
      weather_json: current.weather_json,
      ...(body.event || body)
    };
    
    const eventObj = normalizeEventObject(current.day_id, mergedData, eventId);
    if (!eventObj) return jsonFail(request, env, 400, 40002, "Invalid event data");

    console.log(`[backend] eventObj detail length:`, (eventObj.detail || '').length);
    console.log(`[backend] detail value:`, eventObj.detail);

    // 保存位置
    if (body.event?.location || body.location) {
      await saveLocation(db, body.event?.location || body.location);
    }

    const hasIsDeleted = await hasColumn(db, 'event', 'is_deleted');
    const hasWeatherJson = await hasColumn(db, 'event', 'weather_json');
    
    const weatherJson = eventObj.weather ? JSON.stringify(eventObj.weather) : null;
    
    let sql, params;
    if (hasIsDeleted && hasWeatherJson) {
      sql = `UPDATE event SET type = ?, state = ?, card_type = ?, title = ?, description = ?, detail = ?, 
                start_time = ?, end_time = ?, duration_min = ?, priority = ?, location_id = ?, 
                location_name = ?, tags = ?, images = ?, cost = ?, cost_currency = ?, weather_json = ?,
                is_deleted = 0, deleted_at = NULL, updated_at = ? 
         WHERE trip_id = ? AND event_id = ?`;
      params = [eventObj.type, eventObj.state, eventObj.cardType, eventObj.title, eventObj.description || null,
        eventObj.detail || null, eventObj.startTime || null, eventObj.endTime || null, 
        eventObj.durationMin || null, eventObj.priority, eventObj.locationId || null, 
        eventObj.locationName || null, JSON.stringify(eventObj.tags), JSON.stringify(eventObj.images),
        eventObj.cost, eventObj.costCurrency, weatherJson, now, tripId, eventId];
    } else if (hasIsDeleted) {
      sql = `UPDATE event SET type = ?, state = ?, card_type = ?, title = ?, description = ?, detail = ?, 
                start_time = ?, end_time = ?, duration_min = ?, priority = ?, location_id = ?, 
                location_name = ?, tags = ?, images = ?, cost = ?, cost_currency = ?, 
                is_deleted = 0, deleted_at = NULL, updated_at = ? 
         WHERE trip_id = ? AND event_id = ?`;
      params = [eventObj.type, eventObj.state, eventObj.cardType, eventObj.title, eventObj.description || null,
        eventObj.detail || null, eventObj.startTime || null, eventObj.endTime || null, 
        eventObj.durationMin || null, eventObj.priority, eventObj.locationId || null, 
        eventObj.locationName || null, JSON.stringify(eventObj.tags), JSON.stringify(eventObj.images),
        eventObj.cost, eventObj.costCurrency, now, tripId, eventId];
    } else {
      sql = `UPDATE event SET type = ?, state = ?, card_type = ?, title = ?, description = ?, detail = ?, 
                start_time = ?, end_time = ?, duration_min = ?, priority = ?, location_id = ?, 
                location_name = ?, tags = ?, images = ?, cost = ?, cost_currency = ?, updated_at = ? 
         WHERE trip_id = ? AND event_id = ?`;
      params = [eventObj.type, eventObj.state, eventObj.cardType, eventObj.title, eventObj.description || null,
        eventObj.detail || null, eventObj.startTime || null, eventObj.endTime || null, 
        eventObj.durationMin || null, eventObj.priority, eventObj.locationId || null, 
        eventObj.locationName || null, JSON.stringify(eventObj.tags), JSON.stringify(eventObj.images),
        eventObj.cost, eventObj.costCurrency, now, tripId, eventId];
    }

    await db.prepare(sql).bind(...params).run();

    // 处理多选子项 (如果 body 中提供了完整 options)
    if (eventObj.cardType === 'multi' && Array.isArray(body.event?.options || body.options)) {
      await db.prepare("DELETE FROM event WHERE parent_event_id = ?").bind(eventId).run();
      const options = body.event?.options || body.options;
      for (let i = 0; i < options.length; i++) {
        const opt = normalizeEventObject(current.day_id, options[i], null);
        if (options[i].location) await saveLocation(db, options[i].location);
        
        await db.prepare(`
          INSERT INTO event (event_id, day_id, trip_id, event_order, type, state, card_type, title, description, detail, start_time, end_time, duration_min, priority, location_id, location_name, tags, images, cost, cost_currency, parent_event_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          opt.uid, current.day_id, tripId, i, opt.type, opt.state, 'single', opt.title || null,
          opt.description || null, opt.detail || null, opt.startTime || null, opt.endTime || null,
          opt.durationMin || null, opt.priority, opt.locationId || null, opt.locationName || null,
          JSON.stringify(opt.tags), JSON.stringify(opt.images), opt.cost, opt.costCurrency, eventId, now, now
        ).run();
      }
    }

    // 查询更新后的事件数据并返回
    const eventResponse = await getEventWithOptions(db, tripId, eventId);
    
    return jsonOk(request, env, { event: eventResponse, eventId, updatedAt: now }, "updated");
  }

  // DELETE /api/trips/:tripId/events/:eventId -> 删除事件
  if (request.method === "DELETE") {
    console.log(`[backend DELETE] 收到删除请求, tripId: ${tripId}, eventId: ${eventId}`);
    const current = await db.prepare("SELECT day_id, event_order FROM event WHERE trip_id = ? AND event_id = ?").bind(tripId, eventId).first();
    if (!current) {
      console.log(`[backend DELETE] 事件未找到, tripId: ${tripId}, eventId: ${eventId}`);
      return jsonFail(request, env, 404, 40401, "Event not found");
    }
    console.log(`[backend DELETE] 找到事件, day_id: ${current.day_id}, event_order: ${current.event_order}`);

    const hasIsDeleted = await hasColumn(db, 'event', 'is_deleted');
    console.log(`[backend DELETE] hasIsDeleted: ${hasIsDeleted}`);
    if (hasIsDeleted) {
      await db.prepare("UPDATE event SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE trip_id = ? AND event_id = ?").bind(now, now, tripId, eventId).run();
      console.log(`[backend DELETE] 软删除完成`);
    } else {
      await db.prepare("DELETE FROM event WHERE trip_id = ? AND event_id = ?").bind(tripId, eventId).run();
      console.log(`[backend DELETE] 硬删除完成`);
    }

    // 后续移位
    await db.prepare("UPDATE event SET event_order = event_order - 1 WHERE trip_id = ? AND day_id = ? AND event_order > ?").bind(tripId, current.day_id, toInt(current.event_order, 0)).run();
    console.log(`[backend DELETE] 后续移位完成`);

    console.log(`[backend DELETE] 返回成功响应`);
    return jsonOk(request, env, { eventId, deleted: true }, "deleted");
  }

  return jsonFail(request, env, 405, 40500, "Method not allowed");
}
