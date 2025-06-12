export const isTouchDevice = () => {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
};

export const isDesktopDevice = () => {
  // Check if it's NOT a touch device or has a large screen
  const isLargeScreen = window.innerWidth >= 1024; // 1024px is a common breakpoint for desktop
  return !isTouchDevice() || isLargeScreen;
};

export const isMobileDevice = () => {
  // Check if it's a touch device with a small screen
  const isSmallScreen = window.innerWidth < 1024;
  return isTouchDevice() && isSmallScreen;
};

// Specific method for ship placement component detection
export const isShipPlacementMobile = () => {
  // More comprehensive mobile detection for ship placement
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  
  // Check for mobile user agents
  const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  
  // Check screen size
  const isSmallScreen = window.innerWidth < 1024 || window.innerHeight < 600;
  
  // Check for touch capability
  const hasTouchSupport = isTouchDevice();
  
  // Return true if it's likely a mobile device
  return isMobileUserAgent || (hasTouchSupport && isSmallScreen);
};