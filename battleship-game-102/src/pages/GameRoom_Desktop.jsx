import React, { useState, useEffect } from 'react';
import GameBoard from '../components/GameBoard';
import { ABILITIES } from '../services/abilityService';
import { ref, update, onValue, get } from 'firebase/database';
import { database } from '../services/firebaseConfig';

const GameRoom_Desktop = ({ 
  onNavigateHome,
  isPaused = false,
  isMyTurn = false,
  playerShipsRemaining = 0,
  opponentShipsRemaining = 0,
  playerName = 'You',
  opponentName = 'Opponent',
  playerShipsHit = 0,
  opponentShipsHit = 0,
  playerSuccessfulHits = 0,
  opponentSuccessfulHits = 0,
  onTurnTimeout = () => {},
  onGameTimeout = () => {},
  // Grid and game state props
  playerGrid = [],
  opponentGrid = [],
  gridSize = 8,
  handleAttack = () => {},
  activeAbility = null,
  annihilateVertical = false,
  hackerResult = null,
  // Abilities
  abilities = {},
  onUseAbility = () => {},
  // Additional props needed for notifications
  roomId,
  playerId,
  gameData
}) => {  const [gameTimeLeft, setGameTimeLeft] = useState(15 * 60); // 15 minutes in seconds
  const [turnTimeLeft, setTurnTimeLeft] = useState(30); // 30 seconds
  const [gameEnded, setGameEnded] = useState(false);

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
        if (timerData.timeRemaining <= 0 && !gameData?.gameOver && !gameEnded) {
          setGameEnded(true);
          // Determine winner based on criteria
          let winner = null;
          
          // Criteria 1: Max amount of ships hit (ships destroyed)
          if (playerShipsHit > opponentShipsHit) {
            winner = 'player';
          } else if (opponentShipsHit > playerShipsHit) {
            winner = 'opponent';
          } else {
            // Criteria 2: Max number of successful hits
            if (playerSuccessfulHits > opponentSuccessfulHits) {
              winner = 'player';
            } else if (opponentSuccessfulHits > playerSuccessfulHits) {
              winner = 'opponent';
            } else {
              // Draw - both criteria are equal
              winner = 'draw';
            }
          }
          
          onGameTimeout(winner);
        }
      }
    });
    
    return () => unsubscribe();
  }, [roomId, gameData?.gameOver, onGameTimeout, gameEnded, playerShipsHit, opponentShipsHit, playerSuccessfulHits, opponentSuccessfulHits]);

  // Handle the Firebase game timer countdown - only one player should decrement
  useEffect(() => {
    if (gameData?.gameOver || !roomId || isPaused || gameEnded) return;
    
    // Only let player 1 handle the countdown to avoid conflicts
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
  }, [gameData?.gameOver, gameData?.players, isPaused, onGameTimeout, roomId, playerId, gameEnded]);

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
        if (turnData.timeRemaining <= 0 && !gameData?.gameOver) {
          // Only trigger timeout if this is actually the current player's turn
          const currentPlayerId = localStorage.getItem('battleshipPlayerId');
          if (gameData?.currentTurn === currentPlayerId) {
            onTurnTimeout();
          }
        }
      }
    });
    
    return () => unsubscribe();
  }, [roomId, isMyTurn, gameData?.gameOver, gameData?.currentTurn, onTurnTimeout]);

  // Initialize turn timer when turn changes
  useEffect(() => {
    if (!roomId || gameData?.gameOver) return;
    
    const timeLimit = gameData?.settings?.turnTimeLimit || 30;
    
    // Initialize turn timer in Firebase
    update(ref(database, `rooms/${roomId}/turnTimer`), {
      timeRemaining: timeLimit,
      isPaused: isPaused || false,
      currentPlayer: isMyTurn ? playerId : null
    });
    
    setTurnTimeLeft(timeLimit);
  }, [isMyTurn, gameData?.settings?.turnTimeLimit, roomId, gameData?.gameOver, isPaused, playerId]);

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
            // Only trigger timeout if this is actually the current player's turn
            const currentPlayerId = localStorage.getItem('battleshipPlayerId');
            if (gameData?.currentTurn === currentPlayerId) {
              onTurnTimeout();
            }
          }
        }
      });
    }, 1000);
    
    return () => clearInterval(turnInterval);
  }, [isMyTurn, isPaused, gameData?.gameOver, gameData?.currentTurn, onTurnTimeout, roomId]);
  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentages
  const turnProgress = ((30 - turnTimeLeft) / 30) * 100;

  // Handle surrender with notification
  const handleSurrender = async () => {
    if (window.confirm('Are you sure you want to surrender?')) {
      try {
        if (roomId && playerId && gameData) {
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

  // Handle leave with notification
  const handleLeave = async () => {
    if (window.confirm('Are you sure you want to leave?')) {
      try {
        if (roomId && playerId && gameData) {
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
  };return (
    <div className="min-h-screen bg-gray-900 gameroom-desktop">      {/* Hidden scrollbar styles */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;  /* Chrome, Safari, Opera */
        }
        
        /* Ensure abilities container doesn't grow */
        .abilities-container {
          max-width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.5);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
      
      <div className="max-w-full h-screen flex flex-col gap-3">
          {/* Top Bar - Game Progress */}
        <div className="w-full h-32 bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex justify-between items-center h-full">
              {/* Game Timer (15 minute countdown) */}
            <div className="flex flex-col items-center">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Game Time</h3>
              <div className="bg-gray-900 rounded-lg px-4 py-2 shadow-inner border-2 border-gray-600 transition-all duration-300 hover:shadow-lg">
                <div className={`text-xl font-mono font-bold tracking-wider transition-all duration-300 ${gameTimeLeft < 60 ? 'text-red-400 animate-pulse scale-110' : 'text-gray-100'}`}>
                  {formatTime(gameTimeLeft)}
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-1">Time Left</div>
              {gameTimeLeft < 60 && (
                <div className="text-xs text-red-400 font-bold animate-bounce">FINAL MINUTE!</div>
              )}
            </div>
              {/* Current Turn Indicator */}
            <div className="flex flex-col items-center">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Current Turn</h3>
              <div className={`px-4 py-2 rounded-lg font-bold text-lg transition-all duration-500 transform ${isMyTurn ? 'bg-green-600 text-white scale-110 shadow-lg shadow-green-500/25' : 'bg-yellow-600 text-white'}`}>
                {isMyTurn ? playerName || 'YOUR TURN' : `${opponentName}'S TURN`}
              </div>
              {isMyTurn && (
                <div className="text-xs text-green-400 font-medium mt-1 animate-pulse">Make your move!</div>
              )}
            </div>{/* Circular Turn Timer (30 second countdown) */}
            <div className="flex flex-col items-center">
              <h3 className="text-sm font-semibold text-gray-300 mb-1">Turn Timer</h3>
              <div className="relative w-16 h-16">
                {/* Background circle */}
                <svg className="transform -rotate-90 w-16 h-16" viewBox="0 0 64 64">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="#374151"
                    strokeWidth="4"
                    fill="none"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke={
                      !isMyTurn ? "#94a3b8" : // Gray when opponent's turn (paused)
                      turnTimeLeft <= 10 ? "#ef4444" : "#10b981" // Red when urgent, green when normal
                    }
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={
                      !isMyTurn ? 0 : // Show full circle when opponent's turn
                      `${2 * Math.PI * 28 * (turnProgress / 100)}` // Show countdown when your turn
                    }
                    className="transition-all duration-300 ease-in-out"
                    style={{
                      filter: !isMyTurn ? 'none' :
                              turnTimeLeft <= 10 ? 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.6))' : 
                              'drop-shadow(0 0 4px rgba(16, 185, 129, 0.4))'
                    }}
                  />
                </svg>                {/* Timer text in center */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`text-sm font-bold ${
                    !isMyTurn ? 'text-gray-400' : // Gray when opponent's turn
                    turnTimeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-green-400'
                  }`}>
                    {isMyTurn ? `${turnTimeLeft}s` : '30s'}
                  </div>
                </div>
                {/* Pulse animation for urgent countdown */}
                {isMyTurn && !isPaused && turnTimeLeft <= 10 && (
                  <div className="absolute inset-0 rounded-full bg-red-500 opacity-20 animate-ping"></div>
                )}                {/* Paused indicator for opponent's turn */}
                {!isMyTurn && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="absolute top-1 right-1 w-2 h-2 bg-gray-500 rounded-full"></div>
                  </div>
                )}
              </div>              <div className={`text-xs mt-1 font-medium ${
                !isMyTurn ? 'text-gray-400' :
                turnTimeLeft <= 10 ? 'text-red-400' : 'text-green-400'
              }`}>
                {!isMyTurn ? 'Waiting' : turnTimeLeft <= 10 ? 'HURRY!' : 'Your Turn'}
              </div>
            </div>
              {/* Ships Hit Counters with Game Stats */}
            <div className="flex gap-8">
              {/* Player Ships */}
              <div className="flex flex-col items-center">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">{playerName || 'You'}</h3>
                <div className="flex items-center gap-3">                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-110">
                      <span className="text-white text-lg">⚓</span>
                    </div>
                    {/* Health indicator dots with staggered animations */}
                    <div className="absolute -bottom-1 -right-1 flex gap-0.5">
                      {Array.from({ length: Math.min(playerShipsRemaining || 0, 5) }).map((_, i) => (
                        <div 
                          key={i} 
                          className="w-1.5 h-1.5 bg-green-400 rounded-full transition-all duration-300 hover:bg-green-300 hover:scale-125"
                          style={{
                            animationDelay: `${i * 0.1}s`,
                            animation: 'fadeIn 0.5s ease-in-out'
                          }}
                        ></div>
                      ))}
                    </div>
                  </div><div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {playerShipsRemaining || 0}
                    </div>
                    <div className="text-xs text-gray-400 leading-none">Ships Left</div>
                    <div className="text-xs text-blue-400 font-medium">
                      Destroyed: {playerShipsHit || 0} | Hits: {playerSuccessfulHits || 0}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="w-px bg-gray-600 mx-2"></div>
                {/* Opponent Ships */}
              <div className="flex flex-col items-center">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">{opponentName || 'Opponent'}</h3>
                <div className="flex items-center gap-3">                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-110">
                      <span className="text-white text-lg">⚓</span>
                    </div>
                    {/* Health indicator dots with staggered animations */}
                    <div className="absolute -bottom-1 -right-1 flex gap-0.5">
                      {Array.from({ length: Math.min(opponentShipsRemaining || 0, 5) }).map((_, i) => (
                        <div 
                          key={i} 
                          className="w-1.5 h-1.5 bg-orange-400 rounded-full transition-all duration-300 hover:bg-orange-300 hover:scale-125"
                          style={{
                            animationDelay: `${i * 0.1}s`,
                            animation: 'fadeIn 0.5s ease-in-out'
                          }}
                        ></div>
                      ))}
                    </div>
                  </div><div className="text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {opponentShipsRemaining || 0}
                    </div>
                    <div className="text-xs text-gray-400 leading-none">Ships Left</div>
                    <div className="text-xs text-red-400 font-medium">
                      Destroyed: {opponentShipsHit || 0} | Hits: {opponentSuccessfulHits || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex gap-3 min-h-0">            {/* Left Section - Enemy Grid */}
          <div className="flex-[2] bg-gray-800 rounded-lg flex flex-col">
            <div className="flex-1 flex items-center justify-center">
              <div className="enemy-grid-section">                <GameBoard 
                  grid={opponentGrid}
                  isPlayerGrid={false}
                  gridSize={8}
                  onCellClick={handleAttack}
                  activeAbility={activeAbility}
                  annihilateVertical={annihilateVertical}
                  hackerResult={hackerResult}
                />
              </div>
            </div>
          </div>          {/* Right Section - Vertical Stack */}
          <div className="flex-[1] flex flex-col gap-3 min-w-0 max-w-md">
            {/* Abilities Panel */}
            <div className="h-48 bg-gray-800 rounded-lg flex flex-col flex-shrink-0">
              <div className="flex-1 p-3 min-h-0">
                {/* Fixed size scrollable abilities container */}                <div className="relative h-32 w-full overflow-hidden">
                  <div 
                    className="flex gap-3 overflow-x-auto scrollbar-hide abilities-container py-2 px-1 h-full"
                    style={{
                      scrollbarWidth: 'none', /* Firefox */
                      msOverflowStyle: 'none', /* IE and Edge */
                    }}
                  >
                    {/* Show only player's granted abilities */}
                    {Object.entries(abilities)
                      .filter(([key, data]) => data.active) // Only show granted abilities
                      .map(([key, playerAbility]) => {
                        const ability = ABILITIES[key];
                        const isUsed = playerAbility?.used;
                        const isSelected = activeAbility === key;
                        const hasAlignment = ['ANNIHILATE'].includes(key);
                        const isVertical = key === 'ANNIHILATE' ? annihilateVertical : false;
                        
                        const handleAbilityClick = (e) => {
                          e.preventDefault();
                          if (!isMyTurn) return;
                          
                          if (isSelected) {
                            // If already selected, clicking again will deselect
                            onUseAbility(null);
                          } else if (!isUsed) {
                            // Select ability
                            onUseAbility(key);
                          }
                        };

                        return (
                          <div
                            key={key}
                            onClick={handleAbilityClick}
                            className={`
                              flex-shrink-0 w-36 h-28 rounded-lg border-2 p-2 cursor-pointer transition-all duration-200 flex flex-col justify-between relative
                              ${isSelected ? 'border-purple-400 bg-purple-900/50 shadow-lg shadow-purple-500/25' : 
                                !isUsed ? 'border-green-400 bg-green-900/30 hover:bg-green-800/40 hover:shadow-lg' :
                                'border-gray-600 bg-gray-700/50'
                              }
                              ${(isUsed || !isMyTurn) ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105 hover:shadow-xl'}
                            `}
                            style={{ minWidth: '144px' }} // Ensure minimum width is maintained
                          >
                            {/* Alignment indicator for abilities that support it */}
                            {hasAlignment && !isUsed && (
                              <div className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center">
                                <div className={`w-2 h-2 rounded-full ${isVertical ? 'bg-blue-400' : 'bg-orange-400'}`}></div>
                                <div className={`absolute text-[8px] font-bold ${isVertical ? 'text-blue-300' : 'text-orange-300'} mt-3`}>
                                  {isVertical ? 'V' : 'H'}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex-1">
                              <div className={`font-bold text-xs mb-1 ${
                                isSelected ? 'text-purple-200' :
                                !isUsed ? 'text-green-200' : 'text-gray-400'
                              }`}>
                                {ability.name}
                              </div>
                              <div className={`text-[10px] leading-tight ${
                                isSelected ? 'text-purple-300' :
                                !isUsed ? 'text-green-300' : 'text-gray-500'
                              }`}>
                                {isUsed && playerAbility?.result ? 
                                  // Show result for support abilities like HACKER
                                  (typeof playerAbility.result === 'string' ? 
                                    playerAbility.result.substring(0, 35) + '...' :
                                    JSON.stringify(playerAbility.result).substring(0, 35) + '...'
                                  ) :
                                  ability.description.substring(0, 35) + '...'
                                }
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className={`text-[9px] px-1 py-0.5 rounded uppercase font-bold ${
                                ability.type === 'attack' ? 'bg-red-600 text-red-200' :
                                ability.type === 'defense' ? 'bg-blue-600 text-blue-200' :
                                ability.type === 'support' ? 'bg-purple-600 text-purple-200' :
                                'bg-yellow-600 text-yellow-200'
                              }`}>
                                {ability.type}
                              </span>
                              <div className={`text-[9px] font-bold ${
                                isSelected ? 'text-purple-200' :
                                !isUsed ? 'text-green-200' :
                                'text-red-400'
                              }`}>
                                {isSelected ? (hasAlignment ? 'CLICK=FLIP' : 'CLICK=OFF') :
                                 !isUsed ? 'READY' : 'USED'}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    }
                      {/* Show placeholder cards for abilities not yet granted (max 3 total) */}
                    {Array.from({ 
                      length: Math.max(0, 3 - Object.keys(abilities).filter(key => abilities[key]?.active).length) 
                    }).map((_, index) => (
                      <div
                        key={`placeholder-${index}`}
                        className="flex-shrink-0 w-36 h-28 rounded-lg border-2 border-dashed border-gray-600 bg-gray-800/30 p-2 flex flex-col items-center justify-center"
                        style={{ minWidth: '144px' }} // Ensure minimum width is maintained
                      >
                        <div className="text-gray-500 text-xs font-bold mb-1">Empty Slot</div>
                        <div className="text-gray-600 text-[9px] mt-1">#{Object.keys(abilities).filter(key => abilities[key]?.active).length + index + 1}/3</div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Always show scroll indicators */}
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-gray-800 to-transparent w-4 h-full pointer-events-none opacity-60"></div>
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-gradient-to-l from-gray-800 to-transparent w-4 h-full pointer-events-none opacity-60"></div>
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs animate-pulse">
                    ↔
                  </div>
                </div>
                
                {/* Status message */}
                <div className="mt-2 text-center">
                  {Object.keys(abilities).filter(key => abilities[key]?.active).length === 0 ? (
                    <div className="text-gray-400 text-xs">
                      No abilities granted yet • Ask admin questions to earn abilities
                    </div>
                  ) : (
                    <div className="text-gray-300 text-xs">
                      {Object.keys(abilities).filter(key => abilities[key]?.active).length}/3 abilities granted
                      {Object.keys(abilities).filter(key => abilities[key]?.active).length < 3 && (
                        <span className="text-gray-500"> • Answer more questions for more abilities</span>
                      )}
                      {activeAbility && (
                        <div className="text-purple-300 text-[10px] mt-1">
                          Selected: {ABILITIES[activeAbility]?.name} • Click card to toggle or deselect
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>{/* My Grid */}
            <div className="flex-1 bg-gray-800 border-2 border-blue-400 rounded-lg flex flex-col">
              <div className="flex-1 flex items-center justify-center">
                <div className="my-grid-section">                  <GameBoard 
                    grid={playerGrid}
                    isPlayerGrid={true}
                    gridSize={gridSize}
                    activeAbility={activeAbility}
                    annihilateVertical={annihilateVertical}
                    hackerResult={hackerResult}
                  />
                </div>
              </div>
            </div>            {/* Action Buttons */}
            <div className="h-16 flex gap-2">
              <button 
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg active:scale-95"
                onClick={handleSurrender}
              >
                Surrender
              </button>
              
              <button 
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg active:scale-95"
                onClick={handleLeave}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameRoom_Desktop;
