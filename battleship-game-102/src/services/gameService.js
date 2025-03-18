import { ref, set, get, onValue, update, increment, serverTimestamp } from 'firebase/database';
import { database } from './firebaseConfig';
// Add this import
import { checkJamProtection, checkForCounterAttack } from './abilityService';

export const createRoom = async (roomId, adminId) => {
  try {
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

    // Create basic room structure
    const room = {
      id: roomId,
      status: 'waiting',
      createdAt: Date.now(),
      playerCount: 0,
      players: {},
      admin: adminId
    };

    // Save room data
    await set(roomRef, room);
    console.log('Room created:', roomId);
    return true;

  } catch (error) {
    console.error('Error creating room:', error);
    throw error;
  }
};

// Make sure this is properly implemented in the main attack function
export const makeMove = async (roomId, playerId, row, col) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();
    
    if (!room) throw new Error('Room not found');
    if (room.gameOver) throw new Error('Game is already over');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');
    
    // Get opponent ID first
    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    if (!opponentId) throw new Error('Opponent not found');
    
    // Then check for JAM protection
    if (checkJamProtection(room, opponentId)) {
      const updates = {};
      
      // Mark JAM as used after blocking this attack
      updates[`/rooms/${roomId}/players/${opponentId}/abilities/JAM/used`] = true;
      
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

    // Get the specific cell - validate coordinates are within bounds
    if (row < 0 || row >= 8 || col < 0 || col >= 8) {
      throw new Error('Invalid coordinates');
    }
    
    const cell = opponentGrid[row][col];
    if (!cell) {
      throw new Error('Cell not found');
    }
    
    if (cell.hit || cell.miss) {
      throw new Error('Cell already attacked');
    }

    // Check if there's a ship at this position
    const isHit = Boolean(cell.ship); // Convert to boolean to ensure correct hit detection

    console.log(`Attacking cell:`, cell);
    console.log(`Is hit: ${isHit}, Ship: ${cell.ship}`);
    
    // In the makeMove function, add the cell label
    const colLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const rowLabels = ['1', '2', '3', '4', '5', '6', '7', '8'];
    const cellLabel = `${colLabels[col]}${rowLabels[row]}`;

    // Create the updates object
    const updates = {};
    
    // Create attack record with exact coordinates
    const attackRecord = {
      row: row + 1,  // Add 1 to make it 1-indexed
      col: col + 1,  // Add 1 to make it 1-indexed
      playerId: playerId,
      isHit: isHit,
      timestamp: Date.now(),
      cellLabel: cellLabel
    };
    
    // In the makeMove function, ensure we're setting hit/miss flags correctly
    if (isHit) {
      // Mark as hit if there's a ship (ensure we set hit to true and miss to false)
      updates[`/rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/hit`] = true;
      updates[`/rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/miss`] = false;
      updates[`/rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/attackLabel`] = cellLabel;
      
      // Update the grid for game over check
      const updatedGrid = JSON.parse(JSON.stringify(opponentGrid));
      updatedGrid[row][col].hit = true;
      
      if (checkGameOver(updatedGrid)) {
        updates[`/rooms/${roomId}/gameOver`] = true;
        updates[`/rooms/${roomId}/winner`] = playerId;
        updates[`/rooms/${roomId}/status`] = 'completed';
      }
    } else {
      // Mark as miss if there's no ship (ensure we set miss to true and hit to false)
      updates[`/rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/hit`] = false;
      updates[`/rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/miss`] = true;
      updates[`/rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/attackLabel`] = cellLabel;
    }
    
    // Update turn and last move with correct coordinates
    updates[`/rooms/${roomId}/currentTurn`] = opponentId;
    updates[`/rooms/${roomId}/lastMove`] = attackRecord;
    updates[`/rooms/${roomId}/moves/${Date.now()}`] = attackRecord; // Store move history
    
    // Update the database
    await update(ref(database), updates);
    
    // Inside the makeMove or attack function where you handle successful hits:
    if (isHit) {
      // After recording the hit, check for counter attack
      await checkForCounterAttack(roomId, playerId, opponentId, row, col);
    }
    
    // Return exact coordinates
    return { isHit, row, col };
  } catch (error) {
    console.error('Error making move:', error);
    throw error;
  }
};

