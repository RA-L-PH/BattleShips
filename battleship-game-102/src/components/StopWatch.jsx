import React, { useState, useEffect, useRef } from 'react';
import { ref, onValue, update, get } from 'firebase/database';
import { database } from '../services/firebaseConfig';

const Stopwatch = ({ gameOver, onTimeUp, isPaused }) => {
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds
  const timerRef = useRef(null);
  const roomId = localStorage.getItem('battleshipRoomId');
  
  // Load and sync with timer state from Firebase
  useEffect(() => {
    if (!roomId) return;
    
    const gameTimerRef = ref(database, `rooms/${roomId}/gameTimer`);
    const unsubscribe = onValue(gameTimerRef, (snapshot) => {
      const timerData = snapshot.val();
      if (timerData) {
        // Directly use the timeRemaining value from Firebase
        setTimeLeft(timerData.timeRemaining);
        
        // If time runs out, trigger game over
        if (timerData.timeRemaining <= 0 && !gameOver) {
          onTimeUp();
        }
      }
    });
    
    return () => unsubscribe();
  }, [roomId, gameOver, onTimeUp]);

  // Initialize timer in Firebase when game starts
  useEffect(() => {
    if (!roomId) return;
    
    const gameTimerRef = ref(database, `rooms/${roomId}/gameTimer`);
    onValue(gameTimerRef, (snapshot) => {
      if (!snapshot.exists()) {
        // Initialize the timer with 15 minutes
        update(ref(database, `rooms/${roomId}`), {
          gameTimer: {
            timeRemaining: 15 * 60, // 15 minutes in seconds
            isPaused: false
          }
        });
      }
    }, { onlyOnce: true });
  }, [roomId]);

  // Handle the timer countdown
  useEffect(() => {
    if (gameOver || !roomId || isPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }
    
    timerRef.current = setInterval(() => {
      // Get the latest time from Firebase before updating
      get(ref(database, `rooms/${roomId}/gameTimer`)).then((snapshot) => {
        const timerData = snapshot.val();
        if (timerData && timerData.timeRemaining > 0) {
          const newTimeRemaining = timerData.timeRemaining - 1;
          update(ref(database, `rooms/${roomId}/gameTimer`), {
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
  }, [gameOver, isPaused, onTimeUp, roomId]);

  // Update pause state in Firebase
  useEffect(() => {
    if (!roomId || gameOver) return;
    
    update(ref(database, `rooms/${roomId}/gameTimer`), {
      isPaused: isPaused
    });
  }, [isPaused, roomId, gameOver]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-800 p-3 sm:p-4 rounded-lg shadow-lg text-white text-center">
      <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">Time Remaining</h3>
      <p className={`text-xl sm:text-2xl font-bold ${timeLeft < 60 ? 'text-red-500 animate-pulse' : ''} ${isPaused ? 'opacity-50' : ''}`}>
        {formatTime(timeLeft)}
        {isPaused && <span className="ml-2 text-yellow-400 text-sm">(Paused)</span>}
      </p>
    </div>
  );
};

export default Stopwatch;