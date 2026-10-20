import { useMemo, useState } from 'react';
import './CalendarView.css';

const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const dayKey = (date) => date.toISOString().slice(0, 10);

const toKey = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : dayKey(parsed);
};

const monthLabel = (year, month) => new Intl.DateTimeFormat('es-ES', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
}).format(new Date(Date.UTC(year, month, 1)));

const statusClass = (status) => {
  if (status === 'Confirmada') {
    return 'calendar-event-confirmed';
  }

  return status === 'Completada' ? 'calendar-event-done' : 'calendar-event-cancelled';
};

export const CalendarView = ({ reservations }) => {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getUTCFullYear(), month: today.getUTCMonth() });
  const [selectedKey, setSelectedKey] = useState(dayKey(today));

  const byDay = useMemo(() => {
    const groups = {};

    for (const reservation of reservations) {
      const key = toKey(reservation.date);

      if (key) {
        (groups[key] ||= []).push(reservation);
      }
    }

    for (const items of Object.values(groups)) {
      items.sort((a, b) => (a.time_slot || '').localeCompare(b.time_slot || ''));
    }

    return groups;
  }, [reservations]);

  const cells = useMemo(() => {
    const firstDay = new Date(Date.UTC(cursor.year, cursor.month, 1));
    const offset = (firstDay.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month + 1, 0)).getUTCDate();
    const result = Array.from({ length: offset }, () => null);

    for (let day = 1; day <= daysInMonth; day += 1) {
      result.push(dayKey(new Date(Date.UTC(cursor.year, cursor.month, day))));
    }

    return result;
  }, [cursor]);

  const shiftMonth = (delta) => {
    const next = new Date(Date.UTC(cursor.year, cursor.month + delta, 1));
    setCursor({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
  };

  const selectedItems = byDay[selectedKey] || [];
  const todayKey = dayKey(today);

  return (
    <section className="view-section">
      <div className="view-heading">
        <span className="eyebrow">Agenda</span>
        <h2>Calendario de reservas</h2>
        <p>Consulta qué días tienen sesiones y pulsa un día para ver el detalle.</p>
      </div>

      <div className="calendar-layout">
        <div className="panel calendar-panel">
          <div className="calendar-toolbar">
            <button className="button button-secondary" type="button" onClick={() => shiftMonth(-1)} aria-label="Mes anterior">←</button>
            <h3>{monthLabel(cursor.year, cursor.month)}</h3>
            <button className="button button-secondary" type="button" onClick={() => shiftMonth(1)} aria-label="Mes siguiente">→</button>
          </div>

          <div className="calendar-grid">
            {weekdays.map((weekday) => (
              <span key={weekday} className="calendar-weekday">{weekday}</span>
            ))}

            {cells.map((key, index) => {
              if (!key) {
                return <span key={`empty-${index}`} className="calendar-cell calendar-cell-empty" />;
              }

              const items = byDay[key] || [];
              const classes = ['calendar-cell'];

              if (key === selectedKey) {
                classes.push('calendar-cell-selected');
              }

              if (key === todayKey) {
                classes.push('calendar-cell-today');
              }

              return (
                <button key={key} type="button" className={classes.join(' ')} onClick={() => setSelectedKey(key)}>
                  <span>{Number(key.slice(8))}</span>
                  {items.length ? <em className="calendar-badge">{items.length}</em> : null}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="panel calendar-detail">
          <span className="eyebrow">{selectedKey}</span>
          <h3>{selectedItems.length ? `${selectedItems.length} reserva(s)` : 'Sin reservas'}</h3>

          {selectedItems.length ? (
            <ul className="calendar-events">
              {selectedItems.map((reservation) => (
                <li key={reservation.reservation_id} className={`calendar-event ${statusClass(reservation.status)}`}>
                  <strong>{reservation.time_slot || 'Sin hora'}</strong>
                  <span>{reservation.activity_type || 'Reserva'}</span>
                  <small>
                    {reservation.trainer?.full_name || 'Sin trainer'} · {reservation.status}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="support-copy">No hay sesiones programadas este día.</p>
          )}
        </aside>
      </div>
    </section>
  );
};
