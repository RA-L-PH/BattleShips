// Import removed: we no longer create superadmin by default

// Initialize function stub for backward compatibility
export const initializeSuperAdmin = async () => {
  console.log('SuperAdmin initialization skipped - manual creation required');
  return;
};

// Create admins function stub for backward compatibility
export const initializeDefaultAdmins = async () => {
  console.log('Default admins initialization skipped - manual creation required');
  return;
};

// Combined initialization function - maintains API compatibility but does nothing
export const initializeDefaults = async () => {
  // Skipping admin initialization as requested
  console.log('Default admin initialization bypassed - manual creation required');
  return;
};

// Export as object for compatibility
export const initService = {
  initializeDefaults,
  initializeSuperAdmin,
  initializeDefaultAdmins
};
