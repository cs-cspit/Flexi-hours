import React from "react";
import "../style/Home.css";

const SeniorHome = () => {
  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h2>FlexiHours</h2>
        <ul>
          <li>Tasks Assigned</li>
          <li>All Employees</li>
          <li>Salary</li>
          <li>Logout</li>
        </ul>
      </div>
      <div className="main-content">
        <div className="welcome-card">
          <h1>Welcome Senior!</h1>
          <p>Track your tasks and working hours easily.</p>
        </div>
      </div>
    </div>
  );
};

export default SeniorHome;
