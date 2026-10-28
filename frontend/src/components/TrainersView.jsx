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

const nutritionActivity = 'nutrición';

const funEmojis = ['💪', '⚡', '🏆', '🎯', '🥇', '😎'];

const bioByFirstName = {
  alberto: 'Prioriza la calidad del movimiento antes que la carga. Diseña circuitos funcionales progresivos que mejoran la movilidad y la resistencia sin pasar por alto la técnica.',
  natalia: 'Especialista en control postural y estabilidad del core. Sus sesiones de Pilates combinan precisión y respiración para aliviar tensiones y fortalecer desde la base.',
  javier: 'Enfoca la musculación como un proceso medible. Planifica cada bloque de trabajo, ajusta cargas semana a semana y se asegura de que la técnica sea siempre sólida.',
  arturo: 'Su método en CrossFit se basa en la constancia y la escalabilidad: el mismo entrenamiento, adaptado al nivel de cada persona, con un ambiente exigente pero cercano.',
  aida: 'Trabaja el entrenamiento funcional desde lo cotidiano: patrones de movimiento útiles para el día a día, con ejercicios variados y un trato muy cercano en cada sesión.',
  maria: 'Imparte un Pilates pausado y detallista, pensado para ganar flexibilidad y conciencia corporal. Acompaña tanto a quien empieza como a quien busca perfeccionar su práctica.',
  samuel: 'Referente en fuerza e hipertrofia. Analiza el punto de partida de cada socio y construye rutinas a largo plazo con objetivos claros y una progresión bien documentada.',
  pablo: 'Orienta el CrossFit hacia el rendimiento sostenible. Combina halterofilia, gimnásticos y trabajo metabólico con una supervisión constante para entrenar fuerte y sin lesiones.',
  oscar: 'Dirige sus clases de Spinning como una sesión de intervalos medida al detalle. Juega con ritmo, resistencia y música para mejorar la capacidad cardiovascular de forma progresiva.',
  susana: 'Su Spinning mezcla energía y estructura: sesiones dinámicas, con distintos niveles de intensidad, pensadas para quemar calorías y ganar fondo sin perder la motivación.',
};

const describeTrainer = (trainer) => {
  const bio = bioByFirstName[(trainer.full_name || '').trim().split(' ')[0].toLowerCase()];

  if (bio) return bio;

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
    ? trainers.filter((trainer) => normalizedFilter === nutritionActivity
      || (trainer.activity_type || '').trim().toLowerCase() === normalizedFilter)
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
              {(trainer.activity_type || '').trim().toLowerCase() === nutritionActivity ? null : (
                <span className="metric-pill metric-pill-light">{emojiByActivity[nutritionActivity]} Nutrición</span>
              )}
              <span className="trainer-center">📍 {trainer.center || 'Sin centro'}</span>
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
