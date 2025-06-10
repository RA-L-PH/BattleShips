import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import GameRoom from "./pages/GameRoom";
import ShipPlacement from "./components/ShipPlacement";
import AdminLogin from "./components/AdminLogin";
import AdminPanel from "./pages/AdminPanel";
import AdminRoomView from "./pages/AdminRoomView";
import SuperAdminLogin from "./components/SuperAdminLogin";
import SuperAdminPanel from "./pages/SuperAdminPanel";
import RandomGameWaiting from "./pages/RandomGameWaiting";
import { initService } from "./services/initService";
import { cleanupService } from "./services/cleanupService";

const App = () => {
  // Initialize the app on startup
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize default accounts
        await initService.initializeDefaults();

        // Start cleanup service
        const stopCleanup = cleanupService.startPeriodicCleanup();

        console.log("App initialized successfully");

        // Return cleanup function
        return stopCleanup;
      } catch (error) {
        console.error("Failed to initialize app:", error);
      }
    };

    let cleanupFunction;
    initializeApp().then((cleanup) => {
      cleanupFunction = cleanup;
    });

    // Cleanup on unmount
    return () => {
      if (cleanupFunction) {
        cleanupFunction();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/place-ships/:roomId" element={<ShipPlacement />} />
        <Route path="/room/:roomId" element={<GameRoom />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin/room/:roomId" element={<AdminRoomView />} />
        <Route path="/super-admin-login" element={<SuperAdminLogin />} />
        <Route path="/super-admin" element={<SuperAdminPanel />} />
        <Route path="/random-game-waiting" element={<RandomGameWaiting />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;