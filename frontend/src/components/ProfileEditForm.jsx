import { useState } from 'react';
import './ProfileEditForm.css';

const buildInitialValues = (profile, isTrainer) => ({
  full_name: profile.full_name || '',
  email: profile.email || '',
  phone: profile.phone || '',
  ...(isTrainer ? { bio: profile.bio || '' } : {}),
});

export const ProfileEditForm = ({ profile, isTrainer, isSubmitting, onSubmit, onCancel }) => {
  const [values, setValues] = useState(() => buildInitialValues(profile, isTrainer));

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const changes = Object.fromEntries(
      Object.entries(values).filter(([name, value]) => value.trim() !== (profile[name] || '') && (value.trim() !== '' || name === 'bio'))
    );

    if (!Object.keys(changes).length) {
      onCancel();
      return;
    }

    const trimmed = Object.fromEntries(Object.entries(changes).map(([name, value]) => [name, value.trim()]));

    if (await onSubmit(trimmed)) {
      onCancel();
    }
  };

  return (
    <form className="profile-edit-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Nombre completo</span>
        <input name="full_name" type="text" value={values.full_name} onChange={handleChange} required />
      </label>
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" value={values.email} onChange={handleChange} required />
      </label>
      <label className="field">
        <span>Teléfono</span>
        <input name="phone" type="tel" value={values.phone} onChange={handleChange} />
      </label>
      {isTrainer ? (
        <label className="field">
          <span>Bio</span>
          <textarea name="bio" rows="3" value={values.bio} onChange={handleChange} />
        </label>
      ) : null}
      <div className="profile-edit-actions">
        <button className="button button-secondary" type="button" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </button>
        <button className="button button-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
};
