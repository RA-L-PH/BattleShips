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
  // Original Attack abilities
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
  
  // New Attack abilities
  SALVO: {
    name: 'Salvo',
    type: 'attack',
    description: 'Fires three shots in a straight line (horizontal or vertical)',
    difficulty: 'easy',
  },
  PRECISION_STRIKE: {
    name: 'Precision Strike',
    type: 'attack',
    description: 'Target a single square and get a free adjacent shot if it hits',
    difficulty: 'easy',
  },
  VOLLEY_FIRE: {
    name: 'Volley Fire',
    type: 'attack',
    description: 'Choose a 3x1 or 1x3 area. All three squares are attacked simultaneously',
    difficulty: 'easy',
  },
  TORPEDO_RUN: {
    name: 'Torpedo Run',
    type: 'attack',
    description: 'Choose an entire row or column. If any ship is hit, get info and a free shot',
    difficulty: 'easy',
  },
  DECOY_SHOT: {
    name: 'Decoy Shot',
    type: 'attack',
    description: 'Fire a shot. If it misses, get to immediately fire another shot anywhere',
    difficulty: 'easy',
  },
  BARRAGE: {
    name: 'Barrage',
    type: 'attack',
    description: 'Fire 5 individual shots anywhere on the board with immediate feedback',
    difficulty: 'medium',
  },
  DEPTH_CHARGE: {
    name: 'Depth Charge',
    type: 'attack',
    description: 'Target a 1x1 square. If hit, attack adjacent squares in + pattern',
    difficulty: 'medium',
  },
  EMP_BLAST: {
    name: 'EMP Blast',
    type: 'attack',
    description: 'Target 2x2 grid. Disables enemy Support abilities if ships are in area',
    difficulty: 'medium',
  },
  PINPOINT_STRIKE: {
    name: 'Pinpoint Strike',
    type: 'attack',
    description: 'Select a 1x1 square. If hit, deal 2 damage instead of 1',
    difficulty: 'medium',
  },
  CHAIN_REACTION: {
    name: 'Chain Reaction',
    type: 'attack',
    description: 'Target 1x1 square. If it destroys a ship segment, get a free shot',
    difficulty: 'medium',
  },
  
  // Original Defense abilities  
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
  
  // New Defense abilities
  REPAIR_CREW: {
    name: 'Repair Crew',
    type: 'defense',
    description: 'Choose one previously hit square on your ships. Repair it to absorb another hit',
    difficulty: 'easy',
  },
  CLOAK: {
    name: 'Cloak',
    type: 'defense',
    description: 'For 2 turns, one chosen ship cannot be targeted by offensive abilities',
    difficulty: 'easy',
  },
  REINFORCE: {
    name: 'Reinforce',
    type: 'defense',
    description: 'Select a 1x1 square. For next turn, attacks on that square are negated',
    difficulty: 'easy',
  },
  EVASIVE_MANEUVERS: {
    name: 'Evasive Maneuvers',
    type: 'defense',
    description: 'After opponent declares attack, swap positions of two adjacent ship squares',
    difficulty: 'easy',
  },
  MINEFIELD: {
    name: 'Minefield',
    type: 'defense',
    description: 'Place 2x2 invisible minefield. Enemy attacks within take +1 damage',
    difficulty: 'easy',
  },
  EMERGENCY_PATCH: {
    name: 'Emergency Patch',
    type: 'defense',
    description: 'Select a ship square just hit this turn. Instantly repair it',
    difficulty: 'medium',
  },
  SMOKE_SCREEN: {
    name: 'Smoke Screen',
    type: 'defense',
    description: 'For opponent\'s next turn, 3x3 grid becomes invisible to Scanner/Hacker',
    difficulty: 'medium',
  },
  DEFENSIVE_NET: {
    name: 'Defensive Net',
    type: 'defense',
    description: 'Choose 1x3 or 3x1 area. For next turn, damage in that area is halved',
    difficulty: 'medium',
  },
  SONAR_DECOY: {
    name: 'Sonar Decoy',
    type: 'defense',
    description: 'Place 1x1 decoy. Scanner/Hacker on 2x2 including decoy shows false positive',
    difficulty: 'medium',
  },
  BRACE_FOR_IMPACT: {
    name: 'Brace for Impact',
    type: 'defense',
    description: 'For opponent\'s next attack phase, one ship takes 1 less damage from all attacks',
    difficulty: 'medium',
  },
  
  // Original Support abilities
  HACKER: {
    name: 'Hacker',
    description: 'Locate one part of an enemy ship',
    type: 'support',
    difficulty: 'easy',
  },
  SCANNER: {
    name: 'Scanner',
    description: 'Scan a 2x2 grid area and reveal number of ship parts',
    type: 'support',
    difficulty: 'easy',
  },
  
  // New Support abilities
  SONAR_PULSE: {
    name: 'Sonar Pulse',
    type: 'support',
    description: 'Choose a 3x3 grid. Reveals if any ship is present (yes/no) but not exact location',
    difficulty: 'easy',
  },
  INTEL_LEAK: {
    name: 'Intel Leak',
    type: 'support',
    description: 'Reveals the orientation (horizontal/vertical) of one random enemy ship',
    difficulty: 'easy',
  },
  TACTICAL_READOUT: {
    name: 'Tactical Readout',
    type: 'support',
    description: 'Reveals whether opponent used Attack, Defense, or Support ability last turn',
    difficulty: 'easy',
  },
  JAMMING_SIGNAL: {
    name: 'Jamming Signal',
    type: 'support',
    description: 'For opponent\'s next turn, their Scanner/Hacker abilities are disabled',
    difficulty: 'easy',
  },
  SPOTTER_PLANE: {
    name: 'Spotter Plane',
    type: 'support',
    description: 'Reveals if there is a ship adjacent to a chosen empty square',
    difficulty: 'easy',
  },
  RECONNAISSANCE_FLYBY: {
    name: 'Reconnaissance Flyby',
    type: 'support',
    description: 'Choose 5x1 or 1x5 line. Shows how many unique ships intersect that line',
    difficulty: 'medium',
  },
  TARGET_ANALYSIS: {
    name: 'Target Analysis',
    type: 'support',
    description: 'Select a 1x1 square you previously hit. Shows remaining health of that ship',
    difficulty: 'medium',
  },
  OPPONENTS_PLAYBOOK: {
    name: 'Opponent\'s Playbook',
    type: 'support',
    description: 'Reveals the last offensive ability the opponent used',
    difficulty: 'medium',
  },
  WEATHER_FORECAST: {
    name: 'Weather Forecast',
    type: 'support',
    description: 'Predicts if your next standard shot will be a hit or miss',
    difficulty: 'medium',
  },
  COMMUNICATIONS_INTERCEPT: {
    name: 'Communications Intercept',
    type: 'support',
    description: 'Random info: either ship length or general vicinity of an untouched ship',
    difficulty: 'medium',
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

// Grant random abilities to all players in a room (called during game start)
export const grantRandomAbilitiesToAllPlayers = async (roomId) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room) throw new Error('Room not found');

    const playerIds = Object.keys(room.players || {});
    if (playerIds.length === 0) throw new Error('No players found in room');

    // Get all easy abilities (excluding GODS_HAND which is admin-only)
    const easyAbilities = Object.entries(ABILITIES)
      .filter(([key, ability]) => ability.difficulty === 'easy' && key !== 'GODS_HAND')
      .map(([key]) => key);

    if (easyAbilities.length === 0) {
      console.log('No easy abilities available to grant');
      return;
    }

    const updates = {};    // Grant exactly 3 random abilities to each player
    for (const playerId of playerIds) {
      // Always grant exactly 3 abilities
      const numAbilities = 3;
      
      // Randomly select abilities for this player
      const shuffledAbilities = [...easyAbilities].sort(() => 0.5 - Math.random());
      const selectedAbilities = shuffledAbilities.slice(0, Math.min(numAbilities, easyAbilities.length));

      // Grant each selected ability
      for (const abilityKey of selectedAbilities) {
        const ability = ABILITIES[abilityKey];
        const abilityData = {
          active: true,
          used: false,
          difficulty: ability.difficulty,
          grantedAt: Date.now(),
          grantedRandomly: true // Flag to indicate this was granted randomly
        };

        updates[`rooms/${roomId}/players/${playerId}/abilities/${abilityKey}`] = abilityData;
      }

      console.log(`Granted ${selectedAbilities.length} random abilities to player ${playerId}: ${selectedAbilities.join(', ')}`);
    }

    // Apply all updates at once
    await update(ref(database), updates);
    
    console.log(`Successfully granted random abilities to all players in room ${roomId}`);
    return true;
  } catch (error) {
    console.error('Error granting random abilities to all players:', error);
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
      updates[`rooms/${roomId}/players/${opponentId}/abilities/JAM/installed`] = false;
      
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
      await checkForCounterAttack(roomId, playerId, opponentId, targetRow, targetCol, hitCount, false);
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
    const opponentGrid = room.players[opponentId].PlacementData?.grid;    // Check if opponent has JAM protection
    if (checkJamProtection(room, opponentId)) {
      const updates = {};
      
      // Mark JAM as used after blocking this attack
      updates[`rooms/${roomId}/players/${opponentId}/abilities/JAM/used`] = true;
      updates[`rooms/${roomId}/players/${opponentId}/abilities/JAM/installed`] = false;
      
      // Mark the current ability as used even though it was blocked
      updates[`rooms/${roomId}/players/${playerId}/abilities/ANNIHILATE/used`] = true;
      
      // Clear any ability state
      updates[`rooms/${roomId}/players/${playerId}/activeAbilityState`] = null;
      
      // If ability has specific state (like orientation), clear that too
      updates[`rooms/${roomId}/players/${playerId}/annihilateOrientation`] = null;
      
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
      await checkForCounterAttack(roomId, playerId, opponentId, targetRow, targetCol, hitCount, false);
    }
    
    return { success: true, hitCount, hitCells };
  } catch (error) {
    console.error('Error using Annihilate ability:', error);
    throw error;
  }
};

