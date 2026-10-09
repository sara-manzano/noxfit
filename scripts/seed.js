require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');

const Member = require('../src/models/members');
const Trainer = require('../src/models/trainers');
const Reservation = require('../src/models/reservations');

const dataDirectory = path.join(__dirname, '..', 'data');
const ACTIVITY_TYPE_NORMALIZATION = {
  'Entenamiento Funcinal': 'Entrenamiento Funcional'
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
    throw new Error(`No se encontro el archivo ${fileName} en data/`);
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

const mapMembers = (rows) => rows.map((row) => ({
  member_id: row.member_id,
  full_name: row.full_name,
  email: row.email,
  phone: row.phone || undefined,
  membership_type: row.membership_type || undefined,
  join_date: parseDate(row.join_date),
  active: row.active === undefined || row.active === '' ? true : parseBoolean(row.active)
}));

const mapTrainers = (rows) => rows.map((row) => ({
  trainer_id: row.trainer_id,
  full_name: row.full_name,
  email: row.email,
  activity_type: normalizeActivityType(row.activity_type),
  phone: row.phone || undefined,
  years_experience: parseNumber(row.years_experience),
  hourly_rate: parseNumber(row.hourly_rate),
  active: row.active === undefined || row.active === '' ? true : parseBoolean(row.active)
}));

const mapReservations = (rows, membersById, trainersById) => rows.map((row) => {
  const member = membersById.get(row.member_id);
  const trainer = trainersById.get(row.trainer_id);

  if (!member) {
    throw new Error(`No existe el miembro ${row.member_id} para la reserva ${row.reservation_id}`);
  }

  if (!trainer) {
    throw new Error(`No existe el entrenador ${row.trainer_id} para la reserva ${row.reservation_id}`);
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

const connect = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('The MONGODB_URI environment variable is required to run the seed script.');
  }

  await mongoose.connect(process.env.MONGODB_URI);
};

const seed = async () => {
  await connect();

  try {
    const [memberRows, trainerRows, reservationRows] = await Promise.all([
      loadCsv('members.csv'),
      loadCsv('trainers.csv'),
      loadCsv('reservations.csv')
    ]);

    const members = mapMembers(memberRows);
    const trainers = mapTrainers(trainerRows);

    await Reservation.deleteMany({});
    await Member.deleteMany({});
    await Trainer.deleteMany({});

    const insertedMembers = await Member.insertMany(members);
    const insertedTrainers = await Trainer.insertMany(trainers);

    const membersById = new Map(insertedMembers.map((member) => [member.member_id, member]));
    const trainersById = new Map(insertedTrainers.map((trainer) => [trainer.trainer_id, trainer]));
    const reservations = mapReservations(reservationRows, membersById, trainersById);

    await Reservation.insertMany(reservations);

    console.log(`Inserted members: ${insertedMembers.length}`);
    console.log(`Inserted trainers: ${insertedTrainers.length}`);
    console.log(`Inserted reservations: ${reservations.length}`);
  } finally {
    await mongoose.connection.close();
  }
};

if (require.main === module) {
  seed()
    .then(() => {
      console.log('Seed completed successfully.');
    })
    .catch((error) => {
      console.error('Error executing seed:', error.message);
      process.exitCode = 1;
    });
}

module.exports = { seed };