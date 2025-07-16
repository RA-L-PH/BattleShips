# CORS & Authentication Fix Guide for Google Apps Script

## The Problem
You're experiencing CORS (Cross-Origin Resource Sharing) errors with **401 status code** when trying to submit ability suggestions to Google Sheets. The 401 error indicates an **authentication/permission issue** with your Google Apps Script deployment.

## Root Cause
The 401 error occurs because:
1. Google Apps Script is not deployed with correct permissions ("Anyone" access)
2. The deployment might be using an old version of the script
3. The script might be set to "Execute as: User accessing the web app" instead of "Me"

## Critical Fix - Google Apps Script Deployment

### Step 1: Correct Deployment Settings

1. **Open Google Apps Script** (https://script.google.com/)
2. **Find your project** and paste the updated code from `google-apps-script.js`
3. **Save the project** (Ctrl+S)
4. **Deploy with EXACT settings:**
   - Click "Deploy" → "New deployment" (NOT "Manage deployments")
   - Type: "Web app"
   - Description: Add a version note (e.g., "v2 - CORS fix")
   - **Execute as: "Me (your-email@gmail.com)"** ⚠️ CRITICAL
   - **Who has access: "Anyone"** ⚠️ CRITICAL
   - Click "Deploy"
   - **Authorize the app** when prompted
   - Copy the NEW web app URL

### Step 2: Common Deployment Mistakes to Avoid

❌ **Wrong Settings:**
- Execute as: "User accessing the web app" 
- Who has access: "Only myself" or "Anyone with Google account"

✅ **Correct Settings:**
- Execute as: "Me (your account)"
- Who has access: "Anyone"

### Step 3: Update Environment Variable

Replace your old URL in `.env`:
```env
VITE_GOOGLE_APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/YOUR_NEW_SCRIPT_ID/exec
```

**Important:** The URL should end with `/exec`, not `/dev`

## Enhanced Solution with Fallback

I've updated your code with an automatic fallback system:

### Client-side Changes:
1. **Primary method**: POST with URL-encoded data
2. **Fallback method**: GET request (automatically triggered on 401/403 errors)
3. **Automatic retry**: If POST fails, it tries GET automatically

### Google Apps Script Changes:
1. **Enhanced GET handler**: Now accepts submission data via query parameters
2. **Better error handling**: More detailed error messages
3. **Dual request support**: Handles both POST and GET submissions

## Testing Steps

1. **Update your Google Apps Script** with the new code
2. **Create a NEW deployment** (don't reuse old ones)
3. **Update your .env file** with the new URL
4. **Restart your dev server**
5. **Test submission** - it should try POST first, then GET if that fails

## Troubleshooting

### If you still get 401 errors:

1. **Check Authorization:**
   - Go to Google Apps Script → "Executions" tab
   - Look for failed executions and error details

2. **Verify Deployment:**
   - Make sure you created a NEW deployment, not updated an old one
   - Check that "Execute as" is set to your account, not "User accessing the web app"

3. **Test the Script Directly:**
   - Visit your web app URL in a browser
   - You should see a JSON response, not an error page

### If you get other errors:

1. **Network Issues:** Check your internet connection
2. **URL Issues:** Make sure the URL ends with `/exec`
3. **Script Issues:** Check the Apps Script "Executions" tab for server errors

## Alternative Solution (Manual Fallback)

If automation fails, you can manually test the GET method by visiting this URL in your browser:

```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=submitAbilitySuggestion&name=Test&type=attack&description=Test%20description&difficulty=easy&submitterName=Test%20User
```

If this works in your browser but not in your app, it's definitely a CORS/deployment issue.

## Success Indicators

✅ **Working correctly when:**
- No CORS errors in browser console
- Submissions return success messages
- Data appears in your Google Sheet
- Browser network tab shows 200 status codes

❌ **Still has issues when:**
- 401/403 status codes persist
- "NetworkError when attempting to fetch resource" errors
- CORS errors continue after deployment changes

## Emergency Backup Plan

If Google Apps Script continues to fail, consider these alternatives:
1. **Netlify Forms** - Simple form handling
2. **Formspree** - Form backend service  
3. **Direct email integration** - Send suggestions via email
4. **Local storage** - Store suggestions locally and export manually

The updated code should resolve the 401 authentication issue. The key is ensuring the Google Apps Script is deployed with the correct permissions.