// Execute Salvo ability (three shots in a straight line)
export const executeSalvo = async (roomId, playerId, targetRow, targetCol, isVertical = false) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room) throw new Error('Room not found');
    if (room.gameOver) throw new Error('Game is already over');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerAbilities = room.players[playerId]?.abilities || {};
    if (!playerAbilities.SALVO?.active || playerAbilities.SALVO.used) {
      throw new Error('Salvo ability not available');
    }

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const opponentGrid = room.players[opponentId].PlacementData?.grid;

    // Check for JAM protection
    if (checkJamProtection(room, opponentId)) {      const updates = {};
      updates[`rooms/${roomId}/players/${opponentId}/abilities/JAM/used`] = true;
      updates[`rooms/${roomId}/players/${opponentId}/abilities/JAM/installed`] = false;
      updates[`rooms/${roomId}/players/${playerId}/abilities/SALVO/used`] = true;
      updates[`rooms/${roomId}/currentTurn`] = opponentId;
      await update(ref(database), updates);
      throw new Error('Your SALVO was jammed by opponent!');
    }

    const updates = {};
    const hitCells = [];
    let hitCount = 0;

    // Fire three shots in a line
    for (let i = 0; i < 3; i++) {
      const row = isVertical ? targetRow + i : targetRow;
      const col = isVertical ? targetCol : targetCol + i;

      if (row >= 8 || col >= 8 || row < 0 || col < 0) continue;
      if (opponentGrid[row][col].hit || opponentGrid[row][col].miss) continue;

      const isHit = Boolean(opponentGrid[row][col].ship);
      if (isHit) {
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/hit`] = true;
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/attackLabel`] = getCoordinateLabel(col, row);
        hitCount++;
      } else {
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/miss`] = true;
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/attackLabel`] = getCoordinateLabel(col, row);
      }
      hitCells.push({ row, col, isHit });
    }

    updates[`rooms/${roomId}/players/${playerId}/abilities/SALVO/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'SALVO',
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

    if (hitCount > 0) {
      await checkForCounterAttack(roomId, playerId, opponentId, targetRow, targetCol, hitCount, false);
    }

    return { success: true, hitCount, hitCells };
  } catch (error) {
    console.error('Error using Salvo ability:', error);
    throw error;
  }
};

// Execute Precision Strike ability (single hit + adjacent follow-up if hit)
export const executePrecisionStrike = async (roomId, playerId, targetRow, targetCol) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room) throw new Error('Room not found');
    if (room.gameOver) throw new Error('Game is already over');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerAbilities = room.players[playerId]?.abilities || {};
    if (!playerAbilities.PRECISION_STRIKE?.active || playerAbilities.PRECISION_STRIKE.used) {
      throw new Error('Precision Strike ability not available');
    }

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const opponentGrid = room.players[opponentId].PlacementData?.grid;

    // Check for JAM protection
    if (checkJamProtection(room, opponentId)) {      const updates = {};
      updates[`rooms/${roomId}/players/${opponentId}/abilities/JAM/used`] = true;
      updates[`rooms/${roomId}/players/${opponentId}/abilities/JAM/installed`] = false;
      updates[`rooms/${roomId}/players/${playerId}/abilities/PRECISION_STRIKE/used`] = true;
      updates[`rooms/${roomId}/currentTurn`] = opponentId;
      await update(ref(database), updates);
      throw new Error('Your PRECISION STRIKE was jammed by opponent!');
    }

    const updates = {};
    let totalHits = 0;
    const hitCells = [];

    // First shot
    if (!opponentGrid[targetRow][targetCol].hit && !opponentGrid[targetRow][targetCol].miss) {
      const isHit = Boolean(opponentGrid[targetRow][targetCol].ship);
      if (isHit) {
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/hit`] = true;
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/attackLabel`] = getCoordinateLabel(targetCol, targetRow);
        totalHits++;
        hitCells.push({ row: targetRow, col: targetCol, isHit: true });

        // Store precision strike state for follow-up shot selection
        updates[`rooms/${roomId}/players/${playerId}/precisionStrikeState`] = {
          originalHit: { row: targetRow, col: targetCol },
          awaitingFollowUp: true,
          timestamp: Date.now()
        };
      } else {
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/miss`] = true;
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/attackLabel`] = getCoordinateLabel(targetCol, targetRow);
        hitCells.push({ row: targetRow, col: targetCol, isHit: false });
      }
    }

    updates[`rooms/${roomId}/players/${playerId}/abilities/PRECISION_STRIKE/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'PRECISION_STRIKE',
      playerId,
      targetRow,
      targetCol,
      hitCount: totalHits,
      hitCells,
      awaitingFollowUp: totalHits > 0,
      timestamp: Date.now()
    };

    // Only switch turns if no follow-up shot is coming
    if (totalHits === 0) {
      updates[`rooms/${roomId}/currentTurn`] = opponentId;
    }

    await update(ref(database), updates);

    if (totalHits > 0) {
      await checkForCounterAttack(roomId, playerId, opponentId, targetRow, targetCol, totalHits, false);
    }

    return { success: true, hitCount: totalHits, hitCells, awaitingFollowUp: totalHits > 0 };
  } catch (error) {
    console.error('Error using Precision Strike ability:', error);
    throw error;
  }
};

// Execute Precision Strike follow-up shot
export const executePrecisionStrikeFollowUp = async (roomId, playerId, followUpRow, followUpCol) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    const precisionState = room.players[playerId]?.precisionStrikeState;
    if (!precisionState?.awaitingFollowUp) {
      throw new Error('No precision strike follow-up available');
    }

    const originalHit = precisionState.originalHit;
    // Check if follow-up is adjacent
    const isAdjacent = Math.abs(followUpRow - originalHit.row) + Math.abs(followUpCol - originalHit.col) === 1;
    if (!isAdjacent) {
      throw new Error('Follow-up shot must be adjacent to original hit');
    }

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const opponentGrid = room.players[opponentId].PlacementData?.grid;

    const updates = {};
    let hitCount = 0;

    if (!opponentGrid[followUpRow][followUpCol].hit && !opponentGrid[followUpRow][followUpCol].miss) {
      const isHit = Boolean(opponentGrid[followUpRow][followUpCol].ship);
      if (isHit) {
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${followUpRow}/${followUpCol}/hit`] = true;
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${followUpRow}/${followUpCol}/attackLabel`] = getCoordinateLabel(followUpCol, followUpRow);
        hitCount++;
      } else {
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${followUpRow}/${followUpCol}/miss`] = true;
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${followUpRow}/${followUpCol}/attackLabel`] = getCoordinateLabel(followUpCol, followUpRow);
      }
    }

    // Clear precision strike state
    updates[`rooms/${roomId}/players/${playerId}/precisionStrikeState`] = null;
    
    // Switch turns
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'precisionFollowUp',
      playerId,
      targetRow: followUpRow,
      targetCol: followUpCol,
      hitCount,
      originalHit: originalHit,
      timestamp: Date.now()
    };

    await update(ref(database), updates);

    if (hitCount > 0) {
      await checkForCounterAttack(roomId, playerId, opponentId, followUpRow, followUpCol, hitCount, false);    }    
    return { success: true, hitCount };
  } catch (error) {
    console.error('Error using Precision Strike follow-up:', error);
    throw error;
  }
};

// Execute Barrage ability (multiple shots at selected targets)
export const executeBarrage = async (roomId, playerId, targets) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const opponentGrid = room.players[opponentId]?.PlacementData?.grid || {};
    const playerAbilities = room.players[playerId]?.abilities || {};

    if (!playerAbilities.BARRAGE?.active || playerAbilities.BARRAGE.used) {
      throw new Error('Barrage ability not available');
    }

    if (!targets || !Array.isArray(targets) || targets.length !== 5) {
      throw new Error('Barrage requires exactly 5 targets');
    }

    const updates = {};
    let hitCount = 0;
    const hitCells = [];

    // Attack all 5 targeted positions
    for (const target of targets) {
      const { row, col } = target;
      
      if (row < 0 || row >= 8 || col < 0 || col >= 8) continue;
      if (opponentGrid[row][col].hit || opponentGrid[row][col].miss) continue;
      
      const isHit = Boolean(opponentGrid[row][col].ship);
      if (isHit) {
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/hit`] = true;
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/attackLabel`] = getCoordinateLabel(col, row);
        hitCount++;
      } else {
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/miss`] = true;
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/attackLabel`] = getCoordinateLabel(col, row);
      }
      hitCells.push({ row, col, isHit });
    }

    // Clear barrage state
    updates[`rooms/${roomId}/players/${playerId}/barrageTargets`] = null;
    updates[`rooms/${roomId}/players/${playerId}/barrageStep`] = null;
    
    updates[`rooms/${roomId}/players/${playerId}/abilities/BARRAGE/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'BARRAGE',
      playerId,
      targets,
      hitCount,
      hitCells,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    if (hitCount > 0) {
      await checkForCounterAttack(roomId, playerId, opponentId, targets[0].row, targets[0].col, hitCount, false);
    }
    
    return { success: true, hitCount, hitCells };
  } catch (error) {
    console.error('Error using Barrage ability:', error);
    throw error;
  }
};

export const executeDepthCharge = async (roomId, playerId, targetRow, targetCol) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const opponentGrid = room.players[opponentId]?.PlacementData?.grid || {};
    const playerAbilities = room.players[playerId]?.abilities || {};

    if (!playerAbilities.DEPTH_CHARGE?.active || playerAbilities.DEPTH_CHARGE.used) {
      throw new Error('Depth Charge ability not available');
    }

    const updates = {};
    const targetCell = opponentGrid[targetRow][targetCol];
    
    if (targetCell.hit || targetCell.miss) {
      throw new Error('Cell already targeted');
    }

    const isInitialHit = Boolean(targetCell.ship);
    let hitCount = 0;
    const hitCells = [];

    // Hit the initial target
    if (isInitialHit) {
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/hit`] = true;
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/attackLabel`] = getCoordinateLabel(targetCol, targetRow);
      hitCount++;
      hitCells.push({ row: targetRow, col: targetCol });

      // If initial hit, attack adjacent squares in + pattern
      const adjacentSquares = [
        { row: targetRow - 1, col: targetCol }, // Up
        { row: targetRow + 1, col: targetCol }, // Down
        { row: targetRow, col: targetCol - 1 }, // Left
        { row: targetRow, col: targetCol + 1 }  // Right
      ];

      for (const adj of adjacentSquares) {
        if (adj.row >= 0 && adj.row < 8 && adj.col >= 0 && adj.col < 8) {
          const adjCell = opponentGrid[adj.row][adj.col];
          if (!adjCell.hit && !adjCell.miss) {
            const isAdjHit = Boolean(adjCell.ship);
            if (isAdjHit) {
              updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${adj.row}/${adj.col}/hit`] = true;
              updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${adj.row}/${adj.col}/attackLabel`] = getCoordinateLabel(adj.col, adj.row);
              hitCount++;
            } else {
              updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${adj.row}/${adj.col}/miss`] = true;
              updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${adj.row}/${adj.col}/attackLabel`] = getCoordinateLabel(adj.col, adj.row);
            }
            hitCells.push({ row: adj.row, col: adj.col });
          }
        }
      }
    } else {
      // Miss on initial target
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/miss`] = true;
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/attackLabel`] = getCoordinateLabel(targetCol, targetRow);
      hitCells.push({ row: targetRow, col: targetCol });
    }

    updates[`rooms/${roomId}/players/${playerId}/abilities/DEPTH_CHARGE/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'DEPTH_CHARGE',
      playerId,
      targetRow,
      targetCol,
      hitCount,
      hitCells,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    if (hitCount > 0) {
      await checkForCounterAttack(roomId, playerId, opponentId, targetRow, targetCol, hitCount, false);
    }
    
    return { success: true, hitCount, hitCells, initialHit: isInitialHit };
  } catch (error) {
    console.error('Error using Depth Charge ability:', error);
    throw error;
  }
};

