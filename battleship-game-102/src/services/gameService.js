import { ref, set, get, update, increment, serverTimestamp } from 'firebase/database';
import { database } from './firebaseConfig';
// Add this import
import { checkJamProtection, checkForCounterAttack } from './abilityService';
import { userService } from './userService';

export const createRoom = async (roomId, adminId, gameMode = 'admin', settings = {}) => {
  if (!roomId) {
    throw new Error('Invalid roomId');
  }

  const db = database;
  const roomRef = ref(db, `rooms/${roomId}`);

  // Check if room exists
  const snapshot = await get(roomRef);
  if (snapshot.exists()) {
    throw new Error('Room already exists');
  }

  // Default game settings
  const defaultSettings = {
    gridSize: 8,
    shipCount: 'default',
    abilities: true,
    turnTimeLimit: 60
  };

  // Create basic room structure with game mode support
  const room = {
    id: roomId,
    status: 'waiting',
    createdAt: Date.now(),
    playerCount: 0,
    players: {},
    gameMode: gameMode, // 'admin', 'random', 'friendly', 'custom', 'ai'
    settings: { ...defaultSettings, ...settings },
    gameStarted: false,
    turnStartTime: null
  };

  // Only set admin for non-AI games
  if (adminId) {
    room.admin = adminId;
  }

  // Save room data
  await set(roomRef, room);
  return true;
};

// Helper function to get grid size from settings
export const getGridSize = (settings) => {
  return settings?.gridSize || 8;
};

// Helper function to get ship configuration
export const getShipConfiguration = (settings) => {
  const gridSize = getGridSize(settings);
  const shipCount = settings?.shipCount || 'default';
  
  let ships = [
    { id: 'carrier', name: 'Carrier', size: 5, color: 'bg-blue-500' },
    { id: 'battleship', name: 'Battleship', size: 4, color: 'bg-green-500' },
    { id: 'cruiser', name: 'Cruiser', size: 3, color: 'bg-yellow-500' },
    { id: 'destroyer', name: 'Destroyer', size: 2, color: 'bg-red-500' },
    { id: 'scout', name: 'Scout', size: 2, color: 'bg-violet-500' }
  ];

  // Adjust ships based on count setting
  switch (shipCount) {
    case 'few':
      ships = ships.slice(0, 3);
      break;
    case 'many':
      ships = [
        ...ships,
        { id: 'frigate', name: 'Frigate', size: 2, color: 'bg-orange-500' },
        { id: 'corvette', name: 'Corvette', size: 1, color: 'bg-pink-500' }
      ];
      break;
    case 'custom':
      // Custom configuration handled separately
      break;
    default:
      // Keep default ships
      break;
  }

  // Filter ships that fit in the grid
  return ships.filter(ship => ship.size <= gridSize);
};

