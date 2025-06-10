import { db } from '../firebase';
import { collection, query, where, getDocs, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { autoMatchPlayers, cleanupRandomGameQueue } from './gameModesService';

export const cleanupService = {
  // Clean up old random game queue entries
  async cleanupOldRandomGameEntries() {
    try {
      const cutoffTime = Date.now() - (5 * 60 * 1000); // 5 minutes ago
      
      const randomGamesRef = collection(db, 'randomGameQueue');
      const q = query(
        randomGamesRef,
        where('timestamp', '<', cutoffTime),
        orderBy('timestamp', 'asc'),
        limit(50) // Process in batches
      );
      
      const snapshot = await getDocs(q);
      const deletions = [];
      
      snapshot.forEach((doc) => {
        deletions.push(deleteDoc(doc.ref));
      });
      
      await Promise.all(deletions);
      
      console.log(`Cleaned up ${deletions.length} old random game queue entries`);
      return deletions.length;
    } catch (error) {
      console.error('Error cleaning up old random game entries:', error);
      throw error;
    }
  },

  // Clean up completed games older than 24 hours
  async cleanupOldGameHistory() {
    try {
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
      
      const gameHistoryRef = collection(db, 'gameHistory');
      const q = query(
        gameHistoryRef,
        where('endTime', '<', cutoffTime),
        where('endTime', '!=', null),
        orderBy('endTime', 'asc'),
        limit(100) // Process in batches
      );
      
      const snapshot = await getDocs(q);
      const deletions = [];
      
      snapshot.forEach((doc) => {
        deletions.push(deleteDoc(doc.ref));
      });
      
      await Promise.all(deletions);
      
      console.log(`Cleaned up ${deletions.length} old game history entries`);
      return deletions.length;
    } catch (error) {
      console.error('Error cleaning up old game history:', error);
      throw error;
    }
  },

  // Clean up abandoned rooms (no activity for 1 hour)
  async cleanupAbandonedRooms() {
    try {
      // This would need to be implemented with Firebase Realtime Database
      // since rooms are stored there, not in Firestore
      console.log('Cleanup of abandoned rooms would need Realtime Database access');
    } catch (error) {
      console.error('Error cleaning up abandoned rooms:', error);
      throw error;
    }
  },

  // Run all cleanup tasks
  async runFullCleanup() {
    console.log('Starting full cleanup...');
    
    const results = {
      randomGameEntries: 0,
      gameHistory: 0,
      abandonedRooms: 0
    };
    
    try {
      results.randomGameEntries = await this.cleanupOldRandomGameEntries();
      results.gameHistory = await this.cleanupOldGameHistory();
      // results.abandonedRooms = await this.cleanupAbandonedRooms();
      
      console.log('Full cleanup completed:', results);
      return results;
    } catch (error) {
      console.error('Error during full cleanup:', error);
      throw error;
    }
  },
  // Schedule periodic cleanup (call this on app startup)
  startPeriodicCleanup() {
    // Clean up every 10 minutes
    const cleanupInterval = setInterval(() => {
      this.cleanupOldRandomGameEntries().catch(console.error);
    }, 10 * 60 * 1000);

    // Clean up game history every hour
    const gameHistoryCleanupInterval = setInterval(() => {
      this.cleanupOldGameHistory().catch(console.error);
    }, 60 * 60 * 1000);

    // Auto-match players every 10 seconds for responsive matchmaking
    const autoMatchInterval = setInterval(() => {
      autoMatchPlayers().catch(console.error);
    }, 10 * 1000);

    // Clean up expired queue entries every 5 minutes
    const queueCleanupInterval = setInterval(() => {
      cleanupRandomGameQueue().catch(console.error);
    }, 5 * 60 * 1000);

    // Return cleanup function
    return () => {
      clearInterval(cleanupInterval);
      clearInterval(gameHistoryCleanupInterval);
      clearInterval(autoMatchInterval);
      clearInterval(queueCleanupInterval);
    };
  }
};

export default cleanupService;