export const executeEmpBlast = async (roomId, playerId, targetRow, targetCol) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const opponentGrid = room.players[opponentId]?.PlacementData?.grid || {};
    const playerAbilities = room.players[playerId]?.abilities || {};

    if (!playerAbilities.EMP_BLAST?.active || playerAbilities.EMP_BLAST.used) {
      throw new Error('EMP Blast ability not available');
    }

    // Validate 2x2 area
    if (targetRow + 1 >= 8 || targetCol + 1 >= 8) {
      throw new Error('Not enough space for 2x2 EMP blast');
    }

    const updates = {};
    let hitCount = 0;
    let shipsInArea = false;
    const hitCells = [];

    // Check 2x2 area
    for (let r = targetRow; r < targetRow + 2; r++) {
      for (let c = targetCol; c < targetCol + 2; c++) {
        const targetCell = opponentGrid[r][c];
        if (targetCell.ship) {
          shipsInArea = true;
        }
        
        if (!targetCell.hit && !targetCell.miss) {
          const isHit = Boolean(targetCell.ship);
          if (isHit) {
            updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${r}/${c}/hit`] = true;
            updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${r}/${c}/attackLabel`] = getCoordinateLabel(c, r);
            hitCount++;
          } else {
            updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${r}/${c}/miss`] = true;
            updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${r}/${c}/attackLabel`] = getCoordinateLabel(c, r);
          }
          hitCells.push({ row: r, col: c });
        }
      }
    }

    // If ships are in the area, disable opponent's support abilities for 2 turns
    if (shipsInArea) {
      updates[`rooms/${roomId}/players/${opponentId}/empDisabled`] = 2;
    }

    updates[`rooms/${roomId}/players/${playerId}/abilities/EMP_BLAST/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'EMP_BLAST',
      playerId,
      targetRow,
      targetCol,
      hitCount,
      hitCells,
      shipsInArea,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    if (hitCount > 0) {
      await checkForCounterAttack(roomId, playerId, opponentId, targetRow, targetCol, hitCount, false);
    }
    
    return { 
      success: true, 
      hitCount, 
      hitCells, 
      shipsInArea,
      message: shipsInArea ? 'EMP disabled opponent support abilities for 2 turns!' : 'EMP blast fired but no ships in area.'
    };
  } catch (error) {
    console.error('Error using EMP Blast ability:', error);
    throw error;
  }
};

export const executePinpointStrike = async (roomId, playerId, targetRow, targetCol) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room) throw new Error('Room not found');
    if (room.gameOver) throw new Error('Game is already over');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerAbilities = room.players[playerId]?.abilities || {};
    if (!playerAbilities.PINPOINT_STRIKE?.active || playerAbilities.PINPOINT_STRIKE.used) {
      throw new Error('Pinpoint Strike ability not available');
    }

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const opponentGrid = room.players[opponentId].PlacementData?.grid;

    // Check for JAM protection
    if (checkJamProtection(room, opponentId)) {
      const updates = {};      updates[`rooms/${roomId}/players/${opponentId}/abilities/JAM/used`] = true;
      updates[`rooms/${roomId}/players/${opponentId}/abilities/JAM/installed`] = false;
      updates[`rooms/${roomId}/players/${playerId}/abilities/PINPOINT_STRIKE/used`] = true;
      updates[`rooms/${roomId}/currentTurn`] = opponentId;
      await update(ref(database), updates);
      throw new Error('Your PINPOINT STRIKE was jammed by opponent!');
    }

    const updates = {};
    const targetCell = opponentGrid[targetRow][targetCol];
    
    if (targetCell.hit || targetCell.miss) {
      throw new Error('Cell already targeted');
    }

    const isHit = Boolean(targetCell.ship);
    if (isHit) {
      // Deal 2 damage instead of 1 by marking additional hit
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/hit`] = true;
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/pinpointHit`] = true; // Mark as double damage
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/attackLabel`] = getCoordinateLabel(targetCol, targetRow);
      
      // If the cell has a ship, mark it as taking double damage
      const shipId = targetCell.ship;
      if (shipId) {
        const currentHits = room.players[opponentId]?.ships?.[shipId]?.hits || 0;
        updates[`rooms/${roomId}/players/${opponentId}/ships/${shipId}/hits`] = currentHits + 2;
      }
    } else {
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/miss`] = true;
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/attackLabel`] = getCoordinateLabel(targetCol, targetRow);
    }

    updates[`rooms/${roomId}/players/${playerId}/abilities/PINPOINT_STRIKE/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'PINPOINT_STRIKE',
      playerId,
      targetRow,
      targetCol,
      isHit,
      doubleDamage: isHit,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    if (isHit) {
      await checkForCounterAttack(roomId, playerId, opponentId, targetRow, targetCol, 2, false);
    }
    
    return { 
      success: true, 
      isHit,
      doubleDamage: isHit,
      message: isHit ? 'Direct hit! Dealt 2 damage!' : 'Miss!'
    };
  } catch (error) {
    console.error('Error using Pinpoint Strike ability:', error);
    throw error;
  }
};

export const executeChainReaction = async (roomId, playerId, targetRow, targetCol) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const opponentGrid = room.players[opponentId]?.PlacementData?.grid || {};
    const playerAbilities = room.players[playerId]?.abilities || {};

    if (!playerAbilities.CHAIN_REACTION?.active || playerAbilities.CHAIN_REACTION.used) {
      throw new Error('Chain Reaction ability not available');
    }

    const updates = {};
    const targetCell = opponentGrid[targetRow][targetCol];
    
    if (targetCell.hit || targetCell.miss) {
      throw new Error('Cell already targeted');
    }

    const isHit = Boolean(targetCell.ship);
    let chainActivated = false;

    if (isHit) {
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/hit`] = true;
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/attackLabel`] = getCoordinateLabel(targetCol, targetRow);
      
      // Check if this hit destroys a ship segment completely
      const shipId = targetCell.ship;
      if (shipId) {
        const ships = room.players[opponentId]?.ships || {};
        const ship = ships[shipId];
        if (ship) {
          const newHits = (ship.hits || 0) + 1;
          updates[`rooms/${roomId}/players/${opponentId}/ships/${shipId}/hits`] = newHits;
          
          // If ship is completely destroyed, activate chain reaction
          if (newHits >= ship.size) {
            chainActivated = true;
            updates[`rooms/${roomId}/players/${playerId}/awaitingChainReaction`] = true;
            // Don't switch turns yet
          }
        }
      }
    } else {
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/miss`] = true;
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/attackLabel`] = getCoordinateLabel(targetCol, targetRow);
    }

    updates[`rooms/${roomId}/players/${playerId}/abilities/CHAIN_REACTION/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'CHAIN_REACTION',
      playerId,
      targetRow,
      targetCol,
      isHit,
      chainActivated,
      timestamp: Date.now()
    };

    // Only switch turns if chain reaction wasn't activated
    if (!chainActivated) {
      updates[`rooms/${roomId}/currentTurn`] = opponentId;
    }

    await update(ref(database), updates);
    
    if (isHit && !chainActivated) {
      await checkForCounterAttack(roomId, playerId, opponentId, targetRow, targetCol, 1, false);
    }
    
    return { 
      success: true, 
      isHit,
      chainActivated,
      message: isHit ? (chainActivated ? 'Ship destroyed! Chain reaction activated - free shot!' : 'Hit!') : 'Miss!'
    };
  } catch (error) {
    console.error('Error using Chain Reaction ability:', error);
    throw error;
  }
};

export const executeChainReactionShot = async (roomId, playerId, targetRow, targetCol) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (!room.players[playerId]?.awaitingChainReaction) throw new Error('No chain reaction shot pending');

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const opponentGrid = room.players[opponentId]?.PlacementData?.grid || {};

    const updates = {};
    const targetCell = opponentGrid[targetRow][targetCol];
    
    if (targetCell.hit || targetCell.miss) {
      throw new Error('Cell already targeted');
    }

    const isHit = Boolean(targetCell.ship);
    if (isHit) {
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/hit`] = true;
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/attackLabel`] = getCoordinateLabel(targetCol, targetRow);
    } else {
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/miss`] = true;
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/attackLabel`] = getCoordinateLabel(targetCol, targetRow);
    }

    // Clear chain reaction state
    updates[`rooms/${roomId}/players/${playerId}/awaitingChainReaction`] = null;
    
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'chain_reaction_shot',
      playerId,
      targetRow,
      targetCol,
      isHit,
      timestamp: Date.now()
    };
    
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    if (isHit) {
      await checkForCounterAttack(roomId, playerId, opponentId, targetRow, targetCol, 1, false);
    }
    
    return { success: true, isHit };
  } catch (error) {
    console.error('Error using Chain Reaction shot:', error);
    throw error;
  }
};

// Defense Ability Implementations
export const executeRepairCrew = async (roomId, playerId, targetRow, targetCol) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerGrid = room.players[playerId]?.PlacementData?.grid || {};
    const playerAbilities = room.players[playerId]?.abilities || {};

    if (!playerAbilities.REPAIR_CREW?.active || playerAbilities.REPAIR_CREW.used) {
      throw new Error('Repair Crew ability not available');
    }

    const targetCell = playerGrid[targetRow][targetCol];
    
    if (!targetCell.ship || !targetCell.hit) {
      throw new Error('Can only repair previously hit ship squares');
    }

    const updates = {};
    
    // Repair the cell (remove hit, but keep ship)
    updates[`rooms/${roomId}/players/${playerId}/PlacementData/grid/${targetRow}/${targetCol}/hit`] = false;
    updates[`rooms/${roomId}/players/${playerId}/PlacementData/grid/${targetRow}/${targetCol}/repaired`] = true;
    
    // Reduce ship hits count
    const shipId = targetCell.ship;
    if (shipId && room.players[playerId]?.ships?.[shipId]) {
      const currentHits = room.players[playerId].ships[shipId].hits || 0;
      updates[`rooms/${roomId}/players/${playerId}/ships/${shipId}/hits`] = Math.max(0, currentHits - 1);
    }

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    
    updates[`rooms/${roomId}/players/${playerId}/abilities/REPAIR_CREW/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'REPAIR_CREW',
      playerId,
      targetRow,
      targetCol,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      message: `Repaired ship at ${getCoordinateLabel(targetCol, targetRow)}!`
    };
  } catch (error) {
    console.error('Error using Repair Crew ability:', error);
    throw error;
  }
};

// Export alias for backward compatibility
export const activateRepairCrew = executeRepairCrew;

export const executeCloak = async (roomId, playerId, shipId) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerShips = room.players[playerId]?.ships || {};
    const playerAbilities = room.players[playerId]?.abilities || {};

    if (!playerAbilities.CLOAK?.active || playerAbilities.CLOAK.used) {
      throw new Error('Cloak ability not available');
    }

    if (!playerShips[shipId]) {
      throw new Error('Invalid ship selection for cloaking');
    }

    const opponentId = Object.keys(room.players).find(id => id !== playerId);

    const updates = {};
    
    // Activate cloak on the selected ship
    updates[`rooms/${roomId}/players/${playerId}/ships/${shipId}/cloaked`] = true;
    updates[`rooms/${roomId}/players/${playerId}/abilities/CLOAK/used`] = true;
    
    // Set a timer or turn counter for cloak duration (e.g., 2 turns)
    updates[`rooms/${roomId}/players/${playerId}/cloakEndTime`] = Date.now() + 2 * 60 * 1000; // 2 minutes from now

    updates[`rooms/${roomId}/players/${playerId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'CLOAK',
      playerId,
      shipId,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      message: `Cloaked your ship! It cannot be targeted for 2 turns.`
    };
  } catch (error) {
    console.error('Error using Cloak ability:', error);
    throw error;
  }
};

