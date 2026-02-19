import { handleOptions } from "../../../../_auth.js";
import { requireUser } from "../../../../_userAuth.js";
import { jsonOk, jsonFail } from "../../../../_resp.js";
import { resolveDayId, toInt } from "../../../../_scheduleCore.js";
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
  
  // 路径解析: /api/trips/:tripId/days/:dayId/reorder
  const tripsIndex = pathParts.indexOf("trips");
  const tripId = pathParts[tripsIndex + 1] ? decodeURIComponent(pathParts[tripsIndex + 1]) : null;
  const daysIndex = pathParts.indexOf("days");
  const dayIdInput = pathParts[daysIndex + 1] ? decodeURIComponent(pathParts[daysIndex + 1]) : null;

  if (!tripId || !dayIdInput) {
    return jsonFail(request, env, 400, 40001, "TripId and DayId required");
  }

  // 鉴权
  const auth = await requireUser(db, request);
  if (!auth.ok) return jsonFail(request, env, 401, 40100, "Login required");
  
  // 检查权限
  const trip = await db.prepare("SELECT user_id FROM trip WHERE trip_id = ? AND COALESCE(is_deleted, 0) = 0").bind(tripId).first();
  if (!trip) return jsonFail(request, env, 404, 40400, "Trip not found");
  if (String(trip.user_id) !== String(auth.user.id)) return jsonFail(request, env, 403, 40300, "Permission denied");

  const dayId = await resolveDayId(db, tripId, dayIdInput);
  if (!dayId) return jsonFail(request, env, 404, 40402, "Day not found");

  const now = Date.now();

  // PUT /api/trips/:tripId/days/:dayId/reorder -> 重排事件
  if (request.method === "PUT") {
    const body = await request.json().catch(() => ({}));
    const orderedEventIds = body.order;
    if (!Array.isArray(orderedEventIds)) {
      return jsonFail(request, env, 400, 40002, "Invalid order: expected array");
    }

    for (let i = 0; i < orderedEventIds.length; i++) {
      const eventId = String(orderedEventIds[i] || "").trim();
      if (!eventId) continue;

      await db.prepare(
        "UPDATE event SET event_order = ?, updated_at = ? WHERE trip_id = ? AND day_id = ? AND event_id = ?"
      ).bind(i, now, tripId, dayId, eventId).run();
    }

    // 更新行程更新时间
    await db.prepare("UPDATE trip SET updated_at = ? WHERE trip_id = ?").bind(now, tripId).run();

    return jsonOk(request, env, { tripId, dayId, updatedAt: now }, "reordered");
  }

  return jsonFail(request, env, 405, 40500, "Method not allowed");
}
