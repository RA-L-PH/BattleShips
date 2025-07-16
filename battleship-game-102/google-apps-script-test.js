// Test script for Google Apps Script
// Paste this into your Google Apps Script console and run it to test

function testDirectSubmission() {
  console.log('Testing direct submission...');
  
  const testData = {
    timestamp: new Date().toISOString(),
    name: 'Test Ability - Direct',
    type: 'attack',
    description: 'This is a test ability submitted directly from Apps Script console',
    difficulty: 'easy',
    submitterName: 'Script Test',
    submitterEmail: 'test@example.com',
    status: 'New'
  };
  
  try {
    const result = handleAbilitySuggestion(testData);
    console.log('Direct test result:', result.getContent());
    
    // Test sheet creation
    const sheet = getOrCreateSheet();
    console.log('Sheet found/created:', sheet.getName());
    console.log('Total rows in sheet:', sheet.getLastRow());
    
    return 'Test completed successfully!';
  } catch (error) {
    console.error('Test failed:', error);
    return 'Test failed: ' + error.message;
  }
}

// Run this function to test your Google Apps Script
function runTest() {
  return testDirectSubmission();
}
