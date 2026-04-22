export function ym() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

export function ymPlus(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

export function ymAdd12(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  return (y + 1) + '-' + String(m).padStart(2, '0');
}

export function isExpired(entry) {
  return !!(entry.end && entry.end < ym());
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

// Normalize any date value to YYYY-MM-DD for display; returns '' if unparseable
export function fmtDate(val) {
  if (!val) return '';
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s;
}

// Normalize any date value to YYYY-MM for <input type="month">; returns '' if unparseable
export function fmtMonth(val) {
  if (!val) return '';
  const s = String(val).trim();
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 7);
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  return '';
}
