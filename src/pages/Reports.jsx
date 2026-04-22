import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext.jsx';
import {
  activePeopleCount,
  getExpiringItems,
  isExpired,
  normTools,
  personAnnualNTD,
  personMonthlyNTD,
  seatCostNTD,
  toolAnnualNTD,
  toolMonthlyNTD,
  toolUserCount,
  unassignedCostNTD,
} from '../utils/calc.js';
import { ntd, toolName } from '../utils/format.js';
import { ym, fmtMonth } from '../utils/date.js';

const TABS = [
  { key: 'byDept', label: '依單位' },
  { key: 'byTool', label: '依工具' },
  { key: 'fullList', label: '完整名單' },
  { key: 'disabled', label: '停用紀錄' },
  { key: 'multiTool', label: '多工具使用者' },
];

function SortTh({ label, col, sort, onSort }) {
  const symbol = sort.col === col ? (sort.asc ? '▲' : '▼') : '↕';
  return (
    <th style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }} onClick={() => onSort(col)}>
      {label} <span style={{ opacity: sort.col === col ? 1 : 0.35 }}>{symbol}</span>
    </th>
  );
}

function useSort(initial = { col: null, asc: true }) {
  const [sort, setSort] = useState(initial);

  function onSort(col) {
    setSort((current) => ({ col, asc: current.col === col ? !current.asc : true }));
  }

  function sorted(rows, getValue) {
    if (!sort.col) return rows;

    return [...rows].sort((left, right) => {
      const leftValue = getValue(left, sort.col);
      const rightValue = getValue(right, sort.col);
      const result = typeof leftValue === 'number'
        ? leftValue - rightValue
        : String(leftValue).localeCompare(String(rightValue));

      return sort.asc ? result : -result;
    });
  }

  return { sort, onSort, sorted };
}

function buildHighCostTools(tools, departments, usd) {
  return [...tools]
    .map((tool) => {
      const users = toolUserCount(tool.id, departments);
      const chargedSeats = tool.seats || users;
      return {
        ...tool,
        users,
        chargedSeats,
        monthlyCost: toolMonthlyNTD(tool, usd) * chargedSeats,
      };
    })
    .sort((left, right) => right.monthlyCost - left.monthlyCost)
    .slice(0, 5);
}

function buildIdleSeatRows(tools, departments, usd) {
  return tools
    .map((tool) => {
      const users = toolUserCount(tool.id, departments);
      const idleSeats = Math.max(0, (tool.seats || 0) - users);
      return {
        ...tool,
        users,
        idleSeats,
        idleCost: toolMonthlyNTD(tool, usd) * idleSeats,
      };
    })
    .filter((tool) => tool.idleSeats > 0)
    .sort((left, right) => right.idleCost - left.idleCost)
    .slice(0, 5);
}

function ByDept({ departments, tools, usd }) {
  const [expanded, setExpanded] = useState({});
  const { sort, onSort, sorted } = useSort();

  const centers = {};

  departments.forEach((department) => {
    const centerName = department.center || department.name;
    if (!centers[centerName]) {
      centers[centerName] = {
        name: centerName,
        depts: [],
        people: 0,
        monthly: 0,
        annual: 0,
        toolSet: new Set(),
      };
    }

    const activePeople = (department.people || []).filter((person) => !person.removed);
    centers[centerName].depts.push(department);
    centers[centerName].people += activePeople.length;

    activePeople.forEach((person) => {
      centers[centerName].monthly += personMonthlyNTD(person, tools, usd);
      centers[centerName].annual += personAnnualNTD(person, tools, usd);
      normTools(person.tools)
        .filter((tool) => !tool.revoked && !isExpired(tool))
        .forEach((tool) => centers[centerName].toolSet.add(tool.toolId));
    });
  });

  const rows = sorted(Object.values(centers), (row, col) => ({
    name: row.name,
    people: row.people,
    tools: row.toolSet.size,
    monthly: row.monthly,
    annual: row.annual,
  }[col]));

  return (
    <table className="table">
      <thead>
        <tr>
          <SortTh label="中心" col="name" sort={sort} onSort={onSort} />
          <SortTh label="人數" col="people" sort={sort} onSort={onSort} />
          <SortTh label="工具數" col="tools" sort={sort} onSort={onSort} />
          <SortTh label="月成本" col="monthly" sort={sort} onSort={onSort} />
          <SortTh label="年成本" col="annual" sort={sort} onSort={onSort} />
          <th />
        </tr>
      </thead>
      <tbody>
        {rows.map((center) => (
          <FragmentRows key={center.name}>
            <tr>
              <td style={{ fontWeight: 700 }}>{center.name}</td>
              <td>{center.people}</td>
              <td>{center.toolSet.size}</td>
              <td style={{ fontWeight: 700 }}>{ntd(center.monthly)}</td>
              <td style={{ fontWeight: 700 }}>{ntd(center.annual)}</td>
              <td>
                <button className="btn btn-ghost btn-sm" onClick={() => setExpanded((current) => ({ ...current, [center.name]: !current[center.name] }))}>
                  {expanded[center.name] ? '收合' : '展開'}
                </button>
              </td>
            </tr>
            {expanded[center.name] && center.depts.flatMap((department) =>
              (department.people || [])
                .filter((person) => !person.removed)
                .map((person) => (
                  <tr key={person.id} style={{ background: 'var(--bg-subtle)' }}>
                    <td style={{ paddingLeft: 28, color: 'var(--muted)', fontSize: 12 }}>{department.name}</td>
                    <td style={{ fontWeight: 600 }}>{person.name}</td>
                    <td colSpan={2}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {normTools(person.tools)
                          .filter((tool) => !tool.revoked && !isExpired(tool))
                          .map((tool) => {
                            const matchedTool = tools.find((item) => item.id === tool.toolId);
                            return matchedTool ? (
                              <span key={tool.toolId} className="tool-chip" style={{ background: `${matchedTool.color}22`, color: matchedTool.color, fontSize: 11 }}>
                                {toolName(matchedTool)}
                              </span>
                            ) : null;
                          })}
                      </div>
                    </td>
                    <td>{ntd(personMonthlyNTD(person, tools, usd))}</td>
                    <td>{ntd(personAnnualNTD(person, tools, usd))}</td>
                  </tr>
                )),
            )}
          </FragmentRows>
        ))}
      </tbody>
    </table>
  );
}

function ByTool({ departments, tools, usd }) {
  const [expanded, setExpanded] = useState({});
  const { sort, onSort, sorted } = useSort();

  const rows = sorted(tools, (tool, col) => ({
    name: toolName(tool),
    users: toolUserCount(tool.id, departments),
    monthly: toolMonthlyNTD(tool, usd) * (tool.seats || toolUserCount(tool.id, departments)),
    annual: toolAnnualNTD(tool, usd) * (tool.seats || toolUserCount(tool.id, departments)),
  }[col]));

  return (
    <table className="table">
      <thead>
        <tr>
          <SortTh label="工具" col="name" sort={sort} onSort={onSort} />
          <SortTh label="使用 / 採購" col="users" sort={sort} onSort={onSort} />
          <SortTh label="單月費用" col="monthly" sort={sort} onSort={onSort} />
          <SortTh label="月成本" col="monthly" sort={sort} onSort={onSort} />
          <SortTh label="年成本" col="annual" sort={sort} onSort={onSort} />
          <th />
        </tr>
      </thead>
      <tbody>
        {rows.map((tool) => {
          const users = toolUserCount(tool.id, departments);
          const chargedSeats = tool.seats || users;
          const monthlyUnit = toolMonthlyNTD(tool, usd);
          const annualUnit = toolAnnualNTD(tool, usd);
          const assignees = departments.flatMap((department) =>
            (department.people || [])
              .filter((person) => !person.removed && normTools(person.tools).some((entry) => entry.toolId === tool.id && !entry.revoked && !isExpired(entry)))
              .map((person) => ({
                department,
                person,
                entry: normTools(person.tools).find((entry) => entry.toolId === tool.id && !entry.revoked),
              })),
          );

          return (
            <FragmentRows key={tool.id}>
              <tr>
                <td>
                  <span className="tool-chip" style={{ background: `${tool.color}22`, color: tool.color }}>
                    {toolName(tool)}
                  </span>
                </td>
                <td>
                  <span style={{ color: users > (tool.seats || Number.POSITIVE_INFINITY) ? '#ef4444' : undefined }}>{users}</span>
                  {tool.seats > 0 && <span style={{ color: 'var(--muted)' }}> / {tool.seats}</span>}
                </td>
                <td>{ntd(monthlyUnit)}</td>
                <td style={{ fontWeight: 700 }}>{ntd(monthlyUnit * chargedSeats)}</td>
                <td style={{ fontWeight: 700 }}>{ntd(annualUnit * chargedSeats)}</td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => setExpanded((current) => ({ ...current, [tool.id]: !current[tool.id] }))}>
                    {expanded[tool.id] ? '收合' : '展開'}
                  </button>
                </td>
              </tr>
              {expanded[tool.id] && assignees.map(({ department, person, entry }) => (
                <tr key={`${tool.id}-${person.id}`} style={{ background: 'var(--bg-subtle)' }}>
                  <td style={{ paddingLeft: 28, fontWeight: 600 }}>{person.name}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{department.name}</td>
                  <td colSpan={2} style={{ fontSize: 12 }}>{entry?.account || '未填寫帳號'}</td>
                  <td colSpan={2} style={{ fontSize: 12 }}>{fmtMonth(entry?.start) || '未填'} → {fmtMonth(entry?.end) || '無期限'}</td>
                </tr>
              ))}
            </FragmentRows>
          );
        })}
      </tbody>
    </table>
  );
}

