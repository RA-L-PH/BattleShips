import React, { useState, useCallback, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { isTouchDevice } from '../utils/deviceDetect';
import { FaTrash, FaCheck, FaShip } from 'react-icons/fa';
import { BiRotateRight } from 'react-icons/bi';
import { getDatabase, ref, get, update, onValue } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { getGridSize, getShipConfiguration } from '../services/gameService';

// Add this utility function in a separate file:
// filepath: e:\VSCODE\IEEE-battleship102\battleship-game-102\src\utils\deviceDetect.js
// export const isTouchDevice = () => {
//   return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
// };

// Use a multi-backend setup or conditionally choose the right backend
const DndBackend = isTouchDevice() ? TouchBackend : HTML5Backend;

// Default ship configuration - will be overridden by room settings
const DEFAULT_SHIPS = [
  { id: 'carrier', name: 'Carrier', size: 5, color: 'bg-blue-500' },
  { id: 'battleship', name: 'Battleship', size: 4, color: 'bg-green-500' },
  { id: 'cruiser', name: 'Cruiser', size: 3, color: 'bg-yellow-500' },
  { id: 'destroyer', name: 'Destroyer', size: 2, color: 'bg-red-500' },
  { id: 'scout', name: 'Scout', size: 2, color: 'bg-violet-500' }
];

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
  const handleTouchStart = () => {
    // Don't prevent default so dragging works
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) onClick();
  };

  return (
    <div
      ref={drag}
      onClick={handleClick}
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

  const handleClick = () => {
    if (onClick) onClick();
  };

  return (
    <div
      ref={drop}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      className={`
        w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 border border-gray-600 rounded
        transition-all duration-200 select-none touch-none relative
        ${isOver && isValidPlacement ? 'bg-green-500/50 border-green-400' : ''}
        ${isOver && !isValidPlacement ? 'bg-red-500/50 border-red-400' : ''}
        ${!isOver ? 'bg-gray-700 hover:bg-gray-600' : ''}
      `}
      title={`Cell ${String.fromCharCode(65 + x)}${8 - y}`}
    >
      {children}
      {/* Grid coordinate labels for debugging */}
      {!children && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500 opacity-0 hover:opacity-100">
          {String.fromCharCode(65 + x)}{8 - y}
        </div>
      )}
    </div>
  );
};

