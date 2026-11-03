import { useState } from 'react';
import './InvoicesView.css';

export const InvoicesView = ({ members, onSelect }) => {
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();
  const visibleMembers = members.filter((member) => member.full_name?.toLowerCase().includes(term));

  return (
    <section className="view-section">
      <div className="view-heading">
        <span className="eyebrow">Facturación</span>
        <h2>Facturas</h2>
        <p>Elige un socio para generar su factura mensual con el plan y las clases reservadas.</p>
      </div>

      <div className="panel invoices-panel">
        <label className="field">
          <span>Buscar socio</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre del socio" />
        </label>

        <div className="card-grid invoices-grid">
          {visibleMembers.length ? visibleMembers.map((member) => (
            <article key={member.member_id} className="entity-card invoices-member">
              <h3>{member.full_name}</h3>
              <div className="entity-actions">
                <button className="button button-primary button-small" type="button" onClick={() => onSelect(member)}>
                  Generar factura
                </button>
              </div>
            </article>
          )) : <article className="empty-card">No hay socios que coincidan con la búsqueda.</article>}
        </div>
      </div>
    </section>
  );
};
