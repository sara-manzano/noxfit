import { useRef, useState } from 'react';
import { memberFields, membershipOptions } from '../lib/forms.js';
import { formatBoolean, formatMembershipFee } from '../lib/formatters.js';
import { imageFileToAvatar } from '../lib/avatar.js';
import defaultAvatar from '../assets/default-avatar.svg';
import gymImage from '../assets/fucional.png';
import { useCollectionFilters } from '../hooks/useCollectionFilters.js';
import { useDashboardData } from '../hooks/useDashboardData.js';
import { AccountForm } from './AccountForm.jsx';
import { CollectionPanel } from './CollectionPanel.jsx';
import { MemberCard } from './MemberCard.jsx';
import { ReservationCard } from './ReservationCard.jsx';
import { ReservationForm } from './ReservationForm.jsx';
import { StatCard } from './StatCard.jsx';
import { TrainersView } from './TrainersView.jsx';
import { ServicesView } from './ServicesView.jsx';
import { CalendarView } from './CalendarView.jsx';
import { gyms } from './MadridMap.jsx';
import { TopNav } from './TopNav.jsx';
import { MemberHighlights } from './MemberHighlights.jsx';
import './AppShell.css';

const buildFilterOptions = (items, accessor, knownOptions = []) => {
  const optionValues = [];

  for (const knownOption of knownOptions) {
    if (!optionValues.includes(knownOption)) {
      optionValues.push(knownOption);
    }
  }

  for (const item of items) {
    const value = accessor(item);

    if (value && !optionValues.includes(value)) {
      optionValues.push(value);
    }
  }

  return optionValues.map((option) => ({
    value: option.toLowerCase(),
    label: option,
  }));
};

