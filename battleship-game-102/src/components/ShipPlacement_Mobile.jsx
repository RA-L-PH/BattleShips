import React, { useState, useCallback, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { FaTrash, FaCheck, FaShip, FaCopy } from 'react-icons/fa';
import { BiRotateRight } from 'react-icons/bi';
import { getDatabase, ref, get, update, onValue } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { getGridSize, getShipConfiguration } from '../services/gameService';

// Mobile uses touch backend
const DndBackend = TouchBackend;

// Default ship configuration - will be overridden by room settings
const DEFAULT_SHIPS = [
  { id: 'carrier', name: 'Carrier', size: 5, color: 'bg-blue-500' },
  { id: 'battleship', name: 'Battleship', size: 4, color: 'bg-green-500' },
  { id: 'cruiser', name: 'Cruiser', size: 3, color: 'bg-yellow-500' },
  { id: 'destroyer', name: 'Destroyer', size: 2, color: 'bg-red-500' },
  { id: 'scout', name: 'Scout', size: 2, color: 'bg-violet-500' }
];

// Mobile Ship component - optimized for touch
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
        gap: '0px',
      }}
    >      {Array(ship.size).fill(null).map((_, i) => (
        <div
          key={i}
          className={`
            w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 ${ship.color}
            border border-gray-600 rounded
            transition-all duration-200
            select-none
          `}
        />
      ))}
      {!isPlaced && (
        <div className="absolute -top-6 left-0 text-white text-xs 
                      bg-gray-800/90 px-1 py-0.5 rounded-md flex items-center gap-1
                      whitespace-nowrap select-none">
          <FaShip size={10} />
          {ship.name}
        </div>
      )}
    </div>
  );
};

// Mobile Cell component - larger touch targets
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

  const handleTouchStart = (e) => {
    if (e.target.closest('.ship-draggable')) {
      return;
    }
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
      {!children && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500 opacity-0 hover:opacity-100">
          {String.fromCharCode(65 + x)}{8 - y}
        </div>
      )}
    </div>
  );
};

