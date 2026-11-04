export const SUBSCRIBED_STATUSES = ['active', 'trialing', 'past_due'];

export const formatAmount = (amount, currency) => new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: (currency || 'eur').toUpperCase(),
}).format(amount);
