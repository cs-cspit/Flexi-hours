import React, { useState, useEffect, useRef } from "react";
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title
} from 'chart.js';
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../style/Home.css";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title);

// Date formatting helper (dd/mm/yyyy)
const formatDisplayDate = (input) => {
  if (!input) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) return input; // already formatted
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) { const [y,m,d] = input.split('-'); return `${d}/${m}/${y}`; }
  const dt = new Date(input);
  if (isNaN(dt)) return input;
  const d = String(dt.getDate()).padStart(2,'0');
  const m = String(dt.getMonth()+1).padStart(2,'0');
  const y = dt.getFullYear();
  return `${d}/${m}/${y}`;
};

// Build bar chart data for role distribution
const getRoleDistData = (employees) => {
  const counts = employees.reduce((acc, e) => {
    const r = e.role || 'employee';
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {});
  const labels = Object.keys(counts).length ? Object.keys(counts) : ['employee'];
  const data = labels.map(l => counts[l] || 0);
  return {
    labels,
    datasets: [
      {
        label: 'Employees',
        data,
        backgroundColor: '#3498db',
        borderRadius: 6,
      },
    ],
  };
};

// Build doughnut chart data for salary distribution
const getSalaryDoughnutData = (employees) => {
  const top = employees.slice(0, 5);
  const labels = top.map(e => (e.firstName || '') + ' ' + (e.lastName || '')); 
  const data = top.map(e => Number(e.salary || 0));
  const colors = ['#1abc9c','#3498db','#9b59b6','#f1c40f','#e67e22'];
  return {
    labels: labels.length ? labels : ['No Data'],
    datasets: [
      {
        data: data.length ? data : [1],
        backgroundColor: colors.slice(0, data.length || 1),
      },
    ],
  };
};

// Salary summary metrics
const getSalarySummary = (employees) => {
  const salaries = employees.map(e => Number(e.salary || 0)).filter(n => Number.isFinite(n));
  const totalEmployees = employees.length;
  const totalPayroll = salaries.reduce((a, b) => a + b, 0);
  const avg = totalEmployees ? Math.round(totalPayroll / totalEmployees) : 0;
  const min = salaries.length ? Math.min(...salaries) : 0;
  const max = salaries.length ? Math.max(...salaries) : 0;
  return { totalEmployees, totalPayroll, avg, min, max };
};

const getTopEarners = (employees, n = 5) => {
  return [...employees]
    .sort((a, b) => Number(b.salary || 0) - Number(a.salary || 0))
    .slice(0, n);
};

const SeniorHome = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [employees, setEmployees] = useState([]);
  const [taskDescription, setTaskDescription] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [taskMessage, setTaskMessage] = useState("");
  const [activeSection, setActiveSection] = useState("employees"); // 'employees' | 'tasks' | 'salary' | 'insights'
  const [tasks, setTasks] = useState([]);
  const [worklogs, setWorklogs] = useState([]);
  const [worklogFilter, setWorklogFilter] = useState('all'); // 'all' or specific employee id
  
  // Idle analytics state
  const [idleScope, setIdleScope] = useState('today'); // 'today' | 'week' | 'month'  
  const [idleAnalytics, setIdleAnalytics] = useState([]);
  
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

  const fetchWorklogs = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/worklogs");
      setWorklogs(response.data.logs || []);
    } catch (err) {
      console.error("Failed to fetch worklogs:", err);
      setWorklogs([]);
    }
  };

  useEffect(() => {
    if (activeSection === "tasks") {
      fetchTasks();
    } else if (activeSection === "worklogs" || activeSection === "employees") {
      fetchWorklogs(); // Fetch worklogs for both sections
    }
  }, [activeSection]);

  // Calculate idle analytics when scope changes or when on employees section
  useEffect(() => {
    if (activeSection === "employees" && worklogs.length > 0 && employees.length > 0) {
      calculateIdleAnalytics();
    }
  }, [idleScope, worklogs, employees, activeSection]);

  const calculateIdleAnalytics = () => {
    console.log('=== IDLE ANALYTICS CALCULATION START ===');
    console.log('Current state:', {
      activeSection,
      idleScope,
      worklogsCount: worklogs.length,
      employeesCount: employees.length
    });
    
    // Get date range based on scope
    const now = new Date();
    let startDate;
    
    switch (idleScope) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setDate(1); // First day of current month
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
    }

    console.log('Date filtering debug:', {
      timestamp: new Date().toISOString(),
      scope: idleScope,
      startDate: startDate.toISOString(),
      now: now.toISOString(),
      totalWorklogs: worklogs.length
    });

    // Filter worklogs by date range using startTime
    const filteredLogs = worklogs.filter(log => {
      if (!log.startTime) return false;
      
      const logDate = new Date(log.startTime);
      logDate.setHours(0, 0, 0, 0); // Normalize to start of day
      
      const startDateStart = new Date(startDate);
      startDateStart.setHours(0, 0, 0, 0);
      
      const nowEndOfDay = new Date(now);
      nowEndOfDay.setHours(23, 59, 59, 999);
      
      const isInRange = logDate >= startDateStart && logDate <= nowEndOfDay;
      
      console.log('Log filter debug:', {
        timestamp: new Date().toISOString(),
        email: log.email,
        startTime: log.startTime,
        parsedLogDate: logDate.toISOString(),
        startDateStart: startDateStart.toISOString(),
        nowEndOfDay: nowEndOfDay.toISOString(),
        isInRange,
        idleTime: log.totalIdleTime || 0,
        hasIdleSegments: !!(log.idleSegments && log.idleSegments.length > 0)
      });
      
      return isInRange;
    });

    // Group by employee
    const employeeAnalytics = {};
    
    filteredLogs.forEach(log => {
      const employee = employees.find(emp => emp._id === log.userId);
      if (!employee) return;
      
      const employeeKey = employee._id;
      const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.email;
      
      if (!employeeAnalytics[employeeKey]) {
        employeeAnalytics[employeeKey] = {
          employeeName,
          totalWorkTime: 0,
          totalIdleTime: 0,
          effectiveTime: 0,
          sessionCount: 0
        };
      }
      
      employeeAnalytics[employeeKey].totalWorkTime += log.duration || 0;
      employeeAnalytics[employeeKey].totalIdleTime += log.totalIdleTime || 0;
      employeeAnalytics[employeeKey].effectiveTime += log.effectiveDuration || log.duration || 0;
      employeeAnalytics[employeeKey].sessionCount += 1;
    });

    // Convert to array and calculate percentages
    const analyticsArray = Object.values(employeeAnalytics).map(analytics => ({
      ...analytics,
      idlePercentage: analytics.totalWorkTime > 0 
        ? (analytics.totalIdleTime / analytics.totalWorkTime) * 100 
        : 0
    }));

    // Sort by idle percentage (highest first)
    analyticsArray.sort((a, b) => b.idlePercentage - a.idlePercentage);
    
    console.log('Final idle analytics result:', {
      filteredLogsCount: filteredLogs.length,
      analyticsArrayCount: analyticsArray.length,
      analyticsArray
    });
    console.log('=== IDLE ANALYTICS CALCULATION END ===');
    
    setIdleAnalytics(analyticsArray);
  };

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

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const downloadWorklogsPDF = () => {
    // Create new PDF document
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Employee Worklogs Report', 14, 20);
    
    // Add date and filter info
    doc.setFontSize(11);
  doc.text(`Generated on: ${formatDisplayDate(new Date().toISOString().slice(0,10))}`, 14, 30);
    const filterText = worklogFilter === 'all' 
      ? 'All Employees' 
      : `Employee: ${employees.find(e => e._id === worklogFilter)?.firstName || ''} ${employees.find(e => e._id === worklogFilter)?.lastName || ''}`;
    doc.text(`Filter: ${filterText}`, 14, 37);

    // Prepare table data
    const filteredLogs = worklogs
      .filter(log => worklogFilter === 'all' || log.userId === worklogFilter)
      .map(log => {
        const employee = employees.find(emp => emp._id === log.userId);
        const dailyRate = (employee?.salary || 0) / 30;
        const minutesWorked = Math.ceil((log.duration / 60) / 5) * 5;
        const earnings = Math.min(dailyRate, (dailyRate / (8 * 60)) * minutesWorked);
        
        return [
          employee ? `${employee.firstName} ${employee.lastName}` : log.email,
          formatDisplayDate(log.date),
          new Date(log.startTime).toLocaleTimeString(),
          new Date(log.endTime).toLocaleTimeString(),
          formatTime(log.duration),
          `₹${Math.round(earnings)}`
        ];
      });

    if (!filteredLogs.length) {
      window.alert('No worklogs found for the selected filter');
      return;
    }

    // Add table
    autoTable(doc, {
      startY: 45,
      head: [['Employee', 'Date', 'Start Time', 'End Time', 'Duration', 'Earnings']],
      body: filteredLogs,
      theme: 'striped',
      headStyles: { 
        fillColor: [52, 152, 219],
        textColor: 255,
        fontSize: 10,
        halign: 'left'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 25 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { cellWidth: 30 },
        5: { cellWidth: 25 },
      }
    });

    // Add summary section
    const totalDuration = filteredLogs.reduce((sum, log) => {
      const duration = log[4].split(':').map(Number);
      return sum + duration[0] * 3600 + duration[1] * 60 + duration[2];
    }, 0);
    const totalEarnings = filteredLogs.reduce((sum, log) => {
      return sum + parseFloat(log[5].replace('₹', ''));
    }, 0);

  const finalY = (doc.lastAutoTable?.finalY || 45) + 10;
    doc.setFontSize(10);
    doc.text(`Total Hours: ${formatTime(totalDuration)}`, 14, finalY);
    doc.text(`Total Earnings: ₹${totalEarnings.toLocaleString()}`, 14, finalY + 7);

    // Save the PDF
    doc.save('worklogs-report.pdf');
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
          <li
            className={activeSection === "insights" ? "active" : ""}
            style={{ cursor: "pointer" }}
            onClick={() => setActiveSection("insights")}
          >
            Insights
          </li>
          <li
            className={activeSection === "salary" ? "active" : ""}
            style={{ cursor: "pointer" }}
            onClick={() => setActiveSection("salary")}
          >
            Salary
          </li>
          <li
            className={activeSection === "worklogs" ? "active" : ""}
            style={{ cursor: "pointer" }}
            onClick={() => setActiveSection("worklogs")}
          >
            Worklogs
          </li>
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
            
            {/* Idle Analytics Section */}
            <div className="idle-analytics-section mt-4">
              <h2>Employee Idle Time Analytics</h2>
              <div className="idle-scope-selector mb-3">
                <span className="scope-label">View: </span>
                <button 
                  className={`scope-btn ${idleScope === 'today' ? 'active' : ''}`}
                  onClick={() => setIdleScope('today')}
                >
                  Today
                </button>
                <button 
                  className={`scope-btn ${idleScope === 'week' ? 'active' : ''}`}
                  onClick={() => setIdleScope('week')}
                >
                  Last 7 Days
                </button>
                <button 
                  className={`scope-btn ${idleScope === 'month' ? 'active' : ''}`}
                  onClick={() => setIdleScope('month')}
                >
                  This Month
                </button>
              </div>
              
              {idleAnalytics.length === 0 ? (
                <p>No idle time data available for the selected period.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Total Work Time</th>
                        <th>Total Idle Time</th>
                        <th>Idle %</th>
                        <th>Effective Time</th>
                        <th>Sessions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {idleAnalytics.map((analytics, index) => (
                        <tr key={index}>
                          <td>{analytics.employeeName}</td>
                          <td>{formatTime(analytics.totalWorkTime)}</td>
                          <td className={analytics.totalIdleTime > 0 ? 'text-warning' : ''}>
                            {formatTime(analytics.totalIdleTime)}
                          </td>
                          <td className={analytics.idlePercentage > 20 ? 'text-danger' : analytics.idlePercentage > 10 ? 'text-warning' : 'text-success'}>
                            {analytics.idlePercentage.toFixed(1)}%
                          </td>
                          <td className="text-success">{formatTime(analytics.effectiveTime)}</td>
                          <td>{analytics.sessionCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="employees-section mt-4">
              <h2>All Employees</h2>
              {employees.length === 0 ? (
                <p>No employees found.</p>
              ) : (
                <div className="row">
                  {employees.map(emp => (
                    <div className="col-md-4 mb-4" key={emp._id}>
                      <div className="card h-100 shadow-sm">
                        <div className="card-body">
                          <h5 className="card-title">{emp.firstName || ''} {emp.lastName || ''}</h5>
                          <p className="card-text mb-1"><strong>Email:</strong> {emp.email}</p>
                          <p className="card-text"><strong>Role:</strong> {emp.role}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

        {activeSection === "salary" && (
          <div className="welcome-card mt-4">
            <h2>All Employees Salary</h2>
            {employees.length === 0 ? (
              <p>No employees found.</p>
            ) : (
              <div className="senior-table-container">
                <table className="senior-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Current Salary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => (
                      <tr key={emp._id}>
                        <td>{(emp.firstName || '') + ' ' + (emp.lastName || '')}</td>
                        <td>{emp.email}</td>
                        <td>₹{emp.salary || 15000}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeSection === "insights" && (
          <div className="welcome-card mt-4">
            <h2>Team Insights</h2>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'1.5rem', marginTop:'1rem'}}>
              <div style={{background:'#fff', borderRadius:'12px', padding:'1rem'}}>
                <h3 style={{marginTop:0}}>Role Distribution</h3>
                <Bar
                  data={getRoleDistData(employees)}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false }, title: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                  }}
                  height={200}
                />
              </div>
              <div style={{background:'#fff', borderRadius:'12px', padding:'1rem'}}>
                <h3 style={{marginTop:0}}>Salary Allocation</h3>
                <Doughnut
                  data={getSalaryDoughnutData(employees)}
                  options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }}
                />
              </div>
              <div style={{background:'#fff', borderRadius:'12px', padding:'1rem'}}>
                <h3 style={{marginTop:0}}>Salary Summary</h3>
                <div style={{overflowX: 'auto'}}>
                  <table style={{width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem'}}>
                    <thead>
                      <tr>
                        <th style={{padding: '12px', borderBottom: '2px solid #eee', textAlign: 'left', background: '#f8f9fa'}}>Metric</th>
                        <th style={{padding: '12px', borderBottom: '2px solid #eee', textAlign: 'right', background: '#f8f9fa'}}>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const s = getSalarySummary(employees);
                        return (
                          <>
                            <tr>
                              <td style={{padding: '12px', borderBottom: '1px solid #eee'}}>Total Employees</td>
                              <td style={{padding: '12px', borderBottom: '1px solid #eee', textAlign: 'right'}}>{s.totalEmployees}</td>
                            </tr>
                            <tr>
                              <td style={{padding: '12px', borderBottom: '1px solid #eee'}}>Total Payroll</td>
                              <td style={{padding: '12px', borderBottom: '1px solid #eee', textAlign: 'right'}}>₹{s.totalPayroll.toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td style={{padding: '12px', borderBottom: '1px solid #eee'}}>Average Salary</td>
                              <td style={{padding: '12px', borderBottom: '1px solid #eee', textAlign: 'right'}}>₹{s.avg.toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td style={{padding: '12px', borderBottom: '1px solid #eee'}}>Minimum Salary</td>
                              <td style={{padding: '12px', borderBottom: '1px solid #eee', textAlign: 'right'}}>₹{s.min.toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td style={{padding: '12px', borderBottom: '1px solid #eee'}}>Maximum Salary</td>
                              <td style={{padding: '12px', borderBottom: '1px solid #eee', textAlign: 'right'}}>₹{s.max.toLocaleString()}</td>
                            </tr>
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
                <h4 style={{margin: '1.5rem 0 1rem'}}>Top Earners</h4>
                <div style={{overflowX: 'auto'}}>
                  <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <thead>
                      <tr>
                        <th style={{padding: '12px', borderBottom: '2px solid #eee', textAlign: 'left', background: '#f8f9fa'}}>Rank</th>
                        <th style={{padding: '12px', borderBottom: '2px solid #eee', textAlign: 'left', background: '#f8f9fa'}}>Employee Name</th>
                        <th style={{padding: '12px', borderBottom: '2px solid #eee', textAlign: 'right', background: '#f8f9fa'}}>Salary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getTopEarners(employees, 5).map((e, index) => (
                        <tr key={e._id}>
                          <td style={{padding: '12px', borderBottom: '1px solid #eee'}}>{index + 1}</td>
                          <td style={{padding: '12px', borderBottom: '1px solid #eee'}}>{(e.firstName || '') + ' ' + (e.lastName || '')}</td>
                          <td style={{padding: '12px', borderBottom: '1px solid #eee', textAlign: 'right'}}>₹{(e.salary || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === "worklogs" && (
          <div className="welcome-card mt-4">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
              <h2>Employee Worklogs</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                  onClick={downloadWorklogsPDF}
                  className="btn btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    fontSize: '0.9rem',
                    backgroundColor: '#3498db',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#fff'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 11V14H2V11H0V14C0 15.1 0.9 16 2 16H14C15.1 16 16 15.1 16 14V11H14ZM13 7L11.59 5.59L9 8.17V0H7V8.17L4.41 5.59L3 7L8 12L13 7Z" fill="currentColor"/>
                  </svg>
                  Download PDF
                </button>
                <select 
                  className="form-select" 
                  style={{ width: 'auto' }}
                  value={worklogFilter}
                  onChange={(e) => setWorklogFilter(e.target.value)}
                >
                  <option value="all">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {worklogs.length === 0 ? (
              <p>No worklogs found.</p>
            ) : (
              <div className="senior-table-container">
                <table className="senior-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Date</th>
                      <th>Start Time</th>
                      <th>End Time</th>
                      <th>Duration</th>
                      <th>Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {worklogs
                      .filter(log => worklogFilter === 'all' || log.userId === worklogFilter)
                      .map((log, index) => {
                        const employee = employees.find(emp => emp._id === log.userId);
                        const dailyRate = (employee?.salary || 0) / 30;
                        const minutesWorked = Math.ceil((log.duration / 60) / 5) * 5;
                        const earnings = Math.min(dailyRate, (dailyRate / (8 * 60)) * minutesWorked);
                        
                        return (
                          <tr key={log._id || index}>
                            <td>{employee ? `${employee.firstName} ${employee.lastName}` : log.email}</td>
                            <td>{log.date}</td>
                            <td>{new Date(log.startTime).toLocaleTimeString()}</td>
                            <td>{new Date(log.endTime).toLocaleTimeString()}</td>
                            <td>{formatTime(log.duration)}</td>
                            <td>₹{Math.round(earnings)}</td>
                          </tr>
                        );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SeniorHome;