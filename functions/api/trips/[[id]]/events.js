import { handleOptions } from "../../_auth.js";
import { requireUser } from "../../_userAuth.js";
import { jsonOk, jsonFail } from "../../_resp.js";
import { hasColumn, toInt } from "../../_scheduleCore.js";
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
  const tripId = pathParts[tripsIndex + 1] ? decodeURIComponent(pathParts[tripsIndex + 1]) : null;

  if (!tripId) return jsonFail(request, env, 400, 40001, "Trip id required");

  // DELETE /api/trips/:id/events -> 批量删除事件
  if (request.method === "DELETE") {
    const auth = await requireUser(db, request);
    if (!auth.ok) return jsonFail(request, env, 401, 40100, "Login required");

    // 检查权限
    const trip = await db.prepare("SELECT user_id FROM trip WHERE trip_id = ? AND COALESCE(is_deleted, 0) = 0").bind(tripId).first();
    if (!trip) return jsonFail(request, env, 404, 40400, "Trip not found");
    if (String(trip.user_id) !== String(auth.user.id)) return jsonFail(request, env, 403, 40300, "Permission denied");

    const body = await request.json().catch(() => ({}));
    const eventIds = body?.eventIds;
    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return jsonFail(request, env, 400, 40002, "Invalid eventIds: expected non-empty array");
    }

    const now = Date.now();
    let deletedCount = 0;
    const hasIsDeleted = await hasColumn(db, 'event', 'is_deleted');

    // 批量删除事件
    for (const eventId of eventIds) {
      const id = String(eventId || "").trim();
      if (!id) continue;

      const current = await db
        .prepare("SELECT day_id, event_order FROM event WHERE trip_id = ? AND event_id = ?")
        .bind(tripId, id)
        .first();

      if (current) {
        const dayId = String(current.day_id || "").trim();
        const oldOrder = toInt(current.event_order, 0);

        if (hasIsDeleted) {
          await db.prepare("UPDATE event SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE trip_id = ? AND event_id = ?")
            .bind(now, now, tripId, id).run();
        } else {
          await db.prepare("DELETE FROM event WHERE trip_id = ? AND event_id = ?").bind(tripId, id).run();
        }

        // 更新顺序
        await db.prepare("UPDATE event SET event_order = event_order - 1 WHERE trip_id = ? AND day_id = ? AND event_order > ?")
          .bind(tripId, dayId, oldOrder).run();

        deletedCount++;
      }
    }

    // 更新行程更新时间
    await db.prepare("UPDATE trip SET updated_at = ? WHERE trip_id = ?").bind(now, tripId).run();

    return jsonOk(request, env, { tripId, deletedCount, updatedAt: now });
  }

  return jsonFail(request, env, 405, 40500, "Method not allowed");
}
