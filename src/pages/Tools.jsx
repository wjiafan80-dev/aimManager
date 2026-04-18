import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend } from 'chart.js';
import Modal from '../components/common/Modal.jsx';
import SaveBtn from '../components/common/SaveBtn.jsx';
import { useApp } from '../context/AppContext.jsx';
import {
  buildToolNotes,
  extractToolNotes,
  normalizeToolPricing,
  toolAnnualListPriceNTD,
  toolMonthlyNTD,
  toolAnnualNTD,
  toolUserCount,
} from '../utils/calc.js';
import { ntd, toolName, uid } from '../utils/format.js';
import { today, ym } from '../utils/date.js';

Chart.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend);

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6', '#3b82f6', '#a855f7'];
const EMPTY_PURCHASE_ITEM = { toolId: '', quantity: 1 };

const EMPTY_TOOL = {
  name: '',
  plan: '',
  currency: 'USD',
  pricingMode: 'monthly',
  listPrice: '',
  taxRate: '0',
  discountPercent: '0',
  monthly: '',
  annual: '',
  color: '#6366f1',
  seats: '',
  notes: '',
};

const EMPTY_LOG = { month: ym(), delta: '', notes: '' };

function getFormPricing(form) {
  const normalized = normalizeToolPricing({
    pricingMode: form.pricingMode,
    listPrice: form.listPrice,
    taxRate: form.taxRate,
    discountPercent: form.discountPercent,
    monthly: form.monthly,
    annual: form.annual,
  });

  return {
    ...normalized,
    displayMonthly: normalized.monthly ? normalized.monthly.toFixed(2) : '',
    displayAnnual: normalized.annual ? normalized.annual.toFixed(2) : '',
  };
}

function getEditableToolForm(tool) {
  const normalized = normalizeToolPricing(tool);
  const { notes } = extractToolNotes(tool.notes);

  return {
    ...tool,
    pricingMode: normalized.pricingMode,
    listPrice: normalized.listPrice || '',
    taxRate: normalized.taxRate.toString(),
    discountPercent: normalized.discountPercent.toString(),
    monthly: normalized.monthly ? normalized.monthly.toFixed(2) : '',
    annual: normalized.annual ? normalized.annual.toFixed(2) : '',
    seats: tool.seats || '',
    notes,
  };
}

