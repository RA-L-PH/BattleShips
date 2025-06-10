import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { database } from '../services/firebaseConfig';
import GameBoard from '../components/GameBoard';
import AbilityPanel from '../components/AbilityPanel';
import GameStatus from '../components/GameStatus';
import StopWatch from '../components/StopWatch';
import Toast from '../components/Toast';
import TurnTimer from '../components/TurnTimer';
import { makeMove } from '../services/gameService';
import { getGridSize } from '../services/gameService';
import { 
  activateNuke, 
  activateScanner, 
  activateHacker, 
  activateReinforcement, 
  activateAnnihilate,
  activateCounterAttack
} from '../services/abilityService';

const GameRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playerId, setPlayerId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [playerAbilities, setPlayerAbilities] = useState({});
  const [activeAbility, setActiveAbility] = useState(null);
  const [reinforcementVertical, setReinforcementVertical] = useState(false);
  const [annihilateVertical, setAnnihilateVertical] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [hackerResult, setHackerResult] = useState(null);
  const [toast, setToast] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [gridSize, setGridSize] = useState(8);
  const [turnTimeLimit, setTurnTimeLimit] = useState(60);

  // Create initial empty grid based on dynamic size
  const createEmptyGrid = useCallback((size = 8) => Array(size).fill().map(() => 
    Array(size).fill().map(() => ({ ship: null, hit: false, miss: false }))
  ), []);

  // Initialize grids with empty state
  const [playerGrid, setPlayerGrid] = useState(() => createEmptyGrid(8));
  const [opponentGrid, setOpponentGrid] = useState(() => createEmptyGrid(8));
  
  // Helper function to convert coordinates to human-readable format
  const getCoordinateLabel = useCallback((col, row) => {
    const colLabels = Array.from({ length: gridSize }, (_, i) => String.fromCharCode(65 + i));
    const rowLabels = Array.from({ length: gridSize }, (_, i) => String(gridSize - i));
    return `${colLabels[col]}${rowLabels[row]}`;
  }, [gridSize]);

  // Function to count remaining ships in a grid
  const countRemainingShips = (grid) => {
    if (!grid) return 0;
    
    // Track all ships and their segments
    const shipSegmentCounts = {};
    const shipHitCounts = {};
      grid.forEach((row) => {
      row.forEach((cell) => {
        if (cell.ship) {
          const shipId = cell.ship;
          // Count total segments per ship
          shipSegmentCounts[shipId] = (shipSegmentCounts[shipId] || 0) + 1;
          
          // Count hit segments per ship
          if (cell.hit) {
            shipHitCounts[shipId] = (shipHitCounts[shipId] || 0) + 1;
          }
        }
      });
    });
    
    // Count ships that are not completely sunk
    let remainingShips = 0;
    Object.keys(shipSegmentCounts).forEach(shipId => {
      // A ship is remaining if not all its segments are hit
      if (!shipHitCounts[shipId] || shipHitCounts[shipId] < shipSegmentCounts[shipId]) {
        remainingShips++;
      }    });
    
    return remainingShips;
  };  // Initialize player ID from localStorage first
  useEffect(() => {
    const storedPlayerId = localStorage.getItem('battleshipPlayerId');
    
    if (storedPlayerId) {
      setPlayerId(storedPlayerId);
    } else {
      navigate('/');
    }
  }, [navigate, roomId]);

  // Subscribe to room updates (only after playerId is set)
  useEffect(() => {
    if (!roomId || !playerId) {
      return; // Don't navigate here, let the first effect handle it
    }
      const roomRef = ref(database, `rooms/${roomId}`);
    let hasReceivedData = false;
    let timeoutId = null;
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
        if (!data) {
        // Only redirect if we've been waiting for more than 5 seconds and never received data
        if (!hasReceivedData && !timeoutId) {
          timeoutId = setTimeout(() => {
            if (!hasReceivedData) {
              navigate('/');
            }
          }, 5000); // Wait 5 seconds before giving up
        }
        return;
      }
      
      // Clear timeout if we received data
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      hasReceivedData = true;
      setLoading(false);
      setGameData(data);
      
      // Update grid size from room settings
      const roomGridSize = getGridSize(data.settings);
      if (roomGridSize !== gridSize) {
        setGridSize(roomGridSize);
        setPlayerGrid(createEmptyGrid(roomGridSize));
        setOpponentGrid(createEmptyGrid(roomGridSize));
      }
      
      // Update turn time limit
      if (data.settings?.turnTimeLimit) {
        setTurnTimeLimit(data.settings.turnTimeLimit);
      }

      // Set turn status
      setIsMyTurn(data.currentTurn === playerId);
      setIsPaused(data.isPaused || false);      // Get player's own grid
      if (data.players && data.players[playerId]?.PlacementData?.grid) {
        setPlayerGrid(JSON.parse(JSON.stringify(data.players[playerId].PlacementData.grid)));
      }      // Get opponent's grid with ships hidden
      const opponentId = Object.keys(data.players || {}).find(id => id !== playerId);
      if (opponentId && data.players[opponentId]?.PlacementData?.grid) {
        const opponentGridData = JSON.parse(JSON.stringify(data.players[opponentId].PlacementData.grid));
        
        // Create a fresh grid to ensure we only copy specific properties
        const processedGrid = createEmptyGrid(roomGridSize);
        
        // Copy only hit/miss data from the original grid
        for (let y = 0; y < roomGridSize; y++) {
          for (let x = 0; x < roomGridSize; x++) {
            if (opponentGridData[y] && opponentGridData[y][x]) {
              const cell = opponentGridData[y][x];
              processedGrid[y][x] = {
                ship: cell.ship, 
                hit: cell.hit === true,
                miss: cell.miss === true,
                fromCounter: cell.fromCounter === true,
                attackLabel: cell.attackLabel || ''
              };
            }
          }
        }
        
        setOpponentGrid(processedGrid);
        setOpponentName(data.players[opponentId]?.name || 'Opponent');
      }
      
      // Get player's abilities
      if (data.players && data.players[playerId]?.abilities) {
        setPlayerAbilities(data.players[playerId].abilities);
      }
      
      // Get scanner results if any
      if (data.players && data.players[playerId]?.scannerResult) {
        setScanResult(data.players[playerId].scannerResult);
      }
      
      // Get hacker results if any
      if (data.players && data.players[playerId]?.hackerReveal) {
        setHackerResult(data.players[playerId].hackerReveal);
      }      // Check for game over
      if (data.gameOver) {
        const winner = data.winner;
        const message = winner === playerId ? "🎉 You Won!" : "💀 You Lost!";
        setToast({ type: winner === playerId ? 'success' : 'error', message });
          // Don't auto-navigate anymore - let players see the results
        // They can manually navigate back to home when ready
      }

      // Get player name from local storage
      setPlayerName(localStorage.getItem('battleshipPlayerName') || 'Player');
    });

    return () => unsubscribe();
  }, [roomId, playerId, navigate, gridSize, createEmptyGrid]);

  const handleAbilityActivation = async (x, y, ability) => {
    try {
      switch (ability) {        case 'NUKE':
          await activateNuke(roomId, playerId, y, x);
          break;
        case 'SCANNER':
          await activateScanner(roomId, playerId, y, x);
          break;
        case 'HACKER':
          await activateHacker(roomId, playerId);
          break;
        case 'REINFORCEMENT':
          await activateReinforcement(roomId, playerId, y, x, reinforcementVertical);
          break;
        case 'ANNIHILATE':
          await activateAnnihilate(roomId, playerId, y, x, annihilateVertical);
          break;
        case 'COUNTER':
          await activateCounterAttack(roomId, playerId);
          break;
        default:
          throw new Error('Invalid ability');
      }
      
      setToast({ type: 'success', message: `Ability ${ability} activated!` });    } catch (error) {
      setToast({ type: 'error', message: error.message });
    } finally {
      setActiveAbility(null);
    }
  };

  const handleAttack = async (x, y) => {
    if (!isMyTurn || isPaused) return;
    
    try {
      if (activeAbility) {
        await handleAbilityActivation(x, y, activeAbility);
      } else {
        await makeMove(roomId, playerId, y, x);
        setToast({ type: 'info', message: `Attacked ${getCoordinateLabel(x, y)}` });
      }    } catch (error) {
      setToast({ type: 'error', message: error.message });
    }
  };

  // Clear toast message after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!gameData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    );
  }

  if (loading || !gameData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading game room...</div>
      </div>
    );
  }

  if (!gameData.gameStarted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Waiting for game to start...</div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* Compact status bar */}
      <div className="game-status-bar px-2 sm:px-4 py-1 sm:py-2">
        <GameStatus 
          player={{ name: playerName, shipsRemaining: countRemainingShips(playerGrid) }}
          opponent={{ name: opponentName, shipsRemaining: countRemainingShips(opponentGrid) }}
        />
      </div>      {/* Main game container with proper mobile spacing */}
      <div className="flex flex-col items-center gap-2 sm:gap-4 p-2 sm:p-4">
        {/* Game info and timer */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-300">
            <span>Grid: {gridSize}x{gridSize}</span>
            {gameData.gameMode && (
              <>
                <span>•</span>
                <span className="capitalize">Mode: {gameData.gameMode}</span>
              </>
            )}
            {gameData.gameMode === 'friendly' && (
              <>
                <span>•</span>
                <span className="text-blue-400">Code: {roomId}</span>
              </>
            )}
          </div>
        </div>

        {/* Turn Timer */}
        {gameData.turnStartTime && !isPaused && (
          <div className="w-full max-w-md">
            <TurnTimer 
              startTime={gameData.turnStartTime}
              timeLimit={turnTimeLimit}
              isMyTurn={isMyTurn}
            />
          </div>
        )}

        {/* Opponent's board - main focus */}
        <div className="flex flex-col items-center w-full">
          <h2 className="text-base sm:text-xl font-bold text-white mb-1 sm:mb-2 flex items-center gap-2">
            <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${isMyTurn ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
            <span className="truncate max-w-[200px] sm:max-w-none">{opponentName}'s Fleet</span>
          </h2>
          
          {/* Mobile-optimized game board container */}
          <div className="w-full flex justify-center">
            <div className="max-w-[95vw] overflow-auto">
              <GameBoard 
                grid={opponentGrid}
                gridSize={gridSize}
                isPlayerGrid={false}
                onCellClick={isMyTurn && !isPaused ? handleAttack : null}
                activeAbility={activeAbility}
                hackerResult={hackerResult}
                annihilateVertical={annihilateVertical}
              />
            </div>
          </div>
        </div>

        {/* Abilities Panel - Mobile optimized */}
        {gameData.settings?.abilities !== false && (
          <AbilityPanel 
            abilities={playerAbilities}
            onUseAbility={setActiveAbility}
            activeAbility={activeAbility}
            reinforcementVertical={reinforcementVertical}
            onToggleReinforcementOrientation={() => setReinforcementVertical(!reinforcementVertical)}
            annihilateVertical={annihilateVertical}
            onToggleAnnihilateOrientation={() => setAnnihilateVertical(!annihilateVertical)}
            isMyTurn={isMyTurn}
          />
        )}

        {/* Player's own grid (compact for mobile) */}
        <div className="flex flex-col items-center w-full mt-2 sm:mt-4">
          <h3 className="text-sm sm:text-lg font-bold text-white mb-1 sm:mb-2">Your Fleet</h3>
          <div className="transform scale-50 sm:scale-75 origin-center">
            <GameBoard 
              grid={playerGrid}
              gridSize={gridSize}
              isPlayerGrid={true}
              activeAbility={activeAbility === 'REINFORCEMENT' ? 'REINFORCEMENT' : null}
              onCellClick={activeAbility === 'REINFORCEMENT' ? handleAttack : null}
              reinforcementVertical={reinforcementVertical}
              playerData={gameData.players?.[playerId] || {}}
            />
          </div>
        </div>

        {/* Game controls - Mobile responsive */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-2 sm:mt-4 w-full max-w-md">
          {gameData?.gameOver ? (
            <button
              onClick={() => navigate('/')}
              className="w-full px-4 py-2 sm:px-6 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm sm:text-base"
            >
              Return to Home
            </button>
          ) : (
            <button
              onClick={() => navigate('/')}
              className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm sm:text-base"
            >
              Leave Game
            </button>
          )}
          
          {gameData.gameMode === 'friendly' && !gameData?.gameOver && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(roomId);
                setToast({ type: 'success', message: 'Room code copied!' });
              }}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm sm:text-base"
            >
              Share Code
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameRoom;