import { formatDate } from '../lib/formatters.js';
import './ReservationActions.css';
import './WaitlistPanel.css';

export const WaitlistPanel = ({ entries, canLeave, onLeave, disabled }) => {
  if (!entries.length) {
    return null;
  }

  return (
    <section className="panel waitlist-panel">
      <div className="section-heading section-heading-tight">
        <h3>Lista de espera</h3>
        <p>Si se libera una plaza, la reserva se confirma sola y te avisamos por email.</p>
      </div>
      <ul className="waitlist-list">
        {entries.map((entry) => (
          <li key={entry.waitlist_id} className="waitlist-item">
            <div>
              <strong>{entry.activity_type || 'Sesión'}</strong>
              <span>
                {formatDate(entry.date)} · {entry.time_slot} · {entry.trainer?.full_name || 'Sin entrenador'}
                {entry.member?.full_name ? ` · ${entry.member.full_name}` : ''}
              </span>
            </div>
            <span className="metric-pill metric-pill-light">Puesto {entry.position}</span>
            {canLeave ? (
              <button className="reservation-action" type="button" onClick={() => onLeave(entry.waitlist_id)} disabled={disabled}>
                Salir
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
};
