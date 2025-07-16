import { ref, get, update } from 'firebase/database';
import { database } from './firebaseConfig';

// Add this at the beginning of the file
const getCoordinateLabel = (col, row) => {
  const colLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const rowLabels = ['1', '2', '3', '4', '5', '6', '7', '8'];
  return `${colLabels[col]}${rowLabels[row]}`;
};

// Define available abilities and their details - CLEANED UP VERSION
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
    description: 'Destroys 3 horizontal cells: first the middle one attacks, then the either side ones hit',
    type: 'attack',
    difficulty: 'easy',
  },
  
  // Support/Recon abilities
  HACKER: {
    name: 'Hacker',
    description: 'Highlights a ship part location on the enemy grid',
    type: 'support',
    difficulty: 'easy',
  },
  SCANNER: {
    name: 'Scanner',
    description: 'Returns the number of ship parts in a 2x2 grid area',
    type: 'support',
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
  
  // Admin-only abilities (only available in admin-hosted games)
  GODS_HAND: {
    name: "God's Hand",
    description: 'Admin-only: Destroy an entire 4x4 quadrant of the enemy grid',
    type: 'admin',
    difficulty: 'admin',
    adminOnly: true,
  },
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
    
    // Get grid size from room settings
    const gridSize = room.settings?.gridSize || 8;
    
    // Validate that the grid is properly structured
    if (!Array.isArray(opponentGrid) || opponentGrid.length !== gridSize) {
      throw new Error(`Opponent grid has invalid structure. Expected ${gridSize}x${gridSize} array`);
    }
    
    // Check if opponent has JAM protection
    if (checkJamProtection(room, opponentId)) {
      const updates = {};
      
      // Mark JAM as used after blocking this attack
      updates[`rooms/${roomId}/players/${opponentId}/abilities/JAM/used`] = true;
      
      // Mark the current ability as used even though it was blocked
      updates[`rooms/${roomId}/players/${playerId}/abilities/NUKE/used`] = true;
      
      // Clear any ability state
      updates[`rooms/${roomId}/players/${playerId}/activeAbilityState`] = null;
      
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
      if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) continue;
      
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
      affectedCells,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    // In executeNuke, executeAnnihilate, etc. after hits are recorded
    if (hitCount > 0) {
      await checkForCounterAttack(roomId, playerId, opponentId, targetRow, targetCol, hitCount, false);
    }
    
    return { success: true, hitCount, affectedCells };
  } catch (error) {
    console.error('Error using Nuke ability:', error);
    throw error;
  }
};

// Execute annihilate ability (3 consecutive cells: middle first, then sides if middle hits)
export const executeAnnihilate = async (roomId, playerId, targetRow, targetCol, isVertical = false) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();
    
    if (!room) throw new Error('Room not found');
    if (room.gameOver) throw new Error('Game is already over');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');
    
    // Check if player has this ability
    const playerAbilities = room.players[playerId]?.abilities || {};
    if (!playerAbilities.ANNIHILATE?.active || playerAbilities.ANNIHILATE.used) {
      throw new Error('Annihilate ability not available');
    }
    
    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    if (!opponentId) throw new Error('Opponent not found');
    
    const opponentGrid = room.players[opponentId].PlacementData?.grid;
    if (!opponentGrid) throw new Error('Opponent grid not found');
    
    // Get grid size from room settings
    const gridSize = room.settings?.gridSize || 8;
    
    // Validate that the grid is properly structured
    if (!Array.isArray(opponentGrid) || opponentGrid.length !== gridSize) {
      throw new Error(`Opponent grid has invalid structure. Expected ${gridSize}x${gridSize} array`);
    }
    
    // Check if opponent has JAM protection
    if (checkJamProtection(room, opponentId)) {
      const updates = {};
      
      // Mark JAM as used after blocking this attack
      updates[`rooms/${roomId}/players/${opponentId}/abilities/JAM/used`] = true;
      
      // Mark the current ability as used even though it was blocked
      updates[`rooms/${roomId}/players/${playerId}/abilities/ANNIHILATE/used`] = true;
      
      // Clear any ability state
      updates[`rooms/${roomId}/players/${playerId}/activeAbilityState`] = null;
      
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
    let hitCount = 0;
    const hitCells = [];
    
    // First, attack the middle cell (target cell)
    const middleR = targetRow;
    const middleC = targetCol;
    
    // Check bounds for middle cell
    if (middleR < 0 || middleR >= gridSize || middleC < 0 || middleC >= gridSize) {
      throw new Error('Target position is out of bounds');
    }
    
    // Skip if middle cell already hit or missed
    if (opponentGrid[middleR] && opponentGrid[middleR][middleC] && 
        (opponentGrid[middleR][middleC].hit || opponentGrid[middleR][middleC].miss)) {
      throw new Error('Target cell has already been attacked');
    }
    
    const middleIsHit = Boolean(opponentGrid[middleR][middleC].ship);
    
    // Always attack the middle cell
    if (middleIsHit) {
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${middleR}/${middleC}/hit`] = true;
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${middleR}/${middleC}/attackLabel`] = getCoordinateLabel(middleC, middleR);
      hitCount++;
    } else {
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${middleR}/${middleC}/miss`] = true;
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${middleR}/${middleC}/attackLabel`] = getCoordinateLabel(middleC, middleR);
    }
    
    hitCells.push({ row: middleR, col: middleC, isHit: middleIsHit });
    
    // Now attack the side cells regardless of whether middle hit or missed
    const sideCells = [];
    
    if (isVertical) {
      // Vertical: attack cells above and below the middle
      sideCells.push({ r: targetRow - 1, c: targetCol }); // Above
      sideCells.push({ r: targetRow + 1, c: targetCol }); // Below
    } else {
      // Horizontal: attack cells left and right of the middle
      sideCells.push({ r: targetRow, c: targetCol - 1 }); // Left
      sideCells.push({ r: targetRow, c: targetCol + 1 }); // Right
    }
    
    // Attack each side cell
    for (const cell of sideCells) {
      const r = cell.r;
      const c = cell.c;
      
      // Skip if out of bounds
      if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) continue;
      
      // Skip if cell already hit or missed
      if (!opponentGrid[r] || !opponentGrid[r][c] || 
          opponentGrid[r][c].hit || opponentGrid[r][c].miss) continue;
      
      const isHit = Boolean(opponentGrid[r][c].ship);
      if (isHit) {
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${r}/${c}/hit`] = true;
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${r}/${c}/attackLabel`] = getCoordinateLabel(c, r);
        hitCount++;
      } else {
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${r}/${c}/miss`] = true;
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${r}/${c}/attackLabel`] = getCoordinateLabel(c, r);
      }
      
      hitCells.push({ row: r, col: c, isHit });
    }
    
    // Mark ability as used
    updates[`rooms/${roomId}/players/${playerId}/abilities/ANNIHILATE/used`] = true;
    
    // Record the move
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'ANNIHILATE',
      playerId,
      targetRow,
      targetCol,
      isVertical,
      hitCount,
      hitCells,
      middleHit: middleIsHit,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    // In executeNuke, executeAnnihilate, etc. after hits are recorded
    if (hitCount > 0) {
      await checkForCounterAttack(roomId, playerId, opponentId, targetRow, targetCol, hitCount, false);
    }
    
    return { success: true, hitCount, hitCells, middleHit: middleIsHit };
  } catch (error) {
    console.error('Error using Annihilate ability:', error);
    throw error;
  }
};

// Execute hacker ability (locate one part of an enemy ship)
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
    
    const updates = {};
    let foundCell = null;
    
    // Get grid size from room settings
    const gridSize = room.settings?.gridSize || 8;
    
    // Find a random unhit ship cell
    const shipCells = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (opponentGrid[r] && opponentGrid[r][c] && opponentGrid[r][c].ship && !opponentGrid[r][c].hit) {
          shipCells.push({ row: r, col: c });
        }
      }
    }
    
    if (shipCells.length > 0) {
      const randomIndex = Math.floor(Math.random() * shipCells.length);
      foundCell = shipCells[randomIndex];
    }
    
    // Mark ability as used
    updates[`rooms/${roomId}/players/${playerId}/abilities/HACKER/used`] = true;
    
    // Record the move
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'HACKER',
      playerId,
      foundCell,
      timestamp: Date.now()
    };
    
    // Store the hacked information for the player
    if (foundCell) {
      updates[`rooms/${roomId}/players/${playerId}/hackedCells/${foundCell.row}_${foundCell.col}`] = {
        row: foundCell.row,
        col: foundCell.col,
        revealedAt: Date.now()
      };
    }
    
    updates[`rooms/${roomId}/currentTurn`] = opponentId;
    await update(ref(database), updates);
    
    return { success: true, foundCell, revealedCell: foundCell };
  } catch (error) {
    console.error('Error using Hacker ability:', error);
    throw error;
  }
};

