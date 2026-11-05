require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const ExcelJS = require('exceljs');

const Member = require('../src/models/members');
const Trainer = require('../src/models/trainers');
const Reservation = require('../src/models/reservations');
const Waitlist = require('../src/models/waitlist');
const connectToDatabase = require('../src/config/database');
const { hashPassword } = require('../src/config/auth');
const { normalizeDateOnly } = require('../src/config/validation');
const { dataDirectory, loadCsv } = require('./loadCsv');

const DEFAULT_SEED_PASSWORD = process.env.SEED_DEFAULT_PASSWORD;
const ADMIN_TRAINER_ID = process.env.SEED_ADMIN_TRAINER_ID || '843d66cb-b0bf-4655-919f-01081bf4da2d';
const DEFAULT_WORKBOOK_PATH = path.join(dataDirectory, 'noxfit-data.xlsx');
const ACTIVITY_TYPE_NORMALIZATION = {
  'Entenamiento Funcinal': 'Entrenamiento Funcional'
};

const cleanText = (value) => (typeof value === 'string' ? value.trim() : '');

const mergeMissingField = (rows, csvRows, identifierField, field) => {
  const valueByIdentifier = new Map(
    csvRows
      .filter((row) => row[identifierField] && cleanText(row[field]))
      .map((row) => [String(row[identifierField]).trim(), cleanText(row[field])])
  );

  return rows.map((row) => {
    if (cleanText(row[field])) {
      return row;
    }

    const value = valueByIdentifier.get(String(row[identifierField] ?? '').trim());

    return value ? { ...row, [field]: value } : row;
  });
};

const buildPasswordHashResolver = async () => {
  const cache = new Map();

  return async (rawPassword) => {
    const normalizedPassword = cleanText(rawPassword) || DEFAULT_SEED_PASSWORD;

    if (!normalizedPassword) {
      throw new Error('A row has no password and SEED_DEFAULT_PASSWORD is not set');
    }

    if (!cache.has(normalizedPassword)) {
      cache.set(normalizedPassword, await hashPassword(normalizedPassword));
    }

    return cache.get(normalizedPassword);
  };
};

