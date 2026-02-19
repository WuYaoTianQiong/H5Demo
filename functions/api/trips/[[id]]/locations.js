import { handleOptions } from "../../_auth.js";
import { getAuthUser, requireUser } from "../../_userAuth.js";
import { jsonOk, jsonFail } from "../../_resp.js";
import { normalizeLocationId, toInt, saveLocation } from "../../_scheduleCore.js";
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

  // GET /api/trips/:id/locations -> 获取该行程相关的地点列表
  if (request.method === "GET") {
    // 权限检查：公开行程可读，私有需要 owner
    const auth = await getAuthUser(db, request);
    const userId = auth?.user?.id || null;
    
    const trip = await db.prepare("SELECT user_id, visibility, status FROM trip WHERE trip_id = ? AND COALESCE(is_deleted, 0) = 0").bind(tripId).first();
    if (!trip) return jsonFail(request, env, 404, 40400, "Trip not found");
    
    const isOwner = userId && String(trip.user_id) === String(userId);
    const isPublic = trip.visibility === "public" && trip.status === "published";
    if (!isOwner && !isPublic) return jsonFail(request, env, 403, 40300, "Permission denied");

    // 收集该行程日程中引用的所有 location_id
    const { results: eventLocations } = await db.prepare(
      "SELECT DISTINCT location_id FROM event WHERE trip_id = ? AND location_id IS NOT NULL AND COALESCE(is_deleted, 0) = 0"
    ).bind(tripId).all();
    
    const ids = (eventLocations || []).map(r => r.location_id);
    if (ids.length === 0) return jsonOk(request, env, { locations: [] });

    const placeholders = ids.map(() => "?").join(",");
    const { results: locations } = await db.prepare(
      `SELECT * FROM location WHERE location_id IN (${placeholders}) ORDER BY updated_at DESC`
    ).bind(...ids).all();

    return jsonOk(request, env, { locations: locations || [] });
  }

  // PUT /api/trips/:id/locations -> 批量或单个保存/更新地点信息
  if (request.method === "PUT" || request.method === "POST") {
    const auth = await requireUser(db, request);
    if (!auth.ok) return jsonFail(request, env, 401, 40100, "Login required");

    const trip = await db.prepare("SELECT user_id FROM trip WHERE trip_id = ?").bind(tripId).first();
    if (!trip || String(trip.user_id) !== String(auth.user.id)) return jsonFail(request, env, 403, 40300, "Permission denied");

    const body = await request.json().catch(() => ({}));
    const locationData = body.location || body;
    
    const locationId = await saveLocation(db, locationData);
    if (!locationId) return jsonFail(request, env, 400, 40002, "Invalid location data");

    return jsonOk(request, env, { locationId }, "saved");
  }

  return jsonFail(request, env, 405, 40500, "Method not allowed");
}
