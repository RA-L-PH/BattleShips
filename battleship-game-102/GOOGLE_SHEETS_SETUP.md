# Google Sheets Integration Setup Guide

This guide explains how to set up Google Sheets integration for collecting ability suggestions from players.

## Overview

The BattleShips game includes a feature where players can suggest new abilities through a form in the Game Guide. These suggestions are automatically sent to a Google Sheet for review by the development team.

## Setup Instructions

### Step 1: Create a Google Apps Script Project

1. Go to [script.google.com](https://script.google.com)
2. Click "New Project"
3. Name your project "BattleShips Ability Suggestions"

### Step 2: Add the Script Code

1. Delete the default `myFunction()` code
2. Copy and paste the following code:

```javascript
function doPost(e) {
  try {
    // Get the active spreadsheet (or create a new one)
    var sheet = SpreadsheetApp.getActiveSheet();
    
    // If no active sheet, create a new spreadsheet
    if (!sheet) {
      var spreadsheet = SpreadsheetApp.create('BattleShips Ability Suggestions');
      sheet = spreadsheet.getActiveSheet();
      
      // Set up headers
      sheet.getRange(1, 1, 1, 8).setValues([
        ['Timestamp', 'Ability Name', 'Type', 'Description', 'Difficulty', 'Submitter Name', 'Submitter Email', 'Status']
      ]);
      
      // Format headers
      var headerRange = sheet.getRange(1, 1, 1, 8);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4285f4');
      headerRange.setFontColor('#ffffff');
    }
    
    // Parse the JSON data
    var data = JSON.parse(e.postData.contents);
    
    // Append the data to the sheet
    sheet.appendRow([
      data.timestamp,
      data.name,
      data.type,
      data.description,
      data.difficulty,
      data.submitterName,
      data.submitterEmail,
      data.status
    ]);
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, 8);
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: 'Suggestion submitted successfully!' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ message: 'BattleShips Ability Suggestions API is working!' }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### Step 3: Deploy as Web App

1. Click "Deploy" → "New deployment"
2. Choose "Web app" as the type
3. Set the following options:
   - Execute as: **Me** (your email)
   - Who has access: **Anyone**
4. Click "Deploy"
5. Grant the necessary permissions when prompted
6. Copy the web app URL (it will look like: `https://script.google.com/macros/s/AKfycby.../exec`)

### Step 4: Configure the Environment Variable

1. In your project root, copy `.env.example` to `.env`
2. Replace `YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE` with your actual web app URL
3. Save the file

Example `.env` file:
```
VITE_GOOGLE_APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/AKfycby123...abc/exec
```

### Step 5: Create or Link a Google Sheet

Option A: Create a new sheet automatically
- The script will automatically create a new Google Sheet the first time it receives data

Option B: Link to an existing sheet
- Open your existing Google Sheet
- Go to Extensions → Apps Script
- Replace the default code with the code from Step 2
- Deploy following the same steps

## Data Structure

The Google Sheet will contain the following columns:

| Column | Description |
|--------|-------------|
| Timestamp | When the suggestion was submitted |
| Ability Name | Name of the suggested ability |
| Type | attack, defense, recon, or special |
| Description | Detailed description of the ability |
| Difficulty | easy, medium, or hard |
| Submitter Name | Player's name (optional) |
| Submitter Email | Player's email (optional) |
| Status | New, Under Review, Approved, Rejected |

## Testing the Integration

1. Start your development server: `npm run dev`
2. Navigate to the Game Guide
3. Go to the "Suggest Abilities" section
4. Fill out the form and submit a test suggestion
5. Check your Google Sheet to see if the data appears

## Troubleshooting

### Common Issues

**Error: "Script function not found"**
- Make sure you've saved your Apps Script project
- Verify the function names are exactly `doPost` and `doGet`

**Error: "Permission denied"**
- Ensure you've set "Execute as: Me" in the deployment settings
- Re-deploy if you changed permissions

**Error: "Invalid JSON"**
- Check that your Apps Script code is exactly as provided
- Verify there are no syntax errors in the script

**Form submission fails**
- The app includes a fallback that saves to localStorage if Google Sheets fails
- Check the browser console for detailed error messages

### Fallback Behavior

If Google Sheets is unavailable or misconfigured, the app will:
1. Show a warning in the console
2. Save suggestions to localStorage as backup
3. Display a success message to the user
4. Allow you to retrieve the data later from browser storage

To retrieve fallback data:
```javascript
// In browser console
const suggestions = JSON.parse(localStorage.getItem('abilitySuggestions') || '[]');
console.log(suggestions);
```

## Security Considerations

- The web app is publicly accessible (required for form submissions)
- No sensitive data is transmitted
- Consider adding rate limiting if needed
- Regularly review and moderate submissions

## Customization

You can modify the Google Apps Script to:
- Add data validation
- Send email notifications for new suggestions
- Integrate with other Google Workspace tools
- Add automatic categorization or filtering

## Support

If you encounter issues:
1. Check the Apps Script execution logs
2. Verify your environment variables
3. Test the web app URL directly in a browser
4. Review the browser console for JavaScript errors
