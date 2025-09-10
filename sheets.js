import { GoogleSpreadsheet } from 'google-spreadsheet';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import { GoogleAuth } from 'google-auth-library';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function sheets() {

//     const credentials2 = JSON.parse(
//     await readFile(new URL('credentials.json', import.meta.url), 'utf8')
//   );


    const cred = JSON.parse(process.env.cred);
    cred.private_key = cred.private_key.replace(/\\n/g, '\n')
    const credentials = cred

    console.log(credentials)
  // Initialize the spreadsheet with credentials
  const auth = new GoogleAuth({
  credentials: {
    client_email: credentials.client_email,
    private_key: credentials.private_key.replace(/\\n/g, '\n'), // 🔥 fix for escaped newlines
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Create spreadsheet instance with auth
const doc = new GoogleSpreadsheet(
  '1A3X83V3N1mrEarz-KCulb4uy53OiJcPgQUJnDHg1Bpk',
  auth
);

// Load document
await doc.loadInfo();
console.log(`Loaded: ${doc.title}`);

const sheet = doc.sheetsByIndex[0];

  return sheet;

}

async function getUniqueData (index, rows) {
  const colIndex = index;
  const values = rows.slice(2).map(r => r._rawData[colIndex]).filter(Boolean);

  // get unique values
  const uniqueNames = [...new Set(values)];
  return uniqueNames
}

export async function readSheet() {
  const sheet = await sheets();
  const rows = await sheet.getRows({ headerRowIndex: 0 }); // disables header mapping
  return rows;

}

export async function getAllUniqueData() {
    const rows = await readSheet();
    const collegeNames = await getUniqueData(2, rows);
    const district = await getUniqueData(3, rows);
    const university = await getUniqueData(4, rows);
    const departments = await getUniqueData(5, rows);
    console.log(district)
    return {
        collegeNames,
        district,
        university,
        departments
    }
}
function getRandomColor() {
  const r = Math.floor(Math.random() * 255);
  const g = Math.floor(Math.random() * 255);
  const b = Math.floor(Math.random() * 255);

  return `rgba(${r}, ${g}, ${b}, 0.6)`; // semi-transparent fill
}

export async function prepareChartData(filters = {}) {
  const sheet = await readSheet();
  const rows = sheet.slice(3);

  const weekStartIndex = 9;
  const collegeIndex = 2;
  const districtIndex = 3;
  const universityIndex = 4;
  const departmentIndex = 5;

  // === Apply filters ===
  let filteredRows = rows;
  if (filters.college && filters.college !== "All") {
    filteredRows = filteredRows.filter(r => r._rawData[collegeIndex]?.trim() === filters.college);
  }
  if (filters.district && filters.district !== "All") {
    filteredRows = filteredRows.filter(r => r._rawData[districtIndex]?.trim() === filters.district);
  }
  if (filters.university && filters.university !== "All") {
    filteredRows = filteredRows.filter(r => r._rawData[universityIndex]?.trim() === filters.university);
  }

  // === If college selected: departments as bars ===
  if (filters.college && filters.college !== "All") {
    const departments = [...new Set(
      filteredRows.map(r => r._rawData[departmentIndex]?.trim()).filter(Boolean)
    )];

    const data = departments.map(dep => {
      const depRows = filteredRows.filter(r => r._rawData[departmentIndex]?.trim() === dep);
      return depRows.reduce((count, r) => {
        const weeks = r._rawData.slice(weekStartIndex).filter(v => v && v.trim() !== "");
        return count + weeks.length;
      }, 0);
    });

    return {
      labels: departments.map((item => item.length > 25 ? `${item.slice(0,15)}...${item.slice(-15)}` : item)),
      datasets: [{
        label: filters.college,
        data,
        backgroundColor: departments.map(() => getRandomColor()),
      }],
      stacked: false
    };
  }

  // === Default / University / District filters: stacked by department ===
  const colleges = [...new Set(
    filteredRows.map(r => r._rawData[collegeIndex]?.trim()).filter(Boolean)
  )];
  const departments = [...new Set(
    filteredRows.map(r => r._rawData[departmentIndex]?.trim()).filter(Boolean)
  )];

  const datasets = departments.map(dep => {
    const data = colleges.map(college => {
      const row = filteredRows.find(
        r => r._rawData[collegeIndex]?.trim() === college &&
             r._rawData[departmentIndex]?.trim() === dep
      );
      if (!row) return 0;
      return row._rawData.slice(weekStartIndex).filter(v => v && v.trim() !== "").length;
    });

    return {
      label: dep,
      data,
      backgroundColor: getRandomColor(),
    };
  });

  return {
    labels: colleges.map((item => item.length > 25 ? `${item.slice(0,12)}...${item.slice(-12)}` : item)),
    datasets,
    stacked: true
  };
}

