export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function ntd(v) {
  return 'NT$' + Math.round(v).toLocaleString();
}

export function toNTD(amount, currency, usdRate) {
  if (!amount) return 0;
  return currency === 'USD' ? amount * usdRate : amount;
}

export function toolName(tool) {
  return tool.name + (tool.plan ? ' ' + tool.plan : '');
}
