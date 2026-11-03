import { useState } from 'react';
import { findNextReservation, formatCountdown, formatDayLabel } from '../lib/schedule.js';
import { CheckinQr } from './CheckinQr.jsx';
import './NextSession.css';

export const NextSession = ({ reservations, isMember, loadCheckinCode, onViewAll }) => {
  const [showQr, setShowQr] = useState(false);
  const next = findNextReservation(reservations);
  const kicker = isMember ? 'Tu próxima sesión' : 'Próxima sesión';

  if (!next) {
    return (
      <article className="next-session next-session-empty">
        <span className="next-session-kicker">{kicker}</span>
        <h3>Sin sesiones programadas</h3>
        <p>{isMember ? 'Reserva tu primera sesión y aparecerá aquí.' : 'No hay reservas confirmadas por delante.'}</p>
        <button className="button button-primary" type="button" onClick={onViewAll}>
          {isMember ? 'Reservar sesión' : 'Ver reservas'}
        </button>
      </article>
    );
  }

  const { reservation, start } = next;
  const counterpart = isMember ? reservation.trainer?.full_name : reservation.member?.full_name;

  return (
    <article className="next-session">
      <div className="next-session-top">
        <span className="next-session-kicker">{kicker}</span>
        <span className="next-session-countdown">{formatCountdown(start)}</span>
      </div>
      <h3 className="next-session-when">
        {formatDayLabel(start)} <span>{reservation.time_slot}</span>
      </h3>
      <p className="next-session-detail">
        <strong>{reservation.activity_type || 'Sesión'}</strong>
        {counterpart ? ` con ${counterpart}` : ''}
        {reservation.center ? ` · ${reservation.center}` : ''}
      </p>
      <div className="next-session-actions">
        {isMember ? (
          <button
            className="button button-primary"
            type="button"
            aria-expanded={showQr}
            onClick={() => setShowQr((current) => !current)}
          >
            {showQr ? 'Ocultar código QR' : 'Ver código QR'}
          </button>
        ) : null}
        <button className="button button-secondary" type="button" onClick={onViewAll}>
          Ver todas las reservas
        </button>
      </div>
      {showQr ? (
        <CheckinQr
          key={reservation.reservation_id}
          reservationId={reservation.reservation_id}
          loadCode={loadCheckinCode}
          onClose={() => setShowQr(false)}
        />
      ) : null}
    </article>
  );
};
