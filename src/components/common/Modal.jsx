export default function Modal({ show, onClose, title, children, size = 'md', footer }) {
  if (!show) return null;
  const widths = { sm: 400, md: 560, lg: 720, xl: 900 };
  return (
    <div className="overlay show" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width: widths[size] || 560, maxWidth: '95vw' }}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
