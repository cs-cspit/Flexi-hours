# FlexiHours

## Overview
This project is a **role-based Employee Task & Management System** built to efficiently manage tasks, working hours, and salary calculations for employees working from Home or working after Office Hours, seniors Who Assign task to Junior Developers working on Project , and administrators Who Handles All the Hierarchy of System. The system provides dashboards, notifications, and reporting features tailored to each user role.

---

## Features

### 1. User Authentication
- **Login / Registration**:
  - Users can register and log in to the system.
  - Role-based access: Employee, Senior, Admin.

---

### 2. Role-Based Dashboard
- **Employee**:
  - View tasks assigned.
  - Access task timer and track working hours.
  - Submit task progress.

- **Senior**:
  - Assign tasks to employees.
  - Monitor employee progress and hours worked.

- **Admin**:
  - Full access to all employees and seniors.
  - Generate salary based on hours worked.
  - View reports and trends (productivity, hours, payments).

---

### 3. Employee Module
- **Start Task / Timer**: Tracks working hours in real-time.
- **Pause / Stop Timer**: Auto-updates hours worked.
- **Submit Task / Progress**: Sends completed task or progress report for review.
- **Request Leave**: Sends leave request to Senior/Admin for approval.

---

### 4. Senior Module
- **Assign Tasks**: Allocate tasks to employees.
- **View Progress**: Monitor task status and hours worked.
---

### 5. Admin Module
- **View All Employees & Seniors**: Overview of all users.
- **Generate Salary**: Automatically calculate salary based on hours worked.
- **Reports & Trends**: Generate productivity, hours worked, and payment trends.

---

### 6. Notifications System
- Alerts for:
  - New task assignments.
  - Approvals / Rejections.
  - Salary updates.

---

### 7. Payment Calculation
- **Auto Salary Calculation**:
  - Formula: `Salary = Hourly Rate × Hours Worked`
- **Payment Approvals**:
  - Admin can approve or reject salary payments.

---

### 8. Reports Module
- Revenue, productivity, and hours worked analysis.
- Graphical trends to monitor employee performance.

---

### 9. Logout
- Secure logout for all users to ensure data safety.

---

## Technology Stack
- **Frontend**: React.js / Bootstrap CSS
- **Backend**: Node.js / Express.js 
- **Database**: MongoDB / SQL (based on implementation)
- **Notifications**: Real-time alerts using WebSockets or push notifications


---


