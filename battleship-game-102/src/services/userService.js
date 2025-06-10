import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';

// SuperAdmin Service
export const createSuperAdmin = async (username, password, displayName) => {
  try {
    const superAdminRef = await addDoc(collection(db, 'superAdmins'), {
      username: username.toLowerCase(),
      password: password, // In production, this should be hashed
      displayName,
      createdAt: Date.now(),
      active: true
    });
    return superAdminRef.id;
  } catch (error) {
    console.error('Error creating super admin:', error);
    throw error;
  }
};

export const authenticateSuperAdmin = async (username, password) => {
  try {
    const q = query(
      collection(db, 'superAdmins'), 
      where('username', '==', username.toLowerCase()),
      where('active', '==', true)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('Invalid credentials');
    }
    
    const superAdminDoc = querySnapshot.docs[0];
    const superAdminData = superAdminDoc.data();
    
    if (superAdminData.password !== password) {
      throw new Error('Invalid credentials');
    }
    
    return {
      id: superAdminDoc.id,
      ...superAdminData
    };
  } catch (error) {
    console.error('Error authenticating super admin:', error);
    throw error;
  }
};

// Admin Service
export const createAdmin = async (username, password, displayName, createdBy, permissions = {}) => {
  try {
    const adminRef = await addDoc(collection(db, 'admins'), {
      username: username.toLowerCase(),
      password: password, // In production, this should be hashed
      displayName,
      createdBy, // SuperAdmin ID
      createdAt: Date.now(),
      active: true,
      permissions: {
        hostGames: true,
        customGames: true,
        manageGames: true,
        ...permissions
      },
      stats: {
        gamesHosted: 0,
        totalPlayers: 0
      }
    });
    return adminRef.id;
  } catch (error) {
    console.error('Error creating admin:', error);
    throw error;
  }
};

export const authenticateAdmin = async (username, password) => {
  try {
    const q = query(
      collection(db, 'admins'), 
      where('username', '==', username.toLowerCase()),
      where('active', '==', true)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('Invalid credentials');
    }
    
    const adminDoc = querySnapshot.docs[0];
    const adminData = adminDoc.data();
    
    if (adminData.password !== password) {
      throw new Error('Invalid credentials');
    }
    
    return {
      id: adminDoc.id,
      ...adminData
    };
  } catch (error) {
    console.error('Error authenticating admin:', error);
    throw error;
  }
};

export const getAllAdmins = async () => {
  try {
    const q = query(collection(db, 'admins'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting admins:', error);
    throw error;
  }
};

export const updateAdminPermissions = async (adminId, permissions) => {
  try {
    const adminRef = doc(db, 'admins', adminId);
    await updateDoc(adminRef, {
      permissions,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error('Error updating admin permissions:', error);
    throw error;
  }
};

export const deactivateAdmin = async (adminId) => {
  try {
    const adminRef = doc(db, 'admins', adminId);
    await updateDoc(adminRef, {
      active: false,
      deactivatedAt: Date.now()
    });
  } catch (error) {
    console.error('Error deactivating admin:', error);
    throw error;
  }
};

// Game History Service
export const saveGameHistory = async (gameData) => {  try {
    const gameHistoryRef = await addDoc(collection(db, 'gameHistory'), {
      roomId: gameData.roomId,
      gameMode: gameData.gameMode, // 'admin', 'random', 'friendly'
      adminId: gameData.adminId || null,
      players: gameData.players,
      winner: gameData.winner,
      startTime: gameData.startTime,
      endTime: gameData.endTime,
      settings: gameData.settings || {},
      moves: gameData.moves || {},
      createdAt: Date.now()
    });
    return gameHistoryRef.id;
  } catch (error) {
    console.error('Error saving game history:', error);
    throw error;
  }
};

export const getGameHistory = async (adminId = null, limit = 50) => {
  try {
    let q;
    if (adminId) {
      q = query(
        collection(db, 'gameHistory'),
        where('adminId', '==', adminId),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'gameHistory'),
        orderBy('createdAt', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).slice(0, limit);
  } catch (error) {
    console.error('Error getting game history:', error);
    throw error;
  }
};

// Room History Service
export const saveRoomHistory = async (roomData) => {
  try {
    const roomHistoryRef = await addDoc(collection(db, 'roomHistory'), {
      roomId: roomData.roomId,
      adminId: roomData.adminId,
      gameMode: roomData.gameMode,
      maxPlayers: roomData.maxPlayers || 2,
      playersJoined: roomData.playersJoined || 0,
      status: roomData.status, // 'waiting', 'active', 'completed', 'cancelled'
      settings: roomData.settings || {},
      createdAt: roomData.createdAt,
      endedAt: roomData.endedAt || null
    });
    return roomHistoryRef.id;
  } catch (error) {
    console.error('Error saving room history:', error);
    throw error;
  }
};

// Export userService object for convenience
export const userService = {
  // SuperAdmin functions
  createSuperAdmin,
  authenticateSuperAdmin,
  
  // Admin functions
  createAdmin,
  authenticateAdmin,
  getAllAdmins,
  updateAdminPermissions,
  deactivateAdmin,
  
  // Game History functions
  saveGameHistory,
  getGameHistory,
  
  // Room History functions
  saveRoomHistory
};