const resolveAdminTrainerId = (trainerRows) => {
  if (!trainerRows.length) {
    throw new Error('No trainers were found in the CSV, so an admin cannot be assigned');
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

const parseDate = (value, { normalizeDate = false } = {}) => {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return normalizeDate ? normalizeDateOnly(parsed) : parsed;
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

const loadWorkbookRows = async (workbookPath, sheetName) => {
  if (!fs.existsSync(workbookPath)) {
    throw new Error(`The workbook ${path.basename(workbookPath)} was not found in data/`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const worksheet = workbook.getWorksheet(sheetName);

  if (!worksheet) {
    throw new Error(`The workbook sheet ${sheetName} was not found in ${path.basename(workbookPath)}`);
  }

  const headers = [];
  worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, column) => {
    headers[column] = cell.text;
  });

  const rows = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const item = {};

    headers.forEach((header, column) => {
      if (header) {
        item[header] = row.getCell(column).text;
      }
    });

    rows.push(item);
  });

  return rows;
};

const resolveSeedWorkbookPath = () => {
  const configuredWorkbook = process.env.SEED_WORKBOOK_PATH;

  if (configuredWorkbook) {
    return path.isAbsolute(configuredWorkbook)
      ? configuredWorkbook
      : path.join(dataDirectory, configuredWorkbook);
  }

  return fs.existsSync(DEFAULT_WORKBOOK_PATH) ? DEFAULT_WORKBOOK_PATH : null;
};

const loadSeedRows = async () => {
  const workbookPath = resolveSeedWorkbookPath();

  if (workbookPath) {
    const [memberCsvRows, trainerCsvRows] = await Promise.all([
      loadCsv('members.csv'),
      loadCsv('trainers.csv'),
    ]);

    const [workbookMemberRows, workbookTrainerRows, workbookReservationRows] = await Promise.all([
      loadWorkbookRows(workbookPath, 'members'),
      loadWorkbookRows(workbookPath, 'trainers'),
      loadWorkbookRows(workbookPath, 'reservations'),
    ]);

    return {
      sourceLabel: `Excel workbook (${path.basename(workbookPath)})`,
      rows: [
        mergeMissingField(workbookMemberRows, memberCsvRows, 'member_id', 'password'),
        mergeMissingField(
          mergeMissingField(workbookTrainerRows, trainerCsvRows, 'trainer_id', 'password'),
          trainerCsvRows,
          'trainer_id',
          'center'
        ),
        workbookReservationRows,
      ],
    };
  }

  return {
    sourceLabel: 'CSV files',
    rows: await Promise.all([
      loadCsv('members.csv'),
      loadCsv('trainers.csv'),
      loadCsv('reservations.csv')
    ]),
  };
};

const buildLookupMap = (items, fieldName) => new Map(
  items.map((item) => [item[fieldName], item])
);

const RESET_REQUESTED = process.argv.includes('--reset') || process.env.SEED_RESET === 'true';

const clearCollections = async () => {
  await Promise.all([Reservation.deleteMany({}), Waitlist.deleteMany({})]);
  await Promise.all([
    Member.deleteMany({}),
    Trainer.deleteMany({}),
  ]);
};

const withoutUndefined = (document) => Object.fromEntries(
  Object.entries(document).filter(([, value]) => value !== undefined)
);

const SET_ON_INSERT_FIELDS = [
  'password_hash',
  'subscription_status',
  'subscription_current_period_end',
  'subscription_cancel_at_period_end',
];

const upsertDocuments = async (Model, identifierField, documents) => {
  await Model.bulkWrite(documents.map((document) => {
    const fields = withoutUndefined(document);
    const setOnInsert = {};

    for (const field of SET_ON_INSERT_FIELDS) {
      if (field in fields) {
        setOnInsert[field] = fields[field];
        delete fields[field];
      }
    }

    const update = { $set: fields };

    if (Object.keys(setOnInsert).length) {
      update.$setOnInsert = setOnInsert;
    }

    return {
      updateOne: {
        filter: { [identifierField]: document[identifierField] },
        update,
        upsert: true,
      },
    };
  }));

  return Model.find({ [identifierField]: { $in: documents.map((document) => document[identifierField]) } });
};

const createAccountsPayload = async (memberRows, trainerRows) => {
  const resolvePasswordHash = await buildPasswordHashResolver();
  const adminTrainerId = resolveAdminTrainerId(trainerRows);

  return {
    adminTrainerId,
    members: await mapMembers(memberRows, resolvePasswordHash),
    trainers: await mapTrainers(trainerRows, resolvePasswordHash, adminTrainerId),
  };
};

const insertAccounts = async (members, trainers) => {
  if (!RESET_REQUESTED) {
    return {
      insertedMembers: await upsertDocuments(Member, 'member_id', members),
      insertedTrainers: await upsertDocuments(Trainer, 'trainer_id', trainers),
    };
  }

  const [insertedMembers, insertedTrainers] = await Promise.all([
    Member.insertMany(members),
    Trainer.insertMany(trainers),
  ]);

  return { insertedMembers, insertedTrainers };
};

const logSeedSummary = ({ insertedMembers, insertedTrainers, reservations, adminTrainerId, sourceLabel }) => {
  console.log(`Seed source: ${sourceLabel}`);
  console.log(RESET_REQUESTED ? 'Mode: reset (all existing data deleted)' : 'Mode: upsert (existing data kept)');
  console.log(`Members synced: ${insertedMembers.length}`);
  console.log(`Trainers synced: ${insertedTrainers.length}`);
  console.log(`Reservations synced: ${reservations.length}`);
  console.log(`Initial admin trainer: ${adminTrainerId}`);
};

const parseActive = (value) => (value === undefined || value === '' ? true : parseBoolean(value));

const DAY_MS = 24 * 60 * 60 * 1000;

const buildSeedSubscription = (index) => ({
  subscription_status: index % 7 === 3 ? 'trialing' : 'active',
  subscription_current_period_end: new Date(Date.now() + (5 + ((index * 7) % 26)) * DAY_MS),
  subscription_cancel_at_period_end: index % 5 === 4,
});

const mapMembers = (rows, resolvePasswordHash) => Promise.all(rows.map(async (row, index) => ({
  member_id: row.member_id,
  full_name: row.full_name,
  email: row.email,
  password_hash: await resolvePasswordHash(row.password),
  phone: row.phone || undefined,
  membership_type: row.membership_type || undefined,
  join_date: parseDate(row.join_date, { normalizeDate: true }),
  ...buildSeedSubscription(index),
  active: parseActive(row.active)
})));

const mapTrainers = (rows, resolvePasswordHash, adminTrainerId) => Promise.all(rows.map(async (row) => ({
  trainer_id: row.trainer_id,
  full_name: row.full_name,
  email: row.email,
  password_hash: await resolvePasswordHash(row.password),
  activity_type: normalizeActivityType(row.activity_type),
  center: row.center || undefined,
  phone: row.phone || undefined,
  years_experience: parseNumber(row.years_experience),
  hourly_rate: parseNumber(row.hourly_rate),
  bio: row.bio || undefined,
  is_admin: row.trainer_id === adminTrainerId,
  bootstrap_admin: row.trainer_id === adminTrainerId,
  active: parseActive(row.active)
})));

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
    center: row.center || trainer.center,
    date: parseDate(row.date, { normalizeDate: true }),
    time_slot: normalizeTimeSlot(row.time_slot),
    status: row.status || undefined,
    price: parseNumber(row.price)
  };
});

const seed = async () => {
  await connectToDatabase();

  try {
    const { sourceLabel, rows: [memberRows, trainerRows, reservationRows] } = await loadSeedRows();
    const { adminTrainerId, members, trainers } = await createAccountsPayload(memberRows, trainerRows);

    if (RESET_REQUESTED) {
      await clearCollections();
    }

    const { insertedMembers, insertedTrainers } = await insertAccounts(members, trainers);

    const membersById = buildLookupMap(insertedMembers, 'member_id');
    const trainersById = buildLookupMap(insertedTrainers, 'trainer_id');
    const reservations = mapReservations(reservationRows, membersById, trainersById);

    if (RESET_REQUESTED) {
      await Reservation.insertMany(reservations);
    } else {
      await Reservation.bulkWrite(reservations.map((reservation) => ({
        updateOne: {
          filter: { reservation_id: reservation.reservation_id },
          update: { $set: withoutUndefined(reservation) },
          upsert: true,
        },
      })));
    }

    logSeedSummary({ insertedMembers, insertedTrainers, reservations, adminTrainerId, sourceLabel });
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