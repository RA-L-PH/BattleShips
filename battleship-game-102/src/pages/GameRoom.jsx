import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, update, onValue, getDatabase } from 'firebase/database';
import { database } from '../services/firebaseConfig';
import { executeNuke, executeScanner, executeHacker, executeReinforcement, installJam, installCounter, executeGodsHand, executeAnnihilate } from '../services/abilityService';
import { makeMove } from '../services/gameService';  // Import makeMove from gameService, not abilityService
import Stopwatch from '../components/Stopwatch';
import GameStatus from '../components/GameStatus';
import GameBoard from '../components/GameBoard';
import AbilityPanel from '../components/AbilityPanel';
import Toast from '../components/Toast';
import AbilityIndicator from '../components/AbilityIndicator';
import TurnTimer from '../components/TurnTimer';

const GameRoom = () => {
  const navigate = useNavigate();
  const roomId = localStorage.getItem('battleshipRoomId');
  const playerId = localStorage.getItem('battleshipPlayerId');
  const playerName = localStorage.getItem('battleshipPlayerName') || playerId;
  const [opponentName, setOpponentName] = useState('Opponent');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [playerAbilities, setPlayerAbilities] = useState({});
  const [activeAbility, setActiveAbility] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [hackerResult, setHackerResult] = useState(null);
  const [reinforcementVertical, setReinforcementVertical] = useState(false);
  const [annihilateVertical, setAnnihilateVertical] = useState(false);
  const [error, setError] = useState(null);
  const [counterResult, setCounterResult] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [toast, setToast] = useState(null);

  // Create initial empty grid
  const createEmptyGrid = () => Array(8).fill().map(() => 
    Array(8).fill().map(() => ({ ship: null, hit: false, miss: false }))
  );

  // Initialize grids with empty state
  const [playerGrid, setPlayerGrid] = useState(createEmptyGrid());
  const [opponentGrid, setOpponentGrid] = useState(createEmptyGrid());
  
  // Helper function to convert coordinates to human-readable format
  const getCoordinateLabel = (col, row) => {
    const colLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const rowLabels = ['1', '2', '3', '4', '5', '6', '7', '8'];
    return `${colLabels[col]}${rowLabels[row]}`;
  };

  // Function to count remaining ships in a grid
  const countRemainingShips = (grid) => {
    if (!grid) return 0;
    
    // Track all ships and their segments
    const shipSegmentCounts = {};
    const shipHitCounts = {};
    
    grid.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
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
      }
    });
    
    return remainingShips;
  };

  // Subscribe to room updates
  useEffect(() => {
    if (!roomId || !playerId) {
      navigate('/');
      return;
    }
    
    const roomRef = ref(database, `rooms/${roomId}`);
    console.log("Setting up room subscription for roomId:", roomId);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      
      if (!data) {
        console.error("No data received from room subscription");
        navigate('/');
        return;
      }

      setGameState(data);
      
      // Check for game over
      if (data.gameOver) {
        setGameOver(true);
        setWinner(data.winner);
      }
      
      // Update turn status
      setIsMyTurn(data.currentTurn === playerId);
      
      // Get player's grid
      if (data.players && data.players[playerId]?.PlacementData?.grid) {
        console.log("Updating player grid");
        setPlayerGrid(JSON.parse(JSON.stringify(data.players[playerId].PlacementData.grid)));
      }

      // Get opponent's grid with ships hidden
      const opponentId = Object.keys(data.players || {}).find(id => id !== playerId);
      if (opponentId && data.players[opponentId]?.PlacementData?.grid) {
        console.log("Updating opponent grid");
        const opponentGridData = JSON.parse(JSON.stringify(data.players[opponentId].PlacementData.grid));
        
        // Create a fresh grid to ensure we only copy specific properties
        const processedGrid = Array(8).fill().map(() => 
          Array(8).fill().map(() => ({ ship: null, hit: false, miss: false }))
        );
        
        // Copy only hit/miss data from the original grid
        for (let y = 0; y < 8; y++) {
          for (let x = 0; x < 8; x++) {
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
      }
      
      // Get counter results if any
      if (data.players && data.players[playerId]?.counterHitResult) {
        const counterData = data.players[playerId].counterHitResult;
        if (counterData && counterData.timestamp) {
          setCounterResult({
            hit: true,
            hits: counterData.hits || [],
            row: counterData.targetRow,
            col: counterData.targetCol,
            timestamp: counterData.timestamp
          });
        }
      } else if (data.players && data.players[playerId]?.counterHitByOpponent) {
        const counterData = data.players[playerId].counterHitByOpponent;
        if (counterData && counterData.timestamp) {
          setCounterResult({
            hit: false,
            hits: counterData.hits || [],
            row: counterData.targetRow,
            col: counterData.targetCol,
            timestamp: counterData.timestamp
          });
        }
      }
    });
    
    return () => unsubscribe();
  }, [roomId, playerId, navigate]);

  // Clear counter result after a delay
  useEffect(() => {
    if (counterResult) {
      const timer = setTimeout(() => {
        setCounterResult(null);
      }, 5000); // Display for 5 seconds
      return () => clearTimeout(timer);
    }
  }, [counterResult]);

  const handleAbilitySelect = (abilityKey) => {
    setActiveAbility(abilityKey);
    setError(null); // Clear any previous errors when selecting a new ability
  };

  const showAbilityFeedback = (ability, result) => {
    let message;
    let type = 'success';
    
    switch(ability) {
      case 'NUKE':
        message = `NUKE strike at ${getCoordinateLabel(result.targetCol, result.targetRow)}! 
                  Hit ${result.hitCount || 0} ship segments in X pattern.${
                  result.hitCount > 0 && result.hitPositions ? 
                  ` Hit positions: ${result.hitPositions.map(pos => 
                    getCoordinateLabel(pos.col, pos.row)).join(', ')}` : ''}`;
        break;
      case 'SCANNER':
        if (result.area) {
          message = `SCANNER detected ${result.shipCount} ship segments in area from 
                    ${getCoordinateLabel(result.area.col, result.area.row)} to 
                    ${getCoordinateLabel(result.area.col + 1, result.area.row + 1)}.`;
        } else {
          message = `SCANNER detected ${result.shipCount} ship segments around 
                    ${getCoordinateLabel(result.targetCol, result.targetRow)}.`;
        }
        break;
      case 'HACKER':
        message = `HACKER revealed enemy ship segment at 
                  ${getCoordinateLabel(result.revealedCol, result.revealedRow)}!`;
        break;
      case 'REINFORCEMENT':
        message = `REINFORCEMENT ship deployed at 
                  ${getCoordinateLabel(result.targetCol, result.targetRow)} 
                  (${result.isVertical ? 'vertical' : 'horizontal'})!`;
        break;
      case 'JAM':
        message = 'JAM defense activated! Next enemy attack will be blocked.';
        break;
      case 'COUNTER':
        message = 'COUNTER defense ready! You will automatically strike back if hit.';
        break;
      case 'ANNIHILATE':
        message = `ANNIHILATE attack at ${getCoordinateLabel(result.targetCol, result.targetRow)}! 
                  Hit ${result.hitCount || 0} ship segments 
                  ${result.isVertical ? 'vertically' : 'horizontally'}.
                  ${result.hitCells?.length > 0 ? `Hit positions: ${result.hitCells.map(cell => 
                    getCoordinateLabel(cell.col, cell.row)).join(', ')}` : ''}`;
        break;
      case 'GODS_HAND':
        message = `GOD'S HAND decimated quadrant ${result.quadrant + 1}! 
                  Destroyed ${result.hitCount || 0} ship segments.
                  ${result.hitShips?.length > 0 ? `Hit positions: ${result.hitShips.map(ship => 
                    getCoordinateLabel(ship.col, ship.row)).join(', ')}` : ''}`;
        break;
      default:
        message = 'Ability used successfully!';
    }
    
    setToast({ message, type });
  };

  const showAttackResult = (result) => {
    // Get the coordinates, supporting both naming conventions and handle undefined cases
    const col = result.targetCol !== undefined ? result.targetCol : 
                result.col !== undefined ? result.col : 0;
    const row = result.targetRow !== undefined ? result.targetRow : 
                result.row !== undefined ? result.row : 0;
    
    const coordLabel = getCoordinateLabel(col, row);
    
    if (result.isHit) {
      setToast({
        message: result.shipDestroyed 
          ? `Direct hit! Enemy ship completely destroyed at ${coordLabel}!` 
          : `Hit! You struck an enemy ship segment at ${coordLabel}!`,
        type: 'success',
        duration: 3000
      });
    } else {
      setToast({
        message: `Miss! Your attack at ${coordLabel} didn't hit any ships.`,
        type: 'info',
        duration: 2000
      });
    }
  };

  const handleAttack = async (x, y, isPlayerGrid = false, cellLabel = '') => {
    try {
      if (!isMyTurn) {
        setError("It's not your turn!");
        return;
      }
      
      // Clear previous error
      setError(null);
      
      // Get opponent Id
      const opponentId = Object.keys(gameState.players).find(id => id !== playerId);
      if (!opponentId) {
        setError("Opponent not found!");
        return;
      }
      
      // If an ability is active
      if (activeAbility) {
        try {
          let result;
          switch (activeAbility) {
            case 'NUKE':
              result = await executeNuke(roomId, playerId, y, x);
              break;
            case 'SCANNER':
              result = await executeScanner(roomId, playerId, y, x);
              break;
            case 'HACKER':
              result = await executeHacker(roomId, playerId);
              break;
            case 'REINFORCEMENT': {
              // This is for placing on own grid
              if (isPlayerGrid) {
                result = await executeReinforcement(roomId, playerId, y, x, reinforcementVertical);
              } else {
                setError("Reinforcement must be placed on your own grid");
                return;
              }
              break;
            }
            case 'JAM':
              result = await installJam(roomId, playerId);
              break;
            case 'COUNTER':
              result = await installCounter(roomId, playerId);
              break;
            case 'GODS_HAND': {
              // Disable player-triggered God's Hand
              setError("God's Hand ability can only be used by the admin");
              return;
            }
            case 'ANNIHILATE':
              result = await executeAnnihilate(roomId, playerId, y, x, annihilateVertical);
              break;
            default:
              // Regular attack with no ability
              result = await makeMove(roomId, playerId, y, x);
          }
          // Clear ability state after successful execution
          setActiveAbility(null);
          showAbilityFeedback(activeAbility, result);
        } catch (error) {
          console.error('Ability execution error:', error);
          setToast({ message: error.message, type: 'error' });
          
          // Clear ability state if it was blocked by JAM
          if (error.message.includes('jammed') || error.message.includes('JAM')) {
            setActiveAbility(null);
            
            // Also explicitly clear any active ability state in the database
            try {
              update(ref(database, `rooms/${roomId}/players/${playerId}`), {
                activeAbilityState: null
              });
            } catch (dbError) {
              console.error("Error clearing ability state:", dbError);
            }
          }
          // Don't clear ability state on other errors so user can try again
          return;
        }
      } else {
        // Regular attack with no ability
        try {
          const result = await makeMove(roomId, playerId, y, x);
          showAttackResult(result);
        } catch (error) {
          console.error('Attack error:', error);
          setToast({ message: error.message, type: 'error' });
        }
      }
    } catch (error) {
      console.error('Attack error:', error);
      setToast({ message: error.message, type: 'error' });
    }
  };

  const handleTimeUp = async () => {
    // Compare remaining ships
    const playerShips = countRemainingShips(playerGrid);
    const opponentShips = countRemainingShips(opponentGrid);
    
    let gameWinner;
    if (playerShips > opponentShips) {
      gameWinner = playerId;
    } else if (opponentShips > playerShips) {
      gameWinner = Object.keys(gameState.players).find(id => id !== playerId);
    } else {
      gameWinner = 'tie';
    }

    setGameOver(true);
    setWinner(gameWinner);

    // Update game state in database
    try {
      await update(ref(database, `rooms/${roomId}`), {
        status: 'completed',
        winner: gameWinner,
        gameOver: true
      });
    } catch (err) {
      console.error("Error updating game state:", err);
    }
  };

  const handleTurnTimeout = async () => {
    // Only proceed if it's still the player's turn
    if (isMyTurn && !gameOver) {
      try {
        setToast({
          message: "Turn time expired! Switching to opponent's turn.",
          type: 'warning',
          duration: 3000
        });
        
        // Get opponent Id
        const opponentId = Object.keys(gameState.players).find(id => id !== playerId);
        
        // Switch turn to opponent
        await update(ref(database, `rooms/${roomId}`), {
          currentTurn: opponentId,
          lastAction: {
            type: 'timeout',
            playerId: playerId,
            timestamp: Date.now()
          }
        });
      } catch (error) {
        console.error("Error handling turn timeout:", error);
      }
    }
  };

  const countdown = gameState?.countdown;

  if (!gameState) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white text-xl">Loading...</div>;

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center gap-4 sm:gap-6 md:gap-8">
          <Stopwatch gameOver={gameOver} onTimeUp={handleTimeUp} />
          
          <GameStatus 
            isYourTurn={isMyTurn}
            gameState={gameState?.status || 'waiting'}
            player={{ name: playerName, shipsRemaining: countRemainingShips(playerGrid) }}
            opponent={{ name: opponentName, shipsRemaining: countRemainingShips(opponentGrid) }}
          />

          <TurnTimer 
            isYourTurn={isMyTurn} 
            onTimeUp={handleTurnTimeout} 
            gameOver={gameOver} 
          />
          
          {gameOver && (
            <div className={`text-2xl font-bold ${winner === playerId ? 'text-green-500' : winner === 'tie' ? 'text-yellow-500' : 'text-red-500'}`}>
              {winner === playerId ? 'You Won!' : winner === 'tie' ? "It's a Tie!" : 'You Lost!'}
            </div>
          )}
          
          <div className="flex flex-col justify-center items-center gap-4 md:gap-8">
            {/* Opponent's board on top */}
            <div className="flex flex-col items-center w-full">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-4 flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isMyTurn ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                {opponentName}'s Fleet
              </h2>
              <GameBoard 
                grid={opponentGrid}
                isPlayerGrid={false}
                onCellClick={isMyTurn ? handleAttack : null}
                activeAbility={activeAbility && activeAbility !== 'REINFORCEMENT' ? activeAbility : null}
                hackerResult={hackerResult}
                annihilateVertical={annihilateVertical}
              />
            </div>
            
            {/* Divider between boards */}
            <div className="w-full max-w-2xl flex items-center gap-4 my-2 md:my-4">
              <div className="flex-grow h-1 bg-gray-700 rounded"></div>
              <div className="text-gray-400 uppercase tracking-wider text-xs font-semibold">Battlefield</div>
              <div className="flex-grow h-1 bg-gray-700 rounded"></div>
            </div>
            
            {/* Player's board on bottom */}
            <div className="flex flex-col items-center w-full">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-4 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                {playerName}'s Fleet
              </h2>
              <GameBoard 
                grid={playerGrid}
                isPlayerGrid={true}
                onCellClick={isMyTurn && activeAbility === 'REINFORCEMENT' ? handleAttack : null}
                activeAbility={activeAbility === 'REINFORCEMENT' ? activeAbility : null}
                reinforcementVertical={reinforcementVertical}
                hackerResult={null}
                annihilateVertical={annihilateVertical}
                playerData={gameState?.players?.[playerId]}
              />
            </div>
          </div>

          <div className="text-white text-lg sm:text-xl mt-3 sm:mt-4">
            {isMyTurn ? "Your turn to attack!" : "Opponent's turn..."}
          </div>
        </div>
        
        {countdown && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
            <div className="text-white text-6xl sm:text-7xl md:text-9xl font-bold animate-pulse">
              {countdown}
            </div>
          </div>
        )}
        
        <div className="mt-4 sm:mt-6 md:mt-8 max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-4xl mx-auto">
          <AbilityPanel 
            abilities={playerAbilities}
            onUseAbility={handleAbilitySelect}
            isMyTurn={isMyTurn}
            onToggleReinforcementOrientation={() => setReinforcementVertical(!reinforcementVertical)}
            reinforcementVertical={reinforcementVertical}
            onToggleAnnihilateOrientation={() => setAnnihilateVertical(!annihilateVertical)}
            annihilateVertical={annihilateVertical}
            activeAbility={activeAbility}
          />
        </div>
        
        {hackerResult && (
          <div className="mt-3 sm:mt-4 bg-purple-700 p-3 sm:p-4 rounded-lg text-center max-w-xs sm:max-w-md mx-auto">
            <h4 className="font-bold text-white text-sm sm:text-base">Hacker Ability Result</h4>
            <p className="text-white text-xs sm:text-sm">
              Ship detected at position {getCoordinateLabel(hackerResult.col, hackerResult.row)}
            </p>
          </div>
        )}

        {scanResult && (
          <div className="mt-3 sm:mt-4 bg-yellow-700 p-3 sm:p-4 rounded-lg text-center max-w-xs sm:max-w-md mx-auto">
            <h4 className="font-bold text-white text-sm sm:text-base">Scanner Result</h4>
            <p className="text-white text-xs sm:text-sm">
              Area scanned from {scanResult.col && scanResult.row ? 
                getCoordinateLabel(scanResult.col, scanResult.row) : 
                getCoordinateLabel(scanResult.targetCol, scanResult.targetRow)} 
              contains {scanResult.shipCount} ship segments.
            </p>
          </div>
        )}

        {counterResult && (
          <div className="mt-3 sm:mt-4 bg-blue-700 p-3 sm:p-4 rounded-lg text-center max-w-xs sm:max-w-md mx-auto">
            <h4 className="font-bold text-white text-sm sm:text-base">Counter Ability Result</h4>
            {counterResult.hit ? (
              <>
                <p className="text-white text-xs sm:text-sm">
                  Your COUNTER ability hit enemy ship{counterResult.hits?.length > 1 ? 's' : ''}!
                </p>
                {counterResult.hits && counterResult.hits.length > 0 && (
                  <p className="text-white text-xs sm:text-sm mt-1">
                    Positions: {counterResult.hits.map(hit => 
                      getCoordinateLabel(hit.col, hit.row)).join(', ')}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-white text-xs sm:text-sm">
                  Enemy's COUNTER ability hit your ship{counterResult.hits?.length > 1 ? 's' : ''}!
                </p>
                {counterResult.hits && counterResult.hits.length > 0 && (
                  <p className="text-white text-xs sm:text-sm mt-1">
                    Positions: {counterResult.hits.map(hit => 
                      getCoordinateLabel(hit.col, hit.row)).join(', ')}
                  </p>
                )}
              </>
            )}
            <p className="text-white text-xs mt-1 italic">
              "If I take a hit, you too take a hit"
            </p>
          </div>
        )}

        <div className="mt-4 sm:mt-6 text-center">
          <button 
            onClick={() => navigate('/')} 
            className="px-3 sm:px-4 py-1 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm sm:text-base"
          >
            Leave Game
          </button>
        </div>

        {toast && (
          <Toast 
            message={toast.message}
            type={toast.type}
            onDismiss={() => setToast(null)}
          />
        )}

        {error && (
          <div className="bg-red-500/80 text-white p-3 rounded-lg shadow-lg mb-4 animate-pulse max-w-md mx-auto backdrop-blur-sm border border-red-400 flex items-center">
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 9a1 1 0 01-1-1v-4a1 1 0 112 0v4a1 1 0 01-1 1z" clipRule="evenodd" />
            </svg>
            <p>{error}</p>
          </div>
        )}

        <AbilityIndicator abilities={playerAbilities} />
      </div>
    </div>
  );
};

export default GameRoom;