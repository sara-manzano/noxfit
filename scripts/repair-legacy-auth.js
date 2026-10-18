require('dotenv').config();

const connectToDatabase = require('../src/config/database');
const Member = require('../src/models/members');
const Trainer = require('../src/models/trainers');
const { hashPassword } = require('../src/config/auth');

const DEFAULT_PASSWORD = String(process.env.SEED_DEFAULT_PASSWORD || 'Noxfit123').trim();
const ADMIN_TRAINER_ID = String(process.env.SEED_ADMIN_TRAINER_ID).trim();

const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : email);
const normalizeIdentifier = (value) => (value === undefined || value === null ? value : String(value).trim());

const repairMembers = async (passwordHash) => {
  const members = await Member.find({}).select('+password_hash email member_id').lean();
  let updated = 0;

  for (const member of members) {
    const update = {};
    const normalizedEmail = normalizeEmail(member.email);
    const normalizedMemberId = normalizeIdentifier(member.member_id);

    if (normalizedEmail && normalizedEmail !== member.email) {
      update.email = normalizedEmail;
    }

    if (normalizedMemberId && normalizedMemberId !== member.member_id) {
      update.member_id = normalizedMemberId;
    }

    if (!member.password_hash) {
      update.password_hash = passwordHash;
    }

    if (Object.keys(update).length) {
      await Member.updateOne({ _id: member._id }, { $set: update });
      updated += 1;
    }
  }

  return updated;
};

const repairTrainers = async (passwordHash) => {
  const trainers = await Trainer.find({}).select('+password_hash email trainer_id is_admin').lean();
  let updated = 0;

  for (const trainer of trainers) {
    const update = {};
    const normalizedEmail = normalizeEmail(trainer.email);
    const normalizedTrainerId = normalizeIdentifier(trainer.trainer_id);
    const shouldBeAdmin = Boolean(ADMIN_TRAINER_ID) && normalizedTrainerId === ADMIN_TRAINER_ID;

    if (normalizedEmail && normalizedEmail !== trainer.email) {
      update.email = normalizedEmail;
    }

    if (normalizedTrainerId && normalizedTrainerId !== trainer.trainer_id) {
      update.trainer_id = normalizedTrainerId;
    }

    if (!trainer.password_hash) {
      update.password_hash = passwordHash;
    }

    if (shouldBeAdmin && trainer.is_admin !== true) {
      update.is_admin = true;
    } else if (typeof trainer.is_admin !== 'boolean') {
      update.is_admin = false;
    }

    if (Object.keys(update).length) {
      await Trainer.updateOne({ _id: trainer._id }, { $set: update });
      updated += 1;
    }
  }

  return updated;
};

const main = async () => {
  await connectToDatabase();

  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  const [membersUpdated, trainersUpdated] = await Promise.all([
    repairMembers(passwordHash),
    repairTrainers(passwordHash),
  ]);

  console.log(JSON.stringify({
    database: require('mongoose').connection.name,
    membersUpdated,
    trainersUpdated,
    defaultPasswordApplied: DEFAULT_PASSWORD,
  }, null, 2));
};

main()
  .catch((error) => {
    console.error('Legacy auth repair failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await require('mongoose').disconnect();
  });