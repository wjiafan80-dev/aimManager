import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import Modal from '../components/common/Modal.jsx';
import { normTools, isExpired, toolUserCount, toolMonthlyNTD, personMonthlyNTD } from '../utils/calc.js';
import { ntd, toolName, uid } from '../utils/format.js';
import { ym, ymAdd12, today } from '../utils/date.js';

// ── Person Modal ──────────────────────────────────────────────────────────────
function PersonModal({ person, deptId, departments, tools, usd, onClose, onSave }) {
  const initAssignments = normTools((person?.tools) || []).map(t => ({
    id: t._assignId || uid(),
    personId: person?.id || '',
    toolId: t.toolId,
    start: t.start || '',
    end: t.end || '',
    account: t.account || '',
    revoked: t.revoked || false,
  }));

  const [form, setForm] = useState({
    name: person?.name || '',
    empId: person?.empId || '',
    deptId: deptId || '',
    status: person?.status || '在職',
  });
  const [assignments, setAssignments] = useState(initAssignments);

  const activeTools = tools.filter(t => {
    const used = assignments.filter(a => a.toolId === t.id && !a.revoked).length;
    return true;
  });

  function toggleTool(toolId) {
    const existing = assignments.find(a => a.toolId === toolId && !a.revoked);
    if (existing) {
      // Revoke
      setAssignments(prev => prev.map(a =>
        a.toolId === toolId && !a.revoked ? { ...a, revoked: true, end: ym() } : a
      ));
    } else {
      // Add
      setAssignments(prev => [...prev, {
        id: uid(), personId: person?.id || '', toolId,
        start: ym(), end: '', account: '', revoked: false,
      }]);
    }
  }

  function updateAssignment(toolId, field, value) {
    setAssignments(prev => prev.map(a =>
      a.toolId === toolId && !a.revoked ? { ...a, [field]: value } : a
    ));
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    await onSave({
      person: { ...form, id: person?.id },
      assignments,
    });
    onClose();
  }

  const activeDepts = departments.flatMap(d =>
    d.name === form.deptId || true ? [d] : []
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label className="label">姓名 *</label>
          <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className="label">員工編號</label>
          <input className="input" value={form.empId} onChange={e => setForm(f => ({ ...f, empId: e.target.value }))} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label className="label">所屬單位</label>
          <select className="input" value={form.deptId} onChange={e => setForm(f => ({ ...f, deptId: e.target.value }))}>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">狀態</label>
          <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="在職">在職</option>
            <option value="留停">留停</option>
            <option value="離職">離職</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">AI 工具授權</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tools.map(t => {
            const a = assignments.find(x => x.toolId === t.id && !x.revoked);
            const checked = !!a;
            return (
              <div key={t.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleTool(t.id)} id={`tool-${t.id}`} style={{ width: 16, height: 16 }} />
                  <label htmlFor={`tool-${t.id}`} style={{ cursor: 'pointer' }}>
                    <span className="tool-chip" style={{ background: t.color + '22', color: t.color }}>{toolName(t)}</span>
                  </label>
                  <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>
                    NT${Math.round(toolMonthlyNTD(t, usd)).toLocaleString()}/月
                  </span>
                </div>
                {checked && a && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
                    <div>
                      <label className="label" style={{ fontSize: 11 }}>帳號</label>
                      <input className="input" style={{ fontSize: 12, padding: '4px 8px' }} value={a.account} onChange={e => updateAssignment(t.id, 'account', e.target.value)} placeholder="登入帳號" />
                    </div>
                    <div>
                      <label className="label" style={{ fontSize: 11 }}>開始月份</label>
                      <input className="input" type="month" style={{ fontSize: 12, padding: '4px 8px' }} value={a.start} onChange={e => updateAssignment(t.id, 'start', e.target.value)} />
                    </div>
                    <div>
                      <label className="label" style={{ fontSize: 11 }}>到期月份</label>
                      <input className="input" type="month" style={{ fontSize: 12, padding: '4px 8px' }} value={a.end} onChange={e => updateAssignment(t.id, 'end', e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {tools.length === 0 && <span style={{ color: 'var(--muted)', fontSize: 13 }}>尚未建立任何工具</span>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 8 }}>
        <button className="btn btn-ghost" onClick={onClose}>取消</button>
        <button className="btn btn-primary" onClick={handleSave}>儲存</button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Personnel({ autoAction }) {
  const { data, isAdmin, saveDept, deleteDept, renameCenter, savePersonFull, deletePerson, permanentDeletePerson } = useApp();

  const [search, setSearch]           = useState('');
  const [collapsed, setCollapsed]     = useState({});
  const [personModal, setPersonModal] = useState(null); // { person?, deptId }
  const [deptModal, setDeptModal]     = useState(null); // 'new' | dept object
  const [deptForm, setDeptForm]       = useState({ name: '', center: '' });
  const [removedModal, setRemovedModal] = useState(false);
  const [batchModal, setBatchModal]   = useState(false);
  const [batchForm, setBatchForm]     = useState({ toolId: '', start: ym(), end: '', account: '' });
  const [batchSelected, setBatchSelected] = useState(new Set());
  const [renameCenterModal, setRenameCenterModal] = useState(null);
  const [renameCenterVal, setRenameCenterVal]     = useState('');

  if (!data) return null;
  const { departments, tools, settings } = data;
  const usd = settings.usd_to_ntd;

  // Group by center
  const centers = {};
  departments.forEach(d => {
    const c = d.center || d.name;
    if (!centers[c]) centers[c] = [];
    centers[c].push(d);
  });

  // Search results
  const searchQuery = search.trim().toLowerCase();
  const searchResults = searchQuery
    ? departments.flatMap(d =>
        (d.people || []).filter(p =>
          !p.removed &&
          (p.name.toLowerCase().includes(searchQuery) || (p.empId || '').includes(searchQuery))
        ).map(p => ({ dept: d, person: p }))
      )
    : [];

  function toggleCenter(center) {
    setCollapsed(c => ({ ...c, [center]: !c[center] }));
  }

  function openNewPerson(deptId) {
    setPersonModal({ person: null, deptId });
  }

  function openEditPerson(dept, person) {
    setPersonModal({ person, deptId: dept.id });
  }

  async function handleSavePerson(payload) {
    await savePersonFull(payload);
    setPersonModal(null);
  }

  async function handleDeletePerson(person, deptId) {
    if (!confirm(`確定移除 ${person.name}？`)) return;
    await deletePerson({ id: person.id, removedAt: today() });
  }

  // Dept modal
  function openNewDept() {
    setDeptForm({ name: '', center: Object.keys(centers)[0] || '' });
    setDeptModal('new');
  }

  function openEditDept(dept) {
    setDeptForm({ name: dept.name, center: dept.center });
    setDeptModal(dept);
  }

  async function handleSaveDept() {
    if (!deptForm.name.trim()) return;
    await saveDept({
      id: deptModal === 'new' ? undefined : deptModal.id,
      name: deptForm.name,
      center: deptForm.center,
    });
    setDeptModal(null);
  }

  // Batch assign
  async function handleBatchAssign() {
    if (!batchForm.toolId || batchSelected.size === 0) return;
    for (const personId of batchSelected) {
      const dept = departments.find(d => (d.people || []).some(p => p.id === personId));
      const person = dept?.people.find(p => p.id === personId);
      if (!person) continue;
      const existing = normTools(person.tools);
      const already = existing.find(t => t.toolId === batchForm.toolId && !t.revoked);
      if (already) continue;
      const assignments = [
        ...existing.filter(t => t.revoked || t.toolId !== batchForm.toolId),
        { id: uid(), personId, toolId: batchForm.toolId, start: batchForm.start, end: batchForm.end, account: batchForm.account, revoked: false }
      ];
      await savePersonFull({ person: { ...person, deptId: dept.id }, assignments });
    }
    setBatchModal(false);
    setBatchSelected(new Set());
  }

  // Removed list
  const removedPeople = departments.flatMap(d =>
    (d.people || []).filter(p => p.removed).map(p => ({ dept: d, person: p }))
  );

  async function restorePerson(deptId, person) {
    await savePersonFull({
      person: { ...person, deptId, removed: false, removedAt: '' },
      assignments: normTools(person.tools),
    });
  }

  // Rename center
  async function handleRenameCenter() {
    if (!renameCenterVal.trim()) return;
    await renameCenter({ oldName: renameCenterModal, newName: renameCenterVal.trim() });
    setRenameCenterModal(null);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="input"
          placeholder="搜尋姓名或員工編號…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 220 }}
        />
        {isAdmin && (
          <>
            <button className="btn btn-ghost" onClick={() => setRemovedModal(true)}>
              移除清單{removedPeople.length > 0 && <span className="badge" style={{ marginLeft: 6 }}>{removedPeople.length}</span>}
            </button>
            <button className="btn btn-ghost" onClick={() => setBatchModal(true)}>批次指派工具</button>
            <button className="btn btn-primary" onClick={openNewDept}>+ 新增單位</button>
          </>
        )}
      </div>

      {/* Search results */}
      {searchQuery && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><span className="card-title">搜尋結果（{searchResults.length} 筆）</span></div>
          <table className="table">
            <thead><tr><th>姓名</th><th>員工編號</th><th>單位</th><th>工具</th><th>月費</th>{isAdmin && <th>操作</th>}</tr></thead>
            <tbody>
              {searchResults.map(({ dept, person }) => (
                <PersonRow key={person.id} dept={dept} person={person} tools={tools} usd={usd} isAdmin={isAdmin}
                  onEdit={() => openEditPerson(dept, person)}
                  onDelete={() => handleDeletePerson(person, dept.id)}
                />
              ))}
              {searchResults.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)' }}>無符合結果</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Centers */}
      {!searchQuery && Object.entries(centers).map(([centerName, depts]) => {
        const isCollapsed = collapsed[centerName];
        const totalPeople = depts.reduce((s, d) => s + (d.people || []).filter(p => !p.removed).length, 0);
        const totalCost = depts.reduce((s, d) =>
          s + (d.people || []).filter(p => !p.removed).reduce((ss, p) => ss + personMonthlyNTD(p, tools, usd), 0), 0);

        return (
          <div key={centerName} className="card" style={{ marginBottom: 16 }}>
            <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => toggleCenter(centerName)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
                <span className="card-title">{centerName}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{totalPeople} 人・{depts.length} 單位</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>NT${Math.round(totalCost).toLocaleString()}/月</span>
                {isAdmin && (
                  <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setRenameCenterVal(centerName); setRenameCenterModal(centerName); }}>
                    重命名
                  </button>
                )}
              </div>
            </div>

            {!isCollapsed && (
              <div style={{ padding: '0 16px 16px' }}>
                {depts.map(dept => (
                  <DeptCard key={dept.id} dept={dept} tools={tools} usd={usd} isAdmin={isAdmin}
                    onEditDept={() => openEditDept(dept)}
                    onDeleteDept={() => { if (confirm(`確定刪除「${dept.name}」及其所有人員？`)) deleteDept(dept.id); }}
                    onAddPerson={() => openNewPerson(dept.id)}
                    onEditPerson={(p) => openEditPerson(dept, p)}
                    onDeletePerson={(p) => handleDeletePerson(p, dept.id)}
                  />
                ))}
                {isAdmin && (
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => { setDeptForm({ name: '', center: centerName }); setDeptModal('new'); }}>
                    + 新增單位至此中心
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Person Modal */}
      <Modal show={!!personModal} onClose={() => setPersonModal(null)} title={personModal?.person ? '編輯人員' : '新增人員'} size="lg">
        {personModal && (
          <PersonModal
            person={personModal.person}
            deptId={personModal.deptId}
            departments={departments}
            tools={tools}
            usd={usd}
            onClose={() => setPersonModal(null)}
            onSave={handleSavePerson}
          />
        )}
      </Modal>

      {/* Dept Modal */}
      <Modal show={!!deptModal} onClose={() => setDeptModal(null)} title={deptModal === 'new' ? '新增單位' : '編輯單位'} size="sm"
        footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={() => setDeptModal(null)}>取消</button>
          <button className="btn btn-primary" onClick={handleSaveDept}>儲存</button>
        </div>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="label">單位名稱</label>
            <input className="input" value={deptForm.name} onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">所屬中心</label>
            <input className="input" value={deptForm.center} onChange={e => setDeptForm(f => ({ ...f, center: e.target.value }))} list="center-list" />
            <datalist id="center-list">
              {Object.keys(centers).map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
        </div>
      </Modal>

      {/* Rename Center Modal */}
      <Modal show={!!renameCenterModal} onClose={() => setRenameCenterModal(null)} title="重命名中心" size="sm"
        footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={() => setRenameCenterModal(null)}>取消</button>
          <button className="btn btn-primary" onClick={handleRenameCenter}>儲存</button>
        </div>}
      >
        <div>
          <label className="label">新名稱</label>
          <input className="input" value={renameCenterVal} onChange={e => setRenameCenterVal(e.target.value)} />
        </div>
      </Modal>

      {/* Removed Modal */}
      <Modal show={removedModal} onClose={() => setRemovedModal(false)} title="移除清單" size="lg">
        <table className="table">
          <thead><tr><th>姓名</th><th>單位</th><th>移除日期</th><th>操作</th></tr></thead>
          <tbody>
            {removedPeople.map(({ dept, person }) => (
              <tr key={person.id}>
                <td style={{ fontWeight: 600 }}>{person.name}</td>
                <td style={{ color: 'var(--muted)' }}>{dept.name}</td>
                <td style={{ color: 'var(--muted)', fontSize: 12 }}>{person.removedAt || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => restorePerson(dept.id, person)}>復原</button>
                    <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('永久刪除？')) permanentDeletePerson({ id: person.id }); }}>永久刪除</button>
                  </div>
                </td>
              </tr>
            ))}
            {removedPeople.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)' }}>無移除人員</td></tr>}
          </tbody>
        </table>
      </Modal>

      {/* Batch Assign Modal */}
      <Modal show={batchModal} onClose={() => setBatchModal(false)} title="批次指派工具" size="lg"
        footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'center' }}>已選 {batchSelected.size} 人</span>
          <button className="btn btn-ghost" onClick={() => setBatchModal(false)}>取消</button>
          <button className="btn btn-primary" onClick={handleBatchAssign} disabled={!batchForm.toolId || batchSelected.size === 0}>指派</button>
        </div>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">工具</label>
              <select className="input" value={batchForm.toolId} onChange={e => setBatchForm(f => ({ ...f, toolId: e.target.value }))}>
                <option value="">選擇工具</option>
                {tools.map(t => <option key={t.id} value={t.id}>{toolName(t)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">開始月份</label>
              <input className="input" type="month" value={batchForm.start} onChange={e => setBatchForm(f => ({ ...f, start: e.target.value }))} />
            </div>
            <div>
              <label className="label">到期月份（可空）</label>
              <input className="input" type="month" value={batchForm.end} onChange={e => setBatchForm(f => ({ ...f, end: e.target.value }))} />
            </div>
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
            {departments.map(dept => (
              <div key={dept.id}>
                <div style={{ padding: '8px 12px', background: 'var(--bg-subtle)', fontWeight: 600, fontSize: 12, color: 'var(--muted)', position: 'sticky', top: 0 }}>
                  {dept.name}
                </div>
                {(dept.people || []).filter(p => !p.removed).map(p => (
                  <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                    <input type="checkbox"
                      checked={batchSelected.has(p.id)}
                      onChange={e => setBatchSelected(s => { const n = new Set(s); e.target.checked ? n.add(p.id) : n.delete(p.id); return n; })}
                    />
                    <span>{p.name}</span>
                    {p.empId && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{p.empId}</span>}
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Dept Card ─────────────────────────────────────────────────────────────────
function DeptCard({ dept, tools, usd, isAdmin, onEditDept, onDeleteDept, onAddPerson, onEditPerson, onDeletePerson }) {
  const [open, setOpen] = useState(true);
  const activePeople = (dept.people || []).filter(p => !p.removed);
  const totalCost = activePeople.reduce((s, p) => s + personMonthlyNTD(p, tools, usd), 0);

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{dept.name}</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{activePeople.length} 人</span>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>
          NT${Math.round(totalCost).toLocaleString()}/月
        </span>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
            <button className="btn btn-ghost btn-sm" onClick={onEditDept}>編輯</button>
            <button className="btn btn-primary btn-sm" onClick={onAddPerson}>+ 人員</button>
            <button className="btn btn-danger btn-sm" onClick={onDeleteDept}>刪除</button>
          </div>
        )}
      </div>
      {open && (
        <div style={{ padding: '0 14px 10px' }}>
          <table className="table" style={{ fontSize: 13 }}>
            <thead>
              <tr><th>姓名</th><th>狀態</th><th>工具</th><th>月費</th>{isAdmin && <th>操作</th>}</tr>
            </thead>
            <tbody>
              {activePeople.map(person => (
                <PersonRow key={person.id} dept={dept} person={person} tools={tools} usd={usd} isAdmin={isAdmin}
                  onEdit={() => onEditPerson(person)}
                  onDelete={() => onDeletePerson(person)}
                />
              ))}
              {activePeople.length === 0 && <tr><td colSpan={isAdmin ? 5 : 4} style={{ textAlign: 'center', color: 'var(--muted)' }}>無人員</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Person Row ────────────────────────────────────────────────────────────────
function PersonRow({ dept, person, tools, usd, isAdmin, onEdit, onDelete }) {
  const activeAssignments = normTools(person.tools).filter(t => !t.revoked && !isExpired(t));
  const cost = personMonthlyNTD(person, tools, usd);

  return (
    <tr>
      <td style={{ fontWeight: 600 }}>{person.name}{person.empId ? <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6 }}>{person.empId}</span> : ''}</td>
      <td>
        <span className={`badge ${person.status === '在職' ? '' : 'badge-warn'}`}>{person.status}</span>
      </td>
      <td>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {activeAssignments.map(t => {
            const tool = tools.find(x => x.id === t.toolId);
            if (!tool) return null;
            return (
              <span key={t.toolId} className="tool-chip" style={{ background: tool.color + '22', color: tool.color }}>
                {toolName(tool)}
                {t.end && <span style={{ opacity: 0.7, fontSize: 10 }}> {t.end}</span>}
              </span>
            );
          })}
          {activeAssignments.length === 0 && <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>}
        </div>
      </td>
      <td style={{ fontWeight: 600, color: cost > 0 ? 'var(--primary)' : 'var(--muted)' }}>
        {cost > 0 ? `NT$${Math.round(cost).toLocaleString()}` : '—'}
      </td>
      {isAdmin && (
        <td>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>編輯</button>
            <button className="btn btn-danger btn-sm" onClick={onDelete}>移除</button>
          </div>
        </td>
      )}
    </tr>
  );
}
