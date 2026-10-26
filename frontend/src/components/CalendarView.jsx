import { useMemo, useState } from 'react';
import { timeSlotOptions } from '../lib/forms.js';
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

export const CalendarView = ({ reservations, onMove, disabled = false }) => {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getUTCFullYear(), month: today.getUTCMonth() });
  const [selectedKey, setSelectedKey] = useState(dayKey(today));
  const [dragged, setDragged] = useState(null);
  const [dropKey, setDropKey] = useState('');
  const [dropSlot, setDropSlot] = useState('');

  const canDrag = (reservation) => Boolean(onMove) && !disabled && reservation.status === 'Confirmada';

  const endDrag = () => {
    setDragged(null);
    setDropKey('');
    setDropSlot('');
  };

  const dragProps = (reservation) => ({
    draggable: canDrag(reservation),
    onDragStart: (event) => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', reservation.reservation_id);
      setDragged(reservation);
    },
    onDragEnd: endDrag,
  });

  const eventClass = (reservation) => (
    `${statusClass(reservation.status)}${canDrag(reservation) ? ' calendar-event-draggable' : ''}`
  );

  const allowDrop = (event, onOver) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    onOver();
  };

  const handleDrop = (event, key) => {
    event.preventDefault();

    if (dragged && key !== toKey(dragged.date)) {
      onMove(dragged.reservation_id, { date: key });
      setSelectedKey(key);
    }

    endDrag();
  };

  const handleSlotDrop = (event, slot) => {
    event.preventDefault();

    if (dragged && slot !== dragged.time_slot) {
      onMove(dragged.reservation_id, { time_slot: slot });
    }

    endDrag();
  };

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
        <h2>Calendario</h2>
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

              if (dragged && key === dropKey) {
                classes.push('calendar-cell-drop');
              }

              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  className={classes.join(' ')}
                  onClick={() => setSelectedKey(key)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedKey(key);
                    }
                  }}
                  onDragOver={dragged ? (event) => allowDrop(event, () => setDropKey(key)) : undefined}
                  onDrop={dragged ? (event) => handleDrop(event, key) : undefined}
                >
                  <span>{Number(key.slice(8))}</span>
                  {items.slice(0, 2).map((reservation) => (
                    <span
                      key={reservation.reservation_id}
                      className={`calendar-chip ${eventClass(reservation)}`}
                      {...dragProps(reservation)}
                    >
                      {(reservation.time_slot || '').slice(0, 5)} {reservation.activity_type}
                    </span>
                  ))}
                  {items.length > 2 ? <em className="calendar-badge">+{items.length - 2}</em> : null}
                </div>
              );
            })}
          </div>
        </div>

        <aside className="panel calendar-detail">
          <span className="eyebrow">{selectedKey}</span>
          <h3>{selectedItems.length ? `${selectedItems.length} reserva(s)` : 'Sin reservas'}</h3>

          {dragged ? (
            <div className="calendar-slots">
              <small>Suelta aquí para cambiar el horario ({toKey(dragged.date)})</small>
              {timeSlotOptions.map((slot) => (
                <div
                  key={slot}
                  className={`calendar-slot${slot === dropSlot ? ' calendar-slot-drop' : ''}${slot === dragged.time_slot ? ' calendar-slot-current' : ''}`}
                  onDragOver={(event) => allowDrop(event, () => setDropSlot(slot))}
                  onDragLeave={() => setDropSlot('')}
                  onDrop={(event) => handleSlotDrop(event, slot)}
                >
                  {slot}
                </div>
              ))}
            </div>
          ) : null}

          {selectedItems.length ? (
            <ul className="calendar-events">
              {selectedItems.map((reservation) => (
                <li
                  key={reservation.reservation_id}
                  className={`calendar-event ${eventClass(reservation)}`}
                  {...dragProps(reservation)}
                >
                  <strong>{reservation.time_slot || 'Sin hora'}</strong>
                  <span>{reservation.activity_type || 'Reserva'}</span>
                  <small>
                    {reservation.trainer?.full_name || 'Sin entrenador'} · {reservation.status}
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
