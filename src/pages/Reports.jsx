import { useState } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext.jsx';
import { normTools, isExpired, toolMonthlyNTD, toolAnnualNTD, toolUserCount, personMonthlyNTD, personAnnualNTD, seatCostNTD, unassignedCostNTD } from '../utils/calc.js';
import { ntd, toolName } from '../utils/format.js';
import { ym } from '../utils/date.js';

const TABS = [
  { key: 'byDept',    label: '單位費用' },
  { key: 'byTool',    label: '工具費用' },
  { key: 'fullList',  label: '人員明細' },
  { key: 'disabled',  label: '停用記錄' },
  { key: 'multiTool', label: '多工具' },
];

function SortTh({ label, col, sort, onSort }) {
  return (
    <th style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }} onClick={() => onSort(col)}>
      {label} {sort.col === col ? (sort.asc ? '↑' : '↓') : <span style={{ opacity: 0.3 }}>↕</span>}
    </th>
  );
}

function useSort(init = { col: null, asc: true }) {
  const [sort, setSort] = useState(init);
  function onSort(col) {
    setSort(s => ({ col, asc: s.col === col ? !s.asc : true }));
  }
  function sorted(arr, getValue) {
    if (!sort.col) return arr;
    return [...arr].sort((a, b) => {
      const va = getValue(a, sort.col), vb = getValue(b, sort.col);
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sort.asc ? cmp : -cmp;
    });
  }
  return { sort, onSort, sorted };
}

// ── byDept ─────────────────────────────────────────────────────────────────
function ByDept({ departments, tools, usd }) {
  const [expanded, setExpanded] = useState({});
  const { sort, onSort, sorted } = useSort();

  const centers = {};
  departments.forEach(d => {
    const c = d.center || d.name;
    if (!centers[c]) centers[c] = { name: c, depts: [], people: 0, monthly: 0, annual: 0, toolSet: new Set() };
    const activePeople = (d.people || []).filter(p => !p.removed);
    centers[c].depts.push(d);
    centers[c].people += activePeople.length;
    activePeople.forEach(p => {
      centers[c].monthly += personMonthlyNTD(p, tools, usd);
      centers[c].annual += personAnnualNTD(p, tools, usd);
      normTools(p.tools).filter(t => !t.revoked && !isExpired(t)).forEach(t => centers[c].toolSet.add(t.toolId));
    });
  });

  const rows = sorted(Object.values(centers), (r, col) => ({
    name: r.name, people: r.people, tools: r.toolSet.size, monthly: r.monthly, annual: r.annual
  }[col]));

  return (
    <table className="table">
      <thead>
        <tr>
          <SortTh label="中心" col="name" sort={sort} onSort={onSort} />
          <SortTh label="人數" col="people" sort={sort} onSort={onSort} />
          <SortTh label="工具數" col="tools" sort={sort} onSort={onSort} />
          <SortTh label="月費" col="monthly" sort={sort} onSort={onSort} />
          <SortTh label="年費" col="annual" sort={sort} onSort={onSort} />
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map(c => (
          <>
            <tr key={c.name}>
              <td style={{ fontWeight: 700 }}>{c.name}</td>
              <td>{c.people}</td>
              <td>{c.toolSet.size}</td>
              <td style={{ fontWeight: 700 }}>NT${Math.round(c.monthly).toLocaleString()}</td>
              <td style={{ fontWeight: 700 }}>NT${Math.round(c.annual).toLocaleString()}</td>
              <td>
                <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(e => ({ ...e, [c.name]: !e[c.name] }))}>
                  {expanded[c.name] ? '收合' : '展開'}
                </button>
              </td>
            </tr>
            {expanded[c.name] && c.depts.flatMap(d =>
              (d.people || []).filter(p => !p.removed).map(p => (
                <tr key={p.id} style={{ background: 'var(--bg-subtle)' }}>
                  <td style={{ paddingLeft: 28, color: 'var(--muted)', fontSize: 12 }}>{d.name}</td>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td colSpan={2}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {normTools(p.tools).filter(t => !t.revoked && !isExpired(t)).map(t => {
                        const tool = tools.find(x => x.id === t.toolId);
                        return tool ? <span key={t.toolId} className="tool-chip" style={{ background: tool.color + '22', color: tool.color, fontSize: 11 }}>{toolName(tool)}</span> : null;
                      })}
                    </div>
                  </td>
                  <td>NT${Math.round(personMonthlyNTD(p, tools, usd)).toLocaleString()}</td>
                  <td>NT${Math.round(personAnnualNTD(p, tools, usd)).toLocaleString()}</td>
                </tr>
              ))
            )}
          </>
        ))}
      </tbody>
    </table>
  );
}

