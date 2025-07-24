import React, { useState, useEffect } from "react";
import "../style/Home.css";

const Home = () => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

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
    setTime(0); // reset timer
    // You can log time, date, user info here
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
          <li>Home</li>
          <li>My Tasks</li>
          <li>Timer</li>
          <li>Reports</li>
          <li>Logout</li>
        </ul>
      </div>

      <div className="main-content">
        <div className="welcome-card">
          <h1>Welcome back, Employee!</h1>
          <p>Track your tasks and working hours easily.</p>
        </div>

        <div className="timer-card">
          <h2>Task Timer</h2>
          <div className="timer-display">{formatTime(time)}</div>
          <div className="button-group">
            <button className="btn start" onClick={handleStart}>
              Start
            </button>
            <button className="btn pause" onClick={handlePause}>
              Pause
            </button>
            <button className="btn stop" onClick={handleStop}>
              Stop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