export const executeReinforce = async (roomId, playerId, targetRow, targetCol) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerGrid = room.players[playerId]?.PlacementData?.grid || {};
    const playerAbilities = room.players[playerId]?.abilities || {};    if (!playerAbilities.REINFORCE?.active || playerAbilities.REINFORCE.used) {
      throw new Error('Reinforce ability not available');
    }

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    if (!opponentId) throw new Error('Opponent not found');

    const targetCell = playerGrid[targetRow][targetCol];
    
    if (targetCell.hit || targetCell.miss) {
      throw new Error('Target cell already hit or missed');
    }

    const updates = {};
    
    // Reinforce the target cell
    updates[`rooms/${roomId}/players/${playerId}/PlacementData/grid/${targetRow}/${targetCol}/reinforced`] = true;
    updates[`rooms/${roomId}/players/${playerId}/abilities/REINFORCE/used`] = true;
    
    // Set a timer or turn counter for reinforcement duration (e.g., 1 turn)
    updates[`rooms/${roomId}/players/${playerId}/reinforceEndTime`] = Date.now() + 1 * 60 * 1000; // 1 minute from now

    updates[`rooms/${roomId}/players/${playerId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'REINFORCE',
      playerId,
      targetRow,
      targetCol,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      message: `Reinforced the target cell! It will absorb the next hit.`
    };
  } catch (error) {
    console.error('Error using Reinforce ability:', error);
    throw error;
  }
};

export const executeEvasiveManeuvers = async (roomId, playerId, shipId1, shipId2) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerShips = room.players[playerId]?.ships || {};
    const playerAbilities = room.players[playerId]?.abilities || {};

    if (!playerAbilities.EVASIVE_MANEUVERS?.active || playerAbilities.EVASIVE_MANEUVERS.used) {
      throw new Error('Evasive Maneuvers ability not available');
    }    if (!playerShips[shipId1] || !playerShips[shipId2]) {
      throw new Error('Invalid ship selection for evasive maneuvers');
    }

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    if (!opponentId) throw new Error('Opponent not found');

    // Ensure ships are adjacent
    const ship1 = playerShips[shipId1];
    const ship2 = playerShips[shipId2];
    const areAdjacent = (Math.abs(ship1.row - ship2.row) === 1 && ship1.col === ship2.col) ||
                        (Math.abs(ship1.col - ship2.col) === 1 && ship1.row === ship2.row);
    if (!areAdjacent) {
      throw new Error('Selected ships are not adjacent');
    }

    const updates = {};
    
    // Swap the positions of the two ships
    updates[`rooms/${roomId}/players/${playerId}/ships/${shipId1}/row`] = ship2.row;
    updates[`rooms/${roomId}/players/${playerId}/ships/${shipId1}/col`] = ship2.col;
    updates[`rooms/${roomId}/players/${playerId}/ships/${shipId2}/row`] = ship1.row;
    updates[`rooms/${roomId}/players/${playerId}/ships/${shipId2}/col`] = ship1.col;
    
    updates[`rooms/${roomId}/players/${playerId}/abilities/EVASIVE_MANEUVERS/used`] = true;
    updates[`rooms/${roomId}/players/${playerId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'EVASIVE_MANEUVERS',
      playerId,
      shipId1,
      shipId2,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      message: `Swapped the positions of your two ships!`
    };
  } catch (error) {
    console.error('Error using Evasive Maneuvers ability:', error);
    throw error;
  }
};

export const executeMinefield = async (roomId, playerId, targetRow, targetCol) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerAbilities = room.players[playerId]?.abilities || {};

    if (!playerAbilities.MINEFIELD?.active || playerAbilities.MINEFIELD.used) {
      throw new Error('Minefield ability not available');
    }

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    if (!opponentId) throw new Error('Opponent not found');

    const updates = {};
    
    // Place a 2x2 minefield at the target location
    for (let r = targetRow; r < targetRow + 2; r++) {
      for (let c = targetCol; c < targetCol + 2; c++) {
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
          updates[`rooms/${roomId}/players/${playerId}/PlacementData/grid/${r}/${c}/mine`] = true;
        }
      }
    }
    
    updates[`rooms/${roomId}/players/${playerId}/abilities/MINEFIELD/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'MINEFIELD',
      playerId,
      targetRow,
      targetCol,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      message: `Placed a minefield at ${getCoordinateLabel(targetCol, targetRow)}!`
    };
  } catch (error) {
    console.error('Error using Minefield ability:', error);
    throw error;
  }
};

export const executeEmergencyPatch = async (roomId, playerId, targetRow, targetCol) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerGrid = room.players[playerId]?.PlacementData?.grid || {};
    const playerAbilities = room.players[playerId]?.abilities || {};
    const recentMoves = getRecentMoves(room.moves || {}, 1);

    if (!playerAbilities.EMERGENCY_PATCH?.active || playerAbilities.EMERGENCY_PATCH.used) {
      throw new Error('Emergency Patch ability not available');
    }

    const targetCell = playerGrid[targetRow][targetCol];
    
    if (!targetCell.ship || !targetCell.hit) {
      throw new Error('Can only repair a square hit this turn');
    }

    // Check if the square was hit this turn
    const wasHitThisTurn = recentMoves.some(move => {
      return move.type === 'attack' && 
             move.playerId !== playerId && 
             move.hitCells && 
             move.hitCells.some(cell => cell.row === targetRow && cell.col === targetCol);
    });

    if (!wasHitThisTurn) {
      throw new Error('Emergency Patch can only repair a square hit this turn');
    }

    const updates = {};
    
    // Repair the cell
    updates[`rooms/${roomId}/players/${playerId}/PlacementData/grid/${targetRow}/${targetCol}/hit`] = false;
    updates[`rooms/${roomId}/players/${playerId}/PlacementData/grid/${targetRow}/${targetCol}/emergencyPatched`] = true;
    
    // Update ship hits count
    const shipId = targetCell.ship;
    if (shipId && room.players[playerId]?.ships?.[shipId]) {
      const currentHits = room.players[playerId].ships[shipId].hits || 0;
      updates[`rooms/${roomId}/players/${playerId}/ships/${shipId}/hits`] = Math.max(0, currentHits - 1);
    }

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    
    updates[`rooms/${roomId}/players/${playerId}/abilities/EMERGENCY_PATCH/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'EMERGENCY_PATCH',
      playerId,
      targetRow,
      targetCol,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      message: `Emergency Patched ship at ${getCoordinateLabel(targetCol, targetRow)}!`
    };
  } catch (error) {
    console.error('Error using Emergency Patch ability:', error);
    throw error;
  }
};

// Helper function to get recent moves
const getRecentMoves = (moves, count) => {  return Object.entries(moves || {})
    .sort((a, b) => b[0] - a[0]) // Sort by timestamp (descending)
    .map(entry => entry[1])
    .slice(0, count);
};

// Execute Smoke Screen ability (creates a 3x3 area invisible to scanner abilities)
export const executeSmokeScreen = async (roomId, playerId, targetRow, targetCol) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerAbilities = room.players[playerId]?.abilities || {};

    if (!playerAbilities.SMOKE_SCREEN?.active || playerAbilities.SMOKE_SCREEN.used) {
      throw new Error('Smoke Screen ability not available');
    }

    // Validate that we have space for 3x3 grid
    if (targetRow + 2 >= 8 || targetCol + 2 >= 8) {
      throw new Error('Not enough space for 3x3 smoke screen');
    }

    const updates = {};
    const smokeArea = [];
    
    // Mark 3x3 area as smoke screened
    for (let r = targetRow; r < targetRow + 3; r++) {
      for (let c = targetCol; c < targetCol + 3; c++) {
        updates[`rooms/${roomId}/players/${playerId}/PlacementData/grid/${r}/${c}/smokeScreen`] = true;
        smokeArea.push({ row: r, col: c });
      }
    }
    
    // Mark ability as used
    updates[`rooms/${roomId}/players/${playerId}/abilities/SMOKE_SCREEN/used`] = true;
    
    // Store smoke screen state
    updates[`rooms/${roomId}/players/${playerId}/smokeScreenActive`] = true;
    updates[`rooms/${roomId}/players/${playerId}/smokeScreenArea`] = smokeArea;
    updates[`rooms/${roomId}/players/${playerId}/smokeScreenDuration`] = 1; // Lasts for opponent's next turn

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    
    updates[`rooms/${roomId}/players/${playerId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'SMOKE_SCREEN',
      playerId,
      targetRow,
      targetCol,
      smokeArea,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      message: 'Smoke Screen deployed! 3x3 area will be invisible to Scanner/Hacker abilities next turn.'
    };
  } catch (error) {
    console.error('Error using Smoke Screen ability:', error);
    throw error;
  }
};

// Execute Defensive Net ability (reduces damage in a selected area for the next turn)
export const executeDefensiveNet = async (roomId, playerId, targetRow, targetCol, isVertical = false) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerAbilities = room.players[playerId]?.abilities || {};

    if (!playerAbilities.DEFENSIVE_NET?.active || playerAbilities.DEFENSIVE_NET.used) {
      throw new Error('Defensive Net ability not available');
    }

    // Validate space for the net pattern (1x3 or 3x1)
    if (isVertical) {
      if (targetRow + 2 >= 8) throw new Error('Not enough space for vertical defensive net');
    } else {
      if (targetCol + 2 >= 8) throw new Error('Not enough space for horizontal defensive net');
    }

    const updates = {};
    const protectedCells = [];
    
    // Mark area as protected by defensive net
    for (let i = 0; i < 3; i++) {
      const r = isVertical ? targetRow + i : targetRow;
      const c = isVertical ? targetCol : targetCol + i;
      
      updates[`rooms/${roomId}/players/${playerId}/PlacementData/grid/${r}/${c}/defensiveNet`] = true;
      protectedCells.push({ row: r, col: c });
    }
    
    // Store defensive net state
    updates[`rooms/${roomId}/players/${playerId}/defensiveNetActive`] = true;
    updates[`rooms/${roomId}/players/${playerId}/defensiveNetArea`] = protectedCells;
    updates[`rooms/${roomId}/players/${playerId}/defensiveNetDuration`] = 1; // Lasts for opponent's next turn

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    
    updates[`rooms/${roomId}/players/${playerId}/abilities/DEFENSIVE_NET/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'DEFENSIVE_NET',
      playerId,
      targetRow,
      targetCol,
      isVertical,
      protectedCells,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      message: `Defensive Net deployed! Damage in the ${isVertical ? 'vertical' : 'horizontal'} area will be halved next turn.`
    };
  } catch (error) {
    console.error('Error using Defensive Net ability:', error);
    throw error;
  }
};

