import { useCallback, useEffect, useState } from 'react';
import { accountsApi, billingApi } from '../api/client.js';
import { formatDate } from '../lib/formatters.js';
import { plans } from '../lib/plans.js';
import './BillingView.css';

const SUBSCRIBED_STATUSES = ['active', 'trialing', 'past_due'];

const statusLabels = {
  active: 'Activa',
  trialing: 'En prueba',
  past_due: 'Pago pendiente',
  canceled: 'Cancelada',
  unpaid: 'Impagada',
  incomplete: 'Incompleta',
  incomplete_expired: 'Caducada',
  paused: 'Pausada',
};

const invoiceStatuses = {
  paid: { label: 'Pagada', tone: 'status-positive' },
  open: { label: 'Pendiente', tone: 'status-warning' },
  uncollectible: { label: 'Impagada', tone: 'status-warning' },
  void: { label: 'Anulada', tone: 'status-neutral' },
  draft: { label: 'Borrador', tone: 'status-neutral' },
};

const formatAmount = (amount, currency) => new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: (currency || 'eur').toUpperCase(),
}).format(amount);

export const BillingView = ({ session, onSessionExpired, returnStatus }) => {
  const [subscription, setSubscription] = useState(null);
  const [packs, setPacks] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [invoiceMonth, setInvoiceMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const handleError = useCallback((requestError) => {
    if (requestError.status === 401 && onSessionExpired) {
      onSessionExpired();
      return;
    }

    setError(requestError.message);
  }, [onSessionExpired]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      billingApi.subscription(session),
      billingApi.invoices(session).catch(() => ({ items: [] })),
      billingApi.packs(session).catch(() => null),
    ])
      .then(([summary, invoiceList, packSummary]) => {
        if (!cancelled) {
          setSubscription(summary);
          setInvoices(invoiceList.items);
          setPacks(packSummary);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          handleError(requestError);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session, handleError]);

  const redirectTo = async (createSession) => {
    setError('');
    setIsRedirecting(true);

    try {
      const { url } = await createSession();
      window.location.assign(url);
    } catch (requestError) {
      handleError(requestError);
      setIsRedirecting(false);
    }
  };

  if (isLoading) {
    return <div className="loading-card">Cargando suscripción...</div>;
  }

  const isSubscribed = SUBSCRIBED_STATUSES.includes(subscription?.status);
  const availablePlans = subscription?.available_plans || [];
  const totalPaid = invoices.reduce((sum, invoice) => sum + invoice.amount_paid, 0);

  return (
    <section className="view-section billing-view">
      <div className="view-heading">
        <span className="eyebrow">Tu plan</span>
        <h2>Suscripción</h2>
      </div>

      {error ? <div className="banner banner-error" role="alert">{error}</div> : null}
      {returnStatus === 'success' ? (
        <div className="banner banner-success">Pago completado.</div>
      ) : null}
      {returnStatus === 'cancelled' ? (
        <div className="banner banner-error">Has cancelado el pago. No se ha realizado ningún cargo.</div>
      ) : null}
      {returnStatus === 'pack_success' ? (
        <div className="banner banner-success">Pago completado</div>
      ) : null}
      {returnStatus === 'pack_cancelled' ? (
        <div className="banner banner-error">Has cancelado el pago. No se ha realizado ningún cargo.</div>
      ) : null}

      <div className="panel billing-panel">
        {subscription ? (
          <dl className="billing-summary">
            <div>
              <dt>Plan</dt>
              <dd>{subscription.membership_type || 'Sin plan'}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>{subscription.status ? statusLabels[subscription.status] || subscription.status : 'Sin suscripción'}</dd>
            </div>
            {isSubscribed && subscription.current_period_end ? (
              <div>
                <dt>{subscription.cancel_at_period_end ? 'Finaliza el' : 'Próxima renovación'}</dt>
                <dd>{formatDate(subscription.current_period_end)}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {subscription?.status === 'past_due' ? (
          <div className="banner banner-error">No se ha podido cobrar la última cuota. Actualiza el método de pago.</div>
        ) : null}

        {subscription && !subscription.configured ? (
          <div className="empty-card">Los pagos online todavía no están disponibles. Consulta con el centro.</div>
        ) : null}

        {subscription?.has_billing_account && subscription.configured ? (
          <button
            className="button button-secondary"
            type="button"
            onClick={() => redirectTo(() => billingApi.portal(session))}
            disabled={isRedirecting}
          >
            Gestionar suscripción
          </button>
        ) : null}
      </div>

      {subscription?.configured && !isSubscribed ? (
        <div className="billing-plans">
          {plans.filter((plan) => availablePlans.includes(plan.name)).map((plan) => (
            <article key={plan.slug} className={`entity-card billing-plan${plan.featured ? ' billing-plan-featured' : ''}`}>
              <span className="billing-plan-badge">{plan.badge}</span>
              <h3>{plan.name}</h3>
              <strong className="billing-plan-price">{plan.priceLabel}</strong>
              <p>{plan.summary}</p>
              <ul className="billing-plan-features">
                {plan.features.slice(0, 3).map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
              <button
                className="button button-primary"
                type="button"
                onClick={() => redirectTo(() => billingApi.checkout(session, plan.name))}
                disabled={isRedirecting}
              >
                Contratar {plan.name}
              </button>
            </article>
          ))}
        </div>
      ) : null}

      <div className="panel billing-panel">
        <div className="section-heading section-heading-tight">
          <h3>Bonos de sesiones</h3>
        </div>
        {packs ? (
          <>
            <p className="billing-credits">
              <strong>{packs.session_credits}</strong>
              <span>sesiones disponibles. Se descuenta al reservar y se devuelve si cancelas a tiempo.</span>
            </p>
            {packs.configured ? (
              <div className="billing-plans">
                {packs.packs.map((item) => (
                  <article key={item.pack} className="entity-card billing-plan billing-pack">
                    <h3>{item.sessions} sesiones</h3>
                    <strong className="billing-plan-price">{formatAmount(item.amount, item.currency)}</strong>
                    <button
                      className="button button-primary"
                      type="button"
                      onClick={() => redirectTo(() => billingApi.packCheckout(session, item.pack))}
                      disabled={isRedirecting}
                    >
                      Comprar bono
                    </button>
                  </article>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <p className="support-copy">Bonos no disponibles</p>
        )}
      </div>

      <div className="panel billing-panel">
        <div className="section-heading section-heading-tight">
          <h3>Facturas</h3>
        </div>
        <form
          className="billing-invoice-download"
          onSubmit={(event) => {
            event.preventDefault();
            setError('');
            setIsRedirecting(true);
            accountsApi.downloadInvoicePdf(session, invoiceMonth)
              .catch(handleError)
              .finally(() => setIsRedirecting(false));
          }}
        >
          <label className="field">
            <span>Factura del mes</span>
            <input type="month" value={invoiceMonth} onChange={(event) => setInvoiceMonth(event.target.value)} required />
          </label>
          <button className="button button-primary" type="submit" disabled={isRedirecting || !invoiceMonth}>
            Descargar PDF
          </button>
        </form>
        {invoices.length ? (
          <>
            <div className="billing-invoice-totals">
              <div>
                <span>Facturas</span>
                <strong>{invoices.length}</strong>
              </div>
              <div>
                <span>Total pagado</span>
                <strong>{formatAmount(totalPaid, invoices[0].currency)}</strong>
              </div>
              <div>
                <span>Última factura</span>
                <strong>{formatDate(invoices[0].created_at)}</strong>
              </div>
            </div>
            <ul className="billing-invoices">
              {invoices.map((invoice) => {
                const status = invoiceStatuses[invoice.status];

                return (
                  <li key={invoice.invoice_id}>
                    <div className="billing-invoice-main">
                      <span className="billing-invoice-number">{invoice.number || invoice.invoice_id}</span>
                      <span className="billing-invoice-date">{formatDate(invoice.created_at)}</span>
                    </div>
                    {status ? <span className={`status-pill ${status.tone}`}>{status.label}</span> : <span />}
                    <strong>{formatAmount(invoice.amount_paid, invoice.currency)}</strong>
                    <div className="billing-invoice-actions">
                      {invoice.hosted_invoice_url ? (
                        <a className="billing-invoice-link" href={invoice.hosted_invoice_url} target="_blank" rel="noopener noreferrer">Ver</a>
                      ) : null}
                      {invoice.invoice_pdf ? (
                        <a className="billing-invoice-link billing-invoice-pdf" href={invoice.invoice_pdf} target="_blank" rel="noopener noreferrer">PDF</a>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="support-copy">Todavía no tienes facturas.</p>
        )}
      </div>
    </section>
  );
};
