import { useRef, useState } from 'react';
import defaultAvatar from '../assets/default-avatar.svg';
import { imageFileToAvatar } from '../lib/avatar.js';
import { ProfileEditForm } from './ProfileEditForm.jsx';
import { ProfilePlan } from './ProfilePlan.jsx';
import './ProfileCard.css';

export const ProfileCard = ({
  session,
  profile,
  isSubmitting,
  onUpdateAvatar,
  onUpdateProfile,
  onManagePlan,
  onSessionExpired,
}) => {
  const [avatarError, setAvatarError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const avatarInputRef = useRef(null);
  const isTrainer = session.role === 'trainer';
  const fullName = profile?.full_name || session.user.full_name;
  const email = profile?.email || session.user.email;

  const handleAvatarSelected = async (event) => {
    const [file] = event.target.files;
    event.target.value = '';

    if (!file) {
      return;
    }

    setAvatarError('');

    try {
      await onUpdateAvatar(await imageFileToAvatar(file));
    } catch (avatarProcessingError) {
      setAvatarError(avatarProcessingError.message);
    }
  };

  return (
    <div className="profile-card profile-card-jg">
      <div className="profile-card-header">
        <button
          className="profile-avatar-button"
          type="button"
          aria-label="Cambiar foto de perfil"
          onClick={() => avatarInputRef.current?.click()}
          disabled={isSubmitting || !profile}
        >
          <img className="profile-avatar" src={profile?.avatar || defaultAvatar} alt="Foto de perfil" />
          <span className="profile-avatar-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
          </span>
        </button>
        <div className="profile-card-identity">
          <h2>{fullName}</h2>
          <p title={email}>{email}</p>
        </div>
      </div>
      {!isTrainer && profile ? (
        <ProfilePlan
          membershipType={profile.membership_type}
          sessionCredits={profile.session_credits}
          session={session}
          onManage={onManagePlan}
          onSessionExpired={onSessionExpired}
        />
      ) : null}
      {isTrainer && profile ? (
        <dl className="profile-details">
          <div>
            <dt>Especialidad</dt>
            <dd>{profile.activity_type || 'Sin especialidad'}</dd>
          </div>
          <div>
            <dt>Centro</dt>
            <dd>{profile.center || 'Sin centro'}</dd>
          </div>
        </dl>
      ) : null}
      <div className="profile-actions">
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={handleAvatarSelected}
        />
        {profile?.avatar ? (
          <button
            className="button button-secondary"
            type="button"
            onClick={() => onUpdateAvatar(null)}
            disabled={isSubmitting}
          >
            Quitar foto
          </button>
        ) : null}
        <button
          className="button button-secondary"
          type="button"
          onClick={() => setIsEditing((editing) => !editing)}
          disabled={!profile}
        >
          {isEditing ? 'Cerrar' : 'Actualizar'}
        </button>
      </div>
      {isEditing && profile ? (
        <ProfileEditForm
          profile={profile}
          isTrainer={isTrainer}
          isSubmitting={isSubmitting}
          onSubmit={onUpdateProfile}
          onCancel={() => setIsEditing(false)}
        />
      ) : null}
      {avatarError ? <div className="banner banner-error" role="alert">{avatarError}</div> : null}
    </div>
  );
};
