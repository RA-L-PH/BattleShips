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
    const opponentGrid = room.players[opponentId].PlacementData?.grid;

    // Check if opponent has JAM protection
    if (checkJamProtection(room, opponentId)) {
      const updates = {};
      
      // Mark JAM as used after blocking this attack
      updates[`rooms/${roomId}/players/${opponentId}/abilities/JAM/used`] = true;
      
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
    if (checkJamProtection(room, opponentId)) {
      const updates = {};
      updates[`rooms/${roomId}/players/${opponentId}/abilities/JAM/used`] = true;
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
    if (checkJamProtection(room, opponentId)) {
      const updates = {};
      updates[`rooms/${roomId}/players/${opponentId}/abilities/JAM/used`] = true;
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
      await checkForCounterAttack(roomId, playerId, opponentId, followUpRow, followUpCol, hitCount, false);
    }    return { success: true, hitCount };
  } catch (error) {
    console.error('Error using Precision Strike follow-up:', error);
    throw error;
  }
};

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
      const updates = {};
      updates[`rooms/${roomId}/players/${opponentId}/abilities/JAM/used`] = true;
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
    const playerAbilities = room.players[playerId]?.abilities || {};

    if (!playerAbilities.REINFORCE?.active || playerAbilities.REINFORCE.used) {
      throw new Error('Reinforce ability not available');
    }

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
    }

    if (!playerShips[shipId1] || !playerShips[shipId2]) {
      throw new Error('Invalid ship selection for evasive maneuvers');
    }

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
const getRecentMoves = (moves, count) => {
  return Object.entries(moves || {})
    .sort((a, b) => b[0] - a[0]) // Sort by timestamp (descending)
    .map(([_, move]) => move)
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
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const playerGrid = room.players[playerId]?.PlacementData?.grid || {};
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

// Execute Sonar Pulse ability (scans a 3x3 area for ships)
export const executeSonarPulse = async (roomId, playerId, targetRow, targetCol) => {
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

    if (!playerAbilities.SONAR_PULSE?.active || playerAbilities.SONAR_PULSE.used) {
      throw new Error('Sonar Pulse ability not available');
    }

    // Validate space for 3x3 area
    if (targetRow + 2 >= 8 || targetCol + 2 >= 8) {
      throw new Error('Not enough space for 3x3 sonar pulse');
    }

    // Check for ships in 3x3 area
    let hasShip = false;
    for (let r = targetRow; r < targetRow + 3; r++) {
      for (let c = targetCol; c < targetCol + 3; c++) {
        // Skip if out of bounds
        if (r < 0 || r >= 8 || c < 0 || c >= 8) continue;
        
        // Check for sonar decoy in area
        const cellHasSonarDecoy = checkForSonarDecoy(room, opponentId, r, c);
        if (cellHasSonarDecoy) {
          hasShip = true; // False positive
          break;
        }
        
        // Check for smoke screen in area
        const isSmokeScreened = checkForSmokeScreen(room, opponentId, r, c);
        if (isSmokeScreened) {
          continue; // Skip this cell
        }
        
        // Check for ships
        if (opponentGrid[r][c].ship) {
          hasShip = true;
          break;
        }
      }
      if (hasShip) break;
    }

    const updates = {};
    updates[`rooms/${roomId}/players/${playerId}/abilities/SONAR_PULSE/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'SONAR_PULSE',
      playerId,
      targetRow,
      targetCol,
      hasShip,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      hasShip,
      message: hasShip ? 'Sonar Pulse detected ships in the area!' : 'Sonar Pulse found no ships in the area.'
    };
  } catch (error) {
    console.error('Error using Sonar Pulse ability:', error);
    throw error;
  }
};

// Helper function to check for sonar decoy effects
const checkForSonarDecoy = (room, playerId, row, col) => {
  // Check if player has active sonar decoy
  if (!room.players[playerId]?.sonarDecoyActive) return false;
  
  const decoyPos = room.players[playerId]?.sonarDecoyPosition;
  if (!decoyPos) return false;
  
  // Check if the cell is within a 2x2 area that includes the decoy
  const minRow = Math.max(0, decoyPos.row - 1);
  const minCol = Math.max(0, decoyPos.col - 1);
  const maxRow = Math.min(7, decoyPos.row + 1);
  const maxCol = Math.min(7, decoyPos.col + 1);
  
  return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
};

// Helper function to check for smoke screen effects
const checkForSmokeScreen = (room, playerId, row, col) => {
  // Check if player has active smoke screen
  if (!room.players[playerId]?.smokeScreenActive) return false;
  
  const smokeArea = room.players[playerId]?.smokeScreenArea || [];
  
  // Check if the cell is in the smoke screen area
  return smokeArea.some(cell => cell.row === row && cell.col === col);
};

// Helper function to check if opponent has JAM protection
export const checkJamProtection = (room, defenderId) => {
  // Check if the defender has JAM ability installed/active
  return room.players[defenderId]?.abilities?.JAM?.installed === true;
};

// Check for counter attack after a player's ship is hit
export const checkForCounterAttack = async (roomId, attackerId, defenderId, targetRow, targetCol, hitCount, isRegularAttack = true) => {
  try {
    if (hitCount <= 0) return; // No counter if no hits
    
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();
    
    if (!room || room.gameOver) return;
    
    // Check if defender has COUNTER ability
    const defenderAbilities = room.players[defenderId]?.abilities || {};
    if (!defenderAbilities.COUNTER?.installed) return;
    
    // Execute counter attack
    const attackerGrid = room.players[attackerId]?.PlacementData?.grid;
    if (!attackerGrid) return;
    
    // Find a random non-hit ship cell to counter-attack
    const viableCells = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = attackerGrid[r][c];
        if (cell.ship && !cell.hit) {
          viableCells.push({ row: r, col: c });
        }
      }
    }
    
    if (viableCells.length === 0) return; // No viable counter targets
    
    // Pick random target
    const randomIndex = Math.floor(Math.random() * viableCells.length);
    const counterTarget = viableCells[randomIndex];
    
    const updates = {};
    
    // Mark as hit
    updates[`rooms/${roomId}/players/${attackerId}/PlacementData/grid/${counterTarget.row}/${counterTarget.col}/hit`] = true;
    updates[`rooms/${roomId}/players/${attackerId}/PlacementData/grid/${counterTarget.row}/${counterTarget.col}/attackLabel`] = getCoordinateLabel(counterTarget.col, counterTarget.row);
    
    // Update ship hits
    const shipId = attackerGrid[counterTarget.row][counterTarget.col].ship;
    if (shipId) {
      const currentHits = room.players[attackerId]?.ships?.[shipId]?.hits || 0;
      updates[`rooms/${roomId}/players/${attackerId}/ships/${shipId}/hits`] = currentHits + 1;
    }
    
    // Mark counter as used
    updates[`rooms/${roomId}/players/${defenderId}/abilities/COUNTER/installed`] = false;
    updates[`rooms/${roomId}/players/${defenderId}/abilities/COUNTER/used`] = true;
    
    // Record counter attack
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'counterAttack',
      attackerId: defenderId, // Defender is now attacking back
      defenderId: attackerId, // Attacker is now being defended against
      targetRow: counterTarget.row,
      targetCol: counterTarget.col,
      triggeredBy: isRegularAttack ? 'attack' : 'ability',
      timestamp: Date.now()
    };
    
    await update(ref(database), updates);
    return true;
  } catch (error) {
    console.error('Error in counter attack:', error);
    return false;
  }
};

// Execute Intel Leak ability (reveals the orientation of a random enemy ship)
export const executeIntelLeak = async (roomId, playerId) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const opponentShips = room.players[opponentId]?.ships || {};
    const playerAbilities = room.players[playerId]?.abilities || {};

    // Check if opponent has EMP disabled support abilities
    if (room.players[opponentId]?.empDisabled > 0) {
      throw new Error('Enemy EMP has disabled your support abilities this turn');
    }

    if (!playerAbilities.INTEL_LEAK?.active || playerAbilities.INTEL_LEAK.used) {
      throw new Error('Intel Leak ability not available');
    }

    // Get all ships
    const ships = Object.entries(opponentShips);
    if (ships.length === 0) {
      throw new Error('No enemy ships found');
    }

    // Randomly select a ship
    const randomIndex = Math.floor(Math.random() * ships.length);
    const [shipId, shipData] = ships[randomIndex];
    
    const shipName = shipData.name || `Ship ${shipId}`;
    const orientation = shipData.orientation || 'unknown';

    const updates = {};
    updates[`rooms/${roomId}/players/${playerId}/abilities/INTEL_LEAK/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'INTEL_LEAK',
      playerId,
      shipId,
      shipName,
      orientation,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      shipId,
      shipName,
      orientation,
      message: `Intel Leak: Enemy ${shipName} is oriented ${orientation}`
    };
  } catch (error) {
    console.error('Error using Intel Leak ability:', error);
    throw error;
  }
};

