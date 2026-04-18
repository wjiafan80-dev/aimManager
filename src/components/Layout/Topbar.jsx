import { useApp } from '../../context/AppContext.jsx';

const PAGE_TITLES = {
  dashboard: '儀表板',
  tools: 'AI 工具管理',
  personnel: '人員管理',
  lookup: '帳號查詢',
  reports: '費用報表',
  maturity: 'AI 成熟度評估',
  settings: '設定',
};

export default function Topbar({ activePage, onNav, actions, onMenuToggle }) {
  const { isAdmin, logout, loadData, loadDemoData, loading, dataSource } = useApp();

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-ghost btn-icon sb-mobile-toggle" onClick={onMenuToggle}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <h1 className="page-title">{PAGE_TITLES[activePage]}</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {actions}

        <button
          className={`btn btn-sm ${dataSource === 'demo' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => loadDemoData()}
          title="切換為展示資料"
        >
          展示資料
        </button>

        <button
          className="btn btn-ghost btn-icon"
          onClick={() => loadData()}
          disabled={loading}
          title="重新整理"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, animation: loading ? 'spin 1s linear infinite' : 'none' }}>
            <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>

        {isAdmin ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>
              <span style={{ marginRight: 4 }}>⬤</span>管理員
            </span>
            <button className="btn btn-ghost btn-sm" onClick={logout}>登出</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>唯讀模式</span>
            <button className="btn btn-primary btn-sm" onClick={() => onNav('settings')}>
              管理員登入
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
