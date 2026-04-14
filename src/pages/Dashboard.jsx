import { Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, RadialLinearScale } from 'chart.js';
import { Doughnut, Bar, Radar, Bubble, Line } from 'react-chartjs-2';
import { useApp } from '../context/AppContext.jsx';
import {
  seatCostNTD, unassignedCostNTD, activePeopleCount, aiUsersCount,
  totalIssuedSeats, totalPurchasedSeats, toolUserCount, toolMonthlyNTD,
  fpScore, normTools, isExpired,
} from '../utils/calc.js';
import { toolName } from '../utils/format.js';
import { ym, ymPlus, ymAdd12 } from '../utils/date.js';

Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, RadialLinearScale);

function deptToolRate(dept) {
  const active = (dept.people || []).filter(p => !p.removed);
  if (!active.length) return 0;
  const users = active.filter(p => normTools(p.tools).some(t => !t.revoked && !isExpired(t)));
  return users.length / active.length;
}

function rateToLevel(rate) {
  if (rate >= 0.8) return 5;
  if (rate >= 0.6) return 4;
  if (rate >= 0.4) return 3;
  if (rate >= 0.2) return 2;
  return 1;
}

export default function Dashboard({ onNav }) {
  const { data, isAdmin, savePersonFull, revokeAssignment } = useApp();
  if (!data) return null;
  const { tools, departments, settings, log = [], maturity = {} } = data;
  const usd = settings.usd_to_ntd;

  const totalPeople  = activePeopleCount(departments);
  const aiUsers      = aiUsersCount(departments);
  const issued       = totalIssuedSeats(tools, departments);
  const purchased    = totalPurchasedSeats(tools);
  const monthlyTotal = seatCostNTD('monthly', tools, departments, usd);
  const annualTotal  = seatCostNTD('annual',  tools, departments, usd);
  const idleCost     = unassignedCostNTD('monthly', tools, departments, usd);
  const score        = fpScore(departments, tools);
  const penetration  = totalPeople ? Math.round(aiUsers / totalPeople * 100) : 0;
  const fpLevel      = score < 30 ? '基礎建置期' : score < 60 ? '主力擴展期' : '全面武裝期';

  // Capacity over-limit
  const overCapacity = tools.filter(t => t.seats > 0 && toolUserCount(t.id, departments) > t.seats);

  // Expiry items
  const now    = ym();
  const cutoff = ymPlus(2);
  const expiringItems = [];
  departments.forEach(d =>
    (d.people || []).forEach(p =>
      normTools(p.tools || []).forEach(t => {
        if (t.revoked || !t.end || t.end > cutoff) return;
        const tool = tools.find(x => x.id === t.toolId);
        if (!tool) return;
        expiringItems.push({ dept: d, person: p, tool, entry: t, expired: t.end < now });
      })
    )
  );
  expiringItems.sort((a, b) => {
    if (a.expired !== b.expired) return a.expired ? -1 : 1;
    return a.entry.end.localeCompare(b.entry.end);
  });

  // ── Radar chart: maturity averages ──
  const matSums = [0, 0, 0, 0, 0];
  let matCount = 0;
  departments.forEach(d => {
    const m = maturity[d.id] || { training: 1, process: 1, tracking: 1, support: 1 };
    matSums[0] += rateToLevel(deptToolRate(d));
    matSums[1] += m.training;
    matSums[2] += m.process;
    matSums[3] += m.tracking;
    matSums[4] += m.support;
    matCount++;
  });
  const radarData = {
    labels: ['配備率', '培訓', '流程', '追蹤', '高層支持'],
    datasets: [{
      label: '平均成熟度',
      data: matCount > 0 ? matSums.map(v => Math.round((v / matCount) * 10) / 10) : [0, 0, 0, 0, 0],
      backgroundColor: 'rgba(13, 148, 136, 0.15)',
      borderColor: '#0D9488',
      pointBackgroundColor: '#fff',
      pointBorderColor: '#0D9488',
      borderWidth: 2,
    }],
  };

  // ── Bubble chart: dept penetration ──
  const bubbleRaw = departments.map(d => {
    const pCount   = (d.people || []).filter(p => !p.removed).length;
    const toolCount = (d.people || []).reduce((s, p) => s + normTools(p.tools || []).filter(t => !t.revoked).length, 0);
    return { x: pCount, y: Math.round(deptToolRate(d) * 100), r: Math.max(5, Math.min(25, toolCount * 2 + 5)), label: d.name, toolCount };
  });
  const bubbleData = {
    datasets: [{
      label: '單位火力',
      data: bubbleRaw.map(d => ({ x: d.x, y: d.y, r: d.r })),
      backgroundColor: 'rgba(244, 63, 94, 0.6)',
      borderColor: '#f43f5e',
      borderWidth: 1,
    }],
  };

  // ── Doughnut chart ──
  const donutData = {
    labels: tools.map(t => toolName(t)),
    datasets: [{
      data: tools.map(t => toolUserCount(t.id, departments)),
      backgroundColor: tools.map(t => t.color + 'cc'),
      borderColor: tools.map(t => t.color),
      borderWidth: 1,
    }],
  };

  // ── Horizontal bar chart (by center) ──
  const centers = {};
  departments.forEach(d => {
    const c = d.center || d.name;
    if (!centers[c]) centers[c] = 0;
    (d.people || []).forEach(p => {
      if (p.removed) return;
      normTools(p.tools).forEach(t => {
        if (t.revoked || isExpired(t)) return;
        const tool = tools.find(x => x.id === t.toolId);
        if (tool) centers[c] += toolMonthlyNTD(tool, usd);
      });
    });
  });
  const centerEntries = Object.entries(centers).sort((a, b) => b[1] - a[1]);
  const barH = Math.max(200, centerEntries.length * 38 + 40);
  const barData = {
    labels: centerEntries.map(([name]) => name),
    datasets: [{
      label: '月費 (NTD)',
      data: centerEntries.map(([, v]) => Math.round(v)),
      backgroundColor: '#6366f1aa',
      borderColor: '#6366f1',
      borderWidth: 1.5,
      borderRadius: 5,
    }],
  };

  // ── Auth log chart ──
  const months = [...new Set(log.map(l => l.month))].sort();
  const authDatasets = tools.map(t => {
    let cum = 0;
    return {
      label: toolName(t),
      borderColor: t.color,
      backgroundColor: t.color + '22',
      data: months.map(m => {
        log.filter(l => l.toolId === t.id && l.month === m).forEach(l => { cum += l.delta; });
        return cum;
      }),
      tension: 0.3,
      fill: false,
      pointRadius: 4,
    };
  });

  async function handleExtend(dept, person, tool) {
    const assignments = normTools(person.tools).map(t =>
      t.toolId === tool.id && !t.revoked
        ? { ...t, end: ymAdd12(t.end >= ym() ? t.end : ym()) }
        : t
    );
    await savePersonFull({ person: { ...person, deptId: dept.id }, assignments });
  }

  async function handleRevoke(dept, person, tool) {
    if (!confirm(`確定收回 ${person.name} 的 ${tool.name || tool.id} 授權？`)) return;
    await revokeAssignment({ personId: person.id, toolId: tool.id, end: ym() });
  }

  return (
    <div>
      {/* ── 戰力指數大看板 ── */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', padding: '24px 32px', gap: 32 }}>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
            全公司 AI 戰力指數
          </div>
          <div style={{ fontSize: 64, fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{score}</div>
        </div>
        <div style={{ flex: 1, borderLeft: '1px solid var(--border)', paddingLeft: 32 }}>
          <h3 style={{ fontSize: 20, marginBottom: 8, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            全公司部隊處於「{fpLevel}」
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
            目前公司總體 AI 使用率為{' '}
            <strong style={{ color: 'var(--primary)' }}>{penetration}%</strong>，共有{' '}
            <strong style={{ color: 'var(--primary)' }}>{tools.length}</strong>{' '}
            項頂尖武器部署於 {departments.length} 個作戰單位。
          </p>
        </div>
      </div>

      {/* ── 警示區 ── */}
      {overCapacity.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid #ef4444', marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title" style={{ color: '#ef4444' }}>⚠ 授權超出警示</span>
          </div>
          <div style={{ padding: '4px 16px 14px', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {overCapacity.map(t => {
              const count = toolUserCount(t.id, departments);
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px' }}>
                  <span className="tool-chip" style={{ background: t.color + '22', color: t.color }}>{toolName(t)}</span>
                  <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
                    {count} / {t.seats} 席（超出 {count - t.seats}）
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {expiringItems.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid #f59e0b', marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              ⏰ 授權到期提醒
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)' }}>（已過期 + 60 天內到期）</span>
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b' }}>共 {expiringItems.length} 筆</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr><th>姓名</th><th>單位</th><th>工具</th><th>到期日</th>{isAdmin && <th>操作</th>}</tr>
              </thead>
              <tbody>
                {expiringItems.map(({ dept, person, tool, entry, expired }, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{person.name}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{dept.name}</td>
                    <td><span className="tool-chip" style={{ background: tool.color + '22', color: tool.color }}>{toolName(tool)}</span></td>
                    <td>
                      <span style={{ color: expired ? '#ef4444' : '#f59e0b', fontWeight: 700 }}>{entry.end}</span>
                      {' '}<span style={{ fontSize: 11, background: (expired ? '#ef4444' : '#f59e0b') + '22', color: expired ? '#ef4444' : '#f59e0b', padding: '2px 6px', borderRadius: 10 }}>{expired ? '已過期' : '即將到期'}</span>
                    </td>
                    {isAdmin && (
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {!expired && <button className="btn btn-primary btn-sm" onClick={() => handleExtend(dept, person, tool)}>展延一年</button>}
                          <button className="btn btn-danger btn-sm" onClick={() => handleRevoke(dept, person, tool)}>收回</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 統計卡片 ── */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <StatCard label="AI 使用人數" value={aiUsers} sub={`/ ${totalPeople} 人・${penetration}% 使用率`} color="#6366f1" onClick={() => onNav('personnel')} />
        <StatCard
          label="授權使用狀況"
          value={issued}
          sub={purchased ? `/ ${purchased} 席・${tools.length} 種工具` : `已發席數・${tools.length} 種工具`}
          color={issued > purchased && purchased > 0 ? '#ef4444' : '#f59e0b'}
          onClick={() => onNav('tools')}
        />
        <StatCard
          label="每月總費用"
          value={`NT$${Math.round(monthlyTotal).toLocaleString()}`}
          sub={idleCost > 0 ? `其中閒置 NT$${Math.round(idleCost).toLocaleString()}` : 'NTD/月'}
          color={idleCost > 0 ? '#f59e0b' : '#10b981'}
          subStyle={{ color: idleCost > 0 ? '#f59e0b' : undefined }}
          onClick={() => onNav('reports')}
        />
        <StatCard
          label="每年費用"
          value={`NT$${Math.round(annualTotal).toLocaleString()}`}
          sub="NTD/年"
          color="#8b5cf6"
          onClick={() => onNav('reports')}
        />
      </div>

      {/* ── 快速操作 ── */}
      <div className="quick-actions" style={{ marginBottom: 20 }}>
        <button className="quick-btn" onClick={() => onNav('tools', 'new-tool')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 22, height: 22 }}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          新增工具
        </button>
        <button className="quick-btn" onClick={() => onNav('personnel', 'new-person')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 22, height: 22 }}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          新增人員
        </button>
        <button className="quick-btn" onClick={() => onNav('personnel', 'assign')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 22, height: 22 }}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          指派授權
        </button>
        <button className="quick-btn" onClick={() => onNav('personnel', 'batch-assign')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 22, height: 22 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          批次指派
        </button>
      </div>

      {/* ── 各中心月費 + 工具使用人數 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {centerEntries.length > 0 && (
          <div className="card">
            <div className="card-header"><span className="card-title">各中心月費比較 (NTD)</span></div>
            <div style={{ height: barH, padding: '0 8px 8px' }}>
              <Bar data={barData} options={{
                indexAxis: 'y',
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' NT$ ' + ctx.parsed.x.toLocaleString() } } },
                scales: {
                  x: { ticks: { callback: v => 'NT$' + v.toLocaleString(), font: { size: 11 } }, grid: { color: '#f1f5f9' } },
                  y: { ticks: { font: { size: 12 } }, grid: { display: false } },
                },
              }} />
            </div>
          </div>
        )}
        {tools.length > 0 && (
          <div className="card">
            <div className="card-header"><span className="card-title">工具使用人數</span></div>
            <div style={{ padding: 16 }}>
              <div style={{ maxWidth: 200, margin: '0 auto' }}>
                <Doughnut data={donutData} options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  cutout: '60%',
                }} />
              </div>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6, padding: '0 8px 8px' }}>
                {tools.map(t => {
                  const count  = toolUserCount(t.id, departments);
                  const seats  = t.seats || 0;
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, padding: '4px 8px', borderRadius: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 14, height: 14, borderRadius: 3, background: t.color, flexShrink: 0 }} />
                        <span style={{ fontWeight: 500 }}>{toolName(t)}</span>
                      </div>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                        {seats ? `${count} / ${seats}` : count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 授權席數成長趨勢 ── */}
      {months.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">授權席數成長趨勢</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>各工具累積購買席數</span>
          </div>
          <div style={{ height: 220, padding: '0 8px 12px' }}>
            <Line
              data={{ labels: months, datasets: authDatasets }}
              options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 8 } } },
                scales: {
                  y: { beginAtZero: true, ticks: { font: { size: 11 } } },
                  x: { ticks: { font: { size: 11 } } },
                },
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color, subStyle = {}, onClick }) {
  return (
    <div className="card stat-card" style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', ...subStyle }}>{sub}</div>
      </div>
    </div>
  );
}