// Execute Reconnaissance Flyby ability (counts unique ships in a line)
export const executeReconnaissanceFlyby = async (roomId, playerId, targetRow, targetCol, isVertical = false) => {
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

    if (!playerAbilities.RECONNAISSANCE_FLYBY?.active || playerAbilities.RECONNAISSANCE_FLYBY.used) {
      throw new Error('Reconnaissance Flyby ability not available');
    }

    // Track unique ships encountered in the flyby
    const uniqueShips = new Set();
    
    if (isVertical) {
      // Vertical 1x5 line
      if (targetRow + 4 >= 8) {
        throw new Error('Not enough space for vertical reconnaissance flyby');
      }
      
      for (let r = targetRow; r <= targetRow + 4; r++) {
        const cell = opponentGrid[r][targetCol];
        if (cell && cell.ship) {
          // Skip if this is a cloaked ship
          const isCloaked = room.players[opponentId]?.ships?.[cell.ship]?.cloaked > 0;
          if (!isCloaked) {
            uniqueShips.add(cell.ship);
          }
        }
      }
    } else {
      // Horizontal 5x1 line
      if (targetCol + 4 >= 8) {
        throw new Error('Not enough space for horizontal reconnaissance flyby');
      }
      
      for (let c = targetCol; c <= targetCol + 4; c++) {
        const cell = opponentGrid[targetRow][c];
        if (cell && cell.ship) {
          // Skip if this is a cloaked ship
          const isCloaked = room.players[opponentId]?.ships?.[cell.ship]?.cloaked > 0;
          if (!isCloaked) {
            uniqueShips.add(cell.ship);
          }
        }
      }
    }

    const uniqueShipCount = uniqueShips.size;

    const updates = {};
    updates[`rooms/${roomId}/players/${playerId}/abilities/RECONNAISSANCE_FLYBY/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'RECONNAISSANCE_FLYBY',
      playerId,
      targetRow,
      targetCol,
      isVertical,
      uniqueShipCount,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      uniqueShipCount,
      message: `Reconnaissance Flyby detected ${uniqueShipCount} unique ships in the ${isVertical ? 'vertical' : 'horizontal'} line.`
    };
  } catch (error) {
    console.error('Error using Reconnaissance Flyby ability:', error);
    throw error;
  }
};

// Execute Target Analysis ability (shows ship health information)
export const executeTargetAnalysis = async (roomId, playerId, targetRow, targetCol) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const opponentGrid = room.players[opponentId]?.PlacementData?.grid || {};
    const opponentShips = room.players[opponentId]?.ships || {};
    const playerAbilities = room.players[playerId]?.abilities || {};

    // Check if opponent has EMP disabled support abilities
    if (room.players[opponentId]?.empDisabled > 0) {
      throw new Error('Enemy EMP has disabled your support abilities this turn');
    }

    if (!playerAbilities.TARGET_ANALYSIS?.active || playerAbilities.TARGET_ANALYSIS.used) {
      throw new Error('Target Analysis ability not available');
    }

    // Check if the target cell was previously hit
    const targetCell = opponentGrid[targetRow][targetCol];
    if (!targetCell || !targetCell.hit || !targetCell.ship) {
      throw new Error('Can only analyze previously hit ship squares');
    }

    const shipId = targetCell.ship;
    const ship = opponentShips[shipId];
    
    if (!ship) {
      throw new Error('Ship information not found');
    }

    // Get ship health information
    const totalHealth = ship.size || 1;
    const currentHits = ship.hits || 0;
    const currentHealth = Math.max(0, totalHealth - currentHits);

    const updates = {};
    updates[`rooms/${roomId}/players/${playerId}/abilities/TARGET_ANALYSIS/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'TARGET_ANALYSIS',
      playerId,
      targetRow,
      targetCol,
      shipId,
      currentHealth,
      totalHealth,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      shipId,
      currentHealth,
      totalHealth,
      message: `Target Analysis: Ship has ${currentHealth}/${totalHealth} health remaining`
    };
  } catch (error) {
    console.error('Error using Target Analysis ability:', error);
    throw error;
  }
};

