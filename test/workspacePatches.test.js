const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = () => import(pathToFileURL(path.join(__dirname, '../frontend/src/lib/workspacePatches.js')));

const entry = (id, position, slot = '10:00 - 11:00') => ({
  waitlist_id: id,
  position,
  date: '2026-12-01T00:00:00.000Z',
  time_slot: slot,
  trainer: { trainer_id: 'T1' },
});

test('removeWaitlistEntry moves later entries of the same slot up', async () => {
  const { removeWaitlistEntry } = await load();
  const result = removeWaitlistEntry([entry('W1', 1), entry('W2', 2), entry('W3', 1, '12:00 - 13:00')], 'W1');

  assert.deepEqual(result.map((item) => [item.waitlist_id, item.position]), [['W2', 1], ['W3', 1]]);
});

test('hasWaitingFor only matches reservations of a slot with people waiting', async () => {
  const { hasWaitingFor } = await load();
  const workspace = { waitlist: [entry('W1', 1)] };
  const reservation = (slot) => ({ trainer: { trainer_id: 'T1' }, date: '2026-12-01T00:00:00.000Z', time_slot: slot });

  assert.equal(hasWaitingFor(workspace, reservation('10:00 - 11:00')), true);
  assert.equal(hasWaitingFor(workspace, reservation('12:00 - 13:00')), false);
  assert.equal(hasWaitingFor(workspace, undefined), false);
});

test('upsert replaces existing items and appends new ones', async () => {
  const { upsert } = await load();
  const list = [{ id: 1, v: 'a' }];

  assert.deepEqual(upsert(list, { id: 1, v: 'b' }, 'id'), [{ id: 1, v: 'b' }]);
  assert.deepEqual(upsert(list, { id: 2, v: 'c' }, 'id'), [{ id: 1, v: 'a' }, { id: 2, v: 'c' }]);
});

test('adjustCredits never goes below zero and ignores a zero delta', async () => {
  const { adjustCredits } = await load();
  const profile = { session_credits: 0 };

  assert.equal(adjustCredits(profile, 0), profile);
  assert.equal(adjustCredits(profile, -1).session_credits, 0);
  assert.equal(adjustCredits(profile, 1).session_credits, 1);
});

test('syncReservationOwner updates the embedded snapshot only for the matching account', async () => {
  const { syncReservationOwner } = await load();
  const reservations = [
    { trainer: { trainer_id: 'T1', full_name: 'Old' } },
    { trainer: { trainer_id: 'T2', full_name: 'Other' } },
  ];
  const result = syncReservationOwner(reservations, 'trainer', 'trainer_id', { trainer_id: 'T1', full_name: 'New', email: 'x' });

  assert.equal(result[0].trainer.full_name, 'New');
  assert.equal('email' in result[0].trainer, false);
  assert.equal(result[1], reservations[1]);
});