// Execute Sonar Decoy ability (creates a decoy to trick enemy scanners)
export const executeSonarDecoy = async (roomId, playerId, targetRow, targetCol) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerGrid = room.players[playerId]?.PlacementData?.grid || {};
    const playerAbilities = room.players[playerId]?.abilities || {};

    if (!playerAbilities.SONAR_DECOY?.active || playerAbilities.SONAR_DECOY.used) {
      throw new Error('Sonar Decoy ability not available');
    }

    const targetCell = playerGrid[targetRow][targetCol];
    
    if (targetCell.ship) {
      throw new Error('Cannot place sonar decoy on a ship');
    }

    // Validate that we have space for potential 2x2 area that includes this point
    const hasSpace = (targetRow > 0 || targetCol > 0) || (targetRow < 7 || targetCol < 7);
    if (!hasSpace) {
      throw new Error('Need more space around the decoy for the ability to work');
    }

    const updates = {};
    
    // Place sonar decoy
    updates[`rooms/${roomId}/players/${playerId}/PlacementData/grid/${targetRow}/${targetCol}/sonarDecoy`] = true;
    
    // Store decoy state
    updates[`rooms/${roomId}/players/${playerId}/sonarDecoyActive`] = true;
    updates[`rooms/${roomId}/players/${playerId}/sonarDecoyPosition`] = { row: targetRow, col: targetCol };
    updates[`rooms/${roomId}/players/${playerId}/sonarDecoyDuration`] = 2; // Lasts for 2 turns

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    
    updates[`rooms/${roomId}/players/${playerId}/abilities/SONAR_DECOY/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'SONAR_DECOY',
      playerId,
      targetRow,
      targetCol,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      message: `Sonar Decoy deployed at ${getCoordinateLabel(targetCol, targetRow)}! Will show false positives to enemy scanners.`
    };
  } catch (error) {
    console.error('Error using Sonar Decoy ability:', error);
    throw error;
  }
};

// Execute Brace For Impact ability (reduces damage to a specific ship)
export const executeBraceForImpact = async (roomId, playerId, shipId) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerShips = room.players[playerId]?.ships || {};
    const playerAbilities = room.players[playerId]?.abilities || {};

    if (!playerAbilities.BRACE_FOR_IMPACT?.active || playerAbilities.BRACE_FOR_IMPACT.used) {
      throw new Error('Brace for Impact ability not available');
    }

    if (!playerShips[shipId]) {
      throw new Error('Invalid ship selected');
    }

    const updates = {};
    
    // Mark ship as braced for impact
    updates[`rooms/${roomId}/players/${playerId}/ships/${shipId}/braced`] = true;
    
    // Store brace state
    updates[`rooms/${roomId}/players/${playerId}/braceForImpactActive`] = true;
    updates[`rooms/${roomId}/players/${playerId}/bracedShipId`] = shipId;
    updates[`rooms/${roomId}/players/${playerId}/braceDuration`] = 1; // Lasts for opponent's next attack phase

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    
    updates[`rooms/${roomId}/players/${playerId}/abilities/BRACE_FOR_IMPACT/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'BRACE_FOR_IMPACT',
      playerId,
      shipId,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      message: `Ship ${shipId} is braced for impact! Will take 1 less damage from all attacks next turn.`
    };
  } catch (error) {
    console.error('Error using Brace for Impact ability:', error);
    throw error;
  }
};

// Execute Hacker ability (reveals one ship location)
export const executeHacker = async (roomId, playerId) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const opponentGrid = room.players[opponentId]?.PlacementData?.grid || {};
    const playerAbilities = room.players[playerId]?.abilities || {};

    // Check if opponent has EMP disabled support abilities
    if (room.players[opponentId]?.empDisabled > 0) {
      throw new Error('Enemy EMP has disabled your support abilities this turn');
    }

    if (!playerAbilities.HACKER?.active || playerAbilities.HACKER.used) {
      throw new Error('Hacker ability not available');
    }

    // Find all ship cells
    const shipCells = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = opponentGrid[r][c];
        if (cell && cell.ship && !cell.hit) {
          // Check if this is a cloaked ship
          const isCloaked = room.players[opponentId]?.ships?.[cell.ship]?.cloaked > 0;
          if (!isCloaked) {
            shipCells.push({ row: r, col: c, shipId: cell.ship });
          }
        }
      }
    }

    if (shipCells.length === 0) {
      throw new Error('No valid ship targets found');
    }

    // Pick random ship cell to reveal
    const randomIndex = Math.floor(Math.random() * shipCells.length);
    const targetCell = shipCells[randomIndex];

    const updates = {};
    updates[`rooms/${roomId}/players/${playerId}/abilities/HACKER/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'HACKER',
      playerId,
      revealedRow: targetCell.row,
      revealedCol: targetCell.col,
      shipId: targetCell.shipId,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      revealedRow: targetCell.row,
      revealedCol: targetCell.col,
      shipId: targetCell.shipId,
      message: `Hacker revealed enemy ship at ${getCoordinateLabel(targetCell.col, targetCell.row)}`
    };
  } catch (error) {
    console.error('Error using Hacker ability:', error);
    throw error;
  }
};

// Execute Scanner ability (scans 2x2 area for ship count)
export const executeScanner = async (roomId, playerId, targetRow, targetCol) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const opponentGrid = room.players[opponentId]?.PlacementData?.grid || {};
    const playerAbilities = room.players[playerId]?.abilities || {};

    // Check if opponent has EMP disabled support abilities
    if (room.players[opponentId]?.empDisabled > 0) {
      throw new Error('Enemy EMP has disabled your support abilities this turn');
    }

    if (!playerAbilities.SCANNER?.active || playerAbilities.SCANNER.used) {
      throw new Error('Scanner ability not available');
    }

    // Validate space for 2x2 area
    if (targetRow + 1 >= 8 || targetCol + 1 >= 8) {
      throw new Error('Not enough space for 2x2 scanner area');
    }

    // Count ship parts in 2x2 area
    let shipCount = 0;
    for (let r = targetRow; r < targetRow + 2; r++) {
      for (let c = targetCol; c < targetCol + 2; c++) {
        // Check for sonar decoy in area
        const cellHasSonarDecoy = checkForSonarDecoy(room, opponentId, r, c);
        if (cellHasSonarDecoy) {
          shipCount++; // False positive
          continue;
        }
        
        // Check for smoke screen in area
        const isSmokeScreened = checkForSmokeScreen(room, opponentId, r, c);
        if (isSmokeScreened) {
          continue; // Skip this cell
        }
        
        // Check for ships
        if (opponentGrid[r][c].ship) {
          shipCount++;
        }
      }
    }

    const updates = {};
    updates[`rooms/${roomId}/players/${playerId}/abilities/SCANNER/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'SCANNER',
      playerId,
      targetRow,
      targetCol,
      shipCount,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      shipCount,
      message: `Scanner found ${shipCount} ship parts in 2x2 area`
    };
  } catch (error) {
    console.error('Error using Scanner ability:', error);
    throw error;
  }
};

// Install Counter ability (defensive)
export const installCounter = async (roomId, playerId) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerAbilities = room.players[playerId]?.abilities || {};

    if (!playerAbilities.COUNTER?.active || playerAbilities.COUNTER.used) {
      throw new Error('Counter ability not available');
    }

    const opponentId = Object.keys(room.players).find(id => id !== playerId);

    const updates = {};
    updates[`rooms/${roomId}/players/${playerId}/abilities/COUNTER/installed`] = true;
    updates[`rooms/${roomId}/players/${playerId}/abilities/COUNTER/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'COUNTER',
      playerId,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      message: 'Counter defense installed! Will activate when you take damage.'
    };
  } catch (error) {
    console.error('Error installing Counter ability:', error);
    throw error;
  }
};

// Install JAM ability (defensive)
export const installJam = async (roomId, playerId) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerAbilities = room.players[playerId]?.abilities || {};

    if (!playerAbilities.JAM?.active || playerAbilities.JAM.used) {
      throw new Error('JAM ability not available');
    }

    const opponentId = Object.keys(room.players).find(id => id !== playerId);    const updates = {};
    updates[`rooms/${roomId}/players/${playerId}/abilities/JAM/installed`] = true;
    updates[`rooms/${roomId}/players/${playerId}/abilities/JAM/used`] = false; // Only mark as used when it actually blocks an attack
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'JAM',
      playerId,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      message: 'JAM defense installed! Will block the next enemy attack.'
    };
  } catch (error) {
    console.error('Error installing JAM ability:', error);
    throw error;
  }
};

// Execute Volley Fire ability (3x1 or 1x3 simultaneous attack)
export const executeVolleyFire = async (roomId, playerId, targetRow, targetCol, isVertical = false) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerAbilities = room.players[playerId]?.abilities || {};
    if (!playerAbilities.VOLLEY_FIRE?.active || playerAbilities.VOLLEY_FIRE.used) {
      throw new Error('Volley Fire ability not available');
    }

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const opponentGrid = room.players[opponentId].PlacementData?.grid;    // Check for JAM protection
    if (checkJamProtection(room, opponentId)) {
      const updates = {};
      updates[`rooms/${roomId}/players/${opponentId}/abilities/JAM/used`] = true;
      updates[`rooms/${roomId}/players/${opponentId}/abilities/JAM/installed`] = false;
      updates[`rooms/${roomId}/players/${playerId}/abilities/VOLLEY_FIRE/used`] = true;
      updates[`rooms/${roomId}/currentTurn`] = opponentId;
      await update(ref(database), updates);
      throw new Error('Your VOLLEY FIRE was jammed by opponent!');
    }

    const updates = {};
    const hitCells = [];
    let hitCount = 0;

    // Fire three shots in a line
    for (let i = 0; i < 3; i++) {
      const row = isVertical ? targetRow + i : targetRow;
      const col = isVertical ? targetCol : targetCol + i;

      if (row >= 8 || col >= 8 || row < 0 || col < 0) continue;
      if (opponentGrid[row][col].hit || opponentGrid[row][col].miss) continue;

      const isHit = Boolean(opponentGrid[row][col].ship);
      if (isHit) {
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/hit`] = true;
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/attackLabel`] = getCoordinateLabel(col, row);
        
        // Update ship hits
        const shipId = opponentGrid[row][col].ship;
        if (shipId) {
          const currentHits = room.players[opponentId]?.ships?.[shipId]?.hits || 0;
          updates[`rooms/${roomId}/players/${opponentId}/ships/${shipId}/hits`] = currentHits + 1;
        }
        hitCount++;
      } else {
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/miss`] = true;
        updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${row}/${col}/attackLabel`] = getCoordinateLabel(col, row);
      }
      hitCells.push({ row, col, isHit });
    }

    updates[`rooms/${roomId}/players/${playerId}/abilities/VOLLEY_FIRE/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'VOLLEY_FIRE',
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
    
    if (hitCount > 0) {
      await checkForCounterAttack(roomId, playerId, opponentId, targetRow, targetCol, hitCount, false);
    }
    
    return { success: true, hitCount, hitCells };
  } catch (error) {
    console.error('Error using Volley Fire ability:', error);
    throw error;
  }
};