// Execute Weather Forecast ability (predicts if the next shot will hit)
export const executeWeatherForecast = async (roomId, playerId) => {
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

    if (!playerAbilities.WEATHER_FORECAST?.active || playerAbilities.WEATHER_FORECAST.used) {
      throw new Error('Weather Forecast ability not available');
    }

    // Find all non-hit, non-miss cells
    const availableCells = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = opponentGrid[r][c];
        if (cell && !cell.hit && !cell.miss) {
          availableCells.push({ row: r, col: c, hasShip: Boolean(cell.ship) });
        }
      }
    }

    if (availableCells.length === 0) {
      throw new Error('No valid targets available for prediction');
    }

    // Get a random cell and check if it will be a hit
    const randomIndex = Math.floor(Math.random() * availableCells.length);
    const targetCell = availableCells[randomIndex];
    const willHit = targetCell.hasShip;

    const updates = {};
    updates[`rooms/${roomId}/players/${playerId}/abilities/WEATHER_FORECAST/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'WEATHER_FORECAST',
      playerId,
      willHit,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      willHit,
      message: `Weather Forecast: Your next standard shot will ${willHit ? 'HIT' : 'MISS'}`
    };
  } catch (error) {
    console.error('Error using Weather Forecast ability:', error);
    throw error;
  }
};

// Execute Communications Intercept ability (reveals random ship information)
export const executeCommunicationsIntercept = async (roomId, playerId) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const opponentGrid = room.players[opponentId]?.PlacementData?.grid || {};
    const opponentShips = room.players[opponentId]?.ships || {};
    const playerAbilities = room.players[playerId]?.abilities || {};

    // Check if opponent has EMP disabled support abilities
    if (room.players[opponentId]?.empDisabled > 0) {
      throw new Error('Enemy EMP has disabled your support abilities this turn');
    }

    if (!playerAbilities.COMMUNICATIONS_INTERCEPT?.active || playerAbilities.COMMUNICATIONS_INTERCEPT.used) {
      throw new Error('Communications Intercept ability not available');
    }

    // Find all ships that haven't been hit
    const untouchedShips = [];
    for (const [shipId, ship] of Object.entries(opponentShips)) {
      if (!ship.hits || ship.hits === 0) {
        untouchedShips.push({ id: shipId, ...ship });
      }
    }

    let infoResult = "";
    let shipInfo = null;

    if (untouchedShips.length > 0) {
      // Choose randomly between ship length info or general vicinity
      const infoType = Math.random() < 0.5 ? 'length' : 'vicinity';
      const randomIndex = Math.floor(Math.random() * untouchedShips.length);
      const targetShip = untouchedShips[randomIndex];
      
      if (infoType === 'length') {
        // Reveal ship length
        infoResult = `Intercepted: Enemy ship of length ${targetShip.size} detected`;
        shipInfo = { id: targetShip.id, size: targetShip.size };
      } else {
        // Reveal general vicinity (quadrant)
        let quadrant = '';
        let foundLocation = false;
        
        // Find at least one cell of the ship
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const cell = opponentGrid[r][c];
            if (cell && cell.ship === targetShip.id) {
              // Determine quadrant (top-left, top-right, bottom-left, bottom-right)
              quadrant = r < 4 ? (c < 4 ? 'top-left' : 'top-right') : (c < 4 ? 'bottom-left' : 'bottom-right');
              foundLocation = true;
              break;
            }
          }
          if (foundLocation) break;
        }
        
        infoResult = `Intercepted: Untouched enemy ship detected in ${quadrant} quadrant`;
        shipInfo = { id: targetShip.id, quadrant };
      }
    } else {
      infoResult = "Intercepted: No undamaged ships found";
    }

    const updates = {};
    updates[`rooms/${roomId}/players/${playerId}/abilities/COMMUNICATIONS_INTERCEPT/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'COMMUNICATIONS_INTERCEPT',
      playerId,
      infoResult,
      shipInfo,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      infoResult,
      shipInfo
    };
  } catch (error) {
    console.error('Error using Communications Intercept ability:', error);
    throw error;
  }
};

