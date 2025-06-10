import { userService } from '../services/userService';
import { gameModesService } from '../services/gameModesService';
import { initService } from '../services/initService';
import { cleanupService } from '../services/cleanupService';

export const testFeatures = {
  // Test SuperAdmin functionality
  async testSuperAdminFeatures() {
    console.log('🧪 Testing SuperAdmin features...');
    
    try {
      // Test SuperAdmin authentication
      const superAdminId = await userService.authenticateSuperAdmin('admin', 'battleship2024');
      console.log('✅ SuperAdmin authentication successful');
      
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
      console.log('✅ Admin creation successful:', adminId);
      
      // Test admin authentication
      const authenticatedAdmin = await userService.authenticateAdmin('testadmin', 'testpass123');
      console.log('✅ Admin authentication successful:', authenticatedAdmin);
      
      // Test permission updates
      await userService.updateAdminPermissions(superAdminId, adminId, {
        hostGames: true,
        customGames: false,
        manageGames: true
      });
      console.log('✅ Admin permissions updated');
      
      return { superAdminId, adminId };
    } catch (error) {
      console.error('❌ SuperAdmin features test failed:', error);
      throw error;
    }
  },

  // Test Random Game functionality
  async testRandomGameFeatures() {
    console.log('🧪 Testing Random Game features...');
    
    try {
      // Test joining random game queue
      const player1Id = 'test_player_1';
      const player2Id = 'test_player_2';
      
      const queueResult1 = await gameModesService.joinRandomGameQueue(player1Id, 'Player1');
      console.log('✅ Player 1 joined queue:', queueResult1);
      
      const queueResult2 = await gameModesService.joinRandomGameQueue(player2Id, 'Player2');
      console.log('✅ Player 2 joined queue and matched:', queueResult2);
      
      // Test if game was created
      if (queueResult2.matched && queueResult2.roomId) {
        console.log('✅ Random game matching successful');
        
        // Test leaving queue
        await gameModesService.leaveRandomGameQueue(player1Id);
        console.log('✅ Player can leave queue');
      }
      
      return { queueResult1, queueResult2 };
    } catch (error) {
      console.error('❌ Random Game features test failed:', error);
      throw error;
    }
  },

  // Test Friendly Game functionality
  async testFriendlyGameFeatures() {
    console.log('🧪 Testing Friendly Game features...');
    
    try {
      // Test creating friendly game
      const friendlyGame = await gameModesService.createFriendlyGame('host_player', 'HostPlayer', {
        gridSize: 10,
        shipCount: 'many',
        abilities: true,
        turnTimeLimit: 90
      });
      console.log('✅ Friendly game created:', friendlyGame);
      
      // Test joining friendly game with code
      const joinResult = await gameModesService.joinFriendlyGame(friendlyGame.roomCode, 'friend_player', 'FriendPlayer');
      console.log('✅ Player joined friendly game:', joinResult);
      
      return { friendlyGame, joinResult };
    } catch (error) {
      console.error('❌ Friendly Game features test failed:', error);
      throw error;
    }
  },

  // Test Custom Game functionality
  async testCustomGameFeatures() {
    console.log('🧪 Testing Custom Game features...');
    
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
      console.log('✅ Custom game created:', customGame);
      
      return { customGame };
    } catch (error) {
      console.error('❌ Custom Game features test failed:', error);
      throw error;
    }
  },

  // Test Game History functionality
  async testGameHistoryFeatures() {
    console.log('🧪 Testing Game History features...');
    
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
      console.log('✅ Game history saved');
      
      // Test retrieving game history
      const retrievedHistory = await userService.getGameHistory();
      console.log('✅ Game history retrieved:', retrievedHistory.length, 'games');
      
      return { gameHistory, retrievedHistory };
    } catch (error) {
      console.error('❌ Game History features test failed:', error);
      throw error;
    }
  },

  // Test Cleanup Service functionality
  async testCleanupService() {
    console.log('🧪 Testing Cleanup Service...');
    
    try {
      // Test cleanup functions
      const cleanupResults = await cleanupService.runFullCleanup();
      console.log('✅ Cleanup service executed:', cleanupResults);
      
      return cleanupResults;
    } catch (error) {
      console.error('❌ Cleanup Service test failed:', error);
      throw error;
    }
  },

  // Test Game Mode Detection
  async testGameModeDetection() {
    console.log('🧪 Testing Game Mode Detection...');
    
    try {
      // Test different room ID patterns
      const adminMode = gameModesService.detectGameMode('ADMIN001');
      const randomMode = gameModesService.detectGameMode('RND_12345');
      const friendlyMode = gameModesService.detectGameMode('FR_ABCDEF');
      const customMode = gameModesService.detectGameMode('CUSTOM_001');
      
      console.log('✅ Game mode detection:', {
        adminMode,
        randomMode,
        friendlyMode,
        customMode
      });
      
      return { adminMode, randomMode, friendlyMode, customMode };
    } catch (error) {
      console.error('❌ Game Mode Detection test failed:', error);
      throw error;
    }
  },

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting comprehensive feature tests...');
    
    const results = {};
    
    try {
      // Initialize the system first
      console.log('🔧 Initializing system...');
      await initService.initializeDefaults();
      console.log('✅ System initialized');
      
      // Run all test suites
      results.superAdmin = await this.testSuperAdminFeatures();
      results.randomGame = await this.testRandomGameFeatures();
      results.friendlyGame = await this.testFriendlyGameFeatures();
      results.customGame = await this.testCustomGameFeatures();
      results.gameHistory = await this.testGameHistoryFeatures();
      results.cleanup = await this.testCleanupService();
      results.gameModeDetection = await this.testGameModeDetection();
      
      console.log('🎉 All tests completed successfully!');
      console.log('📊 Test Results Summary:', results);
      
      return results;
    } catch (error) {
      console.error('💥 Test suite failed:', error);
      throw error;
    }
  },

  // Quick smoke test for essential features
  async runSmokeTest() {
    console.log('🔥 Running smoke test...');
    
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
      
      console.log('✅ Smoke test passed - core features are working');
      return true;
    } catch (error) {
      console.error('❌ Smoke test failed:', error);
      throw error;
    }
  }
};

export default testFeatures;
