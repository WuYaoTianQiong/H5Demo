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

async function calculateTripProgress(db, tripId) {
  try {
    const { results: allEvents } = await db
      .prepare(
        `
        SELECT event_id, parent_event_id, state
        FROM event
        WHERE trip_id = ? AND COALESCE(is_deleted, 0) = 0
      `,
      )
      .bind(tripId)
      .all();

    if (!allEvents || allEvents.length === 0) return 0;

    const mainEvents = [];
    const childEventsMap = new Map();

    for (const event of allEvents) {
      if (event.parent_event_id === null) {
        mainEvents.push(event);
      } else {
        const parentId = event.parent_event_id;
        if (!childEventsMap.has(parentId)) childEventsMap.set(parentId, []);
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
          if (child.state === "completed" || child.state === "inactive") completed++;
        }
      } else {
        total++;
        if (event.state === "completed") completed++;
      }
    }

    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  } catch (e) {
    console.error("[v2 trips progress] error:", e);
    return 0;
  }
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

  // GET /api/trips/:id/progress
  if (request.method === "GET") {
    const auth = await getAuthUser(db, request);
    const userId = auth?.user?.id || null;

    const access = await ensureOwnerOrPublic(db, tripId, userId);
    if (!access.ok) return jsonFail(request, env, access.status, access.code, access.message);

    const progress = await calculateTripProgress(db, tripId);
    return jsonOk(request, env, { tripId, progress });
  }

  return jsonFail(request, env, 405, 40500, "Method not allowed");
}
