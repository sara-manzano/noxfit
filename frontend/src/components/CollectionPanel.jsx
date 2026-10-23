import './CollectionPanel.css';

export const CollectionPanel = ({
  title,
  description,
  query,
  onQueryChange,
  selectedFilter,
  onFilterChange,
  filterLabel,
  filterOptions,
  countLabel,
  form,
  children,
}) => (
  <section className="collection-shell">
    <aside className="panel panel-form">{form}</aside>

    <div className="panel panel-list">
      <div className="section-heading section-heading-inline">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        <span className="metric-pill metric-pill-accent">{countLabel}</span>
      </div>

      <div className="toolbar">
        <label className="field field-inline">
          <span>Búsqueda</span>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Filtra por nombre, código o email"
          />
        </label>

        <label className="field field-inline">
          <span>{filterLabel}</span>
          <select value={selectedFilter} onChange={(event) => onFilterChange(event.target.value)}>
            <option value="all">Todos</option>
            {filterOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="card-grid">{children}</div>
    </div>
  </section>
);