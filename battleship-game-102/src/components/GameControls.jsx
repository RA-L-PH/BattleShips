import React from 'react';

const GameControls = ({ isYourTurn, onEndTurn, onSurrender }) => {
  return (
    <div className="flex gap-4 items-center justify-center mt-4">
      <button
        onClick={onEndTurn}
        disabled={!isYourTurn}
        className={`
          px-6 py-2 rounded-lg text-white
          ${isYourTurn 
            ? 'bg-blue-600 hover:bg-blue-700' 
            : 'bg-gray-600 cursor-not-allowed'}
        `}
      >
        End Turn
      </button>
      
      <button
        onClick={onSurrender}
        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
      >
        Surrender
      </button>
    </div>
  );
};

export default GameControls;