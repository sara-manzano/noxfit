import { useEffect, useState, useTransition } from 'react';
import { memberFields, membershipOptions, trainerFields } from '../lib/forms.js';
import { formatBoolean, formatCurrency, formatDate } from '../lib/formatters.js';
import { useCollectionFilters } from '../hooks/useCollectionFilters.js';
import { useDashboardData } from '../hooks/useDashboardData.js';
import { AccountForm } from './AccountForm.jsx';
import { CollectionPanel } from './CollectionPanel.jsx';
import { ReservationForm } from './ReservationForm.jsx';
import { TopNav } from './TopNav.jsx';
import { TrainersView } from './TrainersView.jsx';
import { ServicesView } from './ServicesView.jsx';
import { CalendarView } from './CalendarView.jsx';
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
    return 'Trainer admin';
  }

  return session.role === 'trainer' ? 'Trainer' : 'Member';
};

const operationalHighlights = [
  'Vista editorial para operaciones diarias',
  'Filtros rapidos por estado, plan o especialidad',
  'Altas y reservas sin salir del panel',
];

const serviceFocus = [
  'Entrenamiento personal',
  'Agenda premium',
  'Seguimiento de members',
  'Equipo interno',
  'Control de reservas',
];

const footprintHighlights = [
  {
    city: 'Madrid',
    summary: 'Mayor volumen operativo y agenda mas densa.',
  },
  {
    city: 'Barcelona',
    summary: 'Equipo visible, especialidades y lectura rapida.',
  },
  {
    city: 'Valencia',
    summary: 'Altas y seguimiento comercial con mas presencia.',
  },
];

export const AppShell = ({ session, onLogout }) => {
  const [activePanel, setActivePanel] = useState('members');
  const [activeView, setActiveView] = useState('panel');
  const [isSwitchPending, startSwitchTransition] = useTransition();
  const dashboard = useDashboardData(session);
  const isAdmin = session.role === 'trainer' && session.user.is_admin;
  const isMember = session.role === 'member';
  const isStandardTrainer = session.role === 'trainer' && !session.user.is_admin;

  // Sin lista completa (no admin) se usa el directorio; un entrenador sin directorio ve solo su perfil.
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
        label: 'Members',
        count: dashboard.members.length,
      },
      {
        key: 'trainers',
        label: 'Trainers',
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
      return <article className="empty-card">No hay members que coincidan con el filtro actual.</article>;
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
      return <article className="empty-card">No hay trainers que coincidan con el filtro actual.</article>;
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
      return <article className="empty-card">No hay reservas que coincidan con el filtro actual.</article>;
    }

    return reservationsFilters.visibleItems.map((reservation) => (
      <article key={reservation.reservation_id} className="entity-card entity-card-wide">
        <div className="entity-card-head">
          <div>
            <p className="eyebrow">{reservation.reservation_id}</p>
            <h3>{reservation.activity_type || 'Reserva sin actividad'}</h3>
          </div>
          <span className={`status-pill ${statusToneClass(reservation.status)}`}>{reservation.status}</span>
        </div>
        <div className="entity-meta entity-meta-stacked">
          <span><strong>Fecha:</strong> {formatDate(reservation.date)}</span>
          <span><strong>Franja:</strong> {reservation.time_slot || 'Sin hora'}</span>
          <span><strong>Member:</strong> {reservation.member?.full_name || (isMember ? dashboard.profile?.full_name : 'Sin socio')}</span>
          <span><strong>Trainer:</strong> {reservation.trainer?.full_name || 'Sin trainer'}</span>
          <span><strong>Reservada por:</strong> {reservation.booked_by === 'trainer' ? 'Entrenador' : 'Miembro'}</span>
          <span><strong>Precio:</strong> {formatCurrency(reservation.price)}</span>
        </div>
        {isStandardTrainer ? null : (
          <div className="entity-actions">
            <button className="button button-secondary" type="button" onClick={() => dashboard.deleteReservation(reservation.reservation_id)} disabled={dashboard.isSubmitting}>
              Eliminar
            </button>
          </div>
        )}
      </article>
    ));
  };

  const renderActivePanel = () => {
    if (activePanel === 'members') {
      return (
        <CollectionPanel
          title="Members"
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
              title="Alta de member"
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
          title="Trainers"
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
              title="Alta de trainer"
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
        description="Cruza members y trainers dentro de una franja horaria controlada."
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
            isSubmitting={dashboard.isSubmitting}
            trainers={dashboard.trainerDirectory}
            members={dashboard.memberDirectory}
            isAdmin={isAdmin}
            isStandardTrainer={isStandardTrainer}
            currentTrainer={dashboard.profile}
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
          <div className="eyebrow eyebrow-accent">PANEL OPERATIVO NOXFIT</div>
          <h1>Control de cuentas, agenda y equipo con una presencia visual mas cercana a una marca fitness premium.</h1>
          <p className="hero-lead">
            La logica sigue igual, pero la interfaz prioriza el mensaje, la conversion interna y la lectura rapida de lo importante.
          </p>

          <div className="hero-callouts hero-callouts-strong">
            {operationalHighlights.map((item) => (
              <span key={item} className="metric-pill metric-pill-dark">{item}</span>
            ))}
          </div>

          <div className="hero-stat-band hero-stat-band-compact">
            <article>
              <strong>{dashboard.members.length}</strong>
              <span>members registrados</span>
            </article>
            <article>
              <strong>{dashboard.trainers.length}</strong>
              <span>trainers visibles</span>
            </article>
            <article>
              <strong>{upcomingReservations}</strong>
              <span>reservas confirmadas</span>
            </article>
          </div>
        </div>

        <div className="dashboard-side-stack">
          <div className="profile-card profile-card-jg">
            <span className="status-pill status-positive">{renderProfileLabel(session)}</span>
            <h2>{dashboard.profile?.full_name || session.user.full_name}</h2>
            <p>{dashboard.profile?.email || session.user.email}</p>
            <div className="profile-actions">
              <button className="button button-secondary" type="button" onClick={dashboard.refreshData} disabled={dashboard.isLoading}>
                Actualizar
              </button>
              <button className="button button-ghost" type="button" onClick={onLogout}>
                Cerrar sesion
              </button>
            </div>
          </div>

          <article className="feature-panel feature-panel-dark feature-panel-dashboard">
            <span className="panel-kicker">Cobertura operativa</span>
            <p>
              Gestiona altas, equipo y agenda desde el mismo punto. Los formularios siguen reutilizando la API actual y mantienen el comportamiento existente.
            </p>
          </article>
        </div>
      </section>

      <section className="stats-grid stats-grid-jg">
        <article className="stat-card">
          <span>Total members</span>
          <strong>{dashboard.members.length}</strong>
          <p>{activeMembers} activos</p>
        </article>
        <article className="stat-card">
          <span>Total trainers</span>
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
          <span className="panel-kicker">Que ofrecemos en esta vista</span>
          <div className="service-marquee-row">
            {serviceFocus.map((item) => (
              <span key={item} className="service-marquee-chip">{item}</span>
            ))}
          </div>
        </article>

        <div className="footprint-grid">
          {footprintHighlights.map((item) => (
            <article key={item.city} className="footprint-card">
              <span className="eyebrow">Centro destacado</span>
              <h3>{item.city}</h3>
              <p>{item.summary}</p>
            </article>
          ))}
        </div>
      </section>

      {panelConfigs.length ? (
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