import { ref, get, update } from 'firebase/database';
import { database } from './firebaseConfig';

// Add this at the beginning of the file
const getCoordinateLabel = (col, row) => {
  const colLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const rowLabels = ['1', '2', '3', '4', '5', '6', '7', '8'];
  return `${colLabels[col]}${rowLabels[row]}`;
};

// Define available abilities and their details
export const ABILITIES = {
  // Attack abilities
  NUKE: {
    name: 'Nuke',
    type: 'attack',
    description: 'Attack in an X pattern centered on your target (5 cells)',
    difficulty: 'easy',
  },
  ANNIHILATE: {
    name: 'Annihilate',
    description: 'Destroy three consecutive spots (choose horizontal or vertical)',
    type: 'attack',
    difficulty: 'easy',
  },
  
  // Defense abilities
  COUNTER: {
    name: 'Counter',
    description: 'If your ship is hit, automatically hit one opponent ship',
    type: 'defense',
    difficulty: 'easy',
  },
  JAM: {
    name: 'Jam',
    description: 'Block all attacks for one opponent turn',
    type: 'defense',
    difficulty: 'easy',
  },
  
  // Support abilities
  HACKER: {
    name: 'Hacker',
    description: 'Locate one part of an enemy ship',
    type: 'support',
    difficulty: 'easy',
  },
  REINFORCEMENT: {
    name: 'Reinforcement',
    description: 'Add an extra ship (size 2) to your fleet',
    type: 'support',
    difficulty: 'easy',
  },
  SCANNER: {
    name: 'Scanner',
    description: 'Scan a 2x2 grid area and reveal number of ship parts',
    type: 'support',
    difficulty: 'easy',
  },
  
  // Special ability
  GODS_HAND: {
    name: "God's Hand",
    description: 'Destroy one entire 4x4 quadrant of the opponent\'s grid',
    type: 'special',
    difficulty: 'difficult',
  }
};

// Grant the ability - fix to avoid the path conflict error
export const grantAbility = async (roomId, playerId, abilityKey) => {
  try {
    const ability = ABILITIES[abilityKey];
    if (!ability) throw new Error('Invalid ability');
    
    // Check if player already has 3 abilities (easy ones)
    if (ability.difficulty === 'easy') {
      const playerRef = ref(database, `rooms/${roomId}/players/${playerId}`);
      const snapshot = await get(playerRef);
      
      if (!snapshot.exists()) {
        throw new Error('Player not found');
      }
      
      const playerData = snapshot.val();
      const currentAbilities = playerData.abilities || {};
      const easyAbilitiesCount = Object.values(currentAbilities)
        .filter(a => !a.used && a.difficulty === 'easy').length;
      
      if (easyAbilitiesCount >= 3) {
        throw new Error('Player already has 3 active easy abilities');
      }
    }
    
    // Grant the ability with all properties in a single object
    const updates = {};
    const abilityData = {
      active: true,
      used: false,
      difficulty: ability.difficulty,
      grantedAt: Date.now()
    };

    // JAM doesn't need duration now - it's active for one opponent turn only
    
    updates[`rooms/${roomId}/players/${playerId}/abilities/${abilityKey}`] = abilityData;
    await update(ref(database), updates);
    return true;
  } catch (error) {
    console.error('Error granting ability:', error);
    throw error;
  }
};

