import React, { createContext, useContext, useState, useEffect } from 'react';
import { subscribeToRoom, makeMove, placeShips, joinRoom } from '../services/gameService';

const GameContext = createContext();

export const GameProvider = ({ children, roomId }) => {
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);
  const [playerId] = useState(() => 
    localStorage.getItem('playerId') || Math.random().toString(36).substring(7)
  );

  useEffect(() => {
    localStorage.setItem('playerId', playerId);
    
    const initializeRoom = async () => {
      try {
        await joinRoom(roomId, playerId);
      } catch (err) {
        setError(err.message);
      }
    };

    initializeRoom();

    const unsubscribe = subscribeToRoom(roomId, (data) => {
      if (data) {
        setGameState(data);
      } else {
        setError('Room not found');
      }
    });

    return () => unsubscribe();
  }, [roomId, playerId]);

  const handleShipPlacement = async (grid) => {
    try {
      const ships = extractShipsFromGrid(grid);
      await placeShips(roomId, playerId, grid, ships);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAttack = async (row, col) => {
    try {
      await makeMove(roomId, playerId, row, col);
    } catch (err) {
      setError(err.message);
    }
  };

  const value = {
    gameState,
    playerId,
    error,
    isMyTurn: gameState?.currentTurn === playerId,
    playerGrid: gameState?.players?.[playerId]?.grid || createEmptyGrid(),
    opponentGrid: gameState?.players?.[getOpponentId(gameState, playerId)]?.grid || createEmptyGrid(),
    onPlaceShips: handleShipPlacement,
    onAttack: handleAttack
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

const createEmptyGrid = () => Array(8).fill().map(() => 
  Array(8).fill().map(() => ({ ship: null, hit: false, miss: false }))
);

const getOpponentId = (gameState, playerId) => {
  if (!gameState?.players) return null;
  return Object.keys(gameState.players).find(id => id !== playerId);
};

const extractShipsFromGrid = (grid) => {
  const ships = new Set();
  grid.forEach(row => 
    row.forEach(cell => {
      if (cell.ship) ships.add(cell.ship);
    })
  );
  return Array.from(ships);
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};