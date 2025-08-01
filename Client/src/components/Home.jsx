// src/pages/Home.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../style/Home.css";

const Home = () => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const navigate = useNavigate();

  const dropdownRef = useRef();

  useEffect(() => {
    const storedName = localStorage.getItem("username");
    const storedEmail = localStorage.getItem("email");
    setUserName(storedName || "User");
    setUserEmail(storedEmail || "");
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let interval;
    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setTime((prevTime) => prevTime + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isPaused]);

  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleStop = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTime(0);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h2>FlexiHours</h2>
        <ul>
          <li>My Tasks</li>
          <li>Todays Earnings</li>
          <li>Monthly earnings</li>
          <li>About Us</li>
          <li onClick={handleLogout}>Logout</li>
        </ul>
      </div>

      <div className="main-content">
        <nav className="navbar">
          <div className="navbar-left">
            </div>
          <div className="navbar-right">
            <div className="timer-card profile-size">
              <div className="timer-display">{formatTime(time)}</div>
              <div className="button-group">
                <button className="btn start" onClick={handleStart}>Start</button>
                <button className="btn pause" onClick={handlePause}>Pause</button>
                <button className="btn stop" onClick={handleStop}>Stop</button>
              </div>
            </div>

            <div className="profile-wrapper" ref={dropdownRef}>
              <div className="profile-circle" onClick={() => setShowDropdown(!showDropdown)}>
                <img
                  src={`user.png`}
                  alt="Profile"
                />
              </div>
              {showDropdown && (
                <div className="profile-dropdown">
                  <div className="profile-email" style={{ marginBottom: "1rem" }}>Your Email: {userEmail}</div>
                  <button className="btn logout" onClick={handleLogout}>Logout</button>
                </div>
              )}
            </div>
          </div>
        </nav>

        <div className="welcome-card">
          <h1>Welcome back, Employee!</h1>
          <p>Track your tasks and working hours easily.</p>
        </div>
      </div>
    </div>
    
  );
};

export default Home;
