import React, { useState, useEffect, useRef } from 'react';

const TurnTimer = ({ timeLimit, isMyTurn, isPaused, onTimeUp }) => {
  const [timeLeft, setTimeLeft] = useState(timeLimit || 30);
  const timerRef = useRef(null);

  // Reset timer when turn changes
  useEffect(() => {
    setTimeLeft(timeLimit || 30);
  }, [isMyTurn, timeLimit]);

  // Handle the timer countdown
  useEffect(() => {
    if (!isMyTurn || isPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prevTime => {
        const newTime = prevTime - 1;
        if (newTime <= 0) {
          onTimeUp();
          clearInterval(timerRef.current);
          return 0;
        }
        return newTime;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isMyTurn, isPaused, onTimeUp]);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <span className={`font-mono ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-gray-700'} ${isPaused ? 'opacity-50' : ''}`}>
      {formatTime(timeLeft)}
      {isPaused && <span className="ml-1 text-yellow-500">⏸</span>}
    </span>
  );
};

export default TurnTimer;