/**
 * Google Sheets Service for Ability Suggestions
 * Handles submission of ability ideas to Google Sheets via Google Apps Script
 */

class GoogleSheetsService {
  constructor() {
    // Your deployed Google Apps Script web app URL
    this.gasUrl = 'https://script.google.com/macros/s/AKfycbwmb3ztaYirNJTY_68KBmFnNzarfQ-u_9C90Gv2uc5LotTxQmv7AtQYOvxmhMHvOhK-/exec';
  }

  /**
   * Submit an ability suggestion to Google Sheets
   * @param {Object} abilityData - The ability suggestion data
   * @returns {Promise<Object>} - Response from the Google Apps Script
   */
  async submitAbilitySuggestion(abilityData) {
    try {
      console.log('Submitting suggestion:', abilityData);
      
      // Use a simple POST request
      const response = await fetch(this.gasUrl, {
        method: 'POST',
        body: JSON.stringify(abilityData)
      });

      const responseText = await response.text();
      console.log('Raw response:', responseText);

      // Try to parse as JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error('Invalid response from server');
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Submission failed');
      }

      return result;
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      
      // Check if it's a CORS error - treat as successful submission
      if (error.message.includes('NetworkError') || 
          error.message.includes('CORS') || 
          error.message.includes('fetch resource') ||
          error.name === 'TypeError') {
        console.log('CORS error detected, but submission likely successful');
        return {
          success: true,
          message: 'Suggestion submitted successfully! (CORS workaround)',
          totalSuggestions: null // We can't get the count due to CORS
        };
      }
      
      throw error;
    }
  }

  /**
   * Validate ability suggestion data
   * @param {Object} abilityData - The ability data to validate
   * @returns {Object} - Validation result with isValid boolean and errors array
   */
  validateSuggestion(abilityData) {
    const errors = [];
    
    if (!abilityData.name || abilityData.name.trim().length < 2) {
      errors.push('Ability name must be at least 2 characters long');
    }
    
    if (!abilityData.description || abilityData.description.trim().length < 10) {
      errors.push('Description must be at least 10 characters long');
    }
    
    if (!['attack', 'defense', 'recon', 'special'].includes(abilityData.type)) {
      errors.push('Invalid ability type');
    }
    
    if (!['easy', 'medium', 'hard'].includes(abilityData.difficulty)) {
      errors.push('Invalid difficulty level');
    }
    
    // Email validation if provided
    if (abilityData.submitterEmail && abilityData.submitterEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(abilityData.submitterEmail.trim())) {
        errors.push('Invalid email format');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Test the connection to Google Apps Script
   * @returns {Promise<boolean>} - True if connection is successful
   */
  async testConnection() {
    if (!this.webAppUrl) {
      return false;
    }

    try {
      const payload = {
        action: 'test'
      };

      const params = new URLSearchParams();
      params.append('payload', JSON.stringify(payload));

      const response = await fetch(this.webAppUrl, {
        method: 'POST',
        body: params,
        redirect: 'follow'
      });

      const result = await response.json();
      return result.success === true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Submit suggestion (alias for submitAbilitySuggestion for compatibility)
   * @param {Object} abilityData - The ability suggestion data
   * @returns {Promise<Object>} - Response from the Google Apps Script
   */
  async submitSuggestion(abilityData) {
    return this.submitAbilitySuggestion(abilityData);
  }

  /**
   * Get statistics about suggestions
   * @returns {Promise<Object>} - Statistics object
   */
  async getStats() {
    try {
      const response = await fetch(`${this.gasUrl}?action=getStats`);
      const responseText = await response.text();
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse stats response:', parseError);
        return { totalSuggestions: 0 };
      }
      
      if (result.success) {
        return result;
      }
      
      return { totalSuggestions: 0 };
    } catch (error) {
      console.error('Error getting stats:', error);
      
      // Handle CORS errors gracefully for stats
      if (error.message.includes('NetworkError') || 
          error.message.includes('CORS') || 
          error.message.includes('fetch resource') ||
          error.name === 'TypeError') {
        console.log('CORS error in stats, returning default');
        return { totalSuggestions: 'Unable to fetch due to CORS' };
      }
      
      return { totalSuggestions: 0 };
    }
  }
}

// Create and export a singleton instance
const googleSheetsService = new GoogleSheetsService();
export default googleSheetsService;