function FullList({ departments, tools, usd }) {
  const { sort, onSort, sorted } = useSort();
  const rows = departments.flatMap((department) =>
    (department.people || [])
      .filter((person) => !person.removed && normTools(person.tools).some((tool) => !tool.revoked && !isExpired(tool)))
      .map((person) => ({
        department,
        person,
        monthly: personMonthlyNTD(person, tools, usd),
        annual: personAnnualNTD(person, tools, usd),
      })),
  );

  const orderedRows = sorted(rows, (row, col) => ({
    name: row.person.name,
    dept: row.department.name,
    toolCount: normTools(row.person.tools).filter((tool) => !tool.revoked && !isExpired(tool)).length,
    monthly: row.monthly,
    annual: row.annual,
  }[col]));

  return (
    <table className="table">
      <thead>
        <tr>
          <SortTh label="姓名" col="name" sort={sort} onSort={onSort} />
          <SortTh label="單位" col="dept" sort={sort} onSort={onSort} />
          <th>工具</th>
          <SortTh label="月成本" col="monthly" sort={sort} onSort={onSort} />
          <SortTh label="年成本" col="annual" sort={sort} onSort={onSort} />
        </tr>
      </thead>
      <tbody>
        {orderedRows.map(({ department, person, monthly, annual }) => (
          <tr key={person.id}>
            <td style={{ fontWeight: 600 }}>{person.name}</td>
            <td style={{ color: 'var(--muted)', fontSize: 12 }}>{department.name}</td>
            <td>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {normTools(person.tools)
                  .filter((tool) => !tool.revoked && !isExpired(tool))
                  .map((tool) => {
                    const matchedTool = tools.find((item) => item.id === tool.toolId);
                    return matchedTool ? (
                      <span key={tool.toolId} className="tool-chip" style={{ background: `${matchedTool.color}22`, color: matchedTool.color, fontSize: 11 }}>
                        {toolName(matchedTool)}
                      </span>
                    ) : null;
                  })}
              </div>
            </td>
            <td style={{ fontWeight: 700 }}>{ntd(monthly)}</td>
            <td>{ntd(annual)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Disabled({ departments, tools, isAdmin, onDelete }) {
  const rows = departments.flatMap((department) =>
    (department.people || []).flatMap((person) =>
      normTools(person.tools)
        .filter((tool) => tool.revoked)
        .map((tool) => ({
          department,
          person,
          tool: tools.find((item) => item.id === tool.toolId),
          entry: tool,
        })),
    ),
  );

  return (
    <table className="table">
      <thead>
        <tr>
          <th>姓名</th>
          <th>單位</th>
          <th>工具</th>
          <th>帳號</th>
          <th>結束日</th>
          {isAdmin && <th />}
        </tr>
      </thead>
      <tbody>
        {rows.map(({ department, person, tool, entry }, index) => (
          <tr key={`${person.id}-${index}`}>
            <td style={{ fontWeight: 600 }}>{person.name}</td>
            <td style={{ color: 'var(--muted)', fontSize: 12 }}>{department.name}</td>
            <td>
              {tool ? (
                <span className="tool-chip" style={{ background: `${tool.color}22`, color: tool.color }}>
                  {toolName(tool)}
                </span>
              ) : '未知工具'}
            </td>
            <td style={{ fontSize: 12 }}>{entry.account || '未填寫帳號'}</td>
            <td style={{ fontSize: 12, color: '#ef4444' }}>{fmtMonth(entry.end) || '未填寫'}</td>
            {isAdmin && (
              <td>
                <button className="btn btn-danger btn-sm" onClick={() => onDelete(entry)}>
                  刪除
                </button>
              </td>
            )}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', color: 'var(--muted)' }}>
              目前沒有停用紀錄。
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function MultiTool({ departments, tools, usd }) {
  const { sort, onSort, sorted } = useSort({ col: 'toolCount', asc: false });
  const rows = departments.flatMap((department) =>
    (department.people || [])
      .filter((person) => !person.removed)
      .map((person) => {
        const activeTools = normTools(person.tools).filter((tool) => !tool.revoked && !isExpired(tool));
        return { department, person, activeTools };
      })
      .filter(({ activeTools }) => activeTools.length >= 2)
      .map(({ department, person, activeTools }) => ({
        department,
        person,
        activeTools,
        toolCount: activeTools.length,
        monthly: personMonthlyNTD(person, tools, usd),
      })),
  );

  const orderedRows = sorted(rows, (row, col) => ({
    name: row.person.name,
    dept: row.department.name,
    toolCount: row.toolCount,
    monthly: row.monthly,
  }[col]));

  return (
    <table className="table">
      <thead>
        <tr>
          <SortTh label="姓名" col="name" sort={sort} onSort={onSort} />
          <SortTh label="單位" col="dept" sort={sort} onSort={onSort} />
          <SortTh label="工具數" col="toolCount" sort={sort} onSort={onSort} />
          <th>工具</th>
          <SortTh label="月成本" col="monthly" sort={sort} onSort={onSort} />
        </tr>
      </thead>
      <tbody>
        {orderedRows.map(({ department, person, activeTools, toolCount, monthly }) => (
          <tr key={person.id}>
            <td style={{ fontWeight: 600 }}>{person.name}</td>
            <td style={{ color: 'var(--muted)', fontSize: 12 }}>{department.name}</td>
            <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{toolCount}</td>
            <td>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {activeTools.map((tool) => {
                  const matchedTool = tools.find((item) => item.id === tool.toolId);
                  return matchedTool ? (
                    <span key={tool.toolId} className="tool-chip" style={{ background: `${matchedTool.color}22`, color: matchedTool.color, fontSize: 11 }}>
                      {toolName(matchedTool)}
                    </span>
                  ) : null;
                })}
              </div>
            </td>
            <td style={{ fontWeight: 700 }}>{ntd(monthly)}</td>
          </tr>
        ))}
        {orderedRows.length === 0 && (
          <tr>
            <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)' }}>
              目前沒有多工具使用者。
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export default function Reports() {
  const { data, isAdmin, deleteAssignment } = useApp();
  const [tab, setTab] = useState('byDept');

  if (!data) return null;

  const { tools, departments, settings } = data;
  const usd = settings.usd_to_ntd;

  const monthlyTotal = seatCostNTD('monthly', tools, departments, usd);
  const annualTotal = seatCostNTD('annual', tools, departments, usd);
  const idleCost = unassignedCostNTD('monthly', tools, departments, usd);
  const totalPeople = activePeopleCount(departments);
  const expiringItems = useMemo(() => getExpiringItems(departments, tools, 2), [departments, tools]);
  const highCostTools = useMemo(() => buildHighCostTools(tools, departments, usd), [tools, departments, usd]);
  const idleSeatRows = useMemo(() => buildIdleSeatRows(tools, departments, usd), [tools, departments, usd]);

  function exportExcel() {
    const workbook = XLSX.utils.book_new();

    const personnelRows = departments.flatMap((department) =>
      (department.people || [])
        .filter((person) => !person.removed)
        .flatMap((person) =>
          normTools(person.tools)
            .filter((tool) => !tool.revoked && !isExpired(tool))
            .map((tool) => {
              const matchedTool = tools.find((item) => item.id === tool.toolId);
              return [
                department.center,
                department.name,
                person.name,
                person.empId || '',
                matchedTool ? toolName(matchedTool) : '',
                tool.account || '',
                tool.start || '',
                tool.end || '',
                Math.round(matchedTool ? toolMonthlyNTD(matchedTool, usd) : 0),
              ];
            }),
        ),
    );

    const personnelSheet = XLSX.utils.aoa_to_sheet([
      ['中心', '單位', '姓名', '員工編號', '工具', '帳號', '開始', '到期', '月成本 (NTD)'],
      ...personnelRows,
    ]);
    XLSX.utils.book_append_sheet(workbook, personnelSheet, '人員明細');

    const toolRows = tools.map((tool) => {
      const users = toolUserCount(tool.id, departments);
      const chargedSeats = tool.seats || users;
      return [
        toolName(tool),
        tool.currency,
        tool.monthly || 0,
        tool.annual || 0,
        tool.seats,
        users,
        Math.round(toolMonthlyNTD(tool, usd) * chargedSeats),
        Math.round(toolAnnualNTD(tool, usd) * chargedSeats),
      ];
    });

    const toolSheet = XLSX.utils.aoa_to_sheet([
      ['工具', '幣別', '月費 (原幣)', '年費 (原幣)', '採購席數', '使用人數', '月成本 (NTD)', '年成本 (NTD)'],
      ...toolRows,
    ]);
    XLSX.utils.book_append_sheet(workbook, toolSheet, '工具費用');

    XLSX.writeFile(workbook, `AI工具管理報表_${ym()}.xlsx`);
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <SummaryCard title="統計對象" value={String(totalPeople)} subtitle="位在職人員" color="var(--primary)" />
        <SummaryCard
          title="每月成本"
          value={ntd(monthlyTotal)}
          subtitle={idleCost > 0 ? `含閒置成本 ${ntd(idleCost)}` : '目前未發現明顯閒置'}
          color="#6366f1"
        />
        <SummaryCard title="年度預算需求" value={ntd(annualTotal)} subtitle="可作為採購評估依據" color="#8b5cf6" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <FocusCard title="閒置授權" subtitle="主管最容易理解的可節省空間">
          {idleSeatRows.length > 0 ? idleSeatRows.map((tool) => (
            <FocusRow
              key={tool.id}
              title={toolName(tool)}
              meta={`已購 ${tool.seats} 席，目前使用 ${tool.users} 人`}
              value={`閒置 ${tool.idleSeats} 席 / ${ntd(tool.idleCost)}`}
              tone="#f59e0b"
            />
          )) : <EmptyHint text="目前沒有閒置授權。" />}
        </FocusCard>

        <FocusCard title="近期到期" subtitle="展示系統的風險提醒能力">
          {expiringItems.length > 0 ? expiringItems.slice(0, 5).map(({ person, dept, tool, entry, expired }) => (
            <FocusRow
              key={`${person.id}-${tool.id}-${entry.end}`}
              title={`${person.name} / ${toolName(tool)}`}
              meta={dept.name}
              value={`${fmtMonth(entry.end)}${expired ? '，已逾期' : '，即將到期'}`}
              tone={expired ? '#ef4444' : '#f59e0b'}
            />
          )) : <EmptyHint text="近 2 個月沒有到期授權。" />}
        </FocusCard>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <span className="card-title">高成本工具排行</span>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>先找成本，再決定要不要整併或精簡</div>
          </div>
        </div>
        <div style={{ padding: '8px 16px 16px' }}>
          <table className="table">
            <thead>
              <tr>
                <th>工具</th>
                <th>使用 / 採購</th>
                <th>月成本</th>
              </tr>
            </thead>
            <tbody>
              {highCostTools.map((tool) => (
                <tr key={tool.id}>
                  <td>
                    <span className="tool-chip" style={{ background: `${tool.color}22`, color: tool.color }}>
                      {toolName(tool)}
                    </span>
                  </td>
                  <td>{tool.users}{tool.seats > 0 ? ` / ${tool.seats}` : ''}</td>
                  <td style={{ fontWeight: 700 }}>{ntd(tool.monthlyCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map((item) => (
            <button
              key={item.key}
              className={`btn ${tab === item.key ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={exportExcel}>
          匯出 Excel
        </button>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        {tab === 'byDept' && <ByDept departments={departments} tools={tools} usd={usd} />}
        {tab === 'byTool' && <ByTool departments={departments} tools={tools} usd={usd} />}
        {tab === 'fullList' && <FullList departments={departments} tools={tools} usd={usd} />}
        {tab === 'disabled' && (
          <Disabled
            departments={departments}
            tools={tools}
            isAdmin={isAdmin}
            onDelete={(entry) => {
              if (!confirm('確定要刪除此停用紀錄嗎？')) return;
              deleteAssignment(entry._assignId);
            }}
          />
        )}
        {tab === 'multiTool' && <MultiTool departments={departments} tools={tools} usd={usd} />}
      </div>
    </div>
  );
}

function SummaryCard({ title, value, subtitle, color }) {
  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{subtitle}</div>
    </div>
  );
}

function FocusCard({ title, subtitle, children }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <span className="card-title">{title}</span>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ padding: '8px 16px 14px', display: 'grid', gap: 10 }}>{children}</div>
    </div>
  );
}

function FocusRow({ title, meta, value, tone }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
        <span style={{ fontWeight: 700 }}>{title}</span>
        <span style={{ fontWeight: 700, color: tone }}>{value}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{meta}</div>
    </div>
  );
}

function EmptyHint({ text }) {
  return <div style={{ fontSize: 13, color: 'var(--muted)', padding: '6px 0' }}>{text}</div>;
}

function FragmentRows({ children }) {
  return <>{children}</>;
}
