import { createSuperAdmin } from './userService';

// Initialize default SuperAdmin account
export const initializeSuperAdmin = async () => {
  try {
    // Check if we need to create the default SuperAdmin
    const defaultSuperAdmin = {
      username: 'superadmin',
      password: 'BattleshipMaster2024!',
      displayName: 'System SuperAdmin'
    };

    await createSuperAdmin(
      defaultSuperAdmin.username,
      defaultSuperAdmin.password,      defaultSuperAdmin.displayName
    );

  } catch (error) {
    // If error is about duplicate, that's fine - SuperAdmin already exists
    if (!error.message.includes('already exists')) {
      // Error initializing SuperAdmin
    }
  }
};

// Create some default admins for testing
export const initializeDefaultAdmins = async (superAdminId) => {
  try {
    const { createAdmin } = await import('./userService');
    
    const defaultAdmins = [
      {
        username: 'testadmin1',
        password: 'TestAdmin123!',
        displayName: 'Test Admin 1',
        permissions: { hostGames: true, customGames: true, manageGames: true }
      },
      {
        username: 'testadmin2', 
        password: 'TestAdmin456!',
        displayName: 'Test Admin 2',
        permissions: { hostGames: true, customGames: false, manageGames: true }
      }
    ];

    for (const admin of defaultAdmins) {
      try {
        await createAdmin(
          admin.username,
          admin.password,
          admin.displayName,
          superAdminId,
          admin.permissions
        );      } catch (error) {
        // Ignore if admin already exists
        if (!error.message.includes('already exists')) {
          // Error creating admin
        }
      }
    }  } catch (error) {
    // Error initializing default admins
  }
};

// Combined initialization function
export const initializeDefaults = async () => {
  try {
    // Initializing default accounts
    
    // First initialize SuperAdmin
    await initializeSuperAdmin();
    
    // Then initialize default admins (we don't need the superAdminId for this simple version)
    await initializeDefaultAdmins();
    
    // Default initialization completed
  } catch (error) {
    // Error during default initialization
  }
};

// Export as object for compatibility
export const initService = {
  initializeDefaults,
  initializeSuperAdmin,
  initializeDefaultAdmins
};
