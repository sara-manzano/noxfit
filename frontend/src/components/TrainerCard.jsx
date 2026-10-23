import { formatBoolean, formatCurrency } from '../lib/formatters.js';
import { StatusPill } from './StatusPill.jsx';

export const TrainerCard = ({ trainer, onDelete, disabled }) => (
  <article className="entity-card">
    <div className="entity-card-head">
      <div>
        <p className="eyebrow">{trainer.trainer_id}</p>
        <h3>{trainer.full_name}</h3>
      </div>
      <StatusPill status={trainer.is_admin ? 'Admin' : formatBoolean(trainer.active)} />
    </div>
    <p>{trainer.email}</p>
    <div className="entity-meta">
      <span>{trainer.activity_type || 'Sin especialidad'}</span>
      <span>{trainer.center || 'Sin centro'}</span>
      <span>{formatCurrency(trainer.hourly_rate)}</span>
      <span>{trainer.years_experience || 0} años</span>
    </div>
    <div className="entity-actions">
      <button className="button button-secondary" type="button" onClick={() => onDelete(trainer.trainer_id)} disabled={disabled || trainer.is_admin}>
        Eliminar
      </button>
    </div>
  </article>
);
