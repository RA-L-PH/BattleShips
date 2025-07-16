import { ref, update } from 'firebase/database';
import { database } from './firebaseConfig';

// Define available emotes/stickers (text-based for now)
export const EMOTES = {
  // Mocking/Taunting
  LAUGHING: {
    id: 'LAUGHING',
    text: '😂 HAHA!',
    category: 'mock',
    description: 'Laughing at opponent'
  },
  MISSED: {
    id: 'MISSED',
    text: '🎯 MISS!',
    category: 'mock',
    description: 'Mocking a miss'
  },
  TOO_EASY: {
    id: 'TOO_EASY',
    text: '😎 Too Easy!',
    category: 'mock',
    description: 'Claiming superiority'
  },
  OUCH: {
    id: 'OUCH',
    text: '💥 OUCH!',
    category: 'mock',
    description: 'Mocking opponent\'s hit'
  },
  LUCK: {
    id: 'LUCK',
    text: '🍀 Just Luck!',
    category: 'mock',
    description: 'Dismissing opponent\'s success'
  },
  
  // Praising/Positive
  NICE_SHOT: {
    id: 'NICE_SHOT',
    text: '🎯 Nice Shot!',
    category: 'praise',
    description: 'Complimenting opponent'
  },
  GOOD_GAME: {
    id: 'GOOD_GAME',
    text: '🤝 Good Game!',
    category: 'praise',
    description: 'Acknowledging good play'
  },
  WELL_PLAYED: {
    id: 'WELL_PLAYED',
    text: '👏 Well Played!',
    category: 'praise',
    description: 'Praising opponent\'s strategy'
  },
  RESPECT: {
    id: 'RESPECT',
    text: '🫡 Respect!',
    category: 'praise',
    description: 'Showing respect'
  },
  IMPRESSIVE: {
    id: 'IMPRESSIVE',
    text: '🔥 Impressive!',
    category: 'praise',
    description: 'Being impressed'
  },
  
  // Neutral/Fun
  THINKING: {
    id: 'THINKING',
    text: '🤔 Hmm...',
    category: 'neutral',
    description: 'Thinking about next move'
  },
  SURPRISED: {
    id: 'SURPRISED',
    text: '😮 Whoa!',
    category: 'neutral',
    description: 'Being surprised'
  },
  CONFIDENT: {
    id: 'CONFIDENT',
    text: '💪 Bring it on!',
    category: 'neutral',
    description: 'Showing confidence'
  },
  FOCUSED: {
    id: 'FOCUSED',
    text: '🎯 Locked in!',
    category: 'neutral',
    description: 'Showing focus'
  },
  CELEBRATION: {
    id: 'CELEBRATION',
    text: '🎉 Yes!',
    category: 'neutral',
    description: 'Celebrating a success'
  }
};

// Send an emote to the opponent
export const sendEmote = async (roomId, playerId, emoteId) => {
  try {
    const emote = EMOTES[emoteId];
    if (!emote) {
      throw new Error('Invalid emote ID');
    }
    
    const timestamp = Date.now();
    const updates = {};
    
    // Store the emote in room data
    updates[`rooms/${roomId}/emotes/${timestamp}`] = {
      playerId,
      emoteId,
      text: emote.text,
      category: emote.category,
      timestamp
    };
    
    // Also store in moves for tracking
    updates[`rooms/${roomId}/moves/${timestamp}`] = {
      type: 'emote',
      playerId,
      emoteId,
      text: emote.text,
      category: emote.category,
      timestamp
    };
    
    await update(ref(database), updates);
    
    return {
      success: true,
      emote,
      timestamp
    };
  } catch (error) {
    console.error('Error sending emote:', error);
    throw error;
  }
};

// Get recent emotes for a room
export const getRecentEmotes = (room, maxCount = 5) => {
  if (!room.emotes) return [];
  
  return Object.entries(room.emotes)
    .map(([timestamp, emote]) => ({
      ...emote,
      timestamp: parseInt(timestamp)
    }))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, maxCount);
};

// Check if player can send emote (rate limiting)
export const canSendEmote = (room, playerId, cooldownMs = 3000) => {
  if (!room.emotes) return true;
  
  const recentEmotes = Object.values(room.emotes)
    .filter(emote => emote.playerId === playerId)
    .sort((a, b) => b.timestamp - a.timestamp);
  
  if (recentEmotes.length === 0) return true;
  
  const lastEmoteTime = recentEmotes[0].timestamp;
  const timeSinceLastEmote = Date.now() - lastEmoteTime;
  
  return timeSinceLastEmote >= cooldownMs;
};
