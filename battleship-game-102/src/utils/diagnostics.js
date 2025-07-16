/**
 * Diagnostic Test for AI and Google Sheets Issues
 * Run this in browser console to test both systems
 */

// Test 1: Check Environment Variables
console.log('🔍 Environment Variables Check:');
console.log('VITE_GEMINI_API_KEY:', import.meta.env.VITE_GEMINI_API_KEY ? 'SET' : 'MISSING');
console.log('VITE_GOOGLE_APPS_SCRIPT_WEB_APP_URL:', import.meta.env.VITE_GOOGLE_APPS_SCRIPT_WEB_APP_URL || 'MISSING');

// Test 2: Google Sheets Service Test
const testGoogleSheets = async () => {
  console.log('\n📊 Testing Google Sheets Service:');
  
  try {
    // Import the service
    const { default: googleSheetsService } = await import('./src/services/googleSheetsService.js');
    
    console.log('Service loaded:', !!googleSheetsService);
    console.log('Web App URL configured:', !!googleSheetsService.webAppUrl);
    
    // Test connection
    const connectionTest = await googleSheetsService.testConnection();
    console.log('Connection test result:', connectionTest);
    
    // Test suggestion submission with fallback
    const testData = {
      name: 'Test Ability',
      type: 'attack',
      description: 'This is a test ability for diagnostic purposes',
      difficulty: 'easy',
      submitterName: 'Diagnostic Test',
      submitterEmail: 'test@diagnostic.com'
    };
    
    console.log('Testing suggestion submission...');
    const result = await googleSheetsService.submitSuggestion(testData);
    console.log('Submission result:', result);
    
  } catch (error) {
    console.error('Google Sheets test failed:', error);
    console.log('Error details:', {
      message: error.message,
      stack: error.stack
    });
  }
};

// Test 3: AI Service Test
const testAiService = async () => {
  console.log('\n🤖 Testing AI Service:');
  
  try {
    // Import AI service
    const { GeminiAiPlayer } = await import('./src/services/geminiAiService.js');
    
    console.log('AI Service loaded:', !!GeminiAiPlayer);
    
    // Test API key
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ Gemini API key is missing!');
      console.log('Add VITE_GEMINI_API_KEY to your .env file');
      return;
    }
    
    console.log('✅ API key is configured');
    
    // Test AI player creation
    const testRoomId = 'test_room_' + Date.now();
    const ai = new GeminiAiPlayer(testRoomId, 'test_ai_player');
    
    console.log('AI Player created:', !!ai);
    console.log('AI Model initialized:', !!ai.model);
    
    // Test basic AI functionality
    const probabilityMap = ai.initializeProbabilityMap(8);
    console.log('Probability map created:', probabilityMap.length === 8);
    
  } catch (error) {
    console.error('AI Service test failed:', error);
    console.log('Error details:', {
      message: error.message,
      stack: error.stack
    });
  }
};

// Test 4: Check Firebase Connection
const testFirebase = async () => {
  console.log('\n🔥 Testing Firebase Connection:');
  
  try {
    const { database } = await import('./src/services/firebaseConfig.js');
    console.log('Firebase database configured:', !!database);
    
    // Test basic read operation
    const { ref, get } = await import('firebase/database');
    const testRef = ref(database, '.info/connected');
    const snapshot = await get(testRef);
    console.log('Firebase connection status:', snapshot.val());
    
  } catch (error) {
    console.error('Firebase test failed:', error);
  }
};

// Test 5: AI Turn Monitoring Test
const testAiMonitoring = async () => {
  console.log('\n👁️ Testing AI Turn Monitoring:');
  
  try {
    const { monitorAiTurns } = await import('./src/services/geminiAiService.js');
    console.log('AI monitoring function available:', typeof monitorAiTurns === 'function');
    
    // Check if there are any active AI games
    const { ref, get } = await import('firebase/database');
    const { database } = await import('./src/services/firebaseConfig.js');
    
    const roomsRef = ref(database, 'rooms');
    const snapshot = await get(roomsRef);
    const rooms = snapshot.val() || {};
    
    const aiGames = Object.values(rooms).filter(room => 
      room.gameMode === 'ai' && room.gameStarted && !room.gameOver
    );
    
    console.log('Active AI games found:', aiGames.length);
    
    if (aiGames.length > 0) {
      const aiGame = aiGames[0];
      const aiPlayer = Object.keys(aiGame.players).find(id => aiGame.players[id].isAI);
      console.log('Current turn in AI game:', aiGame.currentTurn);
      console.log('AI player ID:', aiPlayer);
      console.log('Is AI turn?', aiGame.currentTurn === aiPlayer);
    }
    
  } catch (error) {
    console.error('AI monitoring test failed:', error);
  }
};

// Run all tests
const runDiagnostics = async () => {
  console.log('🚀 Starting Diagnostic Tests...\n');
  
  await testGoogleSheets();
  await testAiService();
  await testFirebase();
  await testAiMonitoring();
  
  console.log('\n✅ Diagnostic tests completed!');
  console.log('\n💡 Solutions:');
  console.log('1. For Google Sheets: Update your Google Apps Script with new code and redeploy');
  console.log('2. For AI: Add VITE_GEMINI_API_KEY to your .env file');
  console.log('3. For AI not making moves: Check console for any errors during AI turns');
};

// Export for manual testing
window.battleshipDiagnostics = {
  runDiagnostics,
  testGoogleSheets,
  testAiService,
  testFirebase,
  testAiMonitoring
};

console.log('🛠️ Battleship Diagnostics loaded!');
console.log('Run: battleshipDiagnostics.runDiagnostics()');

export { runDiagnostics, testGoogleSheets, testAiService, testFirebase, testAiMonitoring };
