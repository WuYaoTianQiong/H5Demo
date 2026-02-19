import { handleOptions } from "../_auth.js";
import { requireUser } from "../_userAuth.js";
import { jsonOk, jsonFail } from "../_resp.js";
import { getD1 } from "../../config/env.js";

function now() {
  return Date.now();
}

/**
 * 验证分享链接
 */
async function validateShare(db, token) {
  const share = await db
    .prepare(
      `SELECT ts.*, t.trip_id, t.title, t.visibility, t.status
       FROM trip_share ts
       JOIN trip t ON ts.trip_id = t.trip_id
       WHERE ts.share_token = ? AND ts.is_active = 1`
    )
    .bind(token)
    .first();

  if (!share) {
    return { ok: false, status: 404, code: 40401, message: "分享链接无效" };
  }

  if (share.visibility === "private") {
    return { ok: false, status: 403, code: 40302, message: "行程已设为私密，无法通过分享链接访问" };
  }

  if (share.expires_at && share.expires_at < now()) {
    return { ok: false, status: 410, code: 41001, message: "分享链接已过期" };
  }

  if (share.max_views && share.view_count >= share.max_views) {
    return { ok: false, status: 403, code: 40301, message: "访问次数已达上限" };
  }

  await db
    .prepare("UPDATE trip_share SET view_count = view_count + 1 WHERE share_id = ?")
    .bind(share.share_id)
    .run();

  return {
    ok: true,
    data: {
      tripId: share.trip_id,
      title: share.title,
      permission: share.permission,
      visibility: share.visibility
    }
  };
}

/**
 * 撤销分享
 */
async function revokeShare(db, shareId, userId) {
  const share = await db
    .prepare("SELECT share_id, created_by FROM trip_share WHERE share_id = ?")
    .bind(shareId)
    .first();

  if (!share) {
    return { ok: false, status: 404, code: 40402, message: "分享记录不存在" };
  }

  if (userId && String(share.created_by) !== String(userId)) {
    return { ok: false, status: 403, code: 40300, message: "无权撤销此分享" };
  }

  await db
    .prepare("UPDATE trip_share SET is_active = 0, updated_at = ? WHERE share_id = ?")
    .bind(now(), shareId)
    .run();

  return { ok: true, data: { shareId } };
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
  const sharesIndex = pathParts.indexOf("shares");
  const id = pathParts[sharesIndex + 1] || null;

  if (!id) return jsonFail(request, env, 400, 40001, "Token or ShareId required");

  // GET /api/shares/:token -> 验证分享
  if (request.method === "GET") {
    const result = await validateShare(db, id);
    if (!result.ok) return jsonFail(request, env, result.status, result.code, result.message);
    return jsonOk(request, env, result.data);
  }

  // DELETE /api/shares/:shareId -> 撤销分享
  if (request.method === "DELETE") {
    const auth = await requireUser(db, request);
    if (!auth.ok) return jsonFail(request, env, 401, 40100, "Login required");

    const result = await revokeShare(db, id, auth.user.id);
    if (!result.ok) return jsonFail(request, env, result.status, result.code, result.message);
    return jsonOk(request, env, result.data, "revoked");
  }

  return jsonFail(request, env, 405, 40500, "Method not allowed");
}
