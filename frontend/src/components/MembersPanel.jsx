import { memberFields, membershipOptions } from '../lib/forms.js';
import { useCollectionFilters } from '../hooks/useCollectionFilters.js';
import { useVisibleLimit } from '../hooks/useVisibleLimit.js';
import { AccountForm } from './AccountForm.jsx';
import { CollectionPanel } from './CollectionPanel.jsx';
import { LoadMoreButton } from './LoadMoreButton.jsx';
import { MemberCard } from './MemberCard.jsx';

const PAGE_SIZE = 4;

const planFilterOptions = membershipOptions.map((option) => ({ value: option.toLowerCase(), label: option }));

export const MembersPanel = ({ members, onCreate, onDelete, onInvoice, isSubmitting }) => {
  const filters = useCollectionFilters(members, {
    searchGetters: [
      (item) => item.full_name,
      (item) => item.email,
      (item) => item.membership_type,
    ],
    filterAccessor: (item) => item.membership_type,
  });
  const [limit, showMore] = useVisibleLimit(PAGE_SIZE, `${filters.query}|${filters.selectedFilter}`);

  return (
    <CollectionPanel
      title="Socios"
      description="Usuarios finales con su plan, alta y estado de cuenta."
      query={filters.query}
      onQueryChange={filters.setQuery}
      selectedFilter={filters.selectedFilter}
      onFilterChange={filters.setSelectedFilter}
      filterLabel="Plan"
      filterOptions={planFilterOptions}
      countLabel={`${filters.visibleCount} de ${filters.totalCount}`}
      formLabel="Alta de socio"
      form={
        <AccountForm
          title="Alta de socio"
          fields={memberFields}
          onSubmit={onCreate}
          isSubmitting={isSubmitting}
        />
      }
    >
      {filters.visibleItems.length ? (
        <>
          {filters.visibleItems.slice(0, limit).map((member) => (
            <MemberCard
              key={member.member_id}
              member={member}
              onDelete={onDelete}
              onInvoice={onInvoice}
              disabled={isSubmitting}
            />
          ))}
          {filters.visibleItems.length > limit ? <LoadMoreButton onClick={showMore} /> : null}
        </>
      ) : (
        <article className="empty-card">No hay socios que coincidan con el filtro actual.</article>
      )}
    </CollectionPanel>
  );
};
