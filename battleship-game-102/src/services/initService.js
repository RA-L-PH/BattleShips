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
      defaultSuperAdmin.password,
      defaultSuperAdmin.displayName
    );

    console.log('Default SuperAdmin created successfully');
  } catch (error) {
    // If error is about duplicate, that's fine - SuperAdmin already exists
    if (!error.message.includes('already exists')) {
      console.error('Error initializing SuperAdmin:', error);
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
        );
      } catch (error) {
        // Ignore if admin already exists
        if (!error.message.includes('already exists')) {
          console.error(`Error creating admin ${admin.username}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error initializing default admins:', error);
  }
};

// Combined initialization function
export const initializeDefaults = async () => {
  try {
    console.log('Initializing default accounts...');
    
    // First initialize SuperAdmin
    await initializeSuperAdmin();
    
    // Then initialize default admins (we don't need the superAdminId for this simple version)
    await initializeDefaultAdmins();
    
    console.log('Default initialization completed');
  } catch (error) {
    console.error('Error during default initialization:', error);
  }
};

// Export as object for compatibility
export const initService = {
  initializeDefaults,
  initializeSuperAdmin,
  initializeDefaultAdmins
};
