import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDatabase, ref, onValue, update } from 'firebase/database';
import { startGame, endGame, adminTriggerGodsHand } from '../services/adminService';
import GameBoard from '../components/GameBoard';
import { ABILITIES, grantAbility } from '../services/abilityService';
import { FaExchangeAlt, FaCrosshairs, FaShieldAlt } from 'react-icons/fa';

const AdminRoomView = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switchPositions, setSwitchPositions] = useState(false);
  const [counterMoves, setCounterMoves] = useState([]);
  const [showGodsHandControls, setShowGodsHandControls] = useState(false);
  const [godsHandTargetPlayer, setGodsHandTargetPlayer] = useState(null);
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

  const handleGodsHandActivation = async (playerIndex, quadrantIndex) => {
    try {
      if (!players[playerIndex]) return;
      
      const targetPlayerId = Object.keys(room.players)[playerIndex];
      const opponentId = Object.keys(room.players).find(id => id !== targetPlayerId);
      
      if (!targetPlayerId || !opponentId) return;
      
      await adminTriggerGodsHand(roomId, targetPlayerId, quadrantIndex);
      setShowGodsHandControls(false);
      // Show success message or toast
    } catch (error) {
      setError(error.message);
    }
  };

  // Helper function to get player grids
  const getPlayerGrids = () => {
    if (!room || !room.players) return [];
    
    return Object.entries(room.players).map(([playerId, playerData]) => ({
      playerId,
      name: playerData.name || playerId,
      grid: playerData.PlacementData?.grid || Array(8).fill().map(() => Array(8).fill({ ship: null, hit: false, miss: false })),
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {orderedPlayers.map((player, index) => (
                <div key={player.playerId} className="bg-gray-700 p-4 rounded-lg">
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
                  </div>
                  <div className="flex justify-center">
                    <div className="transform transition-all duration-300">
                      <GameBoard 
                        grid={player.grid}
                        isPlayerGrid={true}
                        reversed={index === 0}
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
                  <li>Players can have one special ability (God's Hand) per game</li>
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
                            {['attack', 'defense', 'support', 'special'].map(abilityType => (
                              <React.Fragment key={`${player.playerId}-${abilityType}`}>
                                {/* Type header row */}
                                <tr className="border-b border-gray-700 bg-gray-800">
                                  <td 
                                    colSpan="4" 
                                    className={`py-2 px-3 font-bold text-sm uppercase text-center ${
                                      abilityType === 'attack' ? 'text-red-400' : 
                                      abilityType === 'defense' ? 'text-blue-400' : 
                                      abilityType === 'support' ? 'text-yellow-400' : 'text-purple-400'
                                    }`}
                                  >
                                    {abilityType} Abilities
                                  </td>
                                </tr>
                                
                                {/* Ability rows */}
                                {Object.entries(ABILITIES)
                                  .filter(([key, _]) => key !== 'GODS_HAND')  // Filter out GODS_HAND
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
                                                  abilityType === 'support' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-purple-600 hover:bg-purple-700'}
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
          
          {gameStarted && !gameOver && (
            <div className="mb-8 bg-gray-800 p-4 rounded-lg">
              <h3 className="text-xl font-bold text-white mb-4">Admin Special: God's Hand</h3>
              
              {!showGodsHandControls ? (
                <button
                  onClick={() => setShowGodsHandControls(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Activate God's Hand
                </button>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-300">Select which player will be credited with using God's Hand:</p>
                  <div className="flex gap-4">
                    {players.map((player, index) => (
                      <button
                        key={player.playerId}
                        onClick={() => setGodsHandTargetPlayer(index)}
                        className={`px-4 py-2 rounded ${
                          godsHandTargetPlayer === index ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        {player.name}
                      </button>
                    ))}
                  </div>
                  
                  {godsHandTargetPlayer !== null && (
                    <>
                      <p className="text-gray-300">Select a quadrant on enemy's board:</p>
                      <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
                        {[0, 1, 2, 3].map((quadrant) => (
                          <button
                            key={quadrant}
                            onClick={() => handleGodsHandActivation(godsHandTargetPlayer, quadrant)}
                            className="relative p-8 border-2 border-purple-500 bg-gray-700 hover:bg-gray-600 rounded"
                          >
                            <div className="absolute inset-0 flex items-center justify-center text-white text-xl">
                              Quadrant {quadrant + 1}
                            </div>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        God's Hand will hit ALL cells in the selected quadrant, ignoring all defenses
                      </p>
                      <button
                        onClick={() => {
                          setShowGodsHandControls(false);
                          setGodsHandTargetPlayer(null);
                        }}
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              )}
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
                          if (['NUKE', 'ANNIHILATE', 'GODS_HAND'].includes(move.name)) {
                            target = move.cellLabel || `${String.fromCharCode(65 + move.targetCol)}${move.targetRow + 1}`;
                            result = move.hitCount !== undefined 
                              ? `Hit ${move.hitCount} ship parts` 
                              : move.extraHits !== undefined 
                                ? `Hit ${move.extraHits.length + (move.isHit ? 1 : 0)} cells` 
                                : 'Applied';
                          } else if (move.name === 'SCANNER') {
                            target = move.cellLabel || `${String.fromCharCode(65 + move.targetCol)}${move.targetRow + 1} (2x2 area)`;
                            result = `Found ${move.shipCount} ship parts`;
                          } else if (move.name === 'REINFORCEMENT') {
                            target = move.cellLabel || `${String.fromCharCode(65 + move.targetCol)}${move.targetRow + 1} (${move.isVertical ? 'vertical' : 'horizontal'})`;
                            result = 'Ship added';
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
        </div>
      </div>
    </div>
  );
};

export default AdminRoomView;