import React from 'react';

const AbilityIndicator = ({ abilities }) => {
  const activeAbilities = Object.entries(abilities || {})
    .filter(([_, data]) => data.installed && !data.used)
    .map(([key]) => key);
    
  if (activeAbilities.length === 0) return null;
  
  return (
    <div className="fixed top-4 left-4 z-20">
      {activeAbilities.includes('JAM') && (
        <div className="bg-blue-900/70 text-blue-200 px-3 py-2 rounded-lg shadow-lg mb-2 border border-blue-500 flex items-center animate-pulse">
          <div className="w-3 h-3 rounded-full bg-blue-400 mr-2"></div>
          JAM Protection Active
        </div>
      )}
      
      {activeAbilities.includes('COUNTER') && (
        <div className="bg-purple-900/70 text-purple-200 px-3 py-2 rounded-lg shadow-lg border border-purple-500 flex items-center">
          <div className="w-3 h-3 rounded-full bg-purple-400 mr-2"></div>
          COUNTER Ready
        </div>
      )}
    </div>
  );
};

export default AbilityIndicator;