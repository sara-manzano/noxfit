const { createStatusError } = require('../http/errors');
const PDFDocument = require('pdfkit');

const CURRENCY = 'EUR';
const TAX_RATE = 0.21;
const PLAN_MONTHLY_CENTS = { 'Básica': 990, Premium: 1990, VIP: 2990 };

const toCents = (amount) => Math.round((amount || 0) * 100);
const fromCents = (cents) => cents / 100;

const parseMonth = (value) => {
  const month = value ?? new Date().toISOString().slice(0, 7);
  const match = typeof month === 'string' ? month.match(/^(\d{4})-(0[1-9]|1[0-2])$/) : null;

  if (!match) {
    throw createStatusError('month must use YYYY-MM', 400);
  }

  const start = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  const end = new Date(Date.UTC(Number(match[1]), Number(match[2]), 1));

  return { month, start, end };
};

const buildMemberInvoice = (member, reservations, { month, start, end }) => {
  const lines = [];

  if (PLAN_MONTHLY_CENTS[member.membership_type]) {
    lines.push({
      description: `Cuota mensual plan ${member.membership_type}`,
      quantity: 1,
      unit_price_cents: PLAN_MONTHLY_CENTS[member.membership_type],
    });
  }

  reservations.forEach((reservation) => {
    const day = reservation.date.toISOString().slice(0, 10);
    const label = [reservation.activity_type || 'Sesión', day, reservation.time_slot].filter(Boolean).join(' · ');

    lines.push({
      description: reservation.credit_used ? `${label} (bono)` : label,
      quantity: 1,
      unit_price_cents: reservation.credit_used ? 0 : toCents(reservation.price),
    });
  });

  const totalCents = lines.reduce((sum, line) => sum + line.unit_price_cents * line.quantity, 0);
  const baseCents = Math.round(totalCents / (1 + TAX_RATE));

  return {
    invoice_number: `FAC-${month.replace('-', '')}-${member.member_id}`,
    issue_date: new Date(),
    period: { from: start, to: new Date(end.getTime() - 1) },
    currency: CURRENCY,
    member: {
      member_id: member.member_id,
      full_name: member.full_name,
      email: member.email,
      phone: member.phone,
    },
    lines: lines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unit_price: fromCents(line.unit_price_cents),
      amount: fromCents(line.unit_price_cents * line.quantity),
    })),
    tax_rate: TAX_RATE,
    tax_base: fromCents(baseCents),
    tax: fromCents(totalCents - baseCents),
    total: fromCents(totalCents),
  };
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));

const money = (amount) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: CURRENCY }).format(amount);
const day = (date) => new Date(date).toISOString().slice(0, 10);

const renderInvoiceHtml = (invoice) => `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escapeHtml(invoice.invoice_number)}</title>
<style>
body{font-family:system-ui,sans-serif;max-width:720px;margin:2rem auto;padding:0 1rem;color:#141414}
h1{margin:0}table{width:100%;border-collapse:collapse;margin:1.5rem 0}
th,td{padding:.5rem;border-bottom:1px solid #ddd;text-align:left}
td.num,th.num{text-align:right}.totals{margin-left:auto;width:16rem}
.totals div{display:flex;justify-content:space-between;padding:.25rem 0}.totals .total{font-weight:800;font-size:1.2rem}
</style>
</head>
<body>
<h1>Noxfit</h1>
<p><strong>Factura ${escapeHtml(invoice.invoice_number)}</strong><br>Fecha: ${day(invoice.issue_date)}<br>Periodo: ${day(invoice.period.from)} a ${day(invoice.period.to)}</p>
<p><strong>${escapeHtml(invoice.member.full_name)}</strong><br>${escapeHtml(invoice.member.email)}<br>${escapeHtml(invoice.member.phone)}</p>
<table>
<thead><tr><th>Concepto</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Importe</th></tr></thead>
<tbody>
${invoice.lines.map((line) => `<tr><td>${escapeHtml(line.description)}</td><td class="num">${line.quantity}</td><td class="num">${money(line.unit_price)}</td><td class="num">${money(line.amount)}</td></tr>`).join('\n')}
</tbody>
</table>
<div class="totals">
<div><span>Base imponible</span><span>${money(invoice.tax_base)}</span></div>
<div><span>IVA (${invoice.tax_rate * 100}%)</span><span>${money(invoice.tax)}</span></div>
<div class="total"><span>Total</span><span>${money(invoice.total)}</span></div>
</div>
</body>
</html>`;

const renderInvoicePdf = (invoice) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks = [];
  const right = { width: 90, align: 'right' };

  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  doc.font('Helvetica-Bold').fontSize(24).text('Noxfit');
  doc.moveDown(0.5).fontSize(12).text(`Factura ${invoice.invoice_number}`);
  doc.font('Helvetica').fontSize(10)
    .text(`Fecha: ${day(invoice.issue_date)}`)
    .text(`Periodo: ${day(invoice.period.from)} a ${day(invoice.period.to)}`);
  doc.moveDown().font('Helvetica-Bold').text(invoice.member.full_name || '');
  doc.font('Helvetica').text(invoice.member.email || '');

  if (invoice.member.phone) {
    doc.text(invoice.member.phone);
  }

  doc.moveDown();
  const drawRow = (y, cells, font) => {
    doc.font(font);
    doc.text(cells[0], 50, y, { width: 270 });
    doc.text(cells[1], 320, y, { ...right, width: 40 });
    doc.text(cells[2], 365, y, right);
    doc.text(cells[3], 460, y, right);
  };

  drawRow(doc.y, ['Concepto', 'Cant.', 'Precio', 'Importe'], 'Helvetica-Bold');
  doc.moveDown(0.5);
  invoice.lines.forEach((line) => {
    if (doc.y > 740) {
      doc.addPage();
    }

    const y = doc.y + 4;

    drawRow(y, [line.description, String(line.quantity), money(line.unit_price), money(line.amount)], 'Helvetica');
    doc.y = Math.max(doc.y, y + 14);
  });

  doc.moveDown();
  const drawTotal = (label, value, font) => {
    const y = doc.y;

    doc.font(font).text(label, 320, y, { width: 130 });
    doc.text(value, 460, y, right);
    doc.y = y + 16;
  };

  drawTotal('Base imponible', money(invoice.tax_base), 'Helvetica');
  drawTotal(`IVA (${invoice.tax_rate * 100}%)`, money(invoice.tax), 'Helvetica');
  drawTotal('Total', money(invoice.total), 'Helvetica-Bold');
  doc.end();
});

module.exports = {
  buildMemberInvoice,
  parseMonth,
  renderInvoiceHtml,
  renderInvoicePdf,
};
