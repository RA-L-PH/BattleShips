/**
 * Google Apps Script for BattleShips Ability Suggestions
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://script.google.com/
 * 2. Create a new project
 * 3. Replace the default code with this script
 * 4. Save the project (give it a name like "BattleShips Ability Suggestions")
 * 5. Deploy as a web app (see GOOGLE_SHEETS_SETUP.md for detailed steps)
 * 6. Copy the web app URL to your .env file as VITE_GOOGLE_APPS_SCRIPT_WEB_APP_URL
 * 
 * CRITICAL DEPLOYMENT SETTINGS:
 * - Set "Execute as" to "Me" (your account)
 * - Set "Who has access" to "Anyone" (required for CORS and external access)
 * - Make sure to create a NEW deployment each time you update the code
 */

// Configuration
const SHEET_NAME = 'Ability Suggestions';
const NOTIFICATION_EMAIL = 'indiaxkpop@gmail.com';
const NOTIFICATION_THRESHOLD = 5; // Send email after every 5 suggestions

/**
 * Handle HTTP POST requests
 */
function doPost(e) {
  try {
    let requestData;
    
    // Handle both JSON and form-encoded requests
    if (e.postData && e.postData.type === 'application/json') {
      requestData = JSON.parse(e.postData.contents);
    } else if (e.parameter && e.parameter.payload) {
      // Handle URL-encoded form data
      requestData = JSON.parse(e.parameter.payload);
    } else if (e.postData && e.postData.contents) {
      // Try to parse as JSON directly
      try {
        requestData = JSON.parse(e.postData.contents);
      } catch (parseError) {
        // If not JSON, try to extract payload from form data
        const contents = e.postData.contents;
        const payloadMatch = contents.match(/payload=(.+)/);
        if (payloadMatch) {
          requestData = JSON.parse(decodeURIComponent(payloadMatch[1]));
        } else {
          throw new Error('Unable to parse request data');
        }
      }
    } else {
      throw new Error('No valid request data found');
    }
    
    const action = requestData.action;
    
    // Handle different actions
    switch (action) {
      case 'submitAbilitySuggestion':
        return handleAbilitySuggestion(requestData.data);
      case 'test':
        return createResponse({ success: true, message: 'Connection successful!' });
      default:
        return createResponse({ error: 'Unknown action: ' + action });
    }
  } catch (error) {
    console.error('Error in doPost:', error);
    return createResponse({ 
      error: 'Server error: ' + error.message,
      debug: {
        hasPostData: !!e.postData,
        postDataType: e.postData ? e.postData.type : 'none',
        hasParameter: !!e.parameter,
        parameterKeys: e.parameter ? Object.keys(e.parameter) : []
      }
    });
  }
}

/**
 * Handle HTTP GET requests (for testing and fallback submissions)
 */
