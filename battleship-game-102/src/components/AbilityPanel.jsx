import React, { useState, useEffect } from 'react';
import { ABILITIES } from '../services/abilityService';

const AbilityPanel = ({ 
  abilities, 
  onUseAbility, 
  isMyTurn, 
  activeAbility,
  reinforcementVertical,
  onToggleReinforcementOrientation,
  annihilateVertical = false,
  onToggleAnnihilateOrientation,
  // New ability orientations
  salvoVertical = false,
  onToggleSalvoOrientation,
  volleyFireVertical = false,
  onToggleVolleyFireOrientation,
  reconFlybyVertical = false,
  onToggleReconFlybyOrientation
}) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeAbilities, setActiveAbilities] = useState([]);
  
  useEffect(() => {
    // Calculate active abilities - filter out REINFORCEMENT and GODS_HAND
    const active = Object.entries(abilities || {})
      .filter(([key, data]) => 
        key !== 'GODS_HAND' && 
        key !== 'REINFORCEMENT' && 
        data.active && !data.used
      )
      .map(([key]) => ({ key, ...ABILITIES[key] }));
    
    setActiveAbilities(active);
  }, [abilities]);

  const handleSelectAbility = (abilityKey) => {
    if (!isMyTurn) return;
    onUseAbility(abilityKey);
    setIsPanelOpen(false); // Close panel when ability selected
  };

  const togglePanel = () => {
    setIsPanelOpen(!isPanelOpen);
  };

  return (
    <>
      {/* Floating button to open panel - Mobile optimized */}
      <button 
        onClick={togglePanel}
        className="fixed bottom-4 right-4 bg-purple-600 text-white rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center shadow-lg hover:bg-purple-700 transition-all duration-300 transform hover:scale-110 z-30 no-double-tap-zoom"
        style={{ touchAction: 'manipulation' }}
      >
        <span className="text-lg sm:text-2xl">⚔️</span>
        {activeAbilities.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center animate-bounce">
            {activeAbilities.length}
          </span>
        )}
      </button>

      {/* Panel that slides in - Mobile responsive */}
      <div 
        className={`fixed bottom-16 sm:bottom-20 right-2 sm:right-4 bg-gray-800 rounded-lg shadow-xl p-3 sm:p-4 transition-all duration-300 transform z-20
          ${isPanelOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'}
          w-72 sm:w-80 max-w-[calc(100vw-16px)]`}
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white text-base sm:text-lg font-bold">Special Abilities</h3>
          <button 
            onClick={togglePanel}
            className="text-gray-400 hover:text-white text-xl sm:text-2xl w-6 h-6 flex items-center justify-center"
          >
            &times;
          </button>
        </div>

        {activeAbilities.length === 0 ? (
          <div className="bg-gray-700 rounded p-3 text-gray-400 text-sm">
            No abilities available
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {activeAbilities.map(ability => (
              <button
                key={ability.key}
                onClick={() => isMyTurn && handleSelectAbility(ability.key)}
                className={`w-full p-3 rounded text-left transition-all duration-200 no-double-tap-zoom
                  ${activeAbility === ability.key 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-700 text-white hover:bg-gray-600'}
                  ${!isMyTurn ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                disabled={!isMyTurn}
                style={{ touchAction: 'manipulation' }}
              >
                <div className="font-bold text-sm sm:text-base">{ability.name}</div>
                <div className="text-xs mt-1">{ability.description}</div>
                <div className="text-xs mt-1 opacity-75">Type: {ability.type}</div>
              </button>
            ))}
          </div>
        )}

        {activeAbility && activeAbility === 'REINFORCEMENT' && (
          <div className="mt-4 bg-gray-700 rounded p-3 animate-pulse">
            <div className="text-white mb-2 text-sm">Ship Orientation:</div>
            <button 
              onClick={() => {
                if (onToggleReinforcementOrientation) onToggleReinforcementOrientation();
              }}
              className="px-4 py-2 bg-blue-600 rounded text-white flex items-center justify-center gap-2 w-full text-sm no-double-tap-zoom"
              style={{ touchAction: 'manipulation' }}
            >
              <span>{reinforcementVertical ? "Vertical" : "Horizontal"}</span>
              <span className="inline-block text-xs">
                {reinforcementVertical ? "│\n│" : "──"}
              </span>
            </button>
          </div>
        )}        {activeAbility && activeAbility === 'ANNIHILATE' && (
          <div className="mt-4 bg-gray-700 rounded p-3 animate-pulse">
            <div className="text-white mb-2 text-sm">Attack Direction:</div>
            <div className="flex gap-2 justify-center">
              <button
                className={`px-3 py-2 rounded text-xs no-double-tap-zoom ${
                  annihilateVertical ? 'bg-gray-700' : 'bg-blue-600'
                }`}
                onClick={() => onToggleAnnihilateOrientation?.()}
                style={{ touchAction: 'manipulation' }}
              >
                <span role="img" aria-label="Horizontal">
                  ─ ─ ─
                </span>
              </button>
              <button
                className={`px-3 py-2 rounded text-xs no-double-tap-zoom ${
                  annihilateVertical ? 'bg-blue-600' : 'bg-gray-700'
                }`}
                onClick={() => onToggleAnnihilateOrientation?.()}
                style={{ touchAction: 'manipulation' }}
              >
                <span role="img" aria-label="Vertical">
                  │<br />│<br />│
                </span>
              </button>
            </div>
            <p className="text-xs mt-1 text-gray-400">
              {annihilateVertical 
                ? "Hits target and 2 cells above" 
                : "Hits center and cells on either side"}
            </p>
          </div>
        )}

        {/* Salvo Orientation Controls */}
        {activeAbility && activeAbility === 'SALVO' && (
          <div className="mt-4 bg-gray-700 rounded p-3 animate-pulse">
            <div className="text-white mb-2 text-sm">Salvo Direction:</div>
            <button 
              onClick={() => {
                if (onToggleSalvoOrientation) onToggleSalvoOrientation();
              }}
              className="px-4 py-2 bg-blue-600 rounded text-white flex items-center justify-center gap-2 w-full text-sm no-double-tap-zoom"
              style={{ touchAction: 'manipulation' }}
            >
              <span>{salvoVertical ? "Vertical" : "Horizontal"}</span>
              <span className="inline-block text-xs">
                {salvoVertical ? "│\n│\n│" : "─ ─ ─"}
              </span>
            </button>
            <p className="text-xs mt-1 text-gray-400">
              {salvoVertical ? "Three shots downward" : "Three shots rightward"}
            </p>
          </div>
        )}

        {/* Volley Fire Orientation Controls */}
        {activeAbility && activeAbility === 'VOLLEY_FIRE' && (
          <div className="mt-4 bg-gray-700 rounded p-3 animate-pulse">
            <div className="text-white mb-2 text-sm">Volley Fire Pattern:</div>
            <button 
              onClick={() => {
                if (onToggleVolleyFireOrientation) onToggleVolleyFireOrientation();
              }}
              className="px-4 py-2 bg-blue-600 rounded text-white flex items-center justify-center gap-2 w-full text-sm no-double-tap-zoom"
              style={{ touchAction: 'manipulation' }}
            >
              <span>{volleyFireVertical ? "3x1 Vertical" : "1x3 Horizontal"}</span>
              <span className="inline-block text-xs">
                {volleyFireVertical ? "│\n│\n│" : "─ ─ ─"}
              </span>
            </button>
            <p className="text-xs mt-1 text-gray-400">
              Simultaneous attack on 3 cells
            </p>
          </div>
        )}

        {/* Reconnaissance Flyby Orientation Controls */}
        {activeAbility && activeAbility === 'RECONNAISSANCE_FLYBY' && (
          <div className="mt-4 bg-gray-700 rounded p-3 animate-pulse">
            <div className="text-white mb-2 text-sm">Flyby Direction:</div>
            <button 
              onClick={() => {
                if (onToggleReconFlybyOrientation) onToggleReconFlybyOrientation();
              }}
              className="px-4 py-2 bg-blue-600 rounded text-white flex items-center justify-center gap-2 w-full text-sm no-double-tap-zoom"
              style={{ touchAction: 'manipulation' }}
            >
              <span>{reconFlybyVertical ? "5x1 Vertical" : "1x5 Horizontal"}</span>
              <span className="inline-block text-xs">
                {reconFlybyVertical ? "│\n│\n│\n│\n│" : "─ ─ ─ ─ ─"}
              </span>
            </button>
            <p className="text-xs mt-1 text-gray-400">
              Count unique ships in 5-cell line
            </p>
          </div>
        )}

        {activeAbility && (
          <div className="mt-4 text-yellow-300 text-xs sm:text-sm animate-pulse">
            Click on the {activeAbility === 'REINFORCEMENT' ? 'your' : 'opponent\'s'} grid to use this ability
          </div>
        )}
      </div>
    </>
  );
};

export default AbilityPanel;