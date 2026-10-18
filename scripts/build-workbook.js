require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const xlsx = require('xlsx');

const dataDirectory = path.join(__dirname, '..', 'data');
const workbookPath = path.join(dataDirectory, 'noxfit-data.xlsx');
const collections = [
  { fileName: 'members.csv', sheetName: 'members' },
  { fileName: 'trainers.csv', sheetName: 'trainers' },
  { fileName: 'reservations.csv', sheetName: 'reservations' },
];

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

const buildWorkbook = async () => {
  const workbook = xlsx.utils.book_new();

  for (const collection of collections) {
    const rows = await loadCsv(collection.fileName);
    const worksheet = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(workbook, worksheet, collection.sheetName);
  }

  xlsx.writeFile(workbook, workbookPath);
  console.log(`Workbook created at ${workbookPath}`);
};

if (require.main === module) {
  buildWorkbook().catch((error) => {
    console.error('Error creating workbook:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { buildWorkbook };