// Execute Jamming Signal ability (disables enemy Scanner/Hacker abilities)
export const executeJammingSignal = async (roomId, playerId) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const playerAbilities = room.players[playerId]?.abilities || {};

    if (!playerAbilities.JAMMING_SIGNAL?.active || playerAbilities.JAMMING_SIGNAL.used) {
      throw new Error('Jamming Signal ability not available');
    }

    const updates = {};
    
    // Disable opponent's Scanner/Hacker abilities for next turn
    updates[`rooms/${roomId}/players/${opponentId}/jammingSignalActive`] = true;
    updates[`rooms/${roomId}/players/${opponentId}/jammingSignalDuration`] = 1; // Lasts for 1 turn
    
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
      message: 'Jamming Signal activated! Enemy Scanner/Hacker abilities disabled for their next turn.'
    };
  } catch (error) {
    console.error('Error using Jamming Signal ability:', error);
    throw error;
  }
};

// Execute Spotter Plane ability (checks for ships adjacent to a target square)
export const executeSpotterPlane = async (roomId, playerId, targetRow, targetCol) => {
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

    if (!playerAbilities.SPOTTER_PLANE?.active || playerAbilities.SPOTTER_PLANE.used) {
      throw new Error('Spotter Plane ability not available');
    }

    // Verify that the target square is empty
    const targetCell = opponentGrid[targetRow][targetCol];
    if (targetCell.ship) {
      throw new Error('Can only use Spotter Plane on empty squares');
    }

    let hasAdjacentShip = false;
    
    // Check adjacent squares (up, down, left, right)
    const adjacentSquares = [
      { row: targetRow - 1, col: targetCol }, // Up
      { row: targetRow + 1, col: targetCol }, // Down
      { row: targetRow, col: targetCol - 1 }, // Left
      { row: targetRow, col: targetCol + 1 }  // Right
    ];

    for (const adj of adjacentSquares) {
      if (adj.row >= 0 && adj.row < 8 && adj.col >= 0 && adj.col < 8) {
        const adjCell = opponentGrid[adj.row][adj.col];
        if (adjCell && adjCell.ship) {
          // Check if this is a cloaked ship
          const isCloaked = room.players[opponentId]?.ships?.[adjCell.ship]?.cloaked > 0;
          if (!isCloaked) {
            hasAdjacentShip = true;
            break;
          }
        }
      }
    }

    const updates = {};
    updates[`rooms/${roomId}/players/${playerId}/abilities/SPOTTER_PLANE/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'SPOTTER_PLANE',
      playerId,
      targetRow,
      targetCol,
      hasAdjacentShip,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      hasAdjacentShip,
      message: hasAdjacentShip ? 'Spotter Plane detected ships adjacent to target!' : 'Spotter Plane found no ships adjacent to target.'
    };
  } catch (error) {
    console.error('Error using Spotter Plane ability:', error);
    throw error;
  }
};

// Execute Tactical Readout ability (reveals the opponent's last ability type)
export const executeTacticalReadout = async (roomId, playerId) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const playerAbilities = room.players[playerId]?.abilities || {};

    // Check if opponent has EMP disabled support abilities
    if (room.players[opponentId]?.empDisabled > 0) {
      throw new Error('Enemy EMP has disabled your support abilities this turn');
    }

    if (!playerAbilities.TACTICAL_READOUT?.active || playerAbilities.TACTICAL_READOUT.used) {
      throw new Error('Tactical Readout ability not available');
    }

    // Get last opponent move
    const moves = room.moves || {};
    const lastOpponentMove = Object.entries(moves)
      .sort((a, b) => b[0] - a[0]) // Sort by timestamp (descending)
      .map(([_, move]) => move)
      .find(move => move.playerId === opponentId);

    let abilityType = 'unknown';
    if (lastOpponentMove) {
      if (lastOpponentMove.type === 'attack' || 
          (lastOpponentMove.type === 'ability' && 
           ABILITIES[lastOpponentMove.name]?.type === 'attack')) {
        abilityType = 'attack';
      } else if (lastOpponentMove.type === 'ability' && 
                ABILITIES[lastOpponentMove.name]?.type === 'defense') {
        abilityType = 'defense';
      } else if (lastOpponentMove.type === 'ability' && 
                ABILITIES[lastOpponentMove.name]?.type === 'support') {
        abilityType = 'support';
      }
    }

    const updates = {};
    updates[`rooms/${roomId}/players/${playerId}/abilities/TACTICAL_READOUT/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'TACTICAL_READOUT',
      playerId,
      abilityType,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      abilityType,
      message: `Tactical Readout: Opponent last used a ${abilityType} action`
    };
  } catch (error) {
    console.error('Error using Tactical Readout ability:', error);
    throw error;
  }
};

