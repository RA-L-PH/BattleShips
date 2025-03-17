import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserSecret, FaLock, FaSignInAlt } from 'react-icons/fa';
import logo from '../assets/logo.png';
import '../App.css';

// Define 5 admin accounts with funny names and unique passwords
const ADMINS = [
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

  const handleLogin = () => {
    setLoading(true);
    setError(null);
    
    // Find matching admin
    const admin = ADMINS.find(
      admin => admin.username.toLowerCase() === username.toLowerCase() && 
               admin.password === password
    );
    
    setTimeout(() => {
      if (admin) {
        // Store admin info in localStorage
        localStorage.setItem('isAdmin', 'true');
        localStorage.setItem('adminId', admin.username);
        localStorage.setItem('adminDisplayName', admin.displayName);
        navigate('/admin');
      } else {
        setError('Invalid username or password');
      }
      setLoading(false);
    }, 800); // Add a small delay for better UX
  };

  return (
    <div className="min-h-screen flex items-center justify-center battleship-bg">
      <div className="bg-gray-800/90 backdrop-blur-sm p-8 rounded-lg shadow-lg w-96">
        <div className="flex justify-center mb-6">
          <img src={logo} alt="Battleship Logo" className="h-24 w-auto" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2 text-center">Battleship</h1>
        <h2 className="text-xl text-gray-400 mb-8 text-center">Admin Portal</h2>
        
        {error && (
          <div className="bg-red-500 text-white p-3 rounded mb-6 text-center animate-pulse">
            {error}
          </div>
        )}

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
          </button>
        </div>
        
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Access restricted to authorized game administrators.</p>
          <p className="mt-2">Please contact IT support if you need access.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;