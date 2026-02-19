export function formatDurationText(hours, minutes) {
  // 使用 uView Pro 工具处理
  const h = uni.$u.trim(hours || "0");
  const m = uni.$u.trim(minutes || "0");
  const safeH = Number.isFinite(parseInt(h)) && parseInt(h) > 0 ? parseInt(h) : 0;
  const safeM = Number.isFinite(parseInt(m)) && parseInt(m) > 0 ? parseInt(m) : 0;
  const parts = [];
  if (safeH > 0) parts.push(`${safeH}小时`);
  if (safeM > 0) parts.push(`${safeM}分钟`);
  return parts.join(" ");
}

export function parseDurationText(text) {
  // 使用 uView Pro trim 工具
  const raw = uni.$u.trim(text);
  if (!raw) return { hours: 0, minutes: 0 };

  const hourMatch = raw.match(/(\d+)\s*(?:小时|时)/);
  const minuteMatch = raw.match(/(\d+)\s*(?:分钟|分)/);

  const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
  const minutes = minuteMatch ? parseInt(minuteMatch[1], 10) : 0;

  return {
    hours: Number.isFinite(hours) ? hours : 0,
    minutes: Number.isFinite(minutes) ? minutes : 0,
  };
}
