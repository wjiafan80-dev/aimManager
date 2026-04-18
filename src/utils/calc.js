import { ym, ymPlus, isExpired } from './date.js';
import { toNTD } from './format.js';

export { isExpired };

const TOOL_PRICING_META_PREFIX = '[pricing-meta]';

// 統一格式：舊版 id=toolId，新版 toolId=toolId + id=assignmentId
// 統一後：toolId = 工具ID，_assignId = 授權列ID（供 savePersonFull 更新用）
export function normTools(tools) {
  return (tools || []).map(t => {
    if (typeof t === 'string') {
      return { toolId: t, _assignId: null, start: '', end: '', account: '', revoked: false };
    }
    const toolRef = t.toolId || t.id;
    return {
      ...t,
      toolId:   toolRef,
      _assignId: t.toolId ? t.id : null,
      account:  t.account  || '',
      revoked:  t.revoked  || false,
    };
  });
}

export function extractToolNotes(rawNotes = '') {
  if (typeof rawNotes !== 'string' || !rawNotes.startsWith(TOOL_PRICING_META_PREFIX)) {
    return { notes: rawNotes || '', pricingMeta: null };
  }

  const lineEnd = rawNotes.indexOf('\n');
  const metaText = rawNotes.slice(
    TOOL_PRICING_META_PREFIX.length,
    lineEnd === -1 ? rawNotes.length : lineEnd,
  );

  try {
    return {
      notes: lineEnd === -1 ? '' : rawNotes.slice(lineEnd + 1),
      pricingMeta: JSON.parse(metaText),
    };
  } catch {
    return { notes: rawNotes || '', pricingMeta: null };
  }
}

export function buildToolNotes(notes, pricing) {
  const payload = {
    pricingMode: pricing.pricingMode || 'monthly',
    listPrice: Number(pricing.listPrice) || 0,
    taxRate: Number(pricing.taxRate) || 0,
    discountPercent: Number(pricing.discountPercent) || 0,
  };
  const userNotes = notes || '';
  return `${TOOL_PRICING_META_PREFIX}${JSON.stringify(payload)}\n${userNotes}`;
}

function getToolPricingSource(tool = {}) {
  const { notes, pricingMeta } = extractToolNotes(tool.notes);
  return {
    pricingMode: tool.pricingMode ?? pricingMeta?.pricingMode,
    listPrice: tool.listPrice ?? pricingMeta?.listPrice,
    taxRate: tool.taxRate ?? pricingMeta?.taxRate,
    discountPercent: tool.discountPercent ?? pricingMeta?.discountPercent,
    monthly: tool.monthly,
    annual: tool.annual,
    currency: tool.currency,
    notes,
  };
}

export function toolMonthlyNTD(tool, usdRate) {
  const pricing = normalizeToolPricing(tool);
  const currency = getToolPricingSource(tool).currency;
  if (pricing.monthly) return toNTD(pricing.monthly, currency, usdRate);
  return 0;
}

export function toolAnnualNTD(tool, usdRate) {
  const pricing = normalizeToolPricing(tool);
  const currency = getToolPricingSource(tool).currency;
  if (pricing.annual) return toNTD(pricing.annual, currency, usdRate);
  return 0;
}

export function toolAnnualListPriceNTD(tool, usdRate) {
  const source = getToolPricingSource(tool);
  const pricingMode = source.pricingMode || (source.annual && !source.monthly ? 'annual' : 'monthly');
  const listPrice = Number(
    source.listPrice ??
    (pricingMode === 'annual' ? source.annual : source.monthly) ??
    0
  ) || 0;
  const taxRate = Number(source.taxRate ?? 0) || 0;
  const annualBase = pricingMode === 'annual' ? listPrice : listPrice * 12;
  return toNTD(annualBase * (1 + taxRate / 100), source.currency, usdRate);
}

