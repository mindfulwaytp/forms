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

async function getGoogleClients() {
  const auth = new google.auth.GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });

  const authClient = await auth.getClient();

  const sheets = google.sheets({ version: 'v4', auth: authClient });
  const drive = google.drive({ version: 'v3', auth: authClient });

  return { sheets, drive, auth: authClient };
}

// Test endpoint
app.get('/ping', (req, res) => {
  res.json({ message: 'pong' });
});

app.post('/create-sheet', async (req, res) => {
  try {
    console.log('📥 Received create-sheet request with body:', req.body);

   const { clientName, selectedForms, dob, evalType, ageRange, userType } = req.body;
    if (!clientName || !selectedForms || selectedForms.length === 0) {
      console.error('❌ Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const timestamp = Date.now();
    const clientId = clientName.toLowerCase().replace(/\s+/g, '_') + '_' + timestamp;

    const { sheets, drive } = await getGoogleClients();
    console.log('✅ Got Google clients');

    const newSheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: `Client_${clientId}_Submissions` },
        sheets: [{ properties: { title: 'Submissions' } }],
      },
    });

    console.log('✅ Sheet created:', newSheet.data.spreadsheetId);
    const newSheetId = newSheet.data.spreadsheetId;
    const newSheetUrl = `https://docs.google.com/spreadsheets/d/${newSheetId}`;

    // Share sheet access
    await drive.permissions.create({
      fileId: newSheetId,
      requestBody: {
        type: 'user',
        role: 'writer',
        emailAddress: PERSONAL_EMAIL,
      },
    });

    // Initialize Submissions tab header
    await sheets.spreadsheets.values.append({
      spreadsheetId: newSheetId,
      range: 'Submissions!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['ClientID', 'FormID', 'Status', 'Timestamp']],
      },
    });

    // Add to Clients tab in central sheet
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

    // For each selected form...
    for (const formId of selectedForms) {
      const questionsTabName = `${formId}_Questions`;

      // Fetch questions from central questions tab
      const questionsResp = await sheets.spreadsheets.values.get({
        spreadsheetId: CENTRAL_SPREADSHEET_ID,
        range: `${questionsTabName}!A:A`,
      });

      let questions = questionsResp.data.values || [];
      if (questions[0]?.[0].toLowerCase() === 'questions') {
        questions = questions.slice(1); // remove header
      }

      if (questions.length === 0) {
        console.warn(`No questions found for ${formId}`);
        continue;
      }

      // Try to create the form tab
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: newSheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: { title: formId },
              },
            }],
          },
        });
      } catch (err) {
        console.error(`Error adding tab ${formId}:`, err.message);
      }

      // Insert questions into new tab
      await sheets.spreadsheets.values.append({
        spreadsheetId: newSheetId,
        range: `${formId}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: questions.map(q => [q[0]]),
        },
      });

      // Add to Submissions tab
      await sheets.spreadsheets.values.append({
        spreadsheetId: newSheetId,
        range: 'Submissions!A2',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[clientId, formId, 'Not Started', new Date().toISOString()]],
        },
      });

      // Add to MeasurementTracking
      await sheets.spreadsheets.values.append({
        spreadsheetId: CENTRAL_SPREADSHEET_ID,
        range: 'MeasurementTracking!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            clientId,
            clientName,
            formId,
            userType || '',
            'Not Started',
            new Date().toISOString(),
          ]],
        },
      });
    }

    res.json({
      message: 'Client created with sheet and forms',
      clientId,
      sheetUrl: newSheetUrl,
    });

  } catch (err) {
    console.error('🔥 Error in /create-sheet:', err.message, err.stack);
    res.status(500).json({ error: 'Sheet creation failed' });
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

    // Step 1: Find the client in the Central Clients sheet
    const clientsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: CENTRAL_SPREADSHEET_ID,
      range: 'Clients!A2:J',
    });

    const rows = clientsResponse.data.values || [];
    const clientRow = rows.find(row => row[0]?.trim().toLowerCase() === clientId.toLowerCase());

    if (!clientRow) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const clientName = clientRow[1]?.trim() || '';
    const assignedForms = clientRow[2]?.split(',').map(f => f.trim()).filter(Boolean) || [];
    const clientSheetId = clientRow[8];

    if (!clientSheetId) {
      return res.status(500).json({ error: 'Client sheet not found' });
    }

    // Step 2: Pull statuses from the Submissions tab in the client’s individual sheet
    const subsResp = await sheets.spreadsheets.values.get({
      spreadsheetId: clientSheetId,
      range: 'Submissions!A2:C', // A = ClientID, B = FormID, C = Status
    });

    const subsRows = subsResp.data.values || [];

    // Step 3: Map assigned forms to statuses
    const formStatusMap = {};
    for (const row of subsRows) {
      const [_cid, formId, status] = row;
      if (formId) formStatusMap[formId] = status;
    }

    const formList = assignedForms.map(formId => ({
      formId,
      status: formStatusMap[formId] || 'Not Started',
    }));

    return res.json({
      clientId,
      clientName,
      assignedForms: formList,
    });

  } catch (err) {
    console.error('🔥 Error in /client-forms:', err.message, err.stack);
    return res.status(500).json({ error: 'Failed to fetch client forms' });
  }
});



app.post('/submit-form', async (req, res) => {
  try {
    const { clientId, formId, responses, timestamp } = req.body;

    // Log request for debugging
    console.log('Submit-form body:', req.body);

// ✅ Validate inputs
    if (!clientId || !formId || !Array.isArray(responses) || responses.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { sheets } = await getGoogleClients();

    // 🔎 Fetch client info from central sheet
    const clientsResp = await sheets.spreadsheets.values.get({
      spreadsheetId: CENTRAL_SPREADSHEET_ID,
      range: 'Clients!A2:J',
    });

    const clients = clientsResp.data.values || [];
    const clientRow = clients.find(row => row[0] === clientId);
    if (!clientRow) return res.status(404).json({ error: 'Client not found' });

    const clientName = clientRow[1];
    const userType = clientRow[6];
    const clientSheetId = clientRow[8];

    // ✅ Validate question count
    const questionsResp = await sheets.spreadsheets.values.get({
      spreadsheetId: clientSheetId,
      range: `${formId}!A1:A`,
    });

    const questions = questionsResp.data.values || [];
    if (questions.length !== responses.length) {
      return res.status(400).json({ error: 'Question/response mismatch' });
    }

    // 📝 Append responses to the form sheet (column B)
    await sheets.spreadsheets.values.update({
      spreadsheetId: clientSheetId,
      range: `${formId}!B1:C${responses.length}`,
      valueInputOption: 'RAW',
      requestBody: { values: responses.map(r => [r.label, r.value]) },
    });

    // 📌 Update Submissions tab in client sheet
    const subsResp = await sheets.spreadsheets.values.get({
      spreadsheetId: clientSheetId,
      range: `Submissions!A2:D`,
    });

    const submissions = subsResp.data.values || [];
    const index = submissions.findIndex(row => row[0] === clientId && row[1] === formId);
    const now = timestamp || new Date().toISOString();

    if (index === -1) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: clientSheetId,
        range: 'Submissions!A1',
        valueInputOption: 'RAW',
        requestBody: { values: [[clientId, formId, 'Completed', now]] },
      });
    } else {
      await sheets.spreadsheets.values.update({
        spreadsheetId: clientSheetId,
        range: `Submissions!C${index + 2}:D${index + 2}`,
        valueInputOption: 'RAW',
        requestBody: { values: [['Completed', now]] },
      });
    }

    // 📊 Update MeasurementTracking in central sheet
    const mtResp = await sheets.spreadsheets.values.get({
      spreadsheetId: CENTRAL_SPREADSHEET_ID,
      range: 'MeasurementTracking!A2:F',
    });

    const mtRows = mtResp.data.values || [];
    const mtIndex = mtRows.findIndex(row => row[0] === clientId && row[2] === formId);

    if (mtIndex === -1) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: CENTRAL_SPREADSHEET_ID,
        range: 'MeasurementTracking!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[clientId, clientName, formId, userType || '', 'Completed', now]],
        },
      });
    } else {
      await sheets.spreadsheets.values.update({
        spreadsheetId: CENTRAL_SPREADSHEET_ID,
        range: `MeasurementTracking!E${mtIndex + 2}:F${mtIndex + 2}`,
        valueInputOption: 'RAW',
        requestBody: { values: [['Completed', now]] },
      });
    }

    res.send('Form submission received');
  } catch (err) {
    console.error('Submit form error:', err);
    res.status(500).json({ error: 'Error submitting form' });
  }
});


// Deployable function
exports.api = functions.https.onRequest(app);