// Execute a nuke ability (X pattern - 5 cells)
export const executeNuke = async (roomId, playerId, targetRow, targetCol) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();
    
    if (!room) throw new Error('Room not found');
    if (room.gameOver) throw new Error('Game is already over');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');
    
    // Check if player has this ability
    const playerAbilities = room.players[playerId]?.abilities || {};
    if (!playerAbilities.NUKE?.active || playerAbilities.NUKE.used) {
      throw new Error('Nuke ability not available');
    }
    
    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    if (!opponentId) throw new Error('Opponent not found');
    
    const opponentGrid = room.players[opponentId].PlacementData?.grid;
    if (!opponentGrid) throw new Error('Opponent grid not found');
    
    // Check if opponent has JAM protection
    if (checkJamProtection(room, opponentId)) {
      const updates = {};
      
      // Mark JAM as used after blocking this attack
      updates[`rooms/${roomId}/players/${opponentId}/abilities/JAM/used`] = true;
      
      // Mark NUKE as used even though it was blocked
      updates[`rooms/${roomId}/players/${playerId}/abilities/NUKE/used`] = true;
      
      // Record the jam
      updates[`rooms/${roomId}/moves/${Date.now()}`] = {
        type: 'jam',
        targetAbility: 'NUKE',
        defenderId: opponentId,
        attackerId: playerId,
        targetRow,
        targetCol,
        timestamp: Date.now()
      };
      
      // Switch turns back to the defender (JAM user)
      updates[`rooms/${roomId}/currentTurn`] = opponentId;
      
      await update(ref(database), updates);
      throw new Error('Your NUKE was jammed by opponent! Their JAM defense protected them.');
    }
    
    // Continue with regular NUKE execution if not jammed
    const updates = {};
    let hitCount = 0;
    const affectedCells = [];
    
    // Define X pattern coordinates (center + 4 diagonal cells)
    const xPattern = [
      { r: targetRow, c: targetCol },       // Center
      { r: targetRow - 1, c: targetCol - 1 }, // Top-left
      { r: targetRow - 1, c: targetCol + 1 }, // Top-right
      { r: targetRow + 1, c: targetCol - 1 }, // Bottom-left
      { r: targetRow + 1, c: targetCol + 1 }  // Bottom-right
    ];
    
    // Process each cell in the X pattern
    for (const cell of xPattern) {
      const r = cell.r;
      const c = cell.c;
      
      // Skip if out of bounds
      if (r < 0 || r >= 8 || c < 0 || c >= 8) continue;
      
      // Skip if cell already hit or missed
      if (!opponentGrid[r] || !opponentGrid[r][c] || opponentGrid[r][c].hit || opponentGrid[r][c].miss) continue;
      
      const isHit = Boolean(opponentGrid[r][c].ship);
      if (isHit) {
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${r}/${c}/hit`] = true;
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${r}/${c}/attackLabel`] = getCoordinateLabel(c, r);
        hitCount++;
      } else {
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${r}/${c}/miss`] = true;
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${r}/${c}/attackLabel`] = getCoordinateLabel(c, r);
      }
      
      affectedCells.push({ row: r, col: c, isHit });
    }
    
    // Mark ability as used
    updates[`rooms/${roomId}/players/${playerId}/abilities/NUKE/used`] = true;
    
    // Record the move
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'NUKE',
      playerId,
      targetRow,
      targetCol,
      hitCount,
      timestamp: Date.now()
    };
    
    // Switch turns
    updates[`rooms/${roomId}/currentTurn`] = opponentId;
    
    await update(ref(database), updates);
    
    // In executeNuke, executeAnnihilate, etc. after hits are recorded
    if (hitCount > 0) {
      await checkForCounterAttack(roomId, playerId, opponentId, targetRow, targetCol, hitCount);
    }
    
    return { success: true, hitCount, affectedCells };
  } catch (error) {
    console.error('Error using Nuke ability:', error);
    throw error;
  }
};