const ShipPlacement_Mobile = () => {
  const navigate = useNavigate();
  
  // State for dynamic configuration
  const [GRID_SIZE, setGridSize] = useState(8);
  const [SHIPS, setShips] = useState(DEFAULT_SHIPS);
  const [MAX_SHIPS, setMaxShips] = useState(5);
  const [roomData, setRoomData] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [_isHost, setIsHost] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Existing state
  const [grid, setGrid] = useState([]);
  const [placedShips, setPlacedShips] = useState(new Map());
  const [selectedShip, setSelectedShip] = useState(null);
  const [shipRotations, setShipRotations] = useState(new Map());
  const [hoverCoords, setHoverCoords] = useState(null);
  const [catalogQueue, setCatalogQueue] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Initialize grid based on size
  const createEmptyGrid = useCallback((size) => {
    return Array(size).fill().map(() => Array(size).fill(null));
  }, []);

  // Load room settings and configure game
  useEffect(() => {
    const loadRoomSettings = async () => {
      try {
        const currentRoomId = localStorage.getItem('battleshipRoomId');
        const currentPlayerId = localStorage.getItem('battleshipPlayerId');
          
        if (!currentRoomId) {
          setGrid(createEmptyGrid(8));
          setCatalogQueue([...DEFAULT_SHIPS]);
          return;
        }

        setRoomId(currentRoomId);

        const db = getDatabase();
        const roomRef = ref(db, `rooms/${currentRoomId}`);
        const snapshot = await get(roomRef);
        const roomData = snapshot.val();
        
        if (roomData) {
          setRoomData(roomData);

          if (currentPlayerId && roomData.hostId) {
            setIsHost(currentPlayerId === roomData.hostId);
          }

          console.log('Room data loaded:', {
            roomId: currentRoomId,
            gameMode: roomData.gameMode,
            hostId: roomData.hostId,
            currentPlayerId,
            isHost: currentPlayerId === roomData.hostId
          });

          if (roomData.settings) {
            const gridSize = getGridSize(roomData.settings);
            const ships = getShipConfiguration(roomData.settings);
            
            setGridSize(gridSize);
            setShips(ships);
            setMaxShips(ships.length);
            setGrid(createEmptyGrid(gridSize));
            setCatalogQueue([...ships]);
          } else {
            setGrid(createEmptyGrid(8));
            setCatalogQueue([...DEFAULT_SHIPS]);
          }
        } else {
          setGrid(createEmptyGrid(8));
          setCatalogQueue([...DEFAULT_SHIPS]);
        }
      } catch (error) {
        console.error('Error loading room settings:', error);
        setGrid(createEmptyGrid(8));
        setCatalogQueue([...DEFAULT_SHIPS]);
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
      
      if (checkY >= GRID_SIZE || checkX >= GRID_SIZE) return false;
      
      const cellContent = grid[checkY] && grid[checkY][checkX];
      if (cellContent && cellContent !== ship.id) return false;
    }

    if (!placedShips.has(ship.id) && placedShips.size >= MAX_SHIPS) return false;

    return true;
  }, [grid, placedShips, GRID_SIZE, MAX_SHIPS]);

  const handleDrop = (x, y, ship, shipIsVertical) => {
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

    if (!placedShips.has(ship.id)) {
      setCatalogQueue(current => current.filter(s => s.id !== ship.id));
    }

    setSelectedShip(ship);
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

  const handleAutoPlace = () => {
    const newGrid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
    const newPlacedShips = new Map();
    const newRotations = new Map();
    
    SHIPS.forEach((ship) => {
      let placed = false;
      const maxAttempts = 100;
      let attempts = 0;

      while (!placed && attempts < maxAttempts) {
        const x = Math.floor(Math.random() * GRID_SIZE);
        const y = Math.floor(Math.random() * GRID_SIZE);
        const vertical = Math.random() < 0.5;
        
        const fitsHorizontally = !vertical && x + ship.size <= GRID_SIZE;
        const fitsVertically = vertical && y + ship.size <= GRID_SIZE;
        
        if ((fitsHorizontally || fitsVertically) && x >= 0 && y >= 0) {
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
            for (let i = 0; i < ship.size; i++) {
              const placeX = vertical ? x : x + i;
              const placeY = vertical ? y + i : y;
              newGrid[placeY][placeX] = ship.id;
            }
            
            newPlacedShips.set(ship.id, { x, y, vertical });
            newRotations.set(ship.id, vertical ? 90 : 0);
            placed = true;
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
        }

        setIsSaving(false);
        setIsSaved(true);

      } catch (error) {
        setErrorMessage(error.message);
        setIsSaving(false);
      }
    }
  };

  const handleReady = async () => {
    console.log("handleReady called, isSaved:", isSaved);
    
    if (isSaved) {
      try {
        const roomId = localStorage.getItem('battleshipRoomId');
        const playerId = localStorage.getItem('battleshipPlayerId');
        const db = getDatabase();
        
        await update(ref(db, `rooms/${roomId}/players/${playerId}`), {
          ready: true
        });

        const roomRef = ref(db, `rooms/${roomId}`);
        const snapshot = await get(roomRef);
        const room = snapshot.val();

        if (!room) {
          setErrorMessage("Room not found");
          return;
        }

        const gameMode = room.gameMode || 'admin';
        const players = Object.values(room.players || {});
        const allPlayersReady = players.length === 2 && players.every(player => player.ready);

        if (allPlayersReady) {
          if (gameMode === 'random' || gameMode === 'friendly') {
            setStatusMessage("Both players ready! Starting game in 3 seconds...");
            
            setTimeout(() => {
              setStatusMessage("Game starting in 2...");
              setTimeout(() => {
                setStatusMessage("Game starting in 1...");
                setTimeout(async () => {
                  try {
                    const { startGame } = await import('../services/adminService');
                    await startGame(roomId);
                    setStatusMessage("Starting game...");
                  } catch (error) {
                    console.error("Error starting game:", error);
                    setStatusMessage("Error starting game. Please try again...");
                  }
                }, 1000);
              }, 1000);
            }, 1000);
          } else {
            setStatusMessage("Both players ready! Waiting for admin to start the game...");
          }
        } else {
          setStatusMessage("Waiting for other player to get ready...");
        }
      } catch (error) {
        console.error("Error in handleReady:", error);
        setErrorMessage(error.message);
      }
    } else {
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
      const ship = SHIPS.find(s => s.id === shipId);
      setSelectedShip(ship);
    } else if (selectedShip && !placedShips.has(selectedShip.id)) {
      const isVertical = (shipRotations.get(selectedShip.id) || 0) === 90;
      if (checkValidPlacement(x, y, selectedShip, isVertical)) {
        handleDrop(x, y, selectedShip, isVertical);
      }
    }
  };

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
      
      if (isSaved) {
        const otherPlayer = players.find(([id]) => id !== playerId);
        if (otherPlayer && !otherPlayer[1].ready) {
          setStatusMessage("Waiting for other player to get ready...");
        } else {
          setStatusMessage("Both players ready! Waiting for admin to start the game...");
        }
      }
        
      if (room.countdown) {
        setStatusMessage(`Game starting in ${room.countdown}...`);
      }
        
      if (room.gameStarted) {
        navigate(`/room/${roomId}`);
      }
    });
    
    return () => unsubscribe();
  }, [isSaved, navigate]);

  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.body.style.touchAction = 'none';

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.body.style.touchAction = '';
    };
  }, []);

  const handleCopyRoomId = async () => {
    console.log('Copy button clicked, roomId:', roomId);
    
    if (!roomId) {
      console.error('No room ID to copy');
      return;
    }

    try {
      await navigator.clipboard.writeText(roomId);
      console.log('Successfully copied to clipboard:', roomId);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.log('Clipboard API failed, using fallback:', error);
      try {
        const textArea = document.createElement('textarea');
        textArea.value = roomId;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          console.log('Fallback copy successful');
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        } else {
          console.error('Fallback copy failed');
        }
      } catch (fallbackError) {
        console.error('Both clipboard methods failed:', fallbackError);
      }
    }
  };

  return (
    <DndProvider backend={DndBackend}>
      <div className="min-h-screen bg-gray-900">
        
        {/* Mobile Layout - Optimized for touch */}
        <div className="flex flex-col h-screen max-w-md mx-auto bg-gray-800 border-2 border-gray-600 rounded-lg">
          
          {/* Top Section - Room Code */}
          {roomData && roomData.gameMode === 'friendly' && roomId && (
            <div className="bg-gray-700 border-b border-gray-600 p-3 text-center">
              <div className="flex items-center gap-2 justify-center">
                <span className="bg-gray-900 text-white px-3 py-2 rounded-lg font-mono text-base font-bold">
                  {roomId}
                </span>
                <button
                  onClick={handleCopyRoomId}
                  className={`px-3 py-2 rounded-lg transition-all duration-200 ${
                    copySuccess 
                      ? 'bg-green-600 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                  title="Copy room code"
                >
                  {copySuccess ? <FaCheck size={14} /> : <FaCopy size={14} />}
                </button>
              </div>
            </div>
          )}

          {/* Confirm and Ready Buttons - Compact */}
          <div className="px-2 py-2 border-b border-gray-600">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleComplete}
                disabled={placedShips.size !== SHIPS.length || isSaving}
                className={`py-2 px-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  placedShips.size === SHIPS.length && !isSaving
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isSaving ? 'Saving...' : 'Confirm'}
              </button>
              <button
                onClick={handleReady}
                disabled={!isSaved}
                className={`py-2 px-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  isSaved
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                Ready
              </button>
            </div>
          </div>

          {/* Grid Section - Compact */}
          <div className="flex-1 px-2 py-2 bg-gray-700 mx-2 my-2 rounded-lg flex items-center justify-center">
            <div className="bg-gray-800 p-2 rounded-lg border border-gray-600">
              <div className="text-center text-white text-xs mb-2 font-bold">GRID</div>
              <div 
                className="grid bg-gray-900 p-2 rounded"
                style={{ 
                  gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                  gap: '1px',
                  width: 'fit-content',
                  height: 'fit-content'
                }}
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
                        checkValidPlacement(
                          hoverCoords.x, 
                          hoverCoords.y, 
                          hoverCoords.ship, 
                          hoverCoords.isVertical
                        )
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

          {/* Ships Section - Enhanced Horizontal Scroll */}
          <div className="px-1 py-1 border-b border-gray-600 bg-gray-700 mx-1 rounded-lg mb-1">
            <div className="text-center text-white text-xs mb-1 font-bold">Ships ({catalogQueue.length})</div>
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
              <div className="flex gap-1.5 pb-2 min-w-max px-1">
                {catalogQueue.map((ship) => (
                  <div 
                    key={ship.id} 
                    className={`flex-shrink-0 p-1 bg-gray-800 rounded border-2 transition-all duration-200 min-w-16 ${
                      selectedShip?.id === ship.id 
                        ? 'border-blue-400 bg-blue-900/40 shadow-sm' 
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                    onClick={() => setSelectedShip(ship)}
                  >
                    <Ship 
                      ship={ship}
                      isPlaced={false}
                      onClick={() => setSelectedShip(ship)}
                      rotation={shipRotations.get(ship.id) || 0}
                      disabled={placedShips.has(ship.id)}
                    />
                    <div className="text-xs text-gray-300 text-center mt-0.5 truncate">
                      {ship.name}
                    </div>
                    <div className="text-xs text-gray-500 text-center truncate">
                      {ship.size}
                    </div>
                  </div>
                ))}
                {catalogQueue.length === 0 && (
                  <div className="text-gray-400 text-xs text-center py-2 px-3 flex items-center justify-center min-w-full bg-gray-800 rounded border border-green-600">
                    ✅ All ships placed!
                  </div>
                )}
              </div>
            </div>
          
            {/* Quick placement status */}
            <div className="text-center text-gray-400 text-xs mt-1">
              {placedShips.size}/{SHIPS.length} placed • Tap to select
            </div>
          </div>

          {/* Tools Section - Ultra Compact */}
          <div className="border-t border-gray-600 px-1 py-1 bg-gray-750 rounded-b-lg">
            <div className="text-center text-white text-xs mb-1 font-bold">Tools</div>
            <div className="grid grid-cols-4 gap-1">
              <button
                onClick={handleRotateShip}
                disabled={!selectedShip || !placedShips.has(selectedShip?.id)}
                className={`px-1 py-1.5 text-white rounded text-xs flex flex-col items-center justify-center transition-colors ${
                  selectedShip && placedShips.has(selectedShip.id)
                    ? 'bg-purple-500 hover:bg-purple-600 shadow-sm'
                    : 'bg-gray-500 opacity-50 cursor-not-allowed'
                }`}
                title="Rotate selected ship"
              >
                <BiRotateRight size={14} />
                <span className="text-xs mt-0.5">Rotate</span>
              </button>
              <button
                onClick={handleAutoPlace}
                disabled={catalogQueue.length === 0}
                className={`px-1 py-1.5 text-white rounded text-xs flex flex-col items-center justify-center transition-colors ${
                  catalogQueue.length > 0
                    ? 'bg-blue-500 hover:bg-blue-600 shadow-sm'
                    : 'bg-gray-500 opacity-50 cursor-not-allowed'
                }`}
                title="Auto-place remaining ships"
              >
                <FaShip size={12} />
                <span className="text-xs mt-0.5">Auto</span>
              </button>
              <button
                onClick={handleClearPlacement}
                disabled={placedShips.size === 0}
                className={`px-1 py-1.5 text-white rounded text-xs flex flex-col items-center justify-center transition-colors ${
                  placedShips.size > 0
                    ? 'bg-red-500 hover:bg-red-600 shadow-sm'
                    : 'bg-gray-500 opacity-50 cursor-not-allowed'
                }`}
                title="Clear all ships"
              >
                <FaTrash size={12} />
                <span className="text-xs mt-0.5">Clear</span>
              </button>
              <button
                onClick={() => selectedShip && placedShips.has(selectedShip.id) && handleDeleteShip(selectedShip.id)}
                disabled={!selectedShip || !placedShips.has(selectedShip?.id)}
                className={`px-1 py-1.5 text-white rounded text-xs flex flex-col items-center justify-center transition-colors ${
                  selectedShip && placedShips.has(selectedShip.id)
                    ? 'bg-orange-500 hover:bg-orange-600 shadow-sm'
                    : 'bg-gray-500 opacity-50 cursor-not-allowed'
                }`}
                title="Delete selected ship"
              >
                <FaTrash size={12} />
                <span className="text-xs mt-0.5">Delete</span>
              </button>
            </div>
          </div>
          
          {/* Status Messages - Ultra Compact */}
          <div className="mt-1 text-center">
            {errorMessage && (
              <div className="text-red-400 text-xs mb-1 px-1 py-0.5 bg-red-900/30 rounded">{errorMessage}</div>
            )}
            {isSaved && (
              <div className="text-green-400 text-xs mb-1 px-1 py-0.5 bg-green-900/30 rounded">Ships saved! ✅</div>
            )}
            {statusMessage && (
              <div className="text-blue-400 text-xs mb-1 font-semibold px-1 py-0.5 bg-blue-900/30 rounded">{statusMessage}</div>
            )}
          </div>
        </div>
      </div>
    </DndProvider>
  );
};

export default ShipPlacement_Mobile;
