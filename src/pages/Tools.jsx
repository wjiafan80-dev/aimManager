import { useState, useEffect } from 'react';
import SaveBtn from '../components/common/SaveBtn.jsx';
import { Line } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend } from 'chart.js';
import { useApp } from '../context/AppContext.jsx';
import Modal from '../components/common/Modal.jsx';
import { buildToolNotes, extractToolNotes, normalizeToolPricing, toolAnnualListPriceNTD, toolMonthlyNTD, toolAnnualNTD, toolUserCount } from '../utils/calc.js';
import { ntd, toolName, uid } from '../utils/format.js';
import { ym, today } from '../utils/date.js';

Chart.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend);

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16','#f97316','#14b8a6','#3b82f6','#a855f7'];
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
const EMPTY_LOG  = { month: ym(), delta: '', notes: '' };

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
  const [toolModal, setToolModal] = useState(null); // null | 'new' | tool object
  const [logModal, setLogModal]   = useState(null); // null | { toolId } | log object
  const [logForm, setLogForm]     = useState(EMPTY_LOG);
  const [form, setForm]           = useState(EMPTY_TOOL);
  const [logFilter, setLogFilter] = useState('');
  const [purchaseItems, setPurchaseItems] = useState([EMPTY_PURCHASE_ITEM]);

  if (!data) return null;
  const { tools, departments, log } = data;
  const usd = data.settings.usd_to_ntd;

  useEffect(() => {
    if (autoAction === 'new-tool') {
      setForm({ ...EMPTY_TOOL, color: COLORS[tools.length % COLORS.length] });
      setToolModal('new');
    }
  }, [autoAction]);

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
      seats: parseInt(form.seats) || 0,
      notes: buildToolNotes(form.notes, {
        pricingMode: form.pricingMode,
        listPrice: parseFloat(form.listPrice) || 0,
        taxRate: parseFloat(form.taxRate) || 0,
        discountPercent: parseFloat(form.discountPercent) || 0,
      }),
    };
    // Auto log on create
    let logEntry = null;
    if (isNew && toolData.seats > 0) {
      logEntry = { id: uid(), ts: today(), month: ym(), toolId: null /* filled after */, delta: toolData.seats, notes: '初購' };
    } else if (!isNew && parseInt(form.seats) !== toolModal.seats && toolData.seats > 0) {
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
      delta: parseInt(logForm.delta),
      notes: logForm.notes || '',
    });
    setLogModal(null);
  }

  // Auth growth chart
  const filteredLog = logFilter
    ? log.filter(l => l.toolId === logFilter)
    : log;

  const months = [...new Set(filteredLog.map(l => l.month))].sort();
  const toolsForChart = logFilter ? tools.filter(t => t.id === logFilter) : tools;
  const chartData = {
    labels: months,
    datasets: toolsForChart.map(t => {
      let cum = 0;
      return {
        label: toolName(t),
        borderColor: t.color,
        backgroundColor: t.color + '22',
        data: months.map(m => {
          filteredLog.filter(l => l.toolId === t.id && l.month === m).forEach(l => cum += l.delta);
          return cum;
        }),
        tension: 0.3,
        fill: false,
      };
    }),
  };

  const formPricing = getFormPricing(form);
  const annualListTotal = tools.reduce((sum, tool) => {
    const basis = tool.seats || toolUserCount(tool.id, departments);
    return sum + toolAnnualListPriceNTD(tool, usd) * basis;
  }, 0);
  const annualDiscountedTotal = tools.reduce((sum, tool) => {
    const basis = tool.seats || toolUserCount(tool.id, departments);
    return sum + toolAnnualNTD(tool, usd) * basis;
  }, 0);
  const annualSavings = Math.max(0, annualListTotal - annualDiscountedTotal);
  const purchaseRows = purchaseItems
    .map((item, index) => {
      const tool = tools.find(t => t.id === item.toolId);
      const quantity = Math.max(0, parseInt(item.quantity, 10) || 0);
      if (!tool || quantity <= 0) return { index, item, tool: null, quantity: 0 };

      const annualList = toolAnnualListPriceNTD(tool, usd) * quantity;
      const annualDiscounted = toolAnnualNTD(tool, usd) * quantity;
      const monthlyDiscounted = toolMonthlyNTD(tool, usd) * quantity;
      const monthlyList = annualList / 12;

      return {
        index,
        item,
        tool,
        quantity,
        annualList,
        annualDiscounted,
        monthlyList,
        monthlyDiscounted,
      };
    });

  const purchaseAnnualListTotal = purchaseRows.reduce((sum, row) => sum + (row.annualList || 0), 0);
  const purchaseAnnualDiscountedTotal = purchaseRows.reduce((sum, row) => sum + (row.annualDiscounted || 0), 0);
  const purchaseMonthlyListTotal = purchaseRows.reduce((sum, row) => sum + (row.monthlyList || 0), 0);
  const purchaseMonthlyDiscountedTotal = purchaseRows.reduce((sum, row) => sum + (row.monthlyDiscounted || 0), 0);
  const purchaseAnnualDiff = Math.max(0, purchaseAnnualListTotal - purchaseAnnualDiscountedTotal);
  const purchaseMonthlyDiff = Math.max(0, purchaseMonthlyListTotal - purchaseMonthlyDiscountedTotal);
  const projectedAnnualDiscountedTotal = annualDiscountedTotal + purchaseAnnualDiscountedTotal;

  function updatePurchaseItem(index, patch) {
    setPurchaseItems(items => items.map((item, itemIndex) => (
      itemIndex === index ? { ...item, ...patch } : item
    )));
  }

  function addPurchaseItem() {
    setPurchaseItems(items => [...items, EMPTY_PURCHASE_ITEM]);
  }

  function removePurchaseItem(index) {
    setPurchaseItems(items => items.length === 1
      ? [EMPTY_PURCHASE_ITEM]
      : items.filter((_, itemIndex) => itemIndex !== index));
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
        <SummaryCard title="每年省下金額" value={ntd(annualSavings)} color="#16a34a" />
      </div>

      {/* Tools table */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>工具</th>
                <th>稅金 / 折扣</th>
                <th>月費</th>
                <th>年費</th>
                <th>月費合計</th>
                <th>年費合計</th>
                <th>已發 / 購買</th>
                {isAdmin && <th>操作</th>}
              </tr>
            </thead>
            <tbody>
              {tools.map(t => {
                const users = toolUserCount(t.id, departments);
                const mNTD = toolMonthlyNTD(t, usd);
                const aNTD = toolAnnualNTD(t, usd);
                const basis = t.seats || users;
                const idle = t.seats ? Math.max(0, t.seats - users) : 0;
                const pricing = normalizeToolPricing(t);
                return (
                  <tr key={t.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: t.color, flexShrink: 0 }}/>
                        <span style={{ fontWeight: 600 }}>{toolName(t)}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, lineHeight: 1.5 }}>
                      <div>稅 {pricing.taxRate}%</div>
                      <div style={{ color: 'var(--muted)' }}>折扣 {pricing.discountPercent}%</div>
                    </td>
                    <td>{t.monthly ? ntd(mNTD) : '—'}</td>
                    <td>{t.annual ? ntd(aNTD) : '—'}</td>
                    <td style={{ fontWeight: 700 }}>{ntd(mNTD * basis)}</td>
                    <td style={{ fontWeight: 700 }}>{ntd(aNTD * basis)}</td>
                    <td>
                      <span style={{ color: users > (t.seats || Infinity) ? '#ef4444' : undefined }}>
                        {users}
                      </span>
                      {t.seats > 0 && (
                        <span style={{ color: 'var(--muted)' }}> / {t.seats}
                          {idle > 0 && <span style={{ color: '#f59e0b', marginLeft: 4 }}>(閒置 {idle})</span>}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}>編輯</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => openLog(t.id)}>+ 採購</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTool(t.id)}>刪除</button>
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
              可先模擬新增工具套數，快速估算新增成本與未來年度總額。
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={addPurchaseItem}>+ 下一個工具</button>
        </div>

        <div style={{ padding: '8px 16px 16px', display: 'grid', gap: 12 }}>
          {purchaseItems.map((item, index) => {
            const selectedTool = tools.find(t => t.id === item.toolId);
            const rowAnnualList = selectedTool ? toolAnnualListPriceNTD(selectedTool, usd) * (Math.max(0, parseInt(item.quantity, 10) || 0)) : 0;
            const rowAnnualDiscounted = selectedTool ? toolAnnualNTD(selectedTool, usd) * (Math.max(0, parseInt(item.quantity, 10) || 0)) : 0;
            const rowMonthlyDiscounted = selectedTool ? toolMonthlyNTD(selectedTool, usd) * (Math.max(0, parseInt(item.quantity, 10) || 0)) : 0;
            return (
              <div
                key={`purchase-${index}`}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  padding: 14,
                  display: 'grid',
                  gridTemplateColumns: 'minmax(220px, 1.4fr) 120px 1fr auto',
                  gap: 12,
                  alignItems: 'end',
                }}
              >
                <div>
                  <label className="label">工具</label>
                  <select
                    className="input"
                    value={item.toolId}
                    onChange={e => updatePurchaseItem(index, { toolId: e.target.value })}
                  >
                    <option value="">請選擇工具</option>
                    {tools.map(tool => (
                      <option key={tool.id} value={tool.id}>{toolName(tool)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">套數</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={e => updatePurchaseItem(index, { quantity: e.target.value })}
                    placeholder="1"
                  />
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
                  {selectedTool ? (
                    <>
                      <div>月費折扣後：{ntd(rowMonthlyDiscounted)}</div>
                      <div>年費折扣後：{ntd(rowAnnualDiscounted)}</div>
                      <div>年費原價：{ntd(rowAnnualList)}</div>
                    </>
                  ) : (
                    <div>先選工具，再輸入預計新購買套數。</div>
                  )}
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => removePurchaseItem(index)}>
                  移除
                </button>
              </div>
            );
          })}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <SummaryCard title="年費新增總金額原價" value={ntd(purchaseAnnualListTotal)} color="#475569" />
            <SummaryCard title="年費新增總金額折扣後價格" value={ntd(purchaseAnnualDiscountedTotal)} color="#2563eb" />
            <SummaryCard title="年費價差" value={ntd(purchaseAnnualDiff)} color="#16a34a" />
            <SummaryCard title="月費新增總金額原價" value={ntd(purchaseMonthlyListTotal)} color="#475569" />
            <SummaryCard title="月費新增總金額折扣後價格" value={ntd(purchaseMonthlyDiscountedTotal)} color="#2563eb" />
            <SummaryCard title="月費價差" value={ntd(purchaseMonthlyDiff)} color="#16a34a" />
          </div>

          <div
            style={{
              borderRadius: 16,
              padding: '18px 20px',
              background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(16,185,129,0.08))',
              border: '1px solid rgba(37,99,235,0.16)',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>未來每年總金額折扣後價格</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1d4ed8' }}>{ntd(projectedAnnualDiscountedTotal)}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
              目前每年總金額折扣後價格 {ntd(annualDiscountedTotal)} + 預計新增 {ntd(purchaseAnnualDiscountedTotal)}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <span className="card-title">預計新購買試算</span>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              先選工具和套數，下面會直接整理成主管比較容易看的金額總表。
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={addPurchaseItem}>+ 下一個工具</button>
        </div>

        <div style={{ padding: '12px 16px 16px', display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gap: 12 }}>
            {purchaseItems.map((item, index) => {
              const selectedTool = tools.find(t => t.id === item.toolId);
              const quantity = Math.max(0, parseInt(item.quantity, 10) || 0);
              const annualList = selectedTool ? toolAnnualListPriceNTD(selectedTool, usd) * quantity : 0;
              const annualDiscounted = selectedTool ? toolAnnualNTD(selectedTool, usd) * quantity : 0;
              const monthlyList = annualList / 12;
              const monthlyDiscounted = selectedTool ? toolMonthlyNTD(selectedTool, usd) * quantity : 0;

              return (
                <div
                  key={`purchase-readable-${index}`}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    padding: 14,
                    display: 'grid',
                    gap: 12,
                    background: index % 2 === 0 ? 'var(--card-bg)' : 'var(--bg-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>項目 {index + 1}</div>
                    <button className="btn btn-ghost btn-sm" onClick={() => removePurchaseItem(index)}>移除</button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.5fr) 120px', gap: 12 }}>
                    <div>
                      <label className="label">工具</label>
                      <select
                        className="input"
                        value={item.toolId}
                        onChange={e => updatePurchaseItem(index, { toolId: e.target.value })}
                      >
                        <option value="">請選擇工具</option>
                        {tools.map(tool => (
                          <option key={tool.id} value={tool.id}>{toolName(tool)}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">套數</label>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => updatePurchaseItem(index, { quantity: e.target.value })}
                        placeholder="1"
                      />
                    </div>
                  </div>

                  {selectedTool ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>工具</th>
                            <th>套數</th>
                            <th>月費原價</th>
                            <th>月費折扣後</th>
                            <th>年費原價</th>
                            <th>年費折扣後</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ fontWeight: 700 }}>{toolName(selectedTool)}</td>
                            <td>{quantity}</td>
                            <td>{ntd(monthlyList)}</td>
                            <td style={{ color: '#2563eb', fontWeight: 700 }}>{ntd(monthlyDiscounted)}</td>
                            <td>{ntd(annualList)}</td>
                            <td style={{ color: '#2563eb', fontWeight: 700 }}>{ntd(annualDiscounted)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      先選工具，再輸入預計新購買套數。
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card" style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>年費</div>
              <div style={{ display: 'grid', gap: 10 }}>
                <ReadableMetric label="新增總金額原價" value={ntd(purchaseAnnualListTotal)} />
                <ReadableMetric label="新增總金額折扣後價格" value={ntd(purchaseAnnualDiscountedTotal)} emphasis="#2563eb" />
                <ReadableMetric label="價差" value={ntd(purchaseAnnualDiff)} emphasis="#16a34a" />
              </div>
            </div>

            <div className="card" style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>月費</div>
              <div style={{ display: 'grid', gap: 10 }}>
                <ReadableMetric label="新增總金額原價" value={ntd(purchaseMonthlyListTotal)} />
                <ReadableMetric label="新增總金額折扣後價格" value={ntd(purchaseMonthlyDiscountedTotal)} emphasis="#2563eb" />
                <ReadableMetric label="價差" value={ntd(purchaseMonthlyDiff)} emphasis="#16a34a" />
              </div>
            </div>
          </div>

          <div
            style={{
              borderRadius: 16,
              padding: '18px 20px',
              background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(16,185,129,0.08))',
              border: '1px solid rgba(37,99,235,0.16)',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>未來每年總金額折扣後價格</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1d4ed8' }}>{ntd(projectedAnnualDiscountedTotal)}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
              目前每年總金額折扣後價格 {ntd(annualDiscountedTotal)} + 預計新增 {ntd(purchaseAnnualDiscountedTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* Purchase log */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">採購紀錄</span>
          <select className="input" style={{ width: 180, fontSize: 12 }} value={logFilter} onChange={e => setLogFilter(e.target.value)}>
            <option value="">全部工具</option>
            {tools.map(t => <option key={t.id} value={t.id}>{toolName(t)}</option>)}
          </select>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr><th>月份</th><th>工具</th><th>席數變化</th><th>備註</th><th>記錄日期</th>{isAdmin && <th></th>}</tr>
            </thead>
            <tbody>
              {filteredLog.sort((a, b) => b.month.localeCompare(a.month)).map(l => {
                const tool = tools.find(t => t.id === l.toolId);
                return (
                  <tr key={l.id}>
                    <td>{l.month}</td>
                    <td>{tool ? <span className="tool-chip" style={{ background: tool.color + '22', color: tool.color }}>{toolName(tool)}</span> : '—'}</td>
                    <td style={{ color: l.delta > 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                      {l.delta > 0 ? '+' : ''}{l.delta}
                    </td>
                    <td style={{ color: 'var(--muted)' }}>{l.notes || '—'}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{l.ts || '—'}</td>
                    {isAdmin && (
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('確定刪除此採購紀錄？')) deleteLog(l.id); }}>刪除</button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredLog.length === 0 && (
                <tr><td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', color: 'var(--muted)' }}>無採購紀錄</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chart */}
      {months.length > 0 && (
        <div className="card">
          <div className="card-header"><span className="card-title">授權席數成長趨勢</span></div>
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

      {/* Tool Modal */}
      <Modal
        show={!!toolModal}
        onClose={() => setToolModal(null)}
        title={toolModal === 'new' ? '新增 AI 工具' : '編輯工具'}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setToolModal(null)}>取消</button>
            <SaveBtn onClick={handleSaveTool} />
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">工具名稱 *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="例：ChatGPT" />
            </div>
            <div>
              <label className="label">方案</label>
              <input className="input" value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))} placeholder="例：Plus" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">幣別</label>
              <select className="input" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                <option value="USD">USD</option>
                <option value="NTD">NTD</option>
              </select>
            </div>
            <div>
              <label className="label">計價方式</label>
              <select className="input" value={form.pricingMode} onChange={e => setForm(f => ({ ...f, pricingMode: e.target.value }))}>
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
                onChange={e => setForm(f => ({ ...f, listPrice: e.target.value }))}
                placeholder={form.pricingMode === 'monthly' ? '請輸入月費' : '請輸入年費'}
              />
            </div>
            <div>
              <label className="label">購買席數</label>
              <input className="input" type="number" value={form.seats} onChange={e => setForm(f => ({ ...f, seats: e.target.value }))} placeholder="0" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">稅金 (%)</label>
              <input className="input" type="number" step="0.1" value={form.taxRate} onChange={e => setForm(f => ({ ...f, taxRate: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <label className="label">折扣 (%)</label>
              <input className="input" type="number" step="0.1" value={form.discountPercent} onChange={e => setForm(f => ({ ...f, discountPercent: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <label className="label">{form.pricingMode === 'monthly' ? '月費' : '月費（自動反推）'}</label>
              <input
                className="input"
                type="number"
                value={formPricing.displayMonthly}
                readOnly
                style={{ background: form.pricingMode === 'monthly' ? 'var(--card-bg)' : 'var(--bg-subtle)' }}
              />
            </div>
            <div>
              <label className="label">{form.pricingMode === 'annual' ? '年費' : '年費（自動反推）'}</label>
              <input
                className="input"
                type="number"
                value={formPricing.displayAnnual}
                readOnly
                style={{ background: form.pricingMode === 'annual' ? 'var(--card-bg)' : 'var(--bg-subtle)' }}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">顏色標籤</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: form.color === c ? '3px solid #1e293b' : '2px solid transparent', cursor: 'pointer' }}
                  />
                ))}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, alignSelf: 'end' }}>
              先選月費或年費，再輸入對應定價；系統會套用稅金與折扣百分比後，自動反推另一個欄位。
            </div>
          </div>
          <div>
            <label className="label">備註</label>
            <textarea className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ resize: 'vertical' }} />
          </div>
        </div>
      </Modal>

      {/* Log Modal */}
      <Modal
        show={!!logModal}
        onClose={() => setLogModal(null)}
        title="新增採購紀錄"
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setLogModal(null)}>取消</button>
            <SaveBtn onClick={handleSaveLog} />
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="label">月份</label>
            <input className="input" type="month" value={logForm.month} onChange={e => setLogForm(f => ({ ...f, month: e.target.value }))} />
          </div>
          <div>
            <label className="label">席數變化（正數=增購，負數=減少）</label>
            <input className="input" type="number" value={logForm.delta} onChange={e => setLogForm(f => ({ ...f, delta: e.target.value }))} placeholder="例：5 或 -2" />
          </div>
          <div>
            <label className="label">備註</label>
            <input className="input" value={logForm.notes} onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))} placeholder="例：追加採購" />
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
