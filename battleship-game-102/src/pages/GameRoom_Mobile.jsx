import React, { useState, useEffect } from 'react';
import AbilityPanel from '../components/AbilityPanel';
import GameBoard from '../components/GameBoard';
import { ref, onValue, update, get } from 'firebase/database';
import { database } from '../services/firebaseConfig';
import { IoFlagOutline, IoExitOutline } from 'react-icons/io5';

const GameRoom_Mobile = ({
  gameData,
  playerAbilities,
  activeAbility,
  reinforcementVertical,
  annihilateVertical,
  setActiveAbility,
  setReinforcementVertical,
  setAnnihilateVertical,
  onNavigateHome,
  // Game state props for progress display
  isMyTurn = false,
  isPaused = false,
  playerName = 'You',
  opponentName = 'Opponent',
  playerShipsRemaining = 0,
  opponentShipsRemaining = 0,
  playerSuccessfulHits = 0,
  opponentSuccessfulHits = 0,
  onTurnTimeout = () => {},
  onGameTimeout = () => {},
  // Grid props
  playerGrid = [],
  opponentGrid = [],
  gridSize = 8,
  handleAttack = () => {},
  hackerResult = null
}) => {// Game timer state
  const [gameTimeLeft, setGameTimeLeft] = useState(15 * 60); // 15 minutes in seconds
  const [turnTimeLeft, setTurnTimeLeft] = useState(30); // 30 seconds
  const roomId = localStorage.getItem('battleshipRoomId');
  
  // Initialize timer in Firebase when game starts
  useEffect(() => {
    if (!roomId) return;
    
    const gameTimerRef = ref(database, `rooms/${roomId}/gameTimer`);
    onValue(gameTimerRef, (snapshot) => {
      if (!snapshot.exists() && !gameData?.gameOver) {
        // Initialize the timer with 15 minutes
        update(ref(database, `rooms/${roomId}`), {
          gameTimer: {
            timeRemaining: 15 * 60, // 15 minutes in seconds
            isPaused: isPaused || false
          }
        });
      }
    }, { onlyOnce: true });
  }, [roomId, gameData?.gameOver, isPaused]);

  // Load and sync with timer state from Firebase
  useEffect(() => {
    if (!roomId) return;
    
    const gameTimerRef = ref(database, `rooms/${roomId}/gameTimer`);
    const unsubscribe = onValue(gameTimerRef, (snapshot) => {
      const timerData = snapshot.val();
      if (timerData) {
        // Directly use the timeRemaining value from Firebase
        setGameTimeLeft(timerData.timeRemaining || 15 * 60);
        
        // If time runs out, trigger game over
        if (timerData.timeRemaining <= 0 && !gameData?.gameOver) {
          onGameTimeout();
        }
      }
    });
    
    return () => unsubscribe();
  }, [roomId, gameData?.gameOver, onGameTimeout]);

  // Handle the Firebase game timer countdown - only one player should decrement
  useEffect(() => {
    if (gameData?.gameOver || !roomId || isPaused) return;
    
    // Only let player 1 handle the countdown to avoid conflicts
    const playerId = localStorage.getItem('battleshipPlayerId');
    const players = gameData?.players ? Object.keys(gameData.players) : [];
    const isPlayer1 = players.length > 0 && playerId === players[0];
    
    if (!isPlayer1) return;
    
    const timerInterval = setInterval(() => {
      // Get the latest time from Firebase before updating
      get(ref(database, `rooms/${roomId}/gameTimer`)).then((snapshot) => {
        const timerData = snapshot.val();
        if (timerData && timerData.timeRemaining > 0 && !timerData.isPaused) {
          const newTimeRemaining = timerData.timeRemaining - 1;
          update(ref(database, `rooms/${roomId}/gameTimer`), {
            timeRemaining: newTimeRemaining,
            isPaused: isPaused || false
          });
        }
      });
    }, 1000);
    
    return () => clearInterval(timerInterval);
  }, [gameData?.gameOver, gameData?.players, isPaused, onGameTimeout, roomId]);

  // Update pause state in Firebase
  useEffect(() => {
    if (!roomId || gameData?.gameOver || isPaused === undefined) return;
    
    update(ref(database, `rooms/${roomId}/gameTimer`), {
      isPaused: isPaused
    });
  }, [isPaused, roomId, gameData?.gameOver]);

  // Turn timer logic - reset when turn changes and sync with Firebase
  useEffect(() => {
    if (!roomId) return;
    
    const turnTimerRef = ref(database, `rooms/${roomId}/turnTimer`);
    const unsubscribe = onValue(turnTimerRef, (snapshot) => {
      const turnData = snapshot.val();
      if (turnData) {
        setTurnTimeLeft(turnData.timeRemaining || 30);
        
        // If turn time runs out, trigger turn timeout
        if (turnData.timeRemaining <= 0 && isMyTurn && !gameData?.gameOver) {
          onTurnTimeout();
        }
      }
    });
    
    return () => unsubscribe();
  }, [roomId, isMyTurn, gameData?.gameOver, onTurnTimeout]);

  // Initialize turn timer when turn changes
  useEffect(() => {
    if (!roomId || gameData?.gameOver) return;
    
    const timeLimit = gameData?.settings?.turnTimeLimit || 30;
    const playerId = localStorage.getItem('battleshipPlayerId');
    
    // Initialize turn timer in Firebase
    update(ref(database, `rooms/${roomId}/turnTimer`), {
      timeRemaining: timeLimit,
      isPaused: isPaused || false,
      currentPlayer: isMyTurn ? playerId : null
    });
    
    setTurnTimeLeft(timeLimit);
  }, [isMyTurn, gameData?.settings?.turnTimeLimit, roomId, gameData?.gameOver, isPaused]);

  // Handle turn timer countdown - only the current player decrements
  useEffect(() => {
    if (!isMyTurn || isPaused || gameData?.gameOver || !roomId) return;
    
    const turnInterval = setInterval(() => {
      get(ref(database, `rooms/${roomId}/turnTimer`)).then((snapshot) => {
        const turnData = snapshot.val();
        if (turnData && turnData.timeRemaining > 0 && !turnData.isPaused) {
          const newTimeRemaining = turnData.timeRemaining - 1;
          update(ref(database, `rooms/${roomId}/turnTimer`), {
            timeRemaining: newTimeRemaining,
            isPaused: isPaused || false
          });
          
          if (newTimeRemaining <= 0) {
            onTurnTimeout();
          }
        }
      });
    }, 1000);
    
    return () => clearInterval(turnInterval);
  }, [isMyTurn, isPaused, gameData?.gameOver, onTurnTimeout, roomId]);
    // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle surrender with Firebase notification
  const handleSurrender = async () => {
    if (window.confirm('Are you sure you want to surrender?')) {
      try {
        if (roomId && gameData) {
          const playerId = localStorage.getItem('battleshipPlayerId');
          const playerName = localStorage.getItem('battleshipPlayerName') || 'Player';
          
          // Update game state to show surrender
          await update(ref(database, `rooms/${roomId}`), {
            gameOver: true,
            winner: Object.keys(gameData.players).find(id => id !== playerId),
            endReason: 'surrender',
            surrenderedBy: playerId,
            endTime: Date.now(),
            notifications: {
              [`surrender_${Date.now()}`]: {
                type: 'surrender',
                playerName: playerName,
                message: `${playerName} has surrendered the game`,
                timestamp: Date.now()
              }
            }
          });
        }
        onNavigateHome?.();
      } catch (error) {
        console.error('Error surrendering:', error);
        onNavigateHome?.();
      }
    }
  };

  // Handle leave with Firebase notification
  const handleLeave = async () => {
    if (window.confirm('Are you sure you want to leave?')) {
      try {
        if (roomId && gameData) {
          const playerId = localStorage.getItem('battleshipPlayerId');
          const playerName = localStorage.getItem('battleshipPlayerName') || 'Player';
          
          // Update game state to show player left
          await update(ref(database, `rooms/${roomId}`), {
            gameOver: true,
            winner: Object.keys(gameData.players).find(id => id !== playerId),
            endReason: 'leave',
            leftBy: playerId,
            endTime: Date.now(),
            notifications: {
              [`leave_${Date.now()}`]: {
                type: 'leave',
                playerName: playerName,
                message: `${playerName} has left the game`,
                timestamp: Date.now()
              }
            }
          });
        }
        onNavigateHome?.();
      } catch (error) {
        console.error('Error leaving:', error);
        onNavigateHome?.();
      }
    }
  };
  
    return (
    <div className="h-screen bg-black text-white flex flex-col p-4 gap-3">      {/* Game Progress - Top Section */}
      <div className="bg-gray-800 rounded p-2 flex-shrink-0 border border-gray-700 min-h-[60px]">
        <div className="flex gap-2 h-full items-stretch">          {/* Game Timer - Compact with working timer */}
          <div className="bg-gray-900 rounded px-2 py-1 flex flex-col justify-center min-w-[50px]">
            <div className="text-xs text-gray-400">Time</div>
            <div className={`text-sm font-mono font-bold ${gameTimeLeft < 60 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
              {formatTime(gameTimeLeft)}
            </div>
          </div>
          
          {/* Turn Status - Compact with working turn timer */}
          <div className="bg-gray-900 rounded px-2 py-1 flex flex-col justify-center min-w-[60px]">
            <div className="text-xs text-gray-400">Turn</div>
            <div className={`text-xs font-bold ${isMyTurn ? 'text-green-400' : 'text-yellow-400'}`}>
              {isMyTurn ? 'YOU' : 'OPP'}
            </div>
            {isMyTurn && (
              <div className={`text-xs ${turnTimeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                {turnTimeLeft}s
              </div>
            )}
          </div>
          
          {/* Player Stats - Ultra Compact */}
          <div className="flex-1 flex gap-2">
            <div className="bg-blue-900 rounded px-2 py-1 flex-1 text-center">
              <div className="text-xs text-gray-300 truncate">{playerName.slice(0, 8)}</div>
              <div className="text-sm font-bold text-blue-400">{playerShipsRemaining}</div>
              <div className="text-xs text-blue-300">{playerSuccessfulHits}H</div>
            </div>
            
            <div className="bg-red-900 rounded px-2 py-1 flex-1 text-center">
              <div className="text-xs text-gray-300 truncate">{opponentName.slice(0, 8)}</div>
              <div className="text-sm font-bold text-red-400">{opponentShipsRemaining}</div>
              <div className="text-xs text-red-300">{opponentSuccessfulHits}H</div>
            </div>
          </div>
        </div>
      </div>      {/* Enemy Waters - Center Section with opponent grid */}
      <div className="flex-1 bg-gray-800 rounded-lg p-2 flex flex-col min-h-0">
        <div className="text-center mb-2">
          <h3 className="text-sm font-bold text-white">Enemy Waters</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="mobile-enemy-grid-container">
            <GameBoard 
              grid={opponentGrid}
              gridSize={gridSize}
              isPlayerGrid={false}
              activeAbility={activeAbility}
              reinforcementVertical={reinforcementVertical}
              annihilateVertical={annihilateVertical}
              onCellClick={handleAttack}
              hackerResult={hackerResult}
            />
          </div>
        </div>
      </div>

      {/* Bottom Section - My Waters and Action Buttons */}
      <div className="flex gap-3 flex-shrink-0 h-48">        {/* My Waters - Bottom Left */}
        <div className="flex-1 bg-gray-800 rounded-lg mobile-grid-container">
          <GameBoard 
            grid={playerGrid}
            gridSize={gridSize}
            isPlayerGrid={true}
            activeAbility={activeAbility}
            reinforcementVertical={reinforcementVertical}
            onCellClick={activeAbility === 'REINFORCEMENT' ? handleAttack : null}
            playerData={{}}
          />
        </div>{/* Action Buttons - Right Side */}
        <div className="flex flex-col gap-2 justify-center flex-shrink-0">
          {/* Surrender Button */}
          <button
            onClick={handleSurrender}
            className="w-20 h-12 bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center text-xl transition-colors"
            title="Surrender"
          >
            <IoFlagOutline />
          </button>

          {/* Leave Button */}
          <button
            onClick={handleLeave}
            className="w-20 h-12 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center justify-center text-xl transition-colors"
            title="Leave Game"
          >
            <IoExitOutline />
          </button>
        </div>
      </div>      {/* AbilityPanel with built-in floating button - only show if abilities are available */}
      {playerAbilities && Object.keys(playerAbilities).length > 0 && (
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
    </div>
  );
};

export default GameRoom_Mobile;
