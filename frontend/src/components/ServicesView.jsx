import './ServicesView.css';

const catalog = [
  { name: 'Entrenamiento Funcional', description: 'Sesiones adaptadas a tu nivel para ganar fuerza, movilidad y resistencia.' },
  { name: 'Musculación', description: 'Planes de fuerza guiados por un entrenador que corrige técnica y progresión.' },
  { name: 'CrossFit', description: 'Entrenamiento de alta intensidad con trabajo variado y supervisado.' },
  { name: 'Spinning', description: 'Clases de ciclo indoor para mejorar capacidad cardiovascular.' },
  { name: 'Pilates', description: 'Fuerza, flexibilidad y equilibrio con foco en el control del cuerpo.' },
];

const normalize = (value = '') => value.trim().toLowerCase();

export const ServicesView = ({ trainers, reservations }) => {
  const services = catalog.map((service) => {
    const key = normalize(service.name);

    return {
      ...service,
      trainerCount: trainers.filter((trainer) => normalize(trainer.activity_type) === key).length,
      reservationCount: reservations.filter((reservation) => normalize(reservation.activity_type) === key).length,
    };
  });

  return (
    <section className="view-section">
      <div className="view-heading">
        <span className="eyebrow">Qué ofrecemos</span>
        <h2>Servicios</h2>
        <p>Actividades disponibles, con los entrenadores que las imparten y las reservas registradas.</p>
      </div>

      <div className="service-grid">
        {services.map((service, index) => (
          <article key={service.name} className="service-card">
            <span className="service-index">{String(index + 1).padStart(2, '0')}</span>
            <h3>{service.name}</h3>
            <p>{service.description}</p>
            <div className="service-stats">
              <span>{service.trainerCount} entrenadores</span>
              <span>{service.reservationCount} reservas</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
