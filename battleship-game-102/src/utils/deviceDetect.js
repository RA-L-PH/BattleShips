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