import { handleOptions } from "../../_auth.js";
import { getAuthUser, requireUser } from "../../_userAuth.js";
import { jsonOk, jsonFail } from "../../_resp.js";
import { normalizeLocationId } from "../../_scheduleCore.js";
import { getD1 } from "../../../config/env.js";

function normalizeDistancePair(fromId, toId) {
  const a = normalizeLocationId(fromId);
  const b = normalizeLocationId(toId);
  if (!a || !b) return null;
  if (a === b) return { a, b, same: true };
  return a < b ? { a, b } : { a: b, b: a };
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

  if (!tripId) return jsonFail(request, env, 400, 40001, "Trip id required");

  // GET /api/trips/:id/routes?from=...&to=... -> 获取距离
  if (request.method === "GET") {
    const fromId = url.searchParams.get("from");
    const toId = url.searchParams.get("to");
    
    if (fromId && toId) {
      const pair = normalizeDistancePair(fromId, toId);
      if (!pair) return jsonFail(request, env, 400, 40002, "Invalid from/to");
      if (pair.same) return jsonOk(request, env, { distanceKm: 0, source: "same" });

      const row = await db.prepare(
        "SELECT distance_m, source, updated_at FROM route WHERE from_location = ? AND to_location = ?"
      ).bind(pair.a, pair.b).first();

      if (!row) return jsonOk(request, env, { distanceKm: 0, source: null, notFound: true });

      return jsonOk(request, env, {
        from: pair.a,
        to: pair.b,
        distanceKm: (Number(row.distance_m || 0)) / 1000,
        source: row.source || null,
        updatedAt: row.updated_at
      });
    }

    // 默认返回该行程下所有已存距离（如果需要）
    return jsonFail(request, env, 400, 40003, "Missing from/to parameters");
  }

  // PUT /api/trips/:id/routes -> 保存距离
  if (request.method === "PUT" || request.method === "POST") {
    const auth = await requireUser(db, request);
    if (!auth.ok) return jsonFail(request, env, 401, 40100, "Login required");

    const body = await request.json().catch(() => ({}));
    const pair = normalizeDistancePair(body.from, body.to);
    if (!pair) return jsonFail(request, env, 400, 40002, "Invalid from/to");
    
    if (pair.same) return jsonOk(request, env, { distanceKm: 0 });

    const distanceKm = Number(body.distanceKm ?? body.distance_km ?? 0);
    const source = String(body.source || "").trim() || null;
    const now = Date.now();

    await db.prepare(
      "INSERT OR REPLACE INTO route (from_location, to_location, distance_m, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(pair.a, pair.b, distanceKm * 1000, source, now, now).run();

    return jsonOk(request, env, { from: pair.a, to: pair.b, distanceKm, source }, "saved");
  }

  return jsonFail(request, env, 405, 40500, "Method not allowed");
}
