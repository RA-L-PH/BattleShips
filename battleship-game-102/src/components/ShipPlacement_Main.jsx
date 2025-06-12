import React, { useState, useEffect } from 'react';
import { isShipPlacementMobile } from '../utils/deviceDetect';
import ShipPlacement_Mobile from './ShipPlacement_Mobile';
import ShipPlacement_Desktop from './ShipPlacement_Desktop';

const ShipPlacement = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Detect device type on component mount
    const detectDevice = () => {
      const mobile = isShipPlacementMobile();
      setIsMobile(mobile);
      setIsLoading(false);
      
      console.log('Device detection for ship placement:', {
        isMobile: mobile,
        userAgent: navigator.userAgent,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        touchSupport: 'ontouchstart' in window
      });
    };

    // Initial detection
    detectDevice();

    // Re-detect on window resize
    const handleResize = () => {
      detectDevice();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Show loading state briefly while detecting device
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading Ship Placement...</p>
        </div>
      </div>
    );
  }

  // Render the appropriate component based on device type
  return isMobile ? <ShipPlacement_Mobile /> : <ShipPlacement_Desktop />;
};

export default ShipPlacement;
