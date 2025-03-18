import React, { useState, useEffect, useRef } from 'react';
import { ref, onValue, update, get } from 'firebase/database';
import { database } from '../services/firebaseConfig';

const TurnTimer = ({ isYourTurn, onTimeUp, gameOver, isPaused }) => {
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds for each turn
  const timerRef = useRef(null);
  const roomId = localStorage.getItem('battleshipRoomId');
  const turnDuration = 30; // seconds
  const playerId = localStorage.getItem('battleshipPlayerId');

  // Load and sync with timer state from Firebase
  useEffect(() => {
    if (!roomId || !isYourTurn) return;

    const turnTimerRef = ref(database, `rooms/${roomId}/turnTimer`);
    const unsubscribe = onValue(turnTimerRef, (snapshot) => {
      const timerData = snapshot.val();
      if (timerData && timerData.playerId === playerId) {
        // Directly use the timeRemaining value from Firebase
        setTimeLeft(timerData.timeRemaining);
        
        // If time runs out, trigger turn change
        if (timerData.timeRemaining <= 0 && !gameOver) {
          onTimeUp();
        }
      }
    });
    
    return () => unsubscribe();
  }, [roomId, isYourTurn, playerId, gameOver, onTimeUp]);

  // Reset timer when turn changes
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Reset time when it becomes your turn
    if (isYourTurn && !gameOver) {
      update(ref(database, `rooms/${roomId}`), {
        turnTimer: {
          timeRemaining: turnDuration,
          playerId: playerId,
          isPaused: isPaused
        }
      });
    }
  }, [isYourTurn, gameOver, roomId, turnDuration, playerId, isPaused]);

  // Handle the timer countdown
  useEffect(() => {
    if (!isYourTurn || gameOver || !roomId || isPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }
    
    timerRef.current = setInterval(() => {
      // Get the latest time from Firebase before updating
      get(ref(database, `rooms/${roomId}/turnTimer`)).then((snapshot) => {
        const timerData = snapshot.val();
        if (timerData && timerData.playerId === playerId && timerData.timeRemaining > 0) {
          const newTimeRemaining = timerData.timeRemaining - 1;
          update(ref(database, `rooms/${roomId}/turnTimer`), {
            timeRemaining: newTimeRemaining
          });
          
          if (newTimeRemaining <= 0) {
            onTimeUp();
            clearInterval(timerRef.current);
          }
        }
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isYourTurn, gameOver, isPaused, onTimeUp, roomId, playerId]);

  // Update pause state in Firebase
  useEffect(() => {
    if (!roomId || !isYourTurn || gameOver) return;
    
    update(ref(database, `rooms/${roomId}/turnTimer`), {
      isPaused: isPaused
    });
  }, [isPaused, roomId, isYourTurn, gameOver]);

  // Only show timer when it's your turn and game is active
  if (!isYourTurn || gameOver) return null;
  
  return (
    <div className="bg-gray-800 p-3 sm:p-4 rounded-lg shadow-lg text-white text-center">
      <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">Turn Timer</h3>
      <p className={`text-xl sm:text-2xl font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : ''} ${isPaused ? 'opacity-50' : ''}`}>
        {timeLeft}s
        {isPaused && <span className="ml-2 text-yellow-400 text-sm">(Paused)</span>}
      </p>
    </div>
  );
};

export default TurnTimer;