const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildSlotFilter,
  ensureNoReservationConflicts,
  getTrainerSlotStatus,
} = require('../src/controllers/reservationConflicts');
const { normalizeDateOnly } = require('../src/config/validation');

const createReservationModelStub = ({ member = null, trainerSlot = [] } = {}, onQuery) => ({
  findOne(filter) {
    onQuery?.(filter);

    return {
      select() {
        return this;
      },
      lean: async () => member,
    };
  },
  find(filter) {
    onQuery?.(filter);

    return {
      select() {
        return this;
      },
      lean: async () => trainerSlot,
    };
  },
});

const baseReservation = {
  trainer: 'trainer-1',
  member: 'member-1',
  date: '2026-10-14',
  time_slot: '10:00 - 11:00',
  activity_type: 'CrossFit',
  status: 'Confirmada',
};

const rejectsWith = (promise, message) => assert.rejects(promise, (error) => {
  assert.equal(error.statusCode, 409);
  assert.equal(error.message, message);
  return true;
});

test('normalizeDateOnly normalizes to UTC midnight', () => {
  const date = normalizeDateOnly('2026-10-14T18:45:00.000Z');

  assert.equal(date.toISOString(), '2026-10-14T00:00:00.000Z');
});

test('buildSlotFilter creates an active reservation slot query', () => {
  const filter = buildSlotFilter({
    reservation_id: 'reservation-1',
    date: '2026-10-14T18:45:00.000Z',
    time_slot: '10:00 - 11:00',
  });

  assert.deepEqual(filter, {
    reservation_id: { $ne: 'reservation-1' },
    date: new Date('2026-10-14T00:00:00.000Z'),
    time_slot: '10:00 - 11:00',
    status: { $in: ['Confirmada', 'Completada'] },
  });
});

test('getTrainerSlotStatus reports a trainer with a personal training as unavailable', () => {
  const status = getTrainerSlotStatus([{ activity_type: 'Entrenamiento Personal' }]);

  assert.deepEqual(status, {
    reservations_count: 1,
    has_personal_training: true,
    spots_left: 0,
    available: false,
  });
});

test('getTrainerSlotStatus allows up to 12 reservations per slot', () => {
  const slot = (count) => Array.from({ length: count }, () => ({ activity_type: 'CrossFit' }));

  assert.equal(getTrainerSlotStatus(slot(11)).available, true);
  assert.equal(getTrainerSlotStatus(slot(11)).spots_left, 1);
  assert.equal(getTrainerSlotStatus(slot(12)).available, false);
  assert.equal(getTrainerSlotStatus(slot(12)).spots_left, 0);
});

test('ensureNoReservationConflicts skips the query for cancelled reservations', async () => {
  let called = false;
  const ReservationModel = createReservationModelStub({}, () => {
    called = true;
  });

  await ensureNoReservationConflicts(ReservationModel, { ...baseReservation, status: 'Cancelada' });

  assert.equal(called, false);
});

test('ensureNoReservationConflicts rejects a trainer with a personal training in the slot', async () => {
  const ReservationModel = createReservationModelStub({
    trainerSlot: [{ activity_type: 'Entrenamiento personal' }],
  });

  await rejectsWith(
    ensureNoReservationConflicts(ReservationModel, baseReservation),
    'Trainer is not available for that time slot'
  );
});

test('ensureNoReservationConflicts rejects a personal training when the slot already has reservations', async () => {
  const ReservationModel = createReservationModelStub({
    trainerSlot: [{ activity_type: 'CrossFit' }],
  });

  await rejectsWith(
    ensureNoReservationConflicts(ReservationModel, { ...baseReservation, activity_type: 'Entrenamiento personal' }),
    'Trainer is not available for personal training in that time slot'
  );
});

test('ensureNoReservationConflicts rejects the 13th reservation in a slot', async () => {
  const ReservationModel = createReservationModelStub({
    trainerSlot: Array.from({ length: 12 }, () => ({ activity_type: 'CrossFit' })),
  });

  await rejectsWith(
    ensureNoReservationConflicts(ReservationModel, baseReservation),
    'Trainer has no spots left for that time slot'
  );
});

test('ensureNoReservationConflicts rejects a member who already has a reservation in the slot', async () => {
  const ReservationModel = createReservationModelStub({ member: { _id: 'reservation-1' } });

  await rejectsWith(
    ensureNoReservationConflicts(ReservationModel, { ...baseReservation, status: 'Completada' }),
    'Member already has a reservation for that time slot'
  );
});

test('ensureNoReservationConflicts allows the operation when there is no conflict', async () => {
  const ReservationModel = createReservationModelStub({
    trainerSlot: Array.from({ length: 11 }, () => ({ activity_type: 'CrossFit' })),
  });

  await assert.doesNotReject(
    ensureNoReservationConflicts(ReservationModel, { ...baseReservation, reservation_id: 'reservation-1' })
  );
});