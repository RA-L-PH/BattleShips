import { userService } from '../services/userService';
import { gameModesService } from '../services/gameModesService';
import { initService } from '../services/initService';
import { cleanupService } from '../services/cleanupService';

export const testFeatures = {
  // Test SuperAdmin functionality
  async testSuperAdminFeatures() {
    
    try {
      // Test SuperAdmin authentication
      const superAdminId = await userService.authenticateSuperAdmin('admin', 'battleship2024');
      
      // Test admin creation
      const adminId = await userService.createAdmin(superAdminId, {
        username: 'testadmin',
        password: 'testpass123',
        permissions: {
          hostGames: true,
          customGames: true,
          manageGames: true
        }
      });
      
      // Test admin authentication
      const authenticatedAdmin = await userService.authenticateAdmin('testadmin', 'testpass123');
      
      // Test permission updates
      await userService.updateAdminPermissions(superAdminId, adminId, {
        hostGames: true,
        customGames: false,
        manageGames: true
      });
      
      return { superAdminId, adminId };
    } catch (error) {
      throw error;
    }
  },

  // Test Random Game functionality
  async testRandomGameFeatures() {

    
    try {
      // Test joining random game queue
      const player1Id = 'test_player_1';
      const player2Id = 'test_player_2';
      
      const queueResult1 = await gameModesService.joinRandomGameQueue(player1Id, 'Player1');

      
      const queueResult2 = await gameModesService.joinRandomGameQueue(player2Id, 'Player2');

      
      // Test if game was created
      if (queueResult2.matched && queueResult2.roomId) {

        
        // Test leaving queue
        await gameModesService.leaveRandomGameQueue(player1Id);

      }
      
      return { queueResult1, queueResult2 };
    } catch (error) {

      throw error;
    }
  },

  // Test Friendly Game functionality
  async testFriendlyGameFeatures() {

    
    try {
      // Test creating friendly game
      const friendlyGame = await gameModesService.createFriendlyGame('host_player', 'HostPlayer', {
        gridSize: 10,
        shipCount: 'many',
        abilities: true,
        turnTimeLimit: 90
      });

      
      // Test joining friendly game with code
      const joinResult = await gameModesService.joinFriendlyGame(friendlyGame.roomCode, 'friend_player', 'FriendPlayer');

      
      return { friendlyGame, joinResult };
    } catch (error) {

      throw error;
    }
  },

  // Test Custom Game functionality
  async testCustomGameFeatures() {

    
    try {
      // Get test admin
      const adminResult = await this.testSuperAdminFeatures();
      
      // Test creating custom game
      const customGame = await gameModesService.createCustomGame(adminResult.adminId, {
        roomId: 'CUSTOM001',
        gridSize: 12,
        shipCount: 'few',
        abilities: false,
        turnTimeLimit: 120
      });

      
      return { customGame };
    } catch (error) {

      throw error;
    }
  },

  // Test Game History functionality
  async testGameHistoryFeatures() {

    
    try {
      // Test saving game history
      const gameHistory = {
        roomId: 'TEST_ROOM_001',
        gameMode: 'random',
        players: [
          { id: 'player1', name: 'Player One' },
          { id: 'player2', name: 'Player Two' }
        ],
        winner: 'player1',
        startTime: Date.now() - 600000, // 10 minutes ago
        endTime: Date.now(),
        settings: { gridSize: 8, shipCount: 'default' },
        moves: {}
      };
      
      await userService.saveGameHistory(gameHistory);

      
      // Test retrieving game history
      const retrievedHistory = await userService.getGameHistory();

      
      return { gameHistory, retrievedHistory };
    } catch (error) {

      throw error;
    }
  },

  // Test Cleanup Service functionality
  async testCleanupService() {

    
    try {
      // Test cleanup functions
      const cleanupResults = await cleanupService.runFullCleanup();

      
      return cleanupResults;
    } catch (error) {

      throw error;
    }
  },

  // Test Game Mode Detection
  async testGameModeDetection() {

    
    try {
      // Test different room ID patterns
      const adminMode = gameModesService.detectGameMode('ADMIN001');
      const randomMode = gameModesService.detectGameMode('RND_12345');
      const friendlyMode = gameModesService.detectGameMode('FR_ABCDEF');
      const customMode = gameModesService.detectGameMode('CUSTOM_001');
      

        adminMode,
        randomMode,
        friendlyMode,
        customMode
      });
      
      return { adminMode, randomMode, friendlyMode, customMode };
    } catch (error) {

      throw error;
    }
  },

  // Run all tests
  async runAllTests() {

    
    const results = {};
    
    try {
      // Initialize the system first

      await initService.initializeDefaults();

      
      // Run all test suites
      results.superAdmin = await this.testSuperAdminFeatures();
      results.randomGame = await this.testRandomGameFeatures();
      results.friendlyGame = await this.testFriendlyGameFeatures();
      results.customGame = await this.testCustomGameFeatures();
      results.gameHistory = await this.testGameHistoryFeatures();
      results.cleanup = await this.testCleanupService();
      results.gameModeDetection = await this.testGameModeDetection();
      


      
      return results;
    } catch (error) {

      throw error;
    }
  },

  // Quick smoke test for essential features
  async runSmokeTest() {

    
    try {
      // Test basic initialization
      await initService.initializeDefaults();
      
      // Test SuperAdmin can log in
      await userService.authenticateSuperAdmin('admin', 'battleship2024');
      
      // Test random game queue
      const queueResult = await gameModesService.joinRandomGameQueue('smoke_test_player', 'SmokeTest');
      await gameModesService.leaveRandomGameQueue('smoke_test_player');
      
      // Test game mode detection
      gameModesService.detectGameMode('TEST001');
      

      return true;
    } catch (error) {

      throw error;
    }
  }
};

export default testFeatures;