// Main attack function - this should be the primary one used
export const makeMove = async (roomId, playerId, row, col) => {
  const roomRef = ref(database, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  const room = snapshot.val();
  
  if (!room) throw new Error('Room not found');
  if (room.gameOver) throw new Error('Game is already over');
  if (room.currentTurn !== playerId) throw new Error('Not your turn');

  // Get grid size from room settings
  const gridSize = getGridSize(room.settings);
  
  // Get opponent ID first
  const opponentId = Object.keys(room.players).find(id => id !== playerId);
  if (!opponentId) throw new Error('Opponent not found');
  
  // Check for JAM protection
  if (checkJamProtection(room, opponentId)) {
    const updates = {};
      // Mark JAM as used after blocking this attack
    updates[`/rooms/${roomId}/players/${opponentId}/abilities/JAM/used`] = true;
    updates[`/rooms/${roomId}/players/${opponentId}/abilities/JAM/installed`] = false;
    
    // Record the jam event
    updates[`/rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'jam',
      targetAbility: 'Attack',
      defenderId: opponentId,
      attackerId: playerId,
      targetRow: row,
      targetCol: col,
      timestamp: Date.now()
    };
    
    // Switch turns back to the JAM user
    updates[`/rooms/${roomId}/currentTurn`] = opponentId;
    
    await update(ref(database), updates);
    throw new Error('Attack was jammed by opponent! Their JAM defense protected them.');
  }
  
  // Continue with normal attack logic if not jammed
  const opponentGrid = room.players[opponentId].PlacementData?.grid;
  if (!opponentGrid) throw new Error('Opponent grid not found');

  // Validate that the grid is properly structured
  if (!Array.isArray(opponentGrid) || opponentGrid.length !== gridSize) {
    throw new Error(`Opponent grid has invalid structure. Expected ${gridSize}x${gridSize} array, got ${opponentGrid.length || 'undefined'} rows`);
  }

  // Validate coordinates are within bounds based on grid size
  if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) {
    throw new Error('Invalid coordinates');
  }
  
  // Check if the specific row exists and is an array
  if (!Array.isArray(opponentGrid[row]) || opponentGrid[row].length !== gridSize) {
    throw new Error(`Grid row ${row} is invalid. Expected array of length ${gridSize}, got ${opponentGrid[row]?.length || 'undefined'}`);
  }
  
  const cell = opponentGrid[row][col];
  
  // Create empty cell if it doesn't exist (for attacking empty water)
  if (!cell) {
    // Initialize empty cell structure for water attacks
    const updates = {};
    updates[`/rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}`] = {
      ship: null,
      hit: false,
      miss: false
    };
    await update(ref(database), updates);
    
    // Re-get the updated room data
    const updatedSnapshot = await get(roomRef);
    const updatedRoom = updatedSnapshot.val();
    const updatedCell = updatedRoom.players[opponentId].PlacementData.grid[row][col];
    
    return handleCellAttack(roomId, playerId, opponentId, row, col, updatedCell, gridSize);
  }
  
  if (cell.hit || cell.miss) {
    throw new Error('Cell already attacked');
  }

  return handleCellAttack(roomId, playerId, opponentId, row, col, cell, gridSize);
};

// Helper function to handle the actual cell attack logic
const handleCellAttack = async (roomId, playerId, opponentId, row, col, cell, gridSize) => {
  // Check if there's a ship at this position
  const isHit = Boolean(cell.ship);

  // Generate coordinate labels based on grid size
  const colLabels = Array.from({ length: gridSize }, (_, i) => String.fromCharCode(65 + i));
  const rowLabels = Array.from({ length: gridSize }, (_, i) => String(gridSize - i));
  const cellLabel = `${colLabels[col]}${rowLabels[row]}`;

  const updates = {};
  
  // Set turn start time for timer
  updates[`/rooms/${roomId}/turnStartTime`] = Date.now();
  
  if (isHit) {
    // Mark as hit if there's a ship
    updates[`/rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/hit`] = true;
    updates[`/rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/miss`] = false;
    updates[`/rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/attackLabel`] = cellLabel;
    
    // Get current grid for game over check
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();
    const opponentGrid = room.players[opponentId].PlacementData?.grid;
    
    // Update the grid for game over check
    const updatedGrid = JSON.parse(JSON.stringify(opponentGrid));
    updatedGrid[row][col].hit = true;
    
    // Check win conditions after this move
    const updatedRoom = { ...room };
    updatedRoom.players[opponentId].PlacementData.grid = updatedGrid;
    const winResult = await checkWinConditions(roomId, updatedRoom);
    
    if (winResult) {
      updates[`/rooms/${roomId}/gameOver`] = true;
      updates[`/rooms/${roomId}/winner`] = winResult.winner;
      updates[`/rooms/${roomId}/status`] = 'completed';
      updates[`/rooms/${roomId}/endReason`] = winResult.reason;
      updates[`/rooms/${roomId}/endedAt`] = Date.now();
      if (winResult.stats) {
        updates[`/rooms/${roomId}/endStats`] = winResult.stats;
      }
      
      // Save game history
      await saveGameHistory(roomId, updatedRoom);
    } else {
      // Always switch turns regardless of hit or miss - a turn is a turn
      updates[`/rooms/${roomId}/currentTurn`] = opponentId;
    }
  } else {
    // Mark as miss if there's no ship (attacking empty water)
    updates[`/rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/hit`] = false;
    updates[`/rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/miss`] = true;
    updates[`/rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/attackLabel`] = cellLabel;
    
    // Always switch turns regardless of hit or miss - a turn is a turn
    updates[`/rooms/${roomId}/currentTurn`] = opponentId;
  }

  // Record the move
  updates[`/rooms/${roomId}/moves/${Date.now()}`] = {
    type: 'attack',
    attackerId: playerId,
    defenderId: opponentId,
    targetRow: row,
    targetCol: col,
    isHit,
    cellLabel,
    timestamp: Date.now()
  };

  // Update the database
  await update(ref(database), updates);
  
  // Check for counter attack after successful hit
  if (isHit && !updates[`/rooms/${roomId}/gameOver`]) {
    await checkForCounterAttack(roomId, playerId, opponentId, row, col);
  }

  return { isHit, row, col, cellLabel };
};

// Ship placement function
export const placeShips = async (roomId, playerId, grid) => {
  const updates = {};
  updates[`/rooms/${roomId}/players/${playerId}/grid`] = grid;
  updates[`/rooms/${roomId}/players/${playerId}/ready`] = true;

  await update(ref(database), updates);

  const roomSnapshot = await get(ref(database, `rooms/${roomId}`));
  const room = roomSnapshot.val();
  
  console.log('Auto-start check:', {
    roomId,
    gameMode: room.gameMode,
    hasAdmin: !!room.admin,
    playerCount: Object.keys(room.players).length,
    allReady: Object.values(room.players).every(player => player.ready),
    players: Object.values(room.players).map(p => ({ name: p.name, ready: p.ready, isAI: p.isAI }))
  });
  
  // For random games and AI games, auto-start when both players are ready
  if ((room.gameMode === 'random' || room.gameMode === 'ai') && Object.values(room.players).every(player => player.ready)) {
    console.log('Auto-starting AI/random game:', roomId);
    
    await update(ref(database, `rooms/${roomId}`), {
      status: 'playing',
      gameStarted: true,
      turnStartTime: Date.now(),
      currentTurn: Object.keys(room.players)[0]
    });

    // Grant random abilities to all players if abilities are enabled
    // Only grant random abilities for friendly, random, and AI games (exclude supervised/admin games)
    if (room.settings?.abilities !== false && !room.admin && (room.gameMode === 'random' || room.gameMode === 'friendly' || room.gameMode === 'ai')) {
      try {
        const { grantRandomAbilitiesToAllPlayers } = await import('./abilityService');
        await grantRandomAbilitiesToAllPlayers(roomId);
        console.log(`Random abilities granted to all players in room ${roomId} (${room.gameMode} game)`);
      } catch (abilityError) {
        console.error('Error granting random abilities:', abilityError);
        // Don't fail the game start if ability granting fails
      }
    } else if (room.admin) {
      console.log(`Skipping random ability granting for supervised game in room ${roomId} (admin: ${room.admin})`);
    }
  }
};

// Function to save game history when game completes
export const saveGameHistory = async (roomId, roomData) => {
  try {
    const gameHistory = {
      roomId,
      gameMode: roomData.gameMode,
      players: Object.keys(roomData.players).map(playerId => ({
        id: playerId,
        name: roomData.players[playerId].name || playerId
      })),
      winner: roomData.winner,
      startTime: roomData.createdAt,
      endTime: Date.now(),
      settings: roomData.settings,
      moves: roomData.moves || {}
    };

    // Save to Firestore
    await userService.saveGameHistory(gameHistory);
    
    // For admin/custom games, also save room history
    if (['admin', 'custom'].includes(roomData.gameMode)) {
      await userService.saveRoomHistory(roomData.admin, {
        roomId,
        gameMode: roomData.gameMode,
        playerCount: Object.keys(roomData.players).length,
        endTime: Date.now(),
        winner: roomData.winner
      });
    }

    // Clear from Realtime Database after delay
    setTimeout(async () => {
      try {
        const { ref, remove } = await import('firebase/database');
        const { database } = await import('./firebaseConfig');
        await remove(ref(database, `rooms/${roomId}`));
      } catch (clearError) {
        console.error('Error clearing game from database:', clearError);
      }
    }, 10000);
  } catch (error) {
    console.error('Error saving game history:', error);
  }
};

// Helper function to check if game is over
const checkGameOver = (grid) => {
  for (const row of grid) {
    for (const cell of row) {
      if (cell.ship && !cell.hit) {
        return false;
      }
    }
  }
  return true;
};

// Helper function to count destroyed ships for a player
const countDestroyedShips = (grid) => {
  let destroyedCount = 0;
  if (!grid) return destroyedCount;
  
  for (const row of grid) {
    for (const cell of row) {
      if (cell.ship && cell.hit) {
        destroyedCount++;
      }
    }
  }
  return destroyedCount;
};

// Helper function to get hit/miss statistics for a player
const getPlayerStats = (room, playerId) => {
  const moves = room.moves || {};
  let hits = 0;
  let misses = 0;
  let totalAttacks = 0;
  
  Object.values(moves).forEach(move => {
    if (move.playerId === playerId) {
      if (move.type === 'attack') {
        totalAttacks++;
        if (move.isHit) {
          hits++;
        } else {
          misses++;
        }
      } else if (move.type === 'ability') {
        // Count ability attacks
        if (move.hitCount !== undefined) {
          hits += move.hitCount;
          // For abilities like NUKE/ANNIHILATE, count affected cells as attempts
          const affectedCells = move.affectedCells || [];
          totalAttacks += affectedCells.length;
          misses += affectedCells.length - move.hitCount;
        }
      }
    }
  });
  
  const hitRatio = totalAttacks > 0 ? hits / totalAttacks : 0;
  return { hits, misses, totalAttacks, hitRatio };
};

// Enhanced win condition checker
export const checkWinConditions = async (roomId, room) => {
  const players = Object.keys(room.players);
  if (players.length !== 2) return null;
  
  const [player1Id, player2Id] = players;
  const player1Grid = room.players[player1Id].PlacementData?.grid;
  const player2Grid = room.players[player2Id].PlacementData?.grid;
  
  if (!player1Grid || !player2Grid) return null;
  
  // Check if either player has all ships destroyed
  const player1AllShipsDestroyed = checkGameOver(player1Grid);
  const player2AllShipsDestroyed = checkGameOver(player2Grid);
  
  if (player1AllShipsDestroyed) {
    return { winner: player2Id, reason: 'ALL_SHIPS_DESTROYED', loser: player1Id };
  }
  
  if (player2AllShipsDestroyed) {
    return { winner: player1Id, reason: 'ALL_SHIPS_DESTROYED', loser: player2Id };
  }
  
  // Check for time-based win conditions (if time limit reached)
  const timeLimit = room.settings?.turnTimeLimit || 900; // 15 minutes default
  const gameStartTime = room.gameStartedAt || room.createdAt;
  const currentTime = Date.now();
  const elapsedTime = (currentTime - gameStartTime) / 1000; // in seconds
  
  if (elapsedTime >= timeLimit) {
    // Count destroyed ships for each player
    const player1DestroyedShips = countDestroyedShips(player2Grid); // ships player1 destroyed
    const player2DestroyedShips = countDestroyedShips(player1Grid); // ships player2 destroyed
    
    if (player1DestroyedShips > player2DestroyedShips) {
      return { winner: player1Id, reason: 'TIME_LIMIT_SHIPS', loser: player2Id, 
               stats: { player1Ships: player1DestroyedShips, player2Ships: player2DestroyedShips } };
    } else if (player2DestroyedShips > player1DestroyedShips) {
      return { winner: player2Id, reason: 'TIME_LIMIT_SHIPS', loser: player1Id,
               stats: { player1Ships: player1DestroyedShips, player2Ships: player2DestroyedShips } };
    } else {
      // Same number of ships destroyed, check hit ratio
      const player1Stats = getPlayerStats(room, player1Id);
      const player2Stats = getPlayerStats(room, player2Id);
      
      if (player1Stats.hitRatio > player2Stats.hitRatio) {
        return { winner: player1Id, reason: 'TIME_LIMIT_ACCURACY', loser: player2Id,
                 stats: { player1Ratio: player1Stats.hitRatio, player2Ratio: player2Stats.hitRatio } };
      } else if (player2Stats.hitRatio > player1Stats.hitRatio) {
        return { winner: player2Id, reason: 'TIME_LIMIT_ACCURACY', loser: player1Id,
                 stats: { player1Ratio: player1Stats.hitRatio, player2Ratio: player2Stats.hitRatio } };
      } else {
        // Complete tie - could be draw or first player wins
        return { winner: player1Id, reason: 'TIME_LIMIT_TIE', loser: player2Id };
      }
    }
  }
  
  return null; // No win condition met
};

// Update ship placement function
export const updateShipPlacement = async (roomId, playerId, placementData) => {
  const playerRef = ref(database, `rooms/${roomId}/players/${playerId}`);
  const snapshot = await get(playerRef);

  if (!snapshot.exists()) {
    throw new Error('Player not found');
  }

  const updates = {
    [`rooms/${roomId}/players/${playerId}/PlacementData`]: placementData,
    [`rooms/${roomId}/players/${playerId}/ready`]: true,
    [`rooms/${roomId}/lastUpdated`]: Date.now()
  };

  await update(ref(database), updates);
  return true;
};

// Join room function
export const joinRoom = async (roomId, playerId, playerName = 'Player') => {
  const roomRef = ref(database, `rooms/${roomId}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    throw new Error('Room not found');
  }

  const room = snapshot.val();
  const playerCount = room.playerCount || 0;

  if (playerCount >= 2) {
    throw new Error('Room is full');
  }

  const updates = {};
  updates[`/rooms/${roomId}/players/${playerId}`] = { 
    grid: [], 
    ready: false,
    name: playerName
  };
  updates[`/rooms/${roomId}/playerCount`] = increment(1);

  await update(ref(database), updates);
  localStorage.setItem('battleshipPlayerId', playerId);
  return true;
};

// Record turn timeout function
export const recordTurnTimeout = async (roomId, playerId) => {
  const roomRef = ref(database, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  const room = snapshot.val();

  if (!room) throw new Error('Room not found');
  
  const opponentId = Object.keys(room.players).find(id => id !== playerId);
  if (!opponentId) throw new Error('Opponent not found');

  const updates = {};
  
  // Record the timeout event
  updates[`/rooms/${roomId}/moves/${Date.now()}`] = {
    type: 'timeout',
    playerId,
    timestamp: Date.now()
  };
  
  // Switch turns
  updates[`/rooms/${roomId}/currentTurn`] = opponentId;
  updates[`/rooms/${roomId}/turnStartTime`] = Date.now();

  await update(ref(database), updates);
  return true;
};

// Helper function to get coordinate labels


export const attack = async (roomId, attackerId, row, col, cellLabel = '') => {
  const roomRef = ref(database, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  const room = snapshot.val();

  if (room.gameOver) {
    throw new Error('Game is already over');
  }

  if (!room || room.currentTurn !== attackerId) {
    throw new Error('Not your turn');
  }

  const defenderId = Object.keys(room.players).find(id => id !== attackerId);
  if (!defenderId) throw new Error('Opponent not found');
  
  // Check if defender has JAM protection active
  if (checkJamProtection(room, defenderId)) {
    const updates = {};
      // Mark JAM as used after blocking this attack
    updates[`/rooms/${roomId}/players/${defenderId}/abilities/JAM/used`] = true;
    updates[`/rooms/${roomId}/players/${defenderId}/abilities/JAM/installed`] = false;
    
    // Record the jam event
    updates[`/rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'jam',
      targetAbility: 'Attack',
      defenderId: defenderId,
      attackerId: attackerId,
      targetRow: row,
      targetCol: col,
      timestamp: Date.now()
    };
    
    // Switch turns to defender (JAM user) after blocking the attack
    updates[`/rooms/${roomId}/currentTurn`] = defenderId;
    
    await update(ref(database), updates);
    throw new Error('Attack was jammed by opponent! Their JAM defense protected them.');
  }
  
  // Continue with regular attack if not jammed
  const defenderGrid = room.players[defenderId].PlacementData?.grid;
  const targetCell = defenderGrid[row][col];
  
  if (targetCell.hit || targetCell.miss) {
    throw new Error('This cell has already been attacked');
  }

  const isHit = Boolean(targetCell.ship);
  const updates = {};
  
  if (isHit) {
    updates[`/rooms/${roomId}/players/${defenderId}/PlacementData/grid/${row}/${col}/hit`] = true;
    updates[`/rooms/${roomId}/players/${defenderId}/PlacementData/grid/${row}/${col}/attackLabel`] = cellLabel || getCoordinateLabel(col, row);
  } else {
    updates[`/rooms/${roomId}/players/${defenderId}/PlacementData/grid/${row}/${col}/miss`] = true;
    updates[`/rooms/${roomId}/players/${defenderId}/PlacementData/grid/${row}/${col}/attackLabel`] = cellLabel || getCoordinateLabel(col, row);
  }
  
  // Record the move
  updates[`/rooms/${roomId}/moves/${Date.now()}`] = {
    type: 'attack',
    attackerId,
    defenderId,
    targetRow: row,
    targetCol: col,
    isHit,
    timestamp: Date.now()
  };
  
  // Always switch turns regardless of hit or miss - a turn is a turn
  updates[`/rooms/${roomId}/currentTurn`] = defenderId;
  
  await update(ref(database), updates);
    // After successful attack, check if defender has COUNTER ability
  if (isHit) {
    await checkForCounterAttack(roomId, attackerId, defenderId, row, col, 1, false);
  }
  
  return { success: true, isHit };
};

export const makeAttack = async (roomId, playerId, targetRow, targetCol) => {
  const roomRef = ref(database, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  const room = snapshot.val();
  
  if (!room) throw new Error('Room not found');
  if (room.gameOver) throw new Error('Game is already over');
  if (room.currentTurn !== playerId) throw new Error('Not your turn');
  
  const opponentId = Object.keys(room.players).find(id => id !== playerId);
  if (!opponentId) throw new Error('Opponent not found');
  
  // Check if opponent has JAM protection active
  if (checkJamProtection(room, opponentId)) {
    const updates = {};
      // Mark JAM as used after blocking this attack
    updates[`rooms/${roomId}/players/${opponentId}/abilities/JAM/used`] = true;
    updates[`rooms/${roomId}/players/${opponentId}/abilities/JAM/installed`] = false;
    
    // Record the jam event
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'jam',
      targetAbility: 'Attack',
      defenderId: opponentId,
      attackerId: playerId,
      targetRow,
      targetCol,
      timestamp: Date.now()
    };
    
    // Switch turns to defender (JAM user) after blocking
    updates[`rooms/${roomId}/currentTurn`] = opponentId;
    
    await update(ref(database), updates);
    throw new Error('Attack was jammed by opponent! Their JAM defense protected them.');
  }
  
  // Continue with regular attack processing if not jammed
  const defenderGrid = room.players[opponentId].PlacementData?.grid;
  if (!defenderGrid) throw new Error('Opponent grid not found');

  // Validate coordinates
  if (targetRow < 0 || targetRow >= 8 || targetCol < 0 || targetCol >= 8) {
    throw new Error('Invalid coordinates');
  }
  
  const cell = defenderGrid[targetRow][targetCol];
  if (!cell) {
    throw new Error('Cell not found');
  }
  
  if (cell.hit || cell.miss) {
    throw new Error('Cell already attacked');
  }

  // Check if there's a ship at this position
  const isHit = Boolean(cell.ship);
  const shipId = cell.ship;
  
  // Generate cell label
  const colLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const rowLabels = ['1', '2', '3', '4', '5', '6', '7', '8'];
  const cellLabel = `${colLabels[targetCol]}${rowLabels[targetRow]}`;
  
  // Check for ship destruction
  let shipDestroyed = false;
  let allShipsDestroyed = false;
  
  if (isHit) {
    // Create a copy of the grid to check if the ship is destroyed
    const updatedGrid = JSON.parse(JSON.stringify(defenderGrid));
    updatedGrid[targetRow][targetCol].hit = true;
    
    // Check if this ship is now completely destroyed
    if (shipId) {
      shipDestroyed = true;
      // Check all cells for this ship to see if any are not hit
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (updatedGrid[r][c].ship === shipId && !updatedGrid[r][c].hit) {
            shipDestroyed = false;
            break;
          }
        }
        if (!shipDestroyed) break;
      }
    }
    
    // Check if all ships are destroyed
    allShipsDestroyed = checkGameOver(updatedGrid);
  }
  
  const updates = {};
  
  if (isHit) {
    updates[`/rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/hit`] = true;
    updates[`/rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/miss`] = false;
    updates[`/rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/attackLabel`] = cellLabel;
    
    if (allShipsDestroyed) {
      updates[`/rooms/${roomId}/gameOver`] = true;
      updates[`/rooms/${roomId}/winner`] = playerId;
      updates[`/rooms/${roomId}/status`] = 'completed';
    }
  } else {
    updates[`/rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/miss`] = true;
    updates[`/rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/attackLabel`] = cellLabel;
  }
  
  // Record the attack
  const attackRecord = {
    type: 'attack',
    playerId,
    targetRow,
    targetCol,
    cellLabel,
    isHit,
    shipDestroyed: shipDestroyed ? shipId : null,
    gameOver: allShipsDestroyed,
    timestamp: Date.now()
  };
  
  // Update turn and attack records
  updates[`/rooms/${roomId}/currentTurn`] = opponentId;
  updates[`/rooms/${roomId}/lastMove`] = attackRecord;
  updates[`/rooms/${roomId}/moves/${Date.now()}`] = attackRecord;
  
  await update(ref(database), updates);
    // Check for counter attack after a successful hit
  if (isHit) {
    const counterAttackOccurred = await checkForCounterAttack(roomId, playerId, opponentId, targetRow, targetCol, 1, false);
    if (counterAttackOccurred) {
      // Counter attack already handled turn switching
      return { isHit, targetRow, targetCol, shipDestroyed, gameOver: allShipsDestroyed, counterAttack: true };
    }
  }
  
  return { isHit, targetRow, targetCol, shipDestroyed, gameOver: allShipsDestroyed };
};

// Add this helper function if it doesn't exist
const getCoordinateLabel = (col, row) => {
  const colLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const rowLabels = ['8', '7', '6', '5', '4', '3', '2', '1'];
  return `${colLabels[col]}${rowLabels[row]}`;
};

export const performAttack = async (roomId, attackerId, opponentId, targetRow, targetCol) => {
  try {
    // Get cell label using the corrected coordinate system
    // targetRow is 0-7 in the array, but displayed as 8-1 (top to bottom)
    const cellLabel = getCoordinateLabel(targetCol, targetRow);
    
    // Get the room data to check the target cell
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    // Check if the target cell contains a ship
    const defenderGrid = room.players[opponentId].PlacementData?.grid;
    const isHit = Boolean(defenderGrid[targetRow][targetCol].ship);
    
    const updates = {};
    if (isHit) {
      updates[`/rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/hit`] = true;
      updates[`/rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/miss`] = false;
      updates[`/rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/attackLabel`] = cellLabel;
      // Record attack in history
      updates[`/rooms/${roomId}/attackHistory/${Date.now()}`] = {
        attackerId,
        targetCoord: cellLabel,
        result: 'HIT',
        timestamp: serverTimestamp()
      };
    } else {
      updates[`/rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/miss`] = true;
      updates[`/rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/hit`] = false;
      updates[`/rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/attackLabel`] = cellLabel;
      // Record attack in history
      updates[`/rooms/${roomId}/attackHistory/${Date.now()}`] = {
        attackerId,
        targetCoord: cellLabel,
        result: 'MISS',
        timestamp: serverTimestamp()
      };
    }
    
    // Update database
    await update(ref(database), updates);
      return { success: true, isHit, cellLabel };
  } catch (error) {
    return { success: false, error: error.message };
  }
};