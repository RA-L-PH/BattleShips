# 🚀 IMMEDIATE FIX GUIDE - AI & Google Sheets Issues

## 🔥 CRITICAL: You're using placeholder API keys!

### Issue Identified:
Your `.env` file contains example/placeholder values that won't work:
- `VITE_GEMINI_API_KEY=AIzaSyC26WPoKlqHoImtB7C7FvCwwN-q_T_OiXs` ❌ (This is a placeholder)
- `VITE_GOOGLE_APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/...` ❌ (This is an example URL)

## 🛠️ IMMEDIATE FIXES NEEDED

### 1. Fix Gemini AI (For AI not making moves)

**Step 1: Get a real Gemini API key**
1. Go to: https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key (should start with `AIzaSy...`)

**Step 2: Update your .env file**
```bash
# Replace the placeholder with your REAL API key:
VITE_GEMINI_API_KEY=AIzaSyYOUR_REAL_API_KEY_HERE
```

### 2. Fix Google Sheets (For ability suggestions)

**Step 1: Set up Google Apps Script**
1. Go to: https://script.google.com/
2. Click "New Project"
3. Replace the default code with the content from `google-apps-script.js`
4. Save the project (Ctrl+S)
5. Click "Deploy" → "New Deployment"
6. Set "Type" to "Web App"
7. Set "Execute as" to "Me"
8. Set "Who has access" to "Anyone"
9. Click "Deploy"
10. Copy the provided URL

**Step 2: Update your .env file**
```bash
# Replace with your REAL Google Apps Script URL:
VITE_GOOGLE_APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/YOUR_ACTUAL_DEPLOYMENT_ID/exec
```

## 🧪 TESTING STEPS

### After updating .env:

1. **Restart your development server** (important for .env changes):
   ```powershell
   # Stop the current server (Ctrl+C if running)
   npm run dev
   ```

2. **Run diagnostics in browser console**:
   ```javascript
   // Open browser console (F12) and run:
   battleshipDiagnostics.runDiagnostics()
   ```

3. **Test AI in a new game**:
   - Start a new game vs AI
   - Watch browser console for any errors
   - AI should make a move within 3-5 seconds

4. **Test ability suggestions**:
   - Try submitting an ability suggestion
   - Check browser console for success/error messages

## 🔍 VERIFICATION CHECKLIST

### ✅ Gemini AI Working:
- [ ] Real API key in .env (not the placeholder)
- [ ] Development server restarted
- [ ] AI makes moves in games
- [ ] No API key errors in console

### ✅ Google Sheets Working:
- [ ] Google Apps Script deployed correctly
- [ ] Real deployment URL in .env
- [ ] Ability suggestions submit successfully
- [ ] No CORS errors in console

## 🚨 COMMON ISSUES

### AI Still Not Working?
1. Check browser console for errors during AI turns
2. Verify API key is valid (test at https://makersuite.google.com/)
3. Check if you have API quota/billing enabled for Gemini

### Google Sheets Still Failing?
1. Verify Google Apps Script permissions ("Anyone" + "Execute as Me")
2. Check if the deployment URL is correct
3. Test the script directly in Google Apps Script editor

## 📞 GET HELP

If issues persist after following this guide:
1. Check browser console for specific error messages
2. Run the diagnostic script and share the output
3. Verify all steps in `CORS_FIX_GUIDE.md` were followed

---
*This guide should resolve both the AI movement issue and the ability suggestion submission problem.*
