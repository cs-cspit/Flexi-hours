
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../style/Home.css";


const SeniorHome = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();
  const dropdownRef = useRef();

  useEffect(() => {
    const storedEmail = localStorage.getItem("email");
    const storedName = localStorage.getItem("username");
    setUserEmail(storedEmail || "");
    setUserName(storedName || "User");
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

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h2>FlexiHours</h2>
        <ul>
          <li>Tasks Assigned</li>
          <li>All Employees</li>
          <li>Salary</li>
          <li onClick={handleLogout}>Logout</li>
        </ul>
      </div>
      <div className="main-content">
        <nav className="navbar">
          <div className="navbar-left"></div>
          <div className="navbar-right">
            <div className="profile-wrapper" ref={dropdownRef}>
              <div className="profile-circle" onClick={() => setShowDropdown(!showDropdown)}>
                <img src={`user.png`} alt="Profile" />
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
          <h1>Welcome Senior!</h1>
          <p>Track your tasks and working hours easily.</p>
        </div>
      </div>
    </div>
  );
};

export default SeniorHome;