export default function Tools({ autoAction }) {
  const { data, isAdmin, saveTool, deleteTool, saveLog, deleteLog } = useApp();
  const [toolModal, setToolModal] = useState(null);
  const [logModal, setLogModal] = useState(null);
  const [logForm, setLogForm] = useState(EMPTY_LOG);
  const [form, setForm] = useState(EMPTY_TOOL);
  const [logFilter, setLogFilter] = useState('');
  const [purchaseItems, setPurchaseItems] = useState([EMPTY_PURCHASE_ITEM]);

  if (!data) return null;

  const { tools, departments, log } = data;
  const usdRate = data.settings.usd_to_ntd;

  useEffect(() => {
    if (autoAction === 'new-tool') {
      setForm({ ...EMPTY_TOOL, color: COLORS[tools.length % COLORS.length] });
      setToolModal('new');
    }
  }, [autoAction, tools.length]);

  function openNew() {
    setForm({ ...EMPTY_TOOL, color: COLORS[tools.length % COLORS.length] });
    setToolModal('new');
  }

  function openEdit(tool) {
    setForm(getEditableToolForm(tool));
    setToolModal(tool);
  }

  async function handleSaveTool() {
    if (!form.name.trim()) return;

    const isNew = toolModal === 'new';
    const pricing = getFormPricing(form);
    const toolData = {
      ...form,
      id: isNew ? undefined : form.id,
      pricingMode: form.pricingMode,
      listPrice: parseFloat(form.listPrice) || 0,
      taxRate: parseFloat(form.taxRate) || 0,
      discountPercent: parseFloat(form.discountPercent) || 0,
      monthly: pricing.monthly,
      annual: pricing.annual,
      seats: parseInt(form.seats, 10) || 0,
      notes: buildToolNotes(form.notes, {
        pricingMode: form.pricingMode,
        listPrice: parseFloat(form.listPrice) || 0,
        taxRate: parseFloat(form.taxRate) || 0,
        discountPercent: parseFloat(form.discountPercent) || 0,
      }),
    };

    let logEntry = null;
    if (isNew && toolData.seats > 0) {
      logEntry = { id: uid(), ts: today(), month: ym(), toolId: null, delta: toolData.seats, notes: '初購' };
    } else if (!isNew && parseInt(form.seats, 10) !== toolModal.seats && toolData.seats > 0) {
      const delta = toolData.seats - (toolModal.seats || 0);
      logEntry = { id: uid(), ts: today(), month: ym(), toolId: form.id, delta, notes: delta > 0 ? '增購' : '減少' };
    }

    const result = await saveTool(toolData, logEntry);
    if (result) setToolModal(null);
  }

  async function handleDeleteTool(id) {
    if (!confirm('確定刪除此工具？相關授權紀錄也會一併移除。')) return;
    await deleteTool(id);
  }

  function openLog(toolId) {
    setLogForm({ ...EMPTY_LOG, toolId });
    setLogModal({ toolId });
  }

  async function handleSaveLog() {
    if (!logForm.delta || !logForm.month) return;

    await saveLog({
      id: logModal.id || uid(),
      ts: today(),
      month: logForm.month,
      toolId: logForm.toolId || logModal.toolId,
      delta: parseInt(logForm.delta, 10),
      notes: logForm.notes || '',
    });
    setLogModal(null);
  }

  const filteredLog = logFilter ? log.filter(item => item.toolId === logFilter) : log;
  const months = [...new Set(filteredLog.map(item => item.month))].sort();
  const toolsForChart = logFilter ? tools.filter(item => item.id === logFilter) : tools;
  const chartData = {
    labels: months,
    datasets: toolsForChart.map(tool => {
      let cumulative = 0;
      return {
        label: toolName(tool),
        borderColor: tool.color,
        backgroundColor: `${tool.color}22`,
        data: months.map(month => {
          filteredLog
            .filter(item => item.toolId === tool.id && item.month === month)
            .forEach(item => {
              cumulative += item.delta;
            });
          return cumulative;
        }),
        tension: 0.3,
        fill: false,
      };
    }),
  };

  const formPricing = getFormPricing(form);
  const annualListTotal = tools.reduce((sum, tool) => {
    const basis = tool.seats || toolUserCount(tool.id, departments);
    return sum + toolAnnualListPriceNTD(tool, usdRate) * basis;
  }, 0);
  const annualDiscountedTotal = tools.reduce((sum, tool) => {
    const basis = tool.seats || toolUserCount(tool.id, departments);
    return sum + toolAnnualNTD(tool, usdRate) * basis;
  }, 0);
  const annualSavings = Math.max(0, annualListTotal - annualDiscountedTotal);

  const purchaseRows = purchaseItems.map((item, index) => {
    const tool = tools.find(entry => entry.id === item.toolId);
    const quantity = Math.max(0, parseInt(item.quantity, 10) || 0);

    if (!tool || quantity <= 0) {
      return {
        index,
        tool: null,
        quantity: 0,
        annualList: 0,
        annualDiscounted: 0,
        monthlyDiscounted: 0,
        annualDiscount: 0,
      };
    }

    const annualList = toolAnnualListPriceNTD(tool, usdRate) * quantity;
    const annualDiscounted = toolAnnualNTD(tool, usdRate) * quantity;
    const monthlyDiscounted = toolMonthlyNTD(tool, usdRate) * quantity;

    return {
      index,
      tool,
      quantity,
      annualList,
      annualDiscounted,
      monthlyDiscounted,
      annualDiscount: Math.max(0, annualList - annualDiscounted),
    };
  });

  const purchaseMonthlyDiscountedTotal = purchaseRows.reduce((sum, row) => sum + row.monthlyDiscounted, 0);
  const purchaseAnnualDiscountedTotal = purchaseRows.reduce((sum, row) => sum + row.annualDiscounted, 0);
  const purchaseAnnualSavings = purchaseRows.reduce((sum, row) => sum + row.annualDiscount, 0);
  const projectedAnnualDiscountedTotal = annualDiscountedTotal + purchaseAnnualDiscountedTotal;

  function updatePurchaseItem(index, patch) {
    setPurchaseItems(items => items.map((item, itemIndex) => (
      itemIndex === index ? { ...item, ...patch } : item
    )));
  }

  function addPurchaseItem() {
    setPurchaseItems(items => [...items, { ...EMPTY_PURCHASE_ITEM }]);
  }

  function removePurchaseItem(index) {
    setPurchaseItems(items => (
      items.length === 1 ? [{ ...EMPTY_PURCHASE_ITEM }] : items.filter((_, itemIndex) => itemIndex !== index)
    ));
  }

  async function applyPurchasePlan() {
    const groupedRows = purchaseRows.reduce((map, row) => {
      if (!row.tool || row.quantity <= 0) return map;
      const current = map.get(row.tool.id) || { tool: row.tool, quantity: 0 };
      current.quantity += row.quantity;
      map.set(row.tool.id, current);
      return map;
    }, new Map());

    if (groupedRows.size === 0) return;
    if (!confirm('確定要將這份試算直接加入授權與採購紀錄嗎？')) return;

    for (const { tool, quantity } of groupedRows.values()) {
      await saveTool({
        ...tool,
        seats: (tool.seats || 0) + quantity,
      }, {
        id: uid(),
        ts: today(),
        month: ym(),
        toolId: tool.id,
        delta: quantity,
        notes: '一鍵添加授權',
      });
    }

    setPurchaseItems([{ ...EMPTY_PURCHASE_ITEM }]);
  }

  return (
    <div>
      {isAdmin && (
        <div style={{ marginBottom: 16 }}>
          <button className="btn btn-primary" onClick={openNew}>+ 新增工具</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <SummaryCard title="每年總金額原價" value={ntd(annualListTotal)} color="#475569" />
        <SummaryCard title="每年總金額折扣後價" value={ntd(annualDiscountedTotal)} color="#2563eb" />
        <SummaryCard title="每年省下總金額" value={ntd(annualSavings)} color="#16a34a" />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>工具</th>
                <th>稅金/折扣</th>
                <th>月費</th>
                <th>年費</th>
                <th>月費總計</th>
                <th>年費總計</th>
                <th>已發/購買</th>
                {isAdmin && <th>操作</th>}
              </tr>
            </thead>
            <tbody>
              {tools.map(tool => {
                const users = toolUserCount(tool.id, departments);
                const monthlyCost = toolMonthlyNTD(tool, usdRate);
                const annualCost = toolAnnualNTD(tool, usdRate);
                const basis = tool.seats || users;
                const idleSeats = tool.seats ? Math.max(0, tool.seats - users) : 0;
                const pricing = normalizeToolPricing(tool);

                return (
                  <tr key={tool.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: tool.color, flexShrink: 0 }} />
                        <span style={{ fontWeight: 600 }}>{toolName(tool)}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, lineHeight: 1.5 }}>
                      <div>稅 {pricing.taxRate}%</div>
                      <div style={{ color: 'var(--muted)' }}>折扣 {pricing.discountPercent}%</div>
                    </td>
                    <td>{tool.monthly ? ntd(monthlyCost) : '—'}</td>
                    <td>{tool.annual ? ntd(annualCost) : '—'}</td>
                    <td style={{ fontWeight: 700 }}>{ntd(monthlyCost * basis)}</td>
                    <td style={{ fontWeight: 700 }}>{ntd(annualCost * basis)}</td>
                    <td>
                      <span style={{ color: users > (tool.seats || Infinity) ? '#ef4444' : undefined }}>{users}</span>
                      {tool.seats > 0 && (
                        <span style={{ color: 'var(--muted)' }}>
                          {' '} / {tool.seats}
                          {idleSeats > 0 && <span style={{ color: '#f59e0b', marginLeft: 4 }}>(閒置 {idleSeats})</span>}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(tool)}>編輯</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => openLog(tool.id)}>+ 採購</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTool(tool.id)}>刪除</button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <span className="card-title">預計新購買試算</span>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              先選工具與套數，直接看新增費用，也可以一鍵轉成授權採購。
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isAdmin && <button className="btn btn-ghost btn-sm" onClick={applyPurchasePlan}>一鍵添加授權</button>}
            <button className="btn btn-primary btn-sm" onClick={addPurchaseItem}>+ 新增工具</button>
          </div>
        </div>

        <div style={{ padding: '12px 16px 16px', display: 'grid', gap: 16 }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 860 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(240px, 2fr) 96px 140px 140px 140px 72px',
                  gap: 10,
                  padding: '0 0 8px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--muted)',
                }}
              >
                <div>工具</div>
                <div>套數</div>
                <div>總月費</div>
                <div>總年費</div>
                <div>年總折扣</div>
                <div></div>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {purchaseRows.map((row, index) => (
                  <div
                    key={`purchase-${index}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(240px, 2fr) 96px 140px 140px 140px 72px',
                      gap: 10,
                      alignItems: 'center',
                      padding: 12,
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      background: 'var(--card-bg)',
                    }}
                  >
                    <select
                      className="input"
                      value={purchaseItems[index].toolId}
                      onChange={e => updatePurchaseItem(index, { toolId: e.target.value })}
                    >
                      <option value="">請選擇工具</option>
                      {tools.map(tool => (
                        <option key={tool.id} value={tool.id}>{toolName(tool)}</option>
                      ))}
                    </select>

                    <input
                      className="input"
                      type="number"
                      min="1"
                      value={purchaseItems[index].quantity}
                      onChange={e => updatePurchaseItem(index, { quantity: e.target.value })}
                      placeholder="1"
                    />

                    <div style={{ fontWeight: 700 }}>{ntd(row.monthlyDiscounted)}</div>
                    <div style={{ fontWeight: 700 }}>{ntd(row.annualDiscounted)}</div>
                    <div style={{ fontWeight: 700, color: '#16a34a' }}>{ntd(row.annualDiscount)}</div>

                    <button className="btn btn-ghost btn-sm" onClick={() => removePurchaseItem(index)}>移除</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <ReadableMetric label="每月新增費用" value={ntd(purchaseMonthlyDiscountedTotal)} emphasis="#2563eb" />
            <ReadableMetric label="每年新增費用" value={ntd(purchaseAnnualDiscountedTotal)} emphasis="#2563eb" />
            <ReadableMetric label="未來每年總金額" value={ntd(projectedAnnualDiscountedTotal)} emphasis="#1d4ed8" />
            <ReadableMetric label="未來每年省下總金額" value={ntd(annualSavings + purchaseAnnualSavings)} emphasis="#16a34a" />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">採購紀錄</span>
          <select className="input" style={{ width: 180, fontSize: 12 }} value={logFilter} onChange={e => setLogFilter(e.target.value)}>
            <option value="">全部工具</option>
            {tools.map(tool => <option key={tool.id} value={tool.id}>{toolName(tool)}</option>)}
          </select>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>月份</th>
                <th>工具</th>
                <th>席數變化</th>
                <th>備註</th>
                <th>記錄日期</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filteredLog.sort((a, b) => b.month.localeCompare(a.month)).map(item => {
                const tool = tools.find(entry => entry.id === item.toolId);
                return (
                  <tr key={item.id}>
                    <td>{item.month}</td>
                    <td>{tool ? <span className="tool-chip" style={{ background: `${tool.color}22`, color: tool.color }}>{toolName(tool)}</span> : '—'}</td>
                    <td style={{ color: item.delta > 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                      {item.delta > 0 ? '+' : ''}{item.delta}
                    </td>
                    <td style={{ color: 'var(--muted)' }}>{item.notes || '—'}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{item.ts || '—'}</td>
                    {isAdmin && (
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('確定刪除此採購紀錄？')) deleteLog(item.id); }}>刪除</button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredLog.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', color: 'var(--muted)' }}>無採購紀錄</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {months.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">授權席數成長趨勢</span>
          </div>
          <div style={{ padding: 16 }}>
            <Line
              data={chartData}
              options={{
                responsive: true,
                plugins: { legend: { position: 'bottom' } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
              }}
            />
          </div>
        </div>
      )}

      <Modal
        show={!!toolModal}
        onClose={() => setToolModal(null)}
        title={toolModal === 'new' ? '新增 AI 工具' : '編輯工具'}
        footer={(
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setToolModal(null)}>取消</button>
            <SaveBtn onClick={handleSaveTool} />
          </div>
        )}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">工具名稱 *</label>
              <input className="input" value={form.name} onChange={e => setForm(current => ({ ...current, name: e.target.value }))} placeholder="例：ChatGPT" />
            </div>
            <div>
              <label className="label">方案</label>
              <input className="input" value={form.plan} onChange={e => setForm(current => ({ ...current, plan: e.target.value }))} placeholder="例：Plus" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">幣別</label>
              <select className="input" value={form.currency} onChange={e => setForm(current => ({ ...current, currency: e.target.value }))}>
                <option value="USD">USD</option>
                <option value="NTD">NTD</option>
              </select>
            </div>

            <div>
              <label className="label">計價方式</label>
              <select className="input" value={form.pricingMode} onChange={e => setForm(current => ({ ...current, pricingMode: e.target.value, listPrice: '' }))}>
                <option value="monthly">月費</option>
                <option value="annual">年費</option>
              </select>
            </div>

            <div>
              <label className="label">{form.pricingMode === 'monthly' ? '月費定價' : '年費定價'}</label>
              <input
                className="input"
                type="number"
                value={form.listPrice}
                onChange={e => setForm(current => ({ ...current, listPrice: e.target.value }))}
                placeholder={form.pricingMode === 'monthly' ? '請輸入月費' : '請輸入年費'}
              />
            </div>

            <div>
              <label className="label">已發/購買</label>
              <input className="input" type="number" value={form.seats} onChange={e => setForm(current => ({ ...current, seats: e.target.value }))} placeholder="0" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">稅金 (%)</label>
              <input className="input" type="number" step="0.1" value={form.taxRate} onChange={e => setForm(current => ({ ...current, taxRate: e.target.value }))} placeholder="0" />
            </div>

            <div>
              <label className="label">折扣 (%)</label>
              <input className="input" type="number" step="0.1" value={form.discountPercent} onChange={e => setForm(current => ({ ...current, discountPercent: e.target.value }))} placeholder="0" />
            </div>

            <div>
              <label className="label">月費</label>
              <input className="input" type="number" value={formPricing.displayMonthly} readOnly style={{ background: form.pricingMode === 'monthly' ? 'var(--card-bg)' : 'var(--bg-subtle)' }} />
            </div>

            <div>
              <label className="label">年費</label>
              <input className="input" type="number" value={formPricing.displayAnnual} readOnly style={{ background: form.pricingMode === 'annual' ? 'var(--card-bg)' : 'var(--bg-subtle)' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">顏色標籤</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm(current => ({ ...current, color }))}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: color,
                      border: form.color === color ? '3px solid #1e293b' : '2px solid transparent',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, alignSelf: 'end' }}>
              月費或年費只需輸入一個定價，系統會套用稅金與折扣後，自動反推另一個欄位。
            </div>
          </div>

          <div>
            <label className="label">備註</label>
            <textarea className="input" value={form.notes} onChange={e => setForm(current => ({ ...current, notes: e.target.value }))} rows={2} style={{ resize: 'vertical' }} />
          </div>
        </div>
      </Modal>

      <Modal
        show={!!logModal}
        onClose={() => setLogModal(null)}
        title="新增採購紀錄"
        size="sm"
        footer={(
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setLogModal(null)}>取消</button>
            <SaveBtn onClick={handleSaveLog} />
          </div>
        )}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="label">月份</label>
            <input className="input" type="month" value={logForm.month} onChange={e => setLogForm(current => ({ ...current, month: e.target.value }))} />
          </div>
          <div>
            <label className="label">席數變化（正數為增購，負數為減少）</label>
            <input className="input" type="number" value={logForm.delta} onChange={e => setLogForm(current => ({ ...current, delta: e.target.value }))} placeholder="例：5 或 -2" />
          </div>
          <div>
            <label className="label">備註</label>
            <input className="input" value={logForm.notes} onChange={e => setLogForm(current => ({ ...current, notes: e.target.value }))} placeholder="例：追加採購" />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SummaryCard({ title, value, color }) {
  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function ReadableMetric({ label, value, emphasis }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 10,
        background: 'var(--bg-subtle)',
        border: '1px solid var(--border)',
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 800, color: emphasis || 'var(--text)' }}>{value}</span>
    </div>
  );
}
