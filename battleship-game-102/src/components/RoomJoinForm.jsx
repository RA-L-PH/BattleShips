import React, { useState } from 'react';

const RoomJoinForm = ({ onCreateRoom, onJoinRoom }) => {
  const [roomCode, setRoomCode] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">Battleship</h1>
        
        <div className="space-y-6">
          <button
            onClick={onCreateRoom}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Create New Game
          </button>
          
          <div className="relative">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="Enter Room Code"
              className="w-full p-3 bg-gray-700 text-white rounded-lg"
            />
            <button
              onClick={() => onJoinRoom(roomCode)}
              className="mt-2 w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Join Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomJoinForm;