import { useEffect, useState } from 'react';
import gymImage from '../assets/Gym.png';
import { useAsyncAction } from '../hooks/useAsyncAction.js';
import { useEscapeKey } from '../hooks/useEscapeKey.js';
import { MadridMap, gyms } from './MadridMap.jsx';
import { MediaSlot } from './MediaSlot.jsx';
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
    title: 'Entrena a tu manera',
    description: 'Tu entrenador adapta cada sesión a tu objetivo y a tu ritmo. ¿Quieres ir un paso más allá? Suma un plan personalizado y seguimiento nutricional.',
  },
  {
    title: 'Siempre con tu entrenador',
    description: 'Aquí nadie entrena solo. Tu equipo está en sala para corregirte, motivarte y resolver cualquier duda al momento.',
  },
  {
    title: 'Progreso que se ve',
    description: 'Mide tu evolución sesión a sesión, celebra cada avance y ponte la siguiente meta.',
  },
];

const services = [
  'Entrenamiento personal',
  'Grupos reducidos',
  'Readaptación',
  'Recuperación de lesiones',
  'Nutrición deportiva',
];

const highlightChecks = [
  'Código QR de acceso',
  'Aviso 24 h antes de cada sesión',
  'Lista de espera automática',
];

const cityHighlights = ['Madrid'];

const contact = {
  phone: '',
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
  const [isRegistering, setIsRegistering] = useState(
    () => new URLSearchParams(window.location.search).get('register') === '1'
  );
  const { error, isPending: isSubmitting, run } = useAsyncAction();
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('register') === '1') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  useEscapeKey(() => setIsMapOpen(false), isMapOpen);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setCredentials((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    return run(() => onSubmit(credentials));
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
              Entrena con 10 entrenadores que te empujan a más. Reserva tu sesión, llega y dalo todo.
            </p>
            <div className="login-pills">
              <span className="metric-pill metric-pill-accent">10 entrenadores</span>
              <span className="metric-pill metric-pill-light">Horarios flexibles</span>
            </div>
          </div>

          <figure className="login-figure">
            <MediaSlot
              name="hero"
              kind="video"
              autoPlay
              alt="Entrenamiento en Noxfit"
              fallback={<img src={gymImage} alt="Gimnasio Noxfit" />}
            />
            <figcaption>
              <strong>Dos</strong>
              <span>centros</span>
            </figcaption>
          </figure>
        </section>

        <div className="login-bento">
          <article className="bento-tile bento-why">
            <span className="bento-kicker">Por qué Noxfit</span>
            <p className="bento-intro">Un ambiente cercano, entrenadores que te conocen por tu nombre y sesiones pensadas para que cada día llegues un poco más lejos.</p>
            <MediaSlot
              name="why"
              kind="image"
              alt="Entrenamiento funcional en Noxfit"
              label="Foto del equipo"
              className="bento-media"
            />
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
            <span>Reserva confirmada al instante y acceso con tu código QR.</span>
            <ul className="bento-checks">
              {highlightChecks.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>

          <article className="bento-tile bento-services">
            <span className="bento-kicker">Qué ofrecemos</span>
            <p className="bento-note">Elige tu sesión, personal o en grupo, y entrena con el especialista que mejor encaja contigo.</p>
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
                    <strong className="plan-name">{plan.name}</strong>
                    <span className="plan-price">{plan.price} €<small>/mes</small></span>
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
            {contact.phone && <a href={`tel:${contact.phone.replace(/\s/g, '')}`}>{contact.phone}</a>}
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
            <input name="email" type="email" placeholder="tu@email.com" autoComplete="username" autoFocus value={credentials.email} onChange={handleChange} required />
          </label>

          <label className="field">
            <span>Contraseña</span>
            <div className="password-wrap">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Tu contraseña"
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
      </section>
      )}
    </main>
  );
};