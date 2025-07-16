import { GoogleGenerativeAI } from '@google/generative-ai';
import { ref, get, update, onValue, increment } from 'firebase/database';
import { database } from './firebaseConfig';
import { makeMove, getShipConfiguration } from './gameService';
import { executeNuke, executeScanner, executeAnnihilate, executeHacker, installCounter, installJam, grantAbility } from './abilityService';

// Initialize Gemini AI (API key should be in environment variable)
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

/**
 * Gemini AI Player for Battleship Game
 * Implements intelligent strategy for 8x8 grid gameplay
 */
export class GeminiAiPlayer {
  constructor(roomId, aiPlayerId, difficulty = 'easy') {
    this.roomId = roomId;
    this.aiPlayerId = aiPlayerId;
    this.difficulty = difficulty; // Store difficulty level
    this.model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    this.turnStartTime = null;
    this.moveHistory = [];
    
    console.log(`🤖 AI Player initialized with difficulty: ${difficulty}`);
    
    this.gameMemory = {
      myMoves: [],
      opponentMoves: [],
      detectedShips: new Map(),
      probableShipLocations: [],
      gamePhase: 'hunting', // hunting, targeting, endgame
      strategicInsights: []
    };
    this.probabilityMap = this.initializeProbabilityMap(); // Will be updated with correct size later
    this.huntMode = false;
    this.huntTarget = null;
    this.huntDirection = null;
    this.lastHit = null;
    
    // Difficulty-based configurations
    this.difficultyConfig = this.getDifficultyConfig(difficulty);
    console.log('🎯 AI Difficulty configuration:', this.difficultyConfig);
  }

  /**
   * Get AI configuration based on difficulty level
   */
  getDifficultyConfig(difficulty) {
    const configs = {
      easy: {
        useAdvancedStrategy: false,
        abilityUsageRate: 0.3, // 30% chance to use abilities
        makeMistakes: true,
        mistakeRate: 0.25, // 25% chance to make suboptimal moves
        responseDelay: { min: 2000, max: 4000 }, // 2-4 second delay
        huntingAccuracy: 0.6, // 60% accuracy in targeting around hits
        shipPlacementStrategy: 'basic', // Simple placement patterns
        useProbabilityMap: false // Basic targeting only
      },
      medium: {
        useAdvancedStrategy: true,
        abilityUsageRate: 0.5, // 50% chance to use abilities
        makeMistakes: true,
        mistakeRate: 0.1, // 10% chance to make suboptimal moves
        responseDelay: { min: 1500, max: 3000 }, // 1.5-3 second delay
        huntingAccuracy: 0.8, // 80% accuracy in targeting
        shipPlacementStrategy: 'strategic', // Better placement patterns
        useProbabilityMap: true // Use probability calculations
      },
      hard: {
        useAdvancedStrategy: true,
        abilityUsageRate: 0.8, // 80% chance to use abilities when optimal
        makeMistakes: false,
        mistakeRate: 0.02, // 2% chance for minor mistakes (human-like)
        responseDelay: { min: 1000, max: 2000 }, // 1-2 second delay
        huntingAccuracy: 0.95, // 95% accuracy in targeting
        shipPlacementStrategy: 'optimal', // Advanced placement patterns
        useProbabilityMap: true // Advanced probability calculations
      }
    };
    
    return configs[difficulty] || configs.easy;
  }

  /**
   * Initialize probability map for ship placement prediction
   */
  initializeProbabilityMap(gridSize = 8) {
    const map = Array(gridSize).fill().map(() => Array(gridSize).fill(1));
    
    // Center squares have higher initial probability
    const centerStart = Math.floor(gridSize / 4);
    const centerEnd = Math.floor(3 * gridSize / 4);
    
    for (let r = centerStart; r < centerEnd; r++) {
      for (let c = centerStart; c < centerEnd; c++) {
        map[r][c] = 2;
      }
    }
    
    return map;
  }

  /**
   * Phase 1: AI Ship Placement (Pre-game Logic)
   */
  async placeShipsOptimally() {
    try {
      const roomRef = ref(database, `rooms/${this.roomId}`);
      const snapshot = await get(roomRef);
      const room = snapshot.val();
      
      if (!room) throw new Error('Room not found');
      
      // Get the grid size and ship configuration from room settings
      const gridSize = room.settings?.gridSize || 8;
      const ships = getShipConfiguration(room.settings);

      const grid = Array(gridSize).fill().map(() => Array(gridSize).fill(null));
      const placedShips = new Map();
      
      // AI placement strategy for dynamic grid size
      const placements = this.generateOptimalPlacements(ships, gridSize);
      
      placements.forEach((placement, shipId) => {
        const ship = ships.find(s => s.id === shipId);
        placedShips.set(shipId, placement);
        
        // Mark grid cells
        for (let i = 0; i < ship.size; i++) {
          const x = placement.vertical ? placement.x : placement.x + i;
          const y = placement.vertical ? placement.y + i : placement.y;
          grid[y][x] = { ship: shipId, hit: false, miss: false };
        }
      });

      const shipPlacements = {};
      placedShips.forEach((position, shipId) => {
        const ship = ships.find(s => s.id === shipId);
        shipPlacements[shipId] = {
          name: ship.name,
          startPosition: { x: position.x, y: position.y },
          orientation: position.vertical ? 'vertical' : 'horizontal',
          size: ship.size
        };
      });

      const placementData = {
        grid: grid,
        ships: shipPlacements,
        lastUpdated: Date.now()
      };

      // Update Firebase with AI placement
      await update(ref(database), {
        [`rooms/${this.roomId}/players/${this.aiPlayerId}/PlacementData`]: placementData,
        [`rooms/${this.roomId}/players/${this.aiPlayerId}/ready`]: true,
        [`rooms/${this.roomId}/players/${this.aiPlayerId}/name`]: 'Gemini AI'
      });

      console.log('AI ship placement completed:', {
        roomId: this.roomId,
        aiPlayerId: this.aiPlayerId,
        ready: true
      });

      return true;
    } catch (error) {
      console.error('Error placing AI ships:', error);
      return false;
    }
  }

  /**
   * Generate optimal ship placements for dynamic grid size with difficulty-based strategy
   */
  generateOptimalPlacements(ships, gridSize = 8) {
    const placements = new Map();
    const occupiedCells = new Set();
    
    console.log(`🎯 Generating ${this.difficultyConfig.shipPlacementStrategy} ship placements for ${gridSize}x${gridSize} grid`);
    
    // Generate positioning strategy based on difficulty
    let preferredPositions = [];
    
    const lastIndex = gridSize - 1;
    const midPoint = Math.floor(gridSize / 2);
    
    switch (this.difficultyConfig.shipPlacementStrategy) {
      case 'basic':
        // Easy: Simple edge-focused placement (easier to find)
        preferredPositions = [
          { x: 0, y: 0, vertical: false },         // Top-left horizontal
          { x: 0, y: lastIndex, vertical: false }, // Bottom-left horizontal
          { x: lastIndex, y: 0, vertical: false }, // Top-right horizontal
          { x: lastIndex, y: lastIndex, vertical: false }, // Bottom-right horizontal
          { x: 0, y: midPoint, vertical: true },   // Left edge vertical
          { x: lastIndex, y: midPoint, vertical: true }, // Right edge vertical
          { x: midPoint, y: 0, vertical: false },  // Top edge horizontal
          { x: midPoint, y: lastIndex, vertical: false } // Bottom edge horizontal
        ];
        break;
        
      case 'strategic':
        // Medium: Mixed placement with some clustering
        preferredPositions = [
          { x: 1, y: 1, vertical: false },         // Near corner but not edge
          { x: lastIndex-1, y: lastIndex-1, vertical: true }, // Near corner vertical
          { x: midPoint, y: 1, vertical: true },   // Center-ish vertical
          { x: 1, y: midPoint, vertical: false },  // Center-ish horizontal
          { x: 0, y: 0, vertical: false },         // Some edge placement
          { x: lastIndex, y: lastIndex, vertical: true },
          { x: Math.floor(gridSize/3), y: Math.floor(gridSize/3), vertical: false },
          { x: Math.floor(2*gridSize/3), y: Math.floor(2*gridSize/3), vertical: true }
        ];
        break;
        
      case 'optimal':
        // Hard: Strategic placement avoiding patterns, mixed orientations
        preferredPositions = [
          { x: Math.floor(gridSize/3), y: Math.floor(gridSize/4), vertical: true },
          { x: Math.floor(2*gridSize/3), y: Math.floor(3*gridSize/4), vertical: false },
          { x: 1, y: Math.floor(2*gridSize/3), vertical: false },
          { x: Math.floor(3*gridSize/4), y: 1, vertical: true },
          { x: Math.floor(gridSize/4), y: Math.floor(3*gridSize/4), vertical: false },
          { x: Math.floor(2*gridSize/3), y: Math.floor(gridSize/4), vertical: true },
          { x: Math.floor(gridSize/2), y: Math.floor(gridSize/6), vertical: false },
          { x: Math.floor(gridSize/6), y: Math.floor(gridSize/2), vertical: true }
        ];
        break;
        
      default:
        // Default to basic edge placement
        preferredPositions = [
          { x: 0, y: 0, vertical: false },
          { x: lastIndex, y: lastIndex, vertical: true },
          { x: 0, y: lastIndex, vertical: false },
          { x: lastIndex, y: 0, vertical: true }
        ];
    }
    
    ships.forEach(ship => {
      let placed = false;
      let attempts = 0;
      
      while (!placed && attempts < 100) {
        let position;
        
        if (attempts < preferredPositions.length) {
          position = preferredPositions[attempts];
        } else {
          // Random placement based on difficulty preferences
          if (this.difficultyConfig.shipPlacementStrategy === 'basic') {
            // Easy: Favor edges and simple positions
            const edge = Math.floor(Math.random() * 4);
            switch (edge) {
              case 0: // Top edge
                position = { x: Math.floor(Math.random() * gridSize), y: 0, vertical: Math.random() < 0.3 };
                break;
              case 1: // Right edge
                position = { x: lastIndex, y: Math.floor(Math.random() * gridSize), vertical: Math.random() < 0.7 };
                break;
              case 2: // Bottom edge
                position = { x: Math.floor(Math.random() * gridSize), y: lastIndex, vertical: Math.random() < 0.3 };
                break;
              default: // Left edge
                position = { x: 0, y: Math.floor(Math.random() * gridSize), vertical: Math.random() < 0.7 };
            }
          } else {
            // Medium/Hard: More random but avoid obvious patterns
            position = {
              x: Math.floor(Math.random() * gridSize),
              y: Math.floor(Math.random() * gridSize),
              vertical: Math.random() < 0.5
            };
          }
        }
        
        if (this.isValidPlacement(ship, position, occupiedCells, gridSize)) {
          placements.set(ship.id, position);
          this.markOccupiedCells(ship, position, occupiedCells, gridSize);
          placed = true;
          console.log(`✅ Placed ${ship.name} at [${position.x}, ${position.y}] ${position.vertical ? 'vertically' : 'horizontally'}`);
        }
        
        attempts++;
      }
      
      if (!placed) {
        console.warn(`⚠️ Could not place ship ${ship.id} optimally, using fallback`);
        this.placeShipFallback(ship, placements, occupiedCells, gridSize);
      }
    });
    
    return placements;
  }

