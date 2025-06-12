import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where
} from 'firebase/firestore';
import { db } from '../firebase';
import { ref, set } from 'firebase/database';
import { database } from './firebaseConfig';

// Random Game Queue Service
export const joinRandomGameQueue = async (playerId, playerName, preferences = {}) => {
  try {
    // Add player to the queue
    const queueRef = await addDoc(collection(db, 'randomGameQueue'), {
      playerId,
      playerName,
      preferences: {
        abilities: preferences.abilities !== false, // Default to true
        gridSize: preferences.gridSize || 8,
        shipCount: preferences.shipCount || 'default',
        ...preferences
      },
      joinedAt: Date.now(),
      status: 'waiting' // 'waiting', 'matched', 'timeout'
    });

    return queueRef.id;
  } catch (error) {
    console.error('Error joining random game queue:', error);
    throw error;
  }
};

// Enhanced autonomous random game system - find existing room or create new one
export const findOrCreateRandomRoom = async (playerId, playerName, preferences = {}) => {
  try {
    const { ref: dbRef, get, set, update } = await import('firebase/database');
    const { database } = await import('./firebaseConfig');
    
    // First, look for existing rooms with only 1 player
    const roomsRef = dbRef(database, 'rooms');
    const snapshot = await get(roomsRef);
    const rooms = snapshot.val() || {};
    
    // Find a suitable room to join
    const availableRoom = Object.values(rooms).find(room => 
      room.gameMode === 'random' && 
      room.status === 'waiting' && 
      room.playerCount === 1 && 
      !room.gameStarted &&
      !room.gameOver
    );
    
    if (availableRoom) {
      // Join existing room
      const roomId = availableRoom.id;
      const existingPlayerId = Object.keys(availableRoom.players)[0];
      
      // Add current player to the room
      const updates = {};
      updates[`rooms/${roomId}/players/${playerId}`] = {
        id: playerId,
        name: playerName,
        ready: false,
        joinedAt: Date.now(),
        isHost: false
      };
      updates[`rooms/${roomId}/playerCount`] = 2;
      
      await update(dbRef(database), updates);
      
      console.log(`Joined existing room ${roomId} with player ${availableRoom.players[existingPlayerId].name}`);
      
      return {
        roomId,
        isNewRoom: false,
        opponent: availableRoom.players[existingPlayerId],
        settings: availableRoom.settings
      };
    } else {
      // Create new room
      const roomId = `RND_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const roomRef = dbRef(database, `rooms/${roomId}`);
      
      const room = {
        id: roomId,
        gameMode: 'random',
        status: 'waiting',
        createdAt: Date.now(),
        playerCount: 1,
        players: {
          [playerId]: {
            id: playerId,
            name: playerName,
            ready: false,
            joinedAt: Date.now(),
            isHost: true
          }
        },
        gameStarted: false,
        gameOver: false,
        settings: {
          abilities: preferences.abilities !== false, // Default to true
          gridSize: preferences.gridSize || 8,
          autoStart: true,
          turnTimeLimit: 60,
          maxShips: 5
        }
      };
      
      await set(roomRef, room);
      
      console.log(`Created new room ${roomId} waiting for opponent`);
      
      return {
        roomId,
        isNewRoom: true,
        opponent: null,
        settings: room.settings
      };
    }
  } catch (error) {
    console.error('Error finding or creating random room:', error);
    throw error;
  }
};

// Legacy function - keeping for backward compatibility but updating to use new system
export const findRandomMatch = async (queueId, playerId) => {
  try {
    // Look for players in the queue with waiting status
    // We'll filter out the current player in JavaScript to avoid composite index requirement
    const q = query(
      collection(db, 'randomGameQueue'),
      where('status', '==', 'waiting')
    );
    
    const querySnapshot = await getDocs(q);
    
    // Filter out current player manually
    const availableOpponents = querySnapshot.docs.filter(doc => 
      doc.data().playerId !== playerId
    );
    
    if (availableOpponents.length === 0) {
      return null; // No match found
    }

    // For now, match with the first available player
    // In the future, we could implement more sophisticated matching logic
    const opponentDoc = availableOpponents[0];
    const opponentData = opponentDoc.data();

    // Create a random room
    const roomId = `RND_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // Get current queue entry
    const currentQueueDoc = await getDoc(doc(db, 'randomGameQueue', queueId));
    const currentPlayerData = currentQueueDoc.data();    // Create room in realtime database with both players automatically added
    const roomRef = ref(database, `rooms/${roomId}`);
    const room = {
      id: roomId,
      gameMode: 'random',
      status: 'waiting',
      createdAt: Date.now(),
      playerCount: 2,
      players: {
        [currentPlayerData.playerId]: {
          id: currentPlayerData.playerId,
          name: currentPlayerData.playerName,
          ready: false,
          joinedAt: Date.now(),
          isHost: true // First matched player becomes host
        },
        [opponentData.playerId]: {
          id: opponentData.playerId,
          name: opponentData.playerName,
          ready: false,
          joinedAt: Date.now(),
          isHost: false
        }
      },      gameStarted: false,
      gameOver: false,
      settings: {
        abilities: currentPlayerData.preferences.abilities !== false && opponentData.preferences.abilities !== false, // Both must explicitly disable
        gridSize: Math.min(currentPlayerData.preferences.gridSize, opponentData.preferences.gridSize),
        autoStart: true, // Random games auto-start when both players are ready
        turnTimeLimit: 60, // Default turn time limit
        maxShips: 5 // Default ship count
      }
    };await set(roomRef, room);

    // Update queue statuses for both players
    await updateDoc(doc(db, 'randomGameQueue', queueId), {
      status: 'matched',
      matchedWith: opponentDoc.id,
      roomId,
      matchedAt: Date.now()
    });

    await updateDoc(doc(db, 'randomGameQueue', opponentDoc.id), {
      status: 'matched',
      matchedWith: queueId,
      roomId,
      matchedAt: Date.now()
    });

    return {
      roomId,
      opponent: opponentData,
      currentPlayer: currentPlayerData,
      settings: room.settings
    };
  } catch (error) {
    console.error('Error finding random match:', error);
    throw error;
  }
};

export const leaveRandomGameQueue = async (queueId) => {
  try {
    await updateDoc(doc(db, 'randomGameQueue', queueId), {
      status: 'cancelled',
      leftAt: Date.now()
    });
  } catch (error) {
    console.error('Error leaving random game queue:', error);
    throw error;
  }
};

// Clean up old queue entries (should be called periodically)
export const cleanupRandomGameQueue = async () => {
  try {
    const cutoffTime = Date.now() - (5 * 60 * 1000); // 5 minutes ago
    
    // Get all waiting entries and filter by time in JavaScript to avoid composite index
    const q = query(
      collection(db, 'randomGameQueue'),
      where('status', '==', 'waiting')
    );
    
    const querySnapshot = await getDocs(q);
    
    // Filter by time in JavaScript
    const expiredDocs = querySnapshot.docs.filter(doc => 
      doc.data().joinedAt < cutoffTime
    );
    
    const promises = expiredDocs.map(doc => 
      updateDoc(doc.ref, { status: 'timeout' })
    );
    
    await Promise.all(promises);
  } catch (error) {
    console.error('Error cleaning up random game queue:', error);
  }
};

// Friendly Fire Game Service
export const createFriendlyGame = async (hostPlayerId, hostPlayerName, gameSettings = {}) => {
  try {
    const roomId = `FRIEND_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    // Create room in realtime database
    const roomRef = ref(database, `rooms/${roomId}`);
    const room = {
      id: roomId,
      gameMode: 'friendly',
      status: 'waiting',
      createdAt: Date.now(),
      hostPlayerId,
      playerCount: 0,
      players: {},
      gameStarted: false,
      gameOver: false,
      settings: {
        abilities: gameSettings.abilities !== false, // Default to true
        gridSize: gameSettings.gridSize || 8,
        shipCount: gameSettings.shipCount || 'default',
        isPrivate: true,
        autoStart: false // Host controls when to start
      }
    };

    await set(roomRef, room);

    // Save to Firestore for tracking
    await addDoc(collection(db, 'friendlyGames'), {
      roomId,
      hostPlayerId,
      hostPlayerName,
      settings: room.settings,
      createdAt: Date.now(),
      status: 'waiting'
    });

    return roomId;
  } catch (error) {
    console.error('Error creating friendly game:', error);
    throw error;
  }
};

// Custom Game Service (for Admins/SuperAdmins)
export const createCustomGame = async (adminId, gameSettings) => {
  try {
    const roomId = gameSettings.roomId || `CUSTOM_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    // Create room in realtime database
    const roomRef = ref(database, `rooms/${roomId}`);
    const room = {
      id: roomId,
      gameMode: 'custom',
      status: 'waiting',
      createdAt: Date.now(),
      admin: adminId,
      playerCount: 0,
      players: {},
      gameStarted: false,
      gameOver: false,
      settings: {
        abilities: gameSettings.abilities !== false,
        gridSize: gameSettings.gridSize || 8,
        shipCount: gameSettings.shipCount || 'default',
        customShips: gameSettings.customShips || null,
        timeLimit: gameSettings.timeLimit || null,
        turnTimeLimit: gameSettings.turnTimeLimit || 30
      }
    };

    await set(roomRef, room);

    return roomId;
  } catch (error) {
    console.error('Error creating custom game:', error);
    throw error;
  }
};

// Game Mode Detection
export const getGameMode = (roomData) => {
  if (roomData.admin) return 'admin';
  if (roomData.gameMode === 'random') return 'random';
  if (roomData.gameMode === 'friendly') return 'friendly';
  if (roomData.gameMode === 'custom') return 'custom';
  return 'admin'; // fallback
};

// Check if player has been matched (for real-time updates)
export const checkMatchStatus = async (queueId) => {
  try {
    const queueDoc = await getDoc(doc(db, 'randomGameQueue', queueId));
    if (!queueDoc.exists()) {
      return null;
    }
    
    const data = queueDoc.data();
    if (data.status === 'matched' && data.roomId) {
      return {
        roomId: data.roomId,
        matchedAt: data.matchedAt,
        status: 'matched'
      };
    }
    
    return { status: data.status };
  } catch (error) {
    console.error('Error checking match status:', error);
    throw error;
  }
};

// Auto-match players in the queue (should be called periodically by a background service)
export const autoMatchPlayers = async () => {
  try {
    const q = query(
      collection(db, 'randomGameQueue'),
      where('status', '==', 'waiting')
    );
    
    const querySnapshot = await getDocs(q);
    const waitingPlayers = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Group players by compatible preferences
    const compatibleGroups = [];
    for (let i = 0; i < waitingPlayers.length; i++) {
      for (let j = i + 1; j < waitingPlayers.length; j++) {
        const player1 = waitingPlayers[i];
        const player2 = waitingPlayers[j];
        
        // Check if preferences are compatible
        const compatibleAbilities = player1.preferences.abilities === player2.preferences.abilities;
        const compatibleGridSize = Math.abs(player1.preferences.gridSize - player2.preferences.gridSize) <= 2;
        
        if (compatibleAbilities && compatibleGridSize) {
          compatibleGroups.push([player1, player2]);
          // Remove matched players from the list
          waitingPlayers.splice(j, 1);
          waitingPlayers.splice(i, 1);
          break;
        }
      }
    }

    // Create rooms for each compatible group
    const promises = compatibleGroups.map(async ([player1, player2]) => {
      try {
        const roomId = `RND_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        // Create room with both players
        const roomRef = ref(database, `rooms/${roomId}`);
        const room = {
          id: roomId,
          gameMode: 'random',
          status: 'waiting',
          createdAt: Date.now(),
          playerCount: 2,
          players: {
            [player1.playerId]: {
              id: player1.playerId,
              name: player1.playerName,
              ready: false,
              joinedAt: Date.now(),
              isHost: true
            },
            [player2.playerId]: {
              id: player2.playerId,
              name: player2.playerName,
              ready: false,
              joinedAt: Date.now(),
              isHost: false
            }
          },          gameStarted: false,
          gameOver: false,
          settings: {
            abilities: player1.preferences.abilities !== false && player2.preferences.abilities !== false, // Both must explicitly disable
            gridSize: Math.min(player1.preferences.gridSize, player2.preferences.gridSize),
            autoStart: true,
            turnTimeLimit: 60,
            maxShips: 5
          }
        };

        await set(roomRef, room);

        // Update both players' queue status
        await Promise.all([
          updateDoc(doc(db, 'randomGameQueue', player1.id), {
            status: 'matched',
            matchedWith: player2.id,
            roomId,
            matchedAt: Date.now()
          }),
          updateDoc(doc(db, 'randomGameQueue', player2.id), {
            status: 'matched',
            matchedWith: player1.id,
            roomId,
            matchedAt: Date.now()
          })
        ]);

        console.log(`Auto-matched players ${player1.playerName} and ${player2.playerName} in room ${roomId}`);
      } catch (error) {
        console.error('Error auto-matching players:', error);
      }
    });

    await Promise.all(promises);
    return compatibleGroups.length;
  } catch (error) {
    console.error('Error in auto-match system:', error);
    return 0;
  }
};
