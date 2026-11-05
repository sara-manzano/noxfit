export const RESERVATION_STATUSES = ['Confirmada', 'Completada', 'Cancelada'];

export const buildFilterOptions = (items, accessor, knownOptions = []) => {
  const optionValues = [];

  for (const knownOption of knownOptions) {
    if (!optionValues.includes(knownOption)) {
      optionValues.push(knownOption);
    }
  }

  for (const item of items) {
    const value = accessor(item);

    if (value && !optionValues.includes(value)) {
      optionValues.push(value);
    }
  }

  return optionValues.map((option) => ({
    value: option.toLowerCase(),
    label: option,
  }));
};

export const getReservationDateTerms = (value) => {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return '';
  }

  const format = (options) => new Intl.DateTimeFormat('es-ES', options).format(date);

  return [
    date.toISOString().slice(0, 10),
    format({ day: '2-digit', month: '2-digit', year: 'numeric' }),
    format({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  ].join(' ');
};

export const countReservationsByStatus = (reservations) => {
  const countOf = (status) => reservations.filter((reservation) => reservation.status === status).length;

  return {
    upcoming: countOf('Confirmada'),
    completed: countOf('Completada'),
    cancelled: countOf('Cancelada'),
    total: reservations.length,
  };
};

export const buildReservationTabs = (counts) => [
  { value: 'confirmada', label: 'Próximas', count: counts.upcoming },
  { value: 'completada', label: 'Pasadas', count: counts.completed },
  { value: 'cancelada', label: 'Canceladas', count: counts.cancelled },
  { value: 'all', label: 'Todas', count: counts.total },
];
