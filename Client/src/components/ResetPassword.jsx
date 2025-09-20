// src/pages/ResetPassword.jsx
import React, { useState } from "react";
import "../style/Login.css";
import axios from "axios";

function ResetPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/auth/reset-password", { email });
      setMessage(res.data.message || "Password reset link has been sent to your email.");
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reset link.");
      setMessage("");
    }
  };

  return (
    <div className="container">
      <div className="form-box">
        <h2 className="text-center mb-4">Forgot Password</h2>
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleReset}>
          <div className="form-group mb-3">
            <label>Email address</label>
            <input
              type="email"
              className="form-control"
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary w-100">
            Send Reset Link
          </button>

          <p className="mt-3 text-center">
            <a href="/login">Back to Login</a>
          </p>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;
