import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinRoom } from '../services/gameService';
import { FaUser, FaGamepad, FaArrowRight } from 'react-icons/fa';
import logo from '../assets/logo.png';
import '../App.css';

const Home = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');

  const handleJoinRoom = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!roomId.trim()) {
        throw new Error('Please enter a room code');
      }

      if (!playerName.trim()) {
        throw new Error('Please enter your name');
      }

      // Generate player ID
      const playerId = Math.random().toString(36).substring(2, 8).toUpperCase();
      // Convert room ID to uppercase for consistency
      const formattedRoomId = roomId.trim().toUpperCase();

      // Join the room
      const joinSuccess = await joinRoom(formattedRoomId, playerId, playerName.trim());
      
      if (!joinSuccess) {
        throw new Error('Failed to join room');
      }

      // Store player ID, name and room ID in local storage
      localStorage.setItem('battleshipPlayerId', playerId);
      localStorage.setItem('battleshipPlayerName', playerName.trim());
      localStorage.setItem('battleshipRoomId', formattedRoomId);

      // Navigate to ship placement page
      navigate(`/place-ships/${formattedRoomId}`, { replace: true });

    } catch (err) {
      console.error('❌ Failed to join room:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center battleship-bg p-3">
      <div className="bg-gray-800/90 backdrop-blur-sm p-5 sm:p-7 rounded-lg shadow-lg max-w-sm w-full">
        <div className="flex justify-center mb-4">
          <img src={logo} alt="Battleship Logo" className="h-auto w-auto" />
        </div>
        
        {error && (
          <div className="bg-red-500 text-white p-2 rounded mb-3 text-center text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3 sm:space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <FaUser className="text-gray-400 text-sm" />
            </div>
            <input
              type="text"
              placeholder="Enter Your Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full py-2 pl-9 pr-3 bg-gray-700 text-white rounded-lg text-sm"
            />
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <FaGamepad className="text-gray-400 text-sm" />
            </div>
            <input
              type="text"
              placeholder="Enter Room Code"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full py-2 pl-9 pr-3 bg-gray-700 text-white rounded-lg uppercase text-sm"
            />
          </div>
          
          <button
            onClick={handleJoinRoom}
            disabled={loading || !roomId || !playerName}
            className="w-full py-2 bg-green-600 text-white rounded-lg 
                     hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">Joining...</span>
              </>
            ) : (
              <>
                <span className="text-sm">Join Game</span>
                <FaArrowRight className="text-sm" />
              </>
            )}
          </button>
        </div>

        <div className="mt-3 sm:mt-4 text-center text-xs text-gray-400">
          <p>A game code is required to join.</p>
          <p>Ask the admin to provide you with a game code.</p>
        </div>
      </div>
    </div>
  );
};

export default Home;