const sendCollection = (res, items, statusCode = 200) => res.status(statusCode).json({
  items,
  total: items.length,
});

const sendItem = (res, item, statusCode = 200) => res.status(statusCode).json(item);

const sendNoContent = (res) => res.status(204).send();

const sendError = (res, statusCode, message) => res.status(statusCode).json({ error: message });

module.exports = {
  sendCollection,
  sendItem,
  sendNoContent,
  sendError,
};