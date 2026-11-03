import { useEffect, useRef, useState } from 'react';
import qrImage from '../assets/codigo-qr.png';
import './CheckinPanel.css';

const extractCode = (value) => {
  const trimmed = value.trim();
  const match = trimmed.match(/[?&]checkin=([0-9a-f]+)/i);

  return match ? match[1] : trimmed;
};

export const CheckinPanel = ({ onCheckIn, initialCode, disabled }) => {
  const [value, setValue] = useState(initialCode || '');
  const autoSubmitted = useRef(false);

  useEffect(() => {
    if (initialCode && !autoSubmitted.current) {
      autoSubmitted.current = true;
      onCheckIn(initialCode);
    }
  }, [initialCode]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (await onCheckIn(extractCode(value))) {
      setValue('');
    }
  };

  return (
    <section className="view-section">
      <div className="view-heading">
        <span className="eyebrow">Control de acceso</span>
        <h2>Check-in</h2>
      </div>
      <form className="panel checkin-panel stack-form" onSubmit={handleSubmit}>
        <img className="checkin-qr-image" src={qrImage} alt="Código QR de check-in" />
        <label className="field">
          <span className="checkin-label">
            <svg className="checkin-label-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Código o enlace del QR
          </span>
          <input value={value} onChange={(event) => setValue(event.target.value)} autoComplete="off" required />
        </label>
        <button className="button button-primary" type="submit" disabled={disabled || !value.trim()}>
          Registrar asistencia
        </button>
      </form>
    </section>
  );
};
