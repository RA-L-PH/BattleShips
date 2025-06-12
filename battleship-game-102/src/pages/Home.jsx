import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinRoom } from '../services/gameService';
import { findOrCreateRandomRoom, createFriendlyGame } from '../services/gameModesService';
import { FaUser, FaGamepad, FaArrowRight, FaRandom, FaUsers, FaInfoCircle } from 'react-icons/fa';
import logo from '../assets/logo.png';
import '../App.css';

const Home = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gameMode, setGameMode] = useState('join'); // 'join', 'random', 'friendly'
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [friendlySettings, setFriendlySettings] = useState({
    abilities: true,
    gridSize: 8,
    shipCount: 'default'
  });

  // Generate player ID
  const generatePlayerId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

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

      const playerId = generatePlayerId();
      const formattedRoomId = roomId.trim().toUpperCase();

      // Join the room
      const joinSuccess = await joinRoom(formattedRoomId, playerId, playerName.trim());
      
      if (!joinSuccess) {
        throw new Error('Failed to join room');
      }

      // Store player info
      localStorage.setItem('battleshipPlayerId', playerId);
      localStorage.setItem('battleshipPlayerName', playerName.trim());
      localStorage.setItem('battleshipRoomId', formattedRoomId);

      // Navigate to ship placement page
      navigate(`/place-ships/${formattedRoomId}`, { replace: true });    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const handleRandomGame = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!playerName.trim()) {
        throw new Error('Please enter your name');
      }

      const playerId = generatePlayerId();
      
      // Use new autonomous room finding system
      const result = await findOrCreateRandomRoom(playerId, playerName.trim(), {
        abilities: true,
        gridSize: 8
      });

      // Store player info
      localStorage.setItem('battleshipPlayerId', playerId);
      localStorage.setItem('battleshipPlayerName', playerName.trim());
      localStorage.setItem('battleshipRoomId', result.roomId);

      if (result.isNewRoom) {
        // Created new room, waiting for opponent
        setError(`Room created! Waiting for opponent... Room ID: ${result.roomId}`);
        // We could navigate to a waiting screen or stay on home with status
        setTimeout(() => {
          navigate(`/place-ships/${result.roomId}`, { replace: true });
        }, 2000);
      } else {
        // Joined existing room, go directly to ship placement
        navigate(`/place-ships/${result.roomId}`, { replace: true });
      }    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFriendlyGame = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!playerName.trim()) {
        throw new Error('Please enter your name');
      }

      const playerId = generatePlayerId();
      
      // Create friendly game
      const roomId = await createFriendlyGame(playerId, playerName.trim(), friendlySettings);

      // Store player info
      localStorage.setItem('battleshipPlayerId', playerId);
      localStorage.setItem('battleshipPlayerName', playerName.trim());
      localStorage.setItem('battleshipRoomId', roomId);

      // Join the created room
      await joinRoom(roomId, playerId, playerName.trim());

      // Navigate to ship placement page
      navigate(`/place-ships/${roomId}`, { replace: true });    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderGameModeContent = () => {
    switch (gameMode) {
      case 'random':
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-white mb-2">Random Game</h3>
              <p className="text-sm text-gray-400">
                Get matched with a random opponent instantly!
              </p>
            </div>
            
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

            <button
              onClick={handleRandomGame}
              disabled={loading || !playerName}
              className="w-full py-2 bg-purple-600 text-white rounded-lg 
                       hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Searching...</span>
                </>
              ) : (
                <>
                  <FaRandom className="text-sm" />
                  <span className="text-sm">Find Random Game</span>
                </>
              )}
            </button>
          </div>
        );

      case 'friendly':
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-white mb-2">Friendly Game</h3>
              <p className="text-sm text-gray-400">
                Create a private game to play with friends
              </p>
            </div>
            
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

            {/* Friendly Game Settings */}
            <div className="bg-gray-700 p-3 rounded-lg space-y-3">
              <h4 className="text-white font-bold text-sm">Game Settings</h4>
              
              <label className="flex items-center justify-between text-white text-sm">
                <span>Enable Abilities</span>
                <input
                  type="checkbox"
                  checked={friendlySettings.abilities}
                  onChange={(e) => setFriendlySettings({
                    ...friendlySettings,
                    abilities: e.target.checked
                  })}
                  className="rounded"
                />
              </label>
              
              <div className="flex items-center justify-between text-white text-sm">
                <span>Grid Size</span>
                <select
                  value={friendlySettings.gridSize}
                  onChange={(e) => setFriendlySettings({
                    ...friendlySettings,
                    gridSize: parseInt(e.target.value)
                  })}
                  className="bg-gray-600 text-white rounded px-2 py-1"
                >
                  <option value={6}>6x6</option>
                  <option value={8}>8x8</option>
                  <option value={10}>10x10</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleCreateFriendlyGame}
              disabled={loading || !playerName}
              className="w-full py-2 bg-green-600 text-white rounded-lg 
                       hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Creating...</span>
                </>
              ) : (
                <>
                  <FaUsers className="text-sm" />
                  <span className="text-sm">Create Friendly Game</span>
                </>
              )}
            </button>
          </div>
        );

      default: // 'join'
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-white mb-2">Join Game</h3>
              <p className="text-sm text-gray-400">
                Enter a room code to join an existing game
              </p>
            </div>
            
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
              className="w-full py-2 bg-blue-600 text-white rounded-lg 
                       hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
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
        );
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

        {/* Game Mode Selector */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setGameMode('join')}
              className={`flex-1 py-2 px-3 rounded text-xs font-medium transition-colors ${
                gameMode === 'join' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Join Game
            </button>
            <button
              onClick={() => setGameMode('random')}
              className={`flex-1 py-2 px-3 rounded text-xs font-medium transition-colors ${
                gameMode === 'random' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Random
            </button>
            <button
              onClick={() => setGameMode('friendly')}
              className={`flex-1 py-2 px-3 rounded text-xs font-medium transition-colors ${
                gameMode === 'friendly' 
                  ? 'bg-green-600 text-white' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Friendly
            </button>
          </div>
        </div>        {/* Game Mode Content */}
        {renderGameModeContent()}
        
        {/* Game Guide Link */}
        <div className="mt-6 pt-4 border-t border-gray-600">
          <button
            onClick={() => navigate('/game-guide')}
            className="w-full py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
          >
            <FaInfoCircle className="text-sm" />
            <span className="text-sm">How to Play & Abilities Guide</span>
          </button>
        </div>
        
        {/* Admin access buttons removed - now accessed directly via URL */}
      </div>
    </div>
  );
};

export default Home;
