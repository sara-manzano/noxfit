import { Fragment } from 'react';
import { useVisibleLimit } from '../hooks/useVisibleLimit.js';
import { buildFilterOptions, RESERVATION_STATUSES } from '../lib/reservationFilters.js';
import { getReservationStart, getWeekLabel } from '../lib/schedule.js';
import { CollectionPanel } from './CollectionPanel.jsx';
import { LoadMoreButton } from './LoadMoreButton.jsx';
import { ReservationCard } from './ReservationCard.jsx';
import { ReservationForm } from './ReservationForm.jsx';
import { WaitlistPanel } from './WaitlistPanel.jsx';
import './ReservationsPanel.css';

const PAGE_SIZE = 4;

const sortReservations = (reservations, direction) => [...reservations].sort((a, b) => (
  direction * (new Date(a.date) - new Date(b.date) || (a.time_slot || '').localeCompare(b.time_slot || ''))
));

export const ReservationsPanel = ({
  dashboard,
  role,
  filters,
  tabs,
  selectedCenter,
  onCenterChange,
}) => {
  const { isMember, isAdmin, isStandardTrainer } = role;
  const [limit, showMore] = useVisibleLimit(PAGE_SIZE, `${filters.query}|${filters.selectedFilter}`);

  const renderCards = () => {
    if (!filters.visibleItems.length) {
      return <article className="empty-card reservation-empty">No hay reservas que coincidan con el filtro actual.</article>;
    }

    const isUpcomingTab = filters.selectedFilter === 'confirmada';
    const direction = isUpcomingTab || filters.selectedFilter === 'all' ? 1 : -1;
    const sortedReservations = sortReservations(filters.visibleItems, direction);
    let lastWeek = '';

    return (
      <>
        {sortedReservations.slice(0, limit).map((reservation) => {
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
        {sortedReservations.length > limit ? <LoadMoreButton onClick={showMore} /> : null}
      </>
    );
  };

  return (
    <>
      <CollectionPanel
        title={isMember ? 'Mis reservas' : 'Reservas'}
        query={filters.query}
        onQueryChange={filters.setQuery}
        searchPlaceholder="Filtra por socio o día (ej. 15/03, lunes)"
        selectedFilter={filters.selectedFilter}
        onFilterChange={filters.setSelectedFilter}
        filterLabel="Estado"
        filterOptions={buildFilterOptions(dashboard.reservations, (item) => item.status, RESERVATION_STATUSES)}
        tabs={tabs}
        countLabel={`${filters.visibleCount} de ${filters.totalCount}`}
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
            onCenterChange={onCenterChange}
            onJoinWaitlist={isMember ? dashboard.joinWaitlist : undefined}
          />
        }
      >
        {renderCards()}
      </CollectionPanel>
      <WaitlistPanel
        entries={dashboard.waitlist}
        canLeave={!isStandardTrainer}
        onLeave={dashboard.leaveWaitlist}
        disabled={dashboard.isSubmitting}
      />
    </>
  );
};
