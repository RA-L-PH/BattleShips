import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, onValue, update } from 'firebase/database';
import { database } from '../services/firebaseConfig';
import GameBoard from '../components/GameBoard';
import AbilityPanel from '../components/AbilityPanel';
import GameStatus from '../components/GameStatus';
import StopWatch from '../components/StopWatch';
import Toast from '../components/Toast';
import TurnTimer from '../components/TurnTimer';
import GameRoom_Mobile from './GameRoom_Mobile';
import GameRoom_Desktop from './GameRoom_Desktop';
import { makeMove, recordTurnTimeout } from '../services/gameService';
import { getGridSize } from '../services/gameService';
import { isMobileDevice } from '../utils/deviceDetect';
import { 
  activateNuke, 
  activateScanner, 
  activateHacker, 
  activateReinforcement, 
  activateAnnihilate,
  installCounter,
  installJam,
  // New Attack abilities
  activateSalvo,
  activatePrecisionStrike,
  activatePrecisionStrikeFollowUp,
  activateVolleyFire,
  activateTorpedoRun,
  activateTorpedoRunShot,
  activateDecoyShot,
  activateDecoyShotSecond,
  activateBarrage,
  activateDepthCharge,
  activateEmpBlast,
  activatePinpointStrike,
  activateChainReaction,
  activateChainReactionShot,  // New Defense abilities
  activateRepairCrew,
  activateReinforce,
  activateMinefield,
  activateEvasiveManeuvers,
  activateEmergencyPatch,
  activateSmokeScreen,
  activateDefensiveNet,
  activateSonarDecoy,
  activateBraceForImpact,
  // New Support abilities
  activateSonarPulse,
  activateIntelLeak,
  activateSpotterPlane,
  activateReconnaissanceFlyby,
  activateTargetAnalysis,
  activateWeatherForecast,
  activateCommunicationsIntercept,
  activateTacticalReadout,
  activateJammingSignal,
  activateOpponentsPlaybook
} from '../services/abilityService';

const GameRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playerId, setPlayerId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [playerAbilities, setPlayerAbilities] = useState({});  const [activeAbility, setActiveAbility] = useState(null);
  const [reinforcementVertical, setReinforcementVertical] = useState(false);
  const [annihilateVertical, setAnnihilateVertical] = useState(false);
  
  // New ability state variables
  const [salvoVertical, setSalvoVertical] = useState(false);
  const [volleyFireVertical, setVolleyFireVertical] = useState(false);
  const [barrageTargets, setBarrageTargets] = useState([]);
  const [barrageStep, setBarrageStep] = useState(0);
  const [awaitingPrecisionFollowUp, setAwaitingPrecisionFollowUp] = useState(false);
  const [awaitingTorpedoShot, setAwaitingTorpedoShot] = useState(false);
  const [awaitingDecoySecond, setAwaitingDecoySecond] = useState(false);
  const [awaitingChainReaction, setAwaitingChainReaction] = useState(false);
  const [reconFlybyVertical, setReconFlybyVertical] = useState(false);const [scanResult, setScanResult] = useState(null);
  const [hackerResult, setHackerResult] = useState(null);
  const [toast, setToast] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [gridSize, setGridSize] = useState(8);
  const [turnTimeLimit, setTurnTimeLimit] = useState(60);

  // Suppress unused variable warning for scanResult (used in ability system)
  const _scanResult = scanResult;

  // Create initial empty grid based on dynamic size
  const createEmptyGrid = useCallback((size = 8) => Array(size).fill().map(() => 
    Array(size).fill().map(() => ({ ship: null, hit: false, miss: false }))
  ), []);

  // Initialize grids with empty state
  const [playerGrid, setPlayerGrid] = useState(() => createEmptyGrid(8));
  const [opponentGrid, setOpponentGrid] = useState(() => createEmptyGrid(8));
  
  // Helper function to convert coordinates to human-readable format
  const getCoordinateLabel = useCallback((col, row) => {
    const colLabels = Array.from({ length: gridSize }, (_, i) => String.fromCharCode(65 + i));
    const rowLabels = Array.from({ length: gridSize }, (_, i) => String(gridSize - i));
    return `${colLabels[col]}${rowLabels[row]}`;
  }, [gridSize]);

  // Function to count remaining ships in a grid
  const countRemainingShips = (grid) => {
    if (!grid) return 0;
    
    // Track all ships and their segments
    const shipSegmentCounts = {};
    const shipHitCounts = {};
      grid.forEach((row) => {
      row.forEach((cell) => {
        if (cell.ship) {
          const shipId = cell.ship;
          // Count total segments per ship
          shipSegmentCounts[shipId] = (shipSegmentCounts[shipId] || 0) + 1;
          
          // Count hit segments per ship
          if (cell.hit) {
            shipHitCounts[shipId] = (shipHitCounts[shipId] || 0) + 1;
          }
        }
      });
    });
    
    // Count ships that are not completely sunk
    let remainingShips = 0;
    Object.keys(shipSegmentCounts).forEach(shipId => {
      // A ship is remaining if not all its segments are hit
      if (!shipHitCounts[shipId] || shipHitCounts[shipId] < shipSegmentCounts[shipId]) {
        remainingShips++;
      }    });
    
    return remainingShips;
  };  // Initialize player ID from localStorage first
  useEffect(() => {
    const storedPlayerId = localStorage.getItem('battleshipPlayerId');
    
    if (storedPlayerId) {
      setPlayerId(storedPlayerId);
    } else {
      navigate('/');
    }
  }, [navigate, roomId]);

  // Subscribe to room updates (only after playerId is set)
  useEffect(() => {
    if (!roomId || !playerId) {
      return; // Don't navigate here, let the first effect handle it
    }
      const roomRef = ref(database, `rooms/${roomId}`);
    let hasReceivedData = false;
    let timeoutId = null;
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
        if (!data) {
        // Only redirect if we've been waiting for more than 5 seconds and never received data
        if (!hasReceivedData && !timeoutId) {
          timeoutId = setTimeout(() => {
            if (!hasReceivedData) {
              navigate('/');
            }
          }, 5000); // Wait 5 seconds before giving up
        }
        return;
      }
      
      // Clear timeout if we received data
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      hasReceivedData = true;
      setLoading(false);
      setGameData(data);
      
      // Update grid size from room settings
      const roomGridSize = getGridSize(data.settings);
      if (roomGridSize !== gridSize) {
        setGridSize(roomGridSize);
        setPlayerGrid(createEmptyGrid(roomGridSize));
        setOpponentGrid(createEmptyGrid(roomGridSize));
      }
      
      // Update turn time limit
      if (data.settings?.turnTimeLimit) {
        setTurnTimeLimit(data.settings.turnTimeLimit);
      }

      // Set turn status
      setIsMyTurn(data.currentTurn === playerId);
      setIsPaused(data.isPaused || false);      // Get player's own grid
      if (data.players && data.players[playerId]?.PlacementData?.grid) {
        setPlayerGrid(JSON.parse(JSON.stringify(data.players[playerId].PlacementData.grid)));
      }      // Get opponent's grid with ships hidden
      const opponentId = Object.keys(data.players || {}).find(id => id !== playerId);
      if (opponentId && data.players[opponentId]?.PlacementData?.grid) {
        const opponentGridData = JSON.parse(JSON.stringify(data.players[opponentId].PlacementData.grid));
        
        // Create a fresh grid to ensure we only copy specific properties
        const processedGrid = createEmptyGrid(roomGridSize);
        
        // Copy only hit/miss data from the original grid
        for (let y = 0; y < roomGridSize; y++) {
          for (let x = 0; x < roomGridSize; x++) {
            if (opponentGridData[y] && opponentGridData[y][x]) {
              const cell = opponentGridData[y][x];
              processedGrid[y][x] = {
                ship: cell.ship, 
                hit: cell.hit === true,
                miss: cell.miss === true,
                fromCounter: cell.fromCounter === true,
                attackLabel: cell.attackLabel || ''
              };
            }
          }
        }
        
        setOpponentGrid(processedGrid);
        setOpponentName(data.players[opponentId]?.name || 'Opponent');
      }
      
      // Get player's abilities
      if (data.players && data.players[playerId]?.abilities) {
        setPlayerAbilities(data.players[playerId].abilities);
      }      // Get scanner results if any
      if (data.players && data.players[playerId]?.scannerResult) {
        const newScanResult = data.players[playerId].scannerResult;
        setScanResult(newScanResult);
        
        // Show toast notification for scanner result
        if (newScanResult && newScanResult.timestamp > Date.now() - 5000) { // Only show if recent (within 5 seconds)
          const colLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
          const rowLabels = ['8', '7', '6', '5', '4', '3', '2', '1'];
          const coordinate = `${colLabels[newScanResult.col]}${rowLabels[newScanResult.row]}`;
          setToast({ 
            type: 'info', 
            message: `SCANNER: Found ${newScanResult.shipCount} ship parts in 2x2 area starting at ${coordinate}` 
          });
          
          // Clear the scanner result to prevent repeated notifications
          setTimeout(() => {
            update(ref(database, `rooms/${roomId}/players/${playerId}/scannerResult`), null);
          }, 1000);
        }
      }
      
      // Get hacker results if any
      if (data.players && data.players[playerId]?.hackerReveal) {
        setHackerResult(data.players[playerId].hackerReveal);
      }
      
      // Check for counter-attack feedback
      if (data.players && data.players[playerId]?.counterHitResult) {
        const counterResult = data.players[playerId].counterHitResult;
        if (counterResult && counterResult.timestamp > Date.now() - 5000) { // Only show if recent
          setToast({ 
            type: 'success', 
            message: `COUNTER activated! Hit ${counterResult.hitCount} enemy ship parts` 
          });
          
          // Clear the counter result to prevent repeated notifications
          setTimeout(() => {
            update(ref(database, `rooms/${roomId}/players/${playerId}/counterHitResult`), null);
          }, 1000);
        }
      }
      
      // Check if you were hit by a counter-attack
      if (data.players && data.players[playerId]?.counterHitByOpponent) {
        const counterHit = data.players[playerId].counterHitByOpponent;
        if (counterHit && counterHit.timestamp > Date.now() - 5000) { // Only show if recent
          setToast({ 
            type: 'warning', 
            message: `Enemy COUNTER hit ${counterHit.hitCount} of your ship parts!` 
          });
          
          // Clear the counter hit notification to prevent repeated notifications
          setTimeout(() => {
            update(ref(database, `rooms/${roomId}/players/${playerId}/counterHitByOpponent`), null);
          }, 1000);
        }
      }// Check for game over
      if (data.gameOver) {
        const winner = data.winner;
        const message = winner === playerId ? "🎉 You Won!" : "💀 You Lost!";
        setToast({ type: winner === playerId ? 'success' : 'error', message });
          // Don't auto-navigate anymore - let players see the results
        // They can manually navigate back to home when ready
      }

      // Get player name from local storage
      setPlayerName(localStorage.getItem('battleshipPlayerName') || 'Player');
    });

    return () => unsubscribe();
  }, [roomId, playerId, navigate, gridSize, createEmptyGrid]);  const handleAbilityActivation = async (x, y, ability) => {
    try {
      let result;
      switch (ability) {
        case 'NUKE':
          result = await activateNuke(roomId, playerId, y, x);
          break;
        case 'SCANNER':
          result = await activateScanner(roomId, playerId, y, x);
          if (result && result.shipCount !== undefined) {
            const colLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
            const rowLabels = ['8', '7', '6', '5', '4', '3', '2', '1'];
            const coordinate = `${colLabels[x]}${rowLabels[y]}`;
            setToast({ 
              type: 'info', 
              message: `SCANNER: Found ${result.shipCount} ship parts in 2x2 area at ${coordinate}` 
            });
            return; // Don't show generic success message
          }
          break;
        case 'HACKER':
          await activateHacker(roomId, playerId);
          break;
        case 'REINFORCEMENT':
          await activateReinforcement(roomId, playerId, y, x, reinforcementVertical);
          break;
        case 'ANNIHILATE':
          await activateAnnihilate(roomId, playerId, y, x, annihilateVertical);
          break;
        case 'COUNTER': {
          await installCounter(roomId, playerId);
          setToast({ type: 'success', message: 'COUNTER defense installed! Will activate when you take damage.' });
          return; // Don't show generic success message
        }
        case 'JAM': {
          await installJam(roomId, playerId);
          setToast({ type: 'success', message: 'JAM defense installed! Will block the next enemy attack.' });
          return; // Don't show generic success message
        }
          // New Attack Abilities
        case 'SALVO':
          result = await activateSalvo(roomId, playerId, y, x, salvoVertical);
          break;
        case 'PRECISION_STRIKE':
          result = await activatePrecisionStrike(roomId, playerId, y, x);
          if (result && result.awaitingFollowUp) {
            setAwaitingPrecisionFollowUp(true);
            setToast({ type: 'info', message: 'Precision Strike hit! Select an adjacent square for follow-up shot.' });
            return;
          }
          break;
        case 'VOLLEY_FIRE':
          result = await activateVolleyFire(roomId, playerId, y, x, volleyFireVertical);
          break;
        case 'TORPEDO_RUN':
          result = await activateTorpedoRun(roomId, playerId, reconFlybyVertical, reconFlybyVertical ? y : x);
          if (result && result.awaitingFreeShot) {
            setAwaitingTorpedoShot(true);
            setToast({ 
              type: 'info', 
              message: `Torpedo Run scan: ${result.hasShip ? 'Ships detected!' : 'No ships found'} Select target for free shot.` 
            });
            return;
          }
          break;
        case 'DECOY_SHOT':
          result = await activateDecoyShot(roomId, playerId, y, x);
          if (result && result.awaitingSecondShot) {
            setAwaitingDecoySecond(true);
            setToast({ type: 'info', message: 'Decoy Shot missed! Select target for second shot.' });
            return;
          }
          break;
        case 'BARRAGE':
          if (barrageStep < 5) {
            const newTargets = [...barrageTargets, { row: y, col: x }];
            setBarrageTargets(newTargets);
            setBarrageStep(barrageStep + 1);
            if (newTargets.length === 5) {
              result = await activateBarrage(roomId, playerId, newTargets);
              setBarrageTargets([]);
              setBarrageStep(0);
            } else {
              setToast({ type: 'info', message: `Barrage target ${newTargets.length}/5 selected. Select ${5 - newTargets.length} more targets.` });
              return;
            }
          }
          break;
        case 'DEPTH_CHARGE':
          result = await activateDepthCharge(roomId, playerId, y, x);
          break;
        case 'EMP_BLAST':
          result = await activateEmpBlast(roomId, playerId, y, x);
          if (result && result.hasShipInArea) {
            setToast({ type: 'success', message: 'EMP Blast hit ships! Enemy Support abilities disrupted next turn.' });
            return;
          }
          break;
        case 'PINPOINT_STRIKE':
          result = await activatePinpointStrike(roomId, playerId, y, x);
          if (result && result.damageDealt > 1) {
            setToast({ type: 'success', message: `Pinpoint Strike hit for ${result.damageDealt} damage!` });
            return;
          }
          break;        case 'CHAIN_REACTION':
          result = await activateChainReaction(roomId, playerId, y, x);
          if (result && result.awaitingFreeShot) {
            setAwaitingChainReaction(true);
            setToast({ type: 'success', message: 'Chain Reaction destroyed a segment! Select target for free shot.' });
            return;
          }
          break;
          
        // New Defense Abilities  
        case 'REPAIR_CREW':
          result = await activateRepairCrew(roomId, playerId, y, x);
          setToast({ type: 'success', message: 'Ship square repaired successfully!' });
          return;
        case 'CLOAK':
          // CLOAK needs special handling for ship selection
          setToast({ type: 'info', message: 'Select a ship to cloak from enemy abilities.' });
          return;
        case 'REINFORCE':
          result = await activateReinforce(roomId, playerId, y, x);
          setToast({ type: 'success', message: 'Square reinforced! Protected for next turn.' });
          return;
        case 'MINEFIELD':
          result = await activateMinefield(roomId, playerId, y, x);
          setToast({ type: 'success', message: 'Minefield deployed! 2x2 area will deal +1 damage.' });
          return;
          
        // New Support Abilities
        case 'SONAR_PULSE':
          result = await activateSonarPulse(roomId, playerId, y, x);
          if (result) {
            setToast({ 
              type: 'info', 
              message: `Sonar Pulse: ${result.hasShip ? 'Ships detected' : 'No ships found'} in 3x3 area` 
            });
            return;
          }
          break;
        case 'INTEL_LEAK':
          result = await activateIntelLeak(roomId, playerId);
          if (result) {
            setToast({ 
              type: 'info', 
              message: `Intel Leak: Enemy ${result.shipName} is oriented ${result.orientation}` 
            });
            return;
          }
          break;
        case 'SPOTTER_PLANE':
          result = await activateSpotterPlane(roomId, playerId, y, x);
          if (result) {
            setToast({ 
              type: 'info', 
              message: `Spotter Plane: ${result.hasAdjacentShip ? 'Ship detected' : 'No ships'} adjacent to target` 
            });
            return;
          }
          break;        case 'RECONNAISSANCE_FLYBY':
          result = await activateReconnaissanceFlyby(roomId, playerId, y, x, reconFlybyVertical);
          if (result) {
            setToast({ 
              type: 'info', 
              message: `Reconnaissance: ${result.uniqueShipCount} unique ships found in line` 
            });
            return;
          }
          break;
        case 'TARGET_ANALYSIS':
          result = await activateTargetAnalysis(roomId, playerId, y, x);
          if (result) {
            setToast({ 
              type: 'info', 
              message: `Target Analysis: Ship has ${result.currentHealth}/${result.totalHealth} health remaining` 
            });
            return;
          }
          break;
        case 'WEATHER_FORECAST':
          result = await activateWeatherForecast(roomId, playerId, y, x);
          if (result) {
            setToast({ 
              type: 'info', 
              message: `Weather Forecast: Next shot will ${result.willHit ? 'HIT' : 'MISS'}` 
            });
            return;
          }
          break;
        case 'COMMUNICATIONS_INTERCEPT':
          result = await activateCommunicationsIntercept(roomId, playerId);
          if (result) {
            setToast({ 
              type: 'info', 
              message: `Communications Intercept: ${result.infoResult}` 
            });
            return;
          }          break;
          
        // Additional Defense Abilities
        case 'EVASIVE_MANEUVERS':
          result = await activateEvasiveManeuvers(roomId, playerId);
          if (result) {
            setToast({ 
              type: 'success', 
              message: 'Evasive Maneuvers activated! Next incoming attack has reduced accuracy.' 
            });
            return;
          }
          break;
        case 'EMERGENCY_PATCH':
          result = await activateEmergencyPatch(roomId, playerId, y, x);
          if (result) {
            setToast({ 
              type: 'success', 
              message: `Emergency Patch: Ship segment health increased by ${result.healthGained}!` 
            });
            return;
          }
          break;
        case 'SMOKE_SCREEN':
          result = await activateSmokeScreen(roomId, playerId, y, x);
          if (result) {
            setToast({ 
              type: 'success', 
              message: 'Smoke Screen deployed! 3x3 area obscured from enemy detection.' 
            });
            return;
          }
          break;
        case 'DEFENSIVE_NET':
          result = await activateDefensiveNet(roomId, playerId, y, x);
          if (result) {
            setToast({ 
              type: 'success', 
              message: 'Defensive Net deployed! Ships in area gain damage resistance.' 
            });
            return;
          }
          break;
        case 'SONAR_DECOY':
          result = await activateSonarDecoy(roomId, playerId, y, x);
          if (result) {
            setToast({ 
              type: 'success', 
              message: 'Sonar Decoy placed! Will confuse enemy detection abilities.' 
            });
            return;
          }
          break;
        case 'BRACE_FOR_IMPACT':
          result = await activateBraceForImpact(roomId, playerId);
          if (result) {
            setToast({ 
              type: 'success', 
              message: 'Brace for Impact! All ships gain temporary damage reduction.' 
            });
            return;
          }
          break;
          
        // Intelligence Gathering Abilities
        case 'TACTICAL_READOUT':
          result = await activateTacticalReadout(roomId, playerId);
          if (result) {
            setToast({ 
              type: 'info', 
              message: `Tactical Readout: Enemy's last ability was ${result.lastAbilityType || 'unknown'} type` 
            });
            return;
          }
          break;
        case 'JAMMING_SIGNAL':
          result = await activateJammingSignal(roomId, playerId);
          if (result) {
            setToast({ 
              type: 'success', 
              message: 'Jamming Signal active! Enemy Scanner/Hacker abilities disabled next turn.' 
            });
            return;
          }
          break;
        case 'OPPONENTS_PLAYBOOK':
          result = await activateOpponentsPlaybook(roomId, playerId);
          if (result) {
            setToast({ 
              type: 'info', 
              message: `Opponent's Playbook: Last offensive ability was ${result.lastOffensiveAbility || 'unknown'}` 
            });
            return;
          }
          break;
          
        default:
          throw new Error('Invalid ability');
      }
      
      setToast({ type: 'success', message: `Ability ${ability} activated!` });
    } catch (error) {
      setToast({ type: 'error', message: error.message });
    } finally {
      setActiveAbility(null);
    }
  };
  const handleAttack = async (x, y) => {
    if (!isMyTurn || isPaused) return;
    
    try {
      // Handle follow-up shots for multi-step abilities
      if (awaitingPrecisionFollowUp) {
        await activatePrecisionStrikeFollowUp(roomId, playerId, y, x);
        setAwaitingPrecisionFollowUp(false);
        setToast({ type: 'success', message: 'Precision Strike follow-up completed!' });
        return;
      }
      
      if (awaitingTorpedoShot) {
        await activateTorpedoRunShot(roomId, playerId, y, x);
        setAwaitingTorpedoShot(false);
        setToast({ type: 'success', message: 'Torpedo Run free shot completed!' });
        return;
      }
      
      if (awaitingDecoySecond) {
        await activateDecoyShotSecond(roomId, playerId, y, x);
        setAwaitingDecoySecond(false);
        setToast({ type: 'success', message: 'Decoy Shot second shot completed!' });
        return;
      }
      
      if (awaitingChainReaction) {
        await activateChainReactionShot(roomId, playerId, y, x);
        setAwaitingChainReaction(false);
        setToast({ type: 'success', message: 'Chain Reaction free shot completed!' });
        return;
      }
      
      // Handle Barrage multi-target selection
      if (activeAbility === 'BARRAGE' && barrageStep < 5) {
        const newTargets = [...barrageTargets, { row: y, col: x }];
        setBarrageTargets(newTargets);
        setBarrageStep(barrageStep + 1);
        
        if (newTargets.length === 5) {
          await activateBarrage(roomId, playerId, newTargets);
          setBarrageTargets([]);
          setBarrageStep(0);
          setActiveAbility(null);
          setToast({ type: 'success', message: 'Barrage attack completed!' });
        } else {
          setToast({ type: 'info', message: `Barrage target ${newTargets.length}/5 selected. Select ${5 - newTargets.length} more targets.` });
        }
        return;
      }
      
      // Normal ability or attack handling
      if (activeAbility) {
        await handleAbilityActivation(x, y, activeAbility);
      } else {
        await makeMove(roomId, playerId, y, x);
        setToast({ type: 'info', message: `Attacked ${getCoordinateLabel(x, y)}` });
      }
    } catch (error) {
      setToast({ type: 'error', message: error.message });
    }
  };

  // Clear toast message after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!gameData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    );
  }

  if (loading || !gameData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading game room...</div>
      </div>
    );
  }

  if (!gameData.gameStarted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Waiting for game to start...</div>
      </div>
    );
  }  // Shared handlers for both mobile and desktop
  
  // Count remaining ships for game status
  const playerShipsRemaining = countRemainingShips(playerGrid);
  const opponentShipsRemaining = countRemainingShips(opponentGrid);

  // Calculate ships hit and successful hits statistics
  const calculateGameStats = () => {
    // Count player's ships that have been hit (damaged ships)
    const playerShipsHit = playerGrid ? playerGrid.flat().filter(cell => cell.ship && cell.hit).length : 0;
    
    // Count opponent's ships that have been hit (successful hits by player)
    const opponentShipsHit = opponentGrid ? opponentGrid.flat().filter(cell => cell.ship && cell.hit).length : 0;
    
    // Count all successful hits made by player (hits on opponent grid)
    const playerSuccessfulHits = opponentGrid ? opponentGrid.flat().filter(cell => cell.hit).length : 0;
    
    // Count all successful hits made by opponent (hits on player grid)
    const opponentSuccessfulHits = playerGrid ? playerGrid.flat().filter(cell => cell.hit).length : 0;
    
    return {
      playerShipsHit,
      opponentShipsHit,
      playerSuccessfulHits,
      opponentSuccessfulHits
    };
  };

  const { playerShipsHit, opponentShipsHit, playerSuccessfulHits, opponentSuccessfulHits } = calculateGameStats();

  // Shared handlers for both mobile and desktop
  const handleNavigateHome = () => navigate('/');
  
  const handleShareCode = () => {
    navigator.clipboard.writeText(roomId);
    setToast({ type: 'success', message: 'Room code copied!' });
  };

  // Handle turn timeout - switch turns instead of ending the game
  const handleTimeUp = async () => {
    if (!roomId || gameData?.gameOver || !playerId) return;
    
    try {
      // Switch turns instead of ending the game
      await recordTurnTimeout(roomId, playerId);
      setToast({ type: 'warning', message: 'Turn time expired! Turn switched to opponent.' });
    } catch (error) {
      console.error('Error handling turn timeout:', error);
      setToast({ type: 'error', message: 'Failed to handle turn timeout.' });
    }
  };

  // Common props for both components
  const commonProps = {
    gameData,
    roomId,
    playerId,
    playerName,
    opponentName,
    isMyTurn,
    abilities: playerAbilities, // Fix prop name for GameRoom_Desktop
    playerAbilities, // Keep this for GameRoom_Mobile compatibility
    activeAbility,
    reinforcementVertical,
    annihilateVertical,
    // New ability orientation states
    salvoVertical,
    volleyFireVertical,
    reconFlybyVertical,
    // Multi-step ability states
    barrageTargets,
    barrageStep,
    awaitingPrecisionFollowUp,
    awaitingTorpedoShot,
    awaitingDecoySecond,
    awaitingChainReaction,
    hackerResult,
    isPaused,
    gridSize,
    turnTimeLimit,
    gameStartTime: gameData?.gameStartTime || gameData?.createdAt,
    playerGrid,
    opponentGrid,
    playerShipsRemaining,
    opponentShipsRemaining,
    playerShipsHit,
    opponentShipsHit,
    playerSuccessfulHits,
    opponentSuccessfulHits,
    handleAttack,
    onUseAbility: setActiveAbility, // Add missing ability handler
    setActiveAbility,
    setReinforcementVertical,
    setAnnihilateVertical,
    // New ability orientation setters
    setSalvoVertical,
    setVolleyFireVertical,
    setReconFlybyVertical,
    // Multi-step ability setters
    setBarrageTargets,
    setBarrageStep,
    setAwaitingPrecisionFollowUp,
    setAwaitingTorpedoShot,
    setAwaitingDecoySecond,
    setAwaitingChainReaction,    // Navigation and sharing handlers
    handleNavigateHome,
    handleShareCode,
    onNavigateHome: handleNavigateHome, // For GameRoom_Mobile compatibility
    onShareCode: handleShareCode, // For GameRoom_Mobile compatibility
    // Turn timeout handler (different prop names for mobile vs desktop)
    handleTimeUp,
    onTimeUp: handleTimeUp, // For GameRoom_Mobile compatibility
    onTurnTimeout: handleTimeUp, // For GameRoom_Desktop compatibility
  };

  return (
    <>
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
      
      {isMobileDevice() ? (
        <GameRoom_Mobile {...commonProps} />
      ) : (
        <GameRoom_Desktop {...commonProps} />
      )}
    </>
  );
};

export default GameRoom;