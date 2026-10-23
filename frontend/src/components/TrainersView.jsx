import { formatCurrency } from '../lib/formatters.js';
import './TrainersView.css';

const initialsOf = (name = '') => name
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0].toUpperCase())
  .join('');

export const TrainersView = ({ trainers, isPartial }) => (
  <section className="view-section">
    <div className="view-heading">
      <span className="eyebrow">Equipo titulado</span>
      <h2>Entrenadores</h2>
      <p>
        {isPartial
          ? 'Entrenadores del centro. Experiencia y tarifa solo están disponibles para el entrenador admin.'
          : 'Profesionales del centro con su especialidad, experiencia y tarifa.'}
      </p>
    </div>

    {trainers.length ? (
      <div className="trainer-grid">
        {trainers.map((trainer) => (
          <article key={trainer.trainer_id} className="trainer-card">
            <div className="trainer-avatar">{initialsOf(trainer.full_name)}</div>
            <h3>{trainer.full_name}</h3>
            <span className="metric-pill metric-pill-accent">{trainer.activity_type || 'Sin especialidad'}</span>
            <span className="metric-pill trainer-center">{trainer.center || 'Sin centro'}</span>
            {trainer.years_experience !== undefined || trainer.hourly_rate !== undefined ? (
              <dl className="trainer-facts">
                <div>
                  <dt>Experiencia</dt>
                  <dd>{trainer.years_experience ?? 0} años</dd>
                </div>
                <div>
                  <dt>Tarifa</dt>
                  <dd>{formatCurrency(trainer.hourly_rate)}/h</dd>
                </div>
              </dl>
            ) : null}
          </article>
        ))}
      </div>
    ) : (
      <article className="empty-card">Todavía no hay entrenadores que mostrar.</article>
    )}
  </section>
);
