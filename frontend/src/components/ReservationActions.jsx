import { useState } from 'react';
import { timeSlotOptions } from '../lib/forms.js';
import { CheckinQr } from './CheckinQr.jsx';
import './ReservationActions.css';

const todayInputValue = () => new Date().toISOString().slice(0, 10);

export const ReservationActions = ({
  reservation,
  canCancel,
  canReschedule,
  showQr,
  onCancel,
  onReschedule,
  loadCheckinCode,
  disabled,
}) => {
  const [panel, setPanel] = useState(null);
  const [values, setValues] = useState({ date: '', time_slot: '' });

  if (reservation.status !== 'Confirmada') {
    return null;
  }

  const togglePanel = (name) => setPanel((current) => (current === name ? null : name));

  const handleReschedule = async (event) => {
    event.preventDefault();

    const payload = Object.fromEntries(Object.entries(values).filter(([, value]) => value));

    if (await onReschedule(reservation.reservation_id, payload)) {
      setPanel(null);
      setValues({ date: '', time_slot: '' });
    }
  };

  const handleCancel = () => {
    if (window.confirm('¿Seguro que quieres cancelar esta reserva?')) {
      onCancel(reservation.reservation_id);
    }
  };

  return (
    <div className="reservation-actions">
      <div className="reservation-actions-row">
        {showQr ? (
          <button className="reservation-action" type="button" onClick={() => togglePanel('qr')} aria-expanded={panel === 'qr'}>
            Código QR
          </button>
        ) : null}
        {canReschedule ? (
          <button className="reservation-action" type="button" onClick={() => togglePanel('reschedule')} aria-expanded={panel === 'reschedule'} disabled={disabled}>
            Reprogramar
          </button>
        ) : null}
        {canCancel ? (
          <button className="reservation-action reservation-action-danger" type="button" onClick={handleCancel} disabled={disabled}>
            Cancelar
          </button>
        ) : null}
      </div>

      {panel === 'qr' ? (
        <CheckinQr
          reservationId={reservation.reservation_id}
          loadCode={loadCheckinCode}
          onClose={() => setPanel(null)}
        />
      ) : null}

      {panel === 'reschedule' ? (
        <form className="reservation-reschedule" onSubmit={handleReschedule}>
          <label className="field">
            <span>Nueva fecha</span>
            <input
              type="date"
              min={todayInputValue()}
              value={values.date}
              onChange={(event) => setValues((current) => ({ ...current, date: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Nueva franja</span>
            <select
              value={values.time_slot}
              onChange={(event) => setValues((current) => ({ ...current, time_slot: event.target.value }))}
            >
              <option value="">Misma franja</option>
              {timeSlotOptions.map((slot) => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
          </label>
          <button
            className="button button-primary"
            type="submit"
            disabled={disabled || (!values.date && !values.time_slot)}
          >
            Guardar cambio
          </button>
        </form>
      ) : null}
    </div>
  );
};
