import { handleOptions } from "../../_auth.js";
import { requireUser } from "../../_userAuth.js";
import { jsonOk, jsonFail } from "../../_resp.js";
import { 
  normalizeDayObject, 
  generateShortDate, 
  getMaxDayOrder, 
  shiftDayOrders,
  normalizeEventObject,
  toInt
} from "../../_scheduleCore.js";
import { getD1 } from "../../../config/env.js";

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
  const tripsIndex = pathParts.indexOf("trips");
  const tripIdEncoded = pathParts[tripsIndex + 1] || null;
  const tripId = tripIdEncoded ? decodeURIComponent(tripIdEncoded) : null;

  if (!tripId) return jsonFail(request, env, 400, 40001, "Trip id required");

  // 鉴权
  const auth = await requireUser(db, request);
  if (!auth.ok) return jsonFail(request, env, 401, 40100, "Login required");
  
  // 检查是否是所有者
  const trip = await db.prepare("SELECT user_id FROM trip WHERE trip_id = ? AND COALESCE(is_deleted, 0) = 0").bind(tripId).first();
  if (!trip) return jsonFail(request, env, 404, 40400, "Trip not found");
  if (String(trip.user_id) !== String(auth.user.id)) return jsonFail(request, env, 403, 40300, "Permission denied");

  const now = Date.now();

  // POST /api/trips/:id/days -> 创建日程日
  if (request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const dayRaw = body?.day;
    const dayObj = normalizeDayObject(dayRaw);
    if (!dayObj) return jsonFail(request, env, 400, 40002, "Invalid day data");

    const dayId = dayObj.id;
    const existing = await db.prepare("SELECT day_id FROM day WHERE trip_id = ? AND day_id = ?").bind(tripId, dayId).first();
    if (existing) return jsonOk(request, env, { dayId, existed: true });

    const maxOrder = await getMaxDayOrder(db, tripId);
    const posRaw = body?.position;
    let dayOrder = maxOrder + 1;
    if (posRaw !== undefined && posRaw !== null) {
      const pos = Math.max(0, Math.min(maxOrder + 1, toInt(posRaw, maxOrder + 1)));
      await shiftDayOrders(db, tripId, pos, 1);
      dayOrder = pos;
    }

    const shortDate = dayRaw?.shortDate || generateShortDate(dayRaw?.date) || "";
    
    // 提取纯日期格式（YYYY-MM-DD），去掉额外文本
    const rawDate = dayRaw?.date || "";
    const pureDate = rawDate ? rawDate.substring(0, 10) : null;

    await db.prepare(`
      INSERT INTO day (day_id, trip_id, day_order, date, short_date, location, title, description, cover_image, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      dayId, tripId, dayOrder, pureDate, shortDate, 
      dayRaw?.location || null, dayRaw?.title || null, 
      dayRaw?.description || null, dayRaw?.coverImage || null, now, now
    ).run();

    // 如果带有 events，一并存入
    const events = Array.isArray(dayRaw?.events) ? dayRaw.events : [];
    for (let i = 0; i < events.length; i++) {
      const evtObj = normalizeEventObject(dayId, events[i], null);
      if (!evtObj) continue;
      await db.prepare(`
        INSERT OR REPLACE INTO event (event_id, day_id, trip_id, event_order, type, state, card_type, title, description, start_time, end_time, duration_min, priority, location_id, location_name, tags, images, cost, cost_currency, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        evtObj.uid, dayId, tripId, i, evtObj.type, evtObj.state, evtObj.cardType,
        evtObj.title || null, evtObj.description || null, evtObj.startTime || null,
        evtObj.endTime || null, evtObj.durationMin || null, evtObj.priority,
        evtObj.locationId || null, evtObj.locationName || null,
        JSON.stringify(evtObj.tags), JSON.stringify(evtObj.images),
        evtObj.cost, evtObj.costCurrency, now, now
      ).run();
    }

    return jsonOk(request, env, { dayId, dayOrder, createdAt: now }, "created", 201);
  }

  return jsonFail(request, env, 405, 40500, "Method not allowed");
}
