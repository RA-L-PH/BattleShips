import React from 'react';

const GameStatus = ({ isYourTurn, gameState, player, opponent }) => {
  return (
    <div className="bg-gray-800 p-3 sm:p-4 rounded-lg shadow-lg text-white w-full max-w-2xl">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
        <div className="text-center px-4 sm:px-8">
          <h3 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2">{player.name}'s Ships</h3>
          <p className="text-xl sm:text-2xl">{player.shipsRemaining}</p>
        </div>

        <div className="text-center px-4 sm:px-8">
          <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">Game Status</h3>
          <p className={`text-base sm:text-lg ${isYourTurn ? 'text-green-500' : 'text-yellow-500'}`}>
            {isYourTurn ? 'Your Turn' : `${opponent.name}'s Turn`}
          </p>
        </div>

        <div className="text-center px-4 sm:px-8">
          <h3 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2">{opponent.name}'s Ships</h3>
          <p className="text-xl sm:text-2xl">{opponent.shipsRemaining}</p>
        </div>
      </div>
    </div>
  );
};

export default GameStatus;