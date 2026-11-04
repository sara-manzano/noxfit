import { Fragment, useEffect, useRef, useState } from 'react';
import { memberFields, membershipOptions } from '../lib/forms.js';
import { imageFileToAvatar } from '../lib/avatar.js';
import defaultAvatar from '../assets/default-avatar.svg';
import { useCollectionFilters } from '../hooks/useCollectionFilters.js';
import { useDashboardData } from '../hooks/useDashboardData.js';
import { AccountForm } from './AccountForm.jsx';
import { CollectionPanel } from './CollectionPanel.jsx';
import { MemberCard } from './MemberCard.jsx';
import { ReservationCard } from './ReservationCard.jsx';
import { ReservationForm } from './ReservationForm.jsx';
import { StatCard } from './StatCard.jsx';
import { ProfilePlan } from './ProfilePlan.jsx';
import { MediaSlot } from './MediaSlot.jsx';
import { NextSession } from './NextSession.jsx';
import { getReservationStart, getWeekLabel } from '../lib/schedule.js';
import { centerMediaName } from '../lib/media.js';
import { TrainersView } from './TrainersView.jsx';
import { ServicesView } from './ServicesView.jsx';
import { CalendarView } from './CalendarView.jsx';
import { gyms } from './MadridMap.jsx';
import { TopNav } from './TopNav.jsx';
import { MemberHighlights } from './MemberHighlights.jsx';
import { WaitlistPanel } from './WaitlistPanel.jsx';
import { CheckinPanel } from './CheckinPanel.jsx';
import { BillingView } from './BillingView.jsx';
import { MemberInvoiceDialog } from './MemberInvoiceDialog.jsx';
import { InvoicesView } from './InvoicesView.jsx';
import './AppShell.css';

const MEMBERS_PAGE_SIZE = 4;
const RESERVATIONS_PAGE_SIZE = 4;
const LAUNCH_PARAMS = ['checkin', 'billing'];

const readLaunchParams = () => {
  const params = new URLSearchParams(window.location.search);

  return { checkin: params.get('checkin') || '', billing: params.get('billing') || '' };
};

