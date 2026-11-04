import { useEffect, useRef, useState } from 'react';
import { accountsApi } from '../api/client.js';
import { useAsyncAction } from '../hooks/useAsyncAction.js';
import { formatDate } from '../lib/formatters.js';
import './MemberInvoiceDialog.css';

const formatAmount = (amount, currency) => new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: currency || 'EUR',
}).format(amount);

export const MemberInvoiceDialog = ({ session, member, onClose, onSessionExpired }) => {
  const dialogRef = useRef(null);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [invoice, setInvoice] = useState(null);
  const { error, isPending: isLoading, run } = useAsyncAction({
    onError: (requestError) => {
      if (requestError.status !== 401) return false;
      onSessionExpired();
      return true;
    },
  });

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const generate = (event) => {
    event.preventDefault();
    return run(async () => setInvoice(await accountsApi.memberInvoice(session, member.member_id, month)));
  };

  const downloadPdf = () => run(() => accountsApi.downloadInvoicePdf(session, month, member.member_id));

  return (
    <dialog ref={dialogRef} className="invoice-dialog" onClose={onClose}>
      <header className="invoice-dialog-head">
        <div>
          <span className="eyebrow">Factura</span>
          <h3>{member.full_name}</h3>
        </div>
        <button className="button button-secondary" type="button" onClick={() => dialogRef.current?.close()}>
          Cerrar
        </button>
      </header>

      <form className="invoice-dialog-form" onSubmit={generate}>
        <label className="field">
          <span>Mes</span>
          <input type="month" value={month} onChange={(event) => { setMonth(event.target.value); setInvoice(null); }} required />
        </label>
        <button className="button button-primary" type="submit" disabled={isLoading || !month}>
          Generar factura
        </button>
      </form>

      {error ? <div className="banner banner-error" role="alert">{error}</div> : null}

      {invoice ? (
        <div className="invoice-preview">
          <p className="invoice-preview-meta">
            <strong>{invoice.invoice_number}</strong>
            <span>{formatDate(invoice.period.from)} - {formatDate(invoice.period.to)}</span>
          </p>
          <ul className="invoice-lines">
            {invoice.lines.map((line, index) => (
              <li key={`${index}-${line.description}`}>
                <span>{line.description}</span>
                <strong>{formatAmount(line.amount, invoice.currency)}</strong>
              </li>
            ))}
          </ul>
          <dl className="invoice-totals">
            <div><dt>Base imponible</dt><dd>{formatAmount(invoice.tax_base, invoice.currency)}</dd></div>
            <div><dt>IVA ({invoice.tax_rate * 100}%)</dt><dd>{formatAmount(invoice.tax, invoice.currency)}</dd></div>
            <div className="invoice-total"><dt>Total</dt><dd>{formatAmount(invoice.total, invoice.currency)}</dd></div>
          </dl>
          <button className="button button-secondary" type="button" onClick={downloadPdf} disabled={isLoading}>
            Descargar PDF
          </button>
        </div>
      ) : null}
    </dialog>
  );
};
