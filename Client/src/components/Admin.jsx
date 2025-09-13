import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../style/Home.css";
import "../style/Admin.css";


import axios from "axios";

const Admin = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [employees, setEmployees] = useState([]);
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

  useEffect(() => {
    // Fetch all users (employees)
    axios.get("http://localhost:5000/api/auth/employees")
      .then(res => setEmployees(res.data.employees))
      .catch(err => setEmployees([]));
  }, []);

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
  const [activeSection, setActiveSection] = useState('employees'); // 'employees', 'add', or 'salary'
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
        </ul>
      </div>
      
      <div className="main-content">
        {activeSection === 'employees' && (
          <div className="employees-section" style={{ maxWidth: 1200, margin: '0 auto', background: 'transparent' }}>
            <h2 className="section-title">All Employees</h2>
            {employees.length === 0 ? (
              <p style={{ textAlign: 'center' }}>No employees found.</p>
            ) : (
              <div className="cards-grid">
                {employees.map(emp => (
                  <div key={emp._id} className="card">
                    <h5>{emp.firstName || ''} {emp.lastName || ''}</h5>
                    <p><strong>Email:</strong> {emp.email}</p>
                    <p><strong>Salary:</strong> ₹{emp.salary || 15000}</p>
                    <p><strong>Role:</strong> {emp.role}</p>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleRemoveEmployee(emp._id, emp.firstName || emp.email)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
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
          <div className="salary-section" style={{ maxWidth: 1200, margin: '0 auto', background: 'transparent' }}>
            <h2 className="section-title">Manage Salaries</h2>
            {employees.length === 0 ? (
              <p style={{ textAlign: 'center' }}>No employees found.</p>
            ) : (
              <div className="salary-grid">
                {employees.map(emp => (
                  <div key={emp._id} className="card">
                    <h5>{emp.firstName || ''} {emp.lastName || ''}</h5>
                    <p><strong>Email:</strong> {emp.email}</p>
                    <p><strong>Current Salary:</strong> ₹{emp.salary || 15000}</p>
                    <button
                      onClick={() => openSalaryModal(emp)}
                      className="btn-success"
                    >
                      Edit Salary
                    </button>
                    {salaryError[emp._id] && <p style={{ color: 'red', fontSize: '0.8rem' }}>{salaryError[emp._id]}</p>}
                    {salarySuccess[emp._id] && <p style={{ color: 'green', fontSize: '0.8rem' }}>{salarySuccess[emp._id]}</p>}
                  </div>
                ))}
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
