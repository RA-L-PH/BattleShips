import React, { useEffect } from 'react';

const Toast = ({ message, type = 'info', onDismiss, duration = 5000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onDismiss) onDismiss();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const bgColor = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
    warning: 'bg-yellow-600',
  }[type] || 'bg-blue-600';

  return (
    <div className={`fixed bottom-10 left-1/2 transform -translate-x-1/2 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-md w-full animate-fade-in flex justify-between items-center`}>
      <p>{message}</p>
      <button onClick={onDismiss} className="ml-4 text-white hover:text-gray-200">
        &times;
      </button>
    </div>
  );
};

export default Toast;