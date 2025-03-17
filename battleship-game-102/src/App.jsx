import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import GameRoom from "./pages/GameRoom";
import ShipPlacement from "./components/ShipPlacement";
import AdminLogin from "./components/AdminLogin";
import AdminPanel from "./pages/AdminPanel";
import AdminRoomView from "./pages/AdminRoomView";

const App = () => {
  return (
    <div className="min-h-screen bg-gray-900">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/place-ships/:roomId" element={<ShipPlacement />} />
        <Route path="/game/:roomId" element={<GameRoom />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin/room/:roomId" element={<AdminRoomView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;