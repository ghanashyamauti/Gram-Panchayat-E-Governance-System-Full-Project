import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { path: '/', label: 'Dashboard', icon: '🏠' },
    { path: '/services', label: 'Services', icon: '📋' },
    { path: '/grievances', label: 'Grievances', icon: '📢' },
    { path: '/payments', label: 'Payments', icon: '💳' },
    { path: '/track', label: 'Track', icon: '🔍' },
  ];

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav className="bg-blue-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🏛️</span>
            <div>
              <div className="font-bold text-sm">Gram Panchayat</div>
              <div className="text-xs text-blue-300">e-Governance Portal</div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(l => (
              <Link key={l.path} to={l.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${location.pathname === l.path ? 'bg-blue-700' : 'hover:bg-blue-800'}`}>
                {l.icon} {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:block text-sm text-right">
              <div className="font-medium">{user?.full_name || 'User'}</div>
              <div className="text-blue-300 text-xs">{user?.mobile}</div>
            </div>
            <button onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded text-sm font-medium transition">
              Logout
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2">☰</button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden pb-3">
            {navLinks.map(l => (
              <Link key={l.path} to={l.path} onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm hover:bg-blue-800">
                {l.icon} {l.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
