import React, { useState, useEffect } from 'react';
import { getDatabase, ref, onValue } from 'firebase/database';
import { createGameAsAdmin } from '../services/adminService';
import { useNavigate } from 'react-router-dom';
import AdminControls from '../components/AdminControls';
import { FaPlus, FaSignOutAlt, FaGamepad } from 'react-icons/fa';

const AdminPanel = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [newRoomId, setNewRoomId] = useState('');
  const [error, setError] = useState('');
  const [adminId, setAdminId] = useState(localStorage.getItem('adminId') || '');
  const adminDisplayName = localStorage.getItem('adminDisplayName') || 'Admin';

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

  const handleCreateRoom = async () => {
    try {
      setError('');
      if (!newRoomId.trim()) {
        setError('Please enter a room ID');
        return;
      }

      await createGameAsAdmin(newRoomId.trim().toUpperCase(), adminId);
      setNewRoomId('');
      
      // Navigate to admin view for this room
      navigate(`/admin/room/${newRoomId.trim().toUpperCase()}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('adminId');
    localStorage.removeItem('adminDisplayName');
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
            </div>
            <button 
              onClick={handleLogout} 
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              <FaSignOutAlt />
              Logout
            </button>
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
                className="py-3 px-6 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
              >
                <FaPlus />
                Create
              </button>
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