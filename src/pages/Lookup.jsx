import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { normTools, isExpired } from '../utils/calc.js';
import { toolName } from '../utils/format.js';
import { fmtMonth } from '../utils/date.js';

export default function Lookup() {
  const { data } = useApp();
  const [toolId, setToolId] = useState('');
  const [search, setSearch] = useState('');

  if (!data) return null;
  const { tools, departments } = data;

  const rows = [];
  departments.forEach(dept => {
    (dept.people || []).forEach(p => {
      if (p.removed) return;
      normTools(p.tools).forEach(t => {
        if (!t.toolId) return;
        if (toolId && t.toolId !== toolId) return;
        if (t.revoked || isExpired(t)) return;
        const tool = tools.find(x => x.id === t.toolId);
        if (!tool) return;
        const q = search.toLowerCase();
        if (q && !p.name.toLowerCase().includes(q) && !(p.empId || '').includes(q)) return;
        rows.push({ dept, person: p, tool, entry: t });
      });
    });
  });

  // Group by center → dept
  const centers = {};
  rows.forEach(r => {
    const c = r.dept.center || r.dept.name;
    if (!centers[c]) centers[c] = {};
    const d = r.dept.name;
    if (!centers[c][d]) centers[c][d] = [];
    centers[c][d].push(r);
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select
          className="input"
          value={toolId}
          onChange={e => setToolId(e.target.value)}
          style={{ width: 220 }}
        >
          <option value="">— 全部工具 —</option>
          {tools.map(t => (
            <option key={t.id} value={t.id}>{toolName(t)}</option>
          ))}
        </select>
        <input
          className="input"
          placeholder="搜尋姓名或員工編號…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 200 }}
        />
        <span style={{ alignSelf: 'center', fontSize: 13, color: 'var(--muted)' }}>
          共 {rows.length} 筆
        </span>
      </div>

      {Object.keys(centers).length === 0 ? (
        <div className="empty-state">
          <p>無符合的帳號資料</p>
        </div>
      ) : (
        Object.entries(centers).map(([center, depts]) => (
          <div key={center} className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <span className="card-title">{center}</span>
            </div>
            {Object.entries(depts).map(([deptName, entries]) => (
              <div key={deptName} style={{ padding: '8px 16px 16px' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, fontWeight: 600 }}>
                  {deptName}
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>姓名</th>
                      <th>員工編號</th>
                      <th>工具</th>
                      <th>帳號</th>
                      <th>開始</th>
                      <th>到期</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(({ person, tool, entry }, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{person.name}</td>
                        <td style={{ color: 'var(--muted)', fontSize: 12 }}>{person.empId || '—'}</td>
                        <td>
                          <span className="tool-chip" style={{ background: tool.color + '22', color: tool.color }}>
                            {toolName(tool)}
                          </span>
                        </td>
                        <td style={{ fontSize: 13 }}>{entry.account || '—'}</td>
                        <td style={{ fontSize: 13 }}>{fmtMonth(entry.start) || '—'}</td>
                        <td style={{ fontSize: 13, color: entry.end ? '#f59e0b' : 'var(--muted)' }}>
                          {fmtMonth(entry.end) || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