  /**
   * Check if ship placement is valid
   */
  isValidPlacement(ship, position, occupiedCells, gridSize = 8) {
    const { x, y, vertical } = position;
    
    // Check bounds
    if (vertical && y + ship.size > gridSize) return false;
    if (!vertical && x + ship.size > gridSize) return false;
    if (x < 0 || y < 0) return false;
    
    // Check for overlaps with buffer zone
    for (let i = 0; i < ship.size; i++) {
      const checkX = vertical ? x : x + i;
      const checkY = vertical ? y + i : y;
      
      // Check the cell and surrounding cells (no touching rule)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = checkX + dx;
          const ny = checkY + dy;
          if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
            if (occupiedCells.has(`${nx},${ny}`)) {
              return false;
            }
          }
        }
      }
    }
    
    return true;
  }

  /**
   * Mark cells as occupied including buffer zones
   */
  markOccupiedCells(ship, position, occupiedCells, gridSize = 8) {
    const { x, y, vertical } = position;
    
    for (let i = 0; i < ship.size; i++) {
      const checkX = vertical ? x : x + i;
      const checkY = vertical ? y + i : y;
      
      // Mark the cell and surrounding buffer
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = checkX + dx;
          const ny = checkY + dy;
          if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
            occupiedCells.add(`${nx},${ny}`);
          }
        }
      }
    }
  }

  /**
   * Fallback placement for ships that couldn't be placed optimally
   */
  placeShipFallback(ship, placements, occupiedCells, gridSize = 8) {
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        for (const vertical of [false, true]) {
          const position = { x, y, vertical };
          if (this.isValidPlacement(ship, position, occupiedCells, gridSize)) {
            placements.set(ship.id, position);
            this.markOccupiedCells(ship, position, occupiedCells, gridSize);
            return;
          }
        }
      }
    }
  }

  /**
   * Phase 2: AI Turn Logic - Main decision making with difficulty-based behavior
   */
  async makeAiMove() {
    try {
      console.log(`🤖 AI makeAiMove() starting with ${this.difficulty} difficulty...`);
      this.turnStartTime = Date.now();
      
      // Add difficulty-based thinking delay for more human-like behavior
      const delay = Math.random() * (this.difficultyConfig.responseDelay.max - this.difficultyConfig.responseDelay.min) + this.difficultyConfig.responseDelay.min;
      console.log(`⏱️ AI thinking for ${Math.round(delay)}ms (${this.difficulty} difficulty)...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Compile game state
      console.log('📊 Compiling game state...');
      const gameState = await this.compileGameState();
      console.log('📊 Game state compiled:', {
        boardSize: `${gameState.current_opponent_board_view.length}x${gameState.current_opponent_board_view[0].length}`,
        opponentShipsRemaining: gameState.opponent_ships_remaining,
        availableAbilities: gameState.my_available_abilities,
        turnNumber: gameState.turn_number,
        difficulty: this.difficulty
      });
      
      // Get decision based on difficulty level
      console.log('🧠 Getting AI decision...');
      let decision;
      
      // Check if we should make a strategic mistake (difficulty-based)
      const shouldMakeMistake = this.difficultyConfig.makeMistakes && Math.random() < this.difficultyConfig.mistakeRate;
      
      if (shouldMakeMistake && this.difficulty === 'easy') {
        console.log(`🎭 Making intentional mistake for ${this.difficulty} difficulty`);
        decision = await this.makeDeliberateMistake(gameState);
      } else if (this.difficultyConfig.useAdvancedStrategy) {
        // Use optimized AI for medium/hard
        decision = await this.getOptimizedDecision(gameState);
      } else {
        // Use basic decision for easy difficulty
        decision = await this.getBasicDecision(gameState);
      }
      
      console.log('🧠 AI decision made:', decision);
      
      // Execute the decision
      console.log('⚡ Executing decision...');
      const result = await this.executeDecision(decision);
      console.log('✅ Decision executed successfully:', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Error in AI move:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        roomId: this.roomId,
        aiPlayerId: this.aiPlayerId,
        difficulty: this.difficulty
      });
      
      // Fallback to basic move
      console.log('🔄 Attempting fallback move...');
      return await this.makeFallbackMove();
    }
  }

  /**
   * Make a deliberate mistake for easier difficulties
   */
  async makeDeliberateMistake(gameState) {
    console.log('🎭 Generating mistake-prone decision...');
    
    const board = gameState.current_opponent_board_view;
    const availableCells = [];
    
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        if (board[row][col] === 'UNKNOWN') {
          availableCells.push([row, col]);
        }
      }
    }
    
    if (availableCells.length === 0) {
      return await this.getBasicDecision(gameState);
    }
    
    // For mistakes, just pick a random cell (ignore strategy)
    const randomIndex = Math.floor(Math.random() * availableCells.length);
    const [row, col] = availableCells[randomIndex];
    
    return {
      action_type: 'attack',
      coordinate: [row, col],
      reasoning: `Random attack for ${this.difficulty} difficulty - making intentional strategic mistake`
    };
  }

  /**
   * Basic AI decision for easy difficulty
   */
  async getBasicDecision(gameState) {
    console.log('🎯 Making basic AI decision...');
    
    const board = gameState.current_opponent_board_view;
    
    // Simple hunt mode check
    if (this.huntMode && this.lastHit) {
      const adjacentCells = this.getAdjacentCells(this.lastHit.row, this.lastHit.col, board.length);
      
      for (const [row, col] of adjacentCells) {
        if (board[row] && board[row][col] === 'UNKNOWN') {
          return {
            action_type: 'attack',
            coordinate: [row, col],
            reasoning: `Basic hunt mode - attacking adjacent to hit at [${this.lastHit.row}, ${this.lastHit.col}]`
          };
        }
      }
      
      // If no adjacent cells available, exit hunt mode
      this.huntMode = false;
      this.lastHit = null;
    }
    
    // Simple random targeting with slight preference for center
    const availableCells = [];
    const gridSize = board.length;
    
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (board[row][col] === 'UNKNOWN') {
          // Add center bias for basic AI
          const distanceFromCenter = Math.abs(row - gridSize/2) + Math.abs(col - gridSize/2);
          const weight = Math.max(1, gridSize - distanceFromCenter);
          for (let i = 0; i < weight; i++) {
            availableCells.push([row, col]);
          }
        }
      }
    }
    
    if (availableCells.length === 0) {
      throw new Error('No available cells to attack');
    }
    
    const randomIndex = Math.floor(Math.random() * availableCells.length);
    const [row, col] = availableCells[randomIndex];
    
    return {
      action_type: 'attack',
      coordinate: [row, col],
      reasoning: `Basic AI attack with center preference at [${row}, ${col}]`
    };
  }

  /**
   * Optimized decision making - fast local logic with Gemini fallback and difficulty awareness
   */
  async getOptimizedDecision(gameState) {
    // Use fast local logic for common scenarios
    const quickDecision = this.getQuickDecision(gameState);
    if (quickDecision) {
      return quickDecision;
    }

    // Check ability usage based on difficulty
    const abilityDecision = this.checkDifficultyBasedAbilityUsage(gameState);
    if (abilityDecision) {
      return abilityDecision;
    }

    // Check if we have a valid API key for Gemini
    const hasValidApiKey = import.meta.env.VITE_GEMINI_API_KEY && 
                          import.meta.env.VITE_GEMINI_API_KEY !== 'AIzaSyC26WPoKlqHoImtB7C7FvCwwN-q_T_OiXs';

    if (hasValidApiKey && this.difficultyConfig.useAdvancedStrategy) {
      // Only use Gemini for complex scenarios - with shorter timeout
      try {
        const decision = await Promise.race([
          this.getGeminiDecision(gameState),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 2000) // 2 second timeout
          )
        ]);
        return decision;
      } catch (error) {
        console.warn('Gemini AI timeout, using fallback decision:', error.message);
        return this.getFallbackDecision(gameState);
      }
    } else {
      // No valid API key or basic difficulty, use local fallback logic
      console.log(`🤖 Using local AI logic (${hasValidApiKey ? 'basic difficulty' : 'no Gemini API key'})`);
      return this.getFallbackDecision(gameState);
    }
  }

  /**
   * Check if AI should use abilities based on difficulty settings
   */
  checkDifficultyBasedAbilityUsage(gameState) {
    const abilities = gameState.my_available_abilities;
    if (abilities.length === 0) return null;

    // Check if AI should use abilities based on difficulty rate
    const shouldUseAbility = Math.random() < this.difficultyConfig.abilityUsageRate;
    if (!shouldUseAbility) {
      console.log(`🎯 Skipping ability usage (${Math.round(this.difficultyConfig.abilityUsageRate * 100)}% chance for ${this.difficulty})`);
      return null;
    }

    const board = gameState.current_opponent_board_view;
    
    // Easy difficulty: Use abilities randomly and sub-optimally
    if (this.difficulty === 'easy') {
      if (abilities.includes('SCANNER') && Math.random() < 0.4) {
        // Random scanner usage
        const row = Math.floor(Math.random() * (board.length - 1));
        const col = Math.floor(Math.random() * (board[0].length - 1));
        return {
          action_type: 'ability',
          ability_name: 'SCANNER',
          target_area_center: [row, col],
          reasoning: `Easy difficulty - random SCANNER usage at [${row}, ${col}]`
        };
      }
    }
    
    // Medium difficulty: Strategic but not perfect ability usage
    if (this.difficulty === 'medium') {
      if (abilities.includes('NUKE') && Math.random() < 0.3) {
        // Use NUKE on areas with some hits
        for (let row = 1; row < board.length - 1; row++) {
          for (let col = 1; col < board[row].length - 1; col++) {
            if (board[row][col] === 'HIT') {
              return {
                action_type: 'ability',
                ability_name: 'NUKE',
                target_area_center: [row, col],
                reasoning: `Medium difficulty - NUKE around hit at [${row}, ${col}]`
              };
            }
          }
        }
      }
      
      if (abilities.includes('SCANNER') && Math.random() < 0.5) {
        // Strategic scanner usage in center areas
        const centerRow = Math.floor(board.length / 2);
        const centerCol = Math.floor(board[0].length / 2);
        const row = Math.max(0, Math.min(board.length - 2, centerRow + Math.floor(Math.random() * 3) - 1));
        const col = Math.max(0, Math.min(board[0].length - 2, centerCol + Math.floor(Math.random() * 3) - 1));
        
        return {
          action_type: 'ability',
          ability_name: 'SCANNER',
          target_area_center: [row, col],
          reasoning: `Medium difficulty - strategic SCANNER in center area [${row}, ${col}]`
        };
      }
    }
    
    // Hard difficulty: Optimal ability usage (let the existing optimized logic handle this)
    return null;
  }

  /**
   * Strategic decision for critical scenarios only - Let Gemini handle most decisions
   */
  getQuickDecision(gameState) {
    const board = gameState.current_opponent_board_view;
    const abilities = gameState.my_available_abilities;

    // Only handle the most urgent scenarios quickly, let Gemini do the strategic thinking
    
    // URGENT: If we have a clear ANNIHILATE opportunity with detected ship line
    if (this.huntMode && this.lastHit && abilities.includes('ANNIHILATE')) {
      const lineTarget = this.detectShipLine(board, this.lastHit);
      if (lineTarget && lineTarget.cells.length === 3) {
        // Only use ANNIHILATE if we have a clear 3-cell line with confirmed hits
        const confirmedHits = lineTarget.cells.filter(([r, c]) => board[r][c] === 'HIT').length;
        if (confirmedHits >= 2) {
          return {
            action_type: 'ability',
            ability_name: 'ANNIHILATE',
            target_cells: lineTarget.cells,
            reasoning: 'URGENT: Using ANNIHILATE on detected ship line with multiple hits'
          };
        }
      }
    }

    // URGENT: Defensive abilities when under immediate threat (very late game)
    if (abilities.includes('COUNTER') && gameState.turn_number > 20 && gameState.opponent_ships_remaining <= 2) {
      return {
        action_type: 'ability',
        ability_name: 'COUNTER',
        reasoning: 'URGENT: Defensive COUNTER in critical endgame'
      };
    }

    // Let Gemini AI handle all other strategic decisions including:
    // - Pattern analysis and predictions
    // - Strategic ability usage timing
    // - Hunt mode continuation with memory
    // - Complex targeting based on game history
    return null; // Let Gemini make the strategic decision
  }

  /**
   * Compile current game state for AI analysis
   */
  async compileGameState() {
    const roomRef = ref(database, `rooms/${this.roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();
    
    if (!room) throw new Error('Room not found');
    
    // Get grid size from room settings
    const gridSize = room.settings?.gridSize || 8;
    
    const opponentId = Object.keys(room.players).find(id => id !== this.aiPlayerId);
    const opponentGrid = room.players[opponentId]?.PlacementData?.grid || {};
    const aiData = room.players[this.aiPlayerId] || {};
    
    // Create opponent board view with correct grid size
    const opponentBoardView = Array(gridSize).fill().map(() => Array(gridSize).fill('UNKNOWN'));
    
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const cell = opponentGrid[r]?.[c];
        if (cell?.hit) {
          opponentBoardView[r][c] = cell.ship ? 'HIT' : 'MISS';
        } else if (cell?.miss) {
          opponentBoardView[r][c] = 'MISS';
        }
      }
    }
    
    // Count remaining ships
    const opponentShipsRemaining = this.countRemainingShips(opponentGrid, gridSize);
    
    // Get available abilities
    const myAvailableAbilities = this.getAvailableAbilities(aiData.abilities || {});
    
    // Get recent moves
    const recentMoves = this.getRecentMoves(room.moves || {});
    
    return {
      current_opponent_board_view: opponentBoardView,
      my_ships_status: aiData.ships || {},
      my_available_abilities: myAvailableAbilities,
      opponent_ships_remaining: opponentShipsRemaining,
      opponent_abilities_used: this.getOpponentAbilitiesUsed(room.moves || {}),
      last_turn_summary: recentMoves[0] || null,
      turn_number: Object.keys(room.moves || {}).length,
      time_remaining_for_move: 25, // 25 seconds for decision
      probability_map: this.probabilityMap
    };
  }

  /**
   * Get decision from Gemini AI
   */
  async getGeminiDecision(gameState) {
    const prompt = this.constructPrompt(gameState);
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse the JSON response
      const decision = JSON.parse(text.replace(/```json\n?|\n?```/g, ''));
      
      return decision;
    } catch (error) {
      console.error('Error getting Gemini decision:', error);
      // Fallback to probability-based decision
      return this.getFallbackDecision(gameState);
    }
  }

  /**
   * Construct prompt for Gemini AI (ENHANCED FOR HUMAN-LIKE STRATEGIC PLAY)
   */
  constructPrompt(gameState) {
    const gridSize = gameState.current_opponent_board_view.length;
    
    // Include game memory context for better decision making
    const recentMoves = this.gameMemory.myMoves.slice(-10); // Last 10 moves
    const patterns = this.analyzeShipPatterns();
    const predictions = this.predictShipLocations();
    
    return `You are an experienced human Battleship player with excellent strategic thinking and memory. Analyze the current game state, your previous moves, and detected patterns to make the smartest tactical decision.

CURRENT GAME STATE:
- Grid Size: ${gridSize}x${gridSize}
- Opponent Board View: ${JSON.stringify(gameState.current_opponent_board_view)}
- Your Available Abilities: ${JSON.stringify(gameState.my_available_abilities)}
- Enemy Ships Remaining: ${gameState.opponent_ships_remaining}
- Turn Number: ${gameState.turn_number}
- Game Phase: ${this.gameMemory.gamePhase}

GAME MEMORY & CONTEXT:
- Your Recent Moves: ${JSON.stringify(recentMoves.map(m => ({ coord: [m.move.row, m.move.col], hit: m.result.isHit })))}
- Detected Ship Patterns: ${JSON.stringify(patterns)}
- Strategic Insights: ${JSON.stringify(this.gameMemory.strategicInsights.slice(-5))}
- Ship Location Predictions: ${JSON.stringify(predictions)}

IMPORTANT BATTLESHIP RULES:
- You can ONLY hit ships when you target a cell that actually contains a ship part
- Attacking empty water will ALWAYS be a miss
- Use your memory of previous hits to deduce ship locations and orientations
- You can ONLY use abilities that are listed in "Your Available Abilities" above

TACTICAL ABILITIES EXPLANATION:
- NUKE: Devastating X-pattern attack (center + 4 adjacent cells) - Use strategically on ship clusters or high-probability areas
- ANNIHILATE: Precision 3-cell line attack - Perfect for finishing off damaged ships or targeting likely ship orientations
- SCANNER: Intelligence gathering on 2x2 area - Reveals ship count, invaluable for strategic planning
- HACKER: Advanced reconnaissance - Reveals exact location of an enemy ship (use when you need guaranteed intel)
- COUNTER: Defensive ability - Protects against incoming abilities (save for critical moments)
- JAM: Electronic warfare - Blocks opponent's next ability (timing is crucial)

STRATEGIC THINKING FRAMEWORK:
1. **Hunting Phase**: When few hits made, use SCANNER/HACKER for intelligence, focus on probability
2. **Targeting Phase**: When ships are hit, pursue them aggressively with ANNIHILATE for linear ships
3. **Endgame Phase**: Use NUKE for area denial, continue systematic hunting

MEMORY-ENHANCED DECISION MAKING:
- Analyze your hit patterns to deduce ship orientations and predict remaining segments
- Use your move history to avoid redundant searches in low-probability areas
- Remember which areas you've systematically searched vs random shots
- Consider the ship sizes you haven't found yet and their placement constraints
- Use pattern recognition from your successful hits to find similar ship arrangements

RESPONSE FORMAT (JSON):
{
  "action_type": "attack" | "ability",
  "coordinate": [row, col] (for attacks),
  "ability_name": "NUKE|ANNIHILATE|SCANNER|HACKER|COUNTER|JAM",
  "target_area_center": [row, col] (for area abilities),
  "target_cells": [[row1,col1], [row2,col2], [row3,col3]] (for ANNIHILATE),
  "reasoning": "Detailed tactical explanation based on game memory and pattern analysis"
}

Make your decision like a seasoned player with perfect memory - strategic, adaptive, and always building on what you've learned from previous moves!`;
  }

  /**
   * Execute the AI's decision with strategic memory updates
   */
  async executeDecision(decision) {
    try {
      console.log('⚡ Executing strategic decision:', decision.reasoning);
      
      if (decision.action_type === 'attack') {
        const [row, col] = decision.coordinate;
        
        // Make the attack
        const result = await makeMove(this.roomId, this.aiPlayerId, row, col);
        console.log(`🎯 Attack result at [${row}, ${col}]:`, result.isHit ? 'HIT!' : 'Miss');
        
        // Update strategic memory with comprehensive analysis
        this.updateGameMemory({ row, col, type: 'attack', reasoning: decision.reasoning }, result);
        
        // Update hunt mode and targeting based on result
        if (result.isHit) {
          this.huntMode = true;
          this.lastHit = { row, col };
          this.huntTarget = { row, col };
          
          console.log('🎯 HUNT MODE ACTIVATED - Target acquired');
          console.log('📈 Increasing probability around hit location');
          
          // Strategic insight for hit
          this.gameMemory.strategicInsights.push({
            type: 'strategic_hit',
            insight: `Strategic hit achieved using: ${decision.reasoning}. Entering focused hunt mode.`,
            coordinate: [row, col],
            timestamp: Date.now()
          });
          
        } else {
          console.log('💧 Miss - updating search strategy');
          
          // Strategic insight for miss
          this.gameMemory.strategicInsights.push({
            type: 'strategic_miss',
            insight: `Strategic miss with reasoning: ${decision.reasoning}. Adjusting search pattern.`,
            coordinate: [row, col],
            timestamp: Date.now()
          });
        }
        
        return result;
        
      } else if (decision.action_type === 'ability') {
        console.log(`🚀 Using ability: ${decision.ability_name}`);
        let result;
        
        switch (decision.ability_name) {
          case 'SCANNER': {
            const [scanRow, scanCol] = decision.target_area_center;
            result = await executeScanner(this.roomId, this.aiPlayerId, scanRow, scanCol);
            
            // Strategic memory update for scanner
            this.gameMemory.strategicInsights.push({
              type: 'ability_usage',
              ability: 'SCANNER',
              insight: `Strategic SCANNER usage: ${decision.reasoning}. Area [${scanRow}, ${scanCol}] scanned.`,
              result: result,
              timestamp: Date.now()
            });
            break;
          }
            
          case 'NUKE': {
            const [nukeRow, nukeCol] = decision.target_area_center;
            result = await executeNuke(this.roomId, this.aiPlayerId, nukeRow, nukeCol);
            
            // Strategic memory for nuke
            this.gameMemory.strategicInsights.push({
              type: 'ability_usage',
              ability: 'NUKE',
              insight: `Strategic NUKE deployment: ${decision.reasoning}. X-pattern attack at [${nukeRow}, ${nukeCol}].`,
              result: result,
              timestamp: Date.now()
            });
            break;
          }
            
          case 'ANNIHILATE': {
            if (decision.target_cells && decision.target_cells.length === 3) {
              // Use specific target cells if provided
              const [r1, c1] = decision.target_cells[0];
              const [r2, c2] = decision.target_cells[1];
              const [r3, c3] = decision.target_cells[2];
              
              // Determine if it's vertical based on coordinates
              const isVertical = (r1 === r2 && r2 === r3) ? false : (c1 === c2 && c2 === c3);
              
              if (isVertical) {
                result = await executeAnnihilate(this.roomId, this.aiPlayerId, Math.min(r1, r2, r3), c1, true);
              } else {
                result = await executeAnnihilate(this.roomId, this.aiPlayerId, r1, Math.min(c1, c2, c3), false);
              }
              
              // Strategic memory for annihilate
              this.gameMemory.strategicInsights.push({
                type: 'ability_usage',
                ability: 'ANNIHILATE',
                insight: `Strategic ANNIHILATE: ${decision.reasoning}. Targeting ${isVertical ? 'vertical' : 'horizontal'} line.`,
                target_cells: decision.target_cells,
                result: result,
                timestamp: Date.now()
              });
              
            } else {
              // Use center coordinate with default direction
              const [annRow, annCol] = decision.target_area_center;
              result = await executeAnnihilate(this.roomId, this.aiPlayerId, annRow, annCol, false);
            }
            break;
          }
            
          case 'HACKER': {
            result = await executeHacker(this.roomId, this.aiPlayerId);
            
            // Strategic memory for hacker
            this.gameMemory.strategicInsights.push({
              type: 'ability_usage',
              ability: 'HACKER',
              insight: `Strategic HACKER activation: ${decision.reasoning}. Revealing enemy ship location.`,
              result: result,
              timestamp: Date.now()
            });
            break;
          }
            
          case 'COUNTER': {
            result = await installCounter(this.roomId, this.aiPlayerId);
            
            // Strategic memory for defensive ability
            this.gameMemory.strategicInsights.push({
              type: 'ability_usage',
              ability: 'COUNTER',
              insight: `Strategic COUNTER installation: ${decision.reasoning}. Defensive posture activated.`,
              timestamp: Date.now()
            });
            break;
          }
            
          case 'JAM': {
            result = await installJam(this.roomId, this.aiPlayerId);
            
            // Strategic memory for jam
            this.gameMemory.strategicInsights.push({
              type: 'ability_usage',
              ability: 'JAM',
              insight: `Strategic JAM installation: ${decision.reasoning}. Electronic warfare activated.`,
              timestamp: Date.now()
            });
            break;
          }
            
          default:
            throw new Error(`Unknown ability: ${decision.ability_name}`);
        }
        
        console.log(`✅ Ability ${decision.ability_name} executed successfully`);
        return result;
      }
    } catch (error) {
      console.error('❌ Error executing strategic decision:', error);
      console.error('🔄 Falling back to basic move...');
      
      // Record the failure in strategic memory
      this.gameMemory.strategicInsights.push({
        type: 'execution_failure',
        insight: `Strategic decision execution failed: ${error.message}. Falling back to basic targeting.`,
        failed_decision: decision,
        timestamp: Date.now()
      });
      
      return await this.makeFallbackMove();
    }
  }

  /**
   * Update probability map based on attack result
   */
  updateProbabilityMap(row, col) {
    // Mark this cell as attacked
    this.probabilityMap[row][col] = 0;
    
    // Update probabilities for ship placement around this area
    for (let r = Math.max(0, row - 2); r <= Math.min(7, row + 2); r++) {
      for (let c = Math.max(0, col - 2); c <= Math.min(7, col + 2); c++) {
        if (this.probabilityMap[r][c] > 0) {
          this.probabilityMap[r][c] *= 0.9; // Slightly reduce probability
        }
      }
    }
  }

  /**
   * Increase probability around a hit
   */
  increaseProbabilityAroundHit(row, col) {
    const directions = [
      [-1, 0], [1, 0], [0, -1], [0, 1] // Up, Down, Left, Right
    ];
    
    directions.forEach(([dr, dc]) => {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        this.probabilityMap[nr][nc] *= 3; // Significantly increase probability
      }
    });
  }

  /**
   * Strategic fallback decision using game memory and analysis - Human-like strategic thinking
   */
  getFallbackDecision(gameState) {
    const board = gameState.current_opponent_board_view;
    const abilities = gameState.my_available_abilities;
    const gridSize = board.length;

    console.log('� Using strategic local AI with game memory and pattern analysis');
    console.log('📊 Analyzing game history and patterns...');

    // Analyze current game state using accumulated memory
    const patterns = this.analyzeShipPatterns();
    const predictions = this.predictShipLocations();
    this.updateGamePhase();

    console.log('🔍 Detected patterns:', patterns);
    console.log('🎯 Ship predictions:', predictions);
    console.log('📈 Current game phase:', this.gameMemory.gamePhase);
    console.log('💭 Strategic insights:', this.gameMemory.strategicInsights.slice(-3));

    // PHASE 1: TARGETING PHASE - We have hits to pursue with memory-based strategy
    if (this.gameMemory.gamePhase === 'targeting' && (this.huntMode || patterns.isolated_hits.length > 0)) {
      console.log('⚔️ TARGETING PHASE: Pursuing detected ships with strategic analysis');

      // Priority 1: Use ANNIHILATE on detected ship lines with confidence
      if (abilities.includes('ANNIHILATE')) {
        const shipLines = [...patterns.horizontal_lines, ...patterns.vertical_lines];
        if (shipLines.length > 0) {
          const bestLine = shipLines[0]; // Take first detected line
          const isHorizontal = bestLine[0].move.row === bestLine[1].move.row;
          
          // Create strategic ANNIHILATE targeting
          const coords = bestLine.map(h => isHorizontal ? h.move.col : h.move.row).sort();
          const minCoord = Math.min(...coords);
          const maxCoord = Math.max(...coords);
          
          let targetCells = [];
          if (isHorizontal) {
            const row = bestLine[0].move.row;
            // Target the line and potential extensions
            for (let c = Math.max(0, minCoord - 1); c <= Math.min(gridSize - 1, maxCoord + 1) && targetCells.length < 3; c++) {
              targetCells.push([row, c]);
            }
          } else {
            const col = bestLine[0].move.col;
            for (let r = Math.max(0, minCoord - 1); r <= Math.min(gridSize - 1, maxCoord + 1) && targetCells.length < 3; r++) {
              targetCells.push([r, col]);
            }
          }

          if (targetCells.length === 3) {
            return {
              action_type: 'ability',
              ability_name: 'ANNIHILATE',
              target_cells: targetCells,
              reasoning: `Strategic ANNIHILATE on detected ${isHorizontal ? 'horizontal' : 'vertical'} ship line based on pattern analysis`
            };
          }
        }
      }

      // Priority 2: Target high-confidence predictions from memory analysis
      const highConfidencePredictions = predictions.filter(p => p.confidence >= 0.8);
      if (highConfidencePredictions.length > 0) {
        const bestPrediction = highConfidencePredictions[0];
        if (board[bestPrediction.row][bestPrediction.col] === 'UNKNOWN') {
          return {
            action_type: 'attack',
            coordinate: [bestPrediction.row, bestPrediction.col],
            reasoning: `Strategic targeting: ${bestPrediction.reasoning} (confidence: ${bestPrediction.confidence})`
          };
        }
      }

      // Priority 3: Continue hunting around isolated hits with strategic selection
      for (const isolatedHit of patterns.isolated_hits) {
        const adjacentCells = this.getAdjacentUnknownCells(isolatedHit.move.row, isolatedHit.move.col, board);
        if (adjacentCells.length > 0) {
          // Use strategic selection: prefer cells that align with common ship orientations
          const strategicTarget = this.selectStrategicTarget(adjacentCells, isolatedHit.move, board);
          return {
            action_type: 'attack',
            coordinate: [strategicTarget.row, strategicTarget.col],
            reasoning: 'Strategic hunt continuation around isolated hit with orientation preference'
          };
        }
      }
    }

    // PHASE 2: HUNTING PHASE - Early game strategic exploration with ability usage
    if (this.gameMemory.gamePhase === 'hunting') {
      console.log('🔍 HUNTING PHASE: Strategic ship location with intelligent ability usage');

      // Priority 1: Use HACKER for guaranteed intelligence in early/mid game
      if (abilities.includes('HACKER') && gameState.opponent_ships_remaining >= 2 && gameState.turn_number <= 15) {
        return {
          action_type: 'ability',
          ability_name: 'HACKER',
          reasoning: 'Strategic HACKER usage for guaranteed ship location in hunting phase'
        };
      }

      // Priority 2: Use SCANNER on strategic areas with highest probability
      if (abilities.includes('SCANNER') && gameState.opponent_ships_remaining >= 3) {
        const strategicScanTarget = this.getStrategicScanTarget(board, gridSize);
        return {
          action_type: 'ability',
          ability_name: 'SCANNER',
          target_area_center: [strategicScanTarget.row, strategicScanTarget.col],
          reasoning: `Strategic SCANNER on high-probability area [${strategicScanTarget.row}, ${strategicScanTarget.col}]`
        };
      }

      // Priority 3: Strategic probability-based targeting (not random)
      const probabilityTarget = this.getHighestProbabilityTarget(board, gridSize);
      if (probabilityTarget) {
        return {
          action_type: 'attack',
          coordinate: [probabilityTarget.row, probabilityTarget.col],
          reasoning: `Strategic probability-based targeting (prob: ${probabilityTarget.probability.toFixed(2)})`
        };
      }
    }

    // PHASE 3: ENDGAME PHASE - Aggressive finishing with strategic ability usage
    if (this.gameMemory.gamePhase === 'endgame' || gameState.opponent_ships_remaining <= 2) {
      console.log('🎯 ENDGAME PHASE: Aggressive strategic finishing');

      // Priority 1: Use NUKE on remaining high-probability clusters
      if (abilities.includes('NUKE')) {
        const strategicNukeTarget = this.getStrategicNukeTarget(board, gridSize);
        if (strategicNukeTarget.probability > 0.4) { // Lower threshold for endgame
          return {
            action_type: 'ability',
            ability_name: 'NUKE',
            target_area_center: [strategicNukeTarget.row, strategicNukeTarget.col],
            reasoning: `Endgame strategic NUKE on remaining ships cluster (prob: ${strategicNukeTarget.probability.toFixed(2)})`
          };
        }
      }

      // Priority 2: Target any remaining predictions
      for (const prediction of predictions) {
        if (board[prediction.row][prediction.col] === 'UNKNOWN') {
          return {
            action_type: 'attack',
            coordinate: [prediction.row, prediction.col],
            reasoning: `Endgame targeting: ${prediction.reasoning}`
          };
        }
      }
    }

    // FALLBACK: Systematic strategic coverage (not random)
    console.log('📋 Using systematic strategic coverage pattern');
    const systematicTarget = this.getStrategicSystematicTarget(board);
    if (systematicTarget) {
      return {
        action_type: 'attack',
        coordinate: [systematicTarget.row, systematicTarget.col],
        reasoning: 'Strategic systematic coverage with ship-size optimization'
      };
    }

    // FINAL FALLBACK: Any unknown cell with strategic preference
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (board[r][c] === 'UNKNOWN') {
          return {
            action_type: 'attack',
            coordinate: [r, c],
            reasoning: 'Final strategic targeting on remaining unknown cell'
          };
        }
      }
    }

    // Emergency fallback
    const center = Math.floor(gridSize / 2);
    return {
      action_type: 'attack',
      coordinate: [center, center],
      reasoning: 'Emergency center targeting'
    };
  }

  /**
   * Get adjacent unknown cells for hunting
   */
  getAdjacentUnknownCells(row, col, boardView) {
    const adjacent = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    
    directions.forEach(([dr, dc]) => {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && 
          boardView[nr][nc] === 'UNKNOWN') {
        adjacent.push({ row: nr, col: nc });
      }
    });
    
    return adjacent;
  }

  /**
   * Get hunting move when we have a damaged ship to finish
   */
  getHuntingMove(board) {
    if (!this.lastHit) return null;
    
    const adjacentCells = this.getAdjacentUnknownCells(this.lastHit.row, this.lastHit.col, board);
    if (adjacentCells.length > 0) {
      return adjacentCells[0]; // Take first available adjacent cell
    }
    
    // No adjacent cells, end hunt mode
    this.huntMode = false;
    this.lastHit = null;
    return null;
  }

  /**
   * Detect ship line for ANNIHILATE targeting
   */
  detectShipLine(board, lastHit) {
    const gridSize = board.length;
    const directions = [
      { dr: 0, dc: 1 },  // horizontal
      { dr: 1, dc: 0 }   // vertical
    ];

    for (const dir of directions) {
      const hits = [];
      
      // Check in both directions from the hit
      for (let d = -2; d <= 2; d++) {
        const r = lastHit.row + d * dir.dr;
        const c = lastHit.col + d * dir.dc;
        
        if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
          if (board[r][c] === 'H') { // Hit
            hits.push([r, c]);
          }
        }
      }
      
      // If we have at least 2 hits in a line, target the gaps
      if (hits.length >= 2) {
        hits.sort((a, b) => dir.dr ? a[0] - b[0] : a[1] - b[1]);
        
        // Find 3 consecutive cells that include hits and potential targets
        for (let i = 0; i < hits.length - 1; i++) {
          const start = hits[i];
          
          // Create 3-cell line starting from this hit
          const cells = [];
          for (let j = 0; j < 3; j++) {
            const r = start[0] + j * dir.dr;
            const c = start[1] + j * dir.dc;
            if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
              cells.push([r, c]);
            }
          }
          
          if (cells.length === 3) {
            return { cells, direction: dir.dr ? 'vertical' : 'horizontal' };
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Get strategic scan target based on probability and coverage optimization
   */
  getStrategicScanTarget(board, gridSize) {
    let bestTarget = { row: 0, col: 0, score: 0 };
    
    // Scan in 2x2 areas, prioritize areas with higher probability and ship-size considerations
    for (let r = 0; r < gridSize - 1; r++) {
      for (let c = 0; c < gridSize - 1; c++) {
        let score = 0;
        let untargetedCells = 0;
        
        // Check 2x2 area with strategic weighting
        for (let dr = 0; dr < 2; dr++) {
          for (let dc = 0; dc < 2; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            
            if (board[nr][nc] === 'UNKNOWN') {
              // Weight by probability and strategic position
              const baseProbability = this.probabilityMap[nr][nc];
              const centerDistance = Math.abs(nr - gridSize/2) + Math.abs(nc - gridSize/2);
              const strategicWeight = 1 + (1 / (1 + centerDistance)); // Prefer central areas slightly
              
              score += baseProbability * strategicWeight;
              untargetedCells++;
            }
          }
        }
        
        // Prefer areas with more untargeted cells and higher strategic value
        const totalScore = score * Math.pow(untargetedCells, 1.5); // Exponential preference for coverage
        if (totalScore > bestTarget.score) {
          bestTarget = { row: r, col: c, score: totalScore };
        }
      }
    }
    
    return bestTarget;
  }

  /**
   * Get highest probability target with strategic considerations
   */
  getHighestProbabilityTarget(board, gridSize) {
    let bestTarget = null;
    let maxProbability = 0;
    
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (board[r][c] === 'UNKNOWN') {
          let probability = this.probabilityMap[r][c];
          
          // Strategic adjustments based on ship placement patterns
          // Prefer edges and corners where ships often hide
          if (r === 0 || r === gridSize - 1 || c === 0 || c === gridSize - 1) {
            probability *= 1.2; // 20% bonus for edge cells
          }
          
          // Prefer cells that allow for larger ship placements
          const spaceScore = this.calculateSpaceScore(r, c, board, gridSize);
          probability *= (1 + spaceScore * 0.1);
          
          if (probability > maxProbability) {
            maxProbability = probability;
            bestTarget = { row: r, col: c, probability: probability };
          }
        }
      }
    }
    
    return bestTarget;
  }

  /**
   * Calculate space score for ship placement potential
   */
  calculateSpaceScore(row, col, board, gridSize) {
    let maxSpace = 0;
    
    // Check horizontal space
    let horizontalSpace = 1;
    // Check left
    for (let c = col - 1; c >= 0 && board[row][c] === 'UNKNOWN'; c--) {
      horizontalSpace++;
    }
    // Check right
    for (let c = col + 1; c < gridSize && board[row][c] === 'UNKNOWN'; c++) {
      horizontalSpace++;
    }
    maxSpace = Math.max(maxSpace, horizontalSpace);
    
    // Check vertical space
    let verticalSpace = 1;
    // Check up
    for (let r = row - 1; r >= 0 && board[r][col] === 'UNKNOWN'; r--) {
      verticalSpace++;
    }
    // Check down
    for (let r = row + 1; r < gridSize && board[r][col] === 'UNKNOWN'; r++) {
      verticalSpace++;
    }
    maxSpace = Math.max(maxSpace, verticalSpace);
    
    // Return normalized space score (higher for areas that can fit larger ships)
    return Math.min(maxSpace / 5, 1); // Normalize to 0-1 based on largest ship size
  }

  /**
   * Strategic target selection considering ship orientation patterns
   */
  selectStrategicTarget(adjacentCells, hitLocation, board) {
    // Prefer targets that align with detected patterns or common orientations
    
    // Check if there are other hits that suggest an orientation
    for (const cell of adjacentCells) {
      // Check if this cell aligns with any existing hits (potential ship line)
      const isHorizontalAlignment = this.checkHorizontalAlignment(cell, hitLocation, board);
      const isVerticalAlignment = this.checkVerticalAlignment(cell, hitLocation, board);
      
      if (isHorizontalAlignment || isVerticalAlignment) {
        return cell; // Prefer cells that continue a potential ship line
      }
    }
    
    // If no clear pattern, prefer cells that maximize space for ship placement
    let bestCell = adjacentCells[0];
    let bestSpaceScore = 0;
    
    for (const cell of adjacentCells) {
      const spaceScore = this.calculateSpaceScore(cell.row, cell.col, board, board.length);
      if (spaceScore > bestSpaceScore) {
        bestSpaceScore = spaceScore;
        bestCell = cell;
      }
    }
    
    return bestCell;
  }

  /**
   * Check for horizontal alignment with existing hits
   */
  checkHorizontalAlignment(cell, hitLocation, board) {
    // Check if there are hits in the same row that suggest a horizontal ship
    const row = hitLocation.row;
    if (cell.row !== row) return false;
    
    // Look for other hits in the same row
    for (let c = 0; c < board[0].length; c++) {
      if (c !== hitLocation.col && c !== cell.col && board[row][c] === 'HIT') {
        return true; // Found another hit in same row
      }
    }
    return false;
  }

  /**
   * Check for vertical alignment with existing hits
   */
  checkVerticalAlignment(cell, hitLocation, board) {
    // Check if there are hits in the same column that suggest a vertical ship
    const col = hitLocation.col;
    if (cell.col !== col) return false;
    
    // Look for other hits in the same column
    for (let r = 0; r < board.length; r++) {
      if (r !== hitLocation.row && r !== cell.row && board[r][col] === 'HIT') {
        return true; // Found another hit in same column
      }
    }
    return false;
  }

  /**
   * Strategic NUKE targeting for endgame
   */
  getStrategicNukeTarget(board, gridSize) {
    let bestTarget = { row: 0, col: 0, probability: 0 };
    
    // Find best X-pattern target with strategic considerations
    for (let r = 1; r < gridSize - 1; r++) {
      for (let c = 1; c < gridSize - 1; c++) {
        let totalProb = 0;
        let validCells = 0;
        let strategicValue = 0;
        
        // Check X-pattern: center + up, down, left, right
        const pattern = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]];
        
        for (const [dr, dc] of pattern) {
          const nr = r + dr;
          const nc = c + dc;
          
          if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
            if (board[nr][nc] === 'UNKNOWN') {
              const cellProb = this.probabilityMap[nr][nc];
              totalProb += cellProb;
              validCells++;
              
              // Strategic bonus for cells near edges (ships often hide there)
              if (nr === 0 || nr === gridSize - 1 || nc === 0 || nc === gridSize - 1) {
                strategicValue += 0.2;
              }
            }
          }
        }
        
        const avgProb = validCells > 0 ? (totalProb / validCells) + strategicValue : 0;
        if (avgProb > bestTarget.probability && validCells >= 3) {
          bestTarget = { row: r, col: c, probability: avgProb };
        }
      }
    }
    
    return bestTarget;
  }

  /**
   * Strategic systematic targeting with ship-size optimization
   */
  getStrategicSystematicTarget(board) {
    const gridSize = board.length;
    
    // Use modified checkerboard pattern that considers ship sizes
    // Priority 1: Standard checkerboard for large ship detection
    for (let r = 0; r < gridSize; r++) {
      for (let c = (r % 2); c < gridSize; c += 2) {
        if (board[r][c] === 'UNKNOWN') {
          return { row: r, col: c };
        }
      }
    }
    
    // Priority 2: Fill in gaps with strategic spacing for smaller ships
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (board[r][c] === 'UNKNOWN') {
          // Prefer cells that are not adjacent to misses (optimize for ship finding)
          const adjacentMisses = this.countAdjacentMisses(r, c, board);
          if (adjacentMisses === 0) {
            return { row: r, col: c };
          }
        }
      }
    }
    
    // Priority 3: Any remaining unknown cell
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (board[r][c] === 'UNKNOWN') {
          return { row: r, col: c };
        }
      }
    }
    
    return null;
  }

  /**
   * Count adjacent misses for strategic targeting
   */
  countAdjacentMisses(row, col, board) {
    let missCount = 0;
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    
    for (const [dr, dc] of directions) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < board.length && nc >= 0 && nc < board[0].length) {
        if (board[nr][nc] === 'MISS') {
          missCount++;
        }
      }
    }
    
    return missCount;
  }

  /**
   * Enhanced NUKE target selection
   */
  getBestNukeTarget(board, gridSize) {
    let bestTarget = { row: 0, col: 0, probability: 0 };
    
    // Find best X-pattern target (center + 4 adjacent)
    for (let r = 1; r < gridSize - 1; r++) {
      for (let c = 1; c < gridSize - 1; c++) {
        let totalProb = 0;
        let validCells = 0;
        
        // Check X-pattern: center + up, down, left, right
        const pattern = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]];
        
        for (const [dr, dc] of pattern) {
          const nr = r + dr;
          const nc = c + dc;
          
          if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
            if (board[nr][nc] === null || board[nr][nc] === 'U') {
              totalProb += this.probabilityMap[nr][nc];
              validCells++;
            }
          }
        }
        
        const avgProb = validCells > 0 ? totalProb / validCells : 0;
        if (avgProb > bestTarget.probability && validCells >= 3) {
          bestTarget = { row: r, col: c, probability: avgProb };
        }
      }
    }
    
    return bestTarget;
  }

  /**
   * Get systematic hunting target using checkerboard pattern
   */
  getSystematicHuntTarget(board) {
    // Use checkerboard pattern for efficient coverage
    for (let r = 0; r < 8; r++) {
      for (let c = (r % 2); c < 8; c += 2) {
        if (board[r][c] === 'UNKNOWN') {
          return { row: r, col: c };
        }
      }
    }
    
    // If checkerboard is complete, target any remaining unknown cell
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] === 'UNKNOWN') {
          return { row: r, col: c };
        }
      }
    }
    
    return null;
  }

  /**
   * Make a simple fallback move
   */
  async makeFallbackMove() {
    console.log('🔄 AI making fallback move...');
    
    const roomRef = ref(database, `rooms/${this.roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();
    
    // Get grid size from room settings
    const gridSize = room.settings?.gridSize || 8;
    
    const opponentId = Object.keys(room.players).find(id => id !== this.aiPlayerId);
    const opponentGrid = room.players[opponentId]?.PlacementData?.grid || {};
    
    console.log(`🎯 Looking for valid move in ${gridSize}x${gridSize} grid...`);
    
    // Find first available cell (including empty water cells)
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const cell = opponentGrid[r]?.[c];
        // Attack if cell doesn't exist (empty water) or hasn't been attacked
        if (!cell || (!cell.hit && !cell.miss)) {
          console.log(`🎯 Fallback move targeting: [${r}, ${c}]`);
          try {
            const result = await makeMove(this.roomId, this.aiPlayerId, r, c);
            console.log('✅ Fallback move successful:', result);
            return result;
          } catch (error) {
            console.warn(`⚠️ Failed to attack [${r}, ${c}]:`, error.message);
            continue; // Try next cell
          }
        }
      }
    }
    
    console.error('💥 No valid moves found in fallback!');
    throw new Error('No valid moves available');
  }

  /**
   * Grant 3 balanced abilities to AI player (one from each category)
   */
  async grantAiAbilities() {
    try {
      // Define ability categories for fair selection (NO GODS_HAND)
      const abilityCategories = {
        attack: ['NUKE', 'ANNIHILATE'],
        support: ['HACKER', 'SCANNER'], 
        defense: ['COUNTER', 'JAM']
      };

      // Randomly select one ability from each category for fair play
      const selectedAbilities = {
        attack: abilityCategories.attack[Math.floor(Math.random() * abilityCategories.attack.length)],
        support: abilityCategories.support[Math.floor(Math.random() * abilityCategories.support.length)],
        defense: abilityCategories.defense[Math.floor(Math.random() * abilityCategories.defense.length)]
      };

      console.log('Granting AI abilities:', selectedAbilities);

      // Grant each selected ability using the existing system
      for (const [category, abilityName] of Object.entries(selectedAbilities)) {
        try {
          await grantAbility(this.roomId, this.aiPlayerId, abilityName);
          console.log(`Granted ${category} ability: ${abilityName} to AI`);
        } catch (error) {
          console.error(`Failed to grant ${abilityName} to AI:`, error);
        }
      }

      return selectedAbilities;
    } catch (error) {
      console.error('Error granting AI abilities:', error);
      return {};
    }
  }

  /**
   * Update game memory with move results and strategic analysis
   */
  updateGameMemory(move, result) {
    // Record AI's own move with enhanced context
    this.gameMemory.myMoves.push({
      move,
      result,
      timestamp: Date.now(),
      turnNumber: this.gameMemory.myMoves.length + 1,
      gamePhase: this.gameMemory.gamePhase
    });

    // Strategic analysis and memory updates
    if (result.isHit) {
      console.log(`🎯 HIT registered at [${move.row}, ${move.col}] - updating strategic memory`);
      
      // Enter or maintain hunt mode
      this.huntMode = true;
      this.lastHit = { row: move.row, col: move.col };
      
      // Add strategic insight
      this.gameMemory.strategicInsights.push({
        type: 'hit_analysis',
        coordinate: [move.row, move.col],
        insight: `Successful hit - ship detected, entering hunt mode. Updating probability map around target area.`,
        timestamp: Date.now(),
        turnNumber: this.gameMemory.myMoves.length
      });

      // Update detected ships map with enhanced tracking
      const shipKey = `${move.row},${move.col}`;
      if (!this.gameMemory.detectedShips.has(shipKey)) {
        this.gameMemory.detectedShips.set(shipKey, {
          coordinates: [move.row, move.col],
          adjacent_hits: this.findAdjacentHits(move.row, move.col),
          estimated_orientation: this.estimateShipOrientation(move.row, move.col),
          estimated_length: this.estimateShipLength(move.row, move.col),
          discovery_turn: this.gameMemory.myMoves.length,
          strategic_priority: this.calculateStrategicPriority(move.row, move.col)
        });
      }

      // Update probability map strategically
      this.increaseProbabilityAroundHit(move.row, move.col);
      
    } else {
      console.log(`💧 MISS at [${move.row}, ${move.col}] - updating search patterns`);
      
      // Strategic miss analysis
      this.gameMemory.strategicInsights.push({
        type: 'miss_analysis',
        coordinate: [move.row, move.col],
        insight: `Miss recorded - area eliminated from search. Adjusting probability calculations for surrounding areas.`,
        timestamp: Date.now(),
        turnNumber: this.gameMemory.myMoves.length
      });

      // Update probability map to reflect the miss
      this.probabilityMap[move.row][move.col] = 0;
      
      // Reduce probability in immediate vicinity (ships can't be too close)
      this.adjustProbabilityAroundMiss(move.row, move.col);
    }

    // Update game phase based on strategic analysis
    this.updateGamePhase();
    
    // Analyze patterns after each move for continuous learning
    const currentPatterns = this.analyzeShipPatterns();
    if (currentPatterns.horizontal_lines.length > 0 || currentPatterns.vertical_lines.length > 0) {
      this.gameMemory.strategicInsights.push({
        type: 'pattern_detection',
        insight: `Ship patterns detected: ${currentPatterns.horizontal_lines.length} horizontal, ${currentPatterns.vertical_lines.length} vertical lines`,
        patterns: currentPatterns,
        timestamp: Date.now(),
        turnNumber: this.gameMemory.myMoves.length
      });
    }

    // Limit memory size to prevent performance issues
    if (this.gameMemory.strategicInsights.length > 20) {
      this.gameMemory.strategicInsights = this.gameMemory.strategicInsights.slice(-15);
    }
  }

  /**
   * Find adjacent hits to a given position for strategic analysis
   */
  findAdjacentHits(row, col) {
    const adjacentHits = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    
    for (const hit of this.gameMemory.myMoves.filter(m => m.result.isHit)) {
      for (const [dr, dc] of directions) {
        if (hit.move.row === row + dr && hit.move.col === col + dc) {
          adjacentHits.push(hit.move);
        }
      }
    }
    
    return adjacentHits;
  }

  /**
   * Estimate ship orientation based on hit patterns
   */
  estimateShipOrientation(row, col) {
    const adjacentHits = this.findAdjacentHits(row, col);
    
    if (adjacentHits.length === 0) return 'unknown';
    
    // Check for horizontal orientation
    const horizontalHits = adjacentHits.filter(hit => hit.row === row);
    if (horizontalHits.length > 0) return 'horizontal';
    
    // Check for vertical orientation
    const verticalHits = adjacentHits.filter(hit => hit.col === col);
    if (verticalHits.length > 0) return 'vertical';
    
    return 'unknown';
  }

  /**
   * Estimate ship length based on consecutive hits
   */
  estimateShipLength(row, col) {
    const orientation = this.estimateShipOrientation(row, col);
    if (orientation === 'unknown') return 1;
    
    let length = 1;
    const allHits = this.gameMemory.myMoves.filter(m => m.result.isHit);
    
    if (orientation === 'horizontal') {
      // Count consecutive hits in the same row
      for (const hit of allHits) {
        if (hit.move.row === row && Math.abs(hit.move.col - col) <= 2) {
          length++;
        }
      }
    } else if (orientation === 'vertical') {
      // Count consecutive hits in the same column
      for (const hit of allHits) {
        if (hit.move.col === col && Math.abs(hit.move.row - row) <= 2) {
          length++;
        }
      }
    }
    
    return Math.min(length, 5); // Cap at maximum ship length
  }

  /**
   * Calculate strategic priority for targeting
   */
  calculateStrategicPriority(row, col) {
    let priority = 1.0;
    
    // Higher priority for edge positions (ships often placed there)
    if (row === 0 || row === 7 || col === 0 || col === 7) {
      priority *= 1.2;
    }
    
    // Higher priority for areas with space for larger ships
    const spaceScore = this.calculateSpaceScore(row, col, [], 8); // Approximate check
    priority *= (1 + spaceScore * 0.3);
    
    return priority;
  }

  /**
   * Adjust probability around miss locations
   */
  adjustProbabilityAroundMiss(row, col) {
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    
    for (const [dr, dc] of directions) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        // Slightly reduce probability for adjacent cells
        this.probabilityMap[nr][nc] *= 0.95;
      }
    }
  }

  /**
   * Update game phase based on current situation
   */
  updateGamePhase() {
    const hitCount = this.gameMemory.myMoves.filter(m => m.result.isHit).length;
    const totalMoves = this.gameMemory.myMoves.length;

    if (hitCount === 0 && totalMoves < 10) {
      this.gameMemory.gamePhase = 'hunting';
    } else if (hitCount > 0 && this.huntMode) {
      this.gameMemory.gamePhase = 'targeting';
    } else if (totalMoves > 20) {
      this.gameMemory.gamePhase = 'endgame';
    }
  }

  /**
   * Analyze ship patterns from move history
   */
  analyzeShipPatterns() {
    const hits = this.gameMemory.myMoves.filter(m => m.result.isHit);
    const patterns = {
      horizontal_lines: [],
      vertical_lines: [],
      isolated_hits: []
    };

    // Group hits by potential ship formations
    for (const hit of hits) {
      const coord = hit.move;
      let foundPattern = false;

      // Check for horizontal patterns
      const horizontalNeighbors = hits.filter(h => 
        h.move.row === coord.row && 
        Math.abs(h.move.col - coord.col) <= 2
      );

      if (horizontalNeighbors.length >= 2) {
        patterns.horizontal_lines.push(horizontalNeighbors);
        foundPattern = true;
      }

      // Check for vertical patterns
      const verticalNeighbors = hits.filter(h => 
        h.move.col === coord.col && 
        Math.abs(h.move.row - coord.row) <= 2
      );

      if (verticalNeighbors.length >= 2) {
        patterns.vertical_lines.push(verticalNeighbors);
        foundPattern = true;
      }

      if (!foundPattern) {
        patterns.isolated_hits.push(hit);
      }
    }

    return patterns;
  }

  /**
   * Predict ship locations based on game history
   */
  predictShipLocations() {
    const patterns = this.analyzeShipPatterns();
    const predictions = [];

    // Predict extensions of detected ship lines
    [...patterns.horizontal_lines, ...patterns.vertical_lines].forEach(line => {
      const isHorizontal = line[0].move.row === line[1].move.row;
      const coords = line.map(h => isHorizontal ? h.move.col : h.move.row).sort();
      
      // Predict ship extensions
      const minCoord = Math.min(...coords);
      const maxCoord = Math.max(...coords);
      
      if (isHorizontal) {
        // Check cells before and after the line
        if (minCoord > 0) {
          predictions.push({
            row: line[0].move.row,
            col: minCoord - 1,
            confidence: 0.8,
            reasoning: 'Extension of horizontal ship line'
          });
        }
        if (maxCoord < 7) {
          predictions.push({
            row: line[0].move.row,
            col: maxCoord + 1,
            confidence: 0.8,
            reasoning: 'Extension of horizontal ship line'
          });
        }
      } else {
        // Vertical predictions
        if (minCoord > 0) {
          predictions.push({
            row: minCoord - 1,
            col: line[0].move.col,
            confidence: 0.8,
            reasoning: 'Extension of vertical ship line'
          });
        }
        if (maxCoord < 7) {
          predictions.push({
            row: maxCoord + 1,
            col: line[0].move.col,
            confidence: 0.8,
            reasoning: 'Extension of vertical ship line'
          });
        }
      }
    });

    // Predict around isolated hits
    patterns.isolated_hits.forEach(hit => {
      const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      directions.forEach(([dr, dc]) => {
        const nr = hit.move.row + dr;
        const nc = hit.move.col + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          predictions.push({
            row: nr,
            col: nc,
            confidence: 0.6,
            reasoning: 'Adjacent to isolated hit'
          });
        }
      });
    });

    return predictions;
  }

  // ...existing code...
}

/**
 * Create and manage AI player in a room
 */
export const monitorAiTurns = (roomId, aiPlayerId) => {
  console.log(`🤖 Starting AI monitoring for room ${roomId}, AI player ${aiPlayerId}`);
  
  // Check if API key is configured
  const hasValidApiKey = import.meta.env.VITE_GEMINI_API_KEY && 
                        import.meta.env.VITE_GEMINI_API_KEY !== 'AIzaSyC26WPoKlqHoImtB7C7FvCwwN-q_T_OiXs';
  
  if (!hasValidApiKey) {
    console.warn('⚠️ Gemini API key is missing or using placeholder value!');
    console.log('💡 AI will use local logic only (no Gemini AI calls)');
  } else {
    console.log('✅ Gemini API key configured, full AI capabilities enabled');
  }
  
  const ai = new GeminiAiPlayer(roomId, aiPlayerId);
  const roomRef = ref(database, `rooms/${roomId}`);
  
  return onValue(roomRef, async (snapshot) => {
    const room = snapshot.val();
    if (!room || room.gameOver || !room.gameStarted) return;
    
    console.log(`🎮 Room update - Current turn: ${room.currentTurn}, AI ID: ${aiPlayerId}, Is AI turn: ${room.currentTurn === aiPlayerId}`);
    
    // Check if it's AI's turn
    if (room.currentTurn === aiPlayerId) {
      console.log(`🚀 AI turn detected! Making move in 1 second...`);
      try {
        // Small delay to ensure all updates are complete
        setTimeout(async () => {
          try {
            console.log(`⚡ AI making move...`);
            await ai.makeAiMove();
            console.log(`✅ AI move completed`);
          } catch (error) {
            console.error('❌ Error in AI move execution:', error);
            
            // Fallback move if AI decision fails
            try {
              console.log('🔄 Attempting fallback move...');
              await ai.makeFallbackMove();
              console.log('✅ Fallback move completed');
            } catch (fallbackError) {
              console.error('💥 Fallback move also failed:', fallbackError);
            }
          }
        }, 1000);
      } catch (error) {
        console.error('❌ Error in AI turn handler:', error);
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
      }
    }
  });
};

/**
 * Create and manage AI player in a room with difficulty settings
 */
export const createAiPlayer = async (roomId, difficulty = 'easy') => {
  const aiPlayerId = `ai_${Date.now()}`;
  const ai = new GeminiAiPlayer(roomId, aiPlayerId, difficulty);
  
  // Join the room as AI player
  const roomRef = ref(database, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  const room = snapshot.val();
  
  if (!room) throw new Error('Room not found');
  
  const updates = {};
  updates[`/rooms/${roomId}/players/${aiPlayerId}`] = {
    name: `Gemini AI (${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)})`,
    ready: false,
    isAI: true,
    difficulty: difficulty,
    abilities: {}
  };
  updates[`/rooms/${roomId}/playerCount`] = increment(1);
  
  await update(ref(database), updates);
  
  console.log('AI player created:', {
    roomId,
    aiPlayerId,
    difficulty,
    playerCount: (room.playerCount || 0) + 1
  });
  
  // Place ships optimally and set ready
  try {
    console.log(`🤖 Auto-placing ships with ${difficulty} difficulty strategy...`);
    const placementSuccess = await ai.placeShipsOptimally();
    console.log('AI ship placement result:', placementSuccess);
    
    // Grant abilities to AI based on difficulty
    console.log(`🎯 Granting abilities for ${difficulty} difficulty...`);
    const grantedAbilities = await ai.grantAiAbilities();
    console.log('AI abilities granted:', grantedAbilities);
    
    // Ensure AI is marked as ready
    await update(ref(database, `rooms/${roomId}/players/${aiPlayerId}`), {
      ready: true
    });
    
    console.log(`✅ AI player ready with ${difficulty} difficulty`);
  } catch (error) {
    console.error('Error setting up AI player:', error);
    // Fallback: at least mark AI as ready even if ship placement fails
    await update(ref(database, `rooms/${roomId}/players/${aiPlayerId}`), {
      ready: true
    });
  }
  
  return { ai, aiPlayerId };
};

export default GeminiAiPlayer;
