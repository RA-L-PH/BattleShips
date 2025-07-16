import { createRoom, joinRoom } from './gameService';
import { createAiPlayer, monitorAiTurns } from './geminiAiService';
import { grantRandomAbilitiesToAllPlayers } from './abilityService';
import { ref, update, get } from 'firebase/database';
import { database } from './firebaseConfig';

/**
 * AI Game Manager - Handles Player vs AI game setup and management
 */
export class AiGameManager {
  constructor() {
    this.activeAiMonitors = new Map();
  }

  /**
   * Create a new Player vs AI game
   */
  async createPlayerVsAiGame(playerId, playerName, settings = {}) {
    try {
      const roomId = `ai_game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Default settings for AI games
      const aiGameSettings = {
        gridSize: 8,
        shipCount: 'default',
        abilities: true,
        turnTimeLimit: 30,
        gameMode: 'ai',
        ...settings
      };

      // Create the room (no admin for AI games)
      await createRoom(roomId, null, 'ai', aiGameSettings);
      
      // Join as human player
      await joinRoom(roomId, playerId, playerName);
      
      // Create and add AI player with difficulty
      console.log(`🤖 Creating AI player for room: ${roomId} with difficulty: ${aiGameSettings.aiDifficulty}`);
      const { ai, aiPlayerId } = await createAiPlayer(roomId, aiGameSettings.aiDifficulty);
      console.log('🤖 AI player created successfully:', aiPlayerId);
      
      // Grant abilities to both players
      if (aiGameSettings.abilities) {
        console.log('🎯 Granting abilities to all players...');
        await grantRandomAbilitiesToAllPlayers(roomId);
        console.log('✅ Abilities granted');
      }

      // Store AI reference for monitoring
      this.activeAiMonitors.set(roomId, { ai, aiPlayerId });
      console.log('📊 AI monitoring set up for room:', roomId);
      
      return {
        success: true,
        roomId,
        aiPlayerId,
        message: 'AI game created successfully'
      };
    } catch (error) {
      console.error('Error creating AI game:', error);
      throw error;
    }
  }

  /**
   * Start monitoring AI turns for a game
   */
  startAiMonitoring(roomId, aiPlayerId) {
    if (this.activeAiMonitors.has(roomId)) {
      return; // Already monitoring
    }

    const unsubscribe = monitorAiTurns(roomId, aiPlayerId);
    this.activeAiMonitors.set(roomId, { unsubscribe, aiPlayerId });
    
    console.log(`Started AI monitoring for room ${roomId}`);
  }

  /**
   * Stop monitoring AI for a game
   */
  stopAiMonitoring(roomId) {
    if (this.activeAiMonitors.has(roomId)) {
      const { unsubscribe } = this.activeAiMonitors.get(roomId);
      if (unsubscribe) {
        unsubscribe();
      }
      this.activeAiMonitors.delete(roomId);
      console.log(`Stopped AI monitoring for room ${roomId}`);
    }
  }

  /**
   * Start the AI game once both players are ready
   */
  async startAiGame(roomId) {
    try {
      const roomRef = ref(database, `rooms/${roomId}`);
      const snapshot = await get(roomRef);
      const room = snapshot.val();
      
      if (!room) {
        throw new Error('Room not found');
      }

      const players = Object.values(room.players || {});
      if (players.length !== 2) {
        throw new Error('Need exactly 2 players (human + AI)');
      }

      if (!players.every(player => player.ready)) {
        throw new Error('Both players must be ready');
      }

      // Determine who goes first (human player starts)
      const humanPlayerId = Object.keys(room.players).find(
        id => !room.players[id].isAI
      );
      const aiPlayerId = Object.keys(room.players).find(
        id => room.players[id].isAI
      );

      // Start the game
      const updates = {
        gameStarted: true,
        status: 'playing',
        currentTurn: humanPlayerId, // Human goes first
        startedAt: Date.now(),
        countdown: null
      };

      await update(roomRef, updates);
      
      // Start AI monitoring
      this.startAiMonitoring(roomId, aiPlayerId);

      console.log(`AI game started in room ${roomId}`);
      return true;
    } catch (error) {
      console.error('Error starting AI game:', error);
      throw error;
    }
  }

  /**
   * Handle game over cleanup
   */
  async handleAiGameOver(roomId) {
    try {
      // Stop AI monitoring
      this.stopAiMonitoring(roomId);
      
      // Update game state
      const roomRef = ref(database, `rooms/${roomId}`);
      await update(roomRef, {
        aiGameEnded: true,
        endedAt: Date.now()
      });

      console.log(`AI game ended in room ${roomId}`);
    } catch (error) {
      console.error('Error handling AI game over:', error);
    }
  }

  /**
   * Get AI game statistics
   */
  async getAiGameStats(roomId) {
    try {
      const roomRef = ref(database, `rooms/${roomId}`);
      const snapshot = await get(roomRef);
      const room = snapshot.val();
      
      if (!room) return null;

      const moves = Object.values(room.moves || {});
      const aiMoves = moves.filter(move => 
        room.players[move.playerId || move.attackerId]?.isAI
      );
      const humanMoves = moves.filter(move => 
        !room.players[move.playerId || move.attackerId]?.isAI
      );

      return {
        totalMoves: moves.length,
        aiMoves: aiMoves.length,
        humanMoves: humanMoves.length,
        gameDuration: room.endedAt ? room.endedAt - room.startedAt : null,
        winner: room.winner,
        gameOver: room.gameOver
      };
    } catch (error) {
      console.error('Error getting AI game stats:', error);
      return null;
    }
  }

  /**
   * Cleanup all active AI monitors
   */
  cleanup() {
    this.activeAiMonitors.forEach((monitor, roomId) => {
      this.stopAiMonitoring(roomId);
    });
    this.activeAiMonitors.clear();
  }
}

// Create singleton instance
export const aiGameManager = new AiGameManager();

/**
 * Public API functions
 */

/**
 * Create a new Player vs AI game
 */
export const createAiGame = async (playerId, playerName, difficulty = 'easy') => {
  const settings = {
    aiDifficulty: difficulty,
    turnTimeLimit: difficulty === 'hard' ? 60 : 30
  };
  
  return await aiGameManager.createPlayerVsAiGame(playerId, playerName, settings);
};

/**
 * Join an existing AI game (for spectators or reconnection)
 */
export const joinAiGame = async (roomId, playerId, playerName) => {
  try {
    await joinRoom(roomId, playerId, playerName);
    
    // Check if we need to start AI monitoring
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();
    
    if (room && room.gameStarted) {
      const aiPlayerId = Object.keys(room.players).find(
        id => room.players[id].isAI
      );
      if (aiPlayerId) {
        aiGameManager.startAiMonitoring(roomId, aiPlayerId);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error joining AI game:', error);
    throw error;
  }
};

/**
 * Start an AI game
 */
export const startAiGame = async (roomId) => {
  return await aiGameManager.startAiGame(roomId);
};

/**
 * End an AI game
 */
export const endAiGame = async (roomId) => {
  return await aiGameManager.handleAiGameOver(roomId);
};

/**
 * Get AI game statistics
 */
export const getAiGameStats = async (roomId) => {
  return await aiGameManager.getAiGameStats(roomId);
};

export default aiGameManager;
