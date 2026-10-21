import { useState } from 'react';
import './AuthCard.css';

const initialValues = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

export const RegisterForm = ({ onSubmit, onBack }) => {
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (values.password !== values.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setIsSubmitting(true);

    try {
      const { confirmPassword, phone, ...rest } = values;
      await onSubmit({ ...rest, ...(phone.trim() ? { phone: phone.trim() } : {}) });
    } catch (submitError) {
      setError(submitError.message);
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-card auth-card-jg">
      <div className="section-heading">
        <h2>Crear cuenta</h2>
      </div>

      {error ? <div className="banner banner-error">{error}</div> : null}

      <form className="stack-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Nombre completo</span>
          <input name="full_name" type="text" value={values.full_name} onChange={handleChange} required />
        </label>

        <label className="field">
          <span>Email</span>
          <input name="email" type="email" autoComplete="off" value={values.email} onChange={handleChange} required />
        </label>

        <label className="field">
          <span>Teléfono</span>
          <input name="phone" type="tel" value={values.phone} onChange={handleChange} />
        </label>

        <label className="field">
          <span>Contraseña</span>
          <input name="password" type="password" autoComplete="new-password" minLength={8} value={values.password} onChange={handleChange} required />
        </label>

        <label className="field">
          <span>Repetir contraseña</span>
          <input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} value={values.confirmPassword} onChange={handleChange} required />
        </label>

        <button className="button button-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Registrando...' : 'Registrarse'}
        </button>
        <button className="button button-secondary" type="button" onClick={onBack} disabled={isSubmitting}>
          Volver a iniciar sesión
        </button>
      </form>
    </section>
  );
};
