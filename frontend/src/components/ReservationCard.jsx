import { formatCurrency } from '../lib/formatters.js';
import { StatusPill } from './StatusPill.jsx';

const getDateParts = (value) => {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return { day: '--', month: 'Sin fecha', weekday: '' };
  }

  return {
    day: new Intl.DateTimeFormat('es-ES', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('es-ES', { month: 'short', year: 'numeric' }).format(date),
    weekday: new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(date),
  };
};

export const ReservationCard = ({ reservation, memberFallbackName, onDelete, canDelete, disabled }) => {
  const { day, month, weekday } = getDateParts(reservation.date);

  return (
    <article className="entity-card entity-card-wide reservation-card">
      <div className="reservation-stub">
        <span className="reservation-weekday">{weekday}</span>
        <strong className="reservation-day">{day}</strong>
        <span className="reservation-month">{month}</span>
      </div>
      <div className="reservation-body">
        <div className="reservation-top">
          <span className="reservation-time">{reservation.time_slot || 'Sin hora'}</span>
          <StatusPill status={reservation.status} />
        </div>
        <h3>{reservation.activity_type || 'Reserva sin actividad'}</h3>
        <p className="reservation-people">
          con <strong>{reservation.trainer?.full_name || 'Sin entrenador'}</strong>
          {' · '}
          {reservation.member?.full_name || memberFallbackName || 'Sin socio'}
        </p>
        <div className="reservation-chips">
          <span>{reservation.center || 'Sin centro'}</span>
          <span>Tarifa {formatCurrency(reservation.trainer?.hourly_rate)}/h</span>
          <span>Reservada por {reservation.booked_by === 'trainer' ? 'entrenador' : 'socio'}</span>
          <span>{reservation.reservation_id}</span>
        </div>
        <div className="reservation-bottom">
          <span className="reservation-price">{formatCurrency(reservation.price)}</span>
          {canDelete ? (
            <button className="reservation-delete" type="button" onClick={() => onDelete(reservation.reservation_id)} disabled={disabled}>
              Eliminar
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
};
