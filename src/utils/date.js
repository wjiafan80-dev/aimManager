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
