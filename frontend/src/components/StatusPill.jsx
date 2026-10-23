const POSITIVE_STATUSES = ['Confirmada', 'Activo'];
const NEUTRAL_STATUSES = ['Completada', 'Admin'];

const toneClass = (value) => {
  if (POSITIVE_STATUSES.includes(value)) {
    return 'status-positive';
  }

  return NEUTRAL_STATUSES.includes(value) ? 'status-neutral' : 'status-warning';
};

export const StatusPill = ({ status }) => (
  <span className={`status-pill ${toneClass(status)}`}>{status}</span>
);