// Execute Torpedo Run ability (scan entire row/column and get free shot)
export const executeTorpedoRun = async (roomId, playerId, isVertical = false, lineIndex = 0) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerAbilities = room.players[playerId]?.abilities || {};
    if (!playerAbilities.TORPEDO_RUN?.active || playerAbilities.TORPEDO_RUN.used) {
      throw new Error('Torpedo Run ability not available');
    }

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const opponentGrid = room.players[opponentId]?.PlacementData?.grid || {};

    // Scan entire row or column for ships
    let hasShip = false;
    const scannedCells = [];
    
    for (let i = 0; i < 8; i++) {
      const row = isVertical ? i : lineIndex;
      const col = isVertical ? lineIndex : i;
      
      scannedCells.push({ row, col });
      
      if (opponentGrid[row][col].ship) {
        // Check if this is a cloaked ship
        const isCloaked = room.players[opponentId]?.ships?.[opponentGrid[row][col].ship]?.cloaked > 0;
        if (!isCloaked) {
          hasShip = true;
        }
      }
    }

    const updates = {};
    updates[`rooms/${roomId}/players/${playerId}/abilities/TORPEDO_RUN/used`] = true;
    updates[`rooms/${roomId}/players/${playerId}/awaitingTorpedoShot`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'TORPEDO_RUN',
      playerId,
      isVertical,
      lineIndex,
      hasShip,
      scannedCells,
      timestamp: Date.now()
    };
    // Don't switch turns yet - waiting for free shot

    await update(ref(database), updates);
    
    return { 
      success: true,
      hasShip,
      awaitingFreeShot: true,
      message: `Torpedo Run scan: ${hasShip ? 'Ships detected!' : 'No ships found'} Select target for free shot.`
    };
  } catch (error) {
    console.error('Error using Torpedo Run ability:', error);
    throw error;
  }
};

// Execute Torpedo Run Shot (follow-up shot)
export const executeTorpedoRunShot = async (roomId, playerId, targetRow, targetCol) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (!room.players[playerId]?.awaitingTorpedoShot) throw new Error('No torpedo shot pending');

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const opponentGrid = room.players[opponentId]?.PlacementData?.grid || {};

    const targetCell = opponentGrid[targetRow][targetCol];
    
    if (targetCell.hit || targetCell.miss) {
      throw new Error('Cell already targeted');
    }

    const isHit = Boolean(targetCell.ship);
    const updates = {};

    if (isHit) {
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/hit`] = true;
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/attackLabel`] = getCoordinateLabel(targetCol, targetRow);
      
      // Update ship hits
      const shipId = targetCell.ship;
      if (shipId) {
        const currentHits = room.players[opponentId]?.ships?.[shipId]?.hits || 0;
        updates[`rooms/${roomId}/players/${opponentId}/ships/${shipId}/hits`] = currentHits + 1;
      }
    } else {
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/miss`] = true;
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/attackLabel`] = getCoordinateLabel(targetCol, targetRow);
    }

    // Clear torpedo shot state
    updates[`rooms/${roomId}/players/${playerId}/awaitingTorpedoShot`] = null;
    
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'torpedo_run_shot',
      playerId,
      targetRow,
      targetCol,
      isHit,
      timestamp: Date.now()
    };
    
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    if (isHit) {
      await checkForCounterAttack(roomId, playerId, opponentId, targetRow, targetCol, 1, false);
    }
    
    return { success: true, isHit };
  } catch (error) {
    console.error('Error using Torpedo Run shot:', error);
    throw error;
  }
};

// Execute Decoy Shot ability (if miss, get second shot)
export const executeDecoyShot = async (roomId, playerId, targetRow, targetCol) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerAbilities = room.players[playerId]?.abilities || {};
    if (!playerAbilities.DECOY_SHOT?.active || playerAbilities.DECOY_SHOT.used) {
      throw new Error('Decoy Shot ability not available');
    }

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const opponentGrid = room.players[opponentId].PlacementData?.grid;    // Check for JAM protection
    if (checkJamProtection(room, opponentId)) {
      const updates = {};
      updates[`rooms/${roomId}/players/${opponentId}/abilities/JAM/used`] = true;
      updates[`rooms/${roomId}/players/${opponentId}/abilities/JAM/installed`] = false;
      updates[`rooms/${roomId}/players/${playerId}/abilities/DECOY_SHOT/used`] = true;
      updates[`rooms/${roomId}/currentTurn`] = opponentId;
      await update(ref(database), updates);
      throw new Error('Your DECOY SHOT was jammed by opponent!');
    }

    const targetCell = opponentGrid[targetRow][targetCol];
    
    if (targetCell.hit || targetCell.miss) {
      throw new Error('Cell already targeted');
    }

    const isHit = Boolean(targetCell.ship);
    const updates = {};

    if (isHit) {
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/hit`] = true;
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/attackLabel`] = getCoordinateLabel(targetCol, targetRow);
      
      // Update ship hits
      const shipId = targetCell.ship;
      if (shipId) {
        const currentHits = room.players[opponentId]?.ships?.[shipId]?.hits || 0;
        updates[`rooms/${roomId}/players/${opponentId}/ships/${shipId}/hits`] = currentHits + 1;
      }
      
      // Hit - ability ends, switch turns
      updates[`rooms/${roomId}/currentTurn`] = opponentId;
    } else {
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/miss`] = true;
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/attackLabel`] = getCoordinateLabel(targetCol, targetRow);
      
      // Miss - get second shot
      updates[`rooms/${roomId}/players/${playerId}/awaitingDecoySecond`] = true;
      // Don't switch turns yet
    }

    updates[`rooms/${roomId}/players/${playerId}/abilities/DECOY_SHOT/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'DECOY_SHOT',
      playerId,
      targetRow,
      targetCol,
      isHit,
      awaitingSecondShot: !isHit,
      timestamp: Date.now()
    };

    await update(ref(database), updates);
    
    if (isHit) {
      await checkForCounterAttack(roomId, playerId, opponentId, targetRow, targetCol, 1, false);
    }
    
    return { 
      success: true, 
      isHit,
      awaitingSecondShot: !isHit,
      message: isHit ? 'Decoy Shot hit!' : 'Decoy Shot missed! Select target for second shot.'
    };
  } catch (error) {
    console.error('Error using Decoy Shot ability:', error);
    throw error;
  }
};

// Execute Decoy Shot Second (follow-up shot)
export const executeDecoyShotSecond = async (roomId, playerId, targetRow, targetCol) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (!room.players[playerId]?.awaitingDecoySecond) throw new Error('No decoy second shot pending');

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const opponentGrid = room.players[opponentId]?.PlacementData?.grid || {};

    const targetCell = opponentGrid[targetRow][targetCol];
    
    if (targetCell.hit || targetCell.miss) {
      throw new Error('Cell already targeted');
    }

    const isHit = Boolean(targetCell.ship);
    const updates = {};

    if (isHit) {
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/hit`] = true;
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/attackLabel`] = getCoordinateLabel(targetCol, targetRow);
    } else {
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/miss`] = true;
      updates[`rooms/${roomId}/players/${opponentId}/PlacementData/grid/${targetRow}/${targetCol}/attackLabel`] = getCoordinateLabel(targetCol, targetRow);
    }

    // Clear decoy second shot state
    updates[`rooms/${roomId}/players/${playerId}/awaitingDecoySecond`] = null;
    
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'decoy_shot_second',
      playerId,
      targetRow,
      targetCol,
      isHit,
      timestamp: Date.now()
    };
    
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    if (isHit) {
      await checkForCounterAttack(roomId, playerId, opponentId, targetRow, targetCol, 1, false);
    }
    
    return { success: true, isHit };
  } catch (error) {
    console.error('Error using Decoy Shot second shot:', error);
    throw error;
  }
};

