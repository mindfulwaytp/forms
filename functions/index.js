const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const path = require('path');
const { google } = require('googleapis');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp(); // Use built-in credentials when deployed

const allowedOrigins = [
  'https://forms-ah97yvgip-forms-projects-0c8ca897.vercel.app',
  'https://forms-nk8ya44m7-forms-projects-0c8ca897.vercel.app',
  'http://localhost:5173' // optional for local testing
];

// Express app
const app = express();
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
}));

// Allow preflight
app.options('*', cors());


// Google Sheets setup
const auth = new google.auth.GoogleAuth({
  scopes: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets',
  ],
});
const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });

// Constants
const CENTRAL_SPREADSHEET_ID = '1iQUJEascmjF-d2LEQA-gbtdi2DG5szWHcS1I_Rqkr-Y';
const PERSONAL_EMAIL = 'ryne@mindfulway-therapy.com';

// Routes
app.get('/ping', (req, res) => {
  res.json({ message: 'pong' });
});

app.post('/create-sheet', async (req, res) => {
  try {
    const { clientName, dob, evalType, ageRange, userType, selectedForms } = req.body;
    if (!clientName || !selectedForms || selectedForms.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const timestamp = Date.now();
    const clientId = clientName.toLowerCase().replace(/\s+/g, '_') + '_' + timestamp;

    const fileMetadata = {
      name: `Client_${clientId}_Submissions`,
      mimeType: 'application/vnd.google-apps.spreadsheet',
      parents: ['112RKE8_kRR0wVgysggI_X80Qe39WvVP-'],
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      fields: 'id',
    });

    const newSheetId = file.data.id;
    const newSheetUrl = `https://docs.google.com/spreadsheets/d/${newSheetId}`;

    // Share with admin
    await drive.permissions.create({
      fileId: newSheetId,
      requestBody: {
        type: 'user',
        role: 'writer',
        emailAddress: PERSONAL_EMAIL,
      },
    });

    // Create Submissions sheet header
    await sheets.spreadsheets.values.append({
      spreadsheetId: newSheetId,
      range: 'Submissions!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['ClientID', 'FormID', 'Status', 'Timestamp']],
      },
    });

    // Append to centralized Clients sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: CENTRAL_SPREADSHEET_ID,
      range: 'Clients!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          clientId,
          clientName,
          selectedForms.join(','),
          dob || '',
          evalType || '',
          ageRange || '',
          userType || '',
          new Date(timestamp).toISOString(),
          newSheetId,
          newSheetUrl,
        ]],
      },
    });

    const formTabMap = {
      'srs2-adult-self': 'srs2-adult-self_Questions',
      'srs2-adult-informant': 'srs2-adult-informant_Questions'
    };

    for (const formId of selectedForms) {
      const questionsTabName = formTabMap[formId] || `${formId}_Questions`;
      const questionsResp = await sheets.spreadsheets.values.get({
        spreadsheetId: CENTRAL_SPREADSHEET_ID,
        range: `${questionsTabName}!A:A`,
      });
      let questions = questionsResp.data.values || [];
      if (questions[0] && questions[0][0] === "Questions") questions = questions.slice(1);

      if (questions.length === 0) continue;

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: newSheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: formId } } }]
        }
      });

      const questionRows = questions.map(q => [q[0]]);
      await sheets.spreadsheets.values.append({
        spreadsheetId: newSheetId,
        range: `${formId}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: questionRows },
      });

      await sheets.spreadsheets.values.append({
        spreadsheetId: newSheetId,
        range: 'Submissions!A2',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[clientId, formId, 'Not Started', new Date().toISOString()]],
        },
      });

      await sheets.spreadsheets.values.append({
        spreadsheetId: CENTRAL_SPREADSHEET_ID,
        range: 'MeasurementTracking!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [
            [clientId, clientName, formId, userType || '', 'Not Started', new Date().toISOString()]
          ]
        }
      });
    }

    res.json({
      message: 'Client created',
      clientId,
      assignedForms: selectedForms,
      sheetUrl: newSheetUrl,
      sheetId: newSheetId
    });
  } catch (err) {
    console.error('Error creating sheet:', err);
    res.status(500).json({ error: 'Error creating client sheet' });
  }
});

app.get('/client-forms', async (req, res) => {
  const clientId = req.query.clientId;
  if (!clientId) return res.status(400).json({ error: 'Missing clientId' });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: CENTRAL_SPREADSHEET_ID,
      range: 'Clients!A2:J',
    });

    const rows = response.data.values || [];
    const clientRow = rows.find(row => row[0]?.trim() === clientId.trim());
    if (!clientRow) return res.status(404).json({ error: 'Client not found' });

    const assignedForms = clientRow[2] ? clientRow[2].split(',') : [];
    const clientSheetId = clientRow[8];

    const statuses = await Promise.all(assignedForms.map(async (formId) => {
      const resp = await sheets.spreadsheets.values.get({
        spreadsheetId: clientSheetId,
        range: 'Submissions!A2:D',
      });
      const submissions = resp.data.values || [];
      const match = submissions.find(r => r[0] === clientId && r[1] === formId);
      return { formId, status: match ? match[2] : 'Not Started' };
    }));

    res.json({
      clientId,
      clientName: clientRow[1] || '',
      assignedForms: statuses,
    });
  } catch (err) {
    console.error('Error fetching client forms:', err);
    res.status(500).json({ error: 'Failed to fetch client forms' });
  }
});

app.post('/submit-form', async (req, res) => {
  try {
    const { clientId, formId, responses } = req.body;

    const sheetResp = await sheets.spreadsheets.values.get({
      spreadsheetId: CENTRAL_SPREADSHEET_ID,
      range: 'Clients!A2:J',
    });

    const rows = sheetResp.data.values || [];
    const clientRow = rows.find(row => row[0]?.trim() === clientId.trim());
    if (!clientRow) return res.status(404).json({ error: 'Client not found' });

    const clientSheetId = clientRow[8];
    const qResp = await sheets.spreadsheets.values.get({
      spreadsheetId: clientSheetId,
      range: `${formId}!A1:A`,
    });
    const questions = qResp.data.values || [];

    if (questions.length !== responses.length) {
      return res.status(400).json({ error: 'Mismatch between questions and responses' });
    }

    const responseRows = responses.map(ans => [ans]);
    await sheets.spreadsheets.values.append({
      spreadsheetId: clientSheetId,
      range: `${formId}!B1`,
      valueInputOption: 'RAW',
      requestBody: { values: responseRows },
    });

    const subResp = await sheets.spreadsheets.values.get({
      spreadsheetId: clientSheetId,
      range: 'Submissions!A2:D',
    });
    const submissions = subResp.data.values || [];
    const index = submissions.findIndex(row => row[0] === clientId && row[1] === formId);

    if (index === -1) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: clientSheetId,
        range: 'Submissions!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[clientId, formId, 'Completed', new Date().toISOString()]],
        },
      });
    } else {
      await sheets.spreadsheets.values.update({
        spreadsheetId: clientSheetId,
        range: `Submissions!C${index + 2}:D${index + 2}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [['Completed', new Date().toISOString()]],
        },
      });
    }

    const mResp = await sheets.spreadsheets.values.get({
      spreadsheetId: CENTRAL_SPREADSHEET_ID,
      range: 'MeasurementTracking!A2:F',
    });
    const mRows = mResp.data.values || [];
    const mIndex = mRows.findIndex(row => row[0] === clientId && row[2] === formId);

    if (mIndex === -1) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: CENTRAL_SPREADSHEET_ID,
        range: 'MeasurementTracking!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [
            [clientId, clientRow[1], formId, clientRow[6], 'Completed', new Date().toISOString()]
          ]
        }
      });
    } else {
      await sheets.spreadsheets.values.update({
        spreadsheetId: CENTRAL_SPREADSHEET_ID,
        range: `MeasurementTracking!E${mIndex + 2}:F${mIndex + 2}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [['Completed', new Date().toISOString()]],
        },
      });
    }

    res.send('Form submission received');
  } catch (err) {
    console.error('Error submitting form:', err);
    res.status(500).send('Error processing form submission');
  }
});

// Export the Express app as a Firebase Function
exports.api = functions.https.onRequest(app);