// Execute scanner ability (scan 2x2 area)
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
    
    const updates = {};
    let shipPartsCount = 0;
    const scanArea = [];
    
    // Get grid size from room settings
    const gridSize = room.settings?.gridSize || 8;
    
    // Scan 2x2 area
    for (let r = targetRow; r < targetRow + 2 && r < gridSize; r++) {
      for (let c = targetCol; c < targetCol + 2 && c < gridSize; c++) {
        if (r >= 0 && c >= 0) {
          scanArea.push({ row: r, col: c });
          if (opponentGrid[r] && opponentGrid[r][c] && opponentGrid[r][c].ship) {
            shipPartsCount++;
          }
        }
      }
    }
    
    // Mark ability as used
    updates[`rooms/${roomId}/players/${playerId}/abilities/SCANNER/used`] = true;
    
    // Record the move
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'SCANNER',
      playerId,
      targetRow,
      targetCol,
      scanArea,
      shipPartsCount,
      timestamp: Date.now()
    };
    
    updates[`rooms/${roomId}/currentTurn`] = opponentId;
    await update(ref(database), updates);
    
    return { success: true, scanArea, shipPartsCount, shipCount: shipPartsCount };
  } catch (error) {
    console.error('Error using Scanner ability:', error);
    throw error;
  }
};

// Install counter ability (passive defense)
export const installCounter = async (roomId, playerId) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();
    
    if (!room) throw new Error('Room not found');
    if (room.gameOver) throw new Error('Game is already over');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');
    
    // Check if player has this ability
    const playerAbilities = room.players[playerId]?.abilities || {};
    if (!playerAbilities.COUNTER?.active || playerAbilities.COUNTER.used) {
      throw new Error('Counter ability not available');
    }
    
    const updates = {};
    
    // Install counter - it becomes passive and active
    updates[`rooms/${roomId}/players/${playerId}/abilities/COUNTER/installed`] = true;
    updates[`rooms/${roomId}/players/${playerId}/abilities/COUNTER/used`] = true;
    
    // Record the move
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'COUNTER_INSTALL',
      playerId,
      timestamp: Date.now()
    };
    
    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    updates[`rooms/${roomId}/currentTurn`] = opponentId;
    
    await update(ref(database), updates);
    
    return { success: true, installed: true };
  } catch (error) {
    console.error('Error installing Counter ability:', error);
    throw error;
  }
};

// Install jam ability (passive defense)
export const installJam = async (roomId, playerId) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();
    
    if (!room) throw new Error('Room not found');
    if (room.gameOver) throw new Error('Game is already over');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');
    
    // Check if player has this ability
    const playerAbilities = room.players[playerId]?.abilities || {};
    if (!playerAbilities.JAM?.active || playerAbilities.JAM.used) {
      throw new Error('Jam ability not available');
    }
    
    const updates = {};
    
    // Install jam - it becomes passive and active for one opponent attack
    updates[`rooms/${roomId}/players/${playerId}/abilities/JAM/installed`] = true;
    updates[`rooms/${roomId}/players/${playerId}/abilities/JAM/used`] = true;
    
    // Record the move
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'JAM_INSTALL',
      playerId,
      timestamp: Date.now()
    };
    
    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    updates[`rooms/${roomId}/currentTurn`] = opponentId;
    
    await update(ref(database), updates);
    
    return { success: true, installed: true };
  } catch (error) {
    console.error('Error installing Jam ability:', error);
    throw error;
  }
};

// Helper function to check if opponent has JAM protection
export const checkJamProtection = (room, defenderId) => {
  // Check if the defender has JAM ability installed/active
  return room.players[defenderId]?.abilities?.JAM?.installed === true;
};