// Execute functions for intelligence and reconnaissance abilities
export const executeSonarPulse = async (roomId, playerId, targetRow, targetCol) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerAbilities = room.players[playerId]?.abilities || {};
    if (!playerAbilities.sonarPulse?.active || playerAbilities.sonarPulse.used) {
      throw new Error('Sonar Pulse ability not available');
    }

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const opponentGrid = room.players[opponentId].PlacementData?.grid;

    // Sonar pulse reveals ships in a 5x5 area
    const sonarResults = [];
    for (let r = targetRow - 2; r <= targetRow + 2; r++) {
      for (let c = targetCol - 2; c <= targetCol + 2; c++) {
        if (r >= 0 && r < opponentGrid.length && c >= 0 && c < opponentGrid[0].length) {
          if (opponentGrid[r][c].ship) {
            sonarResults.push({ row: r, col: c });
          }
        }
      }
    }

    const updates = {};
    updates[`rooms/${roomId}/players/${playerId}/abilities/sonarPulse/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'SONAR_PULSE',
      playerId,
      targetRow,
      targetCol,
      shipsDetected: sonarResults.length,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      shipsDetected: sonarResults.length,
      message: `Sonar pulse detected ${sonarResults.length} ships in the area!`
    };
  } catch (error) {
    console.error('Error using Sonar Pulse ability:', error);
    throw error;
  }
};

export const executeIntelLeak = async (roomId, playerId) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerAbilities = room.players[playerId]?.abilities || {};
    if (!playerAbilities.intelLeak?.active || playerAbilities.intelLeak.used) {
      throw new Error('Intel Leak ability not available');
    }

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const opponentAbilities = room.players[opponentId]?.abilities || {};    // Reveal opponent's available abilities
    const activeAbilities = Object.entries(opponentAbilities)
      .filter(([, ability]) => ability.active && !ability.used)
      .map(([key]) => key);

    const updates = {};
    updates[`rooms/${roomId}/players/${playerId}/abilities/intelLeak/used`] = true;
    updates[`rooms/${roomId}/players/${playerId}/intelLeakResults`] = activeAbilities;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'INTEL_LEAK',
      playerId,
      revealedAbilities: activeAbilities,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      revealedAbilities: activeAbilities,
      message: `Intel leaked! Opponent has ${activeAbilities.length} unused abilities.`
    };
  } catch (error) {
    console.error('Error using Intel Leak ability:', error);
    throw error;
  }
};

export const executeSpotterPlane = async (roomId, playerId, targetRow, targetCol) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerAbilities = room.players[playerId]?.abilities || {};
    if (!playerAbilities.spotterPlane?.active || playerAbilities.spotterPlane.used) {
      throw new Error('Spotter Plane ability not available');
    }

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const opponentGrid = room.players[opponentId].PlacementData?.grid;

    // Spotter plane reveals a cross pattern
    const spottedCells = [];
    const directions = [
      [0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], // Center and 4 adjacent
      [-2, 0], [2, 0], [0, -2], [0, 2] // Extended cross
    ];

    for (const [dr, dc] of directions) {
      const r = targetRow + dr;
      const c = targetCol + dc;
      if (r >= 0 && r < opponentGrid.length && c >= 0 && c < opponentGrid[0].length) {
        spottedCells.push({
          row: r,
          col: c,
          hasShip: !!opponentGrid[r][c].ship,
          isHit: !!opponentGrid[r][c].hit
        });
      }
    }

    const updates = {};
    updates[`rooms/${roomId}/players/${playerId}/abilities/spotterPlane/used`] = true;
    updates[`rooms/${roomId}/players/${playerId}/spotterPlaneResults`] = spottedCells;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'SPOTTER_PLANE',
      playerId,
      targetRow,
      targetCol,
      spottedCells,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      spottedCells,
      message: `Spotter plane revealed ${spottedCells.length} cells!`
    };
  } catch (error) {
    console.error('Error using Spotter Plane ability:', error);
    throw error;
  }
};

export const executeReconnaissanceFlyby = async (roomId, playerId, startRow, startCol, endRow, endCol) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerAbilities = room.players[playerId]?.abilities || {};
    if (!playerAbilities.reconnaissanceFlyby?.active || playerAbilities.reconnaissanceFlyby.used) {
      throw new Error('Reconnaissance Flyby ability not available');
    }

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const opponentGrid = room.players[opponentId].PlacementData?.grid;

    // Create line between start and end points
    const reconCells = [];
    const dx = Math.abs(endCol - startCol);
    const dy = Math.abs(endRow - startRow);
    const sx = startCol < endCol ? 1 : -1;
    const sy = startRow < endRow ? 1 : -1;
    let err = dx - dy;
    let x = startCol;
    let y = startRow;

    while (true) {
      if (y >= 0 && y < opponentGrid.length && x >= 0 && x < opponentGrid[0].length) {
        reconCells.push({
          row: y,
          col: x,
          hasShip: !!opponentGrid[y][x].ship
        });
      }

      if (x === endCol && y === endRow) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }

    const updates = {};
    updates[`rooms/${roomId}/players/${playerId}/abilities/reconnaissanceFlyby/used`] = true;
    updates[`rooms/${roomId}/players/${playerId}/reconResults`] = reconCells;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'RECONNAISSANCE_FLYBY',
      playerId,
      startRow,
      startCol,
      endRow,
      endCol,
      reconCells,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      reconCells,
      message: `Reconnaissance flyby scanned ${reconCells.length} cells!`
    };
  } catch (error) {
    console.error('Error using Reconnaissance Flyby ability:', error);
    throw error;
  }
};

export const executeTargetAnalysis = async (roomId, playerId, targetRow, targetCol) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerAbilities = room.players[playerId]?.abilities || {};
    if (!playerAbilities.targetAnalysis?.active || playerAbilities.targetAnalysis.used) {
      throw new Error('Target Analysis ability not available');
    }

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const opponentGrid = room.players[opponentId].PlacementData?.grid;

    // Analyze target cell and adjacent cells
    const analysisResults = [];
    for (let r = targetRow - 1; r <= targetRow + 1; r++) {
      for (let c = targetCol - 1; c <= targetCol + 1; c++) {
        if (r >= 0 && r < opponentGrid.length && c >= 0 && c < opponentGrid[0].length) {
          const cell = opponentGrid[r][c];
          analysisResults.push({
            row: r,
            col: c,
            hasShip: !!cell.ship,
            shipType: cell.ship ? cell.shipType : null,
            damage: cell.hit ? 'damaged' : 'intact'
          });
        }
      }
    };

    const updates = {};
    updates[`rooms/${roomId}/players/${playerId}/abilities/targetAnalysis/used`] = true;
    updates[`rooms/${roomId}/players/${playerId}/analysisResults`] = analysisResults;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'TARGET_ANALYSIS',
      playerId,
      targetRow,
      targetCol,
      analysisResults,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      analysisResults,
      message: `Target analysis complete! Analyzed ${analysisResults.length} cells.`
    };
  } catch (error) {
    console.error('Error using Target Analysis ability:', error);
    throw error;
  }
};

export const executeWeatherForecast = async (roomId, playerId) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerAbilities = room.players[playerId]?.abilities || {};
    if (!playerAbilities.weatherForecast?.active || playerAbilities.weatherForecast.used) {
      throw new Error('Weather Forecast ability not available');
    }

    const opponentId = Object.keys(room.players).find(id => id !== playerId);

    // Weather forecast reveals next 3 moves that would be most effective
    const opponentGrid = room.players[opponentId].PlacementData?.grid;
    const recommendedTargets = [];
    
    // Find cells with ships that haven't been hit
    for (let r = 0; r < opponentGrid.length; r++) {
      for (let c = 0; c < opponentGrid[r].length; c++) {
        const cell = opponentGrid[r][c];
        if (cell.ship && !cell.hit && !cell.attacked) {
          recommendedTargets.push({
            row: r,
            col: c,
            priority: 'high'
          });
        }
      }
    }

    // Limit to top 3 recommendations
    const forecast = recommendedTargets.slice(0, 3);

    const updates = {};
    updates[`rooms/${roomId}/players/${playerId}/abilities/weatherForecast/used`] = true;
    updates[`rooms/${roomId}/players/${playerId}/weatherForecast`] = forecast;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'WEATHER_FORECAST',
      playerId,
      forecast,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      forecast,
      message: `Weather forecast reveals ${forecast.length} high-priority targets!`
    };
  } catch (error) {
    console.error('Error using Weather Forecast ability:', error);
    throw error;
  }
};

export const executeCommunicationsIntercept = async (roomId, playerId) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerAbilities = room.players[playerId]?.abilities || {};
    if (!playerAbilities.communicationsIntercept?.active || playerAbilities.communicationsIntercept.used) {
      throw new Error('Communications Intercept ability not available');
    }

    const opponentId = Object.keys(room.players).find(id => id !== playerId);

    // Intercept reveals opponent's last 3 moves and their ship placement strategy
    const recentMoves = getRecentMoves(room.moves, 3);
    const opponentShips = room.players[opponentId]?.ships || {};
    
    const interceptData = {
      recentMoves,
      shipCount: Object.keys(opponentShips).length,
      damagedShips: Object.values(opponentShips).filter(ship => ship.hits > 0).length
    };

    const updates = {};
    updates[`rooms/${roomId}/players/${playerId}/abilities/communicationsIntercept/used`] = true;
    updates[`rooms/${roomId}/players/${playerId}/interceptData`] = interceptData;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'COMMUNICATIONS_INTERCEPT',
      playerId,
      interceptData,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      interceptData,
      message: `Communications intercepted! Revealed opponent's recent strategy.`
    };
  } catch (error) {
    console.error('Error using Communications Intercept ability:', error);
    throw error;
  }
};

// Execute God's Hand ability (admin-only special ability)
export const executeGodsHand = async (roomId, targetPlayerId, quadrantIndex, isAdminTriggered = false) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    
    // If not admin triggered, check if it's the player's turn
    if (!isAdminTriggered && room.currentTurn !== targetPlayerId) {
      throw new Error('Not your turn');
    }

    const targetGrid = room.players[targetPlayerId]?.PlacementData?.grid;
    if (!targetGrid) throw new Error('Target player grid not found');

    // Define 4x4 quadrants (for 8x8 grid)
    const quadrants = [
      { startRow: 0, startCol: 0 }, // Top-left
      { startRow: 0, startCol: 4 }, // Top-right
      { startRow: 4, startCol: 0 }, // Bottom-left
      { startRow: 4, startCol: 4 }  // Bottom-right
    ];

    if (quadrantIndex < 0 || quadrantIndex >= quadrants.length) {
      throw new Error('Invalid quadrant index');
    }

    const quadrant = quadrants[quadrantIndex];
    const updates = {};
    const destroyedCells = [];
    let shipsDestroyed = 0;

    // Destroy all cells in the 4x4 quadrant
    for (let r = quadrant.startRow; r < quadrant.startRow + 4; r++) {
      for (let c = quadrant.startCol; c < quadrant.startCol + 4; c++) {
        const cell = targetGrid[r][c];
        
        // Mark cell as hit/destroyed
        updates[`rooms/${roomId}/players/${targetPlayerId}/PlacementData/grid/${r}/${c}/hit`] = true;
        updates[`rooms/${roomId}/players/${targetPlayerId}/PlacementData/grid/${r}/${c}/destroyed`] = true;
        updates[`rooms/${roomId}/players/${targetPlayerId}/PlacementData/grid/${r}/${c}/attackLabel`] = getCoordinateLabel(c, r);
        
        destroyedCells.push({ row: r, col: c, hadShip: !!cell.ship });
        
        // If cell had a ship, update ship damage
        if (cell.ship) {
          const shipId = cell.ship;
          const currentHits = room.players[targetPlayerId]?.ships?.[shipId]?.hits || 0;
          updates[`rooms/${roomId}/players/${targetPlayerId}/ships/${shipId}/hits`] = currentHits + 1;
          
          // Check if ship is completely destroyed
          const shipLength = room.players[targetPlayerId]?.ships?.[shipId]?.length || 1;
          if (currentHits + 1 >= shipLength) {
            updates[`rooms/${roomId}/players/${targetPlayerId}/ships/${shipId}/destroyed`] = true;
            shipsDestroyed++;
          }
        }
      }
    }

    // Record the God's Hand move
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'GODS_HAND',
      playerId: isAdminTriggered ? 'ADMIN' : targetPlayerId,
      targetPlayerId,
      quadrantIndex,
      destroyedCells,
      shipsDestroyed,
      isAdminTriggered,
      timestamp: Date.now()
    };

    // If not admin triggered, mark ability as used and switch turns
    if (!isAdminTriggered) {
      const opponentId = Object.keys(room.players).find(id => id !== targetPlayerId);
      updates[`rooms/${roomId}/players/${targetPlayerId}/abilities/GODS_HAND/used`] = true;
      updates[`rooms/${roomId}/currentTurn`] = opponentId;
    }

    // Check if game is over (all ships destroyed)
    const allShipsDestroyed = Object.values(room.players[targetPlayerId]?.ships || {})
      .every(ship => ship.destroyed || (ship.hits >= ship.length));
    
    if (allShipsDestroyed) {
      const winnerId = Object.keys(room.players).find(id => id !== targetPlayerId);
      updates[`rooms/${roomId}/gameOver`] = true;
      updates[`rooms/${roomId}/winner`] = winnerId;
      updates[`rooms/${roomId}/status`] = 'completed';
    }

    await update(ref(database), updates);
    
    return { 
      success: true,
      destroyedCells,
      shipsDestroyed,
      gameOver: allShipsDestroyed,
      message: `God's Hand destroyed quadrant ${quadrantIndex + 1}! ${destroyedCells.length} cells obliterated, ${shipsDestroyed} ships destroyed.`
    };
  } catch (error) {
    console.error("Error executing God's Hand ability:", error);
    throw error;
  }
};

