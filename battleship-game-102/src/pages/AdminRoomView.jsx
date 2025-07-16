import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDatabase, ref, onValue, update } from 'firebase/database';
import { startGame, endGame, adminTriggerGodsHand, adminDeclareWinner } from '../services/adminService';
import GameBoard from '../components/GameBoard';
import { ABILITIES, grantAbility } from '../services/abilityService';
import { FaExchangeAlt, FaCrosshairs, FaShieldAlt, FaPlay, FaPause, FaCrown } from 'react-icons/fa';

const AdminRoomView = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switchPositions, setSwitchPositions] = useState(false);
  const [counterMoves, setCounterMoves] = useState([]);
  const [godsHandTargetPlayer, setGodsHandTargetPlayer] = useState(null);
  const [pendingSettings, setPendingSettings] = useState({});
  const adminId = localStorage.getItem('adminId');
  const adminDisplayName = localStorage.getItem('adminDisplayName') || 'Admin';

  useEffect(() => {
    if (!adminId) {
      navigate('/admin-login');
      return;
    }

    const db = getDatabase();
    const roomRef = ref(db, `rooms/${roomId}`);

    const unsubscribe = onValue(roomRef, (snapshot) => {
      setLoading(true);
      const data = snapshot.val();
      
      if (!data) {
        setError('Room not found');
        setLoading(false);
        return;
      }
      
      if (data.admin !== adminId) {
        setError('You are not the admin of this room');
        setLoading(false);
        return;
      }
      
      setRoom(data);
      setError(null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [roomId, adminId, navigate]);

  useEffect(() => {
    if (room && room.moves) {
      // Extract all counter moves
      const counterAttacks = Object.entries(room.moves)
        .filter(([_, move]) => move.type === 'counter')
        .map(([timestamp, move]) => ({
          timestamp: parseInt(timestamp),
          ...move
        }))
        .sort((a, b) => b.timestamp - a.timestamp);
      
      setCounterMoves(counterAttacks);
    }
  }, [room]);

  const handleStartGame = async () => {
    try {
      const db = getDatabase();
      const roomRef = ref(db, `rooms/${roomId}`);
      
      // Start countdown from 3
      await update(roomRef, { countdown: 3 });
      
      // Create countdown timer
      setTimeout(async () => {
        await update(roomRef, { countdown: 2 });
        
        setTimeout(async () => {
          await update(roomRef, { countdown: 1 });
          
          setTimeout(async () => {
            // Start the game after countdown
            await startGame(roomId);
          }, 1000);
        }, 1000);
      }, 1000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEndGame = async () => {
    try {
      await endGame(roomId);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGrantAbility = async (playerId, abilityKey) => {
    try {
      await grantAbility(roomId, playerId, abilityKey);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTogglePause = async () => {
    try {
      const isPaused = room?.isPaused || false;
      const db = getDatabase();
      await update(ref(db, `rooms/${roomId}`), {
        isPaused: !isPaused
      });

      // No need to track pause time anymore since we're using direct time values
    } catch (err) {
      setError(err.message);
    }
  };
  // Helper function to get player grids
  const getPlayerGrids = () => {
    if (!room || !room.players) return [];
    
    // Get the grid size from room settings
    const gridSize = room.settings?.gridSize || 8;
    
    return Object.entries(room.players).map(([playerId, playerData]) => ({
      playerId,
      name: playerData.name || playerId,
      grid: playerData.PlacementData?.grid || Array(gridSize).fill().map(() => Array(gridSize).fill({ ship: null, hit: false, miss: false })),
      ready: playerData.ready || false
    }));
  };

  const RecentCounters = ({ moves }) => {
    if (!moves || moves.length === 0) return null;
    
    // Only show the 3 most recent counters
    const recentMoves = moves.slice(0, 3);
    
    return (
      <div className="mt-4 bg-blue-900/30 p-3 rounded-lg border border-blue-800">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
          <FaShieldAlt className="text-blue-400" />
          Recent Counter Attacks
        </h3>
        <div className="space-y-2">
          {recentMoves.map((move) => {
            const attacker = players.find(p => p.playerId === move.attackerId)?.name || move.attackerId;
            const defender = players.find(p => p.playerId === move.defenderId)?.name || move.defenderId;
            
            // Get coordinates in human-readable format
            const targetCoords = move.cellLabel || 
              `${String.fromCharCode(65 + move.targetCol)}${move.targetRow + 1}`;
            
            // Get original attack coordinates
            const originalCoords = move.originalAttack ? 
              `${String.fromCharCode(65 + move.originalAttack.col)}${move.originalAttack.row + 1}` : 
              'unknown';
            
            return (
              <div key={move.timestamp} className="bg-blue-950/50 p-2 rounded border border-blue-800 text-sm">
                <div className="flex items-center justify-between">
                  <span>
                    <span className="font-bold text-blue-400">{attacker}</span> counter-attacked
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(move.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center mt-1 text-white">
                  <span className="flex items-center gap-1">
                    <FaCrosshairs className="text-red-400" />
                    Hit at {targetCoords}
                  </span>
                  <FaExchangeAlt className="mx-2 text-gray-400" />
                  <span>Against <span className="font-bold text-yellow-400">{defender}</span></span>
                </div>
                <div className="text-xs mt-1 text-gray-300 italic">
                  Triggered by hit at {originalCoords}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-900 p-8 flex items-center justify-center"><div className="text-white text-xl">Loading...</div></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500 text-white p-4 rounded-lg">{error}</div>
          <button onClick={() => navigate('/admin')} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">Back to Admin Panel</button>
        </div>
      </div>
    );
  }

  const players = getPlayerGrids();
  const orderedPlayers = switchPositions && players.length === 2 ? [players[1], players[0]] : players;
  const roomCode = roomId;
  const allPlayersReady = players.length === 2 && players.every(p => p.ready);
  const gameStarted = room?.gameStarted || false;
  const gameOver = room?.gameOver || false;
  const countdown = room?.countdown;

  const handleSettingChange = (setting, value) => {
    setPendingSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleSaveSettings = async () => {
    try {
      const db = getDatabase();
      const roomRef = ref(db, `rooms/${roomId}`);
      
      const updates = {};
      Object.entries(pendingSettings).forEach(([key, value]) => {
        updates[`settings/${key}`] = value;
      });
      
      await update(roomRef, updates);
      setPendingSettings({});
      setError(null);
    } catch (err) {
      setError(`Failed to save settings: ${err.message}`);
    }
  };

  const handleGodsHandActivation = async (targetPlayerId, quadrantIndex) => {
    try {
      if (!targetPlayerId || !room.players[targetPlayerId]) return;
      
      const opponentId = Object.keys(room.players).find(id => id !== targetPlayerId);
      
      if (!opponentId) return;
      
      await adminTriggerGodsHand(roomId, opponentId, quadrantIndex);
      setGodsHandTargetPlayer(null);
      setError(null); // Clear any previous errors
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDeclareWinner = async (winnerId) => {
    try {
      await adminDeclareWinner(roomId, winnerId, adminId);
      setError(null);
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Admin View: Room {roomId}</h1>
              <p className="text-gray-400 mt-1">Managed by {adminDisplayName}</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin')}
                className="bg-gray-600 text-white px-4 py-2 rounded"
              >
                Back
              </button>
              
              {players.length === 2 && (
                <button 
                  onClick={() => setSwitchPositions(!switchPositions)}
                  className="bg-purple-600 text-white px-4 py-2 rounded"
                >
                  Switch Positions
                </button>
              )}
              
              {!gameStarted && allPlayersReady && (
                <>
                  {countdown && (
                    <div className="bg-green-600 text-white px-4 py-2 rounded-lg animate-pulse">
                      Game starting in {countdown}...
                    </div>
                  )}
                  <button
                    onClick={handleStartGame}
                    className="bg-green-600 text-white px-4 py-2 rounded"
                  >
                    Start Game
                  </button>
                </>
              )}
              
              {gameStarted && !gameOver && (
                <button
                  onClick={handleEndGame}
                  className="bg-red-600 text-white px-4 py-2 rounded"
                >
                  End Game
                </button>
              )}
            </div>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg mb-6">
            <h2 className="text-xl font-bold text-white mb-2">Room Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-white">
                <p><span className="font-bold">Room Code:</span> {roomCode}</p>
                <p><span className="font-bold">Status:</span> {room.status}</p>
                <p><span className="font-bold">Players:</span> {players.length}/2</p>
              </div>
              <div className="text-white">
                <p><span className="font-bold">Created:</span> {new Date(room.createdAt).toLocaleString()}</p>
                <p>
                  <span className="font-bold">Current Turn:</span> {room.currentTurn ? 
                    players.find(p => p.playerId === room.currentTurn)?.name || room.currentTurn : 'Not started'}
                </p>
                <p>
                  <span className="font-bold">Winner:</span> {room.winner ? 
                    players.find(p => p.playerId === room.winner)?.name || room.winner : 'None yet'}
                </p>
              </div>
            </div>
          </div>

          {counterMoves.length > 0 && (
            <RecentCounters moves={counterMoves} />
          )}
          
          <div className="flex flex-col gap-8">
            <h2 className="text-2xl font-bold text-white">Player Boards</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 admin-grid admin-grid-compact">
              {orderedPlayers.map((player, index) => (
                <div key={player.playerId} className="bg-gray-700 p-3 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">
                      {player.name} 
                      <span className="ml-2 text-sm text-gray-400">({player.playerId})</span>
                    </h3>
                    <div className={`px-3 py-1 rounded text-white font-bold ${player.ready 
                      ? 'bg-green-600 animate-pulse' 
                      : 'bg-yellow-600'}`}
                    >
                      {player.ready ? 'READY ✓' : 'NOT READY'}
                    </div>
                  </div>                  <div className="flex justify-center">
                    <div className="admin-board-container admin-compact-board transform transition-all duration-300">
                      <GameBoard 
                        grid={player.grid}
                        gridSize={room.settings?.gridSize || 8}
                        isPlayerGrid={true}
                        reversed={index === 0}
                        adminView={true}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-2xl font-bold text-white mb-4">Ability Controls</h2>
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="text-white mb-4">
                <p>Grant abilities to players when they answer technical questions correctly:</p>
                <ul className="list-disc list-inside text-sm mt-1">
                  <li>Each player can have up to 3 easy abilities active at once</li>
                  <li>Abilities can only be used once per game (no repeating)</li>
                  <li>Players have three abilities (one from each category) per game</li>
                  <li>JAM ability lasts for 2 rounds</li>
                  <li>Using an ability counts as a turn</li>
                </ul>
              </div>
              
              {/* Side-by-side player abilities with position switching */}
              <div className="flex flex-col md:flex-row gap-4">
                {/* This will respect the switchPositions state */}
                {[...players]
                  .sort((a, b) => switchPositions ? -1 : 1)
                  .map((player) => (
                    <div 
                      key={`abilities-${player.playerId}`} 
                      className="flex-1 border border-gray-600 rounded-lg overflow-hidden"
                    >
                      <div className="bg-gray-800 p-3 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white">
                          {player.name}'s Abilities
                        </h3>
                        <div className="text-xs bg-gray-700 px-2 py-1 rounded">
                          {player.playerId}
                        </div>
                      </div>
                      
                      {/* Ability table */}
                      <div className="p-3">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-gray-600">
                              <th className="py-2 px-3 text-left text-white">Ability</th>
                              <th className="py-2 px-3 text-center text-white">Type</th>
                              <th className="py-2 px-3 text-center text-white">Status</th>
                              <th className="py-2 px-3 text-center text-white">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {['attack', 'defense', 'support'].map(abilityType => (
                              <React.Fragment key={`${player.playerId}-${abilityType}`}>
                                {/* Type header row */}
                                <tr className="border-b border-gray-700 bg-gray-800">
                                  <td 
                                    colSpan="4" 
                                    className={`py-2 px-3 font-bold text-sm uppercase text-center ${
                                      abilityType === 'attack' ? 'text-red-400' : 
                                      abilityType === 'defense' ? 'text-blue-400' : 
                                      abilityType === 'support' ? 'text-yellow-400' : 'text-gray-400'
                                    }`}
                                  >
                                    {abilityType} Abilities
                                  </td>
                                </tr>
                                
                                {/* Ability rows */}
                                {Object.entries(ABILITIES)
                                  .filter(([_, ability]) => ability.type === abilityType)
                                  .map(([key, ability]) => {
                                    const playerAbility = player.abilities?.[key];
                                    const isActive = playerAbility?.active && !playerAbility?.used;
                                    const isUsed = playerAbility?.used;
                                    
                                    return (
                                      <tr 
                                        key={`${player.playerId}-${key}`} 
                                        className={`border-b border-gray-700 ${
                                          isActive ? 'bg-green-900/30' : 
                                          isUsed ? 'bg-gray-800/30' : ''
                                        }`}
                                      >
                                        <td className="py-2 px-3">
                                          <div className="font-medium text-white">{ability.name}</div>
                                          <div className="text-xs text-gray-400">{ability.description}</div>
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                          <span className={`
                                            inline-block px-2 py-1 rounded-full text-xs font-bold
                                            ${abilityType === 'attack' ? 'bg-red-900 text-red-300' : 
                                              abilityType === 'defense' ? 'bg-blue-900 text-blue-300' : 
                                              abilityType === 'support' ? 'bg-yellow-900 text-yellow-300' : 'bg-purple-900 text-purple-300'}
                                          `}>
                                            {abilityType.toUpperCase()}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                          {isActive && (
                                            <span className="inline-block bg-green-500/20 border border-green-500 text-green-400 text-xs px-2 py-1 rounded">
                                              ACTIVE
                                            </span>
                                          )}
                                          {isUsed && (
                                            <span className="inline-block bg-gray-500/20 border border-gray-500 text-gray-400 text-xs px-2 py-1 rounded">
                                              USED
                                            </span>
                                          )}
                                          {!isActive && !isUsed && (
                                            <span className="inline-block bg-blue-500/20 border border-blue-500 text-blue-400 text-xs px-2 py-1 rounded">
                                              AVAILABLE
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                          {!playerAbility?.active && (
                                            <button
                                              onClick={() => handleGrantAbility(player.playerId, key)}
                                              className={`
                                                text-white text-xs px-3 py-1 rounded hover:opacity-90 transition-colors
                                                ${abilityType === 'attack' ? 'bg-red-600 hover:bg-red-700' : 
                                                  abilityType === 'defense' ? 'bg-blue-600 hover:bg-blue-700' : 
                                                  abilityType === 'support' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-600 hover:bg-gray-700'}
                                              `}
                                            >
                                              Grant
                                            </button>
                                          )}
                                          {playerAbility?.active && key === 'JAM' && !playerAbility?.used && (
                                            <div className="text-xs text-white">
                                              Duration: {playerAbility.duration || 2} rounds
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          
          {/* God's Hand Admin Controls - Only during active games */}
          {gameStarted && !gameOver && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <FaCrown className="text-purple-400" />
                God's Hand (Admin Only)
              </h2>
              <div className="bg-gray-700 p-4 rounded-lg border border-purple-500">
                <div className="text-white mb-4">
                  <p className="text-purple-300 font-semibold">Admin Power: Destroy entire 4x4 quadrants</p>
                  <p className="text-sm text-gray-300 mt-1">Select a player, then choose which quadrant to destroy on their opponent's grid</p>
                </div>
                
                {!godsHandTargetPlayer ? (
                  <div>
                    <h3 className="text-white font-bold mb-3">Select Target Player:</h3>
                    <div className="flex gap-3">
                      {players.map((player, index) => (
                        <button
                          key={player.playerId}
                          onClick={() => setGodsHandTargetPlayer(player.playerId)}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <FaCrosshairs />
                          Target {player.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-white font-bold mb-2">
                        Targeting: {players.find(p => p.playerId === godsHandTargetPlayer)?.name}
                      </h3>
                      <p className="text-sm text-gray-300">
                        Select which 4x4 quadrant to destroy on their opponent's grid:
                      </p>
                    </div>
                    
                    <div className="flex flex-col gap-4">
                      {/* 2x2 Grid of Quadrants with labels */}
                      <div className="text-center">
                        <div className="text-xs text-gray-400 mb-2">
                          8x8 Grid divided into 4x4 quadrants:
                        </div>
                        <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
                          {[
                            { index: 0, label: 'Q1', position: 'Top-Left', coords: 'A1-D4' },
                            { index: 1, label: 'Q2', position: 'Top-Right', coords: 'E1-H4' },
                            { index: 2, label: 'Q3', position: 'Bottom-Left', coords: 'A5-D8' },
                            { index: 3, label: 'Q4', position: 'Bottom-Right', coords: 'E5-H8' }
                          ].map((quadrant) => (
                            <button
                              key={quadrant.index}
                              onClick={() => handleGodsHandActivation(godsHandTargetPlayer, quadrant.index)}
                              className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg text-sm font-bold transition-colors border-2 border-red-500 hover:border-red-300 flex flex-col items-center"
                            >
                              <div className="text-lg">{quadrant.label}</div>
                              <div className="text-xs opacity-75">{quadrant.position}</div>
                              <div className="text-xs opacity-60">{quadrant.coords}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => setGodsHandTargetPlayer(null)}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Admin Declare Winner - Only during active games */}
          {gameStarted && !gameOver && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <FaCrown className="text-yellow-400" />
                Declare Winner (Admin Only)
              </h2>
              <div className="bg-gray-700 p-4 rounded-lg border border-yellow-500">
                <div className="text-white mb-4">
                  <p className="text-yellow-300 font-semibold">Admin Power: Manually declare game winner</p>
                  <p className="text-sm text-gray-300 mt-1">Use this to end the game and declare a winner regardless of current game state</p>
                </div>
                
                <div>
                  <h3 className="text-white font-bold mb-3">Select Winner:</h3>
                  <div className="flex gap-3">
                    {players.map((player) => (
                      <button
                        key={player.playerId}
                        onClick={() => handleDeclareWinner(player.playerId)}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <FaCrown />
                        Declare {player.name} Winner
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {gameStarted && room.moves && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-white mb-4">Game Moves</h2>
              <div className="bg-gray-700 p-4 rounded-lg max-h-64 overflow-y-auto">
                <table className="w-full text-white">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="p-2 text-left">Time</th>
                      <th className="p-2 text-left">Player</th>
                      <th className="p-2 text-left">Action</th>
                      <th className="p-2 text-left">Target</th>
                      <th className="p-2 text-left">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(room.moves)
                      .sort(([a], [b]) => parseInt(b) - parseInt(a))
                      .map(([timestamp, move]) => {
                        const playerName = players.find(p => p.playerId === move.playerId)?.name || move.playerId;
                        
                        // Determine move type and display appropriate information
                        let action, target, result, resultDetails = null;
                        
                        if (move.type === 'ability') {
                          const ability = ABILITIES[move.name];
                          const abilityType = ability?.type || 'ability';
                          
                          // Set action with appropriate style based on type
                          action = (
                            <div>
                              <span className={`
                                ${abilityType === 'attack' ? 'text-red-400' : 
                                 abilityType === 'defense' ? 'text-blue-400' : 
                                 abilityType === 'support' ? 'text-yellow-400' : 'text-purple-400'}
                              `}>
                                Used {ability?.name || move.name}
                              </span>
                              <div className="text-xs mt-1 bg-gray-800 px-1.5 py-0.5 rounded inline-block">
                                {abilityType.toUpperCase()}
                              </div>
                            </div>
                          );
                          
                          // Different display based on ability type
                          if (['NUKE', 'ANNIHILATE'].includes(move.name)) {
                            target = move.cellLabel || `${String.fromCharCode(65 + move.targetCol)}${move.targetRow + 1}`;
                            result = move.hitCount !== undefined 
                              ? `Hit ${move.hitCount} ship parts` 
                              : move.extraHits !== undefined 
                                ? `Hit ${move.extraHits.length + (move.isHit ? 1 : 0)} cells` 
                                : 'Applied';
                          } else if (move.name === 'GODS_HAND') {
                            target = `Quadrant ${(move.quadrantIndex || 0) + 1}`;
                            result = `Destroyed ${move.affectedCells?.length || 16} cells, hit ${move.hitCount || 0} ships`;
                          } else if (move.name === 'SCANNER') {
                            target = move.cellLabel || `${String.fromCharCode(65 + move.targetCol)}${move.targetRow + 1} (2x2 area)`;
                            result = `Found ${move.shipCount} ship parts`;
                          } else if (move.name === 'HACKER') {
                            target = 'Enemy ship';
                            result = move.revealedRow !== undefined 
                              ? `Revealed at ${String.fromCharCode(65 + move.revealedCol)}${move.revealedRow + 1}` 
                              : 'Ship revealed';
                          } else {
                            target = 'N/A';
                            result = 'Activated';
                          }
                        } else if (move.type === 'jam') {
                          action = (
                            <div>
                              <span className="text-blue-400">Blocked attack</span>
                              <div className="text-xs mt-1 bg-gray-800 px-1.5 py-0.5 rounded inline-block">
                                DEFENSE
                              </div>
                            </div>
                          );
                          target = move.targetAbility || 'Enemy attack';
                          result = 'JAM Active';
                        } else if (move.type === 'counter') {
                          action = (
                            <div>
                              <span className="text-blue-400 flex items-center gap-1">
                                <FaShieldAlt />
                                Counter-attacked
                              </span>
                              <div className="text-xs mt-1 bg-blue-900 px-1.5 py-0.5 rounded inline-block text-blue-300 border border-blue-700">
                                COUNTER
                              </div>
                            </div>
                          );
                          
                          // Target cell - use cellLabel if available, otherwise construct it
                          target = move.cellLabel || `${String.fromCharCode(65 + move.targetCol)}${move.targetRow + 1}`;
                          
                          // More detailed result showing the cause
                          const originalCell = move.originalAttack ? 
                            `${String.fromCharCode(65 + move.originalAttack.col)}${move.originalAttack.row + 1}` : 
                            'unknown';
                          
                          result = "Automatic hit"; // String value instead of JSX
                          resultDetails = ( // Store complex JSX in a separate variable
                            <div className="text-xs mt-1 bg-gray-800 px-2 py-0.5 rounded">
                              Triggered by hit at {originalCell}
                            </div>
                          );
                        } else if (move.type === 'timeout') {
                          action = (
                            <div>
                              <span className="text-yellow-400">Turn expired</span>
                              <div className="text-xs mt-1 bg-yellow-800 px-1.5 py-0.5 rounded inline-block">
                                TIMEOUT
                              </div>
                            </div>
                          );
                          target = "N/A";
                          result = "Turn skipped";
                        } else if (move.type === 'admin_action') {
                          action = (
                            <div>
                              <span className="text-purple-400 flex items-center gap-1">
                                <FaCrown />
                                Admin Action
                              </span>
                              <div className="text-xs mt-1 bg-purple-900 px-1.5 py-0.5 rounded inline-block text-purple-300">
                                {move.action}
                              </div>
                            </div>
                          );
                          
                          if (move.action === 'DECLARE_WINNER') {
                            const winnerName = players.find(p => p.playerId === move.winnerId)?.name || move.winnerId;
                            target = winnerName;
                            result = "Game Ended";
                          } else {
                            target = "N/A";
                            result = "Admin Command";
                          }
                        } else if (move.type === 'emote') {
                          action = (
                            <div>
                              <span className={`flex items-center gap-1 ${
                                move.category === 'mock' ? 'text-red-400' :
                                move.category === 'praise' ? 'text-green-400' : 'text-blue-400'
                              }`}>
                                😊 Emote
                              </span>
                              <div className={`text-xs mt-1 px-1.5 py-0.5 rounded inline-block ${
                                move.category === 'mock' ? 'bg-red-900 text-red-300' :
                                move.category === 'praise' ? 'bg-green-900 text-green-300' : 'bg-blue-900 text-blue-300'
                              }`}>
                                {move.category.toUpperCase()}
                              </div>
                            </div>
                          );
                          target = "Opponent";
                          result = move.text;
                        } else {
                          // Regular attack
                          action = (
                            <div>
                              <span>Attack</span>
                              <div className="text-xs mt-1 bg-gray-800 px-1.5 py-0.5 rounded inline-block">
                                NORMAL
                              </div>
                            </div>
                          );
                          
                          target = move.cellLabel || `${String.fromCharCode(65 + move.col)}${move.row + 1}`;
                          result = move.isHit ? 'Hit' : 'Miss';
                        }
                        
                        return (
                          <tr key={timestamp} className="border-b border-gray-600">
                            <td className="p-2">{new Date(parseInt(timestamp)).toLocaleTimeString()}</td>
                            <td className="p-2">{playerName}</td>
                            <td className="p-2">{action}</td>
                            <td className="p-2">{target}</td>
                            <td className="p-2">
                              <span className={
                                typeof result === 'string' && (result.includes('Hit') || result === 'Automatic hit')
                                  ? 'text-green-500' 
                                  : result === 'Miss' 
                                    ? 'text-red-500' 
                                    : 'text-blue-500'
                              }>
                                {result}
                              </span>
                              {resultDetails && resultDetails}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          <div className="mt-8 flex flex-wrap gap-3">
            {/* Existing buttons */}
            
            {gameStarted && !gameOver && (
              <button
                onClick={handleTogglePause}
                className={`px-4 py-2 rounded text-white flex items-center ${room?.isPaused ? 'bg-green-600' : 'bg-yellow-600'}`}
              >
                {room?.isPaused ? <><FaPlay className="mr-2" /> Resume Game</> : <><FaPause className="mr-2" /> Pause Game</>}
              </button>
            )}
          </div>
        </div>
        
        {/* Game Settings Panel - Only show for custom games or before game starts */}
        {(roomId.startsWith('CUSTOM_') || !gameStarted) && (
          <div className="bg-gray-700 p-4 rounded-lg mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Game Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-white font-bold mb-2">Grid Size</label>
                <select 
                  value={room.settings?.gridSize || 8}
                  onChange={(e) => handleSettingChange('gridSize', parseInt(e.target.value))}
                  disabled={gameStarted}
                  className="w-full p-2 bg-gray-600 text-white rounded disabled:opacity-50"
                >
                  <option value={6}>6x6</option>
                  <option value={8}>8x8</option>
                  <option value={10}>10x10</option>
                  <option value={12}>12x12</option>
                </select>
              </div>
              
              <div>
                <label className="block text-white font-bold mb-2">Turn Time Limit</label>
                <select 
                  value={room.settings?.turnTimeLimit || 60}
                  onChange={(e) => handleSettingChange('turnTimeLimit', parseInt(e.target.value))}
                  disabled={gameStarted}
                  className="w-full p-2 bg-gray-600 text-white rounded disabled:opacity-50"
                >
                  <option value={30}>30 seconds</option>
                  <option value={60}>1 minute</option>
                  <option value={120}>2 minutes</option>
                  <option value={300}>5 minutes</option>
                  <option value={0}>No limit</option>
                </select>
              </div>
              
              <div>
                <label className="block text-white font-bold mb-2">Abilities</label>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={room.settings?.abilities !== false}
                    onChange={(e) => handleSettingChange('abilities', e.target.checked)}
                    disabled={gameStarted}
                    className="mr-2 disabled:opacity-50"
                  />
                  <span className="text-white">Enable special abilities</span>
                </div>
              </div>
            </div>
            
            {roomId.startsWith('CUSTOM_') && !gameStarted && (
              <div className="mt-4 pt-4 border-t border-gray-600">
                <button
                  onClick={handleSaveSettings}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-2"
                >
                  Save Settings
                </button>
                <span className="text-gray-400 text-sm">
                  Custom game settings will be applied when the game starts
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRoomView;