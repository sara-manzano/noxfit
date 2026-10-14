require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');

const Member = require('../src/models/members');
const Trainer = require('../src/models/trainers');
const Reservation = require('../src/models/reservations');
const connectToDatabase = require('../src/config/database');
const { hashPassword } = require('../src/config/auth');

const dataDirectory = path.join(__dirname, '..', 'data');
const DEFAULT_SEED_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'Noxfit123';
const ADMIN_TRAINER_ID = process.env.SEED_ADMIN_TRAINER_ID;
const ACTIVITY_TYPE_NORMALIZATION = {
  'Entenamiento Funcinal': 'Entrenamiento Funcional'
};

const resolveAdminTrainerId = (trainerRows) => {
  if (!trainerRows.length) {
    throw new Error('No trainers were found in the CSV, so an admin cannot be assigned');
  }

  if (!ADMIN_TRAINER_ID) {
    return trainerRows[0].trainer_id;
  }

  const exists = trainerRows.some((row) => row.trainer_id === ADMIN_TRAINER_ID);

  if (!exists) {
    throw new Error(`The trainer_id ${ADMIN_TRAINER_ID} does not exist in trainers.csv`);
  }

  return ADMIN_TRAINER_ID;
};

const parseBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  return String(value).trim().toLowerCase() === 'true';
};

const parseNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const normalized = typeof value === 'string'
    ? value.trim().replace(/€/g, '').replace(/\s+/g, '').replace(',', '.')
    : value;

  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const parseDate = (value) => {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const normalizeActivityType = (value) => {
  if (!value) {
    return undefined;
  }

  return ACTIVITY_TYPE_NORMALIZATION[value] || value;
};

const toMinutes = (value) => {
  const match = /^(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return undefined;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    return undefined;
  }

  return (hours * 60) + minutes;
};

const normalizeTimeSlot = (value) => {
  if (!value) {
    return undefined;
  }

  const [rawStart, rawEnd] = value.split(' - ').map((entry) => entry.trim());

  if (!rawStart || !rawEnd) {
    return undefined;
  }

  const startMinutes = toMinutes(rawStart);
  const endMinutes = toMinutes(rawEnd);

  if (startMinutes === undefined || endMinutes === undefined) {
    return undefined;
  }

  if (startMinutes === endMinutes) {
    return undefined;
  }

  return startMinutes < endMinutes
    ? `${rawStart} - ${rawEnd}`
    : `${rawEnd} - ${rawStart}`;
};

const loadCsv = (fileName) => {
  const filePath = path.join(dataDirectory, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`The file ${fileName} was not found in data/`);
  }

  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
};

const loadSeedRows = () => Promise.all([
  loadCsv('members.csv'),
  loadCsv('trainers.csv'),
  loadCsv('reservations.csv')
]);

const buildLookupMap = (items, fieldName) => new Map(
  items.map((item) => [item[fieldName], item])
);

const clearCollections = async () => {
  await Reservation.deleteMany({});
  await Promise.all([
    Member.deleteMany({}),
    Trainer.deleteMany({}),
  ]);
};

const createAccountsPayload = async (memberRows, trainerRows) => {
  const passwordHash = await hashPassword(DEFAULT_SEED_PASSWORD);
  const adminTrainerId = resolveAdminTrainerId(trainerRows);

  return {
    adminTrainerId,
    members: mapMembers(memberRows, passwordHash),
    trainers: mapTrainers(trainerRows, passwordHash, adminTrainerId),
  };
};

const insertAccounts = async (members, trainers) => {
  const [insertedMembers, insertedTrainers] = await Promise.all([
    Member.insertMany(members),
    Trainer.insertMany(trainers),
  ]);

  return { insertedMembers, insertedTrainers };
};

const logSeedSummary = ({ insertedMembers, insertedTrainers, reservations, adminTrainerId }) => {
  console.log(`Members inserted: ${insertedMembers.length}`);
  console.log(`Trainers inserted: ${insertedTrainers.length}`);
  console.log(`Reservations inserted: ${reservations.length}`);
  console.log(`Initial admin trainer: ${adminTrainerId}`);
};

const mapMembers = (rows, passwordHash) => rows.map((row) => ({
  member_id: row.member_id,
  full_name: row.full_name,
  email: row.email,
  password_hash: passwordHash,
  phone: row.phone || undefined,
  membership_type: row.membership_type || undefined,
  join_date: parseDate(row.join_date),
  active: row.active === undefined || row.active === '' ? true : parseBoolean(row.active)
}));

const mapTrainers = (rows, passwordHash, adminTrainerId) => rows.map((row) => ({
  trainer_id: row.trainer_id,
  full_name: row.full_name,
  email: row.email,
  password_hash: passwordHash,
  activity_type: normalizeActivityType(row.activity_type),
  phone: row.phone || undefined,
  years_experience: parseNumber(row.years_experience),
  hourly_rate: parseNumber(row.hourly_rate),
  is_admin: row.trainer_id === adminTrainerId,
  active: row.active === undefined || row.active === '' ? true : parseBoolean(row.active)
}));

const mapReservations = (rows, membersById, trainersById) => rows.map((row) => {
  const member = membersById.get(row.member_id);
  const trainer = trainersById.get(row.trainer_id);

  if (!member) {
    throw new Error(`Member ${row.member_id} does not exist for reservation ${row.reservation_id}`);
  }

  if (!trainer) {
    throw new Error(`Trainer ${row.trainer_id} does not exist for reservation ${row.reservation_id}`);
  }

  return {
    reservation_id: row.reservation_id,
    member: member._id,
    trainer: trainer._id,
    activity_type: normalizeActivityType(row.activity_type),
    date: parseDate(row.date),
    time_slot: normalizeTimeSlot(row.time_slot),
    status: row.status || undefined,
    price: parseNumber(row.price)
  };
});

const seed = async () => {
  await connectToDatabase();

  try {
    const [memberRows, trainerRows, reservationRows] = await loadSeedRows();
    const { adminTrainerId, members, trainers } = await createAccountsPayload(memberRows, trainerRows);

    await clearCollections();

    const { insertedMembers, insertedTrainers } = await insertAccounts(members, trainers);

    const membersById = buildLookupMap(insertedMembers, 'member_id');
    const trainersById = buildLookupMap(insertedTrainers, 'trainer_id');
    const reservations = mapReservations(reservationRows, membersById, trainersById);

    await Reservation.insertMany(reservations);

    logSeedSummary({ insertedMembers, insertedTrainers, reservations, adminTrainerId });
  } finally {
    await mongoose.connection.close();
  }
};

if (require.main === module) {
  seed()
    .then(() => {
      console.log('Seed completed.');
    })
    .catch((error) => {
      console.error('Error running seed:', error.message);
      process.exitCode = 1;
    });
}

module.exports = { seed };