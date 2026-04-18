import { ym, ymPlus, isExpired } from './date.js';
import { toNTD } from './format.js';

export { isExpired };

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

export function toolMonthlyNTD(tool, usdRate) {
  if (tool.listPrice || tool.taxRate || tool.discountPercent || tool.pricingMode) {
    return toNTD(normalizeToolPricing(tool).monthly, tool.currency, usdRate);
  }
  if (tool.monthly) return toNTD(tool.monthly, tool.currency, usdRate);
  if (tool.annual) return toNTD(tool.annual, tool.currency, usdRate) / 12;
  return 0;
}

export function toolAnnualNTD(tool, usdRate) {
  if (tool.listPrice || tool.taxRate || tool.discountPercent || tool.pricingMode) {
    return toNTD(normalizeToolPricing(tool).annual, tool.currency, usdRate);
  }
  if (tool.annual) return toNTD(tool.annual, tool.currency, usdRate);
  if (tool.monthly) return toNTD(tool.monthly, tool.currency, usdRate) * 12;
  return 0;
}

export function toolAnnualListPriceNTD(tool, usdRate) {
  const pricingMode = tool.pricingMode || (tool.annual && !tool.monthly ? 'annual' : 'monthly');
  const listPrice = Number(
    tool.listPrice ??
    (pricingMode === 'annual' ? tool.annual : tool.monthly) ??
    0
  ) || 0;
  const taxRate = Number(tool.taxRate ?? 0) || 0;
  const annualBase = pricingMode === 'annual' ? listPrice : listPrice * 12;
  return toNTD(annualBase * (1 + taxRate / 100), tool.currency, usdRate);
}

export function normalizeToolPricing(tool) {
  const pricingMode = tool.pricingMode || (tool.annual && !tool.monthly ? 'annual' : 'monthly');
  const listPrice = Number(
    tool.listPrice ??
    (pricingMode === 'annual' ? tool.annual : tool.monthly) ??
    0
  ) || 0;
  const taxRate = Number(tool.taxRate ?? 0) || 0;
  const discountPercent = Number(tool.discountPercent ?? 0) || 0;
  const netPrice = listPrice * (1 + taxRate / 100) * (1 - discountPercent / 100);

  return {
    pricingMode,
    listPrice,
    taxRate,
    discountPercent,
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
