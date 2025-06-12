import React, { useState, useEffect } from 'react';

const GameTimer = ({ gameStartTime, isPaused }) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!gameStartTime || isPaused) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - gameStartTime) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStartTime, isPaused]);

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
    <span className={`font-mono text-xs text-gray-600 ${isPaused ? 'opacity-50' : ''}`}>
      Game: {formatTime(elapsedTime)}
      {isPaused && <span className="ml-1 text-yellow-500">⏸</span>}
    </span>
  );
};

export default GameTimer;