// Execute Tactical Readout ability (reveals whether opponent used Attack, Defense, or Support ability last turn)
export const executeTacticalReadout = async (roomId, playerId) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerAbilities = room.players[playerId]?.abilities || {};
    if (!playerAbilities.TACTICAL_READOUT?.active || playerAbilities.TACTICAL_READOUT.used) {
      throw new Error('Tactical Readout ability not available');
    }

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    
    // Get the most recent move from opponent
    const recentMoves = getRecentMoves(room.moves || {}, 5);
    const lastOpponentMove = recentMoves.find(move => move.playerId === opponentId && move.type === 'ability');
    
    let readout = 'No recent ability detected';
    if (lastOpponentMove) {
      const abilityUsed = lastOpponentMove.name;
      const abilityInfo = ABILITIES[abilityUsed];
      if (abilityInfo) {
        readout = `Last ability type: ${abilityInfo.type.toUpperCase()}`;
      }
    }

    const updates = {};
    updates[`rooms/${roomId}/players/${playerId}/abilities/TACTICAL_READOUT/used`] = true;
    updates[`rooms/${roomId}/players/${playerId}/tacticalReadout`] = readout;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'TACTICAL_READOUT',
      playerId,
      readout,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      readout,
      message: `Tactical Readout: ${readout}`
    };
  } catch (error) {
    console.error('Error using Tactical Readout ability:', error);
    throw error;
  }
};

// Execute Jamming Signal ability (disables opponent's Scanner/Hacker abilities for next turn)
export const executeJammingSignal = async (roomId, playerId) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerAbilities = room.players[playerId]?.abilities || {};
    if (!playerAbilities.JAMMING_SIGNAL?.active || playerAbilities.JAMMING_SIGNAL.used) {
      throw new Error('Jamming Signal ability not available');
    }

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    
    const updates = {};
    
    // Disable opponent's support abilities for 1 turn
    updates[`rooms/${roomId}/players/${opponentId}/jammingDisabled`] = 1;
    
    updates[`rooms/${roomId}/players/${playerId}/abilities/JAMMING_SIGNAL/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'JAMMING_SIGNAL',
      playerId,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      message: 'Jamming Signal activated! Opponent Scanner/Hacker abilities disabled for next turn.'
    };
  } catch (error) {
    console.error('Error using Jamming Signal ability:', error);
    throw error;
  }
};

// Execute Opponent's Playbook ability (reveals the last offensive ability the opponent used)
export const executeOpponentsPlaybook = async (roomId, playerId) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerAbilities = room.players[playerId]?.abilities || {};
    if (!playerAbilities.OPPONENTS_PLAYBOOK?.active || playerAbilities.OPPONENTS_PLAYBOOK.used) {
      throw new Error('Opponent\'s Playbook ability not available');
    }

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    
    // Get the most recent offensive ability from opponent
    const recentMoves = getRecentMoves(room.moves || {}, 10);
    const lastOpponentAbility = recentMoves.find(move => 
      move.playerId === opponentId && 
      move.type === 'ability' && 
      ABILITIES[move.name]?.type === 'attack'
    );
    
    let playbookInfo = 'No recent offensive abilities detected';
    if (lastOpponentAbility) {
      const abilityName = ABILITIES[lastOpponentAbility.name]?.name || lastOpponentAbility.name;
      playbookInfo = `Last offensive ability: ${abilityName}`;
    }

    const updates = {};
    updates[`rooms/${roomId}/players/${playerId}/abilities/OPPONENTS_PLAYBOOK/used`] = true;
    updates[`rooms/${roomId}/players/${playerId}/playbookInfo`] = playbookInfo;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'OPPONENTS_PLAYBOOK',
      playerId,
      playbookInfo,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      playbookInfo,
      message: `Opponent's Playbook: ${playbookInfo}`
    };
  } catch (error) {
    console.error('Error using Opponent\'s Playbook ability:', error);
    throw error;
  }
};

// Helper functions for ability checks and effects
export const checkJamProtection = (room, playerId) => {
  const playerAbilities = room.players[playerId]?.abilities;
  return playerAbilities?.JAM?.installed === true;
};

export const checkForCounterAttack = async (roomId, attackerId, defenderId, targetRow, targetCol, hitCount, isCounterAttack = false) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();
    
    if (!room) return;

    const defender = room.players[defenderId];
    // Check if defender has counter ability installed (not just active)
    if (!defender || !defender.abilities?.COUNTER?.installed || isCounterAttack) {
      return;
    }

    // Counter attack logic - attack back at a random location on attacker's grid
    const attacker = room.players[attackerId];
    const attackerGrid = attacker.PlacementData?.grid;
    
    if (!attackerGrid) return;
    
    // Find available targets (not already hit or missed)
    const availableTargets = [];
    for (let row = 0; row < attackerGrid.length; row++) {
      for (let col = 0; col < attackerGrid[row].length; col++) {
        const cell = attackerGrid[row][col];
        if (!cell.hit && !cell.miss) {
          availableTargets.push({ row, col });
        }
      }
    }

    if (availableTargets.length > 0) {
      const randomTarget = availableTargets[Math.floor(Math.random() * availableTargets.length)];
      const targetCell = attackerGrid[randomTarget.row][randomTarget.col];
      
      const hit = Boolean(targetCell.ship);
      
      // Update attacker's grid
      const updates = {};
      if (hit) {
        updates[`rooms/${roomId}/players/${attackerId}/PlacementData/grid/${randomTarget.row}/${randomTarget.col}/hit`] = true;
        updates[`rooms/${roomId}/players/${attackerId}/PlacementData/grid/${randomTarget.row}/${randomTarget.col}/fromCounter`] = true;
        updates[`rooms/${roomId}/players/${attackerId}/PlacementData/grid/${randomTarget.row}/${randomTarget.col}/attackLabel`] = getCoordinateLabel(randomTarget.col, randomTarget.row);
        
        // Update ship hits if there's a ship
        const shipId = targetCell.ship;
        if (shipId) {
          const currentHits = attacker.ships?.[shipId]?.hits || 0;
          updates[`rooms/${roomId}/players/${attackerId}/ships/${shipId}/hits`] = currentHits + 1;
        }
      } else {
        updates[`rooms/${roomId}/players/${attackerId}/PlacementData/grid/${randomTarget.row}/${randomTarget.col}/miss`] = true;
        updates[`rooms/${roomId}/players/${attackerId}/PlacementData/grid/${randomTarget.row}/${randomTarget.col}/fromCounter`] = true;
        updates[`rooms/${roomId}/players/${attackerId}/PlacementData/grid/${randomTarget.row}/${randomTarget.col}/attackLabel`] = getCoordinateLabel(randomTarget.col, randomTarget.row);
      }
      
      // Mark counter as used after activation
      updates[`rooms/${roomId}/players/${defenderId}/abilities/COUNTER/installed`] = false;
      
      // Record counter attack move
      updates[`rooms/${roomId}/moves/${Date.now()}`] = {
        type: 'counter_attack',
        defenderId,
        attackerId,
        targetRow: randomTarget.row,
        targetCol: randomTarget.col,
        hit,
        timestamp: Date.now()
      };
      
      await update(ref(database), updates);
        console.log(`Counter attack: ${defender.name || 'Defender'} counter-attacked ${attacker.name || 'Attacker'} at ${getCoordinateLabel(randomTarget.col, randomTarget.row)} - ${hit ? 'HIT' : 'MISS'}`);
      
      return true; // Counter attack occurred
    }
    
    return false; // No counter attack occurred
  } catch (error) {
    console.error('Error in checkForCounterAttack:', error);
    return false;
  }
};

export const checkForSonarDecoy = (room, playerId, row, col) => {
  const playerAbilities = room.players[playerId].abilities;
  if (!playerAbilities.sonarDecoy || !playerAbilities.sonarDecoy.active) {
    return false;
  }
  
  // Check if this cell has a decoy placed
  const decoyPositions = playerAbilities.sonarDecoy.positions || [];
  return decoyPositions.some(pos => pos.row === row && pos.col === col);
};

export const checkForSmokeScreen = (room, playerId, row, col) => {
  const playerAbilities = room.players[playerId].abilities;
  if (!playerAbilities.smokeScreen || !playerAbilities.smokeScreen.active) {
    return false;
  }
    // Check if this cell is covered by smoke screen
  const smokePositions = playerAbilities.smokeScreen.positions || [];
  return smokePositions.some(pos => pos.row === row && pos.col === col);
};

// Export aliases for backward compatibility
export const activateNuke = executeNuke;
export const activateScanner = executeScanner;
export const activateHacker = executeHacker;
export const activateReinforcement = executeReinforce;
export const activateAnnihilate = executeAnnihilate;
export const activateSalvo = executeSalvo;
export const activatePrecisionStrike = executePrecisionStrike;
export const activatePrecisionStrikeFollowUp = executePrecisionStrikeFollowUp;
export const activateVolleyFire = executeVolleyFire;
export const activateTorpedoRun = executeTorpedoRun;
export const activateTorpedoRunShot = executeTorpedoRunShot;
export const activateDecoyShot = executeDecoyShot;
export const activateDecoyShotSecond = executeDecoyShotSecond;
export const activateBarrage = executeBarrage;
export const activateDepthCharge = executeDepthCharge;
export const activateEmpBlast = executeEmpBlast;
export const activatePinpointStrike = executePinpointStrike;
export const activateChainReaction = executeChainReaction;
export const activateChainReactionShot = executeChainReactionShot;
export const activateCloak = executeCloak;
export const activateReinforce = executeReinforce;
export const activateMinefield = executeMinefield;
export const activateSonarPulse = executeSonarPulse;
export const activateIntelLeak = executeIntelLeak;
export const activateSpotterPlane = executeSpotterPlane;
export const activateReconnaissanceFlyby = executeReconnaissanceFlyby;
export const activateTargetAnalysis = executeTargetAnalysis;
export const activateWeatherForecast = executeWeatherForecast;
export const activateCommunicationsIntercept = executeCommunicationsIntercept;

// Missing ability exports that have implementations
export const activateEvasiveManeuvers = executeEvasiveManeuvers;
export const activateEmergencyPatch = executeEmergencyPatch;
export const activateSmokeScreen = executeSmokeScreen;
export const activateDefensiveNet = executeDefensiveNet;
export const activateSonarDecoy = executeSonarDecoy;
export const activateBraceForImpact = executeBraceForImpact;

// Install-based abilities exports
export const activateCounter = installCounter;
export const activateJam = installJam;

// New ability exports
export const activateTacticalReadout = executeTacticalReadout;
export const activateJammingSignal = executeJammingSignal;
export const activateOpponentsPlaybook = executeOpponentsPlaybook;