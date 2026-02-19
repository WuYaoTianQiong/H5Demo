import { handleOptions } from "../../_auth.js";
import { getAuthUser } from "../../_userAuth.js";
import { jsonOk, jsonFail } from "../../_resp.js";
import { getD1 } from "../../../config/env.js";

async function ensureOwnerOrPublic(db, tripId, userId) {
  const trip = await db
    .prepare(
      "SELECT trip_id, user_id, visibility, status FROM trip WHERE trip_id = ? AND COALESCE(is_deleted, 0) = 0",
    )
    .bind(tripId)
    .first();

  if (!trip) return { ok: false, status: 404, code: 40400, message: "Trip not found" };

  const isOwner = String(trip.user_id) === String(userId);
  const isPublic = trip.visibility === "public" && trip.status === "published";

  if (!isPublic && !isOwner) {
    return { ok: false, status: 403, code: 40300, message: "Permission denied" };
  }

  return { ok: true, trip, isOwner, isPublic };
}

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

  if (!tripId) {
    return jsonFail(request, env, 400, 40001, "Trip ID is required");
  }

  // GET /api/trips/:id/export
  if (request.method === "GET") {
    const auth = await getAuthUser(db, request);
    const userId = auth?.user?.id || null;

    const access = await ensureOwnerOrPublic(db, tripId, userId);
    if (!access.ok) return jsonFail(request, env, access.status, access.code, access.message);

    const trip = await db.prepare("SELECT * FROM trip WHERE trip_id = ?").bind(tripId).first();
    const { results: schedule } = await db.prepare("SELECT * FROM day WHERE trip_id = ? ORDER BY day_order ASC").bind(tripId).all();
    const { results: events } = await db.prepare("SELECT * FROM event WHERE trip_id = ? AND COALESCE(is_deleted, 0) = 0 ORDER BY day_id ASC, event_order ASC").bind(tripId).all();

    const data = {
      trip,
      schedule: schedule || [],
      events: events || []
    };

    return jsonOk(request, env, data);
  }

  return jsonFail(request, env, 405, 40500, "Method not allowed");
}
