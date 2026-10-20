export const membershipOptions = ['Básica', 'Premium', 'VIP'];
export const reservationStatusOptions = ['Confirmada', 'Completada', 'Cancelada'];
export const timeSlotOptions = [
  '07:00 - 08:00',
  '08:00 - 09:00',
  '09:00 - 10:00',
  '10:00 - 11:00',
  '11:00 - 12:00',
  '12:00 - 13:00',
  '16:00 - 17:00',
  '17:00 - 18:00',
  '18:00 - 19:00',
  '19:00 - 20:00',
];

export const memberFields = [
  { name: 'member_id', label: 'Código', type: 'text', required: true },
  { name: 'full_name', label: 'Nombre completo', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'password', label: 'Contraseña inicial', type: 'password', required: true },
  { name: 'phone', label: 'Teléfono', type: 'tel' },
  { name: 'membership_type', label: 'Plan', type: 'select', options: membershipOptions },
  { name: 'join_date', label: 'Alta', type: 'date' },
  { name: 'active', label: 'Cuenta activa', type: 'checkbox', defaultValue: true },
];

export const trainerFields = [
  { name: 'trainer_id', label: 'Código', type: 'text', required: true },
  { name: 'full_name', label: 'Nombre completo', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'password', label: 'Contraseña inicial', type: 'password', required: true },
  { name: 'activity_type', label: 'Especialidad', type: 'text' },
  { name: 'phone', label: 'Teléfono', type: 'tel' },
  { name: 'years_experience', label: 'Experiencia', type: 'number', min: 0, step: 1 },
  { name: 'hourly_rate', label: 'Tarifa', type: 'number', min: 0, step: 1 },
  { name: 'is_admin', label: 'Permisos admin', type: 'checkbox', defaultValue: false },
  { name: 'active', label: 'Cuenta activa', type: 'checkbox', defaultValue: true },
];

export const createInitialState = (fields) => fields.reduce((state, field) => {
  if (field.type === 'checkbox') {
    state[field.name] = field.defaultValue ?? false;
    return state;
  }

  state[field.name] = field.defaultValue ?? '';
  return state;
}, {});

export const normalizePayload = (fields, values) => fields.reduce((payload, field) => {
  const value = values[field.name];

  if (field.type === 'checkbox') {
    payload[field.name] = Boolean(value);
    return payload;
  }

  if (value === '') {
    return payload;
  }

  if (field.type === 'number') {
    payload[field.name] = Number(value);
    return payload;
  }

  payload[field.name] = value;
  return payload;
}, {});