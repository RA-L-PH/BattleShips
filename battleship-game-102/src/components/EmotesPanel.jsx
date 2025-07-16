import React, { useState } from 'react';
import { EMOTES, sendEmote, canSendEmote } from '../services/emotesService';

const EmotesPanel = ({ roomId, playerId, room, onError }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isExpanded, setIsExpanded] = useState(false);
  
  const categories = ['all', 'mock', 'praise', 'neutral'];
  
  const filteredEmotes = Object.values(EMOTES).filter(emote => 
    selectedCategory === 'all' || emote.category === selectedCategory
  );
  
  const handleSendEmote = async (emoteId) => {
    try {
      if (!canSendEmote(room, playerId)) {
        onError('Please wait before sending another emote (3 second cooldown)');
        return;
      }
      
      await sendEmote(roomId, playerId, emoteId);
    } catch (error) {
      onError(error.message);
    }
  };
  
  if (!isExpanded) {
    return (
      <div className="bg-gray-800 rounded-lg p-3 border border-gray-600">
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full text-white font-bold text-sm hover:bg-gray-700 p-2 rounded transition-colors"
        >
          😊 Emotes
        </button>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold text-sm">😊 Emotes</h3>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 hover:text-white text-xs"
        >
          ✕
        </button>
      </div>
      
      {/* Category Filter */}
      <div className="flex gap-1 mb-3">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              selectedCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
          >
            {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Emotes Grid */}
      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
        {filteredEmotes.map(emote => (
          <button
            key={emote.id}
            onClick={() => handleSendEmote(emote.id)}
            className={`p-2 rounded text-xs transition-colors border ${
              emote.category === 'mock' 
                ? 'bg-red-900/30 border-red-600 hover:bg-red-800/50 text-red-300'
                : emote.category === 'praise'
                  ? 'bg-green-900/30 border-green-600 hover:bg-green-800/50 text-green-300'
                  : 'bg-blue-900/30 border-blue-600 hover:bg-blue-800/50 text-blue-300'
            }`}
            title={emote.description}
          >
            <div className="font-bold">{emote.text}</div>
          </button>
        ))}
      </div>
      
      <div className="text-xs text-gray-400 mt-2">
        💡 3 second cooldown between emotes
      </div>
    </div>
  );
};

export default EmotesPanel;
