import { corsHeaders } from "./_auth.js";

export const OK_CODE = 0;

export function ok(data = null, message = "ok") {
  return {
    code: OK_CODE,
    message,
    data,
  };
}

export function fail(code, message, data = null) {
  const c = Number(code);
  return {
    code: Number.isFinite(c) ? c : 50000,
    message: String(message || "error"),
    data,
  };
}

export function json(request, env, payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders(request, env),
  });
}

export function jsonOk(request, env, data = null, message = "ok", status = 200) {
  return json(request, env, ok(data, message), status);
}

export function jsonFail(request, env, status, code, message, data = null) {
  return json(request, env, fail(code, message, data), status);
}

export function wrapError(e) {
  if (!e) return { message: "Internal server error" };
  if (typeof e === "string") return { message: e };
  return { message: e.message || "Internal server error" };
}
