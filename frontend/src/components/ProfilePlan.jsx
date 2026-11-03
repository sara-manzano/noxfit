import { plans } from '../lib/plans.js';
import './ProfilePlan.css';

export const ProfilePlan = ({ membershipType, sessionCredits, onManage }) => {
  const plan = plans.find((item) => item.name === membershipType);
  const hasCredits = typeof sessionCredits === 'number';

  return (
    <div className="profile-plan">
      <div className="profile-plan-block">
        <span className={`profile-plan-badge profile-plan-${plan?.tone || 'none'}`}>{membershipType || 'Sin plan'}</span>
        <span className="profile-plan-price">
          {plan ? <>{plan.price} €<small>/mes</small></> : 'Sin cuota'}
        </span>
        <button className="profile-plan-link" type="button" onClick={onManage}>
          {plan ? 'Cambiar de plan' : 'Elegir un plan'}
        </button>
      </div>

      {hasCredits ? (
        <div className="profile-plan-block">
          <span className="profile-plan-credits">{sessionCredits}</span>
          <span className="profile-plan-label">{sessionCredits === 1 ? 'sesión de bono' : 'sesiones de bono'}</span>
          <button className="profile-plan-link" type="button" onClick={onManage}>Comprar bono</button>
        </div>
      ) : null}
    </div>
  );
};
