const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api');

class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

const buildHeaders = ({ token, body, headers }) => ({
  ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  ...headers,
});

const request = async (path, { method = 'GET', token, body, headers } = {}) => {
  const response = await fetch(`${DEFAULT_API_BASE_URL}${path}`, {
    method,
    headers: buildHeaders({ token, body, headers }),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(payload?.error || 'No se pudo completar la solicitud', response.status, payload);
  }

  return payload;
};

export const authApi = {
  login(role, credentials) {
    return request('/auth/login', { method: 'POST', body: { role, ...credentials } });
  },
  registerMember(payload) {
    return request('/auth/register', { method: 'POST', body: payload });
  },
  forgotPassword(payload) {
    return request('/auth/forgot-password', { method: 'POST', body: payload });
  },
  resetPassword(payload) {
    return request('/auth/reset-password', { method: 'POST', body: payload });
  },
};

export const accountsApi = {
  getProfile(session) {
    const path = session.role === 'trainer' ? '/trainers/me' : '/members/me';
    return request(path, { token: session.token });
  },
  updateProfile(session, payload) {
    const path = session.role === 'trainer' ? '/trainers/me' : '/members/me';
    return request(path, { method: 'PATCH', token: session.token, body: payload });
  },
  updateAvatar(session, avatar) {
    return this.updateProfile(session, { avatar });
  },
  listMembers(session) {
    return request('/members', { token: session.token });
  },
  listTrainers(session) {
    return request('/trainers', { token: session.token });
  },
  listMemberDirectory(session) {
    return request('/members/directory', { token: session.token });
  },
  listTrainerDirectory(session) {
    return request('/trainers/directory', { token: session.token });
  },
  createMember(session, payload) {
    return request('/members', { method: 'POST', token: session.token, body: payload });
  },
  deleteMember(session, memberId) {
    return request(`/members/${memberId}`, { method: 'DELETE', token: session.token });
  },
  memberInvoice(session, memberId, month) {
    return request(`/members/${memberId}/invoice?month=${encodeURIComponent(month)}`, { token: session.token });
  },
  async downloadInvoicePdf(session, month, memberId) {
    const path = memberId ? `/members/${memberId}/invoice` : '/members/me/invoice';
    const query = new URLSearchParams({ month, format: 'pdf' });
    const response = await fetch(`${DEFAULT_API_BASE_URL}${path}?${query}`, {
      headers: buildHeaders({ token: session.token }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new ApiError(payload?.error || 'No se pudo descargar la factura', response.status, payload);
    }

    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');

    link.href = url;
    link.download = `factura-${month}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  },
};

export const reservationsApi = {
  list(session) {
    return request('/reservations', { token: session.token });
  },
  create(session, payload) {
    return request('/reservations', { method: 'POST', token: session.token, body: payload });
  },
  availability(session, date, timeSlot) {
    const query = new URLSearchParams({ date, time_slot: timeSlot });
    return request(`/reservations/availability?${query}`, { token: session.token });
  },
  delete(session, reservationId) {
    return request(`/reservations/${reservationId}`, { method: 'DELETE', token: session.token });
  },
  update(session, reservationId, payload) {
    return request(`/reservations/${reservationId}`, { method: 'PATCH', token: session.token, body: payload });
  },
  cancel(session, reservationId) {
    return request(`/reservations/${reservationId}/cancel`, { method: 'POST', token: session.token });
  },
  reschedule(session, reservationId, payload) {
    return request(`/reservations/${reservationId}/reschedule`, { method: 'POST', token: session.token, body: payload });
  },
  checkinCode(session, reservationId) {
    return request(`/reservations/${reservationId}/checkin-code`, { token: session.token });
  },
  checkin(session, code) {
    return request('/reservations/checkin', { method: 'POST', token: session.token, body: { code } });
  },
};

export const waitlistApi = {
  list(session) {
    return request('/waitlist', { token: session.token });
  },
  join(session, payload) {
    return request('/waitlist', { method: 'POST', token: session.token, body: payload });
  },
  leave(session, waitlistId) {
    return request(`/waitlist/${waitlistId}`, { method: 'DELETE', token: session.token });
  },
};

export const billingApi = {
  subscription(session) {
    return request('/billing/subscription', { token: session.token });
  },
  invoices(session) {
    return request('/billing/invoices', { token: session.token });
  },
  checkout(session, plan) {
    return request('/billing/checkout', { method: 'POST', token: session.token, body: { plan } });
  },
  portal(session) {
    return request('/billing/portal', { method: 'POST', token: session.token });
  },
  packs(session) {
    return request('/billing/packs', { token: session.token });
  },
  packCheckout(session, pack) {
    return request('/billing/packs/checkout', { method: 'POST', token: session.token, body: { pack } });
  },
};

export const highlightsApi = {
  get(session) {
    return request('/highlights', { token: session.token });
  },
  update(session, payload) {
    return request('/highlights', { method: 'PATCH', token: session.token, body: payload });
  },
};

export { ApiError, DEFAULT_API_BASE_URL };