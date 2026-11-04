import { useEffect, useState } from 'react';
import { billingApi } from '../api/client.js';
import { useAsyncAction } from '../hooks/useAsyncAction.js';
import { SUBSCRIBED_STATUSES, formatAmount } from '../lib/billing.js';
import { plans } from '../lib/plans.js';
import './ProfilePlan.css';

export const ProfilePlan = ({ membershipType, sessionCredits, session, onManage, onSessionExpired }) => {
  const plan = plans.find((item) => item.name === membershipType);
  const hasCredits = typeof sessionCredits === 'number';
  const [panel, setPanel] = useState(null);
  const [data, setData] = useState({ plan: null, packs: null });
  const { error, setError, isPending, run } = useAsyncAction({
    onError: (requestError) => {
      if (requestError.status !== 401) return false;
      onSessionExpired();
      return true;
    },
  });

  useEffect(() => {
    if (!panel || data[panel]) return undefined;

    let cancelled = false;
    const load = panel === 'plan' ? billingApi.subscription(session) : billingApi.packs(session);

    load
      .then((result) => {
        if (!cancelled) setData((current) => ({ ...current, [panel]: result }));
      })
      .catch((requestError) => {
        if (cancelled) return;
        if (requestError.status === 401) onSessionExpired();
        else setError(requestError.message);
      });

    return () => {
      cancelled = true;
    };
  }, [panel, session]);

  const togglePanel = (name) => {
    setError('');
    setPanel((current) => (current === name ? null : name));
  };

  const redirectTo = (createSession) => run(async () => {
    const { url } = await createSession();
    window.location.assign(url);
  });

  const renderPlanPanel = () => {
    const summary = data.plan;

    if (!summary) return <p className="profile-plan-note">Cargando planes...</p>;
    if (!summary.configured) return <p className="profile-plan-note">Los pagos online todavía no están disponibles.</p>;

    if (SUBSCRIBED_STATUSES.includes(summary.status)) {
      return (
        <>
          <p className="profile-plan-note">Ya tienes una suscripción activa. Cambia de plan desde el portal de pagos.</p>
          <button className="button button-primary" type="button" disabled={isPending} onClick={() => redirectTo(() => billingApi.portal(session))}>
            Abrir portal de suscripción
          </button>
        </>
      );
    }

    const available = plans.filter((item) => summary.available_plans?.includes(item.name));

    return (
      <div className="profile-plan-options">
        {available.map((item) => (
          <button
            key={item.slug}
            className="button button-primary"
            type="button"
            disabled={isPending}
            onClick={() => redirectTo(() => billingApi.checkout(session, item.name))}
          >
            {item.name} · {item.priceLabel}
          </button>
        ))}
      </div>
    );
  };

  const renderPacksPanel = () => {
    const summary = data.packs;

    if (!summary) return <p className="profile-plan-note">Cargando bonos...</p>;
    if (!summary.configured) return <p className="profile-plan-note">Los bonos no están disponibles todavía.</p>;

    return (
      <div className="profile-plan-options">
        {summary.packs.map((item) => (
          <button
            key={item.pack}
            className="button button-primary"
            type="button"
            disabled={isPending}
            onClick={() => redirectTo(() => billingApi.packCheckout(session, item.pack))}
          >
            {item.sessions} sesiones · {formatAmount(item.amount, item.currency)}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="profile-plan">
      <div className="profile-plan-block">
        <span className={`profile-plan-badge profile-plan-${plan?.tone || 'none'}`}>{membershipType || 'Sin plan'}</span>
        <span className="profile-plan-price">
          {plan ? <>{plan.price} €<small>/mes</small></> : 'Sin cuota'}
        </span>
        <button className="profile-plan-link" type="button" aria-expanded={panel === 'plan'} onClick={() => togglePanel('plan')}>
          {plan ? 'Cambiar de plan' : 'Elegir un plan'}
        </button>
      </div>

      {hasCredits ? (
        <div className="profile-plan-block">
          <span className="profile-plan-credits">{sessionCredits}</span>
          <span className="profile-plan-label">{sessionCredits === 1 ? 'sesión de bono' : 'sesiones de bono'}</span>
          <button className="profile-plan-link" type="button" aria-expanded={panel === 'packs'} onClick={() => togglePanel('packs')}>
            Comprar bono
          </button>
        </div>
      ) : null}

      {panel ? (
        <div className="profile-plan-panel">
          {error ? <div className="banner banner-error" role="alert">{error}</div> : null}
          {panel === 'plan' ? renderPlanPanel() : renderPacksPanel()}
          <button className="profile-plan-link" type="button" onClick={onManage}>Ver facturas y detalles</button>
        </div>
      ) : null}
    </div>
  );
};
