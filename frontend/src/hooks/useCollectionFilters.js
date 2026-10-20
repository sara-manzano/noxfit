import { useDeferredValue, useState } from 'react';

const includesQuery = (value, query) => String(value || '').toLowerCase().includes(query);

export const useCollectionFilters = (items, { searchGetters, filterAccessor }) => {
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const visibleItems = items.filter((item) => {
    const matchesFilter = selectedFilter === 'all'
      || String(filterAccessor?.(item) || '').toLowerCase() === selectedFilter;

    const matchesQuery = deferredQuery === ''
      || searchGetters.some((getter) => includesQuery(getter(item), deferredQuery));

    return matchesFilter && matchesQuery;
  });

  return {
    query,
    setQuery,
    selectedFilter,
    setSelectedFilter,
    visibleItems,
    totalCount: items.length,
    visibleCount: visibleItems.length,
  };
};