import { useEffect, useState } from 'react';
import { useCollectionFilters } from '../hooks/useCollectionFilters.js';
import { useDashboardData } from '../hooks/useDashboardData.js';
import { clearLaunchParams, getInitialView, readLaunchParams } from '../lib/launchParams.js';
import {
  buildReservationTabs,
  countReservationsByStatus,
  getReservationDateTerms,
} from '../lib/reservationFilters.js';
import { getRoleFlags, getRoleLabel } from '../lib/roles.js';
import { resolveVisibleTrainers } from '../lib/trainers.js';
import { BillingView } from './BillingView.jsx';
import { CalendarView } from './CalendarView.jsx';
import { CheckinPanel } from './CheckinPanel.jsx';
import { DashboardHome } from './DashboardHome.jsx';
import { InvoicesView } from './InvoicesView.jsx';
import { LegalFooter } from './LegalFooter.jsx';
import { MemberInvoiceDialog } from './MemberInvoiceDialog.jsx';
import { MembersPanel } from './MembersPanel.jsx';
import { ReservationsPanel } from './ReservationsPanel.jsx';
import { ServicesView } from './ServicesView.jsx';
import { TopNav } from './TopNav.jsx';
import { TrainersView } from './TrainersView.jsx';
import './AppShell.css';

export const AppShell = ({ session, onLogout }) => {
  const [selectedCenter, setSelectedCenter] = useState('');
  const [launch] = useState(readLaunchParams);
  const [activeView, setActiveView] = useState(() => getInitialView(session, launch));
  const [activityFilter, setActivityFilter] = useState('');
  const [invoiceMember, setInvoiceMember] = useState(null);
  const dashboard = useDashboardData(session, onLogout);
  const role = getRoleFlags(session);
  const { isAdmin, isMember, isStandardTrainer } = role;

  const reservationsFilters = useCollectionFilters(dashboard.reservations, {
    searchGetters: [
      (item) => item.member?.full_name,
      (item) => getReservationDateTerms(item.date),
    ],
    filterAccessor: (item) => item.status,
    initialFilter: 'confirmada',
  });
  const reservationCounts = countReservationsByStatus(dashboard.reservations);
  const visibleTrainers = resolveVisibleTrainers(dashboard);

  useEffect(() => {
    clearLaunchParams();
  }, []);

  useEffect(() => {
    if (dashboard.error) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [dashboard.error]);

  const showReservationsByStatus = (status) => {
    reservationsFilters.setQuery('');
    reservationsFilters.setSelectedFilter(status.toLowerCase());
    setActiveView('reservations');
  };

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
      return (
        <MembersPanel
          members={dashboard.members}
          onCreate={dashboard.createMember}
          onDelete={dashboard.deleteMember}
          onInvoice={setInvoiceMember}
          isSubmitting={dashboard.isSubmitting}
        />
      );
    }

    if (activeView === 'trainers' && !isStandardTrainer) {
      return <TrainersView trainers={visibleTrainers} activityFilter={activityFilter} onClearFilter={() => setActivityFilter('')} />;
    }

    if (activeView === 'services' && isMember) {
      return <ServicesView trainers={visibleTrainers} onSelect={handleSelectService} />;
    }

    if (activeView === 'reservations') {
      return (
        <ReservationsPanel
          dashboard={dashboard}
          role={role}
          filters={reservationsFilters}
          tabs={buildReservationTabs(reservationCounts)}
          selectedCenter={selectedCenter}
          onCenterChange={setSelectedCenter}
        />
      );
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
          onMove={dashboard.moveReservation}
          disabled={dashboard.isSubmitting}
        />
      );
    }

    return (
      <DashboardHome
        session={session}
        dashboard={dashboard}
        role={role}
        counts={reservationCounts}
        selectedCenter={selectedCenter}
        onCenterChange={setSelectedCenter}
        onShowStatus={showReservationsByStatus}
        onViewReservations={() => setActiveView('reservations')}
        onManageBilling={() => setActiveView('billing')}
        onLogout={onLogout}
      />
    );
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
        roleLabel={getRoleLabel(role)}
        onLogout={onLogout}
      />

      <main className="page page-with-nav">
        {dashboard.error ? <div className="banner banner-error">{dashboard.error}</div> : null}
        {dashboard.notice ? <div className="banner banner-success">{dashboard.notice}</div> : null}
        {dashboard.isLoading ? <div className="loading-card">Cargando datos...</div> : renderView()}
        <LegalFooter />
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
