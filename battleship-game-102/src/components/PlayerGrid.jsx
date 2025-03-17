import React from 'react';

const PlayerGrid = ({ grid, onCellClick, isOpponent }) => {
  return (
    <div className="grid grid-cols-8 gap-1 bg-gray-800 p-4 rounded-lg">
      {grid.map((row, rowIndex) => (
        row.map((cell, colIndex) => (
          <div
            key={`${rowIndex}-${colIndex}`}
            onClick={() => onCellClick(rowIndex, colIndex)}
            className={`
              w-12 h-12 rounded cursor-pointer transition
              ${!isOpponent && cell.ship ? 'bg-blue-500' : 'bg-gray-600'}
              ${cell.hit ? 'bg-red-500' : ''}
              ${cell.miss ? 'bg-gray-400' : ''}
              hover:bg-gray-500
            `}
          />
        ))
      ))}
    </div>
  );
};

export default PlayerGrid;