// Execute Annihilate ability (3 consecutive spots in horizontal or vertical pattern)
export const executeAnnihilate = async (roomId, playerId, targetRow, targetCol, isVertical = false) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room) throw new Error('Room not found');
    if (room.gameOver) throw new Error('Game is already over');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const opponentGrid = room.players[opponentId].PlacementData?.grid;

    // Check if opponent has JAM protection
    if (checkJamProtection(room, opponentId)) {
      const updates = {};
      
      // Mark JAM as used after blocking this attack
      updates[`rooms/${roomId}/players/${opponentId}/abilities/JAM/used`] = true;
      
      // Mark ability as used even though it was blocked
      updates[`rooms/${roomId}/players/${playerId}/abilities/ANNIHILATE/used`] = true;
      
      // Record the jam
      updates[`rooms/${roomId}/moves/${Date.now()}`] = {
        type: 'jam',
        targetAbility: 'ANNIHILATE',
        defenderId: opponentId,
        attackerId: playerId,
        targetRow,
        targetCol,
        timestamp: Date.now()
      };
      
      // Switch turns back to the defender (JAM user)
      updates[`rooms/${roomId}/currentTurn`] = opponentId;
      
      await update(ref(database), updates);
      throw new Error('Your ANNIHILATE was jammed by opponent! Their JAM defense protected them.');
    }

    const updates = {};
    const hitCells = [];

    if (isVertical) {
      // Vertical pattern (hits the aimed spot and 2 spots above)
      if (targetRow + 2 >= 8) {
        throw new Error('Not enough space for vertical annihilation');
      }
      hitCells.push({ row: targetRow, col: targetCol });     // Target cell
      hitCells.push({ row: targetRow + 1, col: targetCol }); // Cell above
      hitCells.push({ row: targetRow + 2, col: targetCol }); // Two cells above
    } else {
      // Horizontal pattern (hits center and one cell on each side)
      if (targetCol <= 0 || targetCol >= 7) {
        throw new Error('Not enough space for horizontal annihilation');
      }
      hitCells.push({ row: targetRow, col: targetCol - 1 }); // Left cell
      hitCells.push({ row: targetRow, col: targetCol });     // Center cell 
      hitCells.push({ row: targetRow, col: targetCol + 1 }); // Right cell
    }

    let hitCount = 0;
    for (const cell of hitCells) {
      const { row, col } = cell;
      if (row < 0 || row >= 8 || col < 0 || col >= 8) continue;
      const targetCell = opponentGrid[row][col];
      if (targetCell.hit || targetCell.miss) continue;
      const isHit = Boolean(targetCell.ship);
      if (isHit) {
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/hit`] = true;
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/attackLabel`] = getCoordinateLabel(col, row);
        hitCount++;
      } else {
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/miss`] = true;
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/attackLabel`] = getCoordinateLabel(col, row);
      }
    }

    updates[`rooms/${roomId}/players/${playerId}/abilities/ANNIHILATE/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'ANNIHILATE',
      playerId,
      targetRow,
      targetCol,
      isVertical,
      hitCount,
      hitCells,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    // In executeNuke, executeAnnihilate, etc. after hits are recorded
    if (hitCount > 0) {
      await checkForCounterAttack(roomId, playerId, opponentId, targetRow, targetCol, hitCount);
    }
    
    return { success: true, hitCount, hitCells };
  } catch (error) {
    console.error('Error using Annihilate ability:', error);
    throw error;
  }
};

// Update the installCounter function

/**
 * Install COUNTER ability that returns fire when hit
 * @param {string} roomId - The room identifier
 * @param {string} playerId - The player's identifier
 * @returns {Promise<Object>} Result of the operation
 */
export const installCounter = async (roomId, playerId) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();
    
    // Validate room and turn
    if (!room) throw new Error('Room not found');
    if (room.gameOver) throw new Error('Game is already over');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');
    
    // Check ability availability
    const playerAbilities = room.players[playerId]?.abilities || {};
    if (!playerAbilities.COUNTER?.active || playerAbilities.COUNTER.used) {
      throw new Error('Counter ability not available');
    }
    
    // Mark as installed but not used yet
    const updates = {};
    updates[`rooms/${roomId}/players/${playerId}/abilities/COUNTER/installed`] = true;
    
    // Record the move
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'COUNTER',
      playerId,
      timestamp: Date.now()
    };
    
    // Switch turns - this counts as using your turn
    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    updates[`rooms/${roomId}/currentTurn`] = opponentId;
    
    await update(ref(database), updates);
    return { success: true };
  } catch (error) {
    console.error('Error installing Counter ability:', error);
    throw error;
  }
};

/**
 * Install JAM ability that blocks one opponent attack
 * @param {string} roomId - The room identifier
 * @param {string} playerId - The player's identifier
 * @returns {Promise<Object>} Result of the operation
 */
export const installJam = async (roomId, playerId) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    // Validate room and turn
    if (!room) throw new Error('Room not found');
    if (room.gameOver) throw new Error('Game is already over');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    // Check ability availability
    const playerAbilities = room.players[playerId]?.abilities || {};
    if (!playerAbilities.JAM?.active || playerAbilities.JAM.used) {
      throw new Error('Jam ability not available');
    }

    const updates = {};
    // Mark as installed but not yet used
    updates[`rooms/${roomId}/players/${playerId}/abilities/JAM/installed`] = true;
    
    // Record the installation
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'JAM',
      playerId,
      timestamp: Date.now()
    };
    
    // Switch turns - this counts as using a turn
    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    updates[`rooms/${roomId}/currentTurn`] = opponentId;
    
    await update(ref(database), updates);
    return { success: true };
  } catch (error) {
    console.error('Error installing Jam ability:', error);
    throw error;
  }
};

// Execute Hacker ability (reveal one ship segment)
export const executeHacker = async (roomId, playerId) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();
    
    if (!room) throw new Error('Room not found');
    if (room.gameOver) throw new Error('Game is already over');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');
    
    // Check if player has this ability
    const playerAbilities = room.players[playerId]?.abilities || {};
    if (!playerAbilities.HACKER?.active || playerAbilities.HACKER.used) {
      throw new Error('Hacker ability not available');
    }
    
    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    if (!opponentId) throw new Error('Opponent not found');
    
    const opponentGrid = room.players[opponentId].PlacementData?.grid;
    if (!opponentGrid) throw new Error('Opponent grid not found');
    
    // Check if opponent has JAM protection
    if (checkJamProtection(room, opponentId)) {
      const updates = {};
      
      // Mark JAM as used after blocking this attack
      updates[`rooms/${roomId}/players/${opponentId}/abilities/JAM/used`] = true;
      
      // Mark ability as used even though it was blocked
      updates[`rooms/${roomId}/players/${playerId}/abilities/HACKER/used`] = true;
      
      // Record the jam
      updates[`rooms/${roomId}/moves/${Date.now()}`] = {
        type: 'jam',
        targetAbility: 'HACKER',
        defenderId: opponentId,
        attackerId: playerId,
        targetRow: 0,
        targetCol: 0,
        timestamp: Date.now()
      };
      
      // Switch turns back to the defender (JAM user)
      updates[`rooms/${roomId}/currentTurn`] = opponentId;
      
      await update(ref(database), updates);
      throw new Error('Your HACKER was jammed by opponent! Their JAM defense protected them.');
    }
    
    // Find a random ship segment that hasn't been hit yet
    const shipCells = [];
    opponentGrid.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell.ship && !cell.hit) {
          shipCells.push({ row: r, col: c, ship: cell.ship });
        }
      });
    });
    
    if (shipCells.length === 0) {
      throw new Error('No hidden ship parts to reveal');
    }
    
    // Choose a random ship cell
    const randomCell = shipCells[Math.floor(Math.random() * shipCells.length)];
    
    // Mark ability as used
    const updates = {};
    updates[`rooms/${roomId}/players/${playerId}/abilities/HACKER/used`] = true;
    updates[`rooms/${roomId}/players/${playerId}/hackerReveal`] = {
      row: randomCell.row,
      col: randomCell.col,
      timestamp: Date.now()
    };
    
    // Record the move
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'HACKER',
      playerId,
      revealedRow: randomCell.row,
      revealedCol: randomCell.col,
      timestamp: Date.now()
    };
    
    // Switch turns
    updates[`rooms/${roomId}/currentTurn`] = opponentId;
    
    await update(ref(database), updates);
    return { 
      success: true, 
      revealedRow: randomCell.row,
      revealedCol: randomCell.col
    };
  } catch (error) {
    console.error('Error using Hacker ability:', error);
    throw error;
  }
};

// Execute Reinforcement ability (add a new ship segment)
export const executeReinforcement = async (roomId, playerId, targetRow, targetCol, isVertical = false) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();
    
    if (!room) throw new Error('Room not found');
    if (room.gameOver) throw new Error('Game is already over');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');
    
    // Check if player has this ability
    const playerAbilities = room.players[playerId]?.abilities || {};
    if (!playerAbilities.REINFORCEMENT?.active || playerAbilities.REINFORCEMENT.used) {
      throw new Error('Reinforcement ability not available');
    }
    
    const playerGrid = room.players[playerId].PlacementData?.grid;
    if (!playerGrid) throw new Error('Player grid not found');
    
    // Check if opponent has JAM protection
    if (checkJamProtection(room, opponentId)) {
      const updates = {};
      
      // Mark JAM as used after blocking this attack
      updates[`rooms/${roomId}/players/${opponentId}/abilities/JAM/used`] = true;
      
      // Mark ability as used even though it was blocked
      updates[`rooms/${roomId}/players/${playerId}/abilities/REINFORCEMENT/used`] = true;
      
      // Record the jam
      updates[`rooms/${roomId}/moves/${Date.now()}`] = {
        type: 'jam',
        targetAbility: 'REINFORCEMENT',
        defenderId: opponentId,
        attackerId: playerId,
        targetRow,
        targetCol,
        timestamp: Date.now()
      };
      
      // Switch turns back to the defender (JAM user)
      updates[`rooms/${roomId}/currentTurn`] = opponentId;
      
      await update(ref(database), updates);
      throw new Error('Your REINFORCEMENT was jammed by opponent! Their JAM defense protected them.');
    }
    
    // Validate position and orientation
    const shipSize = 2;
    
    if (isVertical) {
      if (targetRow < 0 || targetRow + shipSize > 8 || targetCol < 0 || targetCol >= 8) {
        throw new Error('Invalid coordinates');
      }
    } else {
      if (targetRow < 0 || targetRow >= 8 || targetCol < 0 || targetCol + shipSize > 8) {
        throw new Error('Invalid coordinates');
      }
    }
    
    // Check if cells are already occupied
    for (let i = 0; i < shipSize; i++) {
      const checkRow = isVertical ? targetRow + i : targetRow;
      const checkCol = isVertical ? targetCol : targetCol + i;
      
      if (playerGrid[checkRow][checkCol].ship || 
          playerGrid[checkRow][checkCol].hit || 
          playerGrid[checkRow][checkCol].miss) {
        throw new Error('Cells already occupied');
      }
    }
    
    // Generate a unique ship ID for the new reinforcement ship
    const shipId = `reinforcement_${Date.now()}`;
    
    // Add new ship segments
    const updates = {};
    for (let i = 0; i < shipSize; i++) {
      const placeRow = isVertical ? targetRow + i : targetRow;
      const placeCol = isVertical ? targetCol : targetCol + i;
      
      updates[`rooms/${roomId}/players/${playerId}/PlacementData/grid/${placeRow}/${placeCol}/ship`] = shipId;
    }
    
    // Add the ship to the player's ships object
    updates[`rooms/${roomId}/players/${playerId}/PlacementData/ships/${shipId}`] = {
      name: 'Reinforcement',
      startPosition: { x: targetCol, y: targetRow },
      orientation: isVertical ? 'vertical' : 'horizontal',
      size: shipSize
    };
    
    // Mark ability as used
    updates[`rooms/${roomId}/players/${playerId}/abilities/REINFORCEMENT/used`] = true;
    
    // Record the move
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'REINFORCEMENT',
      playerId,
      targetRow,
      targetCol,
      isVertical,
      shipId,
      timestamp: Date.now()
    };
    
    // Switch turns
    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    updates[`rooms/${roomId}/currentTurn`] = opponentId;
    
    await update(ref(database), updates);
    return { success: true, shipId };
  } catch (error) {
    console.error('Error using Reinforcement ability:', error);
    throw error;
  }
};

// Execute Scanner ability (reveal number of ships in 2x2 area)
export const executeScanner = async (roomId, playerId, targetRow, targetCol) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();
    
    if (!room) throw new Error('Room not found');
    if (room.gameOver) throw new Error('Game is already over');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');
    
    // Check if player has this ability
    const playerAbilities = room.players[playerId]?.abilities || {};
    if (!playerAbilities.SCANNER?.active || playerAbilities.SCANNER.used) {
      throw new Error('Scanner ability not available');
    }
    
    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    if (!opponentId) throw new Error('Opponent not found');
    
    const opponentGrid = room.players[opponentId].PlacementData?.grid;
    if (!opponentGrid) throw new Error('Opponent grid not found');
    
    // Check if opponent has JAM protection
    if (checkJamProtection(room, opponentId)) {
      const updates = {};
      
      // Mark JAM as used after blocking this attack
      updates[`rooms/${roomId}/players/${opponentId}/abilities/JAM/used`] = true;
      
      // Mark ability as used even though it was blocked
      updates[`rooms/${roomId}/players/${playerId}/abilities/SCANNER/used`] = true;
      
      // Record the jam
      updates[`rooms/${roomId}/moves/${Date.now()}`] = {
        type: 'jam',
        targetAbility: 'SCANNER',
        defenderId: opponentId,
        attackerId: playerId,
        targetRow,
        targetCol,
        timestamp: Date.now()
      };
      
      // Switch turns back to the defender (JAM user)
      updates[`rooms/${roomId}/currentTurn`] = opponentId;
      
      await update(ref(database), updates);
      throw new Error('Your SCANNER was jammed by opponent! Their JAM defense protected them.');
    }
    
    // Count ships in 2x2 area
    let shipCount = 0;
    for (let r = targetRow; r < Math.min(8, targetRow + 2); r++) {
      for (let c = targetCol; c < Math.min(8, targetCol + 2); c++) {
        if (opponentGrid[r] && opponentGrid[r][c] && opponentGrid[r][c].ship) {
          shipCount++;
        }
      }
    }
    
    // Mark ability as used
    const updates = {};
    updates[`rooms/${roomId}/players/${playerId}/abilities/SCANNER/used`] = true;
    updates[`rooms/${roomId}/players/${playerId}/scannerResult`] = {
      row: targetRow,
      col: targetCol,
      shipCount,
      timestamp: Date.now()
    };
    
    // Record the move
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'SCANNER',
      playerId,
      targetRow,
      targetCol,
      shipCount,
      timestamp: Date.now()
    };
    
    // Switch turns
    updates[`rooms/${roomId}/currentTurn`] = opponentId;
    
    await update(ref(database), updates);
    return { 
      success: true, 
      shipCount,
      area: { row: targetRow, col: targetCol, width: 2, height: 2 }
    };
  } catch (error) {
    console.error('Error using Scanner ability:', error);
    throw error;
  }
};

// Execute God's Hand ability (destroy one 4x4 quadrant)
export const executeGodsHand = async (roomId, playerId, quadrantIndex) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();
    
    if (!room) throw new Error('Room not found');
    if (room.gameOver) throw new Error('Game is already over');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');
    
    // Check if player has this ability
    const playerAbilities = room.players[playerId]?.abilities || {};
    if (!playerAbilities.GODS_HAND?.active || playerAbilities.GODS_HAND.used) {
      throw new Error("God's Hand ability not available");
    }
    
    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    if (!opponentId) throw new Error('Opponent not found');
    
    const opponentGrid = room.players[opponentId].PlacementData?.grid;
    if (!opponentGrid) throw new Error('Opponent grid not found');
    
    // Check if opponent has JAM protection
    if (checkJamProtection(room, opponentId)) {
      const updates = {};
      
      // Mark JAM as used after blocking this attack
      updates[`rooms/${roomId}/players/${opponentId}/abilities/JAM/used`] = true;
      
      // Mark ability as used even though it was blocked
      updates[`rooms/${roomId}/players/${playerId}/abilities/GODS_HAND/used`] = true;
      
      // Record the jam
      updates[`rooms/${roomId}/moves/${Date.now()}`] = {
        type: 'jam',
        targetAbility: 'GODS_HAND',
        defenderId: opponentId,
        attackerId: playerId,
        targetRow: 0,
        targetCol: 0,
        timestamp: Date.now()
      };
      
      // Switch turns back to the defender (JAM user)
      updates[`rooms/${roomId}/currentTurn`] = opponentId;
      
      await update(ref(database), updates);
      throw new Error('Your GODS_HAND was jammed by opponent! Their JAM defense protected them.');
    }
    
    // Determine quadrant coordinates (0-3)
    if (quadrantIndex < 0 || quadrantIndex > 3) {
      throw new Error('Invalid quadrant index (should be 0-3)');
    }
    
    const startRow = quadrantIndex < 2 ? 0 : 4;
    const startCol = quadrantIndex % 2 === 0 ? 0 : 4;
    
    // Mark all cells in the quadrant as hit
    const updates = {};
    const hitShips = [];
    
    for (let r = startRow; r < startRow + 4; r++) {
      for (let c = startCol; c < startCol + 4; c++) {
        if (opponentGrid[r][c].ship) {
          updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${r}/${c}/hit`] = true;
          updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${r}/${c}/attackLabel`] = getCoordinateLabel(c, r);
          hitShips.push({ row: r, col: c, ship: opponentGrid[r][c].ship });
        } else {
          updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${r}/${c}/miss`] = true;
          updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${r}/${c}/attackLabel`] = getCoordinateLabel(c, r);
        }
      }
    }
    
    // Mark ability as used
    updates[`rooms/${roomId}/players/${playerId}/abilities/GODS_HAND/used`] = true;
    
    // Record the move
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'GODS_HAND',
      playerId,
      quadrant: quadrantIndex,
      hitCount: hitShips.length,
      timestamp: Date.now()
    };
    
    // Switch turns
    updates[`rooms/${roomId}/currentTurn`] = opponentId;
    
    await update(ref(database), updates);
    return { 
      success: true, 
      quadrant: quadrantIndex,
      hitCount: hitShips.length
    };
  } catch (error) {
    console.error("Error using God's Hand ability:", error);
    throw error;
  }
};

// Helper functions for ability interactions
export const checkForCounterAttack = async (roomId, attackerId, defenderId, attackRow, attackCol, hitCount = 1) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room) return false;

    const defenderAbilities = room.players[defenderId]?.abilities || {};
    
    // Counter should only activate if conditions are met
    if (defenderAbilities.COUNTER?.installed && 
        !defenderAbilities.COUNTER.used && 
        defenderAbilities.COUNTER?.active) {
      
      const attackerGrid = room.players[attackerId].PlacementData?.grid;
      if (!attackerGrid) return false;

      // Find all valid ship cells that haven't been hit yet
      const shipCells = [];
      attackerGrid.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell.ship && !cell.hit && !cell.miss) {
            shipCells.push({ row: r, col: c, ship: cell.ship });
          }
        });
      });

      if (shipCells.length === 0) return false;
      
      // Determine how many hits to make (limited by available ship cells)
      const hitsToMake = Math.min(hitCount, shipCells.length);
      const updates = {};
      const hitCells = [];
      const moveTimestamp = Date.now();
      
      // Hit multiple segments based on original hit count
      for (let i = 0; i < hitsToMake; i++) {
        // Choose a random index and remove that cell after using it
        const randomIndex = Math.floor(Math.random() * shipCells.length);
        const targetCell = shipCells.splice(randomIndex, 1)[0];
        
        // Generate coordinate label for display
        const colLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const rowLabels = ['1', '2', '3', '4', '5', '6', '7', '8'];
        const cellLabel = `${colLabels[targetCell.col]}${rowLabels[targetCell.row]}`;

        // Make the hit
        updates[`rooms/${roomId}/players/${attackerId}/PlacementData/grid/${targetCell.row}/${targetCell.col}/hit`] = true;
        updates[`rooms/${roomId}/players/${attackerId}/PlacementData/grid/${targetCell.row}/${targetCell.col}/miss`] = false;
        updates[`rooms/${roomId}/players/${attackerId}/PlacementData/grid/${targetCell.row}/${targetCell.col}/fromCounter`] = true;
        updates[`rooms/${roomId}/players/${attackerId}/PlacementData/grid/${targetCell.row}/${targetCell.col}/attackLabel`] = cellLabel;
        
        hitCells.push({
          row: targetCell.row,
          col: targetCell.col,
          cellLabel
        });
      }
      
      // Mark COUNTER as used - one-time use only
      updates[`rooms/${roomId}/players/${defenderId}/abilities/COUNTER/used`] = true;
      
      // Notify both players about the counter hits
      updates[`rooms/${roomId}/players/${defenderId}/counterHitResult`] = {
        hits: hitCells,
        timestamp: Date.now(),
        hitCount: hitCells.length
      };
      
      updates[`rooms/${roomId}/players/${attackerId}/counterHitByOpponent`] = {
        hits: hitCells,
        timestamp: Date.now(),
        hitCount: hitCells.length
      };

      // Record in move history
      updates[`rooms/${roomId}/moves/${moveTimestamp}`] = {
        type: 'counter',
        attackerId: defenderId,
        defenderId: attackerId,
        hits: hitCells,
        cellLabel: hitCells.map(cell => cell.cellLabel).join(', '),
        isHit: true,
        hitCount: hitCells.length,
        originalAttack: { row: attackRow, col: attackCol },
        timestamp: moveTimestamp
      };
      
      await update(ref(database), updates);
      console.log(`COUNTER ability triggered: ${defenderId} hit ${hitCells.length} of ${attackerId}'s ship segments`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error in COUNTER ability:', error);
    return false;
  }
};

// Helper function to check if JAM is active
export const checkJamProtection = (room, defenderId) => {
  const defenderAbilities = room.players[defenderId]?.abilities || {};
  return defenderAbilities.JAM?.installed && !defenderAbilities.JAM?.used;
};

