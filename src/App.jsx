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
  const { data, loading } = useApp();
  const [page, setPage]             = useState('dashboard');
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen]       = useState(false);
  const [pageAction, setPageAction]       = useState(null);

  function nav(p, action) {
    setPage(p);
    setPageAction(action || null);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="app-layout">
      {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />}

      <Sidebar
        activePage={page}
        onNav={nav}
        collapsed={sideCollapsed}
        onToggle={() => setSideCollapsed(c => !c)}
        mobileOpen={mobileOpen}
      />

      <div className="main-area">
        <Topbar activePage={page} onNav={nav} onMenuToggle={() => setMobileOpen(o => !o)} />

        <main className="content">
          {loading && !data ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>載入資料中…</p>
            </div>
          ) : !data ? (
            <div className="empty-state">
              <p>無法連線至伺服器，請確認 GAS 網址設定。</p>
            </div>
          ) : (
            <>
              {page === 'dashboard'  && <Dashboard onNav={nav} />}
              {page === 'tools'      && <Tools autoAction={pageAction} />}
              {page === 'personnel'  && <Personnel autoAction={pageAction} />}
              {page === 'lookup'     && <Lookup />}
              {page === 'reports'    && <Reports />}
              {page === 'maturity'   && <Maturity />}
              {page === 'settings'   && <Settings />}
            </>
          )}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
