import { ref, set, get, update } from 'firebase/database';
import { database } from './firebaseConfig';

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