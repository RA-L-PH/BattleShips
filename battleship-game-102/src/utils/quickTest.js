/**
 * Quick Test Script for AI and Google Sheets
 * Run this in browser console to quickly check if your API keys are working
 */

// Test environment variables
console.log('🔍 Environment Check:');
console.log('Gemini API Key:', import.meta.env.VITE_GEMINI_API_KEY ? 
  (import.meta.env.VITE_GEMINI_API_KEY.startsWith('AIzaSy') ? 
    (import.meta.env.VITE_GEMINI_API_KEY === 'AIzaSyC26WPoKlqHoImtB7C7FvCwwN-q_T_OiXs' ? 
      '❌ PLACEHOLDER (Update needed!)' : '✅ SET') : 
    '⚠️ Invalid format') : 
  '❌ MISSING');

console.log('Google Apps Script URL:', import.meta.env.VITE_GOOGLE_APPS_SCRIPT_WEB_APP_URL ? 
  (import.meta.env.VITE_GOOGLE_APPS_SCRIPT_WEB_APP_URL.includes('AKfycbwRWrKuQZdYKal_mnLovekKh7k5wL3HXa-WN7DK05mbStcBZy6vjA_luNHxBxBizPhv') ? 
    '❌ PLACEHOLDER (Update needed!)' : '✅ SET') : 
  '❌ MISSING');

// Quick AI test
const testAI = async () => {
  console.log('\n🤖 Quick AI Test:');
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent("Say 'AI test successful' if you can read this.");
    console.log('✅ AI Response:', result.response.text());
  } catch (error) {
    console.error('❌ AI Test Failed:', error.message);
  }
};

// Quick Google Sheets test
const testGoogleSheets = async () => {
  console.log('\n📊 Quick Google Sheets Test:');
  try {
    const response = await fetch(import.meta.env.VITE_GOOGLE_APPS_SCRIPT_WEB_APP_URL + '?test=true');
    if (response.ok) {
      console.log('✅ Google Apps Script reachable');
    } else {
      console.log('⚠️ Response status:', response.status);
    }
  } catch (error) {
    console.error('❌ Google Sheets Test Failed:', error.message);
  }
};

// Export test functions
window.quickTest = {
  testAI,
  testGoogleSheets,
  runAll: async () => {
    await testAI();
    await testGoogleSheets();
    console.log('\n🎯 Next Steps:');
    console.log('1. If AI test failed: Update VITE_GEMINI_API_KEY in .env');
    console.log('2. If Google Sheets failed: Update VITE_GOOGLE_APPS_SCRIPT_WEB_APP_URL in .env');
    console.log('3. Restart dev server after .env changes');
  }
};

console.log('\n🚀 Quick Test Available!');
console.log('Run: quickTest.runAll()');

export { testAI, testGoogleSheets };
