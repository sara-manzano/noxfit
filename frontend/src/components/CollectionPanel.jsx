import { useEffect, useState } from 'react';
import './CollectionPanel.css';

export const CollectionPanel = ({
  title,
  description,
  query,
  onQueryChange,
  searchPlaceholder = 'Filtra por nombre o email',
  selectedFilter,
  onFilterChange,
  filterLabel,
  filterOptions,
  tabs,
  countLabel,
  form,
  formLabel,
  children,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    if (!isFormOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsFormOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFormOpen]);

  return (
  <section className="collection-shell">
    <button className="button button-primary collection-new" type="button" onClick={() => setIsFormOpen(true)}>
      {formLabel}
    </button>

    {isFormOpen ? <div className="collection-sheet-backdrop" onClick={() => setIsFormOpen(false)} /> : null}

    <aside
      className={isFormOpen ? 'panel panel-form panel-form-open' : 'panel panel-form'}
      onSubmit={() => setIsFormOpen(false)}
    >
      <button className="collection-sheet-close" type="button" aria-label="Cerrar formulario" onClick={() => setIsFormOpen(false)}>
        &times;
      </button>
      {form}
    </aside>

    <div className="panel panel-list">
      <div className="section-heading section-heading-inline">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        <span className="metric-pill metric-pill-accent">{countLabel}</span>
      </div>

      {tabs ? (
        <div className="collection-tabs" role="tablist" aria-label={filterLabel}>
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={selectedFilter === tab.value}
              className={selectedFilter === tab.value ? 'collection-tab collection-tab-active' : 'collection-tab'}
              onClick={() => onFilterChange(tab.value)}
            >
              {tab.label}
              <span>{tab.count}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="toolbar">
        <label className="field field-inline">
          <span>Búsqueda</span>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={searchPlaceholder}
          />
        </label>

        {tabs ? null : (
          <label className="field field-inline">
            <span>{filterLabel}</span>
            <select value={selectedFilter} onChange={(event) => onFilterChange(event.target.value)}>
              <option value="all">Todos</option>
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="card-grid">{children}</div>
    </div>
  </section>
  );
};