// Check for counter attack after a player's ship is hit
export const checkForCounterAttack = async (roomId, attackerId, defenderId, targetRow, targetCol, hitCount) => {
  try {
    if (hitCount <= 0) return; // No counter if no hits
    
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();
    
    if (!room) return;
    
    // Check if the defender has COUNTER ability installed
    const defenderAbilities = room.players[defenderId]?.abilities || {};
    if (!defenderAbilities.COUNTER?.installed) return;
    
    const attackerGrid = room.players[attackerId].PlacementData?.grid;
    if (!attackerGrid) return;
    
    // Get grid size from room settings
    const gridSize = room.settings?.gridSize || 8;
    
    const updates = {};
    let counterHitCount = 0;
    
    // Find a random unhit ship cell on the attacker's grid
    const attackerShipCells = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (attackerGrid[r] && attackerGrid[r][c] && attackerGrid[r][c].ship && !attackerGrid[r][c].hit) {
          attackerShipCells.push({ row: r, col: c });
        }
      }
    }
    
    if (attackerShipCells.length > 0) {
      const randomIndex = Math.floor(Math.random() * attackerShipCells.length);
      const counterTarget = attackerShipCells[randomIndex];
      
      // Execute counter attack
      updates[`rooms/${roomId}/players/${attackerId}/PlacementData/grid/${counterTarget.row}/${counterTarget.col}/hit`] = true;
      updates[`rooms/${roomId}/players/${attackerId}/PlacementData/grid/${counterTarget.row}/${counterTarget.col}/attackLabel`] = getCoordinateLabel(counterTarget.col, counterTarget.row);
      counterHitCount = 1;
      
      // Record counter attack
      updates[`rooms/${roomId}/moves/${Date.now() + 1}`] = {
        type: 'counter_attack',
        defenderId,
        attackerId,
        counterTarget,
        triggeredBy: { targetRow, targetCol },
        timestamp: Date.now()
      };
    }
    
    // Counter can only be used once per game, so mark it as used after triggering
    updates[`rooms/${roomId}/players/${defenderId}/abilities/COUNTER/installed`] = false;
    
    await update(ref(database), updates);
    
    return { counterHitCount };
  } catch (error) {
    console.error('Error in counter attack:', error);
    return { counterHitCount: 0 };
  }
};

// Grant random abilities to all players at game start
export const grantRandomAbilitiesToAllPlayers = async (roomId) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();
    
    if (!room) throw new Error('Room not found');
    
    const updates = {};
    
    // Define ability categories
    const attackAbilities = ['NUKE', 'ANNIHILATE'];
    const supportAbilities = ['HACKER', 'SCANNER'];
    const defenseAbilities = ['COUNTER', 'JAM'];
    
    // Grant abilities to each player
    Object.keys(room.players).forEach(playerId => {
      // Select one ability from each category
      const selectedAttack = attackAbilities[Math.floor(Math.random() * attackAbilities.length)];
      const selectedSupport = supportAbilities[Math.floor(Math.random() * supportAbilities.length)];
      const selectedDefense = defenseAbilities[Math.floor(Math.random() * defenseAbilities.length)];
      
      const selectedAbilities = [selectedAttack, selectedSupport, selectedDefense];
      
      selectedAbilities.forEach(abilityKey => {
        const ability = ABILITIES[abilityKey];
        if (ability) {
          updates[`rooms/${roomId}/players/${playerId}/abilities/${abilityKey}`] = {
            active: true,
            used: false,
            difficulty: ability.difficulty,
            grantedAt: Date.now()
          };
        }
      });
    });
    
    await update(ref(database), updates);
    return true;
  } catch (error) {
    console.error('Error granting random abilities:', error);
    throw error;
  }
};