// ── byTool ─────────────────────────────────────────────────────────────────
function ByTool({ departments, tools, usd }) {
  const [expanded, setExpanded] = useState({});
  const { sort, onSort, sorted } = useSort();

  const rows = sorted(tools, (t, col) => ({
    name: toolName(t),
    users: toolUserCount(t.id, departments),
    seats: t.seats,
    monthly: toolMonthlyNTD(t, usd) * (t.seats || toolUserCount(t.id, departments)),
    annual: toolAnnualNTD(t, usd) * (t.seats || toolUserCount(t.id, departments)),
  }[col]));

  return (
    <table className="table">
      <thead>
        <tr>
          <SortTh label="工具" col="name" sort={sort} onSort={onSort} />
          <SortTh label="使用 / 購買" col="users" sort={sort} onSort={onSort} />
          <SortTh label="單月費用" col="monthly" sort={sort} onSort={onSort} />
          <SortTh label="月費合計" col="monthly" sort={sort} onSort={onSort} />
          <SortTh label="年費合計" col="annual" sort={sort} onSort={onSort} />
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map(t => {
          const users = toolUserCount(t.id, departments);
          const basis = t.seats || users;
          const mUnit = toolMonthlyNTD(t, usd);
          const aUnit = toolAnnualNTD(t, usd);
          const usersOfTool = departments.flatMap(d =>
            (d.people || []).filter(p => !p.removed && normTools(p.tools).some(x => x.toolId === t.id && !x.revoked && !isExpired(x)))
              .map(p => ({ dept: d, person: p, entry: normTools(p.tools).find(x => x.toolId === t.id && !x.revoked) }))
          );
          return (
            <>
              <tr key={t.id}>
                <td><span className="tool-chip" style={{ background: t.color + '22', color: t.color }}>{toolName(t)}</span></td>
                <td>
                  <span style={{ color: users > (t.seats || Infinity) ? '#ef4444' : undefined }}>{users}</span>
                  {t.seats > 0 && <span style={{ color: 'var(--muted)' }}> / {t.seats}</span>}
                </td>
                <td>NT${Math.round(mUnit).toLocaleString()}</td>
                <td style={{ fontWeight: 700 }}>NT${Math.round(mUnit * basis).toLocaleString()}</td>
                <td style={{ fontWeight: 700 }}>NT${Math.round(aUnit * basis).toLocaleString()}</td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(e => ({ ...e, [t.id]: !e[t.id] }))}>
                    {expanded[t.id] ? '收合' : '展開'}
                  </button>
                </td>
              </tr>
              {expanded[t.id] && usersOfTool.map(({ dept, person, entry }) => (
                <tr key={person.id} style={{ background: 'var(--bg-subtle)' }}>
                  <td style={{ paddingLeft: 28, fontWeight: 600 }}>{person.name}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{dept.name}</td>
                  <td colSpan={2} style={{ fontSize: 12 }}>{entry?.account || '—'}</td>
                  <td colSpan={2} style={{ fontSize: 12 }}>{entry?.start || '—'} → {entry?.end || '無限期'}</td>
                </tr>
              ))}
            </>
          );
        })}
      </tbody>
    </table>
  );
}

