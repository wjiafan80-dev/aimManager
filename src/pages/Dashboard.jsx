import { useEffect, useRef, useState } from 'react';
import { Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { useApp } from '../context/AppContext.jsx';
import {
  seatCostNTD, unassignedCostNTD, activePeopleCount, aiUsersCount,
  totalIssuedSeats, totalPurchasedSeats, toolUserCount, toolMonthlyNTD,
  fpScore, normTools, isExpired
} from '../utils/calc.js';
import { ntd, toolName } from '../utils/format.js';
import { ym, ymPlus, ymAdd12 } from '../utils/date.js';

Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement);

export default function Dashboard({ onNav }) {
  const { data, isAdmin, savePersonFull, revokeAssignment } = useApp();
  if (!data) return null;
  const { tools, departments, settings } = data;
  const usd = settings.usd_to_ntd;

  const totalPeople = activePeopleCount(departments);
  const aiUsers = aiUsersCount(departments);
  const issued = totalIssuedSeats(tools, departments);
  const purchased = totalPurchasedSeats(tools);
  const monthlyTotal = seatCostNTD('monthly', tools, departments, usd);
  const annualTotal = seatCostNTD('annual', tools, departments, usd);
  const idleCost = unassignedCostNTD('monthly', tools, departments, usd);
  const score = fpScore(departments, tools);

  // Expiring items
  const now = ym();
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

  // Capacity over-limit
  const overCapacity = tools.filter(t => t.seats > 0 && toolUserCount(t.id, departments) > t.seats);

  // Donut chart data
  const donutData = {
    labels: tools.map(t => toolName(t)),
    datasets: [{
      data: tools.map(t => toolUserCount(t.id, departments)),
      backgroundColor: tools.map(t => t.color + 'cc'),
      borderColor: tools.map(t => t.color),
      borderWidth: 1,
    }],
  };

  // Bar chart: dept monthly costs
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
  const centerEntries = Object.entries(centers).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const barData = {
    labels: centerEntries.map(([name]) => name.length > 10 ? name.slice(0, 10) + '…' : name),
    datasets: [{
      label: '月費 (NTD)',
      data: centerEntries.map(([, v]) => Math.round(v)),
      backgroundColor: '#6366f1cc',
      borderColor: '#6366f1',
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  async function handleExtend(dept, person, tool) {
    const updated = { ...person };
    updated.tools = normTools(person.tools).map(t =>
      t.toolId === tool.id && !t.revoked
        ? { ...t, end: ymAdd12(t.end >= ym() ? t.end : ym()) }
        : t
    );
    await savePersonFull({ person: { ...person, deptId: dept.id }, assignments: updated.tools });
  }

  async function handleRevoke(dept, person, tool) {
    await revokeAssignment({ personId: person.id, toolId: tool.id, end: ym() });
  }

  return (
    <div>
      {/* Score banner */}
      <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff' }}>
        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>AI 戰力指數</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
              {score >= 80 ? '策略整合階段' : score >= 60 ? '進階應用階段' : score >= 40 ? '積極擴散階段' : score >= 20 ? '試點實驗階段' : '探索萌芽階段'}
            </div>
            <div style={{ opacity: 0.8, fontSize: 13 }}>
              {settings.company}・{totalPeople} 人・{tools.length} 種工具
            </div>
            <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.2)', borderRadius: 8, height: 8, overflow: 'hidden' }}>
              <div style={{ width: score + '%', height: '100%', background: '#fff', borderRadius: 8, transition: 'width 0.6s ease' }}/>
            </div>
          </div>
        </div>
      </div>

      {/* Capacity alert */}
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

      {/* Expiry alert */}
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

      {/* Stats cards */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <StatCard label="AI 使用人數" value={aiUsers} sub={`/ ${totalPeople} 人（${totalPeople ? Math.round(aiUsers / totalPeople * 100) : 0}%）`} color="#6366f1" />
        <StatCard label="已發 / 購買席數" value={issued} sub={`/ ${purchased} 席`} color={issued > purchased ? '#ef4444' : '#10b981'} />
        <StatCard
          label="每月費用"
          value={`NT$${Math.round(monthlyTotal).toLocaleString()}`}
          sub={idleCost > 0 ? `閒置 NT$${Math.round(idleCost).toLocaleString()}` : '無閒置授權'}
          color={idleCost > 0 ? '#f59e0b' : '#10b981'}
          subStyle={{ color: idleCost > 0 ? '#f59e0b' : undefined }}
        />
        <StatCard label="每年費用" value={`NT$${Math.round(annualTotal).toLocaleString()}`} sub="年度預算需求" color="#8b5cf6" />
      </div>

      {/* Quick actions */}
      {isAdmin && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => onNav('tools', 'new-tool')}>+ 新增工具</button>
          <button className="btn btn-primary" onClick={() => onNav('personnel', 'new-person')}>+ 新增人員</button>
          <button className="btn btn-ghost" onClick={() => onNav('personnel', 'batch-assign')}>批次指派授權</button>
        </div>
      )}

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {tools.length > 0 && (
          <div className="card">
            <div className="card-header"><span className="card-title">工具使用人數</span></div>
            <div style={{ padding: 16 }}>
              <Doughnut
                data={donutData}
                options={{
                  responsive: true,
                  plugins: { legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 10 } } },
                  cutout: '60%',
                }}
              />
            </div>
          </div>
        )}
        {centerEntries.length > 0 && (
          <div className="card">
            <div className="card-header"><span className="card-title">各中心月費</span></div>
            <div style={{ padding: 16 }}>
              <Bar
                data={barData}
                options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { ticks: { callback: v => 'NT$' + v.toLocaleString(), font: { size: 11 } } },
                    x: { ticks: { font: { size: 11 } } },
                  },
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, subStyle = {} }) {
  return (
    <div className="card stat-card">
      <div style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', ...subStyle }}>{sub}</div>
      </div>
    </div>
  );
}
