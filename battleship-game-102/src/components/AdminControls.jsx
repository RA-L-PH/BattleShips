import React from 'react';
import { FaUsers, FaGamepad, FaEye } from 'react-icons/fa';

const AdminControls = ({ rooms, adminId, adminDisplayName, onJoinRoom }) => {
  const adminRooms = rooms.filter(room => room.admin === adminId);
  const otherRooms = rooms.filter(room => room.admin !== adminId);
  
  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
        <FaGamepad />
        Your Games
      </h2>
      
      {adminRooms.length > 0 ? (
        <div className="space-y-4">
          {adminRooms.map((room) => (
            <div 
              key={room.id} 
              className="bg-gray-700 p-4 rounded-lg text-white hover:bg-gray-600 transition-colors"
            >
              <div className="flex justify-between items-center">
                <div className="font-bold text-xl">Room: {room.id}</div>
                <button 
                  onClick={() => onJoinRoom(room.id)}
                  className="px-3 py-2 bg-blue-600 rounded hover:bg-blue-700 flex items-center gap-2"
                >
                  <FaEye />
                  Manage
                </button>
              </div>
              <div className="text-sm mt-2 grid grid-cols-2 gap-2">
                <div>Status: <span className={`font-semibold ${getStatusColor(room.status)}`}>{room.status}</span></div>
                <div>Players: {Object.keys(room.players || {}).length}/2</div>
                <div>
                  Created: {new Date(room.createdAt).toLocaleString()}
                </div>
                <div>
                  Admin: {adminDisplayName}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-400 text-center py-8 border border-dashed border-gray-700 rounded-lg">
          <FaGamepad className="mx-auto text-gray-500 text-4xl mb-2" />
          <p>You haven't created any games yet</p>
          <p className="text-sm mt-1">Use the form above to create your first game</p>
        </div>
      )}
      
      <h2 className="text-2xl font-bold text-white mt-8 mb-4 flex items-center gap-2">
        <FaUsers />
        Other Games
      </h2>
      
      {otherRooms.length > 0 ? (
        <div className="space-y-4">
          {otherRooms.map((room) => (
            <div 
              key={room.id} 
              className="bg-gray-700 p-4 rounded-lg text-white"
            >
              <div className="font-bold text-xl">Room: {room.id}</div>
              <div className="text-sm mt-2 grid grid-cols-2 gap-2">
                <div>Status: <span className={`font-semibold ${getStatusColor(room.status)}`}>{room.status}</span></div>
                <div>Players: {Object.keys(room.players || {}).length}/2</div>
                <div>Created: {new Date(room.createdAt).toLocaleString()}</div>
                <div>Admin: {room.admin}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-400 text-center py-8 border border-dashed border-gray-700 rounded-lg">
          <p>No other games found</p>
        </div>
      )}
    </div>
  );
};

// Helper function to get status color
function getStatusColor(status) {
  switch(status?.toLowerCase()) {
    case 'waiting': return 'text-yellow-400';
    case 'playing': return 'text-green-400';
    case 'completed': return 'text-blue-400';
    default: return 'text-gray-400';
  }
}

export default AdminControls;