// Admin-only ability: God's Hand (destroy 4x4 quadrant)
export const executeGodsHand = async (roomId, targetPlayerId, quadrantIndex, isAdminTriggered = false) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();
    
    if (!room) throw new Error('Room not found');
    
    // Verify admin trigger or admin game
    if (!isAdminTriggered && !room.isAdminGame) {
      throw new Error('GODS_HAND can only be used in admin-hosted games');
    }
    
    const targetPlayer = room.players[targetPlayerId];
    if (!targetPlayer) throw new Error('Target player not found');
    
    const gridSize = room.settings?.gridSize || 8;
    const targetGrid = targetPlayer.PlacementData?.grid;
    
    if (!targetGrid) throw new Error('Target player grid not found');
    
    // Calculate quadrant boundaries (4x4 sections)
    // For 8x8 grid: Q1 (0-3,0-3), Q2 (0-3,4-7), Q3 (4-7,0-3), Q4 (4-7,4-7)
    const quadrantsPerRow = Math.floor(gridSize / 4);
    const quadrantRow = Math.floor(quadrantIndex / quadrantsPerRow);
    const quadrantCol = quadrantIndex % quadrantsPerRow;
    
    const startRow = quadrantRow * 4;
    const startCol = quadrantCol * 4;
    const endRow = Math.min(startRow + 4, gridSize);
    const endCol = Math.min(startCol + 4, gridSize);
    
    // Track hits and ships destroyed
    let hitCount = 0;
    const affectedCells = [];
    
    const updates = {};
    
    // Apply God's Hand to the 4x4 quadrant
    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const cell = targetGrid[row][col];
        
        // Track the state before God's Hand affects it
        const wasAlreadyHit = Boolean(cell.hit);
        const wasAlreadyMiss = Boolean(cell.miss);
        const hasShip = Boolean(cell.ship);
        
        // Always mark cells as hit or miss with God's Hand (it destroys everything)
        if (hasShip) {
          if (!wasAlreadyHit) {
            hitCount++;
            updates[`rooms/${roomId}/players/${targetPlayerId}/PlacementData/grid/${row}/${col}/hit`] = true;
          }
        } else {
          if (!wasAlreadyMiss) {
            updates[`rooms/${roomId}/players/${targetPlayerId}/PlacementData/grid/${row}/${col}/miss`] = true;
          }
        }
        
        affectedCells.push({
          row,
          col,
          label: getCoordinateLabel(col, row),
          wasHit: hasShip && !wasAlreadyHit,
          wasMiss: !hasShip && !wasAlreadyMiss,
          alreadyRevealed: wasAlreadyHit || wasAlreadyMiss
        });
      }
    }
    
    // Record the move
    const timestamp = Date.now();
    updates[`rooms/${roomId}/moves/${timestamp}`] = {
      playerId: isAdminTriggered ? 'ADMIN' : targetPlayerId,
      type: 'ability',
      name: 'GODS_HAND',
      quadrantIndex,
      hitCount,
      affectedCells,
      isAdminTriggered,
      timestamp
    };
    
    // Mark ability as used if not admin triggered
    if (!isAdminTriggered) {
      updates[`rooms/${roomId}/players/${targetPlayerId}/abilities/GODS_HAND/used`] = true;
    }
    
    await update(ref(database), updates);
    
    // Check win conditions after God's Hand
    const updatedRoom = { ...room };
    // Apply the updates to the room data for win condition checking
    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const cell = targetGrid[row][col];
        if (cell.ship && !cell.hit) {
          updatedRoom.players[targetPlayerId].PlacementData.grid[row][col].hit = true;
        } else if (!cell.ship && !cell.miss) {
          updatedRoom.players[targetPlayerId].PlacementData.grid[row][col].miss = true;
        }
      }
    }
    
    // Import and use the win condition checker from gameService
    const { checkWinConditions } = await import('./gameService');
    const winResult = await checkWinConditions(roomId, updatedRoom);
    
    let gameOver = false;
    if (winResult) {
      const winnerUpdates = {};
      winnerUpdates[`rooms/${roomId}/gameOver`] = true;
      winnerUpdates[`rooms/${roomId}/winner`] = winResult.winner;
      winnerUpdates[`rooms/${roomId}/status`] = 'completed';
      winnerUpdates[`rooms/${roomId}/endedAt`] = Date.now();
      winnerUpdates[`rooms/${roomId}/endReason`] = winResult.reason;
      if (winResult.stats) {
        winnerUpdates[`rooms/${roomId}/endStats`] = winResult.stats;
      }
      
      await update(ref(database), winnerUpdates);
      gameOver = true;
    }
    
    return {
      success: true,
      hitCount,
      affectedCells,
      quadrantIndex,
      gameOver,
      winnerId: gameOver ? Object.keys(room.players).find(id => id !== targetPlayerId) : null,
      message: `God's Hand destroyed ${affectedCells.length} cells in quadrant ${quadrantIndex + 1}, hitting ${hitCount} ship parts${gameOver ? ' - Game Over!' : ''}`
    };
    
  } catch (error) {
    console.error('Error executing God\'s Hand:', error);
    throw error;
  }
};
