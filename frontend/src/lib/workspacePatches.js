const dayOf = (value) => new Date(value).toISOString().slice(0, 10);

export const slotKey = (entry) => `${entry.trainer?.trainer_id}|${dayOf(entry.date)}|${entry.time_slot}`;

export const hasWaitingFor = (workspace, ...reservations) => reservations.some(
  (reservation) => reservation && workspace.waitlist.some((entry) => slotKey(entry) === slotKey(reservation))
);

export const findById = (list, key, id) => list.find((item) => item[key] === id);

export const upsert = (list, item, key) => (
  list.some((entry) => entry[key] === item[key])
    ? list.map((entry) => (entry[key] === item[key] ? item : entry))
    : [...list, item]
);

export const mergeById = (list, item, key) => list.map(
  (entry) => (entry[key] === item[key] ? { ...entry, ...item } : entry)
);

// Reservations embed a snapshot of their member/trainer; keep it in sync after a profile edit
export const syncReservationOwner = (reservations, field, key, updated) => reservations.map((reservation) => {
  const owner = reservation[field];

  if (owner?.[key] !== updated[key]) {
    return reservation;
  }

  const changes = Object.fromEntries(Object.keys(owner).filter((name) => name in updated).map((name) => [name, updated[name]]));

  return { ...reservation, [field]: { ...owner, ...changes } };
});

export const removeById = (list, key, id) => list.filter((item) => item[key] !== id);

export const sortReservations = (reservations) => [...reservations].sort(
  (a, b) => new Date(a.date) - new Date(b.date) || String(a.time_slot).localeCompare(String(b.time_slot))
);

export const sortByName = (accounts) => [...accounts].sort(
  (a, b) => String(a.full_name).localeCompare(String(b.full_name), 'es')
);

export const adjustCredits = (profile, delta) => (
  profile && delta ? { ...profile, session_credits: Math.max(0, (profile.session_credits || 0) + delta) } : profile
);

// Entries behind the one that leaves move up one place
export const removeWaitlistEntry = (waitlist, waitlistId) => {
  const removed = findById(waitlist, 'waitlist_id', waitlistId);

  return waitlist
    .filter((entry) => entry.waitlist_id !== waitlistId)
    .map((entry) => (
      removed && slotKey(entry) === slotKey(removed) && entry.position > removed.position
        ? { ...entry, position: entry.position - 1 }
        : entry
    ));
};
