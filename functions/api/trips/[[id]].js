import { handleOptions } from "../_auth.js";
import { getAuthUser, requireUser } from "../_userAuth.js";
import { jsonOk, jsonFail } from "../_resp.js";
import { getD1 } from "../../config/env.js";
import {
  buildSafeSelectFields,
  safeFilterResponse,
  parseV2Request,
} from "../_apiV2Helper.js";
import { getSchemaTemplate } from "../_fieldSchema.js";
import {
  getTripsV2,
  getTripV2,
  getTripDaysList,
  calculateTripProgress,
  toInt,
} from "../_tripsCore.js";

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
  const tripIdEncoded = pathParts[tripsIndex + 1] || null;
  const tripId = tripIdEncoded ? decodeURIComponent(tripIdEncoded) : null;
  const subPath = pathParts[tripsIndex + 2] || null;

  if (!tripId) {
    const auth = await getAuthUser(db, request);
    const userId = auth?.user?.id || null;
    const v2Options = parseV2Request(url);
    
    if (request.method === "GET") {
      const result = await getTripsV2(db, url, userId, v2Options);
      return jsonOk(request, env, result);
    }
    
    return jsonFail(request, env, 405, 40500, "Method not allowed");
  }

  const v2Options = parseV2Request(url);

  if (request.method === "GET" && !subPath) {
    const auth = await getAuthUser(db, request);
    const userId = auth?.user?.id || null;

    const result = await getTripV2(db, tripId, userId, v2Options);

    if (!result) {
      return jsonFail(request, env, 404, 40400, "Trip not found or access denied");
    }

    return jsonOk(request, env, result);
  }

  if (request.method === "PUT" || request.method === "PATCH") {
    const auth = await requireUser(db, request);
    const userId = auth?.ok ? auth?.user?.id : null;
    if (!userId) return jsonFail(request, env, 401, 40100, "Login required");

    const existing = await db
      .prepare(
        "SELECT trip_id, user_id FROM trip WHERE trip_id = ? AND COALESCE(is_deleted, 0) = 0",
      )
      .bind(tripId)
      .first();

    if (!existing) return jsonFail(request, env, 404, 40400, "Trip not found");
    if (existing.user_id && String(existing.user_id) !== String(userId)) {
      return jsonFail(request, env, 403, 40300, "Permission denied");
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonFail(request, env, 400, 40002, "Invalid JSON body");
    }

    const updates = [];
    const params = [];

    const setStr = (field, dbField) => {
      if (body[field] === undefined) return;
      updates.push(`${dbField} = ?`);
      params.push(String(body[field] ?? "").trim() || null);
    };
    const setNum = (field, dbField) => {
      if (body[field] === undefined) return;
      const v = body[field] === null ? null : toInt(body[field], null);
      updates.push(`${dbField} = ?`);
      params.push(v);
    };

    setStr("title", "title");
    setNum("year", "year");
    setStr("description", "description");
    setStr("startDate", "start_date");
    setStr("endDate", "end_date");
    setNum("days", "days");
    if (body.cityList !== undefined) {
      updates.push("city_list = ?");
      params.push(body.cityList ? JSON.stringify(body.cityList) : null);
    }
    setStr("footerText", "footer_text");
    setNum("travelerCount", "traveler_count");
    setNum("budgetPerPersonMin", "budget_per_person_min");
    setNum("budgetPerPersonMax", "budget_per_person_max");
    setStr("budgetUnit", "budget_unit");
    setStr("visibility", "visibility");
    setStr("status", "status");
    setStr("coverImage", "cover_image");

    if (updates.length === 0) return jsonFail(request, env, 400, 40003, "No fields to update");

    const now = Date.now();
    updates.push("updated_at = ?");
    params.push(now);
    params.push(tripId);

    await db.prepare(`UPDATE trip SET ${updates.join(", ")} WHERE trip_id = ?`).bind(...params).run();

    return jsonOk(request, env, { tripId, updatedAt: now }, "updated");
  }

  if (request.method === "DELETE") {
    const auth = await requireUser(db, request);
    const userId = auth?.ok ? auth?.user?.id : null;
    if (!userId) return jsonFail(request, env, 401, 40100, "Login required");

    const existing = await db
      .prepare(
        "SELECT trip_id, user_id FROM trip WHERE trip_id = ? AND COALESCE(is_deleted, 0) = 0",
      )
      .bind(tripId)
      .first();

    if (!existing) return jsonFail(request, env, 404, 40400, "Trip not found");
    if (existing.user_id && String(existing.user_id) !== String(userId)) {
      return jsonFail(request, env, 403, 40300, "Permission denied");
    }

    const now = Date.now();
    await db
      .prepare("UPDATE trip SET is_deleted = 1, deleted_at = ?, deleted_by = ? WHERE trip_id = ?")
      .bind(now, userId, tripId)
      .run();

    return jsonOk(request, env, { tripId, deleted: true, deletedAt: now }, "deleted");
  }

  return jsonFail(request, env, 405, 40500, "Method not allowed");
}
