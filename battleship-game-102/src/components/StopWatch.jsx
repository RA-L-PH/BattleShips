import React, { useState, useEffect, useRef } from 'react';

const Stopwatch = ({ gameOver, onTimeUp }) => {
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 20 minutes in seconds
  const timerRef = useRef(null);

  useEffect(() => {
    if (gameOver) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }
    
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

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameOver, onTimeUp]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-800 p-3 sm:p-4 rounded-lg shadow-lg text-white text-center">
      <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">Time Remaining</h3>
      <p className={`text-xl sm:text-2xl font-bold ${timeLeft < 60 ? 'text-red-500 animate-pulse' : ''}`}>
        {formatTime(timeLeft)}
      </p>
    </div>
  );
};

export default Stopwatch;