// Execute Opponent's Playbook ability (reveals the opponent's last offensive ability)
export const executeOpponentsPlaybook = async (roomId, playerId) => {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room || room.gameOver) throw new Error('Invalid room state');
    if (room.currentTurn !== playerId) throw new Error('Not your turn');

    const opponentId = Object.keys(room.players).find(id => id !== playerId);
    const playerAbilities = room.players[playerId]?.abilities || {};

    // Check if opponent has EMP disabled support abilities
    if (room.players[opponentId]?.empDisabled > 0) {
      throw new Error('Enemy EMP has disabled your support abilities this turn');
    }

    if (!playerAbilities.OPPONENTS_PLAYBOOK?.active || playerAbilities.OPPONENTS_PLAYBOOK.used) {
      throw new Error("Opponent's Playbook ability not available");
    }

    // Find last offensive ability used by opponent
    const moves = room.moves || {};
    const lastOffensiveMove = Object.entries(moves)
      .sort((a, b) => b[0] - a[0]) // Sort by timestamp (descending)
      .map(([_, move]) => move)
      .find(move => move.playerId === opponentId && 
                   move.type === 'ability' && 
                   ABILITIES[move.name]?.type === 'attack');

    let lastAbilityName = 'unknown';
    
    if (lastOffensiveMove && lastOffensiveMove.name) {
      lastAbilityName = ABILITIES[lastOffensiveMove.name]?.name || lastOffensiveMove.name;
    } else {
      lastAbilityName = 'No offensive ability used yet';
    }

    const updates = {};
    updates[`rooms/${roomId}/players/${playerId}/abilities/OPPONENTS_PLAYBOOK/used`] = true;
    updates[`rooms/${roomId}/moves/${Date.now()}`] = {
      type: 'ability',
      name: 'OPPONENTS_PLAYBOOK',
      playerId,
      lastAbilityName,
      timestamp: Date.now()
    };
    updates[`rooms/${roomId}/currentTurn`] = opponentId;

    await update(ref(database), updates);
    
    return { 
      success: true,
      lastAbilityName,
      message: `Opponent's Playbook: Last offensive ability used was ${lastAbilityName}`
    };
  } catch (error) {
    console.error("Error using Opponent's Playbook ability:", error);
    throw error;
  }
};