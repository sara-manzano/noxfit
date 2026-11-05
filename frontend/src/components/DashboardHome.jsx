import { CenterPicker } from './CenterPicker.jsx';
import { MemberHighlights } from './MemberHighlights.jsx';
import { NextSession } from './NextSession.jsx';
import { ProfileCard } from './ProfileCard.jsx';
import { StatCard } from './StatCard.jsx';
import './DashboardHome.css';

export const DashboardHome = ({
  session,
  dashboard,
  role,
  counts,
  selectedCenter,
  onCenterChange,
  onShowStatus,
  onViewReservations,
  onManageBilling,
  onLogout,
}) => (
  <>
    <section className="brand-hero brand-hero-dashboard">
      <div className="hero-grid-overlay" />

      <div className="hero-copy-dashboard">
        <div className="eyebrow">NOXFIT</div>
        <MemberHighlights
          highlights={dashboard.highlights}
          canEdit={role.isTrainer}
          onSave={dashboard.updateHighlights}
          disabled={dashboard.isSubmitting}
        />
      </div>

      <div className="dashboard-side-stack">
        <ProfileCard
          session={session}
          profile={dashboard.profile}
          isSubmitting={dashboard.isSubmitting}
          onUpdateAvatar={dashboard.updateAvatar}
          onUpdateProfile={dashboard.updateProfile}
          onManagePlan={onManageBilling}
          onSessionExpired={onLogout}
        />
      </div>
    </section>

    <section className="dashboard-stats">
      <NextSession
        reservations={dashboard.reservations}
        isMember={role.isMember}
        loadCheckinCode={dashboard.getCheckinCode}
        onViewAll={onViewReservations}
      />
      <div className="stat-stack">
        <StatCard
          label="Reservas activas"
          value={counts.upcoming}
          description="Confirmadas en agenda"
          onClick={() => onShowStatus('Confirmada')}
        />
        <StatCard
          label="Completadas"
          value={counts.completed}
          description="Histórico operativo"
          onClick={() => onShowStatus('Completada')}
        />
      </div>
    </section>

    {role.isMember ? <CenterPicker selectedCenter={selectedCenter} onChange={onCenterChange} /> : null}
  </>
);
