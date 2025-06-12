import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ABILITIES } from '../services/abilityService';
import { 
  FaHome, 
  FaCrosshairs, 
  FaShieldAlt, 
  FaEye, 
  FaGamepad,
  FaUsers,
  FaRandom,
  FaCrown,
  FaArrowLeft,
  FaInfoCircle,
  FaBolt,
  FaFire,
  FaBullseye
} from 'react-icons/fa';

const GameGuide = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');

  // Group abilities by type
  const abilityTypes = {
    attack: [],
    defense: [],
    support: []
  };

  // Filter out GODS_HAND (admin only) and populate ability types
  Object.entries(ABILITIES).forEach(([key, ability]) => {
    if (key !== 'GODS_HAND' && ability.type in abilityTypes) {
      abilityTypes[ability.type].push({
        key,
        ...ability
      });
    }
  });

  const sections = [
    { id: 'overview', title: 'Game Overview', icon: FaGamepad },
    { id: 'modes', title: 'Game Modes', icon: FaUsers },
    { id: 'gameplay', title: 'How to Play', icon: FaInfoCircle },
    { id: 'abilities', title: 'Special Abilities', icon: FaBolt },
    { id: 'admin', title: 'Admin Guide', icon: FaCrown }
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 p-6 rounded-lg border border-blue-500/30">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <FaGamepad className="text-blue-400" />
                Welcome to BattleShips: Assault Protocol
              </h3>
              <p className="text-gray-300 text-lg leading-relaxed">
                Experience the classic naval strategy game with modern enhancements! Battle opponents 
                in real-time with special abilities, multiple game modes, and advanced tactical options.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-600">
                <h4 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <FaBullseye className="text-red-400" />
                  Core Features
                </h4>
                <ul className="space-y-2 text-gray-300">
                  <li>• Real-time multiplayer battles</li>
                  <li>• Multiple grid sizes (6x6 to 12x12)</li>
                  <li>• Special abilities system</li>
                  <li>• Turn-based timer system</li>
                  <li>• Admin oversight capabilities</li>
                  <li>• Comprehensive game analytics</li>
                </ul>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg border border-gray-600">
                <h4 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <FaFire className="text-orange-400" />
                  Game Objective
                </h4>
                <p className="text-gray-300 leading-relaxed">
                  Strategically place your fleet on the grid and take turns attacking your opponent's 
                  positions. Use special abilities to gain tactical advantages. The first player to 
                  sink all enemy ships wins the battle!
                </p>
              </div>
            </div>
          </div>
        );

      case 'modes':
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white mb-6">Game Modes</h3>
            
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-purple-900/30 p-6 rounded-lg border border-purple-500/30">
                <h4 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <FaRandom className="text-purple-400" />
                  Random Matchmaking
                </h4>
                <p className="text-gray-300 mb-3">
                  Get matched with random opponents instantly for quick battles.
                </p>
                <ul className="text-gray-400 text-sm space-y-1">
                  <li>• Automatic opponent matching</li>
                  <li>• Standard 8x8 grid with default ships</li>
                  <li>• Abilities enabled by default</li>
                  <li>• 30-second search timeout</li>
                </ul>
              </div>

              <div className="bg-green-900/30 p-6 rounded-lg border border-green-500/30">
                <h4 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <FaUsers className="text-green-400" />
                  Friendly Games
                </h4>
                <p className="text-gray-300 mb-3">
                  Create private games to play with friends using shareable room codes.
                </p>
                <ul className="text-gray-400 text-sm space-y-1">
                  <li>• Custom grid sizes (6x6, 8x8, 10x10)</li>
                  <li>• Variable ship counts</li>
                  <li>• Configurable turn timers</li>
                  <li>• One-click room code sharing</li>
                </ul>
              </div>

              <div className="bg-blue-900/30 p-6 rounded-lg border border-blue-500/30">
                <h4 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <FaCrown className="text-blue-400" />
                  Admin-Hosted Games
                </h4>
                <p className="text-gray-300 mb-3">
                  Supervised games with admin oversight and special controls.
                </p>
                <ul className="text-gray-400 text-sm space-y-1">
                  <li>• Real-time admin monitoring</li>
                  <li>• Ability to grant special powers</li>
                  <li>• Game state management</li>
                  <li>• Tournament-style play</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'gameplay':
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white mb-6">How to Play</h3>
            
            <div className="space-y-6">
              <div className="bg-gray-800 p-6 rounded-lg">
                <h4 className="text-xl font-bold text-white mb-4">1. Join a Game</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-gray-700 p-4 rounded">
                    <h5 className="font-bold text-purple-400 mb-2">Random Game</h5>
                    <p className="text-gray-300">Click "Find Random Game" for instant matchmaking</p>
                  </div>
                  <div className="bg-gray-700 p-4 rounded">
                    <h5 className="font-bold text-green-400 mb-2">Friendly Game</h5>
                    <p className="text-gray-300">Create or join with a room code</p>
                  </div>
                  <div className="bg-gray-700 p-4 rounded">
                    <h5 className="font-bold text-blue-400 mb-2">Admin Game</h5>
                    <p className="text-gray-300">Join admin-hosted tournaments</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg">
                <h4 className="text-xl font-bold text-white mb-4">2. Ship Placement</h4>
                <div className="text-gray-300 space-y-3">
                  <p>• <strong>Drag and Drop:</strong> Move ships to desired positions</p>
                  <p>• <strong>Rotation:</strong> Click rotate button to change orientation</p>
                  <p>• <strong>Auto-Placement:</strong> Use random placement for quick setup</p>
                  <p>• <strong>Validation:</strong> Ensure all ships are placed before confirming</p>
                </div>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg">
                <h4 className="text-xl font-bold text-white mb-4">3. Battle Phase</h4>
                <div className="text-gray-300 space-y-3">
                  <p>• <strong>Turn-Based Combat:</strong> Take turns attacking opponent positions</p>
                  <p>• <strong>Grid Targeting:</strong> Click on opponent's grid to attack</p>
                  <p>• <strong>Timer System:</strong> Each turn has a time limit</p>
                  <p>• <strong>Special Abilities:</strong> Use tactical abilities strategically</p>
                  <p>• <strong>Victory Condition:</strong> Sink all enemy ships to win</p>
                </div>
              </div>

              <div className="bg-yellow-900/30 p-6 rounded-lg border border-yellow-500/30">
                <h4 className="text-xl font-bold text-yellow-400 mb-4">Pro Tips</h4>
                <div className="text-gray-300 space-y-2">
                  <p>• Spread your ships to avoid cluster damage from abilities</p>
                  <p>• Save defensive abilities for critical moments</p>
                  <p>• Use support abilities early to gather intelligence</p>
                  <p>• Watch the turn timer and plan your moves quickly</p>
                  <p>• Coordinate attacks with special abilities for maximum impact</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'abilities':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 p-6 rounded-lg border border-red-500/30">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <FaBolt className="text-yellow-400" />
                Special Abilities System
              </h3>
              <p className="text-gray-300 mb-4">
                Special abilities add tactical depth to the game. Players can have up to 3 abilities active at once, 
                and each ability can only be used once per game.
              </p>
              <div className="bg-orange-900/30 p-4 rounded border border-orange-500/30">
                <h4 className="font-bold text-orange-400 mb-2">How to Get Abilities</h4>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>• <strong>Random Games:</strong> 2-3 abilities granted automatically at game start</li>
                  <li>• <strong>Admin Games:</strong> Request abilities from admin and answer technical questions</li>
                  <li>• <strong>Friendly Games:</strong> Based on game settings chosen by host</li>
                </ul>
              </div>
            </div>

            {Object.entries(abilityTypes).map(([type, abilities]) => (
              <div key={type} className="bg-gray-800 rounded-lg border border-gray-600">
                <div className={`p-4 rounded-t-lg ${
                  type === 'attack' ? 'bg-red-900/40 border-b border-red-500/30' : 
                  type === 'defense' ? 'bg-blue-900/40 border-b border-blue-500/30' : 
                  'bg-yellow-900/40 border-b border-yellow-500/30'
                }`}>
                  <h4 className={`text-xl font-bold uppercase flex items-center gap-2 ${
                    type === 'attack' ? 'text-red-400' : 
                    type === 'defense' ? 'text-blue-400' : 'text-yellow-400'
                  }`}>
                    {type === 'attack' ? <FaCrosshairs /> : 
                     type === 'defense' ? <FaShieldAlt /> : <FaEye />}
                    {type} Abilities ({abilities.length})
                  </h4>
                </div>
                
                <div className="p-4 space-y-4">
                  {abilities.map(ability => (
                    <div 
                      key={ability.key}
                      className="bg-gray-700 p-4 rounded border border-gray-600 hover:border-gray-500 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="text-lg font-bold text-white">{ability.name}</h5>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          ability.difficulty === 'easy' ? 'bg-green-900 text-green-300' :
                          ability.difficulty === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                          'bg-red-900 text-red-300'
                        }`}>
                          {ability.difficulty.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">{ability.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="bg-purple-900/30 p-6 rounded-lg border border-purple-500/30">
              <h4 className="text-xl font-bold text-purple-400 mb-4">God's Hand (Admin Special)</h4>
              <p className="text-gray-300 mb-3">
                A devastating admin-only ability that can destroy an entire 4x4 quadrant of the opponent's grid.
              </p>
              <div className="text-red-400 text-sm">
                <strong>⚠️ Note:</strong> This ability is only available to admins during supervised games 
                and is used for special events or to resolve game situations.
              </div>
            </div>
          </div>
        );

      case 'admin':
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white mb-6">Admin Guide</h3>
            
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 p-6 rounded-lg border border-blue-500/30">
              <h4 className="text-xl font-bold text-white mb-4">Admin Hierarchy</h4>
              <div className="space-y-4">
                <div className="bg-yellow-900/30 p-4 rounded border border-yellow-500/30">
                  <h5 className="font-bold text-yellow-400 mb-2">SuperAdmin</h5>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Create and manage admin accounts</li>
                    <li>• Set admin permissions</li>
                    <li>• Access all game history and analytics</li>
                    <li>• System-wide oversight</li>
                  </ul>
                </div>
                <div className="bg-blue-900/30 p-4 rounded border border-blue-500/30">
                  <h5 className="font-bold text-blue-400 mb-2">Admin</h5>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Host and manage game rooms</li>
                    <li>• Create custom games with advanced settings</li>
                    <li>• Grant abilities to players during gameplay</li>
                    <li>• Real-time game monitoring and control</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-600">
                <h4 className="text-xl font-bold text-white mb-4">Getting Started as Admin</h4>
                <ol className="text-gray-300 space-y-2 text-sm">
                  <li>1. Login at <code className="bg-gray-700 px-2 py-1 rounded">/admin-login</code></li>
                  <li>2. Access the admin dashboard</li>
                  <li>3. Create game rooms with custom codes</li>
                  <li>4. Configure game settings as needed</li>
                  <li>5. Monitor games in real-time</li>
                </ol>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg border border-gray-600">
                <h4 className="text-xl font-bold text-white mb-4">Admin Permissions</h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-bold text-green-400">hostGames:</span>
                    <span className="text-gray-300 ml-2">Create and host standard game rooms</span>
                  </div>
                  <div>
                    <span className="font-bold text-blue-400">customGames:</span>
                    <span className="text-gray-300 ml-2">Create games with custom settings</span>
                  </div>
                  <div>
                    <span className="font-bold text-purple-400">manageGames:</span>
                    <span className="text-gray-300 ml-2">Control ongoing games and access history</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-600">
              <h4 className="text-xl font-bold text-white mb-4">Admin Game Controls</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-bold text-gray-300 mb-3">During Gameplay:</h5>
                  <ul className="text-gray-400 text-sm space-y-1">
                    <li>• Grant abilities to players</li>
                    <li>• Pause/resume games</li>
                    <li>• Monitor player moves in real-time</li>
                    <li>• Use God's Hand ability for special events</li>
                    <li>• End games if necessary</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-bold text-gray-300 mb-3">Game Settings:</h5>
                  <ul className="text-gray-400 text-sm space-y-1">
                    <li>• Grid sizes: 6x6 to 12x12</li>
                    <li>• Ship counts: Few/Default/Many</li>
                    <li>• Turn time limits: 15-120 seconds</li>
                    <li>• Enable/disable abilities</li>
                    <li>• Custom room codes</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <FaArrowLeft />
                Back to Game
              </button>
              <h1 className="text-2xl font-bold text-white">BattleShips: Game Guide</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-gray-800 rounded-lg border border-gray-600 p-4 sticky top-8">
              <h2 className="text-lg font-bold text-white mb-4">Navigation</h2>
              <nav className="space-y-2">
                {sections.map(section => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded text-left transition-colors ${
                        activeSection === section.id
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      <Icon className="flex-shrink-0" />
                      {section.title}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-gray-800 rounded-lg border border-gray-600 p-6">
              {renderSection()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameGuide;
