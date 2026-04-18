import { useState } from 'react';
import { useApp } from './context/AppContext.jsx';
import Sidebar from './components/Layout/Sidebar.jsx';
import Topbar from './components/Layout/Topbar.jsx';
import ToastContainer from './components/common/Toast.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Tools from './pages/Tools.jsx';
import Personnel from './pages/Personnel.jsx';
import Lookup from './pages/Lookup.jsx';
import Reports from './pages/Reports.jsx';
import Maturity from './pages/Maturity.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  const { data, loading, saving, dataSource, loadDemoData, loadData } = useApp();
  const [page, setPage] = useState('dashboard');
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pageAction, setPageAction] = useState(null);

  function nav(nextPage, action) {
    setPage(nextPage);
    setPageAction(action || null);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="app-layout">
      {saving && <div className="saving-bar" />}
      {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />}

      <Sidebar
        activePage={page}
        onNav={nav}
        collapsed={sideCollapsed}
        onToggle={() => setSideCollapsed((current) => !current)}
        mobileOpen={mobileOpen}
      />

      <div className="main-area">
        <Topbar
          activePage={page}
          onNav={nav}
          onMenuToggle={() => setMobileOpen((current) => !current)}
        />

        <main className="content">
          {loading && !data ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>正在載入 AI 工具資料…</p>
            </div>
          ) : !data ? (
            <div className="empty-state" style={{ gap: 12 }}>
              <p>目前無法連線到正式資料。</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={() => loadDemoData()}>
                  載入展示資料
                </button>
                <button className="btn btn-ghost" onClick={() => loadData()}>
                  再試一次
                </button>
              </div>
            </div>
          ) : (
            <>
              {dataSource === 'demo' && (
                <div
                  className="card"
                  style={{
                    marginBottom: 16,
                    padding: '12px 16px',
                    borderLeft: '4px solid #f59e0b',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 2 }}>
                      目前為展示資料模式
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      適合主管 demo，包含費用、到期、閒置與多工具使用情境。
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => loadData()}>
                    嘗試正式資料
                  </button>
                </div>
              )}

              {page === 'dashboard' && <Dashboard onNav={nav} />}
              {page === 'tools' && <Tools autoAction={pageAction} />}
              {page === 'personnel' && <Personnel autoAction={pageAction} />}
              {page === 'lookup' && <Lookup />}
              {page === 'reports' && <Reports />}
              {page === 'maturity' && <Maturity />}
              {page === 'settings' && <Settings />}
            </>
          )}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
