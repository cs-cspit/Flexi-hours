// src/pages/Login.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../style/Login.css';

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', role: 'employee' });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        email: form.email,
        password: form.password,
        role: form.role,
      });
      // Persist basics used across pages
      localStorage.setItem('userId', res.data.userId);
      localStorage.setItem('email', res.data.email || form.email);
      localStorage.setItem('role', res.data.role || form.role);

      const role = (res.data.role || form.role || '').toLowerCase();
      if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'senior_employee' || role === 'senior') {
        navigate('/SeniorHome');
      } else {
        navigate('/home');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
      <h2 className="mb-4 text-center">Login</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleLogin}>
        <div className="form-group mb-3">
          <label>Email address</label>
          <input
            type="email"
            className="form-control"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group mb-4">
          <label>Password</label>
          <input
            type="password"
            className="form-control"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group mb-4">
          <label>Role</label>
          <select
            className="form-select"
            name="role"
            value={form.role}
            onChange={handleChange}
          >
            <option value="employee">Employee</option>
            <option value="senior_employee">Senior</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary w-100">Login</button>
        <p className="mt-3 text-center">
          Don’t have an account? <a href="/signup">Signup</a>
        </p>
      </form>
      </div>
    </div>
  );
}

export default Login;
