# Google Sheets Integration Setup Guide

This guide will help you set up Google Sheets integration for the BattleShips ability suggestions system with email notifications.

## Overview

The system will:
- Store all ability suggestions in a Google Sheet
- Send email notifications to `indiaxkpop@gmail.com` after every 5 suggestions
- Include suggestion details and submitter information in emails

## Step 1: Create Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new blank spreadsheet
3. Name it "BattleShips Ability Suggestions"
4. Note the spreadsheet URL for later

## Step 2: Set Up Google Apps Script

1. In your Google Sheet, go to **Extensions > Apps Script**
2. Delete the default `myFunction()` code
3. Copy and paste the entire contents of `docs/google-apps-script/Code.gs` from this project
4. Save the script (Ctrl+S or Cmd+S)
5. Name the project "BattleShips Suggestions Handler"

## Step 3: Deploy as Web App

1. In the Apps Script editor, click **Deploy > New deployment**
2. Click the gear icon next to "Type" and select **Web app**
3. Configure the deployment:
   - **Description**: "BattleShips Ability Suggestions API"
   - **Execute as**: Me (your email)
   - **Who has access**: Anyone
4. Click **Deploy**
5. **Important**: Copy the Web app URL - you'll need this for the environment variable

## Step 4: Grant Permissions

1. After deployment, you'll be prompted to authorize the script
2. Click **Authorize access**
3. Sign in with your Google account
4. Click **Advanced** if you see a security warning
5. Click **Go to BattleShips Suggestions Handler (unsafe)**
6. Click **Allow** to grant permissions

## Step 5: Configure Environment Variables

1. In your BattleShips project, create or update `.env` file:
```env
VITE_GOOGLE_APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

2. Replace `YOUR_SCRIPT_ID` with the actual script ID from your deployment URL

## Step 6: Test the Integration

1. Start your BattleShips development server:
```bash
npm start
```

2. Navigate to the "How to Play" > "Suggest Abilities" section
3. Fill out and submit a test suggestion
4. Check your Google Sheet - it should appear as a new row
5. Submit 4 more suggestions to trigger the email notification

## Email Notification Features

### When Emails Are Sent
- After every 5 suggestions (5th, 10th, 15th, etc.)
- Includes the latest 5 suggestions in each email

### Email Content Includes
- ✅ Ability name and type with color coding
- ✅ Description and difficulty level
- ✅ Submitter name (or "Anonymous")
- ✅ Submission timestamp
- ✅ Total suggestion count
- ✅ Direct link to the Google Sheet

### Email Styling
- Professional HTML formatting
- Color-coded ability types:
  - 🔴 Attack abilities (red)
  - 🔵 Defense abilities (blue)
  - 🟡 Recon/Support abilities (yellow)
  - 🟣 Special abilities (purple)

## Spreadsheet Columns

The Google Sheet will automatically create these columns:

| Column | Description |
|--------|-------------|
| Timestamp | When the suggestion was submitted |
| Ability Name | Name of the suggested ability |
| Type | attack, defense, recon, or special |
| Description | Detailed description of the ability |
| Difficulty | easy, medium, or hard |
| Submitter Name | Name provided (or "Anonymous") |
| Submitter Email | Email provided (or "Not provided") |
| Status | Defaults to "New" (you can update manually) |

## Customization Options

### Change Email Address
Edit the `ADMIN_EMAIL` variable in the Google Apps Script:
```javascript
const ADMIN_EMAIL = 'your-email@example.com';
```

### Change Notification Threshold
Edit the `NOTIFICATION_THRESHOLD` variable:
```javascript
const NOTIFICATION_THRESHOLD = 10; // Send email every 10 suggestions
```

### Test Email Function
You can test the email functionality by running the `testEmailNotification()` function in the Apps Script editor.

## Troubleshooting

### Common Issues

**Problem**: "Script function not found"
- **Solution**: Make sure you deployed as a web app, not as an add-on

**Problem**: "Permission denied"
- **Solution**: Ensure the script execution is set to "Me" and access is "Anyone"

**Problem**: Emails not sending
- **Solution**: Check Gmail's sent folder and spam folder

**Problem**: CORS errors in browser
- **Solution**: Make sure the web app is deployed with "Anyone" access

### Testing the Endpoint

You can test the Google Apps Script endpoint directly:

```javascript
// Test in browser console or use curl
fetch('YOUR_WEB_APP_URL', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Test Ability',
    type: 'attack',
    description: 'This is a test ability',
    difficulty: 'easy',
    submitterName: 'Test User',
    submitterEmail: 'test@example.com'
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

## Security Notes

- The web app URL is public but only accepts POST requests with valid JSON
- No sensitive data is transmitted
- Email notifications only go to the configured admin email
- The Google Sheet is only accessible to the spreadsheet owner

## Support

If you encounter issues:
1. Check the Apps Script execution logs (View > Logs)
2. Verify the deployment URL is correct
3. Ensure all permissions are granted
4. Test with a simple suggestion first
