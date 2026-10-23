require('dotenv').config();
const path = require('path');
const xlsx = require('xlsx');
const { dataDirectory, loadCsv } = require('./loadCsv');

const workbookPath = path.join(dataDirectory, 'noxfit-data.xlsx');
const collections = [
  { fileName: 'members.csv', sheetName: 'members' },
  { fileName: 'trainers.csv', sheetName: 'trainers' },
  { fileName: 'reservations.csv', sheetName: 'reservations' },
];

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