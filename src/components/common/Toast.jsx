import { useApp } from '../../context/AppContext.jsx';

export default function ToastContainer() {
  const { toasts } = useApp();
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type === 'ok' ? 'ok' : t.type === 'err' ? 'err' : ''}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
