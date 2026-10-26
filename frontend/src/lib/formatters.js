export const formatDate = (value) => {
  if (!value) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
};

export const formatCurrency = (value) => {
  if (value === undefined || value === null || value === '') {
    return 'Sin tarifa';
  }

  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Number(value));
};

const MEMBERSHIP_FEES = { 'Básica': 9.9, Premium: 19.9, VIP: 29.9 };

export const formatMembershipFee = (membershipType) => {
  const fee = MEMBERSHIP_FEES[membershipType];

  if (fee === undefined) {
    return 'Sin cuota';
  }

  return `${new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(fee)}/mes`;
};

export const formatBoolean = (value, truthyLabel = 'Activo', falsyLabel = 'Inactivo') => (
  value ? truthyLabel : falsyLabel
);