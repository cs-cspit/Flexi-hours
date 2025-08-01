// src/pages/Login.jsx
import React, { useState } from 'react';
import '../style/Login.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Signup from './Signup';

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', role: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', form);
      const { token, userId, username, role, email } = res.data;

      // Store necessary info in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('userId', userId);
      localStorage.setItem('username', username); // Store name for UI
      localStorage.setItem('role', role); // Store role for UI
      localStorage.setItem('email', email); // Store email for UI

      if (role === 'employee') {
        navigate('/home');
      } else if (role === 'senior_employee') {
        navigate('/seniorhome');
      } else if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/home');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="login-container">
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
            className="form-control"
            name="role"
            value={form.role}
            onChange={handleChange}
            required
          >
            <option value="">Select Role</option>
            <option value="employee">Employee</option>
            <option value="senior_employee">Senior Employee</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary w-100">Login</button>
        <p className="mt-3 text-center">
          Don’t have an account? <a href="/signup">Signup</a>
        </p>
      </form>
    </div>
  );
}

export default Login;
