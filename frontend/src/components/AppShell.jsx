import { useEffect, useState, useTransition } from 'react';
import { memberFields, membershipOptions, trainerFields } from '../lib/forms.js';
import { formatBoolean, formatCurrency, formatDate } from '../lib/formatters.js';
import { useCollectionFilters } from '../hooks/useCollectionFilters.js';
import { useDashboardData } from '../hooks/useDashboardData.js';
import { AccountForm } from './AccountForm.jsx';
import { CollectionPanel } from './CollectionPanel.jsx';
import { ReservationForm } from './ReservationForm.jsx';
import { TrainersView } from './TrainersView.jsx';
import { ServicesView } from './ServicesView.jsx';
import { CalendarView } from './CalendarView.jsx';
import { gyms } from './MadridMap.jsx';
import { TopNav } from './TopNav.jsx';
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

const statusToneClass = (value) => {
  if (value === 'Confirmada' || value === 'Activo') {
    return 'status-positive';
  }

  if (value === 'Completada' || value === 'Admin') {
    return 'status-neutral';
  }

  return 'status-warning';
};

const renderProfileLabel = (session) => {
  if (session.role === 'trainer' && session.user.is_admin) {
    return 'Entrenador admin';
  }

  return session.role === 'trainer' ? 'Entrenador' : 'Socio';
};

const getInitials = (name = '') => (
  name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || '?'
);

const serviceFocus = [
  'Entrenamiento personal',
  'Entrenamiento grupal',
  'Nutrición',
];

