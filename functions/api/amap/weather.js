import { handleOptions } from "../_auth.js";
import { jsonOk, jsonFail } from "../_resp.js";
import { getHeader } from "../_userAuth.js";

export async function onRequest(context) {
  const { request, env } = context;
  
  console.log("[AMap Weather] Request received:", request.url);
  
  if (request.method === "OPTIONS") return handleOptions(context);

  const url = new URL(request.url);
  const city = url.searchParams.get("city");
  const extensions = url.searchParams.get("extensions") || "base";

  if (!city) {
    console.error("[AMap Weather] Missing city parameter");
    return jsonFail(request, env, 400, 40001, "Missing city parameter");
  }

  // 尝试读取各种可能的环境变量名（Cloudflare Pages Functions 不会自动传递 VITE_ 前缀变量）
  const AMAP_KEY = env.AMAP_WEB_KEY || env.VITE_AMAP_WEB_KEY || env.VITE_AMAP_KEY || '';
  
  console.log("[AMap Weather] Environment check:", {
    hasAmapWebKey: !!env.AMAP_WEB_KEY,
    hasViteAmapWebKey: !!env.VITE_AMAP_WEB_KEY,
    hasViteAmapKey: !!env.VITE_AMAP_KEY,
    keyLength: AMAP_KEY.length,
    finalKey: AMAP_KEY ? `${AMAP_KEY.substring(0, 8)}...` : 'NOT SET'
  });
  
  if (!AMAP_KEY) {
    console.error("[AMap Weather] AMAP key not configured");
    return jsonFail(request, env, 500, 50001, "AMAP key not configured");
  }

  try {
    const amapUrl = `https://restapi.amap.com/v3/weather/weatherInfo?key=${AMAP_KEY}&city=${encodeURIComponent(city)}&extensions=${extensions}`;
    console.log("[AMap Weather] Calling AMap API:", amapUrl.replace(AMAP_KEY, "***"));
    
    // 获取请求来源，用于设置 Referer
    const requestOrigin = getHeader(request, 'origin') || env.APP_URL || 'https://travel.wushuai.xyz';
    
    const response = await fetch(amapUrl, {
      headers: {
        'Referer': requestOrigin,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const data = await response.json();
    
    console.log("[AMap Weather] AMap response:", { status: data.status, info: data.info });

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    console.error("[AMap Weather] Error:", error);
    return jsonFail(request, env, 500, 50000, "AMap API request failed", { message: error.message });
  }
}
