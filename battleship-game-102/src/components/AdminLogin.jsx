import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserSecret, FaLock, FaSignInAlt, FaCrown, FaMobileAlt } from 'react-icons/fa';
import logo from '../assets/logo.png';
import '../App.css';
import { isDesktopDevice } from '../utils/deviceDetect';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// Keep existing hardcoded admins for backward compatibility
const LEGACY_ADMINS = [
  { username: 'CaptainBattleship', password: 'AnchorAway2024!', displayName: 'Captain Battleship' },
  { username: 'AdmiralSinkYou', password: 'TorpedoTango42!', displayName: 'Admiral SinkYou' },
  { username: 'CommanderSplash', password: 'WaterWarrior99!', displayName: 'Commander Splash' },
  { username: 'NavyNinja', password: 'SilentSailor77!', displayName: 'Navy Ninja' },
  { username: 'SeaLordSupreme', password: 'OceanMaster365!', displayName: 'Sea Lord Supreme' }
];

const AdminLogin = () => {
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
      setError("Admin login is only available on desktop devices.");
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
      // First try Firebase admins collection
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
        
        // Compare password directly
        if (password !== adminData.password) {
          throw new Error('Invalid credentials');
        }
        
        // Store admin info in localStorage
        localStorage.setItem('isAdmin', 'true');
        localStorage.setItem('adminId', adminDoc.id);
        localStorage.setItem('adminDisplayName', adminData.displayName);
        localStorage.setItem('adminUsername', adminData.username);
        localStorage.setItem('adminPermissions', JSON.stringify(adminData.permissions));
        
        navigate('/admin');
        return;
      } catch (err) {
        console.log('Firebase auth failed, trying legacy', err);
        // If Firebase auth fails, try legacy authentication
        const legacyAdmin = LEGACY_ADMINS.find(
          admin => admin.username.toLowerCase() === username.toLowerCase() && 
                   admin.password === password
        );
        
        if (legacyAdmin) {
          // Store admin info in localStorage with legacy format
          localStorage.setItem('isAdmin', 'true');
          localStorage.setItem('adminId', legacyAdmin.username);
          localStorage.setItem('adminDisplayName', legacyAdmin.displayName);
          localStorage.setItem('adminUsername', legacyAdmin.username);
          localStorage.setItem('adminPermissions', JSON.stringify({
            hostGames: true,
            customGames: true,
            manageGames: true
          }));
          
          navigate('/admin');
          return;
        }
        
        // If both fail, show error
        throw new Error('Invalid username or password');
      }
    } catch (error) {
      console.error('Admin login error:', error);
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
        </div>        <h2 className="text-xl text-gray-400 mb-8 text-center">Admin Portal</h2>
        
        {!isDesktop ? (
          <div className="bg-yellow-600 text-white p-4 rounded mb-6 text-center flex flex-col items-center gap-4">
            <FaMobileAlt size={32} />
            <p>Admin access is only available on desktop devices.</p>
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
                <FaUserSecret className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Admin Username"
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
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
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
              onClick={() => navigate('/super-admin-login')}
              className="text-yellow-400 hover:text-yellow-300 text-sm flex items-center justify-center gap-1"
            >
              <FaCrown />
              SuperAdmin Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLogin;