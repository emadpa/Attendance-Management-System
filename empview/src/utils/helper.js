export function formatTime(isoStr) {
  if (!isoStr) return "—";
  return new Date(isoStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
export function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return "—";
  if (minutes === 0) return "None";
  const h = Math.floor(minutes / 60),
    m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
export function toDateKey(year, month1, day) {
  return `${year}-${String(month1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
export function workHours(pIn, pOut) {
  if (!pIn || !pOut) return null;
  const diff = (new Date(pOut) - new Date(pIn)) / 3600000;
  return diff > 0 ? diff.toFixed(1) : null;
}