const clearLaunchParams = () => {
  const params = new URLSearchParams(window.location.search);

  if (!LAUNCH_PARAMS.some((name) => params.has(name))) {
    return;
  }

  LAUNCH_PARAMS.forEach((name) => params.delete(name));
  const search = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`);
};

const getInitialView = (session, launch) => {
  if (session.role === 'trainer' && launch.checkin) {
    return 'checkin';
  }

  return session.role === 'member' && launch.billing ? 'billing' : 'panel';
};

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
  const [launch] = useState(readLaunchParams);
  const [activeView, setActiveView] = useState(() => getInitialView(session, launch));
  const [activityFilter, setActivityFilter] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [invoiceMember, setInvoiceMember] = useState(null);
  const [memberLimit, setMemberLimit] = useState(MEMBERS_PAGE_SIZE);
  const [reservationLimit, setReservationLimit] = useState(RESERVATIONS_PAGE_SIZE);
  const avatarInputRef = useRef(null);
  const dashboard = useDashboardData(session, onLogout);
  const isAdmin = session.role === 'trainer' && session.user.is_admin;
  const isMember = session.role === 'member';
  const isStandardTrainer = session.role === 'trainer' && !session.user.is_admin;

  useEffect(() => {
    clearLaunchParams();
  }, []);

  useEffect(() => {
    if (dashboard.error) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [dashboard.error]);
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

  useEffect(() => {
    setMemberLimit(MEMBERS_PAGE_SIZE);
  }, [membersFilters.query, membersFilters.selectedFilter]);

  const reservationsFilters = useCollectionFilters(dashboard.reservations, {
    searchGetters: [
      (item) => item.member?.full_name,
      (item) => getReservationDateTerms(item.date),
    ],
    filterAccessor: (item) => item.status,
    initialFilter: 'confirmada',
  });

  useEffect(() => {
    setReservationLimit(RESERVATIONS_PAGE_SIZE);
  }, [reservationsFilters.query, reservationsFilters.selectedFilter]);

  const upcomingReservations = dashboard.reservations.filter((reservation) => reservation.status === 'Confirmada').length;
  const completedReservations = dashboard.reservations.filter((reservation) => reservation.status === 'Completada').length;
  const cancelledReservations = dashboard.reservations.filter((reservation) => reservation.status === 'Cancelada').length;
  const reservationTabs = [
    { value: 'confirmada', label: 'Próximas', count: upcomingReservations },
    { value: 'completada', label: 'Pasadas', count: completedReservations },
    { value: 'cancelada', label: 'Canceladas', count: cancelledReservations },
    { value: 'all', label: 'Todas', count: dashboard.reservations.length },
  ];

  const showReservationsByStatus = (status) => {
    reservationsFilters.setQuery('');
    reservationsFilters.setSelectedFilter(status.toLowerCase());
    setActiveView('reservations');
  };

  const renderMemberCards = () => {
    if (!membersFilters.visibleItems.length) {
      return <article className="empty-card">No hay socios que coincidan con el filtro actual.</article>;
    }

    return (
      <>
        {membersFilters.visibleItems.slice(0, memberLimit).map((member) => (
          <MemberCard
            key={member.member_id}
            member={member}
            onDelete={dashboard.deleteMember}
            onInvoice={setInvoiceMember}
            disabled={dashboard.isSubmitting}
          />
        ))}
        {membersFilters.visibleItems.length > memberLimit ? (
          <button
            className="button button-secondary card-grid-more"
            type="button"
            onClick={() => setMemberLimit((limit) => limit + MEMBERS_PAGE_SIZE)}
          >
            Ver más
          </button>
        ) : null}
      </>
    );
  };

  const renderReservationCards = () => {
    if (!reservationsFilters.visibleItems.length) {
      return <article className="empty-card reservation-empty">No hay reservas que coincidan con el filtro actual.</article>;
    }

    const isUpcomingTab = reservationsFilters.selectedFilter === 'confirmada';
    const direction = isUpcomingTab || reservationsFilters.selectedFilter === 'all' ? 1 : -1;
    const sortedReservations = [...reservationsFilters.visibleItems].sort((a, b) => (
      direction * (new Date(a.date) - new Date(b.date) || (a.time_slot || '').localeCompare(b.time_slot || ''))
    ));
    let lastWeek = '';

    return (
      <>
        {sortedReservations.slice(0, reservationLimit).map((reservation) => {
          const week = isUpcomingTab ? getWeekLabel(getReservationStart(reservation)) : '';
          const heading = week && week !== lastWeek ? <h4 className="card-grid-heading">{week}</h4> : null;
          lastWeek = week || lastWeek;

          return (
            <Fragment key={reservation.reservation_id}>
              {heading}
              <ReservationCard
                reservation={reservation}
                memberFallbackName={isMember ? dashboard.profile?.full_name : undefined}
                onDelete={dashboard.deleteReservation}
                canDelete={!isStandardTrainer}
                disabled={dashboard.isSubmitting}
                canCancel
                canReschedule
                showQr={isMember}
                compact={isMember}
                onCancel={dashboard.cancelReservation}
                onReschedule={dashboard.rescheduleReservation}
                loadCheckinCode={dashboard.getCheckinCode}
              />
            </Fragment>
          );
        })}
        {sortedReservations.length > reservationLimit ? (
          <button
            className="button button-secondary card-grid-more"
            type="button"
            onClick={() => setReservationLimit((limit) => limit + RESERVATIONS_PAGE_SIZE)}
          >
            Ver más
          </button>
        ) : null}
      </>
    );
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
      formLabel="Alta de socio"
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
    <>
      <CollectionPanel
        title={isMember ? 'Mis reservas' : 'Reservas'}
        query={reservationsFilters.query}
        onQueryChange={reservationsFilters.setQuery}
        searchPlaceholder="Filtra por socio o día (ej. 15/03, lunes)"
        selectedFilter={reservationsFilters.selectedFilter}
        onFilterChange={reservationsFilters.setSelectedFilter}
        filterLabel="Estado"
        filterOptions={buildFilterOptions(dashboard.reservations, (item) => item.status, ['Confirmada', 'Completada', 'Cancelada'])}
        tabs={reservationTabs}
        countLabel={`${reservationsFilters.visibleCount} de ${reservationsFilters.totalCount}`}
        formLabel="Nueva reserva"
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
            onJoinWaitlist={isMember ? dashboard.joinWaitlist : undefined}
          />
        }
      >
        {renderReservationCards()}
      </CollectionPanel>
      <WaitlistPanel
        entries={dashboard.waitlist}
        canLeave={!isStandardTrainer}
        onLeave={dashboard.leaveWaitlist}
        disabled={dashboard.isSubmitting}
      />
    </>
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
              <button
                className="profile-avatar-button"
                type="button"
                aria-label="Cambiar foto de perfil"
                onClick={() => avatarInputRef.current?.click()}
                disabled={dashboard.isSubmitting || !dashboard.profile}
              >
                <img
                  className="profile-avatar"
                  src={dashboard.profile?.avatar || defaultAvatar}
                  alt="Foto de perfil"
                />
                <span className="profile-avatar-badge" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                    <circle cx="12" cy="13" r="3.5" />
                  </svg>
                </span>
              </button>
              <div className="profile-card-identity">
                <h2>{dashboard.profile?.full_name || session.user.full_name}</h2>
                <p title={dashboard.profile?.email || session.user.email}>
                  {dashboard.profile?.email || session.user.email}
                </p>
              </div>
            </div>
            {session.role === 'member' && dashboard.profile ? (
              <ProfilePlan
                membershipType={dashboard.profile.membership_type}
                sessionCredits={dashboard.profile.session_credits}
                session={session}
                onManage={() => setActiveView('billing')}
                onSessionExpired={onLogout}
              />
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
        <NextSession
          reservations={dashboard.reservations}
          isMember={isMember}
          loadCheckinCode={dashboard.getCheckinCode}
          onViewAll={() => setActiveView('reservations')}
        />
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
                  <MediaSlot
                    name={centerMediaName(gym.name)}
                    kind="image"
                    alt={gym.name}
                    label={`Foto ${gym.name}`}
                    className="footprint-media"
                  />
                  <span className="eyebrow">{isSelected ? 'Centro elegido' : 'Centro de entrenamiento'}</span>
                  <h3>{gym.name}</h3>
                  <p>{gym.address}</p>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
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

    if (activeView === 'reservations') {
      return renderReservationsPanel();
    }

    if (activeView === 'billing' && isMember) {
      return <BillingView session={session} onSessionExpired={onLogout} returnStatus={launch.billing} />;
    }

    if (activeView === 'checkin' && !isMember) {
      return <CheckinPanel onCheckIn={dashboard.checkIn} initialCode={launch.checkin} disabled={dashboard.isSubmitting} />;
    }

    if (activeView === 'invoices' && !isMember) {
      return <InvoicesView members={dashboard.memberDirectory} onSelect={setInvoiceMember} />;
    }

    if (activeView === 'calendar' && !isMember) {
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
        showCalendar={!isMember}
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

      {invoiceMember ? (
        <MemberInvoiceDialog
          session={session}
          member={invoiceMember}
          onClose={() => setInvoiceMember(null)}
          onSessionExpired={onLogout}
        />
      ) : null}
    </>
  );
};