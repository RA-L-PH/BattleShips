import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCrown, FaLock, FaSignInAlt, FaMobileAlt } from 'react-icons/fa';
import logo from '../assets/logo.png';
import '../App.css';
import { isDesktopDevice } from '../utils/deviceDetect';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Super admin document ID as specified
const SUPER_ADMIN_DOC_ID = 'NkWGBnm6dNDSXC05FafP';

const SuperAdminLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    // Check if the user is on a desktop device
    setIsDesktop(isDesktopDevice());

    // Set up a resize event listener to detect changes
    const handleResize = () => {
      setIsDesktop(isDesktopDevice());
    };

    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleLogin = async () => {
    // If not on desktop, don't allow login
    if (!isDesktop) {
      setError("SuperAdmin login is only available on desktop devices.");
      return;
    }

    // Basic input validation
    if (!username || username.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Directly access the specified super admin document
      const superAdminDocRef = doc(db, 'superAdmins', SUPER_ADMIN_DOC_ID);
      const superAdminSnap = await getDoc(superAdminDocRef);
      
      if (!superAdminSnap.exists()) {
        throw new Error('SuperAdmin not found');
      }
      
      const superAdminData = superAdminSnap.data();
      
      // Verify the credentials match
      if (username.toLowerCase() !== superAdminData.username.toLowerCase() || 
          password !== superAdminData.password) {
        throw new Error('Invalid credentials');
      }
      
      // Check if the super admin account is active
      if (superAdminData.active === false) {
        throw new Error('This SuperAdmin account has been deactivated');
      }
      
      // Store super admin info in localStorage
      localStorage.setItem('isSuperAdmin', 'true');
      localStorage.setItem('superAdminId', SUPER_ADMIN_DOC_ID);
      localStorage.setItem('superAdminDisplayName', superAdminData.displayName);
      localStorage.setItem('superAdminUsername', superAdminData.username);
      
      navigate('/super-admin');
    } catch (error) {
      console.error('SuperAdmin login error:', error);
      setError(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center battleship-bg">
      <div className="bg-gray-800/90 backdrop-blur-sm p-8 rounded-lg shadow-lg w-96">
        <div className="flex justify-center mb-6">
          <img src={logo} alt="Battleship Logo" className="h-auto w-auto" />
        </div>        <h2 className="text-xl text-yellow-400 mb-8 text-center flex items-center justify-center gap-2">
          <FaCrown />
          SuperAdmin Portal
        </h2>
        
        {!isDesktop ? (
          <div className="bg-yellow-600 text-white p-4 rounded mb-6 text-center flex flex-col items-center gap-4">
            <FaMobileAlt size={32} />
            <p>SuperAdmin access is only available on desktop devices.</p>
            <button 
              onClick={() => navigate('/')}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Game
            </button>
          </div>
        ) : error ? (
          <div className="bg-red-500 text-white p-3 rounded mb-6 text-center animate-pulse">
            {error}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <FaCrown className="text-yellow-400" />
              </div>
              <input
                type="text"
                placeholder="SuperAdmin Username"
                className="w-full py-3 pl-10 pr-4 bg-gray-700 text-white rounded-lg"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <FaLock className="text-gray-400" />
              </div>
              <input
                type="password"
                placeholder="Password"
                className="w-full py-3 pl-10 pr-4 bg-gray-700 text-white rounded-lg"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            
            <button
              onClick={handleLogin}
              disabled={loading || !username || !password}
              className="w-full py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <FaSignInAlt />
                  <span>Login</span>
                </>
              )}
            </button>          </div>
        )}

        {isDesktop && (
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/admin-login')}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              Admin Login Instead
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminLogin;
