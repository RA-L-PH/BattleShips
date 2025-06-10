import React, { useState, useEffect } from 'react';
import { getDatabase, ref, onValue } from 'firebase/database';
import { FaUsers, FaGamepad, FaClock, FaEye } from 'react-icons/fa';

const ActiveRoomsMonitor = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getDatabase();
    const roomsRef = ref(db, 'rooms');

    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const roomsList = Object.values(data)
        .filter(room => !room.gameOver) // Only show active rooms
        .sort((a, b) => b.createdAt - a.createdAt);
      
      setRooms(roomsList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getStatusColor = (room) => {
    if (room.gameStarted) return 'bg-green-500';
    if (room.playerCount === 2) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getStatusText = (room) => {
    if (room.gameStarted) return 'Playing';
    if (room.playerCount === 2) return 'Ready';
    return 'Waiting';
  };

  const formatTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s ago`;
    }
    return `${seconds}s ago`;
  };

  if (loading) {
    return <div className="text-white">Loading active rooms...</div>;
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
        <FaEye />
        Active Rooms Monitor
      </h2>
      
      <div className="space-y-4">
        {rooms.length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            No active rooms found
          </div>
        ) : (
          rooms.map(room => (
            <div key={room.id} className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(room)}`}></div>
                  <div>
                    <h3 className="text-white font-bold">{room.id}</h3>
                    <p className="text-gray-400 text-sm">
                      {room.gameMode} • {getStatusText(room)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 text-gray-400">
                  <div className="flex items-center gap-1">
                    <FaUsers size={14} />
                    <span>{room.playerCount}/2</span>
                  </div>
                  
                  {room.gameStarted && (
                    <div className="flex items-center gap-1">
                      <FaGamepad size={14} />
                      <span>In Game</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <FaClock size={14} />
                    <span>{formatTime(room.createdAt)}</span>
                  </div>
                </div>
              </div>
              
              {room.players && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <div className="flex gap-4 text-sm">
                    {Object.values(room.players).map((player, index) => (
                      <div key={player.id} className="text-gray-300">
                        <span className="font-medium">{player.name}</span>
                        {player.ready && <span className="text-green-400 ml-1">✓</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-600">
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Waiting for players</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Ready to start</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Game in progress</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveRoomsMonitor;
