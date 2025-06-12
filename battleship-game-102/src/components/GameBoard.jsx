import React, { useState, useEffect } from 'react';

const GameBoard = ({ 
  grid = [], 
  isPlayerGrid = false,
  reversed = false, 
  onCellClick = null, 
  activeAbility = null,
  reinforcementVertical = false,
  annihilateVertical = false,
  // New ability orientation states
  salvoVertical = false,
  volleyFireVertical = false,
  reconFlybyVertical = false,
  torpedoVertical = false,
  hackerResult = null,
  playerData = {}, // Default to empty object to avoid errors
  gridSize = 8, // Support dynamic grid size
  adminView = false // Flag for admin view specific rendering
}) => {
  // Ensure we have a proper grid with dynamic size
  const normalizedGrid = Array.isArray(grid) && grid.length === gridSize ? grid : 
    Array(gridSize).fill().map(() => 
      Array(gridSize).fill().map(() => ({ ship: null, hit: false, miss: false }))
    );

  const [hoverCoords, setHoverCoords] = useState(null);
  const [lastAttackedCell, setLastAttackedCell] = useState(null);
  
  // Dynamic labels based on grid size
  const colLabels = Array.from({ length: gridSize }, (_, i) => String.fromCharCode(65 + i));
  const rowLabels = Array.from({ length: gridSize }, (_, i) => String(gridSize - i));

  // For consistent grid labeling that matches the requirement:
  // A-H horizontal left to right at the bottom
  // 1-8 vertical bottom to top on the left
  const getDisplayLabel = (index, isCol) => {
    if (isCol) {
      // Column labels A-H from left to right
      return colLabels[index];
    } else {
      // Row labels from bottom to top
      return rowLabels[index];
    }
  };

  // Reset last attacked cell after animation completes
  useEffect(() => {
    if (lastAttackedCell) {
      const timer = setTimeout(() => {
        setLastAttackedCell(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [lastAttackedCell]);
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
                 hoverCoords.y + 2 <= gridSize;
        } else {
          return y === hoverCoords.y && 
                 x >= hoverCoords.x && 
                 x < hoverCoords.x + 2 && 
                 hoverCoords.x + 2 <= gridSize;
        }
      case 'GODS_HAND': {
        // 4x4 quadrant
        const quadSize = Math.floor(gridSize / 2);
        const quadX = Math.floor(hoverCoords.x / quadSize) * quadSize;
        const quadY = Math.floor(hoverCoords.y / quadSize) * quadSize;
        return x >= quadX && x < quadX + quadSize && y >= quadY && y < quadY + quadSize;
      }
      case 'ANNIHILATE':
        if (annihilateVertical) {
          // Vertical pattern (3 consecutive cells)
          return x === hoverCoords.x && 
                 y >= hoverCoords.y && 
                 y <= hoverCoords.y + 2 &&
                 hoverCoords.y + 2 < gridSize;
        } else {
          // Horizontal pattern (3 consecutive cells)
          return y === hoverCoords.y && 
                 x >= hoverCoords.x - 1 && 
                 x <= hoverCoords.x + 1 && 
                 hoverCoords.x > 0 && 
                 hoverCoords.x < gridSize - 1;
        }
      
      // Attack Abilities      case 'SALVO':
        // 3 cells in a line (horizontal or vertical) 
        if (salvoVertical) {
          return x === hoverCoords.x && y >= hoverCoords.y && y < hoverCoords.y + 3;
        } else {
          return y === hoverCoords.y && x >= hoverCoords.x && x < hoverCoords.x + 3;
        }
      case 'PRECISION_STRIKE':
        // Single cell (initial shot)
        return x === hoverCoords.x && y === hoverCoords.y;      case 'VOLLEY_FIRE':
        // 3 cells in a line (horizontal or vertical)
        if (volleyFireVertical) {
          return x === hoverCoords.x && y >= hoverCoords.y && y < hoverCoords.y + 3;
        } else {
          return y === hoverCoords.y && x >= hoverCoords.x && x < hoverCoords.x + 3;
        }      case 'TORPEDO_RUN':
        // Entire row or column
        if (torpedoVertical) {
          return x === hoverCoords.x; // Entire column
        } else {
          return y === hoverCoords.y; // Entire row
        }
      case 'DECOY_SHOT':
        // Single cell
        return x === hoverCoords.x && y === hoverCoords.y;
      case 'BARRAGE':
        // 5 individual cells (user selects them one by one)
        return x === hoverCoords.x && y === hoverCoords.y;
      case 'DEPTH_CHARGE':
        // Initial cell + plus pattern if it hits
        return (x === hoverCoords.x && y === hoverCoords.y) || 
               (x === hoverCoords.x && Math.abs(y - hoverCoords.y) === 1) ||
               (y === hoverCoords.y && Math.abs(x - hoverCoords.x) === 1);
      case 'EMP_BLAST':
        // 2x2 area
        return x >= hoverCoords.x && x < hoverCoords.x + 2 && 
               y >= hoverCoords.y && y < hoverCoords.y + 2;
      case 'PINPOINT_STRIKE':
        // Single cell
        return x === hoverCoords.x && y === hoverCoords.y;
      case 'CHAIN_REACTION':
        // Single cell (initial shot)
        return x === hoverCoords.x && y === hoverCoords.y;
      
      // Defense Abilities
      case 'REPAIR_CREW':
        // Single cell on player's own grid
        return isPlayerGrid && x === hoverCoords.x && y === hoverCoords.y;
      case 'CLOAK':
        // Ship selection (varies by ship)
        return isPlayerGrid && x === hoverCoords.x && y === hoverCoords.y;
      case 'REINFORCE':
        // Single cell on player's own grid
        return isPlayerGrid && x === hoverCoords.x && y === hoverCoords.y;
      case 'MINEFIELD':
        // 2x2 area on player's own grid
        return isPlayerGrid && x >= hoverCoords.x && x < hoverCoords.x + 2 && 
               y >= hoverCoords.y && y < hoverCoords.y + 2;
      case 'EVASIVE_MANEUVERS':
        // No grid targeting (ship selection)
        return false;
      case 'EMERGENCY_PATCH':
        // Single cell on player's own grid
        return isPlayerGrid && x === hoverCoords.x && y === hoverCoords.y;
      case 'SMOKE_SCREEN':
        // 3x3 area on player's own grid
        return isPlayerGrid && x >= hoverCoords.x && x < hoverCoords.x + 3 && 
               y >= hoverCoords.y && y < hoverCoords.y + 3;
      case 'DEFENSIVE_NET':
        // 1x3 or 3x1 area on player's own grid
        if (hoverCoords.defensiveNetVertical) {
          return isPlayerGrid && x === hoverCoords.x && y >= hoverCoords.y && y < hoverCoords.y + 3;
        } else {
          return isPlayerGrid && y === hoverCoords.y && x >= hoverCoords.x && x < hoverCoords.x + 3;
        }
      case 'SONAR_DECOY':
        // Single cell on player's own grid
        return isPlayerGrid && x === hoverCoords.x && y === hoverCoords.y;
      case 'BRACE_FOR_IMPACT':
        // Ship selection (no grid targeting)
        return false;
      
      // Support Abilities
      case 'SONAR_PULSE':
        // 3x3 area on opponent's grid
        return !isPlayerGrid && x >= hoverCoords.x && x < hoverCoords.x + 3 && 
               y >= hoverCoords.y && y < hoverCoords.y + 3;
      case 'INTEL_LEAK':
        // No grid targeting
        return false;
      case 'SPOTTER_PLANE':
        // Cross pattern around target
        return !isPlayerGrid && ((x === hoverCoords.x && Math.abs(y - hoverCoords.y) <= 2) ||
               (y === hoverCoords.y && Math.abs(x - hoverCoords.x) <= 2));      case 'RECONNAISSANCE_FLYBY':
        // 5x1 or 1x5 line on opponent's grid
        if (reconFlybyVertical) {
          return !isPlayerGrid && x === hoverCoords.x && y >= hoverCoords.y && y < hoverCoords.y + 5;
        } else {
          return !isPlayerGrid && y === hoverCoords.y && x >= hoverCoords.x && x < hoverCoords.x + 5;
        }
      case 'TARGET_ANALYSIS':
        // 3x3 area around target
        return !isPlayerGrid && x >= hoverCoords.x - 1 && x <= hoverCoords.x + 1 && 
               y >= hoverCoords.y - 1 && y <= hoverCoords.y + 1;
      case 'WEATHER_FORECAST':
        // No grid targeting
        return false;
      case 'COMMUNICATIONS_INTERCEPT':
        // No grid targeting
        return false;
      case 'TACTICAL_READOUT':
        // No grid targeting
        return false;
      case 'JAMMING_SIGNAL':
        // No grid targeting
        return false;
      case 'OPPONENTS_PLAYBOOK':
        // No grid targeting
        return false;
      case 'HACKER':
        // No grid targeting (reveals random ship)
        return false;
      case 'COUNTER':
        // No grid targeting (defensive installation)
        return false;
      case 'JAM':
        // No grid targeting (defensive installation)
        return false;
      
      default:
        // Single cell for other abilities
        return x === hoverCoords.x && y === hoverCoords.y;
    }
  };

  const renderCell = (cell = {}, x, y) => {
    let cellContent = null;    let cellClass = "border-2 border-gray-600 rounded flex items-center justify-center transition-all duration-200 ";
      // Add responsive sizing with mobile-first approach
    if (adminView) {
      // Smaller cells for admin view
      if (gridSize <= 8) {
        cellClass += "w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 ";
      } else if (gridSize <= 10) {
        cellClass += "w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 ";
      } else {
        cellClass += "w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ";
      }
    } else {
      // Standard cell sizes for player view
      if (gridSize <= 8) {
        cellClass += "w-7 h-7 sm:w-9 sm:h-9 md:w-11 md:h-11 ";
      } else if (gridSize <= 10) {
        cellClass += "w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 ";
      } else {
        cellClass += "w-5 h-5 sm:w-7 sm:h-7 md:w-9 md:h-9 ";
      }
    }

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
      }    } else if (isPlayerGrid && cell.ship) {
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
        
        // Attack Abilities
        case 'SALVO':
          cellClass += "bg-red-400/60 animate-pulse-danger";
          break;
        case 'PRECISION_STRIKE':
          cellClass += "bg-red-600/70 animate-pulse-danger";
          break;
        case 'VOLLEY_FIRE':
          cellClass += "bg-red-500/60 animate-pulse-danger";
          break;
        case 'TORPEDO_RUN':
          cellClass += "bg-cyan-500/60 animate-pulse-info";
          break;
        case 'DECOY_SHOT':
          cellClass += "bg-pink-500/60 animate-pulse-danger";
          break;
        case 'BARRAGE':
          cellClass += "bg-red-700/70 animate-pulse-danger";
          break;
        case 'DEPTH_CHARGE':
          cellClass += "bg-orange-600/60 animate-pulse-danger";
          break;
        case 'EMP_BLAST':
          cellClass += "bg-purple-600/60 animate-pulse-special";
          break;
        case 'PINPOINT_STRIKE':
          cellClass += "bg-red-800/70 animate-pulse-danger";
          break;
        case 'CHAIN_REACTION':
          cellClass += "bg-yellow-600/60 animate-pulse-danger";
          break;
        
        // Defense Abilities
        case 'REPAIR_CREW':
          cellClass += "bg-green-400/60 animate-pulse-success";
          break;
        case 'CLOAK':
          cellClass += "bg-indigo-500/60 animate-pulse-special";
          break;
        case 'REINFORCE':
          cellClass += "bg-blue-500/60 animate-pulse-success";
          break;
        case 'MINEFIELD':
          cellClass += "bg-orange-700/60 animate-pulse-danger";
          break;
        case 'EMERGENCY_PATCH':
          cellClass += "bg-green-600/60 animate-pulse-success";
          break;
        case 'SMOKE_SCREEN':
          cellClass += "bg-gray-500/60 animate-pulse";
          break;
        case 'DEFENSIVE_NET':
          cellClass += "bg-blue-600/60 animate-pulse-success";
          break;
        case 'SONAR_DECOY':
          cellClass += "bg-teal-500/60 animate-pulse-info";
          break;
        
        // Support Abilities
        case 'SONAR_PULSE':
          cellClass += "bg-cyan-400/60 animate-pulse-info";
          break;
        case 'SPOTTER_PLANE':
          cellClass += "bg-yellow-400/60 animate-pulse-info";
          break;
        case 'RECONNAISSANCE_FLYBY':
          cellClass += "bg-blue-400/60 animate-pulse-info";
          break;
        case 'TARGET_ANALYSIS':
          cellClass += "bg-amber-500/60 animate-pulse-info";
          break;
        case 'HACKER':
          cellClass += "bg-green-500/60 animate-pulse-info";
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
      <div className="bg-gray-800 p-3 sm:p-4 md:p-6 rounded-lg shadow-lg transition-all duration-300 hover:shadow-2xl">        {normalizedGrid.map((row, y) => (
          <div key={`row-${y}`} className="flex">            {/* Row label */}
            <div className={`flex items-center justify-center text-gray-300 font-semibold
              ${adminView 
                ? (gridSize <= 8 ? 'w-4 h-6 sm:w-5 sm:h-7 md:w-6 md:h-8 text-xs' : 
                   gridSize <= 10 ? 'w-3 h-5 sm:w-4 sm:h-6 md:w-5 md:h-7 text-xs' : 
                   'w-2 h-4 sm:w-3 sm:h-5 md:w-4 md:h-6 text-xs')
                : (gridSize <= 8 ? 'w-5 h-7 sm:w-6 sm:h-9 md:w-8 md:h-11 text-xs sm:text-sm' : 
                   gridSize <= 10 ? 'w-4 h-6 sm:w-5 sm:h-8 md:w-6 md:h-10 text-xs' : 
                   'w-3 h-5 sm:w-4 sm:h-7 md:w-5 md:h-9 text-xs')}`}
            >
              {getDisplayLabel(y, false)}
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
          {/* Add column labels (A-H) at the bottom */}
        <div className="flex mt-1">
          {/* Empty corner cell */}
          <div className={`flex items-center justify-center
            ${gridSize <= 8 ? 'w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8' : 
              gridSize <= 10 ? 'w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6' : 
              'w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5'}`}>
          </div>
            {/* Column labels (A-H) - always left to right */}
          {Array.from({ length: gridSize }, (_, i) => (
            <div 
              key={`col-${i}`} 
              className={`flex items-center justify-center text-gray-300 font-semibold
                ${adminView 
                  ? (gridSize <= 8 ? 'w-6 h-4 sm:w-7 sm:h-5 md:w-8 md:h-6 text-xs' : 
                     gridSize <= 10 ? 'w-5 h-3 sm:w-6 sm:h-4 md:w-7 md:h-5 text-xs' : 
                     'w-4 h-2 sm:w-5 sm:h-3 md:w-6 md:h-4 text-xs') 
                  : (gridSize <= 8 ? 'w-7 h-5 sm:w-9 sm:h-6 md:w-11 md:h-8 text-xs sm:text-sm' : 
                     gridSize <= 10 ? 'w-6 h-4 sm:w-8 sm:h-5 md:w-10 md:h-6 text-xs' : 
                     'w-5 h-3 sm:w-7 sm:h-4 md:w-9 md:h-5 text-xs')}`}
            >
              {getDisplayLabel(i, true)}
            </div>
          ))}
        </div>
        
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