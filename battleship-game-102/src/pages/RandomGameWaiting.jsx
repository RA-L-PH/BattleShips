import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { findRandomMatch, leaveRandomGameQueue, checkMatchStatus } from '../services/gameModesService';
import { FaSpinner, FaTimes, FaUsers } from 'react-icons/fa';
import logo from '../assets/logo.png';

const RandomGameWaiting = () => {
  const navigate = useNavigate();
  const [searchTime, setSearchTime] = useState(0);
  const [status, setStatus] = useState('searching'); // 'searching', 'found', 'timeout'
  const [error, setError] = useState(null);
  const playerId = localStorage.getItem('battleshipPlayerId');
  const playerName = localStorage.getItem('battleshipPlayerName');
  const queueId = localStorage.getItem('randomGameQueueId');

  const handleCancel = useCallback(async () => {
    try {
      if (queueId) {
        await leaveRandomGameQueue(queueId);
      }
      localStorage.removeItem('randomGameQueueId');
      navigate('/');
    } catch (_) {
      navigate('/');
    }
  }, [queueId, navigate]);

  useEffect(() => {
    if (!playerId || !playerName || !queueId) {
      navigate('/');
      return;
    }

    const searchTimer = setInterval(() => {
      setSearchTime(prev => prev + 1);
    }, 1000);

    // Timeout after 2 minutes
    const timeoutTimer = setTimeout(() => {
      setStatus('timeout');
      handleCancel();
    }, 120000);    // Try to find a match every 3 seconds, or check if we've been matched
    const matchTimer = setInterval(async () => {
      try {
        // First check if we've been matched by another player
        const matchStatus = await checkMatchStatus(queueId);
        if (matchStatus && matchStatus.status === 'matched') {
          setStatus('found');
          
          // Store room info
          localStorage.setItem('battleshipRoomId', matchStatus.roomId);
          localStorage.removeItem('randomGameQueueId');
          
          // Navigate directly to ship placement (no need to join room, already added)
          navigate(`/place-ships/${matchStatus.roomId}`, { replace: true });
          return;
        }
        
        // If not matched yet, try to find a match ourselves
        const match = await findRandomMatch(queueId, playerId);
        if (match) {
          setStatus('found');
          
          // Store room info
          localStorage.setItem('battleshipRoomId', match.roomId);
          localStorage.removeItem('randomGameQueueId');
          
          // Navigate to ship placement (players already added to room automatically)
          navigate(`/place-ships/${match.roomId}`, { replace: true });
        }      } catch (err) {
        setError(err.message);
      }
    }, 3000);    return () => {
      clearInterval(searchTimer);
      clearTimeout(timeoutTimer);
      clearInterval(matchTimer);
    };
  }, [playerId, playerName, queueId, navigate, handleCancel]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center battleship-bg p-4">
      <div className="bg-gray-800/90 backdrop-blur-sm p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <img src={logo} alt="Battleship Logo" className="h-auto w-auto" />
        </div>

        {error && (
          <div className="bg-red-500 text-white p-3 rounded mb-6">
            {error}
          </div>
        )}

        {status === 'searching' && (
          <>
            <div className="mb-6">
              <FaSpinner className="text-purple-400 text-4xl mx-auto animate-spin mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Searching for Opponents</h2>
              <p className="text-gray-400">
                Finding the perfect opponent for you...
              </p>
            </div>

            <div className="bg-gray-700 p-4 rounded-lg mb-6">
              <div className="flex items-center justify-between text-white mb-2">
                <span>Search Time:</span>
                <span className="font-mono text-purple-400">{formatTime(searchTime)}</span>
              </div>
              <div className="flex items-center justify-between text-white">
                <span>Player:</span>
                <span className="text-green-400">{playerName}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm text-gray-400">
                <p>• Game will start automatically when matched</p>
                <p>• Standard 8x8 grid with abilities enabled</p>
                <p>• Maximum wait time: 2 minutes</p>
              </div>
            </div>
          </>
        )}

        {status === 'found' && (
          <>
            <div className="mb-6">
              <FaUsers className="text-green-400 text-4xl mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Match Found!</h2>
              <p className="text-gray-400">
                Joining game room...
              </p>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full animate-pulse" style={{width: '100%'}}></div>
            </div>
          </>
        )}

        {status === 'timeout' && (
          <>
            <div className="mb-6">
              <FaTimes className="text-red-400 text-4xl mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Search Timeout</h2>
              <p className="text-gray-400">
                No opponents found. Try again later.
              </p>
            </div>
          </>
        )}

        <button
          onClick={handleCancel}
          className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
        >
          <FaTimes />
          {status === 'timeout' ? 'Back to Home' : 'Cancel Search'}
        </button>
      </div>
    </div>
  );
};

export default RandomGameWaiting;
