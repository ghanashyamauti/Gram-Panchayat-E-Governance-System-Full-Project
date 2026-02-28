import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Services from './pages/Services';
import ServiceRequest from './pages/ServiceRequest';
import Grievances from './pages/Grievances';
import Payments from './pages/Payments';
import TrackRequest from './pages/TrackRequest';
import AdminDashboard from './pages/AdminDashboard';
import Navbar from './components/Navbar';
import Chatbot from './components/Chatbot';

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="text-xl">Loading...</div></div>;
  return isLoggedIn ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { user, isLoggedIn, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="text-xl">Loading...</div></div>;
  const isAdmin = user?.role && ['admin', 'superadmin', 'officer'].includes(user.role);
  return isLoggedIn && isAdmin ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Navbar /><Dashboard /></ProtectedRoute>} />
          <Route path="/services" element={<ProtectedRoute><Navbar /><Services /></ProtectedRoute>} />
          <Route path="/services/apply/:categoryId" element={<ProtectedRoute><Navbar /><ServiceRequest /></ProtectedRoute>} />
          <Route path="/grievances" element={<ProtectedRoute><Navbar /><Grievances /></ProtectedRoute>} />
          <Route path="/payments" element={<ProtectedRoute><Navbar /><Payments /></ProtectedRoute>} />
          <Route path="/track" element={<><Navbar /><TrackRequest /></>} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        </Routes>
        <Chatbot />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
