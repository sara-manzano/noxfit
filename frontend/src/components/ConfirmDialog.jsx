import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './ConfirmDialog.css';

export const ConfirmDialog = ({ title, message, confirmLabel, onConfirm, onCancel }) => {
  const cancelRef = useRef(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return createPortal(
    <div className="confirm-overlay" onClick={onCancel}>
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button ref={cancelRef} className="button button-secondary" type="button" onClick={onCancel}>
            Volver
          </button>
          <button className="button confirm-danger" type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
