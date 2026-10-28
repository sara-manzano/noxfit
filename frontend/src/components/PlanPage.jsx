import { plans } from '../lib/plans.js';
import './PlanPage.css';

export const PlanPage = ({ slug, onBack }) => {
  const plan = plans.find((item) => item.slug === slug);

  return (
    <main className={`page plan-page plan-tone-${plan.tone}`}>
      <button className="button button-secondary plan-back" type="button" onClick={onBack}>
        &larr; Volver
      </button>

      <section className="plan-hero">
        <div className="hero-grid-overlay" />
        <span className="plan-badge-top">{plan.badge}</span>
        {plan.featured ? <span className="plan-ribbon">Recomendado</span> : null}

        <div className="plan-hero-copy">
          <span className="plan-kicker">Plan</span>
          <h1 className="plan-wordmark">{plan.name}</h1>
          <p className="plan-tagline">{plan.tagline}</p>
          <div className="plan-level" aria-label={`Nivel ${plan.level} de ${plans.length}`}>
            {plans.map((item) => (
              <span key={item.slug} className={item.level <= plan.level ? 'plan-level-dot plan-level-dot-on' : 'plan-level-dot'} />
            ))}
            <em>Nivel {plan.level} de {plans.length}</em>
          </div>
        </div>

        <div className="plan-sticker">
          <strong>{plan.price}</strong>
          <span>€ / mes</span>
        </div>
      </section>

      <section className="plan-section">
        <h2>Qué incluye</h2>
        <ul className="plan-tiles">
          {plan.features.map((feature, index) => (
            <li key={feature} className="plan-tile" style={{ '--i': index }}>
              <p>{feature}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="plan-ideal">
        <span className="plan-ideal-label">Ideal para</span>
        <p>{plan.idealFor}</p>
      </section>

      <section className="plan-section">
        <h2>Compara con otros planes</h2>
        <nav className="plan-others" aria-label="Otros planes">
          {plans.filter((item) => item.slug !== slug).map((item) => (
            <a
              key={item.slug}
              href={`#${item.slug}`}
              className={`plan-other plan-other-${item.tone}`}
            >
              <span className="plan-other-badge">{item.featured ? 'Recomendado' : item.badge}</span>
              <strong>{item.name}</strong>
              <span>{item.priceLabel}</span>
              <span className="plan-other-go">Ver plan &rarr;</span>
            </a>
          ))}
        </nav>
      </section>
    </main>
  );
};
