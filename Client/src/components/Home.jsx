// src/pages/Home.jsx

import React, { useState, useEffect, useRef } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import "../style/Home.css";
import { useIdleTimer } from "../hooks/useIdleTimer";

// Date formatting helper (dd/mm/yyyy) shared logic
const formatDisplayDate = (input) => {
  if (!input) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) return input;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) { const [y,m,d] = input.split('-'); return `${d}/${m}/${y}`; }
  const dt = new Date(input);
  if (isNaN(dt)) return input;
  const d = String(dt.getDate()).padStart(2,'0');
  const m = String(dt.getMonth()+1).padStart(2,'0');
  const y = dt.getFullYear();
  return `${d}/${m}/${y}`;
};

const Home = () => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [stopMessage, setStopMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [myTasks, setMyTasks] = useState([]);
  const [monthlySalary, setMonthlySalary] = useState(0);
  const [dailyRate, setDailyRate] = useState(0);
  const [roundedMinutes, setRoundedMinutes] = useState(0);
  const [todaysEarning, setTodaysEarning] = useState(0);
  const [monthlyTotalEarnings, setMonthlyTotalEarnings] = useState(0);
  const [hasTodayWorklog, setHasTodayWorklog] = useState(false);
  const [todayLoggedSeconds, setTodayLoggedSeconds] = useState(0);
  const [todayLogs, setTodayLogs] = useState([]);
  const [activeSection, setActiveSection] = useState("tasks");
  const [monthlyEarnings, setMonthlyEarnings] = useState([]);
  // New state for all historical worklogs of the logged-in user
  const [allMyWorklogs, setAllMyWorklogs] = useState([]);
  const [isLoadingWorklogs, setIsLoadingWorklogs] = useState(false);
  const [showIdlePopup, setShowIdlePopup] = useState(false);
  const [idleSegments, setIdleSegments] = useState([]); // Track all idle periods in current session
  const [currentIdleStart, setCurrentIdleStart] = useState(null);

  const navigate = useNavigate();
  const dropdownRef = useRef();

  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Tooltip,
    Legend,
    Title
  );

  useEffect(() => {
    const storedEmail = localStorage.getItem("email");
    setUserEmail(storedEmail || "");
  }, []);

  // Fetch today logs
  const fetchTodayLogs = async () => {
    const userId = localStorage.getItem("userId");
    const email = localStorage.getItem("email");
    if (!userId || !email) return;

    try {
      const res = await axios.get(
        `http://localhost:5000/api/worklogs/${userId}/today`,
        { params: { email: email.toLowerCase() } }
      );
      const logs = res.data?.logs || [];
      setTodayLogs(logs);
      const exists = logs.length > 0;
      setHasTodayWorklog(exists);

      if (exists) {
        const totalSeconds = logs.reduce(
          (acc, l) => acc + (Number(l.duration) || 0),
          0
        );
        setTodayLoggedSeconds(totalSeconds);
      } else {
        setTodayLoggedSeconds(0);
      }
    } catch (err) {
      console.error("Failed to fetch today logs:", err);
      setHasTodayWorklog(false);
      setTodayLoggedSeconds(0);
      setTodayLogs([]);
    }
  };

  const fetchMonthlyTotalEarnings = async () => {
    const userId = localStorage.getItem("userId");
    const email = localStorage.getItem("email");
    if (!userId || !email) return;

    try {
      // Fetch all worklogs
      const response = await axios.get("http://localhost:5000/api/worklogs");
      const allLogs = response.data.logs || [];
      
      // Filter for current month and current user
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const monthlyLogs = allLogs.filter(log => {
        const logDate = new Date(log.startTime);
        return logDate.getMonth() === currentMonth && 
               logDate.getFullYear() === currentYear &&
               (log.userId === userId || log.email === email);
      });
      
      // Calculate total monthly earnings based on the same logic as daily earnings
      let totalMonthlyEarnings = 0;
      
      monthlyLogs.forEach(log => {
        const minutesFloat = (log.duration || 0) / 60;
        const rounded = Math.ceil(minutesFloat / 5) * 5; // Round to nearest 5 minutes
        const perMinute = dailyRate / (8 * 60);
        const logEarning = Math.min(dailyRate, perMinute * rounded);
        totalMonthlyEarnings += logEarning;
      });
      
      setMonthlyTotalEarnings(totalMonthlyEarnings);
      
    } catch (err) {
      console.error("Failed to fetch monthly earnings:", err);
      setMonthlyTotalEarnings(0);
    }
  };

  useEffect(() => {
    fetchTodayLogs();
  }, []);

  // Fetch ALL worklogs for this user (client-side filter of global logs for now)
  const fetchAllMyWorklogs = async () => {
    const email = localStorage.getItem("email");
    if (!email) return;
    setIsLoadingWorklogs(true);
    try {
      // Existing endpoint returns all worklogs; filter client-side by email
      const res = await axios.get("http://localhost:5000/api/worklogs");
      const all = res.data?.logs || [];
      const mine = all.filter(l => (l.email || '').toLowerCase() === email.toLowerCase());
      // Sort newest first by date then start time if available
      mine.sort((a,b) => {
        const dA = new Date(a.date);
        const dB = new Date(b.date);
        if (dB - dA !== 0) return dB - dA;
        return new Date(b.startTime) - new Date(a.startTime);
      });
      setAllMyWorklogs(mine);
    } catch (err) {
      console.error('Failed to fetch all worklogs for user:', err);
      setAllMyWorklogs([]);
    } finally {
      setIsLoadingWorklogs(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'myworklogs') {
      fetchAllMyWorklogs();
    }
  }, [activeSection]);

  // Fetch tasks
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;
    axios
      .get("http://localhost:5000/api/tasks")
      .then((res) => {
        const assigned = res.data.tasks.filter(
          (task) => task.assignedTo?._id === userId
        );
        setMyTasks(assigned);
      })
      .catch((err) => console.error("Failed to fetch tasks", err));
  }, []);

  // Fetch salary
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const storedEmail = localStorage.getItem("email");
    if (!userId && !storedEmail) return;
    axios
      .get("http://localhost:5000/api/auth/employees")
      .then((res) => {
        const list = res.data.employees || [];
        const me =
          list.find((u) => u._id === userId) ||
          list.find((u) => u.email === storedEmail);
        const salary = Number(me?.salary) || 0;
        setMonthlySalary(salary);
        setDailyRate(salary > 0 ? salary / 30 : 0);
      })
      .catch(() => {
        setMonthlySalary(0);
        setDailyRate(0);
      });
  }, []);

  // Fetch monthly total earnings when dailyRate changes
  useEffect(() => {
    if (dailyRate > 0) {
      fetchMonthlyTotalEarnings();
    }
  }, [dailyRate]);

  // Generate monthly earnings data
  useEffect(() => {
    const generateMonthlyData = () => {
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      
      return months.map((_, index) => ({
        month: months[index],
        amount: monthlySalary * (0.85 + Math.random() * 0.3) // Random variation
      }));
    };

    setMonthlyEarnings(generateMonthlyData());
  }, [monthlySalary]);

  // Calculate earnings from logs
  useEffect(() => {
    if (hasTodayWorklog && todayLoggedSeconds > 0) {
      setIsRunning(false);
      setIsPaused(false);
      setTime(0);

      const minutesFloat = todayLoggedSeconds / 60;
      const rounded = Math.ceil(minutesFloat / 5) * 5;
      setRoundedMinutes(rounded);

      const perMinute = dailyRate / (8 * 60);
      const earning = Math.min(dailyRate, perMinute * rounded);
      setTodaysEarning(earning);
    }
  }, [hasTodayWorklog, todayLoggedSeconds, dailyRate]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let interval;
    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isPaused]);

  // Idle timer (30 seconds)
  const { idle, reset: resetIdle } = useIdleTimer({
    enabled: isRunning && !isPaused,
    thresholdMs: 30000,
    pollMs: 1000,
    onIdle: () => {
      // Record idle start time
      setCurrentIdleStart(new Date());
      // Auto pause when idle detected
      setIsPaused(true);
      setShowIdlePopup(true);
    }
  });

  const handleResumeAfterIdle = () => {
    // Record idle segment if we have a start time
    if (currentIdleStart) {
      const idleEnd = new Date();
      const idleDuration = idleEnd - currentIdleStart;
      const newIdleSegment = {
        start: currentIdleStart,
        end: idleEnd,
        duration: idleDuration
      };
      setIdleSegments(prev => [...prev, newIdleSegment]);
      setCurrentIdleStart(null);
    }
    
    setIsPaused(false);
    setShowIdlePopup(false);
    resetIdle();
  };

  const handleDismissIdle = () => {
    // Record idle segment if we have a start time (user dismissed, timer stays paused)
    if (currentIdleStart) {
      const idleEnd = new Date();
      const idleDuration = idleEnd - currentIdleStart;
      const newIdleSegment = {
        start: currentIdleStart,
        end: idleEnd,
        duration: idleDuration
      };
      setIdleSegments(prev => [...prev, newIdleSegment]);
      setCurrentIdleStart(null);
    }
    
    setShowIdlePopup(false);
    // Keep isPaused true since user dismissed rather than resumed
  };

  // Earnings if no worklog
  useEffect(() => {
    if (hasTodayWorklog) return;
    const minutesFloat = time / 60;
    const rounded =
      minutesFloat === 0 ? 0 : Math.ceil(minutesFloat / 5) * 5;
    setRoundedMinutes(rounded);
    const perMinute = dailyRate > 0 ? dailyRate / (8 * 60) : 0;
    const earning = Math.min(dailyRate, perMinute * rounded);
    setTodaysEarning(Number.isFinite(earning) ? earning : 0);
  }, [time, dailyRate, hasTodayWorklog]);

  const handleStart = () => {
    if (isSessionComplete || hasTodayWorklog) return;
    setIsRunning(true);
    setIsPaused(false);
    setStartTime(new Date());
  };

  const handlePause = () => setIsPaused(true);

  const logCurrentSession = async ({ silent } = { silent: false }) => {
    if (!startTime) return { logged: false };
    const endTime = new Date();
    const duration = Math.floor((endTime - startTime) / 1000);
    const email = localStorage.getItem("email") || "";
    
    // Calculate total idle time
    const totalIdleTimeMs = idleSegments.reduce((total, segment) => total + segment.duration, 0);
    const totalIdleTime = Math.floor(totalIdleTimeMs / 1000);
    
    try {
      await axios.post("http://localhost:5000/api/worklogs", {
        userId: localStorage.getItem("userId"),
        email,
        startTime,
        endTime,
        duration,
        idleSegments: idleSegments.map(segment => ({
          start: segment.start,
          end: segment.end,
          duration: Math.floor(segment.duration / 1000) // Convert to seconds
        }))
      });
      if (!silent) {
        const msg = `Work session logged for ${email} (${formatTime(
          duration
        )})`;
        setStopMessage(msg);
        window.alert(msg);
      }
      
      // Reset session and idle data
      setIsSessionComplete(true);
      setStartTime(null);
      setIsRunning(false);
      setIsPaused(false);
      setIdleSegments([]);
      setCurrentIdleStart(null);
      setTimeout(() => setStopMessage(""), 4000);
      return { logged: true };
    } catch (err) {
      if (!silent) setStopMessage("Failed to log work session");
      console.error("Log error:", err);
      return { logged: false, error: err };
    }
  };

  const handleStop = async () => {
    if (!window.confirm("Stop and log this work session?")) return;
    const result = await logCurrentSession({ silent: false });
    if (result?.logged) await fetchTodayLogs();
  };

  const handleLogout = async () => {
    const userId = localStorage.getItem("userId");
    if (userId) {
      try {
        await axios.post("http://localhost:5000/api/auth/logout", { userId });
      } catch {}
    }
    if (startTime) await logCurrentSession({ silent: true });
    localStorage.clear();
    navigate("/login");
  };

  // Generate Monthly Invoice
  const generateInvoice = async () => {
    try {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthName = new Date(0, currentMonth).toLocaleString('en', { month: 'long' });
      const userEmail = localStorage.getItem("email");
      const userId = localStorage.getItem("userId");
      
      // Fetch current month's worklogs
      const response = await axios.get("http://localhost:5000/api/worklogs");
      const allLogs = response.data.logs || [];
      
      // Filter logs for current month and user
      const monthlyLogs = allLogs.filter(log => {
        const logDate = new Date(log.startTime);
        return logDate.getMonth() === currentMonth && 
               logDate.getFullYear() === currentYear &&
               (log.userId === userId || log.email === userEmail);
      });
      
      if (monthlyLogs.length === 0) {
        alert("No work logs found for the current month!");
        return;
      }
      
      // Calculate totals
      const totalWorkTime = monthlyLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
      const totalIdleTime = monthlyLogs.reduce((sum, log) => sum + (log.totalIdleTime || 0), 0);
      const effectiveWorkTime = totalWorkTime - totalIdleTime;
      const totalSessions = monthlyLogs.length;
      const averageSessionTime = totalWorkTime / totalSessions;
      
      // Fetch employee details
      const employeeResponse = await axios.get("http://localhost:5000/api/auth/employees");
      const employees = employeeResponse.data.employees || [];
      const employee = employees.find(emp => emp._id === userId || emp.email === userEmail);
      const employeeName = employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : userEmail;
      const monthlySalaryAmount = employee?.salary || monthlySalary;
      
      // Use the existing monthly total earnings from the UI (which shows ₹10)
      const totalEarnings = monthlyTotalEarnings;
      
      // Create PDF with A4 dimensions and margins
      const doc = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 15;
      const contentWidth = pageWidth - (2 * margin);
      
      // Professional Header
      doc.setFillColor(41, 128, 185); // Professional blue
      doc.rect(0, 0, pageWidth, 45, 'F');
      
      // Company Logo Area (if you have a logo, you can add it here)
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('FlexiHours', margin, 20);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Work Management System', margin, 30);
      
      // Invoice Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('MONTHLY INVOICE', pageWidth - margin, 25, { align: 'right' });
      
      // Reset to default colors
      doc.setTextColor(51, 51, 51);
      let yPos = 60;
      
      // Invoice Information Section
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const invoiceDate = new Date().toLocaleDateString('en-IN');
      const invoiceNumber = `INV-${userId.slice(-6).toUpperCase()}-${String(currentMonth + 1).padStart(2, '0')}${currentYear}`;
      
      doc.text(`Invoice Date: ${invoiceDate}`, margin, yPos);
      doc.text(`Invoice Number: ${invoiceNumber}`, pageWidth - margin, yPos, { align: 'right' });
      yPos += 10;
      doc.text(`Period: ${monthName} ${currentYear}`, margin, yPos);
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, pageWidth - margin, yPos, { align: 'right' });
      yPos += 20;
      
      // Employee Information Table (better formatting)
      const employeeData = [
        ['Name', employeeName],
        ['Email', userEmail],
        ['Employee ID', userId.slice(-8).toUpperCase()],
        ['Monthly Salary', `₹${monthlySalaryAmount.toLocaleString('en-IN')}`]
      ];
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(41, 128, 185);
      doc.text('EMPLOYEE DETAILS', margin, yPos);
      
      autoTable(doc, {
        startY: yPos + 5,
        head: [['Field', 'Details']],
        body: employeeData,
        theme: 'grid',
        headStyles: { 
          fillColor: [41, 128, 185],
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold'
        },
        bodyStyles: { 
          fontSize: 9,
          textColor: [51, 51, 51]
        },
        columnStyles: { 
          0: { fontStyle: 'bold', cellWidth: 'auto' },
          1: { cellWidth: 'auto' }
        },
        margin: { left: margin, right: margin },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        tableWidth: 'auto'
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
      
      // Work Summary Table
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(41, 128, 185);
      doc.text('WORK PERFORMANCE SUMMARY', margin, yPos);
      yPos += 5;
      
      const summaryData = [
        ['Total Work Sessions', totalSessions.toString()],
        ['Total Work Time', `${Math.floor(totalWorkTime / 3600)}h ${Math.floor((totalWorkTime % 3600) / 60)}m`],
        ['Total Idle Time', `${Math.floor(totalIdleTime / 3600)}h ${Math.floor((totalIdleTime % 3600) / 60)}m`],
        ['Effective Work Time', `${Math.floor(effectiveWorkTime / 3600)}h ${Math.floor((effectiveWorkTime % 3600) / 60)}m`],
        ['Average Session', `${Math.floor(averageSessionTime / 3600)}h ${Math.floor((averageSessionTime % 3600) / 60)}m`],
        ['Work Efficiency', `${totalWorkTime > 0 ? ((effectiveWorkTime / totalWorkTime) * 100).toFixed(1) : 0}%`],
        ['Daily Rate', `₹${(monthlySalaryAmount / 30).toLocaleString('en-IN', {maximumFractionDigits: 2})}`],
        ['Hourly Rate', `₹${((monthlySalaryAmount / 30) / 8).toLocaleString('en-IN', {maximumFractionDigits: 2})}`]
      ];
      
      autoTable(doc, {
        startY: yPos + 5,
        head: [['Performance Metric', 'Value']],
        body: summaryData,
        theme: 'grid',
        headStyles: { 
          fillColor: [41, 128, 185],
          textColor: 255,
          fontSize: 11,
          fontStyle: 'bold',
          halign: 'left'
        },
        bodyStyles: { 
          fontSize: 10,
          textColor: [51, 51, 51]
        },
        columnStyles: { 
          0: { fontStyle: 'bold', cellWidth: 'auto' },
          1: { halign: 'center', cellWidth: 'auto' }
        },
        margin: { left: margin, right: margin },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        tableWidth: 'auto'
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
      
      // Detailed Work Sessions (if space allows)
      if (yPos < pageHeight - 80 && monthlyLogs.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(41, 128, 185);
        doc.text('DETAILED WORK SESSIONS', margin, yPos);
        yPos += 5;
        
        // Sort logs by date (most recent first) and limit
        const sortedLogs = monthlyLogs
          .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
          .slice(0, 15); // Show up to 15 recent entries
        
        const logData = sortedLogs.map((log, index) => {
          const sessionDuration = log.duration || 0;
          const sessionIdleTime = log.totalIdleTime || 0;
          const roundedMinutes = Math.round(sessionDuration / 60 / 5) * 5;
          const sessionDailyRate = monthlySalaryAmount / 30;
          const sessionEarnings = (roundedMinutes / (8 * 60)) * sessionDailyRate;
          const cappedEarnings = Math.min(sessionEarnings, sessionDailyRate);
          
          return [
            new Date(log.startTime).toLocaleDateString('en-IN'),
            new Date(log.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
            log.endTime ? new Date(log.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Ongoing',
            `${Math.floor(sessionDuration / 60)}min`,
            `${Math.floor(sessionIdleTime / 60)}min`,
            `₹${cappedEarnings.toFixed(0)}`
          ];
        });
        
        autoTable(doc, {
          startY: yPos + 5,
          head: [['Date', 'Start Time', 'End Time', 'Duration', 'Idle', 'Earnings']],
          body: logData,
          theme: 'striped',
          headStyles: { 
            fillColor: [52, 152, 219],
            textColor: 255,
            fontSize: 9,
            fontStyle: 'bold'
          },
          bodyStyles: { 
            fontSize: 8,
            textColor: [51, 51, 51]
          },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 30 },
            2: { cellWidth: 30 },
            3: { cellWidth: 25, halign: 'center' },
            4: { cellWidth: 25, halign: 'center' },
            5: { cellWidth: 30, halign: 'right' }
          },
          margin: { left: margin, right: margin },
          alternateRowStyles: { fillColor: [252, 252, 252] }
        });
        
        yPos = doc.lastAutoTable.finalY;
      }
      
      // Earnings Summary Box (always at bottom)
      const earningsBoxHeight = 25;
      const earningsY = pageHeight - 40;
      
      doc.setFillColor(46, 204, 113); // Green background
      doc.rect(margin, earningsY - 5, contentWidth, earningsBoxHeight, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL MONTHLY EARNINGS', margin + 5, earningsY + 5);
      doc.text(`₹${Math.round(totalEarnings).toLocaleString('en-IN')}`, pageWidth - margin - 5, earningsY + 5, { align: 'right' });
      
      // Footer
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text('This is a computer-generated invoice from FlexiHours Work Management System', pageWidth/2, pageHeight - 10, { align: 'center' });
      
      // Save with professional filename
      const fileName = `FlexiHours_Invoice_${employeeName.replace(/\s+/g, '_')}_${monthName}_${currentYear}.pdf`;
      doc.save(fileName);
      
      alert(`✅ Professional Invoice Generated!\n\nFile: ${fileName}\nTotal Earnings: ₹${Math.round(totalEarnings).toLocaleString('en-IN')}\nSessions: ${totalSessions}`);
      
    } catch (error) {
      console.error("Error generating invoice:", error);
      alert("❌ Failed to generate invoice. Please check console for details.");
    }
  };

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, "0");
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h2>FlexiHours</h2>
        <ul>
          <li
            className={activeSection === "tasks" ? "active" : ""}
            onClick={() => setActiveSection("tasks")}
          >
            My Tasks
          </li>
          <li
            className={activeSection === "earnings" ? "active" : ""}
            onClick={() => setActiveSection("earnings")}
          >
            Total Earnings
          </li>
          <li
            className={activeSection === "myworklogs" ? "active" : ""}
            onClick={() => setActiveSection("myworklogs")}
          >
            My Worklogs
          </li>
          <li
            className={activeSection === "about" ? "active" : ""}
            onClick={() => setActiveSection("about")}
          >
            About Us
          </li>
          <li onClick={handleLogout}>Logout</li>
        </ul>
      </div>

      <div className="main-content">
        {showIdlePopup && (
          <div style={{position:'fixed', bottom:'20px', right:'20px', background:'#fff3cd', border:'1px solid #ffe58f', padding:'14px 18px', borderRadius:'10px', boxShadow:'0 8px 24px rgba(0,0,0,0.12)', maxWidth:'320px', zIndex:1500}}>
            <div style={{fontWeight:600, marginBottom:'6px', color:'#614700'}}>Inactivity Detected</div>
            <div style={{fontSize:'0.9rem', lineHeight:1.4, marginBottom:'10px'}}>Timer paused after 30s of no activity. Resume to continue tracking.</div>
            <div style={{display:'flex', gap:'8px', justifyContent:'flex-end'}}>
              <button onClick={handleDismissIdle} style={{background:'transparent', border:'none', color:'#614700', cursor:'pointer', fontSize:'0.85rem'}}>Dismiss</button>
              <button onClick={handleResumeAfterIdle} style={{background:'#27ae60', color:'#fff', border:'none', borderRadius:'6px', padding:'6px 12px', cursor:'pointer', fontSize:'0.85rem'}}>Resume</button>
            </div>
          </div>
        )}
        <nav className="navbar">
          <div className="navbar-left" />
          <div className="navbar-right">
            <div className="timer-card profile-size">
              <div className="timer-display">{formatTime(time)}</div>
              <div className="button-group">
                <button
                  className="btn start"
                  onClick={handleStart}
                  disabled={isSessionComplete || hasTodayWorklog}
                >
                  Start
                </button>
                <button className="btn pause" onClick={handlePause}>
                  Pause
                </button>
                <button className="btn stop" onClick={handleStop}>
                  Stop
                </button>
              </div>
            </div>
            <div className="profile-wrapper" ref={dropdownRef}>
              <div
                className="profile-circle"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <img src="user.png" alt="Profile" />
              </div>
              {showDropdown && (
                <div className="profile-dropdown">
                  <div className="profile-email">
                    Your Email: {userEmail}
                  </div>
                  <button className="btn logout" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* ===== Tasks Section ===== */}
        {activeSection === "tasks" && (
          <div className="welcome-card">
            <h1>Welcome back!</h1>
            <p>Track your tasks and working hours easily.</p>
            <div className="my-tasks-section mt-4">
              <h2>My Tasks</h2>
              {myTasks.length === 0 ? (
                <p>No tasks assigned to you yet.</p>
              ) : (
                <div className="list-group">
                  {myTasks.map((task) => (
                    <div
                      className="list-group-item"
                      key={task._id}
                      style={{ marginBottom: "2rem" }}
                    >
                      <div>
                        <strong>Task:</strong> {task.description}
                      </div>
                      <div>
                        <strong>Assigned By:</strong>{" "}
                        {task.assignedBy?.firstName}{" "}
                        {task.assignedBy?.lastName} (
                        {task.assignedBy?.email})
                      </div>
                      <div>
                        <small>
                          {new Date(task.createdAt).toLocaleString()}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== Earnings Section ===== */}
        {activeSection === "earnings" && (
          <div className="welcome-card">
            <h1>Today’s Earnings</h1>
            {hasTodayWorklog && (
              <div
                style={{
                  background: "#fffbe6",
                  border: "1px solid #ffe58f",
                  color: "#614700",
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  marginTop: "0.5rem",
                }}
              >
                A worklog exists for today. Start is disabled and earnings
                reflect the saved session.
              </div>
            )}

            <div
              className="todays-earnings mt-4"
              style={{
                background: "#fff",
                borderRadius: "16px",
                boxShadow: "0 6px 20px rgba(44,62,80,0.08)",
                padding: "1.5rem 2rem",
                margin: "1.5rem auto",
                maxWidth: "900px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <strong>Monthly Salary:</strong> ₹{monthlySalary || 0}
                </div>
                <div>
                  <strong>Daily Rate:</strong> ₹{dailyRate.toFixed(0)}
                </div>
                <div>
                  <strong>Worked (rounded):</strong> {roundedMinutes} min
                </div>
                <div>
                  <strong>Earning Today:</strong> ₹{Math.round(todaysEarning)}
                </div>
                <div>
                  <strong>Total This Month:</strong> ₹{Math.round(monthlyTotalEarnings)}
                </div>
              </div>
            </div>

            {todayLogs.length > 0 && (
              <div
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  padding: "1rem",
                  marginTop: "1rem",
                }}
              >
                <h3>Today’s Work Sessions</h3>
                <table style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Start</th>
                      <th>End</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayLogs.map((log, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{new Date(log.startTime).toLocaleTimeString()}</td>
                        <td>{new Date(log.endTime).toLocaleTimeString()}</td>
                        <td>{formatTime(Number(log.duration) || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))",
                gap: "1.25rem",
                marginTop: "1rem",
              }}
            >
              <div style={{ background: "#fff", borderRadius: "12px", padding: "1rem" }}>
                <h3>Daily Progress</h3>
                <Doughnut
                  data={{
                    labels: ["Earned", "Remaining"],
                    datasets: [
                      {
                        data: [
                          Math.round(todaysEarning),
                          Math.max(0, Math.round(dailyRate - todaysEarning)),
                        ],
                        backgroundColor: ["#27ae60", "#ecf0f1"],
                      },
                    ],
                  }}
                  options={{ plugins: { legend: { position: "bottom" } } }}
                />
              </div>
              <div style={{ background: "#fff", borderRadius: "12px", padding: "1rem" }}>
                <h3>Salary Overview</h3>
                <Bar
                  data={{
                    labels: ["Monthly", "Daily", "Today"],
                    datasets: [
                      {
                        label: "₹",
                        data: [
                          Math.round(monthlySalary),
                          Math.round(dailyRate),
                          Math.round(todaysEarning),
                        ],
                        backgroundColor: ["#2980b9", "#8e44ad", "#27ae60"],
                        borderRadius: 6,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } },
                  }}
                  height={220}
                />
              </div>
            </div>

            {/* Monthly Earnings Chart */}
            <div style={{ 
              background: '#fff', 
              borderRadius: '12px', 
              padding: '1.5rem',
              marginTop: '1.5rem',
              gridColumn: '1 / -1'
            }}>
              <h3 style={{marginBottom: '1rem'}}>Monthly Earnings Overview</h3>
              <div style={{height: '300px'}}>
                <Bar
                  data={{
                    labels: monthlyEarnings.map(item => item.month),
                    datasets: [{
                      label: 'Monthly Earnings (₹)',
                      data: monthlyEarnings.map(item => Math.round(item.amount)),
                      backgroundColor: '#3498db',
                      borderRadius: 6,
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'top' },
                      title: {
                        display: true,
                        text: 'Year 2025 Earnings Distribution'
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: value => '₹' + value.toLocaleString()
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Generate Invoice Button */}
            <div style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '1.5rem',
              marginTop: '1.5rem',
              textAlign: 'center'
            }}>
              <h3 style={{ marginBottom: '1rem', color: '#2c3e50' }}>Monthly Invoice</h3>
              <p style={{ 
                marginBottom: '1.5rem', 
                color: '#7f8c8d',
                fontSize: '0.95rem' 
              }}>
                Generate a detailed PDF invoice for current month's work hours, idle time, and earnings
              </p>
              <button
                onClick={generateInvoice}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  padding: '12px 30px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                  transition: 'all 0.3s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
                }}
              >
                📄 Generate Invoice
              </button>
            </div>
          </div>
        )}

        {/* ===== My Worklogs Section ===== */}
        {activeSection === 'myworklogs' && (
          <div className="welcome-card">
            <h1>My Worklogs</h1>
            <p>All recorded sessions linked to your account.</p>
            {isLoadingWorklogs ? (
              <p>Loading worklogs...</p>
            ) : allMyWorklogs.length === 0 ? (
              <p>No worklogs found.</p>
            ) : (
              <div style={{marginTop: '1rem', background:'#fff', borderRadius:'12px', padding:'1rem'}}>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%', borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{background:'#f8f9fa'}}>
                        <th style={{padding:'10px', textAlign:'left', borderBottom:'2px solid #eaecef'}}>Date</th>
                        <th style={{padding:'10px', textAlign:'left', borderBottom:'2px solid #eaecef'}}>Start Time</th>
                        <th style={{padding:'10px', textAlign:'left', borderBottom:'2px solid #eaecef'}}>End Time</th>
                        <th style={{padding:'10px', textAlign:'left', borderBottom:'2px solid #eaecef'}}>Duration</th>
                        <th style={{padding:'10px', textAlign:'left', borderBottom:'2px solid #eaecef'}}>Rounded (min)</th>
                        <th style={{padding:'10px', textAlign:'left', borderBottom:'2px solid #eaecef'}}>Earnings (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allMyWorklogs.map((log, idx) => {
                        const minutesRounded = Math.ceil((Number(log.duration || 0)/60)/5)*5;
                        const perMinute = dailyRate > 0 ? dailyRate/(8*60) : 0;
                        const earnings = Math.min(dailyRate, perMinute * minutesRounded);
                        return (
                          <tr key={log._id || idx} style={{borderBottom:'1px solid #eee'}}>
                            <td style={{padding:'8px'}}>{formatDisplayDate(log.date)}</td>
                            <td style={{padding:'8px'}}>{new Date(log.startTime).toLocaleTimeString()}</td>
                            <td style={{padding:'8px'}}>{new Date(log.endTime).toLocaleTimeString()}</td>
                            <td style={{padding:'8px'}}>{formatTime(Number(log.duration)||0)}</td>
                            <td style={{padding:'8px'}}>{minutesRounded}</td>
                            <td style={{padding:'8px'}}>₹{Math.round(earnings)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{marginTop:'0.75rem', fontSize:'0.9rem', color:'#555'}}>
                  Showing {allMyWorklogs.length} worklog{allMyWorklogs.length !== 1 && 's'}.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== About Section ===== */}
        {activeSection === "about" && (
          <div className="welcome-card">
            <h1>About FlexiHours</h1>
            <p>
              FlexiHours helps teams track work time, assign tasks, and calculate
              fair earnings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
