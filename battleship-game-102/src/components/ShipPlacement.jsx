import React, { useState, useCallback, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { isTouchDevice } from '../utils/deviceDetect';
import { FaTrash, FaCheck, FaShip } from 'react-icons/fa';
import { BiRotateRight } from 'react-icons/bi';
import { getDatabase, ref, get, update, onValue } from 'firebase/database';
import { useNavigate } from 'react-router-dom';

// Add this utility function in a separate file:
// filepath: e:\VSCODE\IEEE-battleship102\battleship-game-102\src\utils\deviceDetect.js
// export const isTouchDevice = () => {
//   return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
// };

// Use a multi-backend setup or conditionally choose the right backend
const DndBackend = isTouchDevice() ? TouchBackend : HTML5Backend;

const SHIPS = [
  { id: 'carrier', name: 'Carrier', size: 5, color: 'bg-blue-500' },
  { id: 'battleship', name: 'Battleship', size: 4, color: 'bg-green-500' },
  { id: 'cruiser', name: 'Cruiser', size: 3, color: 'bg-yellow-500' },
  { id: 'destroyer', name: 'Destroyer', size: 2, color: 'bg-red-500' }
];

const GRID_SIZE = 8;
const MAX_SHIPS = 5;

const ShipControls = ({ onRotate, onDelete, disabled }) => (
  <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 
                  bg-gray-800/90 backdrop-blur-sm p-3 rounded-lg shadow-xl 
                  flex items-center gap-2 border border-gray-700">
    <button
      onClick={onRotate}
      disabled={disabled}
      className="p-3 bg-purple-500/90 hover:bg-purple-600 text-white rounded-lg
                 transform hover:scale-110 transition-all duration-200
                 disabled:opacity-50 disabled:cursor-not-allowed"
      title="Rotate Ship"
    >
      <BiRotateRight size={24} />
    </button>
    <button
      onClick={onDelete}
      disabled={disabled}
      className="p-3 bg-red-500/90 hover:bg-red-600 text-white rounded-lg
                 transform hover:scale-110 transition-all duration-200
                 disabled:opacity-50 disabled:cursor-not-allowed"
      title="Remove Ship"
    >
      <FaTrash size={20} />
    </button>
  </div>
);

// Update the Ship component to add the ship-draggable class
const Ship = ({ ship, isPlaced, onClick, rotation = 0, position, disabled }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'ship',
    item: () => ({
      id: ship.id,
      ship: { ...ship },
      rotation,
      isPlaced,
      position,
    }),
    canDrag: !disabled,
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }), [ship.id, rotation, isPlaced, disabled]);

  // Better touch handling
  const handleTouchStart = (e) => {
    // Don't prevent default so dragging works
  };

  return (
    <div
      ref={drag}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      className={`
        ship-draggable flex flex-row relative
        ${isPlaced ? 'cursor-move' : disabled ? 'cursor-not-allowed opacity-50' : 'cursor-move hover:scale-105'} 
        transition-all duration-300
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        select-none
      `}
      style={{ 
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      {Array(ship.size).fill(null).map((_, i) => (
        <div
          key={i}
          className={`
            w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 ${ship.color}
            border-2 border-gray-700
            ${i === 0 ? 'rounded-l-md' : ''}
            ${i === ship.size - 1 ? 'rounded-r-md' : ''}
            transition-all duration-200
            select-none
          `}
        />
      ))}
      {!isPlaced && (
        <div className="absolute -top-8 left-0 text-white text-xs sm:text-sm 
                      bg-gray-800/90 px-2 py-1 rounded-md flex items-center gap-2
                      whitespace-nowrap select-none">
          <FaShip />
          {ship.name}
        </div>
      )}
    </div>
  );
};

// Update the Cell component to improve touch handling
const Cell = ({ x, y, onDrop, onHover, onClick, isValidPlacement, children }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'ship',
    drop: (item) => {
      onDrop(x, y, item.ship, item.rotation === 90 || item.rotation === 270);
      return undefined;
    },
    hover: (item) => {
      onHover(x, y, item.ship, item.rotation === 90 || item.rotation === 270);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  }), [x, y, onDrop, onHover]);

  // Prevent text selection on mobile but allow drag/drop
  const handleTouchStart = (e) => {
    // Don't preventDefault for drag operations
    if (e.target.closest('.ship-draggable')) {
      return;
    }
    // Prevent default only for regular cell clicks
    e.preventDefault();
  };

  return (
    <div
      ref={drop}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      className={`
        w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 border border-gray-600 rounded
        transition-all duration-200 select-none touch-none
        ${isOver && isValidPlacement ? 'bg-green-500/50' : ''}
        ${isOver && !isValidPlacement ? 'bg-red-500/50' : ''}
        ${!isOver ? 'bg-gray-700 hover:bg-gray-600' : ''}
      `}
    >
      {children}
    </div>
  );
};
const ShipPlacement = ({ onComplete }) => {
  const navigate = useNavigate();
  const [grid, setGrid] = useState(Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null)));
  const [placedShips, setPlacedShips] = useState(new Map());
  const [selectedShip, setSelectedShip] = useState(null);
  const [shipRotations, setShipRotations] = useState(new Map());
  const [hoverCoords, setHoverCoords] = useState(null);
  const [catalogQueue, setCatalogQueue] = useState([...SHIPS].slice(0, MAX_SHIPS));
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const checkValidPlacement = useCallback((x, y, ship, vertical) => {
    if (!ship) return false;

    const size = ship.size;

    if (vertical && y + size > GRID_SIZE) return false;
    if (!vertical && x + size > GRID_SIZE) return false;

    for (let i = 0; i < size; i++) {
      const checkX = vertical ? x : x + i;
      const checkY = vertical ? y + i : y;
      const cellContent = grid[checkY][checkX];
      if (cellContent && cellContent !== ship.id) return false;
    }

    if (!placedShips.has(ship.id) && placedShips.size >= MAX_SHIPS) return false;

    return true;
  }, [grid, placedShips]);

  const handleDrop = (x, y, ship, shipIsVertical) => {
    if (!checkValidPlacement(x, y, ship, shipIsVertical)) return;

    const newGrid = grid.map(row => row.map(cell => cell === ship.id ? null : cell));

    for (let i = 0; i < ship.size; i++) {
      const placeX = shipIsVertical ? x : x + i;
      const placeY = shipIsVertical ? y + i : y;
      if (placeY >= 0 && placeY < GRID_SIZE && placeX >= 0 && placeX < GRID_SIZE) {
        newGrid[placeY][placeX] = ship.id;
      }
    }

    setGrid(newGrid);

    const newPlacedShips = new Map(placedShips);
    newPlacedShips.set(ship.id, { x, y, vertical: shipIsVertical });
    setPlacedShips(newPlacedShips);

    const newRotations = new Map(shipRotations);
    newRotations.set(ship.id, shipIsVertical ? 90 : 0);
    setShipRotations(newRotations);

    if (!placedShips.has(ship.id)) {
      setCatalogQueue(current => current.filter(s => s.id !== ship.id));
    }

    setSelectedShip(ship);
  };

  const handleShipSelect = (ship) => {
    setSelectedShip(selectedShip?.id === ship.id ? null : ship);
  };

  const handleRotateShip = () => {
    if (!selectedShip) return;

    const shipPosition = placedShips.get(selectedShip.id);
    if (!shipPosition) return;

    const newVertical = !shipPosition.vertical;
    if (checkValidPlacement(shipPosition.x, shipPosition.y, selectedShip, newVertical)) {
      handleDrop(shipPosition.x, shipPosition.y, selectedShip, newVertical);
    }
  };

  const handleHover = (x, y, ship, shipIsVertical) => {
    setHoverCoords({ x, y, ship, isVertical: shipIsVertical });
  };

  const handleClearPlacement = () => {
    setGrid(Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null)));
    setPlacedShips(new Map());
    setShipRotations(new Map());
    setSelectedShip(null);
    setCatalogQueue([...SHIPS].slice(0, MAX_SHIPS));
  };

  const updateShipPlacement = async (roomId, playerId, placementData) => {
    try {
      const db = getDatabase();

      const playerRef = ref(db, `rooms/${roomId}/players/${playerId}`);
      const playerSnapshot = await get(playerRef);

      if (!playerSnapshot.exists()) {
        return false;
      }

      const updates = {};
      updates[`rooms/${roomId}/players/${playerId}/PlacementData`] = placementData;
      updates[`rooms/${roomId}/players/${playerId}/ready`] = true;

      await update(ref(db), updates);
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleComplete = async () => {
    if (placedShips.size === SHIPS.length) {
      const playerId = localStorage.getItem('battleshipPlayerId');
      const roomId = localStorage.getItem('battleshipRoomId');

      if (!playerId || !roomId) {
        setErrorMessage("You must be in a room to place ships");
        return;
      }

      setIsSaving(true);
      setErrorMessage('');

      try {
        const shipPlacements = {};
        placedShips.forEach((position, shipId) => {
          const ship = SHIPS.find(s => s.id === shipId);
          shipPlacements[shipId] = {
            name: ship.name,
            startPosition: { x: position.x, y: position.y },
            orientation: position.vertical ? 'vertical' : 'horizontal',
            size: ship.size
          };
        });

        const gridForDatabase = Array(GRID_SIZE).fill().map(() => 
          Array(GRID_SIZE).fill().map(() => ({ 
            ship: null, 
            hit: false, 
            miss: false 
          }))
        );

        placedShips.forEach((position, shipId) => {
          const ship = SHIPS.find(s => s.id === shipId);
          for (let i = 0; i < ship.size; i++) {
            const x = position.vertical ? position.x : position.x + i;
            const y = position.vertical ? position.y + i : position.y;
            gridForDatabase[y][x].ship = shipId;
          }
        });

        const placementData = {
          grid: gridForDatabase,
          ships: shipPlacements,
          lastUpdated: Date.now()
        };

        const success = await updateShipPlacement(roomId, playerId, placementData);

        if (!success) {
          throw new Error('Failed to update ship placement');
        }

        setIsSaving(false);
        setIsSaved(true);
        console.log('✅ Ship placement saved successfully');

      } catch (error) {
        console.error('Error saving ship placement:', error);
        setErrorMessage(error.message);
        setIsSaving(false);
      }
    }
  };

  const handleReady = async () => {
    if (isSaved) {
      try {
        const roomId = localStorage.getItem('battleshipRoomId');
        const playerId = localStorage.getItem('battleshipPlayerId');
        const db = getDatabase();
        
        // Update player ready status
        await update(ref(db, `rooms/${roomId}/players/${playerId}`), {
          ready: true
        });

        // Check if both players are ready
        const roomRef = ref(db, `rooms/${roomId}`);
        const snapshot = await get(roomRef);
        const room = snapshot.val();

        // Don't auto-start the game anymore - wait for admin to start it
        setStatusMessage("Waiting for admin to start the game...");
      } catch (error) {
        setErrorMessage(error.message);
      }
    }
  };

  const handleDeleteShip = (shipId) => {
    const shipToAdd = SHIPS.find(s => s.id === shipId);

    const newGrid = grid.map(row => 
      row.map(cell => cell === shipId ? null : cell)
    );
    setGrid(newGrid);

    const newPlacedShips = new Map(placedShips);
    newPlacedShips.delete(shipId);
    setPlacedShips(newPlacedShips);

    if (shipToAdd && !catalogQueue.some(s => s.id === shipId)) {
      setCatalogQueue(current => [...current, shipToAdd]);
    }

    const newRotations = new Map(shipRotations);
    newRotations.delete(shipId);
    setShipRotations(newRotations);

    setSelectedShip(null);
  };

  const handleGridCellClick = (x, y) => {
    const shipId = grid[y][x];
    if (shipId) {
      const ship = SHIPS.find(s => s.id === shipId);
      setSelectedShip(ship);
    }
  };

  useEffect(() => {
    const playerData = localStorage.getItem('battleshipPlayerData');

    if (playerData) {
      try {
        const parsedData = JSON.parse(playerData);

        if (parsedData.grid) {
          const newGrid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
          parsedData.grid.forEach((row, y) => {
            row.forEach((cell, x) => {
              if (cell.ship) {
                newGrid[y][x] = cell.ship;
              }
            });
          });
          setGrid(newGrid);
        }

        if (parsedData.ships) {
          const newPlacedShips = new Map();
          Object.entries(parsedData.ships).forEach(([shipId, shipData]) => {
            newPlacedShips.set(shipId, {
              x: shipData.startPosition.x,
              y: shipData.startPosition.y,
              vertical: shipData.orientation === 'vertical'
            });
          });
          setPlacedShips(newPlacedShips);

          setCatalogQueue(current => 
            current.filter(ship => !newPlacedShips.has(ship.id))
          );
        }

        if (parsedData.ships) {
          const newRotations = new Map();
          Object.entries(parsedData.ships).forEach(([shipId, shipData]) => {
            newRotations.set(shipId, shipData.rotation || 0);
          });
          setShipRotations(newRotations);
        }

      } catch (error) {
        console.error('Error loading data from localStorage:', error);
      }
    }
  }, []);

  useEffect(() => {
    const roomId = localStorage.getItem('battleshipRoomId');
    const playerId = localStorage.getItem('battleshipPlayerId');
    
    if (!roomId || !playerId) return;
    
    const roomRef = ref(getDatabase(), `rooms/${roomId}`);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const room = snapshot.val();
      if (!room || !room.players) return;
      
      const players = Object.entries(room.players);
      if (players.length < 2) return;
      
      // If we're ready but other player isn't
      if (isSaved) {
        const otherPlayer = players.find(([id]) => id !== playerId);
        if (otherPlayer && !otherPlayer[1].ready) {
          setStatusMessage("Waiting for other player to get ready...");
        } else {
          setStatusMessage("Both players ready! Waiting for admin to start the game...");
        }
      }
      
      // If admin started the game
      if (room.countdown) {
        setStatusMessage(`Game starting in ${room.countdown}...`);
      }
      
      // If game started, navigate to the game
      if (room.gameStarted) {
        navigate(`/game/${roomId}`);
      }
    });
    
    return () => unsubscribe();
  }, [isSaved, navigate]);

  useEffect(() => {
    // Prevent context menu globally during ship placement
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('contextmenu', handleContextMenu);
    
    // Add touch-action CSS to prevent browser handling of touch events
    document.body.style.touchAction = 'none';

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.body.style.touchAction = '';
    };
  }, []);

  return (
    <DndProvider backend={DndBackend}>
      <div className="flex flex-col items-center gap-6 sm:gap-8 p-4 sm:p-8 bg-gray-900/50 rounded-xl select-none touch-none">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Place Your Ships</h2>
          <div className="flex gap-2">
            {selectedShip && (
              <button
                onClick={handleRotateShip}
                className="px-3 sm:px-4 py-1 sm:py-2 bg-purple-500 text-white rounded text-sm sm:text-base hover:bg-purple-600"
              >
                Rotate
              </button>
            )}
            <button
              onClick={handleClearPlacement}
              className="px-3 sm:px-4 py-1 sm:py-2 bg-red-500 text-white rounded text-sm sm:text-base hover:bg-red-600"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-8 min-h-[72px] sm:min-h-[96px] items-center justify-center w-full">
          {catalogQueue.map(ship => (
            <Ship 
              key={ship.id}
              ship={ship}
              isPlaced={false}
              onClick={() => handleShipSelect(ship)}
              rotation={0}
              disabled={placedShips.has(ship.id)}
            />
          ))}
          {catalogQueue.length === 0 && (
            <div className="text-gray-400 italic animate-pulse">
              All ships have been placed
            </div>
          )}
        </div>

        <div className="relative">
          {selectedShip && placedShips.has(selectedShip.id) && (
            <ShipControls
              onRotate={handleRotateShip}
              onDelete={() => handleDeleteShip(selectedShip.id)}
              disabled={false}
            />
          )}
          
          <div className="overflow-x-auto w-full md:w-auto">
            <div className="grid grid-cols-8 gap-1 sm:gap-2 bg-gray-800 p-3 sm:p-4 rounded-lg">
              {grid.map((row, y) => 
                row.map((cell, x) => (
                  <Cell
                    key={`${x}-${y}`}
                    x={x}
                    y={y}
                    onDrop={handleDrop}
                    onHover={handleHover}
                    onClick={() => handleGridCellClick(x, y)}
                    isValidPlacement={
                      hoverCoords && 
                      checkValidPlacement(x, y, hoverCoords.ship, hoverCoords.isVertical)
                    }
                  >
                    {cell && (
                      <Ship
                        ship={SHIPS.find(s => s.id === cell)}
                        isPlaced={true}
                        onClick={() => {
                          const ship = SHIPS.find(s => s.id === cell);
                          if (ship) setSelectedShip(ship);
                        }}
                        rotation={shipRotations.get(cell) || 0}
                        position={{ x, y }}
                      />
                    )}
                  </Cell>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
          <button
            onClick={handleComplete}
            disabled={placedShips.size !== SHIPS.length || isSaving}
            className={`
              px-6 py-3 rounded-lg text-white text-lg font-bold
              flex items-center gap-2 transition-all duration-300
              ${placedShips.size === SHIPS.length && !isSaving
                ? 'bg-blue-500 hover:bg-blue-600 transform hover:scale-105'
                : 'bg-gray-500 cursor-not-allowed opacity-50'}
            `}
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <FaCheck size={20} />
                Confirm Placement
              </>
            )}
          </button>
          
          <button
            onClick={handleReady}
            disabled={!isSaved}
            className={`
              px-6 py-3 rounded-lg text-white text-lg font-bold
              flex items-center gap-2 transition-all duration-300
              ${isSaved 
                ? 'bg-green-500 hover:bg-green-600 transform hover:scale-105'
                : 'bg-gray-500 cursor-not-allowed opacity-50'}
            `}
          >
            Ready to Battle
          </button>
        </div>
        
        {errorMessage && (
          <div className="text-red-500 mt-2 text-center">
            {errorMessage}
          </div>
        )}
        
        {isSaved && (
          <div class="text-green-500 mt-2 text-center animate-pulse">
            Ship placements saved successfully! Click "Ready" to continue.
          </div>
        )}

        {statusMessage && (
          <div className="text-blue-500 mt-2 text-center font-bold animate-pulse">
            {statusMessage}
          </div>
        )}
      </div>
    </DndProvider>
  );
};

export default ShipPlacement;