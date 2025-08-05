import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import '../style/Signup.css';


function Signup() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "employee"
  });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { firstName, lastName, email, password, role } = form;

    try {
      const res = await fetch("http://localhost:5000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, password, role }),
      });

      const data = await res.json();
      if (res.status === 201) {
        alert("Signup successful!");
        navigate("/login");
      } else if (res.status === 409 || data.message === "User already exists") {
        alert("User already exists! Redirecting to login...");
        navigate("/login");
      } else {
        setMessage(data.message || "Something went wrong");
      }
    } catch (err) {
      console.error("Signup error:", err);
      setMessage("Server error. Try again later.");
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <h2 className="text-center mb-4">Signup</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group mb-3">
            <label>First Name</label>
            <input type="text" name="firstName" className="form-control" onChange={handleChange} required />
          </div>
          <div className="form-group mb-3">
            <label>Last Name</label>
            <input type="text" name="lastName" className="form-control" onChange={handleChange} required />
          </div>
          <div className="form-group mb-3">
            <label>Email</label>
            <input type="email" name="email" className="form-control" onChange={handleChange} required />
          </div>
          <div className="form-group mb-4">
            <label>Password</label>
            <input type="password" name="password" className="form-control" onChange={handleChange} required />
          </div>
          <button type="submit" className="btn btn-primary w-100">Create Account</button>
        </form>

        <div className="text-center mt-3">
          <span>Already have an account? </span>
          <Link to="/login" className="btn btn-link p-0">Login</Link>
        </div>

        {message && <div className="alert alert-info mt-3 text-center">{message}</div>}
      </div>
    </div>
  );
}

export default Signup;
