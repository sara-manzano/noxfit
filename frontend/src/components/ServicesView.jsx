import './ServicesView.css';

const catalog = [
  { name: 'Entrenamiento Funcional', description: 'Sesiones adaptadas a tu nivel para ganar fuerza, movilidad y resistencia.' },
  { name: 'Musculación', description: 'Planes de fuerza guiados por un entrenador que corrige técnica y progresión.' },
  { name: 'CrossFit', description: 'Entrenamiento de alta intensidad con trabajo variado y supervisado.' },
  { name: 'Spinning', description: 'Clases de ciclo indoor para mejorar capacidad cardiovascular.' },
  { name: 'Pilates', description: 'Fuerza, flexibilidad y equilibrio con foco en el control del cuerpo.' },
  { name: 'Nutrición', description: 'Asesoramiento y planes de alimentación personalizados para apoyar tus objetivos.', price: { amount: '10,99 €', period: '/ mes' } },
];

const normalize = (value = '') => value.trim().toLowerCase();

export const ServicesView = ({ trainers, onSelect }) => {
  const services = catalog.map((service) => {
    const key = normalize(service.name);

    return {
      ...service,
      trainerNames: trainers
        .filter((trainer) => normalize(trainer.activity_type) === key)
        .map((trainer) => trainer.full_name),
    };
  });

  return (
    <section className="view-section">
      <div className="view-heading">
        <span className="eyebrow">Qué ofrecemos</span>
        <h2>Servicios</h2>
      </div>

      <div className="svc-list">
        {services.map((service) => (
          <article key={service.name} className={`svc-row${service.price ? ' svc-row-premium' : ''}`}>
            <div className="svc-main">
              <h3>{service.name}</h3>
              <p>{service.description}</p>
              {service.price && (
                <strong className="svc-price">
                  {service.price.amount}
                  <span>{service.price.period}</span>
                </strong>
              )}
            </div>

            {service.price ? null : (
              <div className="svc-trainers">
                <span className="svc-label">Imparten</span>
                {service.trainerNames.length ? (
                  service.trainerNames.map((name) => <span key={name}>{name}</span>)
                ) : (
                  <span className="svc-empty">Sin asignar</span>
                )}
              </div>
            )}

            <button className="button button-primary svc-select" type="button" onClick={() => onSelect(service.name)}>
              Seleccionar
            </button>
          </article>
        ))}
      </div>
    </section>
  );
};
