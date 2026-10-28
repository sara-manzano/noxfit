export const StatCard = ({ label, value, description, onClick }) => (
  <article
    className="stat-card"
    style={onClick ? { cursor: 'pointer' } : undefined}
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
