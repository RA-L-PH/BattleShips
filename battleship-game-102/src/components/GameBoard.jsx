import React, { useState, useEffect } from 'react';

const GameBoard = ({ 
  grid = [], 
  isPlayerGrid = false,
  reversed = false, 
  onCellClick = null, 
  activeAbility = null,
  reinforcementVertical = false,
  annihilateVertical = false,
  hackerResult = null,
  playerData = {} // Default to empty object to avoid errors
}) => {
  // Ensure we have an 8x8 grid
  const normalizedGrid = Array.isArray(grid) && grid.length === 8 ? grid : Array(8).fill().map(() => 
    Array(8).fill().map(() => ({ ship: null, hit: false, miss: false }))
  );

  const [hoverCoords, setHoverCoords] = useState(null);
  const [lastAttackedCell, setLastAttackedCell] = useState(null);
  
  // Column labels A-H
  const colLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  // Row labels 1-8
  const rowLabels = ['1', '2', '3', '4', '5', '6', '7', '8'];

  // Reset last attacked cell after animation completes
  useEffect(() => {
    if (lastAttackedCell) {
      const timer = setTimeout(() => {
        setLastAttackedCell(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [lastAttackedCell]);

  // For admin view when board is rotated
  const getRotatedLabel = (index, isCol) => {
    if (!reversed) return isCol ? colLabels[index] : rowLabels[index];
    
    // When rotated -90 degrees, swap and adjust indices
    if (isCol) return rowLabels[7 - index];
    return colLabels[index];
  };

  const isAffectedByAbility = (x, y) => {
    if (!activeAbility || !hoverCoords) return false;
    
    switch (activeAbility) {
      case 'NUKE':
        // X pattern for nuke
        return (x === hoverCoords.x && y === hoverCoords.y) || // center
               (Math.abs(x - hoverCoords.x) === 1 && Math.abs(y - hoverCoords.y) === 1); // diagonals
      case 'SCANNER':
        // 2x2 area for scanner
        return x >= hoverCoords.x && x < hoverCoords.x + 2 && 
               y >= hoverCoords.y && y < hoverCoords.y + 2;
      case 'REINFORCEMENT':
        // Size 2 ship for reinforcement, respect orientation
        if (!isPlayerGrid) return false;
        
        if (reinforcementVertical) {
          return x === hoverCoords.x && 
                 y >= hoverCoords.y && 
                 y < hoverCoords.y + 2 && 
                 hoverCoords.y + 2 <= 8;
        } else {
          return y === hoverCoords.y && 
                 x >= hoverCoords.x && 
                 x < hoverCoords.x + 2 && 
                 hoverCoords.x + 2 <= 8;
        }
      case 'GODS_HAND': {
        // 4x4 quadrant
        const quadX = Math.floor(hoverCoords.x / 4) * 4;
        const quadY = Math.floor(hoverCoords.y / 4) * 4;
        return x >= quadX && x < quadX + 4 && y >= quadY && y < quadY + 4;
      }
      case 'ANNIHILATE':
        if (annihilateVertical) {
          // Vertical pattern (3 consecutive cells)
          return x === hoverCoords.x && 
                 y >= hoverCoords.y && 
                 y <= hoverCoords.y + 2 &&
                 hoverCoords.y + 2 < 8;
        } else {
          // Horizontal pattern (3 consecutive cells)
          return y === hoverCoords.y && 
                 x >= hoverCoords.x - 1 && 
                 x <= hoverCoords.x + 1 && 
                 hoverCoords.x > 0 && 
                 hoverCoords.x < 7;
        }
      default:
        // Single cell for other abilities
        return x === hoverCoords.x && y === hoverCoords.y;
    }
  };

  const renderCell = (cell = {}, x, y) => {
    let cellContent = null;
    let cellClass = "border-2 border-gray-600 rounded flex items-center justify-center transition-all duration-200 ";
    
    // Add responsive sizing
    cellClass += "w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 ";

    // Coordinate label for this cell (for reference only, not displayed to players)
    const cellLabel = `${colLabels[x]}${rowLabels[y]}`;
    
    // Check if this cell is revealed by the hacker ability
    const isHackerRevealed = hackerResult && hackerResult.col === x && hackerResult.row === y;

    // Add animations for recently attacked cells
    if (lastAttackedCell && lastAttackedCell.x === x && lastAttackedCell.y === y) {
      cellClass += "animate-pulse scale-105 shadow-lg shadow-white/30 ";
    }

    // Check for hacker revealed cells (enemy ship revealed)
    if (!isPlayerGrid && isHackerRevealed) {
      cellClass += "bg-green-500 border-green-700 animate-pulse-light ";
    }

    if (cell.hit === true) {
      cellContent = "✗"; // Use X for hits
      cellClass += "bg-red-500 text-white text-xl sm:text-2xl md:text-3xl font-bold animate-hit";
      
      // Add special styling if the hit was from a counter-attack
      if (cell.fromCounter) {
        cellClass += " border-2 border-blue-400 shadow-md shadow-blue-500/50 ";
      }
      
      // Only show attack labels in admin view, not player view
      if (cell.attackLabel && reversed) { // 'reversed' is true for admin view
        cellContent = (
          <div className="flex flex-col items-center">
            <div>{cellContent}</div>
            <div className="text-xs mt-1 opacity-80">{cell.attackLabel}</div>
            {cell.fromCounter && (
              <div className="text-xs mt-0.5 text-blue-300 font-bold">COUNTER</div>
            )}
          </div>
        );
      }
    } else if (cell.miss === true) {
      cellContent = "○"; // Use O for misses
      cellClass += "bg-blue-500 text-white text-xl sm:text-2xl md:text-3xl font-bold animate-miss";
      
      // Only show attack labels in admin view, not player view
      if (cell.attackLabel && reversed) {
        cellContent = (
          <div className="flex flex-col items-center">
            <div>{cellContent}</div>
            <div className="text-xs mt-1 opacity-80">{cell.attackLabel}</div>
          </div>
        );
      }
    } else if (isPlayerGrid && cell.ship) {
      cellClass += "bg-green-500 border-green-700 animate-pulse-light"; // Show your ships in green with subtle animation
    } else if (isAffectedByAbility(x, y)) {
      // Visualize different abilities
      switch (activeAbility) {
        case 'NUKE':
          cellClass += "bg-orange-500/60 animate-pulse-danger";
          break;
        case 'ANNIHILATE':
          cellClass += "bg-red-500/60 animate-pulse-danger";
          break;
        case 'SCANNER':
          cellClass += "bg-yellow-500/60 animate-pulse-info";
          break;
        case 'REINFORCEMENT':
          cellClass += "bg-green-500/60 animate-pulse-success";
          break;
        case 'GODS_HAND':
          cellClass += "bg-purple-700/60 animate-pulse-special";
          break;
        default:
          cellClass += "bg-purple-500/60 animate-pulse";
      }
    } else if ((isPlayerGrid && activeAbility === 'REINFORCEMENT') || (!isPlayerGrid && activeAbility)) {
      cellClass += "hover:bg-gray-500 transform hover:scale-105"; // Highlight potential target cells with scale effect
    } else {
      cellClass += "bg-gray-700 hover:bg-gray-600 transform hover:scale-105"; // Default cell appearance with scale effect
    }

    const handleClick = () => {
      if (onCellClick) {
        // Allow clicking on own grid for reinforcement
        if (isPlayerGrid && activeAbility === 'REINFORCEMENT') {
          setLastAttackedCell({ x, y });
          onCellClick(x, y, true, cellLabel);
        }
        // Allow clicking on opponent grid for attack abilities
        else if (!isPlayerGrid && !cell.hit && !cell.miss) {
          setLastAttackedCell({ x, y });
          onCellClick(x, y, false, cellLabel);
        }
      }
    };
    
    const handleMouseEnter = () => {
      if ((isPlayerGrid && activeAbility === 'REINFORCEMENT') || 
          (!isPlayerGrid && activeAbility)) {
        setHoverCoords({ x, y });
      }
    };
    
    const handleMouseLeave = () => {
      if (hoverCoords?.x === x && hoverCoords?.y === y) {
        setHoverCoords(null);
      }
    };

    return (
      <div
        className={cellClass}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ 
          cursor: ((isPlayerGrid && activeAbility === 'REINFORCEMENT') || 
                  (!isPlayerGrid && onCellClick && !cell.hit && !cell.miss)) 
            ? 'pointer' : 'default',
          transition: 'all 0.2s ease-in-out'
        }}
        title={cellLabel} // Keep label as title for accessibility
      >
        {cellContent}
      </div>
    );
  };

  // Check if JAM is active on this player's grid
  const jamActive = isPlayerGrid && playerData?.abilities?.JAM?.installed && !playerData?.abilities?.JAM?.used;

  return (
    // Add classes to your grid container
    <div className={`grid-container ${jamActive ? 'jam-shield-active' : ''}`}>
      <div className="bg-gray-800 p-3 sm:p-4 md:p-6 rounded-lg shadow-lg transition-all duration-300 hover:shadow-2xl">
        <div className="flex">
          {/* Empty corner cell */}
          <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center"></div>
          
          {/* Column labels (A-H), or rotated for admin view */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div 
              key={`col-${i}`} 
              className="w-8 h-6 sm:w-10 sm:h-8 md:w-12 flex items-center justify-center text-gray-300 font-semibold"
            >
              {getRotatedLabel(i, true)}
            </div>
          ))}
        </div>
        
        {normalizedGrid.map((row, y) => (
          <div key={`row-${y}`} className="flex">
            {/* Row labels (1-8), or rotated for admin view */}
            <div className="w-6 h-8 sm:w-8 sm:h-10 md:h-12 flex items-center justify-center text-gray-300 font-semibold">
              {getRotatedLabel(y, false)}
            </div>
            
            {/* Grid cells */}
            <div className="flex">
              {row.map((cell, x) => (
                <React.Fragment key={`${y}-${x}`}>
                  {renderCell(cell, x, y)}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
        
        {activeAbility && (
          <div className="mt-2 sm:mt-3 text-center text-xs sm:text-sm text-white animate-pulse">
            Using <span className="font-bold">{activeAbility}</span> ability
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBoard;