const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const admin = require('firebase-admin');

admin.initializeApp();
const app = express();

// Set up CORS
const allowedOrigins = [
  'https://forms-o5l2qk4mc-forms-projects-0c8ca897.vercel.app',
  'https://forms-ah97yvgip-forms-projects-0c8ca897.vercel.app',
  'https://forms-nk8ya44m7-forms-projects-0c8ca897.vercel.app',
  'http://localhost:5173',
  'https://forms-fawn-ten.vercel.app',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());

// Config
const CENTRAL_SPREADSHEET_ID = '1tYY6sZ4Pa9bFYKjJtOBqn2xukZwZgL6vG_ddWsIzNKY';
const PERSONAL_EMAIL = 'ryne@mindfulway-therapy.com';

// 🔐 Google API Client Helper
async function getGoogleClients() {
  const auth = new google.auth.GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets',
    ],
  });

  const authClient = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });
  const drive = google.drive({ version: 'v3', auth: authClient });

  return { sheets, drive };
}

// Test endpoint
app.get('/ping', (req, res) => {
  res.json({ message: 'pong' });
});

// ➕ Create client sheet
app.post('/create-sheet', async (req, res) => {
  try {
    const { clientName, dob, evalType, ageRange, userType, selectedForms } = req.body;

    if (!clientName || !selectedForms || selectedForms.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const timestamp = Date.now();
    const clientId = clientName.toLowerCase().replace(/\s+/g, '_') + '_' + timestamp;

    const { sheets, drive } = await getGoogleClients();

    // Create spreadsheet
    const newSheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: `Client_${clientId}_Submissions` },
        sheets: [{ properties: { title: 'Submissions' } }],
      },
    });

    const newSheetId = newSheet.data.spreadsheetId;
    const newSheetUrl = `https://docs.google.com/spreadsheets/d/${newSheetId}`;
    console.log('Spreadsheet created:', newSheetId);

    // Share with personal email
    try {
      await drive.permissions.create({
        fileId: newSheetId,
        requestBody: {
          type: 'user',
          role: 'writer',
          emailAddress: PERSONAL_EMAIL,
        },
      });
      console.log('Shared sheet with:', PERSONAL_EMAIL);
    } catch (shareErr) {
      console.error('Sharing error:', shareErr.message);
    }

    // Write header to Submissions tab
    await sheets.spreadsheets.values.append({
      spreadsheetId: newSheetId,
      range: 'Submissions!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['FormID', 'ResponseData']],
      },
    });

    // Append to centralized sheet
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

    // Copy form questions to new tabs
    for (const formId of selectedForms) {
      const questionsTabName = `${formId}_Questions`;

      try {
        const questionsResp = await sheets.spreadsheets.values.get({
          spreadsheetId: CENTRAL_SPREADSHEET_ID,
          range: `${questionsTabName}!A:A`,
        });

        let questions = questionsResp.data.values || [];
        if (questions[0] && questions[0][0] === "Questions") {
          questions = questions.slice(1);
        }

        if (questions.length === 0) continue;

        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: newSheetId,
          requestBody: {
            requests: [{ addSheet: { properties: { title: formId } } }],
          },
        });

        const questionRows = questions.map(q => [q[0]]);
        await sheets.spreadsheets.values.append({
          spreadsheetId: newSheetId,
          range: `${formId}!A1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: questionRows,
          },
        });
      } catch (formErr) {
        console.error(`Error processing form ${formId}:`, formErr.message);
      }
    }

    res.json({
      message: 'Client sheet created',
      clientId,
      sheetId: newSheetId,
      sheetUrl: newSheetUrl,
      assignedForms: selectedForms,
    });
  } catch (err) {
    console.error('Create-sheet error:', err.message);
    if (err.errors) console.error('Google API error:', JSON.stringify(err.errors));
    res.status(500).json({ error: 'Error creating client sheet' });
  }
});

// 🔍 Get assigned forms for a client by clientId
app.get('/client-forms', async (req, res) => {
  const clientId = req.query.clientId?.trim();

  if (!clientId) {
    return res.status(400).json({ error: 'Missing clientId query parameter' });
  }

  try {
    const { sheets } = await getGoogleClients();

    // Pull rows from the Clients sheet (excluding header row)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: CENTRAL_SPREADSHEET_ID,
      range: 'Clients!A2:J',
    });

    const rows = response.data.values || [];

    // 🔍 Debug logging for server logs
    console.log('🔍 Looking for clientId:', clientId);
    console.log('📋 Sample of first 3 rows:', rows.slice(0, 3));

    // Find client row by matching clientId in column A (index 0)
    const clientRow = rows.find(row => row[0]?.trim().toLowerCase() === clientId.toLowerCase());

    if (!clientRow) {
      console.warn(`❌ clientId "${clientId}" not found in spreadsheet`);
      return res.status(404).json({ error: 'Client not found' });
    }

    // Extract client name from column B and assigned forms from column C
    const clientName = clientRow[1]?.trim() || '';
    const assignedForms = clientRow[2]?.split(',').map(f => f.trim()).filter(Boolean) || [];

    // ✅ Success response
    res.json({
      clientId,
      clientName,
      assignedForms,
    });

  } catch (err) {
    console.error('🔥 Error fetching client forms:', err.message);
    res.status(500).json({ error: 'Failed to fetch client forms' });
  }
});


// 📨 Submit form
app.post('/submit-form', async (req, res) => {
  try {
    const { clientId, formId, responses } = req.body;
    const { sheets } = await getGoogleClients();

    const clientSheetResp = await sheets.spreadsheets.values.get({
      spreadsheetId: CENTRAL_SPREADSHEET_ID,
      range: 'Clients!A2:J',
    });

    const rows = clientSheetResp.data.values || [];
    const clientRow = rows.find(row => row[0] && row[0].trim() === clientId.trim());
    if (!clientRow) return res.status(404).json({ error: 'Client not found' });

    const clientSheetId = clientRow[8];
    if (!clientSheetId) return res.status(400).json({ error: 'Client sheet not found' });

    const questionsResp = await sheets.spreadsheets.values.get({
      spreadsheetId: clientSheetId,
      range: `${formId}!A1:A`,
    });

    const questions = questionsResp.data.values || [];
    if (questions.length !== responses.length) {
      return res.status(400).json({ error: 'Mismatch between questions and responses count' });
    }

    const responseRows = responses.map(response => [response]);
    await sheets.spreadsheets.values.append({
      spreadsheetId: clientSheetId,
      range: `${formId}!B1`,
      valueInputOption: 'RAW',
      requestBody: { values: responseRows },
    });

    const submissionsRange = `Submissions!A2:D`;
    const submissionsResp = await sheets.spreadsheets.values.get({
      spreadsheetId: clientSheetId,
      range: submissionsRange,
    });

    const submissions = submissionsResp.data.values || [];
    const submissionRowIndex = submissions.findIndex(row => row[0] === clientId && row[1] === formId);

    if (submissionRowIndex === -1) {
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
        range: `Submissions!C${submissionRowIndex + 2}`,
        valueInputOption: 'RAW',
        requestBody: { values: [['Completed']] },
      });
    }

    res.send('Form submission received');
  } catch (err) {
    console.error('Submit-form error:', err.message);
    res.status(500).send('Error processing form submission');
  }
});

// Deployable function
exports.api = functions.https.onRequest(app);
