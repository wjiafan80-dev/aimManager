import { useApp } from '../../context/AppContext.jsx';
import { seatCostNTD } from '../../utils/calc.js';

const NAV = [
  { page: 'dashboard', label: '儀表板', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
  { page: 'tools', label: 'AI 工具管理', icon: 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z' },
  { page: 'personnel', label: '人員管理', icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' },
  { page: 'lookup', label: '帳號查詢', icon: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z' },
  { page: 'reports', label: '費用報表', icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z' },
  { page: 'settings', label: '設定', icon: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z' },
];

export default function Sidebar({ activePage, onNav, collapsed, onToggle }) {
  const { data } = useApp();

  const monthlyTotal = data
    ? seatCostNTD('monthly', data.tools, data.departments, data.settings.usd_to_ntd)
    : 0;

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sb-logo">
        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 24, height: 24, flexShrink: 0 }}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
        </svg>
        {!collapsed && <span>AI 工具管理</span>}
        <button className="sb-toggle" onClick={onToggle} title="收合側欄">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      <nav className="sb-nav">
        {NAV.map(item => (
          <button
            key={item.page}
            className={`nav-item ${activePage === item.page ? 'active' : ''}`}
            onClick={() => onNav(item.page)}
            title={collapsed ? item.label : ''}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18, flexShrink: 0 }}>
              <path d={item.icon} />
            </svg>
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {!collapsed && data && (
        <div className="sb-footer">
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>目前每月費用</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary)' }}>
            NT${Math.round(monthlyTotal).toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            匯率 1 USD = {data.settings.usd_to_ntd} NTD
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
            v2.1.3
          </div>
        </div>
      )}
    </aside>
  );
}
