import { useApp } from '../../context/AppContext.jsx';

export default function SaveBtn({ onClick, children = '儲存', className = 'btn btn-primary', disabled = false, style }) {
  const { saving } = useApp();
  const busy = saving || disabled;
  return (
    <button className={className} onClick={onClick} disabled={busy} style={style}>
      {saving
        ? <><span className="spinner-sm" style={{ marginRight: 6 }} />儲存中…</>
        : children}
    </button>
  );
}
