import { useState } from 'react';
import { authApi } from '../api/client.js';
import './AuthCard.css';

export const PasswordResetForm = ({ role: initialRole, resetToken, onBack }) => {
  const [role, setRole] = useState(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isResetting = Boolean(resetToken);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (isResetting && password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isResetting) {
        await authApi.resetPassword({ role, token: resetToken, password });
        setMessage('Contraseña actualizada. Ya puedes iniciar sesión.');
      } else {
        await authApi.forgotPassword({ role, email });
        setMessage('Si la cuenta existe, te hemos enviado un enlace para restablecer la contraseña.');
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-card auth-card-jg">
      <div className="section-heading">
        <h2>{isResetting ? 'Nueva contraseña' : 'Recuperar contraseña'}</h2>
        {isResetting ? null : <p>Te enviaremos un enlace al email de tu cuenta.</p>}
      </div>

      {error ? <div className="banner banner-error" role="alert">{error}</div> : null}
      {message ? <div className="banner banner-success" role="status">{message}</div> : null}

      {message && isResetting ? null : (
        <form className="stack-form" onSubmit={handleSubmit}>
          {isResetting ? null : (
            <>
              <div className="role-switch" role="radiogroup" aria-label="Perfil">
                {[
                  { value: 'trainer', label: 'Entrenador' },
                  { value: 'member', label: 'Socio' },
                ].map((option) => (
                  <label key={option.value} className={role === option.value ? 'role-option role-option-active' : 'role-option'}>
                    <input type="radio" name="role" value={option.value} checked={role === option.value} onChange={(event) => setRole(event.target.value)} />
                    {option.label}
                  </label>
                ))}
              </div>

              <label className="field">
                <span>Email</span>
                <input type="email" autoComplete="username" autoFocus value={email} onChange={(event) => setEmail(event.target.value)} required />
              </label>
            </>
          )}

          {isResetting ? (
            <>
              <label className="field">
                <span>Nueva contraseña</span>
                <input type="password" autoComplete="new-password" autoFocus minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
              </label>
              <label className="field">
                <span>Repetir contraseña</span>
                <input type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
              </label>
            </>
          ) : null}

          <button className="button button-primary" type="submit" disabled={isSubmitting}>
            {isResetting ? 'Guardar contraseña' : 'Enviar enlace'}
          </button>
          <button className="button button-secondary" type="button" onClick={onBack} disabled={isSubmitting}>
            Volver a iniciar sesión
          </button>
        </form>
      )}

      {message && isResetting ? (
        <button className="button button-primary" type="button" onClick={onBack}>
          Ir a iniciar sesión
        </button>
      ) : null}
    </section>
  );
};