function doGet(e) {
  try {
    // Check if this is a submission request
    if (e.parameter && e.parameter.action === 'submitAbilitySuggestion') {
      // Handle ability suggestion via GET (fallback method)
      const data = {
        timestamp: e.parameter.timestamp || new Date().toISOString(),
        name: e.parameter.name,
        type: e.parameter.type,
        description: e.parameter.description,
        difficulty: e.parameter.difficulty,
        submitterName: e.parameter.submitterName || 'Anonymous',
        submitterEmail: e.parameter.submitterEmail || '',
        status: e.parameter.status || 'New'
      };
      
      return handleAbilitySuggestion(data);
    }
    
    // Default response for testing
    return createResponse({ 
      success: true, 
      message: 'BattleShips Ability Suggestions API is running!',
      timestamp: new Date().toISOString(),
      note: 'Use POST requests for submitting data, or GET with action parameter for fallback'
    });
  } catch (error) {
    console.error('Error in doGet:', error);
    return createResponse({ 
      error: 'GET request error: ' + error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle ability suggestion submission
 */
function handleAbilitySuggestion(data) {
  try {
    // Get or create the spreadsheet
    const sheet = getOrCreateSheet();
    
    // Ensure headers exist
    ensureHeaders(sheet);
    
    // Add the new suggestion
    const rowData = [
      data.timestamp,
      data.name,
      data.type,
      data.description,
      data.difficulty,
      data.submitterName,
      data.submitterEmail,
      data.status
    ];
    
    sheet.appendRow(rowData);
    
    // Check if we should send notification email
    const totalSuggestions = sheet.getLastRow() - 1; // Subtract header row
    
    if (totalSuggestions % NOTIFICATION_THRESHOLD === 0) {
      sendNotificationEmail(sheet, totalSuggestions);
    }
    
    return createResponse({ 
      success: true, 
      message: 'Ability suggestion submitted successfully!',
      totalSuggestions: totalSuggestions
    });
    
  } catch (error) {
    console.error('Error handling ability suggestion:', error);
    return createResponse({ error: 'Failed to save suggestion: ' + error.message });
  }
}

/**
 * Get or create the suggestions sheet
 */
function getOrCreateSheet() {
  let spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // If no active spreadsheet, create a new one
  if (!spreadsheet) {
    spreadsheet = SpreadsheetApp.create('BattleShips Ability Suggestions');
  }
  
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  // Create the sheet if it doesn't exist
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }
  
  return sheet;
}

/**
 * Ensure the sheet has proper headers
 */
function ensureHeaders(sheet) {
  const headers = [
    'Timestamp',
    'Ability Name',
    'Type',
    'Description',
    'Difficulty',
    'Submitter Name',
    'Submitter Email',
    'Status'
  ];
  
  // Check if headers exist
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Format headers
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('white');
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, headers.length);
  }
}

/**
 * Send notification email after threshold reached
 */
function sendNotificationEmail(sheet, totalSuggestions) {
  try {
    // Get the last few suggestions for the email
    const lastRowNum = sheet.getLastRow();
    const startRow = Math.max(2, lastRowNum - NOTIFICATION_THRESHOLD + 1); // +1 because we include the current row
    const numRows = lastRowNum - startRow + 1;
    
    if (numRows <= 0) return;
    
    const recentSuggestions = sheet.getRange(startRow, 1, numRows, 8).getValues();
    
    // Build email content
    let emailBody = `Hello!\n\n`;
    emailBody += `You have received ${NOTIFICATION_THRESHOLD} new ability suggestions for BattleShips! `;
    emailBody += `Total suggestions: ${totalSuggestions}\n\n`;
    emailBody += `Recent suggestions:\n\n`;
    
    recentSuggestions.forEach((row, index) => {
      const [timestamp, name, type, description, difficulty, submitterName, submitterEmail, status] = row;
      emailBody += `${index + 1}. "${name}" (${type})\n`;
      emailBody += `   Submitted by: ${submitterName || 'Anonymous'}`;
      if (submitterEmail) {
        emailBody += ` (${submitterEmail})`;
      }
      emailBody += `\n   Difficulty: ${difficulty}\n`;
      emailBody += `   Description: ${description}\n`;
      emailBody += `   Submitted: ${new Date(timestamp).toLocaleString()}\n\n`;
    });
    
    emailBody += `You can view all suggestions in the Google Sheet:\n`;
    emailBody += `${sheet.getParent().getUrl()}\n\n`;
    emailBody += `Best regards,\nBattleShips Ability Suggestions System`;
    
    // Send the email
    MailApp.sendEmail({
      to: NOTIFICATION_EMAIL,
      subject: `🎮 BattleShips: ${NOTIFICATION_THRESHOLD} New Ability Suggestions (Total: ${totalSuggestions})`,
      body: emailBody
    });
    
    console.log(`Notification email sent for ${NOTIFICATION_THRESHOLD} new suggestions (total: ${totalSuggestions})`);
    
  } catch (error) {
    console.error('Error sending notification email:', error);
    // Don't throw the error - we don't want email failures to break the suggestion submission
  }
}

/**
 * Create a JSON response with CORS headers
 */
function createResponse(data) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  
  // Add CORS headers to allow cross-origin requests
  return output;
}

/**
 * Test function you can run manually to check everything works
 */
function testScript() {
  console.log('Testing BattleShips Ability Suggestions script...');
  
  // Test creating a sheet
  const sheet = getOrCreateSheet();
  console.log('Sheet created/found:', sheet.getName());
  
  // Test adding headers
  ensureHeaders(sheet);
  console.log('Headers ensured');
  
  // Test adding a sample suggestion
  const testData = {
    timestamp: new Date().toISOString(),
    name: 'Test Ability',
    type: 'attack',
    description: 'This is a test ability for testing purposes',
    difficulty: 'easy',
    submitterName: 'Test User',
    submitterEmail: 'test@example.com',
    status: 'New'
  };
  
  const result = handleAbilitySuggestion(testData);
  console.log('Test result:', result.getContent());
  
  console.log('Test completed successfully!');
}
