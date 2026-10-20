import { useEffect, useState } from 'react';
import gymImage from '../assets/gym.jpg';
import { MadridMap, gyms } from './MadridMap.jsx';
import { RegisterForm } from './RegisterForm.jsx';

const initialCredentials = {
  role: 'trainer',
  email: '',
  password: '',
};

const differentiators = [
  {
    title: 'Metodo personalizado',
    description: 'Combina entrenamiento con un seguimiento cercano ajustado a las necesidades individuales de cada socio. Si se desea, se hace un plan personalizado y un seguimiento nutricional.',
  },
  {
    title: 'Equipo visible',
    description: 'Los entrenadores siempre están presentes y disponibles para guiar a los socios en sus entrenamientos y resolver cualquier duda que puedan tener.',
  },
  {
    title: 'Resultados medibles',
    description: 'Los resultados de los entrenamientos se pueden medir y seguir de manera clara, permitiendo a los socios ver su progreso y ajustar sus objetivos.',
  },
];

const services = [
  'Entrenamiento personal',
  'Grupos reducidos',
  'Readaptación',
  'Recuperación de lesiones',
  'Nutrición deportiva',
];

const cityHighlights = ['Madrid'];

export const LoginForm = ({ onSubmit, onRegister }) => {
  const [credentials, setCredentials] = useState(initialCredentials);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);

  useEffect(() => {
    if (!isMapOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsMapOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMapOpen]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setCredentials((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit(credentials);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page page-auth">
      <div className="login-showcase">
        <section className="login-hero">
          <div className="hero-grid-overlay" />

          <div className="login-hero-copy">
            <span className="login-badge">Centro multidisciplinar</span>
            <h1 className="login-wordmark">NOX<span>FIT</span></h1>
            <p className="hero-lead">
              Noxfit es un centro multidisciplinar coordinado por entrenadores y orientado a ofrecer una experiencia integral a sus socios.
            </p>
            <div className="login-pills">
              <span className="metric-pill metric-pill-accent">10 entrenadores</span>
              <span className="metric-pill metric-pill-light">Horarios flexibles</span>
            </div>
          </div>

          <figure className="login-figure">
            <img src={gymImage} alt="Gimnasio Noxfit" />
            <figcaption>
              <strong>2</strong>
              <span>centros</span>
            </figcaption>
          </figure>
        </section>

        <div className="login-bento">
          <article className="bento-tile bento-why">
            <span className="bento-kicker">Por qué Noxfit</span>
            <p className="bento-intro">Un centro de entrenamiento más, pero con un ambiente familiar y atención cercana. Nuestra misión es ofrecer una experiencia integral a nuestros socios e impulsar su desarrollo personal.</p>
            <ul className="bento-differentiators">
              {differentiators.map((item, index) => (
                <li key={item.title}>
                  <span className="bento-index">0{index + 1}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="bento-tile bento-highlight">
            <strong>100%</strong>
            <span>Agenda confirmada en el momento y acceso controlado al centro.</span>
          </article>

          <article className="bento-tile bento-services">
            <span className="bento-kicker">Qué ofrecemos</span>
            <div className="service-chip-grid">
              {services.map((service) => (
                <span key={service} className="service-chip">{service}</span>
              ))}
            </div>
          </article>

          <article className="bento-tile bento-cities">
            <span className="bento-kicker">Centros destacados</span>
            <ul>
              {cityHighlights.map((city) => (
                <li key={city}>
                  <button type="button" className="city-link" onClick={() => setIsMapOpen(true)}>
                    {city}
                  </button>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>

      {isMapOpen ? (
        <div className="map-overlay" onClick={() => setIsMapOpen(false)}>
          <div
            className="map-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Centros Noxfit en la Comunidad de Madrid"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="map-dialog-header">
              <h2>Comunidad de Madrid</h2>
              <button type="button" className="map-close" aria-label="Cerrar mapa" onClick={() => setIsMapOpen(false)}>
                &times;
              </button>
            </div>
            <MadridMap />
            <ul className="map-addresses">
              {gyms.map((gym) => (
                <li key={gym.name}>
                  <strong>{gym.name}</strong>
                  <span>{gym.address}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {isRegistering ? (
        <RegisterForm onSubmit={onRegister} onBack={() => setIsRegistering(false)} />
      ) : (
      <section className="auth-card auth-card-jg">
        <div className="section-heading">
          <span className="auth-card-topline">Bienvenido</span>
          <h2>Iniciar sesión</h2>
          <p>Accede a tu cuenta para gestionar tus reservas y actividades.</p>
        </div>

        {error ? <div className="banner banner-error">{error}</div> : null}

        <form className="stack-form" onSubmit={handleSubmit}>
          <div className="role-switch" role="radiogroup" aria-label="Perfil">
            {[
              { value: 'trainer', label: 'Entrenador' },
              { value: 'member', label: 'Miembro' },
            ].map((option) => (
              <label key={option.value} className={credentials.role === option.value ? 'role-option role-option-active' : 'role-option'}>
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  checked={credentials.role === option.value}
                  onChange={handleChange}
                />
                {option.label}
              </label>
            ))}
          </div>

          <label className="field">
            <span>Email</span>
            <input name="email" type="email" value={credentials.email} onChange={handleChange} required />
          </label>

          <label className="field">
            <span>Contraseña</span>
            <input name="password" type="password" value={credentials.password} onChange={handleChange} required />
          </label>

          <button className="button button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Accediendo...' : 'Iniciar sesión'}
          </button>
          <button className="button button-secondary" type="button" onClick={() => setIsRegistering(true)}>
            Registrarme
          </button>
        </form>

        <div className="auth-support-band">
          <p className="support-copy">
            Si aún no tienes una cuenta, puedes registrarte para empezar a disfrutar de nuestros servicios.
          </p>
        </div>
      </section>
      )}
    </main>
  );
};