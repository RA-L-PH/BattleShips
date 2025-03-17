import React, { useState } from 'react';
import { ABILITIES } from '../services/abilityService';
import { FaInfoCircle, FaTimes } from 'react-icons/fa';

const AbilityInfoBubble = ({ playerAbilities }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  // Group abilities by type
  const abilityTypes = {
    attack: [],
    defense: [],
    support: []
  };

  // Filter out GODS_HAND (admin only) and populate ability types
  Object.entries(ABILITIES).forEach(([key, ability]) => {
    if (key !== 'GODS_HAND' && ability.type in abilityTypes) {
      const playerHasAbility = playerAbilities && 
        playerAbilities[key] && 
        playerAbilities[key].active;
        
      abilityTypes[ability.type].push({
        key,
        ...ability,
        owned: playerHasAbility
      });
    }
  });

  return (
    <>
      {/* Floating info button */}
      <button 
        onClick={toggleOpen}
        className="fixed bottom-4 left-4 bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all duration-300 z-30"
        aria-label="View available abilities"
      >
        <FaInfoCircle className="text-xl" />
      </button>

      {/* Information panel - view only */}
      <div 
        className={`fixed bottom-20 left-4 bg-gray-800 rounded-lg shadow-xl p-4 transition-all duration-300 transform z-20
          ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full pointer-events-none'}
          max-w-xs w-full sm:max-w-sm`}
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white text-lg font-bold">Available Abilities</h3>
          <button 
            onClick={toggleOpen}
            className="text-gray-400 hover:text-white"
            aria-label="Close ability information"
          >
            <FaTimes />
          </button>
        </div>
        
        <p className="text-gray-300 text-sm mb-4">
          These are the abilities you can request from the admin. To get an ability,
          ask the admin and answer their technical question correctly.
        </p>

        {Object.entries(abilityTypes).map(([type, abilities]) => (
          <div key={type} className="mb-4">
            <h4 className={`text-md font-bold mb-2 uppercase ${
              type === 'attack' ? 'text-red-400' : 
              type === 'defense' ? 'text-blue-400' : 'text-yellow-400'
            }`}>
              {type} Abilities
            </h4>
            <div className="space-y-2">
              {abilities.map(ability => (
                <div 
                  key={ability.key}
                  className={`p-3 rounded text-left ${
                    ability.owned 
                      ? 'bg-green-900/50 border border-green-700' 
                      : 'bg-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-bold text-white">{ability.name}</div>
                    {ability.owned && (
                      <span className="text-xs bg-green-700 px-2 py-1 rounded text-white">
                        OWNED
                      </span>
                    )}
                  </div>
                  <div className="text-xs mt-1 text-gray-300">{ability.description}</div>
                  <div className="text-xs mt-2 text-gray-400">
                    <span className="font-semibold">Cooldown:</span> {ability.cooldown} turns
                    {ability.range && <span> • <span className="font-semibold">Range:</span> {ability.range}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <p className="text-xs text-gray-400 mt-4 italic">
          You can have up to 3 abilities at a time. Once used, an ability goes on cooldown.
        </p>
      </div>
    </>
  );
};

export default AbilityInfoBubble;