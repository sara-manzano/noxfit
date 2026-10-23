const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

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
  updateAvatar(session, avatar) {
    const path = session.role === 'trainer' ? '/trainers/me' : '/members/me';
    return request(path, { method: 'PATCH', token: session.token, body: { avatar } });
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
  createTrainer(session, payload) {
    return request('/trainers', { method: 'POST', token: session.token, body: payload });
  },
  deleteMember(session, memberId) {
    return request(`/members/${memberId}`, { method: 'DELETE', token: session.token });
  },
  deleteTrainer(session, trainerId) {
    return request(`/trainers/${trainerId}`, { method: 'DELETE', token: session.token });
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
};

export { ApiError, DEFAULT_API_BASE_URL };