const getReservationDateTerms = (value) => {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return '';
  }

  const format = (options) => new Intl.DateTimeFormat('es-ES', options).format(date);

  return [
    date.toISOString().slice(0, 10),
    format({ day: '2-digit', month: '2-digit', year: 'numeric' }),
    format({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  ].join(' ');
};

const renderProfileLabel = (session) => {
  if (session.role === 'trainer' && session.user.is_admin) {
    return 'Entrenador admin';
  }

  return session.role === 'trainer' ? 'Entrenador' : 'Socio';
};

export const AppShell = ({ session, onLogout }) => {
  const [selectedCenter, setSelectedCenter] = useState('');
  const [activeView, setActiveView] = useState('panel');
  const [activityFilter, setActivityFilter] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const avatarInputRef = useRef(null);
  const reservationsSectionRef = useRef(null);
  const dashboard = useDashboardData(session, onLogout);
  const isAdmin = session.role === 'trainer' && session.user.is_admin;
  const isMember = session.role === 'member';
  const isStandardTrainer = session.role === 'trainer' && !session.user.is_admin;

  const visibleTrainers = dashboard.trainers.length
    ? dashboard.trainers
    : dashboard.trainerDirectory.length
      ? dashboard.trainerDirectory
      : Array.from(
      new Map(
        dashboard.reservations
          .filter((reservation) => reservation.trainer?.trainer_id)
          .map((reservation) => [reservation.trainer.trainer_id, reservation.trainer])
      ).values()
    );

  const membersFilters = useCollectionFilters(dashboard.members, {
    searchGetters: [
      (item) => item.full_name,
      (item) => item.email,
      (item) => item.membership_type,
    ],
    filterAccessor: (item) => item.membership_type,
  });

  const reservationsFilters = useCollectionFilters(dashboard.reservations, {
    searchGetters: [
      (item) => item.member?.full_name,
      (item) => getReservationDateTerms(item.date),
    ],
    filterAccessor: (item) => item.status,
  });

  const upcomingReservations = dashboard.reservations.filter((reservation) => reservation.status === 'Confirmada').length;
  const completedReservations = dashboard.reservations.filter((reservation) => reservation.status === 'Completada').length;

  const showReservationsByStatus = (status) => {
    reservationsFilters.setQuery('');
    reservationsFilters.setSelectedFilter(status.toLowerCase());
    reservationsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderMemberCards = () => {
    if (!membersFilters.visibleItems.length) {
      return <article className="empty-card">No hay socios que coincidan con el filtro actual.</article>;
    }

    return membersFilters.visibleItems.map((member) => (
      <MemberCard
        key={member.member_id}
        member={member}
        onDelete={dashboard.deleteMember}
        disabled={dashboard.isSubmitting}
      />
    ));
  };

  const renderReservationCards = () => {
    if (!reservationsFilters.visibleItems.length) {
      return <article className="empty-card reservation-empty">No hay reservas que coincidan con el filtro actual.</article>;
    }

    const sortedReservations = [...reservationsFilters.visibleItems].sort((a, b) => (
      new Date(a.date) - new Date(b.date) || (a.time_slot || '').localeCompare(b.time_slot || '')
    ));

    return sortedReservations.map((reservation) => (
      <ReservationCard
        key={reservation.reservation_id}
        reservation={reservation}
        memberFallbackName={isMember ? dashboard.profile?.full_name : undefined}
        onDelete={dashboard.deleteReservation}
        canDelete={!isStandardTrainer}
        disabled={dashboard.isSubmitting}
      />
    ));
  };

  const renderMembersPanel = () => (
    <CollectionPanel
      title="Socios"
      description="Usuarios finales con su plan, alta y estado de cuenta."
      query={membersFilters.query}
      onQueryChange={membersFilters.setQuery}
      selectedFilter={membersFilters.selectedFilter}
      onFilterChange={membersFilters.setSelectedFilter}
      filterLabel="Plan"
      filterOptions={membershipOptions.map((option) => ({ value: option.toLowerCase(), label: option }))}
      countLabel={`${membersFilters.visibleCount} de ${membersFilters.totalCount}`}
      form={
        <AccountForm
          title="Alta de socio"
          fields={memberFields}
          onSubmit={dashboard.createMember}
          isSubmitting={dashboard.isSubmitting}
        />
      }
    >
      {renderMemberCards()}
    </CollectionPanel>
  );

  const renderReservationsPanel = () => (
    <CollectionPanel
      title={isMember ? 'Mis reservas' : 'Reservas'}
      query={reservationsFilters.query}
      onQueryChange={reservationsFilters.setQuery}
      searchPlaceholder="Filtra por socio o día (ej. 15/03, lunes)"
      selectedFilter={reservationsFilters.selectedFilter}
      onFilterChange={reservationsFilters.setSelectedFilter}
      filterLabel="Estado"
      filterOptions={buildFilterOptions(dashboard.reservations, (item) => item.status, ['Confirmada', 'Completada', 'Cancelada'])}
      countLabel={`${reservationsFilters.visibleCount} de ${reservationsFilters.totalCount}`}
      form={
        <ReservationForm
          onSubmit={dashboard.createReservation}
          loadAvailability={dashboard.getTrainerAvailability}
          reservationsVersion={dashboard.reservations}
          isSubmitting={dashboard.isSubmitting}
          trainers={dashboard.trainerDirectory}
          members={dashboard.memberDirectory}
          isAdmin={isAdmin}
          isStandardTrainer={isStandardTrainer}
          currentTrainer={dashboard.profile}
          center={selectedCenter}
          onCenterChange={setSelectedCenter}
        />
      }
    >
      {renderReservationCards()}
    </CollectionPanel>
  );

  const handleAvatarSelected = async (event) => {
    const [file] = event.target.files;
    event.target.value = '';

    if (!file) {
      return;
    }

    setAvatarError('');

    try {
      await dashboard.updateAvatar(await imageFileToAvatar(file));
    } catch (avatarProcessingError) {
      setAvatarError(avatarProcessingError.message);
    }
  };

  const renderPanelView = () => (
    <>
      <section className="brand-hero brand-hero-dashboard">
        <div className="hero-grid-overlay" />

        <div className="hero-copy hero-copy-dashboard">
          <div className="eyebrow eyebrow-accent">NOXFIT</div>
          <MemberHighlights
            highlights={dashboard.highlights}
            canEdit={session.role === 'trainer'}
            onSave={dashboard.updateHighlights}
            disabled={dashboard.isSubmitting}
          />
        </div>

        <div className="dashboard-side-stack">
          <div className="profile-card profile-card-jg">
            <div className="profile-card-header">
              <img
                className="profile-avatar"
                src={dashboard.profile?.avatar || defaultAvatar}
                alt="Foto de perfil"
              />
              <div className="profile-card-identity">
                <h2>{dashboard.profile?.full_name || session.user.full_name}</h2>
                <p>{dashboard.profile?.email || session.user.email}</p>
              </div>
            </div>
            {session.role === 'member' && dashboard.profile ? (
              <dl className="profile-details">
                <div>
                  <dt>Plan</dt>
                  <dd>{dashboard.profile.membership_type || 'Sin plan'}</dd>
                </div>
                <div>
                  <dt>Cuota</dt>
                  <dd>{formatMembershipFee(dashboard.profile.membership_type)}</dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd>{formatBoolean(dashboard.profile.active)}</dd>
                </div>
              </dl>
            ) : null}
            {session.role === 'trainer' && dashboard.profile ? (
              <dl className="profile-details">
                <div>
                  <dt>Especialidad</dt>
                  <dd>{dashboard.profile.activity_type || 'Sin especialidad'}</dd>
                </div>
                <div>
                  <dt>Centro</dt>
                  <dd>{dashboard.profile.center || 'Sin centro'}</dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd>{dashboard.profile.is_admin ? 'Admin' : formatBoolean(dashboard.profile.active)}</dd>
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
              <button
                className="button button-secondary"
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={dashboard.isSubmitting || !dashboard.profile}
              >
                Cambiar foto
              </button>
              {dashboard.profile?.avatar ? (
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => dashboard.updateAvatar(null)}
                  disabled={dashboard.isSubmitting}
                >
                  Quitar foto
                </button>
              ) : null}
              <button className="button button-secondary" type="button" onClick={dashboard.refreshData} disabled={dashboard.isLoading}>
                Actualizar
              </button>
            </div>
            {avatarError ? <div className="banner banner-error" role="alert">{avatarError}</div> : null}
          </div>
        </div>
      </section>

      <section className="stats-grid stats-grid-jg stats-grid-member">
        <div className="stat-card stat-card-image">
          <img src={gymImage} alt="Gimnasio Noxfit" />
        </div>
        <div className="stat-stack">
          <StatCard
            label="Reservas activas"
            value={upcomingReservations}
            description="Confirmadas en agenda"
            onClick={() => showReservationsByStatus('Confirmada')}
          />
          <StatCard
            label="Completadas"
            value={completedReservations}
            description="Histórico operativo"
            onClick={() => showReservationsByStatus('Completada')}
          />
        </div>
      </section>

      {isMember ? (
        <section className="dashboard-overview">
          <div className="footprint-grid">
            {gyms.map((gym) => {
              const isSelected = selectedCenter === gym.name;

              return (
                <button
                  key={gym.name}
                  type="button"
                  className={isSelected ? 'footprint-card footprint-card-selected' : 'footprint-card'}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedCenter(isSelected ? '' : gym.name)}
                >
                  <span className="eyebrow">{isSelected ? 'Centro elegido' : 'Centro de entrenamiento'}</span>
                  <h3>{gym.name}</h3>
                  <p>{gym.address}</p>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {!dashboard.isLoading ? <div ref={reservationsSectionRef}>{renderReservationsPanel()}</div> : null}
    </>
  );

  const handleNavChange = (view) => {
    setActivityFilter('');
    setActiveView(view);
  };

  const handleSelectService = (serviceName) => {
    setActivityFilter(serviceName);
    setActiveView('trainers');
  };

  const renderView = () => {
    if (activeView === 'members' && isAdmin) {
      return renderMembersPanel();
    }

    if (activeView === 'trainers' && !isStandardTrainer) {
      return <TrainersView trainers={visibleTrainers} activityFilter={activityFilter} onClearFilter={() => setActivityFilter('')} />;
    }

    if (activeView === 'services' && isMember) {
      return <ServicesView trainers={visibleTrainers} onSelect={handleSelectService} />;
    }

    if (activeView === 'calendar') {
      return (
        <CalendarView
          reservations={dashboard.reservations}
          onMove={isMember ? undefined : dashboard.moveReservation}
          disabled={dashboard.isSubmitting}
        />
      );
    }

    return renderPanelView();
  };

  return (
    <>
      <TopNav
        activeView={activeView}
        onChange={handleNavChange}
        showMembers={isAdmin}
        showTrainers={!isStandardTrainer}
        showServices={isMember}
        userName={dashboard.profile?.full_name || session.user.full_name}
        roleLabel={renderProfileLabel(session)}
        onLogout={onLogout}
      />

      <main className="page page-with-nav">
        {dashboard.error ? <div className="banner banner-error">{dashboard.error}</div> : null}
        {dashboard.notice ? <div className="banner banner-success">{dashboard.notice}</div> : null}
        {dashboard.isLoading ? <div className="loading-card">Cargando datos...</div> : renderView()}
        <footer className="app-legal-footer">
          <a href="#privacidad">Política de privacidad</a>
          <a href="#terminos">Términos y condiciones</a>
          <a href="#cookies">Política de cookies</a>
        </footer>
      </main>
    </>
  );
};