

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../style/Home.css";


const SeniorHome = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [employees, setEmployees] = useState([]);
  const [taskDescription, setTaskDescription] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [taskMessage, setTaskMessage] = useState("");
  const [activeSection, setActiveSection] = useState("employees"); // 'employees' or 'tasks'
  const [tasks, setTasks] = useState([]);
  const navigate = useNavigate();
  const dropdownRef = useRef();

  useEffect(() => {
    // Redirect to login if not authenticated
    const userId = localStorage.getItem("userId");
    if (!userId) {
      navigate("/login", { replace: true });
      return;
    }
    const storedEmail = localStorage.getItem("email");
    const storedName = localStorage.getItem("username");
    setUserEmail(storedEmail || "");
    setUserName(storedName || "User");
  }, [navigate]);

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
    // Fetch all employees
    axios.get("http://localhost:5000/api/auth/employees")
      .then(res => setEmployees(res.data.employees))
      .catch(err => console.error("Failed to fetch employees", err));
  }, []);

  // Fetch all tasks
  const fetchTasks = () => {
    axios.get("http://localhost:5000/api/tasks")
      .then(res => setTasks(res.data.tasks))
      .catch(err => console.error("Failed to fetch tasks", err));
  };

  useEffect(() => {
    if (activeSection === "tasks") {
      fetchTasks();
    }
  }, [activeSection]);

  // Get current senior's userId from localStorage (set at login)
  const seniorId = localStorage.getItem("userId");

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    if (!taskDescription || !selectedEmployee) {
      setTaskMessage("Please enter a task and select an employee.");
      return;
    }
    try {
      const res = await axios.post("http://localhost:5000/api/tasks", {
        description: taskDescription,
        assignedBy: seniorId,
        assignedTo: selectedEmployee
      });
      if (res.status === 201) {
        setTaskMessage("Task assigned successfully!");
        setTaskDescription("");
        setSelectedEmployee("");
        fetchTasks();
      } else {
        setTaskMessage("Failed to assign task.");
      }
    } catch (err) {
      setTaskMessage("Server error. Try again later.");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h2>FlexiHours</h2>
        <ul>
          <li
            className={activeSection === "employees" ? "active" : ""}
            style={{ cursor: "pointer" }}
            onClick={() => setActiveSection("employees")}
          >
            All Employees
          </li>
          <li
            className={activeSection === "tasks" ? "active" : ""}
            style={{ cursor: "pointer" }}
            onClick={() => setActiveSection("tasks")}
          >
            Tasks Assigned
          </li>
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
        {activeSection === "employees" && (
          <div className="welcome-card">
            <h1>Welcome Senior!</h1>
            <p>Track your tasks and working hours easily.</p>
            <div className="employees-section mt-4">
              <h2>All Employees</h2>
              <div className="row">
                {employees.length === 0 ? (
                  <p>No employees found.</p>
                ) : (
                  employees.map(emp => (
                    <div className="col-md-4 mb-4" key={emp._id}>
                      <div className="card h-100 shadow-sm">
                        <div className="card-body">
                          <h5 className="card-title">{emp.firstName || ''} {emp.lastName || ''}</h5>
                          <p className="card-text mb-1"><strong>Email:</strong> {emp.email}</p>
                          <p className="card-text"><strong>Role:</strong> {emp.role}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeSection === "tasks" && (
          <div className="task-assigned-section mt-4">
            <h2>Task Assigned</h2>
            <form className="row g-2 align-items-center" onSubmit={handleTaskSubmit}>
              <div className="col-md-6">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter task description"
                  value={taskDescription}
                  onChange={e => setTaskDescription(e.target.value)}
                  required
                />
              </div>
              <div className="col-md-4">
                <select
                  className="form-select"
                  value={selectedEmployee}
                  onChange={e => setSelectedEmployee(e.target.value)}
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option value={emp._id} key={emp._id}>
                      {emp.firstName} {emp.lastName} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <button type="submit" className="btn btn-primary w-100">Assign</button>
              </div>
            </form>
            {taskMessage && <div className="mt-2 text-success">{taskMessage}</div>}

            <div className="assigned-tasks-list mt-4">
              <h3>All Assigned Tasks</h3>
              {tasks.length === 0 ? (
                <p>No tasks assigned yet.</p>
              ) : (
                <div className="list-group">
                  {tasks.map(task => (
                    <div className="list-group-item" key={task._id}>
                      <div><strong>Task:</strong> {task.description}</div>
                      <div><strong>Assigned To:</strong> {task.assignedTo?.firstName} {task.assignedTo?.lastName} ({task.assignedTo?.email})</div>
                      <div><strong>Assigned By:</strong> {task.assignedBy?.firstName} {task.assignedBy?.lastName} ({task.assignedBy?.email})</div>
                      <div><small>{new Date(task.createdAt).toLocaleString()}</small></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        )}
      </div>
    </div>
  );
};

export default SeniorHome;