// ── fullList ────────────────────────────────────────────────────────────────
function FullList({ departments, tools, usd }) {
  const { sort, onSort, sorted } = useSort();
  const rows = departments.flatMap(d =>
    (d.people || []).filter(p => !p.removed && normTools(p.tools).some(t => !t.revoked && !isExpired(t)))
      .map(p => ({ dept: d, person: p, monthly: personMonthlyNTD(p, tools, usd), annual: personAnnualNTD(p, tools, usd) }))
  );
  const s = sorted(rows, (r, col) => ({
    name: r.person.name, dept: r.dept.name, toolCount: normTools(r.person.tools).filter(t => !t.revoked && !isExpired(t)).length,
    monthly: r.monthly, annual: r.annual,
  }[col]));

  return (
    <table className="table">
      <thead>
        <tr>
          <SortTh label="姓名" col="name" sort={sort} onSort={onSort} />
          <SortTh label="單位" col="dept" sort={sort} onSort={onSort} />
          <th>工具</th>
          <SortTh label="月費" col="monthly" sort={sort} onSort={onSort} />
          <SortTh label="年費" col="annual" sort={sort} onSort={onSort} />
        </tr>
      </thead>
      <tbody>
        {s.map(({ dept, person, monthly, annual }) => (
          <tr key={person.id}>
            <td style={{ fontWeight: 600 }}>{person.name}</td>
            <td style={{ color: 'var(--muted)', fontSize: 12 }}>{dept.name}</td>
            <td>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {normTools(person.tools).filter(t => !t.revoked && !isExpired(t)).map(t => {
                  const tool = tools.find(x => x.id === t.toolId);
                  return tool ? <span key={t.toolId} className="tool-chip" style={{ background: tool.color + '22', color: tool.color, fontSize: 11 }}>{toolName(tool)}</span> : null;
                })}
              </div>
            </td>
            <td style={{ fontWeight: 700 }}>NT${Math.round(monthly).toLocaleString()}</td>
            <td>NT${Math.round(annual).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── disabled ────────────────────────────────────────────────────────────────
function Disabled({ departments, tools, isAdmin, onDelete }) {
  const rows = departments.flatMap(d =>
    (d.people || []).flatMap(p =>
      normTools(p.tools).filter(t => t.revoked).map(t => {
        const tool = tools.find(x => x.id === t.toolId);
        return { dept: d, person: p, tool, entry: t };
      })
    )
  );
  return (
    <table className="table">
      <thead>
        <tr><th>姓名</th><th>單位</th><th>工具</th><th>帳號</th><th>結束日</th>{isAdmin && <th></th>}</tr>
      </thead>
      <tbody>
        {rows.map(({ dept, person, tool, entry }, i) => (
          <tr key={i}>
            <td style={{ fontWeight: 600 }}>{person.name}</td>
            <td style={{ color: 'var(--muted)', fontSize: 12 }}>{dept.name}</td>
            <td>{tool ? <span className="tool-chip" style={{ background: tool.color + '22', color: tool.color }}>{toolName(tool)}</span> : '—'}</td>
            <td style={{ fontSize: 12 }}>{entry.account || '—'}</td>
            <td style={{ fontSize: 12, color: '#ef4444' }}>{entry.end || '—'}</td>
            {isAdmin && (
              <td><button className="btn btn-danger btn-sm" onClick={() => onDelete && onDelete(entry)}>刪除</button></td>
            )}
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', color: 'var(--muted)' }}>無停用記錄</td></tr>}
      </tbody>
    </table>
  );
}

// ── multiTool ───────────────────────────────────────────────────────────────
function MultiTool({ departments, tools, usd }) {
  const { sort, onSort, sorted } = useSort({ col: 'toolCount', asc: false });
  const rows = departments.flatMap(d =>
    (d.people || []).filter(p => {
      if (p.removed) return false;
      return normTools(p.tools).filter(t => !t.revoked && !isExpired(t)).length >= 2;
    }).map(p => {
      const active = normTools(p.tools).filter(t => !t.revoked && !isExpired(t));
      return { dept: d, person: p, toolCount: active.length, monthly: personMonthlyNTD(p, tools, usd), active };
    })
  );
  const s = sorted(rows, (r, col) => ({ name: r.person.name, dept: r.dept.name, toolCount: r.toolCount, monthly: r.monthly }[col]));

  return (
    <table className="table">
      <thead>
        <tr>
          <SortTh label="姓名" col="name" sort={sort} onSort={onSort} />
          <SortTh label="單位" col="dept" sort={sort} onSort={onSort} />
          <SortTh label="工具數" col="toolCount" sort={sort} onSort={onSort} />
          <th>工具</th>
          <SortTh label="月費" col="monthly" sort={sort} onSort={onSort} />
        </tr>
      </thead>
      <tbody>
        {s.map(({ dept, person, toolCount, monthly, active }) => (
          <tr key={person.id}>
            <td style={{ fontWeight: 600 }}>{person.name}</td>
            <td style={{ color: 'var(--muted)', fontSize: 12 }}>{dept.name}</td>
            <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{toolCount}</td>
            <td>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {active.map(t => {
                  const tool = tools.find(x => x.id === t.toolId);
                  return tool ? <span key={t.toolId} className="tool-chip" style={{ background: tool.color + '22', color: tool.color, fontSize: 11 }}>{toolName(tool)}</span> : null;
                })}
              </div>
            </td>
            <td style={{ fontWeight: 700 }}>NT${Math.round(monthly).toLocaleString()}</td>
          </tr>
        ))}
        {s.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)' }}>無多工具使用者</td></tr>}
      </tbody>
    </table>
  );
}

// ── Main Reports ─────────────────────────────────────────────────────────────
export default function Reports() {
  const { data, isAdmin, deleteAssignment } = useApp();
  const [tab, setTab] = useState('byDept');

  if (!data) return null;
  const { tools, departments, settings } = data;
  const usd = settings.usd_to_ntd;

  const monthlyTotal = seatCostNTD('monthly', tools, departments, usd);
  const annualTotal = seatCostNTD('annual', tools, departments, usd);
  const idleCost = unassignedCostNTD('monthly', tools, departments, usd);
  const totalPeople = departments.reduce((s, d) => s + (d.people || []).filter(p => !p.removed).length, 0);

  function exportExcel() {
    const wb = XLSX.utils.book_new();

    // 人員明細 sheet
    const rows = departments.flatMap(d =>
      (d.people || []).filter(p => !p.removed).flatMap(p =>
        normTools(p.tools).filter(t => !t.revoked && !isExpired(t)).map(t => {
          const tool = tools.find(x => x.id === t.toolId);
          return [d.center, d.name, p.name, p.empId || '', tool ? toolName(tool) : '', t.account || '', t.start || '', t.end || '', Math.round(toolMonthlyNTD(tool, usd))];
        })
      )
    );
    const ws = XLSX.utils.aoa_to_sheet([['中心', '單位', '姓名', '員工編號', '工具', '帳號', '開始', '到期', '月費(NTD)'], ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, '人員明細');

    // 工具費用 sheet
    const toolRows = tools.map(t => {
      const users = toolUserCount(t.id, departments);
      const basis = t.seats || users;
      return [toolName(t), t.currency, t.monthly || 0, t.annual || 0, t.seats, users, Math.round(toolMonthlyNTD(t, usd) * basis), Math.round(toolAnnualNTD(t, usd) * basis)];
    });
    const ws2 = XLSX.utils.aoa_to_sheet([['工具', '幣別', '月費(原幣)', '年費(原幣)', '購買席數', '使用人數', '月費合計(NTD)', '年費合計(NTD)'], ...toolRows]);
    XLSX.utils.book_append_sheet(wb, ws2, '工具費用');

    XLSX.writeFile(wb, `AI工具管理報表_${ym()}.xlsx`);
  }

  return (
    <div>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>統計對象</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>{totalPeople}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>位在職人員</div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>每月費用合計</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#6366f1' }}>NT${Math.round(monthlyTotal).toLocaleString()}</div>
          {idleCost > 0 && <div style={{ fontSize: 12, color: '#f59e0b' }}>閒置 NT${Math.round(idleCost).toLocaleString()}</div>}
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>每年費用合計</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#8b5cf6' }}>NT${Math.round(annualTotal).toLocaleString()}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>年度預算需求</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(t => (
            <button key={t.key} className={`btn ${tab === t.key ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={exportExcel}>
          ↓ 匯出 Excel
        </button>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        {tab === 'byDept'    && <ByDept    departments={departments} tools={tools} usd={usd} />}
        {tab === 'byTool'    && <ByTool    departments={departments} tools={tools} usd={usd} />}
        {tab === 'fullList'  && <FullList  departments={departments} tools={tools} usd={usd} />}
        {tab === 'disabled'  && <Disabled  departments={departments} tools={tools} isAdmin={isAdmin}
          onDelete={entry => {
            if (!confirm('確定刪除此停用紀錄？')) return;
            deleteAssignment(entry._assignId);
          }}
        />}
        {tab === 'multiTool' && <MultiTool departments={departments} tools={tools} usd={usd} />}
      </div>
    </div>
  );
}
