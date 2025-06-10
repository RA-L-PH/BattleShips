import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  createAdmin, 
  getAllAdmins, 
  updateAdminPermissions, 
  deactivateAdmin,
  getGameHistory
} from '../services/userService';
import { 
  FaCrown, 
  FaUserPlus, 
  FaUsers, 
  FaGamepad, 
  FaSignOutAlt,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
  FaHistory,
  FaEye
} from 'react-icons/fa';
import ActiveRoomsMonitor from '../components/ActiveRoomsMonitor';

const SuperAdminPanel = () => {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [gameHistory, setGameHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  // Add room creation state
  const [newRoomId, setNewRoomId] = useState('');
  const [showCustomSettings, setShowCustomSettings] = useState(false);
  const [customSettings, setCustomSettings] = useState({
    abilities: true,
    gridSize: 8,
    shipCount: 'default',
    turnTimeLimit: 30,
    gameTimeLimit: null
  });
  const [newAdmin, setNewAdmin] = useState({
    username: '',
    password: '',
    displayName: '',
    permissions: {
      hostGames: true,
      customGames: true,
      manageGames: true
    }
  });

  const superAdminDisplayName = localStorage.getItem('superAdminDisplayName') || 'SuperAdmin';
  const superAdminId = localStorage.getItem('superAdminId');

  useEffect(() => {
    // Check if super admin is logged in
    if (!localStorage.getItem('isSuperAdmin')) {
      navigate('/super-admin-login');
      return;
    }
    
    loadData();
  }, [navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [adminsData, historyData] = await Promise.all([
        getAllAdmins(),
        getGameHistory(null, 20) // Get latest 20 games
      ]);
      
      setAdmins(adminsData);
      setGameHistory(historyData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      setError('');
      
      if (!newAdmin.username || !newAdmin.password || !newAdmin.displayName) {
        setError('Please fill in all fields');
        return;
      }

      await createAdmin(
        newAdmin.username,
        newAdmin.password,
        newAdmin.displayName,
        superAdminId,
        newAdmin.permissions
      );

      setNewAdmin({
        username: '',
        password: '',
        displayName: '',
        permissions: {
          hostGames: true,
          customGames: true,
          manageGames: true
        }
      });
      setShowCreateAdmin(false);
      loadData(); // Refresh admin list
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTogglePermission = async (adminId, permission) => {
    try {
      const admin = admins.find(a => a.id === adminId);
      const updatedPermissions = {
        ...admin.permissions,
        [permission]: !admin.permissions[permission]
      };
      
      await updateAdminPermissions(adminId, updatedPermissions);
      loadData(); // Refresh admin list
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeactivateAdmin = async (adminId) => {
    if (!window.confirm('Are you sure you want to deactivate this admin?')) {
      return;
    }
    
    try {
      await deactivateAdmin(adminId);
      loadData(); // Refresh admin list
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isSuperAdmin');
    localStorage.removeItem('superAdminId');
    localStorage.removeItem('superAdminDisplayName');
    localStorage.removeItem('superAdminUsername');
    navigate('/');
  };

  const handleCreateStandardGame = async () => {
    try {
      setError('');
      const { createGameAsAdmin } = await import('../services/adminService');
      
      // Generate a unique room ID
      const roomId = `ADMIN_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      await createGameAsAdmin(roomId, superAdminId);
      
      // Navigate to the admin room view to manage the game
      navigate(`/admin/room/${roomId}`);
    } catch (err) {
      setError(`Failed to create standard game: ${err.message}`);
    }
  };

  const handleCreateCustomGame = async () => {
    try {
      setError('');
      const { createGameAsAdmin } = await import('../services/adminService');
      
      // Generate a unique room ID with custom prefix
      const roomId = `CUSTOM_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      await createGameAsAdmin(roomId, superAdminId);
      
      // Navigate to the admin room view where they can configure custom settings
      navigate(`/admin/room/${roomId}`);
    } catch (err) {
      setError(`Failed to create custom game: ${err.message}`);
    }
  };
  const handleCreateRoomWithId = async () => {
    try {
      setError('');
      if (!newRoomId.trim()) {
        setError('Please enter a room ID');
        return;
      }

      const { createGameAsAdmin } = await import('../services/adminService');
      const roomId = newRoomId.trim().toUpperCase();
      
      await createGameAsAdmin(roomId, superAdminId);
      setNewRoomId('');
      
      // Navigate to the admin room view to manage the game
      navigate(`/admin/room/${roomId}`);
    } catch (err) {
      setError(`Failed to create room: ${err.message}`);
    }
  };

  const handleCreateCustomRoomWithId = async () => {
    try {
      setError('');
      if (!newRoomId.trim()) {
        setError('Please enter a room ID');
        return;
      }

      const { createCustomGame } = await import('../services/gameModesService');
      const roomId = await createCustomGame(superAdminId, {
        roomId: newRoomId.trim().toUpperCase(),
        ...customSettings
      });
      
      setNewRoomId('');
      setShowCustomSettings(false);
      
      // Navigate to admin view for this room
      navigate(`/admin/room/${roomId}`);
    } catch (err) {
      setError(`Failed to create custom room: ${err.message}`);
    }
  };
  const handleSettingChange = (setting, value) => {
    setCustomSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-yellow-400 flex items-center gap-2">
                <FaCrown />
                SuperAdmin Dashboard
              </h1>
              <p className="text-gray-400 mt-1">Welcome, {superAdminDisplayName}</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin-login')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Switch to Admin
              </button>
              <button 
                onClick={handleLogout} 
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                <FaSignOutAlt />
                Logout
              </button>
            </div>
          </div>
        </div>        {error && (
          <div className="bg-red-500 text-white p-4 rounded-lg mb-6">
            {error}
          </div>
        )}        {/* Game Management */}
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
            <FaGamepad />
            Game Management
          </h2>
          
          {/* Quick Game Creation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-700 p-6 rounded-lg">
              <h3 className="text-xl font-bold text-white mb-4">Create Standard Game</h3>
              <p className="text-gray-400 mb-4">
                Create a standard battleship game with default settings (8x8 grid, all abilities enabled)
              </p>
              <button 
                onClick={() => handleCreateStandardGame()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create Standard Game
              </button>
            </div>
            
            <div className="bg-gray-700 p-6 rounded-lg">
              <h3 className="text-xl font-bold text-white mb-4">Create Custom Game</h3>
              <p className="text-gray-400 mb-4">
                Create a custom game with advanced settings (grid size, abilities, time limits)
              </p>
              <button 
                onClick={() => handleCreateCustomGame()}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Create Custom Game
              </button>
            </div>
          </div>

          {/* Custom Room ID Creation */}
          <div className="bg-gray-700 p-6 rounded-lg">
            <h3 className="text-xl font-bold text-white mb-4">Create Room with Custom ID</h3>
            <p className="text-gray-400 mb-4">
              Create a room with a specific room ID that players can join directly
            </p>
            
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                placeholder="Enter Room ID (e.g., BATTLE01)"
                value={newRoomId}
                onChange={(e) => setNewRoomId(e.target.value.toUpperCase())}
                className="flex-1 py-2 px-3 bg-gray-600 text-white rounded placeholder-gray-400"
                maxLength={10}
              />
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={handleCreateRoomWithId}
                disabled={!newRoomId.trim()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
              >
                Create Standard Room
              </button>
              
              <button 
                onClick={() => setShowCustomSettings(!showCustomSettings)}
                disabled={!newRoomId.trim()}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
              >
                {showCustomSettings ? 'Hide Custom Settings' : 'Create Custom Room'}
              </button>
            </div>

            {/* Custom Settings Panel */}
            {showCustomSettings && (
              <div className="mt-6 p-4 bg-gray-600 rounded-lg">
                <h4 className="text-lg font-bold text-white mb-4">Custom Game Settings</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Grid Size
                    </label>
                    <select
                      value={customSettings.gridSize}
                      onChange={(e) => handleSettingChange('gridSize', parseInt(e.target.value))}
                      className="w-full py-2 px-3 bg-gray-700 text-white rounded"
                    >
                      <option value={6}>6x6</option>
                      <option value={8}>8x8</option>
                      <option value={10}>10x10</option>
                      <option value={12}>12x12</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Turn Time Limit (seconds)
                    </label>
                    <select
                      value={customSettings.turnTimeLimit}
                      onChange={(e) => handleSettingChange('turnTimeLimit', parseInt(e.target.value))}
                      className="w-full py-2 px-3 bg-gray-700 text-white rounded"
                    >
                      <option value={15}>15 seconds</option>
                      <option value={30}>30 seconds</option>
                      <option value={60}>60 seconds</option>
                      <option value={120}>120 seconds</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-300">
                      <input
                        type="checkbox"
                        checked={customSettings.abilities}
                        onChange={(e) => handleSettingChange('abilities', e.target.checked)}
                        className="mr-2"
                      />
                      Enable Special Abilities
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Ship Count
                    </label>
                    <select
                      value={customSettings.shipCount}
                      onChange={(e) => handleSettingChange('shipCount', e.target.value)}
                      className="w-full py-2 px-3 bg-gray-700 text-white rounded"
                    >
                      <option value="default">Default (5 ships)</option>
                      <option value="minimal">Minimal (3 ships)</option>
                      <option value="extended">Extended (7 ships)</option>
                    </select>
                  </div>
                </div>
                
                <button 
                  onClick={handleCreateCustomRoomWithId}
                  className="w-full mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Create Custom Room with Settings
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Admin Management */}
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <FaUsers />
              Admin Management
            </h2>
            <button
              onClick={() => setShowCreateAdmin(!showCreateAdmin)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <FaUserPlus />
              Create Admin
            </button>
          </div>

          {showCreateAdmin && (
            <div className="bg-gray-700 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-bold text-white mb-4">Create New Admin</h3>
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Username"
                    value={newAdmin.username}
                    onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
                    className="py-2 px-3 bg-gray-600 text-white rounded"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    className="py-2 px-3 bg-gray-600 text-white rounded"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Display Name"
                    value={newAdmin.displayName}
                    onChange={(e) => setNewAdmin({ ...newAdmin, displayName: e.target.value })}
                    className="py-2 px-3 bg-gray-600 text-white rounded"
                    required
                  />
                </div>
                
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-white">
                    <input
                      type="checkbox"
                      checked={newAdmin.permissions.hostGames}
                      onChange={(e) => setNewAdmin({
                        ...newAdmin,
                        permissions: { ...newAdmin.permissions, hostGames: e.target.checked }
                      })}
                    />
                    Host Games
                  </label>
                  <label className="flex items-center gap-2 text-white">
                    <input
                      type="checkbox"
                      checked={newAdmin.permissions.customGames}
                      onChange={(e) => setNewAdmin({
                        ...newAdmin,
                        permissions: { ...newAdmin.permissions, customGames: e.target.checked }
                      })}
                    />
                    Custom Games
                  </label>
                  <label className="flex items-center gap-2 text-white">
                    <input
                      type="checkbox"
                      checked={newAdmin.permissions.manageGames}
                      onChange={(e) => setNewAdmin({
                        ...newAdmin,
                        permissions: { ...newAdmin.permissions, manageGames: e.target.checked }
                      })}
                    />
                    Manage Games
                  </label>
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Create Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateAdmin(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Admin List */}
          <div className="overflow-x-auto">
            <table className="w-full text-white">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left p-3">Admin</th>
                  <th className="text-left p-3">Username</th>
                  <th className="text-left p-3">Created</th>
                  <th className="text-center p-3">Host Games</th>
                  <th className="text-center p-3">Custom Games</th>
                  <th className="text-center p-3">Manage Games</th>
                  <th className="text-center p-3">Status</th>
                  <th className="text-center p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id} className="border-b border-gray-700">
                    <td className="p-3">
                      <div>
                        <div className="font-bold">{admin.displayName}</div>
                        <div className="text-sm text-gray-400">
                          Games: {admin.stats?.gamesHosted || 0}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">{admin.username}</td>
                    <td className="p-3">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleTogglePermission(admin.id, 'hostGames')}
                        className={`p-1 rounded ${admin.permissions?.hostGames ? 'text-green-400' : 'text-red-400'}`}
                      >
                        {admin.permissions?.hostGames ? <FaCheck /> : <FaTimes />}
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleTogglePermission(admin.id, 'customGames')}
                        className={`p-1 rounded ${admin.permissions?.customGames ? 'text-green-400' : 'text-red-400'}`}
                      >
                        {admin.permissions?.customGames ? <FaCheck /> : <FaTimes />}
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleTogglePermission(admin.id, 'manageGames')}
                        className={`p-1 rounded ${admin.permissions?.manageGames ? 'text-green-400' : 'text-red-400'}`}
                      >
                        {admin.permissions?.manageGames ? <FaCheck /> : <FaTimes />}
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        admin.active ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                      }`}>
                        {admin.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {admin.active && (
                        <button
                          onClick={() => handleDeactivateAdmin(admin.id)}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <FaTrash />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>          </div>
        </div>

        {/* Active Rooms Monitor */}
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <FaEye />
            Active Rooms Monitor
          </h2>
          <ActiveRoomsMonitor />
        </div>

        {/* Game History */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <FaHistory />
            Recent Game History
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-white">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left p-3">Room ID</th>
                  <th className="text-left p-3">Game Mode</th>
                  <th className="text-left p-3">Players</th>
                  <th className="text-left p-3">Winner</th>
                  <th className="text-left p-3">Duration</th>
                  <th className="text-left p-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {gameHistory.map((game) => (
                  <tr key={game.id} className="border-b border-gray-700">
                    <td className="p-3 font-mono">{game.roomId}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        game.gameMode === 'admin' ? 'bg-blue-900 text-blue-300' :
                        game.gameMode === 'random' ? 'bg-green-900 text-green-300' :
                        game.gameMode === 'friendly' ? 'bg-yellow-900 text-yellow-300' :
                        'bg-purple-900 text-purple-300'
                      }`}>
                        {game.gameMode?.toUpperCase() || 'ADMIN'}
                      </span>
                    </td>
                    <td className="p-3">
                      {game.players ? Object.values(game.players).map(p => p.name || p).join(' vs ') : 'N/A'}
                    </td>
                    <td className="p-3">{game.winner || 'N/A'}</td>
                    <td className="p-3">
                      {game.duration ? `${Math.round(game.duration / 60000)}m` : 'N/A'}
                    </td>
                    <td className="p-3">
                      {new Date(game.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminPanel;
