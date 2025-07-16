import React, { useState, useEffect } from 'react';

const GameTimer = ({ gameStartTime, isPaused, mode = 'elapsed', onTimeUp, gameTimeLimitMinutes = 15 }) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(gameTimeLimitMinutes * 60);

  useEffect(() => {
    if (!gameStartTime || isPaused) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - gameStartTime) / 1000);
      setElapsedTime(elapsed);
      
      if (mode === 'countdown') {
        const remaining = Math.max(0, (gameTimeLimitMinutes * 60) - elapsed);
        setTimeRemaining(remaining);
        
        if (remaining === 0 && onTimeUp) {
          onTimeUp();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStartTime, isPaused, mode, gameTimeLimitMinutes, onTimeUp]);

  // Format time as HH:MM:SS
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <span className={`font-mono text-xs ${mode === 'countdown' && timeRemaining <= 60 ? 'text-red-500 font-bold' : 'text-gray-600'} ${isPaused ? 'opacity-50' : ''}`}>
      {mode === 'countdown' ? (
        <>
          Time: {formatTime(timeRemaining)}
          {timeRemaining <= 60 && !isPaused && <span className="ml-1 animate-pulse">⚠️</span>}
        </>
      ) : (
        <>Game: {formatTime(elapsedTime)}</>
      )}
      {isPaused && <span className="ml-1 text-yellow-500">⏸</span>}
    </span>
  );
};

export default GameTimer;
