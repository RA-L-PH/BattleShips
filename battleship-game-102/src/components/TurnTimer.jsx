import React, { useState, useEffect, useRef } from 'react';

const TurnTimer = ({ isYourTurn, onTimeUp, gameOver }) => {
  const [timeLeft, setTimeLeft] = useState(15);
  const timerRef = useRef(null);

  // Reset timer when turn changes
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Reset time when it becomes your turn
    if (isYourTurn && !gameOver) {
      setTimeLeft(15);
      
      // Start countdown
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            onTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isYourTurn, gameOver, onTimeUp]);

  return (
    <div className={`turn-timer ${timeLeft <= 5 ? 'animate-pulse' : ''}`}>
      <div className="text-center">
        {isYourTurn && !gameOver && (
          <div className="bg-gray-800 px-3 py-2 rounded-lg inline-block">
            <span className="text-white font-medium mr-2">Turn Timer:</span>
            <span className={`font-bold ${timeLeft <= 5 ? 'text-red-500' : 'text-white'}`}>
              {timeLeft}s
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TurnTimer;