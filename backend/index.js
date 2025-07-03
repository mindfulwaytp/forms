const express = require('express');
const cors = require('cors');
const path = require('path');
const { google } = require('googleapis');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json());

// Google Sheets API setup
const auth = new google.auth.GoogleAuth({
  keyFile: './service-account.json',
  scopes: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets',
  ],
});
const sheets = google.sheets({ version: 'v4', auth });

// Firebase Admin SDK initialization
const serviceAccount = require('./service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const CENTRAL_SPREADSHEET_ID = '1iQUJEascmjF-d2LEQA-gbtdi2DG5szWHcS1I_Rqkr-Y';
const PERSONAL_EMAIL = 'ryne@mindfulway-therapy.com';

// Ping route
app.get('/ping', (req, res) => {
  res.json({ message: 'pong' });
});

app.post('/create-sheet', async (req, res) => {
  try {
    const { clientName, dob, evalType, ageRange, userType, selectedForms } = req.body;

    console.log('=== Received create-sheet request ===');
    console.log('Request body:', req.body);

    if (!clientName || !selectedForms || selectedForms.length === 0) {
      console.error('Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const timestamp = Date.now();
    const clientId = clientName.toLowerCase().replace(/\s+/g, '_') + '_' + timestamp;

    // Create new sheet for the client
      const fileMetadata = {
        name: `Client_${clientId}_Submissions`,
        mimeType: 'application/vnd.google-apps.spreadsheet',
        parents: ['112RKE8_kRR0wVgysggI_X80Qe39WvVP-'], // your folder ID here
      };

      const file = await drive.files.create({
        resource: fileMetadata,
        fields: 'id',
      });

      const newSheetId = file.data.id;
      const newSheetUrl = `https://docs.google.com/spreadsheets/d/${newSheetId}`;
      console.log('Spreadsheet created inside folder:', newSheetId);


    // Share sheet with admin email
    const drive = google.drive({ version: 'v3', auth });
    try {
      await drive.permissions.create({
        fileId: newSheetId,
        requestBody: {
          type: 'user',
          role: 'writer',
          emailAddress: PERSONAL_EMAIL,
        },
      });
      console.log('Shared new sheet with personal email');
    } catch (permErr) {
      console.error('Error sharing new sheet:', permErr);
    }

    // Add header to Submissions sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: newSheetId,
      range: 'Submissions!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['ClientID', 'FormID', 'Status', 'Timestamp']],
      },
    });
    console.log('Submissions header added to new sheet.');

    // Append client info to centralized Clients tab
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
    console.log('Client info appended to centralized sheet.');

    console.log('=== Selected forms:', selectedForms);

      const formTabMap = {
      'srs2-adult-self': 'srs2-adult-self_Questions',
      'srs2-adult-informant': 'srs2-adult-informant_Questions'
      // add others as needed
    };

    // For each selected form, create a tab with questions and set status as "Not Started"
    for (const formId of selectedForms) {
      console.log('--- Processing form:', formId);

      const questionsTabName = formTabMap[formId] || `${formId}_Questions`;
      console.log(`Fetching questions from tab: ${questionsTabName}`);

      const questionsResp = await sheets.spreadsheets.values.get({
        spreadsheetId: CENTRAL_SPREADSHEET_ID,
        range: `${questionsTabName}!A:A`,
      });
      let questions = questionsResp.data.values || [];

      if (questions[0] && questions[0][0] === "Questions") {
        questions = questions.slice(1);
      }

      console.log(`Questions fetched for ${formId}:`, questions);

      if (questions.length === 0) {
        console.warn(`No questions found for form ${formId}, skipping`);
        continue;
      }

      // Create new tab for form
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: newSheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: formId,
                }
              }
            }
          ]
        }
      });
      console.log(`Created tab for form ${formId}`);

      const questionRows = questions.map(q => [q[0]]);
      await sheets.spreadsheets.values.append({
        spreadsheetId: newSheetId,
        range: `${formId}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: questionRows,
        },
      });
      console.log(`Wrote questions vertically for form ${formId}`);

      // Initialize status in Submissions sheet
      await sheets.spreadsheets.values.append({
        spreadsheetId: newSheetId,
        range: 'Submissions!A2',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[clientId, formId, 'Not Started', new Date().toISOString()]],
        },
      });
      console.log(`Form status set to "Not Started" for ${formId}`);

      // Append entry to centralized MeasurementTracking sheet
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
      console.log(`Measurement tracking entry created for ${formId}`);
    }

    console.log('=== Finished processing all forms ===');

    res.json({
      message: 'Client created with individual sheet and form tabs',
      clientId,
      assignedForms: selectedForms,
      sheetUrl: newSheetUrl,
      sheetId: newSheetId
    });
  } catch (err) {
    console.error('Error creating client sheet:', err);
    res.status(500).json({ error: 'Error creating client sheet' });
  }
});



// Client Forms Route - Get client info and assigned forms with their statuses
app.get('/client-forms', async (req, res) => {
  const clientId = req.query.clientId;
  if (!clientId) {
    return res.status(400).json({ error: 'Missing clientId query parameter' });
  }

  try {
    // Fetch client data from the Clients tab of the centralized sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: CENTRAL_SPREADSHEET_ID,
      range: 'Clients!A2:J', // clientId in col A, forms in col C
    });

    const rows = response.data.values || [];
    const clientRow = rows.find(row => row[0] && row[0].trim() === clientId.trim());

    if (!clientRow) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const assignedForms = clientRow[2] ? clientRow[2].split(',') : [];

    // Fetch the status for each assigned form from the Submissions sheet
    const submissionStatusPromises = assignedForms.map(async (formId) => {
      const submissionsResp = await sheets.spreadsheets.values.get({
        spreadsheetId: clientRow[8], // Client's individual sheet
        range: `Submissions!A2:D`, // Assuming this range covers Client ID, Form ID, Status, and Timestamp
      });

      const submissions = submissionsResp.data.values || [];
      const submission = submissions.find(sub => sub[0] === clientId && sub[1] === formId);
      const status = submission ? submission[2] : 'Not Started';  // Default to 'Not Started' if no entry found

      return { formId, status };
    });

    const formsWithStatus = await Promise.all(submissionStatusPromises);

    res.json({
      clientId,
      clientName: clientRow[1] || '',
      assignedForms: formsWithStatus,  // Include form status in the response
    });
  } catch (error) {
    console.error('Error fetching client forms:', error);
    res.status(500).json({ error: 'Failed to fetch client forms' });
  }
});


app.post('/submit-form', async (req, res) => {
  try {
    const { clientId, formId, responses } = req.body;
    console.log('Received form submission:', req.body);

    // Fetch client sheet info
    const clientSheetResp = await sheets.spreadsheets.values.get({
      spreadsheetId: CENTRAL_SPREADSHEET_ID,
      range: 'Clients!A2:J',
    });

    const rows = clientSheetResp.data.values || [];
    const clientRow = rows.find(row => row[0] && row[0].trim() === clientId.trim());
    if (!clientRow) return res.status(404).json({ error: 'Client not found' });

    const clientSheetId = clientRow[8];
    if (!clientSheetId) return res.status(400).json({ error: 'Client sheet not found' });

    // Get questions
    const questionsResp = await sheets.spreadsheets.values.get({
      spreadsheetId: clientSheetId,
      range: `${formId}!A1:A`,
    });
    const questions = questionsResp.data.values || [];

    if (questions.length === 0) {
      return res.status(400).json({ error: 'No questions found for form' });
    }

    if (questions.length !== responses.length) {
      return res.status(400).json({ error: 'Mismatch between questions and responses count' });
    }

    // Write responses
    const responseRows = responses.map((response) => [response]);
    await sheets.spreadsheets.values.append({
      spreadsheetId: clientSheetId,
      range: `${formId}!B1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: responseRows,
      },
    });

    console.log('Response rows appended');

    // Update Submissions status in client sheet
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
        range: `Submissions!C${submissionRowIndex + 2}:D${submissionRowIndex + 2}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [['Completed', new Date().toISOString()]],
        },
      });
    }

    console.log('Form status updated to Completed in client sheet');

    // Update MeasurementTracking in centralized sheet
    const measurementRange = 'MeasurementTracking!A2:F';
    const measurementResp = await sheets.spreadsheets.values.get({
      spreadsheetId: CENTRAL_SPREADSHEET_ID,
      range: measurementRange,
    });

    const measurementRows = measurementResp.data.values || [];
    const measurementRowIndex = measurementRows.findIndex(row => row[0] === clientId && row[2] === formId);

    if (measurementRowIndex === -1) {
      // If no existing row, append new
      await sheets.spreadsheets.values.append({
        spreadsheetId: CENTRAL_SPREADSHEET_ID,
        range: 'MeasurementTracking!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [
            [clientId, clientRow[1] || '', formId, clientRow[6] || '', 'Completed', new Date().toISOString()]
          ]
        }
      });
    } else {
      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId: CENTRAL_SPREADSHEET_ID,
        range: `MeasurementTracking!E${measurementRowIndex + 2}:F${measurementRowIndex + 2}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [['Completed', new Date().toISOString()]],
        },
      });
    }

    console.log('MeasurementTracking updated in centralized sheet');

    res.send('Form submission received');
  } catch (err) {
    console.error('Error submitting form:', err);
    res.status(500).send('Error processing form submission');
  }
});

// Static React admin frontend
const frontendPath = path.join(__dirname, 'build');
app.use('/admin', express.static(frontendPath));

console.log('✔ Serving /admin/* route');
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});