export const AppShell = ({ session, onLogout }) => {
  const [activePanel, setActivePanel] = useState('members');
  const [selectedCenter, setSelectedCenter] = useState('');
  const [activeView, setActiveView] = useState('panel');
  const [isSwitchPending, startSwitchTransition] = useTransition();
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
      (item) => item.member_id,
      (item) => item.full_name,
      (item) => item.email,
      (item) => item.membership_type,
    ],
    filterAccessor: (item) => item.membership_type,
  });

  const trainersFilters = useCollectionFilters(dashboard.trainers, {
    searchGetters: [
      (item) => item.trainer_id,
      (item) => item.full_name,
      (item) => item.email,
      (item) => item.activity_type,
    ],
    filterAccessor: (item) => item.activity_type,
  });

  const reservationsFilters = useCollectionFilters(dashboard.reservations, {
    searchGetters: [
      (item) => item.reservation_id,
      (item) => item.activity_type,
      (item) => item.status,
      (item) => item.member?.full_name,
      (item) => item.trainer?.full_name,
    ],
    filterAccessor: (item) => item.status,
  });

  const panelConfigs = isAdmin
    ? [
      {
        key: 'members',
        label: 'Socios',
        count: dashboard.members.length,
      },
      {
        key: 'trainers',
        label: 'Entrenadores',
        count: dashboard.trainers.length,
      },
      {
        key: 'reservations',
        label: 'Reservations',
        count: dashboard.reservations.length,
      },
    ]
    : [
      {
        key: 'reservations',
        label: isMember ? 'Mis reservas' : 'Reservations',
        count: dashboard.reservations.length,
      },
    ];

  useEffect(() => {
    if (!panelConfigs.some((panel) => panel.key === activePanel)) {
      setActivePanel(panelConfigs[0]?.key || 'reservations');
    }
  }, [activePanel, panelConfigs]);

  const activeMembers = dashboard.members.filter((member) => member.active).length;
  const activeTrainers = dashboard.trainers.filter((trainer) => trainer.active).length;
  const upcomingReservations = dashboard.reservations.filter((reservation) => reservation.status === 'Confirmada').length;
  const completedReservations = dashboard.reservations.filter((reservation) => reservation.status === 'Completada').length;

  const renderMemberCards = () => {
    if (!membersFilters.visibleItems.length) {
      return <article className="empty-card">No hay socios que coincidan con el filtro actual.</article>;
    }

    return membersFilters.visibleItems.map((member) => (
      <article key={member.member_id} className="entity-card">
        <div className="entity-card-head">
          <div>
            <p className="eyebrow">{member.member_id}</p>
            <h3>{member.full_name}</h3>
          </div>
          <span className={`status-pill ${statusToneClass(formatBoolean(member.active))}`}>{formatBoolean(member.active)}</span>
        </div>
        <p>{member.email}</p>
        <div className="entity-meta">
          <span>{member.membership_type || 'Sin plan'}</span>
          <span>{formatDate(member.join_date)}</span>
        </div>
        <div className="entity-actions">
          <button className="button button-secondary" type="button" onClick={() => dashboard.deleteMember(member.member_id)} disabled={dashboard.isSubmitting}>
            Eliminar
          </button>
        </div>
      </article>
    ));
  };

  const renderTrainerCards = () => {
    if (!trainersFilters.visibleItems.length) {
      return <article className="empty-card">No hay entrenadores que coincidan con el filtro actual.</article>;
    }

    return trainersFilters.visibleItems.map((trainer) => (
      <article key={trainer.trainer_id} className="entity-card">
        <div className="entity-card-head">
          <div>
            <p className="eyebrow">{trainer.trainer_id}</p>
            <h3>{trainer.full_name}</h3>
          </div>
          <span className={`status-pill ${statusToneClass(trainer.is_admin ? 'Admin' : formatBoolean(trainer.active))}`}>
            {trainer.is_admin ? 'Admin' : formatBoolean(trainer.active)}
          </span>
        </div>
        <p>{trainer.email}</p>
        <div className="entity-meta">
          <span>{trainer.activity_type || 'Sin especialidad'}</span>
          <span>{trainer.center || 'Sin centro'}</span>
          <span>{formatCurrency(trainer.hourly_rate)}</span>
          <span>{trainer.years_experience || 0} años</span>
        </div>
        <div className="entity-actions">
          <button className="button button-secondary" type="button" onClick={() => dashboard.deleteTrainer(trainer.trainer_id)} disabled={dashboard.isSubmitting || trainer.is_admin}>
            Eliminar
          </button>
        </div>
      </article>
    ));
  };

  const renderReservationCards = () => {
    if (!reservationsFilters.visibleItems.length) {
      return <article className="empty-card reservation-empty">No hay reservas que coincidan con el filtro actual.</article>;
    }

    const getDateParts = (value) => {
      const date = value ? new Date(value) : null;
      if (!date || Number.isNaN(date.getTime())) {
        return { day: '--', month: 'Sin fecha', weekday: '' };
      }
      return {
        day: new Intl.DateTimeFormat('es-ES', { day: '2-digit' }).format(date),
        month: new Intl.DateTimeFormat('es-ES', { month: 'short', year: 'numeric' }).format(date),
        weekday: new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(date),
      };
    };

    return reservationsFilters.visibleItems.map((reservation) => {
      const { day, month, weekday } = getDateParts(reservation.date);

      return (
        <article key={reservation.reservation_id} className="entity-card entity-card-wide reservation-card">
          <div className="reservation-stub">
            <span className="reservation-weekday">{weekday}</span>
            <strong className="reservation-day">{day}</strong>
            <span className="reservation-month">{month}</span>
          </div>
          <div className="reservation-body">
            <div className="reservation-top">
              <span className="reservation-time">{reservation.time_slot || 'Sin hora'}</span>
              <span className={`status-pill ${statusToneClass(reservation.status)}`}>{reservation.status}</span>
            </div>
            <h3>{reservation.activity_type || 'Reserva sin actividad'}</h3>
            <p className="reservation-people">
              con <strong>{reservation.trainer?.full_name || 'Sin entrenador'}</strong>
              {' · '}
              {reservation.member?.full_name || (isMember ? dashboard.profile?.full_name : 'Sin socio')}
            </p>
            <div className="reservation-chips">
              <span>{reservation.center || 'Sin centro'}</span>
              <span>Tarifa {formatCurrency(reservation.trainer?.hourly_rate)}/h</span>
              <span>Reservada por {reservation.booked_by === 'trainer' ? 'entrenador' : 'socio'}</span>
              <span>{reservation.reservation_id}</span>
            </div>
            <div className="reservation-bottom">
              <span className="reservation-price">{formatCurrency(reservation.price)}</span>
              {isStandardTrainer ? null : (
                <button className="reservation-delete" type="button" onClick={() => dashboard.deleteReservation(reservation.reservation_id)} disabled={dashboard.isSubmitting}>
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </article>
      );
    });
  };

  const renderActivePanel = () => {
    if (activePanel === 'members') {
      return (
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
    }

    if (activePanel === 'trainers') {
      return (
        <CollectionPanel
          title="Entrenadores"
          description="Equipo interno con especialidad, tarifa y permisos."
          query={trainersFilters.query}
          onQueryChange={trainersFilters.setQuery}
          selectedFilter={trainersFilters.selectedFilter}
          onFilterChange={trainersFilters.setSelectedFilter}
          filterLabel="Especialidad"
          filterOptions={buildFilterOptions(dashboard.trainers, (item) => item.activity_type)}
          countLabel={`${trainersFilters.visibleCount} de ${trainersFilters.totalCount}`}
          form={
            <AccountForm
              title="Alta de entrenador"
              fields={trainerFields}
              onSubmit={dashboard.createTrainer}
              isSubmitting={dashboard.isSubmitting}
            />
          }
        >
          {renderTrainerCards()}
        </CollectionPanel>
      );
    }

    return (
      <CollectionPanel
        title={session.role === 'trainer' ? 'Reservations' : 'Mis reservas'}
        query={reservationsFilters.query}
        onQueryChange={reservationsFilters.setQuery}
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
  };

  const renderPanelView = () => (
    <>
      <section className="brand-hero brand-hero-dashboard">
        <div className="hero-grid-overlay" />

        <div className="hero-copy hero-copy-dashboard">
          <div className="eyebrow eyebrow-accent">NOXFIT</div>
          
          {!isMember ? (
            <div className="hero-stat-band hero-stat-band-compact">
              <article>
                <strong>{dashboard.members.length}</strong>
                <span>Socios</span>
              </article>
            </div>
          ) : null}
        </div>

        <div className="dashboard-side-stack">
          <div className="profile-card profile-card-jg">
            <div className="profile-card-header">
              <div className="profile-avatar" aria-hidden="true">
                {getInitials(dashboard.profile?.full_name || session.user.full_name)}
              </div>
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
              <button className="button button-secondary" type="button" onClick={dashboard.refreshData} disabled={dashboard.isLoading}>
                Actualizar
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className={isMember ? 'stats-grid stats-grid-jg stats-grid-member' : 'stats-grid stats-grid-jg'}>
        {!isMember ? (
          <article className="stat-card">
            <span>Total socios</span>
            <strong>{dashboard.members.length}</strong>
            <p>{activeMembers} activos</p>
          </article>
        ) : null}
        <article className="stat-card">
          <span>Total entrenadores</span>
          <strong>{dashboard.trainers.length}</strong>
          <p>{activeTrainers} activos</p>
        </article>
        <article className="stat-card">
          <span>Reservas activas</span>
          <strong>{upcomingReservations}</strong>
          <p>Confirmadas en agenda</p>
        </article>
        <article className="stat-card">
          <span>Completadas</span>
          <strong>{completedReservations}</strong>
          <p>Histórico operativo</p>
        </article>
      </section>

      <section className="dashboard-overview">
        <article className="service-marquee">
          <div className="service-marquee-row">
            {serviceFocus.map((item) => (
              <span key={item} className="service-marquee-chip">{item}</span>
            ))}
          </div>
        </article>

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

      {panelConfigs.length > 1 ? (
        <nav className="tab-row tab-row-jg" aria-label="Colecciones">
          {panelConfigs.map((panel) => (
            <button
              key={panel.key}
              className={panel.key === activePanel ? 'tab-button tab-button-active' : 'tab-button'}
              type="button"
              onClick={() => startSwitchTransition(() => setActivePanel(panel.key))}
            >
              {panel.label}
              <span>{panel.count}</span>
            </button>
          ))}
        </nav>
      ) : null}

      {isSwitchPending ? <div className="loading-inline">Cambiando vista...</div> : null}
      {!dashboard.isLoading ? renderActivePanel() : null}
    </>
  );

  const renderView = () => {
    if (activeView === 'trainers') {
      return <TrainersView trainers={visibleTrainers} isPartial={!isAdmin} />;
    }

    if (activeView === 'services') {
      return <ServicesView trainers={visibleTrainers} reservations={dashboard.reservations} />;
    }

    if (activeView === 'calendar') {
      return <CalendarView reservations={dashboard.reservations} />;
    }

    return renderPanelView();
  };

  return (
    <>
      <TopNav
        activeView={activeView}
        onChange={setActiveView}
        userName={dashboard.profile?.full_name || session.user.full_name}
        roleLabel={renderProfileLabel(session)}
        onLogout={onLogout}
      />

      <main className="page page-with-nav">
        {dashboard.error ? <div className="banner banner-error">{dashboard.error}</div> : null}
        {dashboard.notice ? <div className="banner banner-success">{dashboard.notice}</div> : null}
        {dashboard.isLoading ? <div className="loading-card">Cargando datos...</div> : renderView()}
      </main>
    </>
  );
};