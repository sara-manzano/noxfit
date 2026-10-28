import { useEffect, useState } from 'react';
import gymImage from '../assets/Gym.png';
import { MadridMap, gyms } from './MadridMap.jsx';
import { RegisterForm } from './RegisterForm.jsx';
import { PasswordResetForm } from './PasswordResetForm.jsx';
import { plans } from '../lib/plans.js';
import './AuthCard.css';
import './LoginForm.css';

const initialCredentials = {
  role: 'member',
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

const contact = {
  phone: '+34 910 000 000',
  email: 'info@noxfit.es',
  instagram: 'https://www.instagram.com/noxfit',
};

export const LoginForm = ({ onSubmit, onRegister }) => {
  const [credentials, setCredentials] = useState(initialCredentials);
  const [resetParams, setResetParams] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset');
    return token ? { token, role: params.get('role') === 'trainer' ? 'trainer' : 'member' } : null;
  });
  const [isRecovering, setIsRecovering] = useState(Boolean(resetParams));
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  const handleRecoveryBack = () => {
    if (resetParams) {
      window.history.replaceState(null, '', window.location.pathname);
      setResetParams(null);
    }
    setIsRecovering(false);
  };

  return (
    <main className="page page-auth">
      <div className="login-showcase">
        <section className="login-hero">
          <div className="hero-grid-overlay" />

          <div className="login-hero-copy">
            <span className="login-badge">Centro multidisciplinar</span>
            <h1 className="login-wordmark">NOXFIT</h1>
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
              <strong>Dos</strong>
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
            <strong>100% </strong>
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

          <article className="bento-tile bento-footer">
            <span className="bento-kicker">Horario</span>
            <p>Todos los días de 7:00 a 20:00</p>
          </article>

          <article className="bento-tile bento-plans">
            <span className="bento-kicker">Planes</span>
            <ul className="plan-list">
              {plans.map((plan) => (
                <li key={plan.slug} className={plan.featured ? 'plan-item plan-item-featured' : 'plan-item'}>
                  <a href={`#${plan.slug}`}>
                    {plan.featured ? <em className="plan-badge">Recomendado</em> : null}
                    <strong>{plan.name} · {plan.priceLabel}</strong>
                    <span>{plan.summary}</span>
                    <span className="plan-more">Qué incluye →</span>
                  </a>
                </li>
              ))}
            </ul>
            <button type="button" className="button button-primary" onClick={() => setIsRegistering(true)}>
              Empieza ahora
            </button>
          </article>
        </div>

        <footer className="login-footer">
          <div>
            <h3>Contacto</h3>
            <a href={`tel:${contact.phone.replace(/\s/g, '')}`}>{contact.phone}</a>
            <a href={`mailto:${contact.email}`}>{contact.email}</a>
            <a href={contact.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>
          </div>
          <div>
            <h3>Centros</h3>
            {gyms.map((gym) => (
              <span key={gym.name}>{gym.address}</span>
            ))}
          </div>
          <div>
            <h3>Legal</h3>
            <a href="#privacidad">Política de privacidad</a>
            <a href="#terminos">Términos y condiciones</a>
            <a href="#cookies">Política de cookies</a>
          </div>
          <p className="login-footer-copy">© {new Date().getFullYear()} Noxfit. Todos los derechos reservados.</p>
        </footer>
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

      {isRecovering ? (
        <PasswordResetForm
          role={resetParams?.role || credentials.role}
          resetToken={resetParams?.token}
          onBack={handleRecoveryBack}
        />
      ) : isRegistering ? (
        <RegisterForm onSubmit={onRegister} onBack={() => setIsRegistering(false)} />
      ) : (
      <section className="auth-card auth-card-jg">
        <div className="section-heading">
          <span className="auth-card-topline">Bienvenido</span>
          <h2>Iniciar sesión</h2>
          <p>Accede a tu cuenta para gestionar tus reservas</p>
        </div>

        {error ? <div className="banner banner-error" role="alert">{error}</div> : null}

        <form className="stack-form" onSubmit={handleSubmit}>
          <div className="role-switch" role="radiogroup" aria-label="Perfil">
            {[
              { value: 'trainer', label: 'Entrenador' },
              { value: 'member', label: 'Socio' },
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
            <input name="email" type="email" autoComplete="username" autoFocus value={credentials.email} onChange={handleChange} required />
          </label>

          <label className="field">
            <span>Contraseña</span>
            <div className="password-wrap">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={credentials.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </label>

          <button type="button" className="forgot-link" onClick={() => setIsRecovering(true)}>
            ¿Has olvidado tu contraseña?
          </button>

          <button className="button button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Accediendo...' : 'Iniciar sesión'}
          </button>
          <button className="button button-secondary" type="button" onClick={() => setIsRegistering(true)}>
            Registrarse
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