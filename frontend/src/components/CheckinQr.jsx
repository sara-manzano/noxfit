import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { formatDateTime } from '../lib/formatters.js';
import './ReservationActions.css';

export const buildCheckinUrl = (code) => `${window.location.origin}/?checkin=${code}`;

export const CheckinQr = ({ reservationId, loadCode, onClose }) => {
  const [qr, setQr] = useState(null);
  const [validUntil, setValidUntil] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    loadCode(reservationId)
      .then(async ({ code, valid_until: until }) => {
        const image = await QRCode.toDataURL(buildCheckinUrl(code), { margin: 1, width: 240 });

        if (!cancelled) {
          setQr(image);
          setValidUntil(until);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError.message || 'código invalido');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reservationId]);

  return (
    <div className="checkin-qr">
      {error ? <p className="checkin-qr-error" role="alert">{error}</p> : null}
      {!error && !qr ? <p>Generando código...</p> : null}
      {qr ? (
        <>
          <img src={qr} alt="Código QR de check-in" width="240" height="240" />
          <p>Enséñaselo a tu entrenador al llegar.{validUntil ? ` Válido hasta ${formatDateTime(validUntil)}.` : ''}</p>
        </>
      ) : null}
      <button className="reservation-action" type="button" onClick={onClose}>Cerrar</button>
    </div>
  );
};
