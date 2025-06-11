import React, { useState, useEffect } from 'react';
import { getDatabase, ref, onValue } from 'firebase/database';
import { createGameAsAdmin } from '../services/adminService';
import { createCustomGame } from '../services/gameModesService';
import { useNavigate } from 'react-router-dom';
import AdminControls from '../components/AdminControls';
import { FaPlus, FaSignOutAlt, FaGamepad, FaCog, FaCrown } from 'react-icons/fa';
import { isDesktopDevice } from '../utils/deviceDetect';

const AdminPanel = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [newRoomId, setNewRoomId] = useState('');
  const [error, setError] = useState('');
  const [showCustomSettings, setShowCustomSettings] = useState(false);  const [adminId, setAdminId] = useState(localStorage.getItem('adminId') || '');
  const [isDesktop, setIsDesktop] = useState(true);
  const adminDisplayName = localStorage.getItem('adminDisplayName') || 'Admin';
  const adminPermissions = JSON.parse(localStorage.getItem('adminPermissions') || '{}');
  
  const [customSettings, setCustomSettings] = useState({
    abilities: true,
    gridSize: 8,
    shipCount: 'default',
    turnTimeLimit: 30,
    gameTimeLimit: null
  });

  useEffect(() => {
    // Check if admin is logged in
    if (!localStorage.getItem('isAdmin')) {
      navigate('/admin-login');
      return;
    }
    
    // Save admin ID
    localStorage.setItem('adminId', adminId);
    
    // Fetch rooms
    const db = getDatabase();
    const roomsRef = ref(db, 'rooms');

    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert to array and add ID
        const roomsArray = Object.entries(data).map(([id, room]) => ({
          ...room,
          id
        }));
        setRooms(roomsArray);
      } else {
        setRooms([]);
      }
    });

    return () => unsubscribe();
  }, [adminId, navigate]);

  // Check device type
  useEffect(() => {
    setIsDesktop(isDesktopDevice());
    
    const handleResize = () => {
      setIsDesktop(isDesktopDevice());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCreateRoom = async () => {
    try {
      setError('');
      if (!newRoomId.trim()) {
        setError('Please enter a room ID');
        return;
      }

      // Check permissions
      if (!adminPermissions.hostGames) {
        setError('You do not have permission to host games');
        return;
      }      await createGameAsAdmin(newRoomId.trim().toUpperCase(), adminId);
      setNewRoomId('');
      
      // Navigate to admin view for this room
      navigate(`/admin/room/${newRoomId.trim().toUpperCase()}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateCustomGame = async () => {
    try {
      setError('');
      if (!newRoomId.trim()) {
        setError('Please enter a room ID');
        return;
      }

      // Check permissions
      if (!adminPermissions.customGames) {
        setError('You do not have permission to create custom games');
        return;
      }      const roomId = await createCustomGame(adminId, {
        roomId: newRoomId.trim().toUpperCase(),
        ...customSettings
      });
      
      setNewRoomId('');
      
      // Navigate to admin view for this room
      navigate(`/admin/room/${roomId}`);
      setShowCustomSettings(false);
      
      // Navigate to admin view for this room
      navigate(`/admin/room/${roomId}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('adminId');
    localStorage.removeItem('adminDisplayName');
    localStorage.removeItem('adminUsername');
    localStorage.removeItem('adminPermissions');
    navigate('/admin-login');
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
              <p className="text-gray-400 mt-1">Welcome, {adminDisplayName}</p>
              {adminPermissions && (
                <div className="flex gap-2 mt-2">
                  {adminPermissions.hostGames && (
                    <span className="px-2 py-1 bg-green-900 text-green-300 text-xs rounded">Host Games</span>
                  )}
                  {adminPermissions.customGames && (
                    <span className="px-2 py-1 bg-blue-900 text-blue-300 text-xs rounded">Custom Games</span>
                  )}
                  {adminPermissions.manageGames && (
                    <span className="px-2 py-1 bg-purple-900 text-purple-300 text-xs rounded">Manage Games</span>
                  )}
                </div>
              )}
            </div>            <div className="flex items-center gap-4">
              {isDesktop && (
                <button
                  onClick={() => navigate('/super-admin-login')}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                >
                  <FaCrown />
                  SuperAdmin
                </button>
              )}
              <button 
                onClick={handleLogout} 
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                <FaSignOutAlt />
                Logout
              </button>
            </div>
          </div>
          
          <div className="bg-gray-700 p-5 rounded-lg">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <FaGamepad />
              Create New Game
            </h2>
            
            {error && (
              <div className="bg-red-500 text-white p-3 rounded mb-4">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Enter Room ID"
                  className="flex-grow py-3 px-4 bg-gray-600 text-white rounded-lg placeholder-gray-400 uppercase"
                  value={newRoomId}
                  onChange={(e) => setNewRoomId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
                />
                <button
                  onClick={handleCreateRoom}
                  disabled={!adminPermissions.hostGames}
                  className="py-3 px-6 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <FaPlus />
                  Create Standard
                </button>
                {adminPermissions.customGames && (
                  <button
                    onClick={() => setShowCustomSettings(!showCustomSettings)}
                    className="py-3 px-6 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
                  >
                    <FaCog />
                    Custom Game
                  </button>
                )}
              </div>

              {showCustomSettings && adminPermissions.customGames && (
                <div className="bg-gray-600 p-4 rounded-lg space-y-4">
                  <h3 className="text-lg font-bold text-white">Custom Game Settings</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex items-center justify-between text-white">
                      <span>Enable Abilities</span>
                      <input
                        type="checkbox"
                        checked={customSettings.abilities}
                        onChange={(e) => setCustomSettings({
                          ...customSettings,
                          abilities: e.target.checked
                        })}
                        className="rounded"
                      />
                    </label>
                    
                    <div className="flex items-center justify-between text-white">
                      <span>Grid Size</span>
                      <select
                        value={customSettings.gridSize}
                        onChange={(e) => setCustomSettings({
                          ...customSettings,
                          gridSize: parseInt(e.target.value)
                        })}
                        className="bg-gray-700 text-white rounded px-2 py-1"
                      >
                        <option value={6}>6x6</option>
                        <option value={8}>8x8</option>
                        <option value={10}>10x10</option>
                        <option value={12}>12x12</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between text-white">
                      <span>Ship Count</span>
                      <select
                        value={customSettings.shipCount}
                        onChange={(e) => setCustomSettings({
                          ...customSettings,
                          shipCount: e.target.value
                        })}
                        className="bg-gray-700 text-white rounded px-2 py-1"
                      >
                        <option value="default">Default (5)</option>
                        <option value="few">Few (3)</option>
                        <option value="many">Many (7)</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between text-white">
                      <span>Turn Time Limit (sec)</span>
                      <input
                        type="number"
                        min="15"
                        max="120"
                        value={customSettings.turnTimeLimit}
                        onChange={(e) => setCustomSettings({
                          ...customSettings,
                          turnTimeLimit: parseInt(e.target.value)
                        })}
                        className="bg-gray-700 text-white rounded px-2 py-1 w-20"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateCustomGame}
                      className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                      Create Custom Game
                    </button>
                    <button
                      onClick={() => setShowCustomSettings(false)}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <p className="text-sm text-gray-400 mt-2">Room ID should be short and memorable (e.g. GAME1, TEST2)</p>
          </div>
        </div>
        
        <AdminControls 
          rooms={rooms} 
          adminId={adminId}
          adminDisplayName={adminDisplayName}
          onJoinRoom={(roomId) => navigate(`/admin/room/${roomId}`)}
        />
      </div>
    </div>
  );
};

export default AdminPanel;