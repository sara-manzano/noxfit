const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildReservationConflictFilter,
  ensureNoReservationConflicts,
  normalizeReservationDate,
} = require('../src/controllers/reservationConflicts');

const createReservationModelStub = (result, onFilter) => ({
  findOne(filter) {
    onFilter?.(filter);

    return {
      select() {
        return this;
      },
      lean: async () => result,
    };
  },
});

test('normalizeReservationDate normalizes to UTC midnight', () => {
  const date = normalizeReservationDate('2026-10-14T18:45:00.000Z');

  assert.equal(date.toISOString(), '2026-10-14T00:00:00.000Z');
});

test('buildReservationConflictFilter returns null when there is not enough data', () => {
  const filter = buildReservationConflictFilter({
    trainer: 'trainer-1',
    member: 'member-1',
    date: '2026-10-14',
  });

  assert.equal(filter, null);
});

test('buildReservationConflictFilter creates an active reservation conflict query', () => {
  const filter = buildReservationConflictFilter({
    reservation_id: 'reservation-1',
    trainer: 'trainer-1',
    member: 'member-1',
    date: '2026-10-14T18:45:00.000Z',
    time_slot: '10:00 - 11:00',
  });

  assert.deepEqual(filter, {
    reservation_id: { $ne: 'reservation-1' },
    date: new Date('2026-10-14T00:00:00.000Z'),
    time_slot: '10:00 - 11:00',
    status: { $in: ['Confirmada', 'Completada'] },
    $or: [{ trainer: 'trainer-1' }, { member: 'member-1' }],
  });
});

test('ensureNoReservationConflicts skips the query for cancelled reservations', async () => {
  let called = false;
  const ReservationModel = createReservationModelStub(null, () => {
    called = true;
  });

  await ensureNoReservationConflicts(ReservationModel, {
    trainer: 'trainer-1',
    member: 'member-1',
    date: '2026-10-14',
    time_slot: '10:00 - 11:00',
    status: 'Cancelada',
  });

  assert.equal(called, false);
});

test('ensureNoReservationConflicts throws a 409 when the trainer slot is already taken', async () => {
  const ReservationModel = createReservationModelStub({
    trainer: 'trainer-1',
    member: 'member-2',
  });

  await assert.rejects(
    ensureNoReservationConflicts(ReservationModel, {
      trainer: 'trainer-1',
      member: 'member-1',
      date: '2026-10-14',
      time_slot: '10:00 - 11:00',
      status: 'Confirmada',
    }),
    (error) => {
      assert.equal(error.statusCode, 409);
      assert.equal(error.message, 'El entrenador ya esta ocupado en esa franja horaria');
      return true;
    }
  );
});

test('ensureNoReservationConflicts throws a 409 when the member slot is already taken', async () => {
  const ReservationModel = createReservationModelStub({
    trainer: 'trainer-2',
    member: 'member-1',
  });

  await assert.rejects(
    ensureNoReservationConflicts(ReservationModel, {
      trainer: 'trainer-1',
      member: 'member-1',
      date: '2026-10-14',
      time_slot: '10:00 - 11:00',
      status: 'Completada',
    }),
    (error) => {
      assert.equal(error.statusCode, 409);
      assert.equal(error.message, 'El miembro ya tiene una reserva en esa franja horaria');
      return true;
    }
  );
});

test('ensureNoReservationConflicts allows the operation when there is no conflict', async () => {
  const ReservationModel = createReservationModelStub(null);

  await assert.doesNotReject(async () => {
    await ensureNoReservationConflicts(ReservationModel, {
      reservation_id: 'reservation-1',
      trainer: 'trainer-1',
      member: 'member-1',
      date: '2026-10-14',
      time_slot: '10:00 - 11:00',
      status: 'Confirmada',
    });
  });
});