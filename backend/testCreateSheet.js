const { google } = require('googleapis');

async function testCreateSheet() {
  const auth = new google.auth.GoogleAuth({
    keyFile: './service-account.json',
    scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    const res = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: `TestSheet_${Date.now()}` },
        sheets: [{ properties: { title: 'Sheet1' } }],
      },
    });
    console.log('Created spreadsheet:', res.data.spreadsheetId);
  } catch (err) {
    console.error('Error creating spreadsheet:', err);
  }
}

testCreateSheet();