export function normalizeToolPricing(tool) {
  const source = getToolPricingSource(tool);
  const pricingMode = source.pricingMode || (source.annual && !source.monthly ? 'annual' : 'monthly');
  const listPrice = Number(
    source.listPrice ??
    (pricingMode === 'annual' ? source.annual : source.monthly) ??
    0
  ) || 0;
  const taxRate = Number(source.taxRate ?? 0) || 0;
  const discountPercent = Number(source.discountPercent ?? 0) || 0;
  const netPrice = listPrice * (1 + taxRate / 100) * (1 - discountPercent / 100);

  return {
    pricingMode,
    listPrice,
    taxRate,
    discountPercent,
    notes: source.notes,
    monthly: pricingMode === 'annual' ? netPrice / 12 : netPrice,
    annual: pricingMode === 'annual' ? netPrice : netPrice * 12,
  };
}

export function toolUserCount(toolId, departments) {
  let n = 0;
  departments.forEach(d =>
    (d.people || []).forEach(p => {
      if (p.removed) return;
      if (normTools(p.tools).some(t => t.toolId === toolId && !t.revoked && !isExpired(t))) n++;
    })
  );
  return n;
}

export function personMonthlyNTD(person, tools, usdRate) {
  return normTools(person.tools).reduce((s, t) => {
    if (t.revoked || isExpired(t)) return s;
    const tool = tools.find(x => x.id === t.toolId);
    return tool ? s + toolMonthlyNTD(tool, usdRate) : s;
  }, 0);
}

export function personAnnualNTD(person, tools, usdRate) {
  return normTools(person.tools).reduce((s, t) => {
    if (t.revoked || isExpired(t)) return s;
    const tool = tools.find(x => x.id === t.toolId);
    return tool ? s + toolAnnualNTD(tool, usdRate) : s;
  }, 0);
}

export function seatCostNTD(type, tools, departments, usdRate) {
  return tools.reduce((s, t) => {
    const basis = t.seats || toolUserCount(t.id, departments);
    return s + (type === 'monthly' ? toolMonthlyNTD(t, usdRate) : toolAnnualNTD(t, usdRate)) * basis;
  }, 0);
}

export function unassignedCostNTD(type, tools, departments, usdRate) {
  return tools.reduce((s, t) => {
    if (!t.seats) return s;
    const u = Math.max(0, t.seats - toolUserCount(t.id, departments));
    return s + (type === 'monthly' ? toolMonthlyNTD(t, usdRate) : toolAnnualNTD(t, usdRate)) * u;
  }, 0);
}

export function getExpiringItems(departments, tools, cutoffMonths) {
  const now = ym();
  const cutoff = ymPlus(cutoffMonths);
  const items = [];
  departments.forEach(d =>
    (d.people || []).forEach(p =>
      normTools(p.tools || []).forEach(t => {
        if (t.revoked || !t.end || t.end > cutoff) return;
        const tool = tools.find(x => x.id === t.toolId);
        if (!tool) return;
        items.push({ dept: d, person: p, tool, entry: t, expired: t.end < now });
      })
    )
  );
  items.sort((a, b) => {
    if (a.expired !== b.expired) return a.expired ? -1 : 1;
    return a.entry.end.localeCompare(b.entry.end);
  });
  return items;
}

export function activePeopleCount(departments) {
  return departments.reduce((s, d) =>
    s + (d.people || []).filter(p => !p.removed).length, 0);
}

export function aiUsersCount(departments) {
  const seen = new Set();
  departments.forEach(d =>
    (d.people || []).forEach(p => {
      if (p.removed) return;
      if (normTools(p.tools).some(t => !t.revoked && !isExpired(t))) seen.add(p.id);
    })
  );
  return seen.size;
}

export function totalIssuedSeats(tools, departments) {
  return tools.reduce((s, t) => s + toolUserCount(t.id, departments), 0);
}

export function totalPurchasedSeats(tools) {
  return tools.reduce((s, t) => s + (t.seats || 0), 0);
}

export function fpScore(departments, tools) {
  const total = activePeopleCount(departments);
  if (!total) return 0;
  const aiUsers = aiUsersCount(departments);
  const issued = totalIssuedSeats(tools, departments);
  return Math.min(100, Math.round(
    (aiUsers / total) * 50 +
    (issued / total) * 30 +
    Math.min(20, tools.length * 2)
  ));
}
