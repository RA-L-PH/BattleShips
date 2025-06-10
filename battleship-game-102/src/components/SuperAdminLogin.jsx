import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authenticateSuperAdmin } from '../services/userService';
import { FaCrown, FaLock, FaSignInAlt } from 'react-icons/fa';
import logo from '../assets/logo.png';
import '../App.css';

const SuperAdminLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const superAdmin = await authenticateSuperAdmin(username, password);
      
      // Store super admin info in localStorage
      localStorage.setItem('isSuperAdmin', 'true');
      localStorage.setItem('superAdminId', superAdmin.id);
      localStorage.setItem('superAdminDisplayName', superAdmin.displayName);
      localStorage.setItem('superAdminUsername', superAdmin.username);
      
      navigate('/super-admin');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center battleship-bg">
      <div className="bg-gray-800/90 backdrop-blur-sm p-8 rounded-lg shadow-lg w-96">
        <div className="flex justify-center mb-6">
          <img src={logo} alt="Battleship Logo" className="h-auto w-auto" />
        </div>
        <h2 className="text-xl text-yellow-400 mb-8 text-center flex items-center justify-center gap-2">
          <FaCrown />
          SuperAdmin Portal
        </h2>
        
        {error && (
          <div className="bg-red-500 text-white p-3 rounded mb-6 text-center animate-pulse">
            {error}
          </div>
        )}

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
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/admin-login')}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            Admin Login Instead
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
