import { formatCurrency } from '../lib/formatters.js';
import './TrainersView.css';

const initialsOf = (name = '') => name
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0].toUpperCase())
  .join('');

const womenNames = new Set(['natalia', 'aida', 'maria', 'maría', 'susana']);

const isWoman = (name = '') => womenNames.has(name.trim().split(' ')[0].toLowerCase());

const focusByActivity = {
  'nutrición': 'diseña planes de alimentación personalizados para apoyar tus objetivos',
  'pilates': 'trabaja la fuerza, la flexibilidad y el control del cuerpo',
  'musculación': 'guía tus planes de fuerza corrigiendo técnica y progresión',
  'crossfit': 'dirige entrenamientos de alta intensidad con trabajo variado',
  'spinning': 'conduce clases de ciclo indoor para mejorar tu capacidad cardiovascular',
  'entrenamiento funcional': 'adapta las sesiones a tu nivel para ganar fuerza, movilidad y resistencia',
};

const emojiByActivity = {
  'nutrición': '🥑',
  'pilates': '🧘',
  'musculación': '🏋️',
  'crossfit': '🔥',
  'spinning': '🚴',
  'entrenamiento funcional': '🤸',
};

const funEmojis = ['💪', '⚡', '🏆', '🎯', '🥇', '😎'];

const describeTrainer = (trainer) => {
  const activity = (trainer.activity_type || '').trim();
  const focus = focusByActivity[activity.toLowerCase()] || 'te acompaña para alcanzar tus objetivos';
  const years = Number(trainer.years_experience) || 0;
  const experience = years > 0 ? ` con ${years} ${years === 1 ? 'año' : 'años'} de experiencia` : '';

  return `${trainer.full_name} ${focus}${experience}.`;
};

const cardTones = (trainers) => {
  let men = 0;

  return trainers.map((trainer) => {
    if (isWoman(trainer.full_name)) return 'trainer-card-woman';
    return men++ % 2 === 0 ? 'trainer-card-black' : 'trainer-card-gray';
  });
};

export const TrainersView = ({ trainers, activityFilter = '', onClearFilter }) => {
  const normalizedFilter = activityFilter.trim().toLowerCase();
  const shownTrainers = normalizedFilter
    ? trainers.filter((trainer) => (trainer.activity_type || '').trim().toLowerCase() === normalizedFilter)
    : trainers;
  const tones = cardTones(shownTrainers);

  return (
    <section className="view-section">
      <div className="view-heading">
        <span className="eyebrow">Equipo titulado</span>
        <h2>Entrenadores</h2>
        {activityFilter ? (
          <button className="button button-secondary trainers-show-all" type="button" onClick={onClearFilter}>
            Ver todos
          </button>
        ) : null}
      </div>

      {shownTrainers.length ? (
        <div className="trainer-grid">
          {shownTrainers.map((trainer, index) => (
            <article key={trainer.trainer_id} className={`trainer-card ${tones[index]}`}>
              <div className="trainer-avatar">
                {trainer.avatar
                  ? <img src={trainer.avatar} alt={trainer.full_name} />
                  : initialsOf(trainer.full_name)}
              </div>
              <h3>{trainer.full_name} <span aria-hidden="true">{funEmojis[index % funEmojis.length]}</span></h3>
              <span className="metric-pill metric-pill-accent">
                {emojiByActivity[(trainer.activity_type || '').trim().toLowerCase()] || '🏅'} {trainer.activity_type || 'Sin especialidad'}
              </span>
              <p className="trainer-bio">{describeTrainer(trainer)}</p>
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
};
