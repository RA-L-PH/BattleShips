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
import bcrypt from 'bcryptjs';

// Input validation helpers
const validateUsername = (username) => {
  if (!username || username.length < 3) {
    throw new Error('Username must be at least 3 characters long');
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    throw new Error('Username can only contain letters, numbers, and underscores');
  }
};

const validatePassword = (password) => {
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }
};

// SuperAdmin Service
export const createSuperAdmin = async (username, password, displayName) => {
  try {
    validateUsername(username);
    validatePassword(password);
    
    if (!displayName || displayName.trim().length === 0) {
      throw new Error('Display name is required');
    }

    // Check if username already exists
    const existingQuery = query(
      collection(db, 'superAdmins'),
      where('username', '==', username.toLowerCase())
    );
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      throw new Error('Username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const superAdminRef = await addDoc(collection(db, 'superAdmins'), {
      username: username.toLowerCase(),
      password: hashedPassword,
      displayName: displayName.trim(),
      createdAt: Date.now(),
      active: true
    });
    return superAdminRef.id;
  } catch (error) {
    console.error('Error creating super admin:', error);
    throw new Error(`Failed to create super admin: ${error.message}`);
  }
};

export const authenticateSuperAdmin = async (username, password) => {
  try {
    validateUsername(username);
    validatePassword(password);
    
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
    
    // Compare hashed password
    const isPasswordValid = await bcrypt.compare(password, superAdminData.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }
    
    // Don't return password in response
    const { password: _, ...userDataWithoutPassword } = superAdminData;
    
    return {
      id: superAdminDoc.id,
      ...userDataWithoutPassword
    };
  } catch (error) {
    console.error('Error authenticating super admin:', error);
    throw new Error(`Authentication failed: ${error.message}`);
  }
};

// Admin Service
export const createAdmin = async (username, password, displayName, createdBy, permissions = {}) => {
  try {
    validateUsername(username);
    validatePassword(password);
    
    if (!displayName || displayName.trim().length === 0) {
      throw new Error('Display name is required');
    }
    
    if (!createdBy) {
      throw new Error('CreatedBy (SuperAdmin ID) is required');
    }

    // Check if username already exists
    const existingQuery = query(
      collection(db, 'admins'),
      where('username', '==', username.toLowerCase())
    );
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      throw new Error('Username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const adminRef = await addDoc(collection(db, 'admins'), {
      username: username.toLowerCase(),
      password: hashedPassword,
      displayName: displayName.trim(),
      createdBy,
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
    throw new Error(`Failed to create admin: ${error.message}`);
  }
};

export const authenticateAdmin = async (username, password) => {
  try {
    validateUsername(username);
    validatePassword(password);
    
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
    
    // Compare hashed password
    const isPasswordValid = await bcrypt.compare(password, adminData.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }
    
    // Don't return password in response
    const { password: _, ...userDataWithoutPassword } = adminData;
    
    return {
      id: adminDoc.id,
      ...userDataWithoutPassword
    };
  } catch (error) {
    console.error('Error authenticating admin:', error);
    throw new Error(`Authentication failed: ${error.message}`);
  }
};

export const getAllAdmins = async () => {
  try {
    const q = query(collection(db, 'admins'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      // Don't return password in response
      const { password: _, ...userDataWithoutPassword } = data;
      return {
        id: doc.id,
        ...userDataWithoutPassword
      };
    });
  } catch (error) {
    console.error('Error getting all admins:', error);
    throw new Error(`Failed to retrieve admins: ${error.message}`);
  }
};

export const updateAdminPermissions = async (adminId, permissions) => {
  try {
    if (!adminId) {
      throw new Error('Admin ID is required');
    }
    
    if (!permissions || typeof permissions !== 'object') {
      throw new Error('Valid permissions object is required');
    }
    
    const adminRef = doc(db, 'admins', adminId);
    await updateDoc(adminRef, {
      permissions,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error('Error updating admin permissions:', error);
    throw new Error(`Failed to update admin permissions: ${error.message}`);
  }
};

export const deactivateAdmin = async (adminId) => {
  try {
    if (!adminId) {
      throw new Error('Admin ID is required');
    }
    
    const adminRef = doc(db, 'admins', adminId);
    await updateDoc(adminRef, {
      active: false,
      deactivatedAt: Date.now()
    });
  } catch (error) {
    console.error('Error deactivating admin:', error);
    throw new Error(`Failed to deactivate admin: ${error.message}`);
  }
};

// Game History Service
export const saveGameHistory = async (gameData) => {
  try {
    if (!gameData || !gameData.roomId) {
      throw new Error('Game data with roomId is required');
    }
    
    const gameHistoryRef = await addDoc(collection(db, 'gameHistory'), {
      roomId: gameData.roomId,
      gameMode: gameData.gameMode || 'unknown',
      adminId: gameData.adminId || null,
      players: gameData.players || [],
      winner: gameData.winner || null,
      startTime: gameData.startTime || Date.now(),
      endTime: gameData.endTime || Date.now(),
      settings: gameData.settings || {},
      moves: gameData.moves || {},
      createdAt: Date.now()
    });
    return gameHistoryRef.id;
  } catch (error) {
    console.error('Error saving game history:', error);
    throw new Error(`Failed to save game history: ${error.message}`);
  }
};

export const getGameHistory = async (adminId = null, limit = 50) => {
  try {
    const validLimit = Math.min(Math.max(limit, 1), 100); // Limit between 1 and 100
    
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
    })).slice(0, validLimit);
  } catch (error) {
    console.error('Error getting game history:', error);
    throw new Error(`Failed to retrieve game history: ${error.message}`);
  }
};

// Room History Service
export const saveRoomHistory = async (adminId, roomData) => {
  try {
    if (!adminId) {
      throw new Error('Admin ID is required');
    }
    
    if (!roomData || !roomData.roomId) {
      throw new Error('Room data with roomId is required');
    }
    
    const roomHistoryRef = await addDoc(collection(db, 'roomHistory'), {
      roomId: roomData.roomId,
      adminId: adminId,
      gameMode: roomData.gameMode || 'unknown',
      maxPlayers: roomData.maxPlayers || 2,
      playersJoined: roomData.playersJoined || 0,
      status: roomData.status || 'unknown',
      settings: roomData.settings || {},
      createdAt: roomData.createdAt || Date.now(),
      endedAt: roomData.endedAt || null
    });
    return roomHistoryRef.id;
  } catch (error) {
    console.error('Error saving room history:', error);
    throw new Error(`Failed to save room history: ${error.message}`);
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
