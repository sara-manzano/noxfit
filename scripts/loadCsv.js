const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const dataDirectory = path.join(__dirname, '..', 'data');

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

module.exports = { dataDirectory, loadCsv };
