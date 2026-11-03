import { useState } from 'react';
import { timeSlotOptions } from '../lib/forms.js';
import { CheckinQr } from './CheckinQr.jsx';
import { ConfirmDialog } from './ConfirmDialog.jsx';
import './ReservationActions.css';

const todayInputValue = () => new Date().toISOString().slice(0, 10);

export const ReservationActions = ({
  reservation,
  canCancel,
  canReschedule,
  canDelete,
  showQr,
  onCancel,
  onReschedule,
  onDelete,
  loadCheckinCode,
  disabled,
}) => {
  const [panel, setPanel] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [values, setValues] = useState({ date: '', time_slot: '' });
  const isConfirmed = reservation.status === 'Confirmada';
  const primary = isConfirmed ? (showQr ? 'qr' : canReschedule ? 'reschedule' : null) : null;
  const hasMore = (isConfirmed && (canCancel || (canReschedule && primary !== 'reschedule'))) || canDelete;

  if (!primary && !hasMore) {
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

  const confirmations = {
    cancel: {
      title: 'Cancelar reserva',
      message: 'Se liberará la plaza y, si usaste un bono, se te devolverá la sesión cuando corresponda.',
      confirmLabel: 'Cancelar reserva',
      run: () => onCancel(reservation.reservation_id),
    },
    delete: {
      title: 'Eliminar reserva',
      message: 'La reserva se borrará de forma permanente.',
      confirmLabel: 'Eliminar',
      run: () => onDelete(reservation.reservation_id),
    },
  };
  const activeConfirmation = confirming ? confirmations[confirming] : null;

  const handleConfirm = () => {
    activeConfirmation.run();
    setConfirming(null);
  };

  return (
    <div className="reservation-actions">
      {activeConfirmation ? (
        <ConfirmDialog
          title={activeConfirmation.title}
          message={activeConfirmation.message}
          confirmLabel={activeConfirmation.confirmLabel}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(null)}
        />
      ) : null}
      <div className="reservation-actions-row">
        {primary ? (
          <button
            className="reservation-action reservation-action-primary"
            type="button"
            onClick={() => togglePanel(primary)}
            aria-expanded={panel === primary}
            disabled={primary === 'reschedule' && disabled}
          >
            {primary === 'qr' ? 'Código QR' : 'Reprogramar'}
          </button>
        ) : null}
        {hasMore ? (
          <button
            className="reservation-action reservation-action-more"
            type="button"
            aria-label="Más acciones"
            onClick={() => togglePanel('more')}
            aria-expanded={panel === 'more'}
          >
            ⋯
          </button>
        ) : null}
      </div>

      {panel === 'more' ? (
        <div className="reservation-actions-row reservation-actions-secondary">
          {isConfirmed && canReschedule && primary !== 'reschedule' ? (
            <button className="reservation-action" type="button" onClick={() => togglePanel('reschedule')} disabled={disabled}>
              Reprogramar
            </button>
          ) : null}
          {isConfirmed && canCancel ? (
            <button className="reservation-action reservation-action-danger" type="button" onClick={() => setConfirming('cancel')} disabled={disabled}>
              Cancelar reserva
            </button>
          ) : null}
          {canDelete ? (
            <button className="reservation-action reservation-action-danger" type="button" onClick={() => setConfirming('delete')} disabled={disabled}>
              Eliminar
            </button>
          ) : null}
        </div>
      ) : null}

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
