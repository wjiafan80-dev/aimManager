import { useState } from 'react';
import { Radar } from 'react-chartjs-2';
import { Chart, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { useApp } from '../context/AppContext.jsx';
import Modal from '../components/common/Modal.jsx';
import { toolUserCount, activePeopleCount } from '../utils/calc.js';

Chart.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const DIMS = [
  { key: 'training', label: '培訓' },
  { key: 'process',  label: '流程' },
  { key: 'tracking', label: '追蹤' },
  { key: 'support',  label: '高層支持' },
];

const LEVEL_LABELS = ['', '1 初探', '2 嘗試', '3 推廣', '4 深化', '5 卓越'];

function toolingScore(dept, tools, departments) {
  const total = (dept.people || []).filter(p => !p.removed).length;
  if (!total) return 1;
  const aiUsers = (dept.people || []).filter(p =>
    !p.removed && (p.tools || []).some(t => !t.revoked)
  ).length;
  return Math.min(5, Math.max(1, Math.ceil((aiUsers / total) * 5)));
}

export default function Maturity() {
  const { data, isAdmin, saveMaturity } = useApp();
  const [editDept, setEditDept] = useState(null);
  const [form, setForm] = useState({});

  if (!data) return null;
  const { departments, maturity } = data;

  function openEdit(dept) {
    setEditDept(dept);
    const m = maturity[dept.id] || {};
    setForm({ training: m.training || 1, process: m.process || 1, tracking: m.tracking || 1, support: m.support || 1 });
  }

  async function handleSave() {
    await saveMaturity({ deptId: editDept.id, ...form });
    setEditDept(null);
  }

  function avgScore(dept) {
    const m = maturity[dept.id];
    if (!m) return 1;
    const tooling = toolingScore(dept, data.tools, departments);
    return ((tooling + (m.training || 1) + (m.process || 1) + (m.tracking || 1) + (m.support || 1)) / 5).toFixed(1);
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <span className="card-title">各單位 AI 成熟度評估</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>5 維度・1-5 分</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>單位</th>
              <th>中心</th>
              <th>配備率</th>
              {DIMS.map(d => <th key={d.key}>{d.label}</th>)}
              <th>平均</th>
              {isAdmin && <th>操作</th>}
            </tr>
          </thead>
          <tbody>
            {departments.map(dept => {
              const m = maturity[dept.id] || {};
              const tooling = toolingScore(dept, data.tools, departments);
              return (
                <tr key={dept.id}>
                  <td style={{ fontWeight: 600 }}>{dept.name}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{dept.center}</td>
                  <td><ScoreBadge score={tooling} /></td>
                  {DIMS.map(d => <td key={d.key}><ScoreBadge score={m[d.key] || 1} /></td>)}
                  <td style={{ fontWeight: 700 }}>{avgScore(dept)}</td>
                  {isAdmin && (
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(dept)}>編輯</button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        show={!!editDept}
        onClose={() => setEditDept(null)}
        title={`成熟度評估 — ${editDept?.name}`}
        size="md"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setEditDept(null)}>取消</button>
            <button className="btn btn-primary" onClick={handleSave}>儲存</button>
          </div>
        }
      >
        {editDept && (
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ flex: 1 }}>
              {DIMS.map(d => (
                <div key={d.key} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label className="label" style={{ marginBottom: 0 }}>{d.label}</label>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{LEVEL_LABELS[form[d.key] || 1]}</span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="1"
                    value={form[d.key] || 1}
                    onChange={e => setForm(f => ({ ...f, [d.key]: parseInt(e.target.value) }))}
                    style={{ width: '100%' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
                    <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ width: 180 }}>
              <Radar
                data={{
                  labels: ['配備率', ...DIMS.map(d => d.label)],
                  datasets: [{
                    label: editDept.name,
                    data: [
                      toolingScore(editDept, data.tools, departments),
                      form.training || 1, form.process || 1,
                      form.tracking || 1, form.support || 1,
                    ],
                    fill: true,
                    backgroundColor: '#6366f133',
                    borderColor: '#6366f1',
                    pointBackgroundColor: '#6366f1',
                  }],
                }}
                options={{
                  scales: { r: { min: 0, max: 5, ticks: { stepSize: 1, font: { size: 10 } } } },
                  plugins: { legend: { display: false } },
                }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ScoreBadge({ score }) {
  const colors = ['', '#ef4444', '#f59e0b', '#10b981', '#6366f1', '#8b5cf6'];
  return (
    <span style={{
      display: 'inline-block', width: 28, height: 28, lineHeight: '28px',
      textAlign: 'center', borderRadius: '50%', fontSize: 13, fontWeight: 700,
      background: (colors[score] || '#6366f1') + '22', color: colors[score] || '#6366f1',
    }}>
      {score}
    </span>
  );
}
