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
import "../style/Home.css";
import "../style/Admin.css";


import axios from "axios";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title);

// Date formatting helper (dd/mm/yyyy) accepting legacy variants
const formatDisplayDate = (input) => {
  if (!input) return '';
  // If already dd/mm/yyyy return as-is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) return input;
  // If ISO yyyy-mm-dd convert
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y,m,d] = input.split('-');
    return `${d}/${m}/${y}`;
  }
  // Fallback: let Date parse and then format
  const dt = new Date(input);
  if (isNaN(dt)) return input;
  const d = String(dt.getDate()).padStart(2,'0');
  const m = String(dt.getMonth()+1).padStart(2,'0');
  const y = dt.getFullYear();
  return `${d}/${m}/${y}`;
};

// Helpers for Insights
const normalizeRole = (role) => {
  if (!role) return 'employee';
  const r = String(role).toLowerCase();
  if (r.startsWith('senior')) return 'senior';
  return 'employee';
};

const getRoleDistData = (employees) => {
  const counts = employees.reduce((acc, e) => {
    const r = normalizeRole(e.role);
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {});
  const labels = Object.keys(counts).length ? Object.keys(counts) : ['employee'];
  const data = labels.map(l => counts[l] || 0);
  return {
    labels,
    datasets: [{ label: 'Employees', data, backgroundColor: '#3498db', borderRadius: 6 }],
  };
};

const getSalaryDoughnutData = (employees) => {
  const top = employees.slice(0, 5);
  const labels = top.map(e => `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.email);
  const data = top.map(e => Number(e.salary || 0));
  const colors = ['#1abc9c','#3498db','#9b59b6','#f1c40f','#e67e22'];
  return {
    labels: labels.length ? labels : ['No Data'],
    datasets: [{ data: data.length ? data : [1], backgroundColor: colors.slice(0, data.length || 1) }],
  };
};

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

const getPerRoleSummary = (employees) => {
  const buckets = employees.reduce((acc, e) => {
    const r = normalizeRole(e.role);
    const s = Number(e.salary || 0);
    if (!acc[r]) acc[r] = [];
    acc[r].push(s);
    return acc;
  }, {});
  const roles = ['employee', 'senior'];
  return roles.map(r => {
    const arr = buckets[r] || [];
    const count = arr.length;
    const total = arr.reduce((a, b) => a + b, 0);
    const avg = count ? Math.round(total / count) : 0;
    const min = arr.length ? Math.min(...arr) : 0;
    const max = arr.length ? Math.max(...arr) : 0;
    return { role: r, count, total, avg, min, max };
  });
};

const Admin = () => {
  // UI state for navigation
  const [activeSection, setActiveSection] = useState('employees');
  const [showDropdown, setShowDropdown] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [employees, setEmployees] = useState([]);
  const [worklogs, setWorklogs] = useState([]);
  const [worklogFilter, setWorklogFilter] = useState('all');
  // Remove employee handler
  const handleRemoveEmployee = async (empId, empName) => {
    const confirmRemove = window.confirm(`Are you sure you want to remove ${empName}?`);
    if (!confirmRemove) return;
    try {
      await axios.delete(`http://localhost:5000/api/auth/employees/${empId}`);
      setEmployees(prev => prev.filter(emp => emp._id !== empId));
    } catch (err) {
      window.alert('Failed to remove employee.');
    }
  };
  const navigate = useNavigate();
  const dropdownRef = useRef();

  useEffect(() => {
    const storedEmail = localStorage.getItem("email");
    setUserEmail(storedEmail || "");
  }, []);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const downloadWorklogsPDF = () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      doc.setFontSize(18);
      doc.text('Employee Worklogs Report', 14, 20);
      doc.setFontSize(11);
  doc.text(`Generated on: ${formatDisplayDate(new Date().toISOString().slice(0,10))}`, 14, 30);
      const filterText = worklogFilter === 'all'
        ? 'All Employees'
        : `Employee: ${(employees.find(e => e._id === worklogFilter)?.firstName || '')} ${(employees.find(e => e._id === worklogFilter)?.lastName || '')}`;
      doc.text(`Filter: ${filterText}`, 14, 37);

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

      autoTable(doc, {
        startY: 45,
        head: [['Employee', 'Date', 'Start Time', 'End Time', 'Duration', 'Earnings']],
        body: filteredLogs,
        theme: 'striped',
        headStyles: { fillColor: [52, 152, 219], textColor: 255, fontSize: 10, halign: 'left' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 25 }, 2: { cellWidth: 30 }, 3: { cellWidth: 30 }, 4: { cellWidth: 30 }, 5: { cellWidth: 25 } }
      });

      const totalDuration = filteredLogs.reduce((sum, row) => {
        const [hh, mm, ss] = String(row[4]).split(':').map(Number);
        return sum + (hh * 3600 + mm * 60 + ss);
      }, 0);
      const totalEarnings = filteredLogs.reduce((sum, row) => sum + parseFloat(String(row[5]).replace('₹', '')), 0);

      const finalY = (doc.lastAutoTable?.finalY || 45) + 10;
      doc.setFontSize(10);
      doc.text(`Total Hours: ${formatTime(totalDuration)}`, 14, finalY);
      doc.text(`Total Earnings: ₹${totalEarnings.toLocaleString()}`, 14, finalY + 7);

      doc.save('worklogs-report.pdf');
    } catch (err) {
      console.error('Error generating PDF:', err);
      window.alert('Error generating PDF. Please try again.');
    }
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
    // Fetch all users (employees)
    axios.get("http://localhost:5000/api/auth/employees")
      .then(res => setEmployees(res.data.employees))
      .catch(err => setEmployees([]));
  }, []);

  // Fetch worklogs when worklog section is active
  useEffect(() => {
    if (activeSection === 'worklogs') {
      fetchWorklogs();
    }
  }, [activeSection]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // Add Employee Form State
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'employee', salary: 15000 });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFormError('');
    setFormSuccess('');
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    setFormSuccess('');
    try {
      const res = await axios.post('http://localhost:5000/api/auth/signup', form);
      setFormSuccess('Employee added successfully!');
  setEmployees(prev => [...prev, { ...form, _id: res.data.userId || Math.random().toString(), role: form.role }]);
  setForm({ firstName: '', lastName: '', email: '', password: '', role: 'employee', salary: 15000 });
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to add employee.');
    } finally {
      setFormLoading(false);
    }
  };

  // UI state for navigation
  const [salaryEdit, setSalaryEdit] = useState({}); // { [userId]: value }
  const [salaryLoading, setSalaryLoading] = useState({}); // { [userId]: boolean }
  const [salaryError, setSalaryError] = useState({}); // { [userId]: string }
  const [salarySuccess, setSalarySuccess] = useState({}); // { [userId]: string }
  const [salaryModal, setSalaryModal] = useState({ open: false, id: null, current: 0, input: '' });

  const openSalaryModal = (emp) => {
    setSalaryModal({ open: true, id: emp._id, current: Number(emp.salary || 15000), input: String(emp.salary || 15000) });
    setSalaryError(prev => ({ ...prev, [emp._id]: '' }));
    setSalarySuccess(prev => ({ ...prev, [emp._id]: '' }));
  };

  const closeSalaryModal = () => setSalaryModal({ open: false, id: null, current: 0, input: '' });

  const handleSalaryUpdate = async (id, valueStr) => {
    const salaryVal = Number(valueStr);
    if (!Number.isFinite(salaryVal) || salaryVal < 0) {
      setSalaryError(prev => ({ ...prev, [id]: 'Please enter a valid non-negative number.' }));
      return;
    }
    const confirmMsg = `Are you sure you want to set salary to ₹${salaryVal}?`;
    const ok = window.confirm(confirmMsg);
    if (!ok) return;
    setSalaryLoading(prev => ({ ...prev, [id]: true }));
    setSalaryError(prev => ({ ...prev, [id]: '' }));
    setSalarySuccess(prev => ({ ...prev, [id]: '' }));
    try {
      await axios.patch(`http://localhost:5000/api/auth/employees/${id}/salary`, { salary: salaryVal });
      setEmployees(prev => prev.map(emp => emp._id === id ? { ...emp, salary: salaryVal } : emp));
      setSalarySuccess(prev => ({ ...prev, [id]: 'Salary updated!' }));
      closeSalaryModal();
    } catch (err) {
      setSalaryError(prev => ({ ...prev, [id]: err.response?.data?.message || 'Failed to update salary.' }));
    } finally {
      setSalaryLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="dashboard-container admin">
      <div className="sidebar">
        <h2>FlexiHours</h2>
        <ul className="nav-list">
          <li
            className={`nav-item ${activeSection === 'employees' ? 'active' : ''}`}
            onClick={() => setActiveSection('employees')}
          >
            All Employees
          </li>
          <li
            className={`nav-item ${activeSection === 'add' ? 'active' : ''}`}
            onClick={() => setActiveSection('add')}
          >
            Add new Employees
          </li>
          <li
            className={`nav-item ${activeSection === 'salary' ? 'active' : ''}`}
            onClick={() => setActiveSection('salary')}
          >
            Manage Salary
          </li>
          <li
            className={`nav-item ${activeSection === 'worklogs' ? 'active' : ''}`}
            onClick={() => setActiveSection('worklogs')}
          >
            View Worklogs
          </li>
          <li
            className={`nav-item ${activeSection === 'insights' ? 'active' : ''}`}
            onClick={() => setActiveSection('insights')}
          >
            Salary Insights
          </li>
        </ul>
      </div>
      
      <div className="main-content">
        {activeSection === 'insights' && (
          <div className="employees-section">
            <h2 className="section-title">Salary Insights</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Charts Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                <div className="card">
                  <h3 style={{ marginTop: 0 }}>Role Distribution</h3>
                  <Bar
                    data={getRoleDistData(employees)}
                    options={{
                      responsive: true,
                      plugins: { legend: { display: false } },
                      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                    }}
                    height={200}
                  />
                </div>
                <div className="card">
                  <h3 style={{ marginTop: 0 }}>Top Salary Allocation</h3>
                  <Doughnut
                    data={getSalaryDoughnutData(employees)}
                    options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }}
                  />
                </div>
              </div>

              {/* Overall Summary */}
              <div className="card">
                <h3 style={{ marginTop: 0 }}>Overall Salary Summary</h3>
                {(() => { const s = getSalarySummary(employees); return (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th style={{ textAlign: 'right' }}>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td>Total Employees</td><td style={{ textAlign: 'right' }}>{s.totalEmployees}</td></tr>
                      <tr><td>Total Payroll</td><td style={{ textAlign: 'right' }}>₹{s.totalPayroll.toLocaleString()}</td></tr>
                      <tr><td>Average Salary</td><td style={{ textAlign: 'right' }}>₹{s.avg.toLocaleString()}</td></tr>
                      <tr><td>Minimum Salary</td><td style={{ textAlign: 'right' }}>₹{s.min.toLocaleString()}</td></tr>
                      <tr><td>Maximum Salary</td><td style={{ textAlign: 'right' }}>₹{s.max.toLocaleString()}</td></tr>
                    </tbody>
                  </table>
                ); })()}
              </div>

              {/* Per Role Summary (Employee vs Senior) */}
              <div className="card">
                <h3 style={{ marginTop: 0 }}>Per Role Salary Summary (Employee vs Senior)</h3>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Count</th>
                      <th>Total (₹)</th>
                      <th>Average (₹)</th>
                      <th>Min (₹)</th>
                      <th>Max (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPerRoleSummary(employees).map(r => (
                      <tr key={r.role}>
                        <td>{r.role}</td>
                        <td>{r.count}</td>
                        <td>₹{r.total.toLocaleString()}</td>
                        <td>₹{r.avg.toLocaleString()}</td>
                        <td>₹{r.min.toLocaleString()}</td>
                        <td>₹{r.max.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Top Earners */}
              <div className="card">
                <h3 style={{ marginTop: 0 }}>Top Earners</h3>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Salary (₹)</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getTopEarners(employees, 10).map((e, i) => (
                      <tr key={e._id || i}>
                        <td>{i + 1}</td>
                        <td>{`${e.firstName || ''} ${e.lastName || ''}`.trim() || e.email}</td>
                        <td>{e.email}</td>
                        <td>₹{Number(e.salary || 0).toLocaleString()}</td>
                        <td>{normalizeRole(e.role)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {activeSection === 'employees' && (
          <div className="employees-section">
            <h2 className="section-title">All Employees</h2>
            {employees.length === 0 ? (
              <p style={{ textAlign: 'center' }}>No employees found.</p>
            ) : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Salary</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => (
                      <tr key={emp._id}>
                        <td>{(emp.firstName || '') + ' ' + (emp.lastName || '')}</td>
                        <td>{emp.email}</td>
                        <td>₹{emp.salary || 15000}</td>
                        <td>{emp.role}</td>
                        <td>
                          <button
                            className="btn btn-danger"
                            onClick={() => handleRemoveEmployee(emp._id, emp.firstName || emp.email)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeSection === 'add' && (
          <div className="add-employee-section add-form">
            <h2 className="section-title">Add New Employee</h2>
            <form onSubmit={handleAddEmployee}>
              <div className="field">
                <label>First Name:</label>
                <input
                  type="text"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="field">
                <label>Last Name:</label>
                <input
                  type="text"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="field">
                <label>Email:</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="field">
                <label>Password:</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="field">
                <label>Salary:</label>
                <input
                  type="number"
                  name="salary"
                  value={form.salary}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="field">
                <label>Role:</label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleFormChange}
                >
                  <option value="employee">Employee</option>
                  <option value="senior">Senior</option>
                </select>
              </div>
              {formError && <p style={{ color: 'red', textAlign: 'center' }}>{formError}</p>}
              {formSuccess && <p style={{ color: 'green', textAlign: 'center' }}>{formSuccess}</p>}
              <button
                type="submit"
                disabled={formLoading}
                className="submit"
              >
                {formLoading ? 'Adding...' : 'Add Employee'}
              </button>
            </form>
          </div>
        )}

        {activeSection === 'salary' && (
          <div className="salary-section">
            <h2 className="section-title">Manage Salaries</h2>
            {employees.length === 0 ? (
              <p style={{ textAlign: 'center' }}>No employees found.</p>
            ) : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Current Salary</th>
                      <th>Action</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => (
                      <tr key={emp._id}>
                        <td>{(emp.firstName || '') + ' ' + (emp.lastName || '')}</td>
                        <td>{emp.email}</td>
                        <td>₹{emp.salary || 15000}</td>
                        <td>
                          <button className="btn-success" onClick={() => openSalaryModal(emp)}>
                            Edit Salary
                          </button>
                        </td>
                        <td>
                          {salaryLoading[emp._id] ? 'Updating…' : (salarySuccess[emp._id] || salaryError[emp._id] || '')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeSection === 'worklogs' && (
          <div className="worklogs-root">
            <div className="worklogs-header">
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#333', fontWeight: 500 }}>Employee Worklogs</h2>
              <div className="worklogs-actions">
                <button onClick={downloadWorklogsPDF} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 11V14H2V11H0V14C0 15.1 0.9 16 2 16H14C15.1 16 16 15.1 16 14V11H14ZM13 7L11.59 5.59L9 8.17V0H7V8.17L4.41 5.59L3 7L8 12L13 7Z" fill="currentColor"/>
                  </svg>
                  Download PDF
                </button>
                <select 
                  className="worklogs-filter"
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
              <div style={{ 
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                fontSize: '14px'
              }}>
                No worklogs found.
              </div>
            ) : (
              <div className="worklogs-table-wrap">
                <table className="worklogs-table">
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
                            <td>
                              {employee ? `${employee.firstName} ${employee.lastName}` : log.email}
                            </td>
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
      
      <div className="user-menu">
        <div ref={dropdownRef} style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          <button className="user-button" onClick={() => setShowDropdown(!showDropdown)} onMouseDown={(e) => e.stopPropagation()}>
            <img src="/user.png" alt="User" style={{ width: '30px', height: '30px', borderRadius: '50%' }} />
          </button>
          {showDropdown && (
            <div className="dropdown-menu">
              <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #eee', fontSize: '0.9rem' }}>{userEmail}</div>
              <button
                onClick={handleLogout}
                style={{ width: '100%', padding: '0.5rem 1rem', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.9rem' }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {salaryModal.open && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 style={{ marginTop: 0 }}>Edit Salary</h3>
            <p style={{ marginBottom: '0.5rem' }}>Current: ₹{salaryModal.current}</p>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>New Salary</label>
            <input
              type="number"
              min={0}
              step={1}
              value={salaryModal.input}
              onChange={(e) => setSalaryModal(m => ({ ...m, input: e.target.value }))}
              className="salary-input"
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeSalaryModal}>Cancel</button>
              <button className="btn-success" onClick={() => handleSalaryUpdate(salaryModal.id, salaryModal.input)}>
                {salaryLoading[salaryModal.id] ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
