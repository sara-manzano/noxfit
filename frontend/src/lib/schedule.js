const MINUTES_PER_DAY = 24 * 60;

export const getReservationStart = (reservation) => {
  const date = reservation.date ? new Date(reservation.date) : null;
  const startTime = (reservation.time_slot || '').split(' - ')[0];

  if (!date || Number.isNaN(date.getTime()) || !/^\d{2}:\d{2}$/.test(startTime)) {
    return null;
  }

  const [year, month, day] = date.toISOString().slice(0, 10).split('-').map(Number);
  const [hours, minutes] = startTime.split(':').map(Number);

  return new Date(year, month - 1, day, hours, minutes);
};

export const findNextReservation = (reservations, now = new Date()) => {
  const upcoming = reservations
    .filter((reservation) => reservation.status === 'Confirmada')
    .map((reservation) => ({ reservation, start: getReservationStart(reservation) }))
    .filter(({ start }) => start && start > now)
    .sort((a, b) => a.start - b.start);

  return upcoming[0] || null;
};

export const formatCountdown = (start, now = new Date()) => {
  const minutes = Math.max(0, Math.round((start - now) / 60000));

  if (minutes < 60) {
    return `En ${minutes} min`;
  }

  if (minutes < MINUTES_PER_DAY) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;

    return rest ? `En ${hours} h ${rest} min` : `En ${hours} h`;
  }

  const days = Math.floor(minutes / MINUTES_PER_DAY);

  return `En ${days} ${days === 1 ? 'día' : 'días'}`;
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const startOfWeek = (date) => {
  const day = startOfDay(date);
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));

  return day;
};

export const formatDayLabel = (start, now = new Date()) => {
  const diffDays = Math.round((startOfDay(start) - startOfDay(now)) / (MINUTES_PER_DAY * 60000));

  if (diffDays === 0) {
    return 'Hoy';
  }

  if (diffDays === 1) {
    return 'Mañana';
  }

  return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(start);
};

export const getWeekLabel = (start, now = new Date()) => {
  if (!start) {
    return 'Sin fecha';
  }

  const monday = startOfWeek(start);
  const diffWeeks = Math.round((monday - startOfWeek(now)) / (7 * MINUTES_PER_DAY * 60000));

  if (diffWeeks === 0) {
    return 'Esta semana';
  }

  if (diffWeeks === 1) {
    return 'Próxima semana';
  }

  return `Semana del ${new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' }).format(monday)}`;
};
