import React, { useEffect, useState } from 'react';
import { getRecentEmotes } from '../services/emotesService';

const EmoteDisplay = ({ room, players, maxEmotes = 3 }) => {
  const [recentEmotes, setRecentEmotes] = useState([]);
  
  useEffect(() => {
    if (room) {
      const emotes = getRecentEmotes(room, maxEmotes);
      setRecentEmotes(emotes);
    }
  }, [room, maxEmotes]);
  
  if (recentEmotes.length === 0) return null;
  
  return (
    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-600">
      <h4 className="text-white font-bold text-sm mb-2">Recent Emotes</h4>
      <div className="space-y-2">
        {recentEmotes.map((emote, index) => {
          const player = players.find(p => p.playerId === emote.playerId);
          const playerName = player?.name || emote.playerId;
          
          return (
            <div
              key={`${emote.timestamp}-${index}`}
              className={`flex items-center gap-2 p-2 rounded text-sm animate-fadeIn ${
                emote.category === 'mock' 
                  ? 'bg-red-900/20 border border-red-600/30'
                  : emote.category === 'praise'
                    ? 'bg-green-900/20 border border-green-600/30'
                    : 'bg-blue-900/20 border border-blue-600/30'
              }`}
            >
              <span className="text-gray-300 font-medium text-xs">
                {playerName}:
              </span>
              <span className={`font-bold ${
                emote.category === 'mock' ? 'text-red-300' :
                emote.category === 'praise' ? 'text-green-300' : 'text-blue-300'
              }`}>
                {emote.text}
              </span>
              <span className="text-xs text-gray-500 ml-auto">
                {new Date(emote.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EmoteDisplay;
