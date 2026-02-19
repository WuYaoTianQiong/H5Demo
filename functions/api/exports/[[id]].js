import { handleOptions } from "../_auth.js";
import { getAuthUser } from "../_userAuth.js";
import { jsonOk, jsonFail } from "../_resp.js";
import { getD1 } from "../../config/env.js";

function toInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
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
  const exportsIndex = pathParts.indexOf("exports");
  const exportIdEncoded = pathParts[exportsIndex + 1] || null;
  const exportId = exportIdEncoded ? decodeURIComponent(exportIdEncoded) : null;

  if (!exportId) return jsonFail(request, env, 400, 40001, "exportId required");

  if (request.method !== "GET") {
    return jsonFail(request, env, 405, 40500, "Method not allowed");
  }

  // 当前项目的 export 逻辑在 V1 中表现为“直接生成并写 export_log”，
  // 这里按日志表查询状态返回。
  // 若未来实现异步导出，可在此扩展 status/progress/result_url 等字段。

  const auth = await getAuthUser(db, request);
  const userId = auth?.user?.id || null;

  const row = await db
    .prepare(
      `SELECT export_id, user_id, trip_id, export_type, status, created_at
       FROM export_log
       WHERE export_id = ?`,
    )
    .bind(exportId)
    .first();

  if (!row) {
    return jsonFail(request, env, 404, 40400, "Export task not found");
  }

  // 若是匿名导出（user_id='anonymous'），允许查询；否则只允许本人查询
  const owner = row.user_id;
  if (owner && owner !== "anonymous" && userId && String(owner) !== String(userId)) {
    return jsonFail(request, env, 403, 40300, "Permission denied");
  }

  return jsonOk(request, env, {
    exportId: row.export_id,
    tripId: row.trip_id,
    format: row.export_type,
    status: row.status || "success",
    createdAt: toInt(row.created_at, 0),
  });
}
