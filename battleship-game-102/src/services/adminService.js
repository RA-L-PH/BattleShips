import { ref, set, get, update } from 'firebase/database';
import { database } from './firebaseConfig';
import { executeGodsHand } from './abilityService';

export const createGameAsAdmin = async (roomId, adminId) => {
  try {
    if (!roomId) {
      throw new Error('Invalid roomId');
    }

    const roomRef = ref(database, `rooms/${roomId}`);

    // Check if room exists
    const snapshot = await get(roomRef);
    if (snapshot.exists()) {
      throw new Error('Room already exists');
    }

    // Create room with admin
    const room = {
      id: roomId,
      status: 'waiting',
      createdAt: Date.now(),
      playerCount: 0,
      players: {},
      admin: adminId,
      gameStarted: false,
      gameOver: false
    };

    await set(roomRef, room);
    console.log('Room created by admin:', roomId);
    return true;
  } catch (error) {
    console.error('Error creating room as admin:', error);
    throw error;
  }
};

export const startGame = async (roomId) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    
    if (!snapshot.exists()) {
      throw new Error('Room not found');
    }
    
    const room = snapshot.val();
    
    if (Object.keys(room.players || {}).length !== 2) {
      throw new Error('Need exactly 2 players to start game');
    }
    
    if (!Object.values(room.players).every(player => player.ready)) {
      throw new Error('All players must be ready');
    }
    
    // Start the game and set first player's turn
    const updates = {
      gameStarted: true,
      status: 'playing',
      currentTurn: Object.keys(room.players)[0],
      startedAt: Date.now(),
      countdown: null  // Clear countdown value
    };
    
    await update(roomRef, updates);
    return true;
  } catch (error) {
    console.error('Error starting game:', error);
    throw error;
  }
};

export const endGame = async (roomId) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    
    if (!snapshot.exists()) {
      throw new Error('Room not found');
    }
    
    // End the game
    const updates = {
      gameOver: true,
      status: 'completed',
      endedAt: Date.now()
    };
    
    await update(roomRef, updates);
    return true;
  } catch (error) {
    console.error('Error ending game:', error);
    throw error;
  }
};

export const joinRoomAsAdmin = async (roomId, adminId) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    
    if (!snapshot.exists()) {
      throw new Error('Room not found');
    }
    
    const room = snapshot.val();
    
    // Only allow the admin who created the room to join
    if (room.admin !== adminId) {
      throw new Error('Not authorized');
    }
    
    return true;
  } catch (error) {
    console.error('Error joining room as admin:', error);
    throw error;
  }
};

// Admin function to execute God's Hand ability
export const adminTriggerGodsHand = async (roomId, targetPlayerId, quadrantIndex) => {
  try {
    // Call the executeGodsHand function with isAdminTriggered = true
    return await executeGodsHand(roomId, targetPlayerId, quadrantIndex, true);
  } catch (error) {
    console.error("Error executing God's Hand as admin:", error);
    throw error;
  }
};

// Add this function to your adminService.js file

export const toggleGamePause = async (roomId) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    
    if (!snapshot.exists()) {
      throw new Error('Room not found');
    }
    
    const room = snapshot.val();
    const isPaused = room.isPaused || false;
    
    // Toggle pause state
    await update(roomRef, {
      isPaused: !isPaused,
      lastPausedStateChange: Date.now()
    });
    
    return !isPaused; // Return the new pause state
  } catch (error) {
    console.error('Error toggling game pause:', error);
    throw error;
  }
};