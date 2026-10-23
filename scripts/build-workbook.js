require('dotenv').config();
const path = require('path');
const ExcelJS = require('exceljs');
const { dataDirectory, loadCsv } = require('./loadCsv');

const workbookPath = path.join(dataDirectory, 'noxfit-data.xlsx');
const collections = [
  { fileName: 'members.csv', sheetName: 'members' },
  { fileName: 'trainers.csv', sheetName: 'trainers' },
  { fileName: 'reservations.csv', sheetName: 'reservations' },
];

const buildWorkbook = async () => {
  const workbook = new ExcelJS.Workbook();

  for (const collection of collections) {
    const rows = await loadCsv(collection.fileName);
    const worksheet = workbook.addWorksheet(collection.sheetName);
    const headers = rows.length ? Object.keys(rows[0]) : [];

    worksheet.columns = headers.map((header) => ({ header, key: header }));
    rows.forEach((row) => worksheet.addRow(row));
  }

  await workbook.xlsx.writeFile(workbookPath);
  console.log(`Workbook created at ${workbookPath}`);
};

if (require.main === module) {
  buildWorkbook().catch((error) => {
    console.error('Error creating workbook:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { buildWorkbook };