import { formatBoolean, formatDate, formatMembershipFee } from '../lib/formatters.js';
import { StatusPill } from './StatusPill.jsx';

export const MemberCard = ({ member, onDelete, disabled }) => (
  <article className="entity-card">
    <div className="entity-card-head">
      <div>
        <h3>{member.full_name}</h3>
      </div>
      <StatusPill status={formatBoolean(member.active)} />
    </div>
    <p>{member.email}</p>
    <div className="entity-meta">
      <span>{member.membership_type || 'Sin plan'}</span>
      <span>{formatMembershipFee(member.membership_type)}</span>
      <span>{formatDate(member.join_date)}</span>
    </div>
    <div className="entity-actions">
      <button className="button button-secondary" type="button" onClick={() => onDelete(member.member_id)} disabled={disabled}>
        Eliminar
      </button>
    </div>
  </article>
);
