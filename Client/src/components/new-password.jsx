// src/pages/NewPassword.jsx
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../style/Login.css";
import axios from "axios";

function NewPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/auth/new-password", { token, password });
      setMessage(res.data.message || "Password reset successfully.");
      setPassword("");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setMessage(err.response?.data?.message || "Error resetting password.");
    }
  };

  return (
    <div className="container">
      <div className="form-box">
        <h2 className="text-center mb-4">Set New Password</h2>
        {message && <div className="alert alert-info">{message}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group mb-3">
            <input
              type="password"
              className="form-control"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-success w-100">
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
}

export default NewPassword;
