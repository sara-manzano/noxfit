export const StatCard = ({ label, value, description }) => (
  <article className="stat-card">
    <span>{label}</span>
    <strong>{value}</strong>
    <p>{description}</p>
  </article>
);