const ShipPlacement = ({ onComplete }) => {
  const navigate = useNavigate();
  
  // State for dynamic configuration
  const [GRID_SIZE, setGridSize] = useState(8);
  const [SHIPS, setShips] = useState(DEFAULT_SHIPS);
  const [MAX_SHIPS, setMaxShips] = useState(5);
  
  // Existing state
  const [grid, setGrid] = useState([]);
  const [placedShips, setPlacedShips] = useState(new Map());
  const [selectedShip, setSelectedShip] = useState(null);
  const [shipRotations, setShipRotations] = useState(new Map());
  const [hoverCoords, setHoverCoords] = useState(null);
  const [catalogQueue, setCatalogQueue] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [placementMode, setPlacementMode] = useState('drag'); // 'drag' or 'click'

  // Initialize grid based on size
  const createEmptyGrid = useCallback((size) => {
    return Array(size).fill().map(() => Array(size).fill(null));
  }, []);
  // Load room settings and configure game
  useEffect(() => {
    const loadRoomSettings = async () => {
      try {
        const roomId = localStorage.getItem('battleshipRoomId');
        if (!roomId) {
          // Use defaults if no room
          setGrid(createEmptyGrid(GRID_SIZE));
          setCatalogQueue([...SHIPS]);
          return;
        }

        const db = getDatabase();
        const roomRef = ref(db, `rooms/${roomId}`);
        const snapshot = await get(roomRef);
        const roomData = snapshot.val();

        if (roomData && roomData.settings) {
          const gridSize = getGridSize(roomData.settings);
          const ships = getShipConfiguration(roomData.settings);
          
          setGridSize(gridSize);          setShips(ships);
          setMaxShips(ships.length);
          setGrid(createEmptyGrid(gridSize));
          setCatalogQueue([...ships]);        } else {
          // Use defaults if no settings
          setGrid(createEmptyGrid(GRID_SIZE));
          setCatalogQueue([...SHIPS]);
        }
      } catch (err) {
        // Use defaults if error
        setGrid(createEmptyGrid(GRID_SIZE));
        setCatalogQueue([...SHIPS]);
      }
    };

    loadRoomSettings();
  }, [createEmptyGrid]);
  const checkValidPlacement = useCallback((x, y, ship, vertical) => {
    if (!ship) return false;
    if (!grid || grid.length === 0) return false;

    const size = ship.size;

    // Check bounds
    if (vertical && y + size > GRID_SIZE) return false;
    if (!vertical && x + size > GRID_SIZE) return false;
    if (x < 0 || y < 0) return false;

    // Check if cells are occupied by other ships
    for (let i = 0; i < size; i++) {
      const checkX = vertical ? x : x + i;
      const checkY = vertical ? y + i : y;
      
      // Ensure we're within bounds
      if (checkY >= GRID_SIZE || checkX >= GRID_SIZE) return false;
      
      const cellContent = grid[checkY] && grid[checkY][checkX];
      // Allow placement if cell is empty or contains the same ship we're moving
      if (cellContent && cellContent !== ship.id) return false;
    }

    // Check if we're at max ships (only for new ships)
    if (!placedShips.has(ship.id) && placedShips.size >= MAX_SHIPS) return false;

    return true;
  }, [grid, placedShips, GRID_SIZE, MAX_SHIPS]);  const handleDrop = (x, y, ship, shipIsVertical) => {
    if (!checkValidPlacement(x, y, ship, shipIsVertical)) {
      return;
    }

    // Clear previous placement of this ship
    const newGrid = grid.map(row => row.map(cell => cell === ship.id ? null : cell));

    // Place ship in new position
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

    // Remove from catalog if it was there
    if (!placedShips.has(ship.id)) {
      setCatalogQueue(current => current.filter(s => s.id !== ship.id));
    }    setSelectedShip(ship);
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
  };  const handleClearPlacement = () => {
    setGrid(Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null)));
    setPlacedShips(new Map());
    setShipRotations(new Map());
    setSelectedShip(null);
    setCatalogQueue([...SHIPS].slice(0, MAX_SHIPS));
  };
  const handleAutoPlace = () => {
    const newGrid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
    const newPlacedShips = new Map();
    const newRotations = new Map();
    
    // Simple auto-placement logic
    SHIPS.forEach((ship, index) => {
      let placed = false;
      const maxAttempts = 100;
      let attempts = 0;
      
      while (!placed && attempts < maxAttempts) {
        const x = Math.floor(Math.random() * GRID_SIZE);
        const y = Math.floor(Math.random() * GRID_SIZE);
        const vertical = Math.random() < 0.5;
        
        // Check if ship fits
        const fitsHorizontally = !vertical && x + ship.size <= GRID_SIZE;
        const fitsVertically = vertical && y + ship.size <= GRID_SIZE;
        
        if ((fitsHorizontally || fitsVertically) && x >= 0 && y >= 0) {
          // Check for overlaps
          let canPlace = true;
          for (let i = 0; i < ship.size; i++) {
            const checkX = vertical ? x : x + i;
            const checkY = vertical ? y + i : y;
            if (newGrid[checkY][checkX]) {
              canPlace = false;
              break;
            }
          }
          
          if (canPlace) {
            // Place the ship
            for (let i = 0; i < ship.size; i++) {
              const placeX = vertical ? x : x + i;
              const placeY = vertical ? y + i : y;
              newGrid[placeY][placeX] = ship.id;
            }
            
            newPlacedShips.set(ship.id, { x, y, vertical });
            newRotations.set(ship.id, vertical ? 90 : 0);            placed = true;
          }
        }
        attempts++;
      }
    });
      setGrid(newGrid);
    setPlacedShips(newPlacedShips);
    setShipRotations(newRotations);
    setCatalogQueue([]);
    setSelectedShip(null);
  };
  const updateShipPlacement = async (roomId, playerId, placementData) => {
    try {
      const db = getDatabase();

      const playerRef = ref(db, `rooms/${roomId}/players/${playerId}`);
      const playerSnapshot = await get(playerRef);

      if (!playerSnapshot.exists()) {
        console.error("Player not found in room");
        return false;
      }

      const updates = {};
      updates[`rooms/${roomId}/players/${playerId}/PlacementData`] = placementData;
      // Don't set ready=true here - we'll do that explicitly in handleReady
      // updates[`rooms/${roomId}/players/${playerId}/ready`] = true;

      await update(ref(db), updates);
      console.log("Ship placement data updated successfully");
      return true;
    } catch (error) {
      console.error("Error updating ship placement:", error);
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
        }        setIsSaving(false);
        setIsSaved(true);

      } catch (error) {
        setErrorMessage(error.message);
        setIsSaving(false);
      }
    }
  };  const handleReady = async () => {
    console.log("handleReady called, isSaved:", isSaved);
    
    if (isSaved) {
      try {
        const roomId = localStorage.getItem('battleshipRoomId');
        const playerId = localStorage.getItem('battleshipPlayerId');
        const db = getDatabase();
        
        console.log("Setting player ready status...", { roomId, playerId });
        
        // Update player ready status
        await update(ref(db, `rooms/${roomId}/players/${playerId}`), {
          ready: true
        });

        console.log("Player ready status updated, checking room state...");

        // Check if both players are ready and handle auto-start based on game mode
        const roomRef = ref(db, `rooms/${roomId}`);
        const snapshot = await get(roomRef);
        const room = snapshot.val();

        if (!room) {
          console.error("Room not found!");
          setErrorMessage("Room not found");
          return;
        }

        console.log("Room data:", { 
          gameMode: room.gameMode, 
          playerCount: Object.keys(room.players || {}).length,
          players: Object.keys(room.players || {}),
          playersReady: Object.values(room.players || {}).map(p => ({ id: p.id, ready: p.ready }))
        });

        const gameMode = room.gameMode || 'admin';
        const players = Object.values(room.players || {});
        const allPlayersReady = players.length === 2 && players.every(player => player.ready);

        console.log("Game state check:", { 
          gameMode, 
          playerCount: players.length, 
          allPlayersReady,
          readyStates: players.map(p => p.ready)
        });

        if (allPlayersReady) {
          // Auto-start games for random and friendly modes with countdown
          if (gameMode === 'random' || gameMode === 'friendly') {
            try {
              console.log("Starting auto-start countdown for", gameMode, "game");
              setStatusMessage("Both players ready! Starting game in 3 seconds...");
              
              // Add a short countdown for excitement
              setTimeout(() => {
                setStatusMessage("Game starting in 2...");
                setTimeout(() => {
                  setStatusMessage("Game starting in 1...");
                  setTimeout(async () => {
                    try {
                      console.log("Importing and calling startGame...");
                      const { startGame } = await import('../services/adminService');
                      await startGame(roomId);
                      console.log("startGame completed successfully");
                      setStatusMessage("Starting game...");
                    } catch (error) {
                      console.error("Error starting game:", error);
                      setStatusMessage("Error starting game. Please try again...");
                    }
                  }, 1000);
                }, 1000);
              }, 1000);
            } catch (error) {
              console.error("Error in countdown:", error);
              setStatusMessage("Error starting game. Waiting for manual start...");
            }
          } else {
            // For admin and custom games, wait for manual start
            console.log("Waiting for manual start for", gameMode, "game");
            setStatusMessage("Both players ready! Waiting for admin to start the game...");
          }
        } else {
          // Waiting for other player
          console.log("Waiting for other player to be ready");
          setStatusMessage("Waiting for other player to get ready...");
        }
      } catch (error) {
        console.error("Error in handleReady:", error);
        setErrorMessage(error.message);
      }
    } else {
      console.log("Cannot set ready - ships not saved yet");
      setErrorMessage("Please save your ship placement first");
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
      // If clicking on a placed ship, select it
      const ship = SHIPS.find(s => s.id === shipId);
      setSelectedShip(ship);
    } else if (selectedShip && !placedShips.has(selectedShip.id)) {
      // If clicking on empty cell and have a selected unplaced ship, try to place it
      const isVertical = (shipRotations.get(selectedShip.id) || 0) === 90;
      if (checkValidPlacement(x, y, selectedShip, isVertical)) {
        handleDrop(x, y, selectedShip, isVertical);
      }
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
          setShipRotations(newRotations);        }

      } catch (error) {
        // Error loading data from localStorage - continue with default state
      }
    }
  }, [GRID_SIZE]);
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
        // If game started, navigate to the game room
      if (room.gameStarted) {
        navigate(`/room/${roomId}`);
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
      <div className="flex flex-col items-center gap-6 sm:gap-8 p-4 sm:p-8 bg-gray-900/50 rounded-xl select-none touch-none">        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Place Your Ships</h2>
          <div className="text-sm text-gray-300">
            {placedShips.size}/{SHIPS.length} ships placed
          </div>          <div className="flex gap-2">
            {selectedShip && (
              <button
                onClick={handleRotateShip}
                className="px-3 sm:px-4 py-1 sm:py-2 bg-purple-500 text-white rounded text-sm sm:text-base hover:bg-purple-600"
              >
                Rotate
              </button>
            )}
            <button
              onClick={handleAutoPlace}
              className="px-3 sm:px-4 py-1 sm:py-2 bg-blue-500 text-white rounded text-sm sm:text-base hover:bg-blue-600"
            >
              Auto Place
            </button>
            <button
              onClick={handleClearPlacement}
              className="px-3 sm:px-4 py-1 sm:py-2 bg-red-500 text-white rounded text-sm sm:text-base hover:bg-red-600"
            >
              Clear All
            </button>
          </div>
        </div>        <div className="flex flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-8 min-h-[72px] sm:min-h-[96px] items-center justify-center w-full">
          {catalogQueue.length > 0 && (
            <div className="w-full text-center text-sm text-gray-400 mb-2">
              Click to select a ship, then drag it to the grid or click on a grid cell to place it
            </div>
          )}
          {catalogQueue.map(ship => (
            <div key={ship.id} className="relative">
              <Ship 
                ship={ship}
                isPlaced={false}
                onClick={() => handleShipSelect(ship)}
                rotation={0}
                disabled={placedShips.has(ship.id)}
              />
              {selectedShip?.id === ship.id && (
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-pulse"></div>
              )}
            </div>
          ))}
          {catalogQueue.length === 0 && (
            <div className="text-gray-400 italic animate-pulse">
              All ships have been placed! Click "Confirm Placement" to continue.
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
            <div 
              className={`grid gap-1 sm:gap-2 bg-gray-800 p-3 sm:p-4 rounded-lg`}
              style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
            >
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
          <div className="text-green-500 mt-2 text-center animate-pulse">
            Ship placements saved successfully! Click "Ready" to continue.
          </div>
        )}        {statusMessage && (
          <div className="text-blue-500 mt-2 text-center font-bold animate-pulse">
            {statusMessage}
          </div>
        )}

        {/* Troubleshooting information */}
        {catalogQueue.length > 0 && placedShips.size === 0 && (
          <div className="text-yellow-400 text-center text-sm mt-4 bg-yellow-900/20 border border-yellow-600 rounded p-3">
            <strong>Having trouble placing ships?</strong><br/>
            • Try the "Auto Place" button for automatic placement<br/>
            • Or select a ship above, then click on the grid to place it<br/>
            • You can also drag ships from the list above onto the grid
          </div>
        )}
      </div>
    </DndProvider>
  );
};

export default ShipPlacement;