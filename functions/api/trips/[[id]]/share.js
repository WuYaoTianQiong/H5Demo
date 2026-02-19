import { handleOptions } from "../../_auth.js";
import { requireUser } from "../../_userAuth.js";
import { jsonOk, jsonFail } from "../../_resp.js";
import { getD1 } from "../../../config/env.js";

async function ensureOwner(db, tripId, userId) {
  const trip = await db
    .prepare(
      "SELECT trip_id, user_id, visibility, status FROM trip WHERE trip_id = ? AND COALESCE(is_deleted, 0) = 0",
    )
    .bind(tripId)
    .first();

  if (!trip) return { ok: false, status: 404, code: 40400, message: "Trip not found" };

  const isOwner = String(trip.user_id) === String(userId);

  if (!isOwner) {
    return { ok: false, status: 403, code: 40300, message: "Permission denied" };
  }

  return { ok: true, trip, isOwner };
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

  // POST /api/trips/:id/share
  if (request.method === "POST") {
    const auth = await requireUser(db, request);
    if (!auth.ok) return jsonFail(request, env, 401, 40100, "Login required");

    const access = await ensureOwner(db, tripId, auth.user.id);
    if (!access.ok) return jsonFail(request, env, access.status, access.code, access.message);

    const body = await request.json().catch(() => ({}));
    const shareId = crypto.randomUUID();
    const shareToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const { expiresInDays = 7, maxViews = null } = body;

    const now = Date.now();
    const expiresAt = expiresInDays ? now + expiresInDays * 24 * 60 * 60 * 1000 : null;

    await db
      .prepare(
        `INSERT INTO trip_share (share_id, trip_id, created_by, share_token, share_type, permission, max_views, view_count, expires_at, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(shareId, tripId, auth.user.id, shareToken, "link", "view", maxViews, 0, expiresAt, 1, now, now)
      .run();

    // 自动更新可见性为 link
    if (access.trip.visibility === "private") {
      await db.prepare("UPDATE trip SET visibility = 'link', updated_at = ? WHERE trip_id = ?").bind(now, tripId).run();
    }

    return jsonOk(request, env, { shareId, shareToken, expiresAt, shareUrl: `/share/${shareToken}` }, "created", 201);
  }

  return jsonFail(request, env, 405, 40500, "Method not allowed");
}
