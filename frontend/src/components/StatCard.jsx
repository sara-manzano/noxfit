import './StatCard.css';

export const StatCard = ({ label, value, description, onClick }) => (
  <article
    className={onClick ? 'stat-card stat-card-clickable' : 'stat-card'}
    {...(onClick ? {
      role: 'button',
      tabIndex: 0,
      onClick,
      onKeyDown: (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      },
    } : {})}
  >
    <span>{label}</span>
    <strong>{value}</strong>
    <p>{description}</p>
  </article>
);
