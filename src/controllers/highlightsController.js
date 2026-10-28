const {
  Highlights,
  HIGHLIGHT_SECTIONS,
  HIGHLIGHT_TITLE_MAX,
  HIGHLIGHT_TEXT_MAX,
  HIGHLIGHT_MAX_ITEMS,
  DEFAULT_HIGHLIGHTS,
} = require('../models/highlights');
const { createStatusError } = require('../http/errors');
const { sendItem } = require('../http/responses');

const serialize = (document) => Object.fromEntries(
  HIGHLIGHT_SECTIONS.map((section) => [
    section,
    (document?.[section] ?? DEFAULT_HIGHLIGHTS[section]).map(({ title, text }) => ({ title, text })),
  ])
);

const sanitizeEntry = (entry, section) => {
  if (!entry || typeof entry.title !== 'string' || typeof entry.text !== 'string') {
    throw createStatusError(`${section} entries require string title and text`, 400);
  }

  const title = entry.title.trim();
  const text = entry.text.trim();

  if (!title || !text) {
    throw createStatusError(`${section} entries cannot have an empty title or text`, 400);
  }

  if (title.length > HIGHLIGHT_TITLE_MAX || text.length > HIGHLIGHT_TEXT_MAX) {
    throw createStatusError(
      `${section} entries allow up to ${HIGHLIGHT_TITLE_MAX} title and ${HIGHLIGHT_TEXT_MAX} text characters`,
      400
    );
  }

  return { title, text };
};

const sanitizePayload = (body) => {
  const update = {};

  for (const section of HIGHLIGHT_SECTIONS) {
    if (body[section] === undefined) {
      continue;
    }

    if (!Array.isArray(body[section]) || body[section].length > HIGHLIGHT_MAX_ITEMS) {
      throw createStatusError(`${section} must be an array with at most ${HIGHLIGHT_MAX_ITEMS} entries`, 400);
    }

    update[section] = body[section].map((entry) => sanitizeEntry(entry, section));
  }

  if (!Object.keys(update).length) {
    throw createStatusError('At least one of news, activities or promotions is required', 400);
  }

  return update;
};

const getHighlights = async (_req, res) => sendItem(res, serialize(await Highlights.findOne({ key: 'main' }).lean()));

const updateHighlights = async (req, res) => {
  const update = sanitizePayload(req.body);
  const document = await Highlights.findOneAndUpdate(
    { key: 'main' },
    { $set: update },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();

  return sendItem(res, serialize(document));
};

module.exports = { getHighlights, updateHighlights };
