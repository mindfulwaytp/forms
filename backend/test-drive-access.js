const { google } = require('googleapis');

async function testDriveAccess() {
  const auth = new google.auth.GoogleAuth({
    keyFile: './service-account.json', // Adjust path if needed
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  const drive = google.drive({ version: 'v3', auth });

  try {
    const res = await drive.files.list({
      driveId: '0AGlH7A5v38MXUk9PVA', // Your Shared Drive ID here
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      corpora: 'drive',
      pageSize: 10,
    });

    console.log('Files:', res.data.files);
  } catch (err) {
    console.error('Drive API error:', err);
  }
}

testDriveAccess();
