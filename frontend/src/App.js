// frontend/src/App.js

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import authService from './services/auth';
import './styles/App.css';

// A simple placeholder for a home/landing page
const Home = () => (
    <div className="home-container">
        <h1>Personal AI Assistant</h1>
        <p>Your intelligent partner for managing tasks and memories.</p>
        <div className="home-links">
            <Link to="/login" className="login-link">
                Get Started
            </Link>
        </div>
    </div>
);

// A wrapper to protect routes that require authentication
const PrivateRoute = ({ children }) => {
    const user = authService.getCurrentUser();
    return user ? children : <Navigate to="/login" />;
};

function App() {
  const [currentUser, setCurrentUser] = useState(undefined);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(undefined);
    // Using window.location.href ensures a full page refresh, clearing all state.
    window.location.href = "/login";
  };

  return (
    <Router>
      <div className="app-container">
        <nav className="navbar">
          <Link to={currentUser ? "/dashboard" : "/"} className="nav-brand">
            Maya
          </Link>
          <div className="nav-links">
            {currentUser ? (
              <button onClick={handleLogout} className="nav-button">
                Logout
              </button>
            ) : (
              <>
                <Link to="/login" className="nav-link">Login</Link>
                <Link to="/register" className="nav-link register-btn">Register</Link>
              </>
            )}
          </div>
        </nav>

        <main className="app-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } 
            />
            {/* Redirect any unknown paths to the home page */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