export const placeShips = async (roomId, playerId, grid) => {
  try {
    const updates = {};
    updates[`/rooms/${roomId}/players/${playerId}/grid`] = grid;
    updates[`/rooms/${roomId}/players/${playerId}/ready`] = true;

    await update(ref(database), updates);

    const roomSnapshot = await get(ref(database, `rooms/${roomId}`));
    const room = roomSnapshot.val();

    if (Object.values(room.players).every(player => player.ready)) {
      await update(ref(database, `rooms/${roomId}`), {
        status: 'playing',
        gameStarted: true,
        currentTurn: Object.keys(room.players)[0] // Set the first player as the current turn
      });
    }
  } catch (error) {
    console.error('Error placing ships:', error);
    throw error;
  }
};

export const subscribeToRoom = (roomId, callback) => {
  const roomRef = ref(database, `rooms/${roomId}`);
  
  const unsubscribe = onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      callback(data);
    } else {
      console.error('Room not found or access denied');
    }
  }, (error) => {
    console.error('Error subscribing to room:', error);
  });

  return unsubscribe;
};

export const leaveRoom = async (roomId, playerId) => {
  try {
    const updates = {};
    updates[`/rooms/${roomId}/players/${playerId}`] = null;
    updates[`/rooms/${roomId}/playerCount`] = increment(-1);
    await update(ref(database), updates);
  } catch (error) {
    console.error('Error leaving room:', error);
    throw error;
  }
};

export const checkGameOver = (grid) => {
  let totalShipCells = 0;
  let totalHitCells = 0;

  grid.forEach(row => {
    row.forEach(cell => {
      if (cell.ship) {
        totalShipCells++;
        if (cell.hit) {
          totalHitCells++;
        }
      }
    });
  });

  // Game is over only when all ship cells are hit
  return totalShipCells > 0 && totalShipCells === totalHitCells;
};

// Add new function to update ship placement
export const updateShipPlacement = async (roomId, playerId, placementData) => {
  try {
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
    console.log('Ship placement updated for player:', playerId);
    return true;
  } catch (error) {
    console.error('Error updating placement:', error);
    throw error;
  }
};

export const joinRoom = async (roomId, playerId, playerName = 'Player') => {
  try {
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
    console.log('Player joined room:', roomId);
    return true;
  } catch (error) {
    console.error('Error joining room:', error);
    throw error;
  }
};

// Update the attack function to handle JAM protection correctly

export const attack = async (roomId, attackerId, row, col, cellLabel = '') => {
  try {
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
    
    // Switch turns
    updates[`/rooms/${roomId}/currentTurn`] = defenderId;
    
    await update(ref(database), updates);
    
    // After successful attack, check if defender has COUNTER ability
    if (isHit) {
      await checkForCounterAttack(roomId, attackerId, defenderId, row, col);
    }
    
    return { success: true, isHit };
  } catch (error) {
    console.error('Error making move:', error);
    throw error;
  }
};

export const makeAttack = async (roomId, playerId, targetRow, targetCol) => {
  try {
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
      const counterAttackOccurred = await checkForCounterAttack(roomId, playerId, opponentId, targetRow, targetCol);
      if (counterAttackOccurred) {
        // Counter attack already handled turn switching
        return { isHit, targetRow, targetCol, shipDestroyed, gameOver: allShipsDestroyed, counterAttack: true };
      }
    }
    
    return { isHit, targetRow, targetCol, shipDestroyed, gameOver: allShipsDestroyed };
  } catch (error) {
    console.error('Error making attack:', error);
    throw error;
  }
};

// Add this helper function if it doesn't exist
const getCoordinateLabel = (col, row) => {
  const colLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const rowLabels = ['8', '7', '6', '5', '4', '3', '2', '1'];
  return `${colLabels[col]}${rowLabels[row]}`;
};

// Add this function to your gameService.js file

export const recordTurnTimeout = async (roomId, playerId) => {
  try {
    // First, fetch the room data from the database
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
    
    await update(ref(database), updates);
    return true;
  } catch (error) {
    console.error('Error recording turn timeout:', error);
    throw error;
  }
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
    console.error("Error performing attack:", error);
    return { success: false, error: error.message };
  }
};