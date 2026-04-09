# 📸 Smart Attendance Management System

### React + Express + Supabase + Face Recognition (Model Server)

---

## 🚀 Project Overview

This project is a **Smart Attendance Management System** designed to automate and secure attendance tracking using:

* 👤 Role-based dashboards (Admin & Employee)
* 🌐 REST APIs (Express backend)
* ☁️ Supabase (Database & Auth)
* 🧠 Face Recognition (Model Server)
* 📊 Real-time attendance management

---

## 🧱 Architecture Overview

```
Frontend (React)
   ├── Admin Panel (adminview)
   └── Employee Panel (empview)

Backend (Express + Supabase)
   └── REST APIs + Authentication

Model Server (Python)
   └── Face Recognition & ML Models
```

---

## 📁 Project Structure

```
.
├── adminview/            # React Admin Dashboard
├── empview/              # React Employee Dashboard
├── backend/              # Express Backend API
└── modelserver/          # Python ML Server (Face Recognition)
```

---

## 🖥️ Frontend

### 🔹 `adminview/`

Admin dashboard for managing:

* Employees
* Departments
* Attendance corrections
* Leaves, holidays, shifts

**Tech Used:**

* React (Vite)
* Tailwind
* Component-based architecture

---

### 🔹 `empview/`

Employee dashboard for:

* Viewing attendance
* Applying leaves
* Notifications
* Real-time updates (Socket)

**Tech Used:**

* React (Vite)
* Custom hooks
* Modular structure

---

## ⚙️ Backend (`backend/`)

Built using **Node.js + Express + Supabase**

### 📂 Key Folders

#### 🔹 `configs/`

* `supabase.js` → Supabase connection
* `passport.js` → Authentication strategy
* `mail.js` → Email configuration

#### 🔹 `controllers/`

Business logic:

* `Admin.js`
* `Employee.js`

#### 🔹 `routes/`

Handles API endpoints:

* `admin.js`
* `auth.js`
* `employee.js`
* attendance, leaves, shifts, etc.

#### 🔹 `middleware/`

* `auth.js` → JWT/Auth middleware

#### 🔹 Prisma

* `schema.prisma` → DB schema
* `prisma.js` → DB client

---

## 🧠 Model Server (`modelserver/`)

Handles **Face Recognition & ML processing**

### 📂 Contents

* `manage.py` → Main entry point

* `download_models.py` → Downloads ML models

* `check_system.py` → System validation

* `models/` → Pretrained face recognition models:

  * `dlib_face_recognition_resnet_model_v1.dat`
  * `shape_predictor_68_face_landmarks.dat`

* `user_encodings.json` → Stored face embeddings

---

## 🔧 Setup Instructions

---

### 1️⃣ Clone the repository

```bash
git clone <your-repo-url>
cd project-root
```

---

### 2️⃣ Backend Setup

```bash
cd backend
npm install
npm run dev
```

Create `.env`:

```
SUPABASE_URL=your_url
SUPABASE_KEY=your_key
JWT_SECRET=your_secret
```

---

### 3️⃣ Admin Frontend

```bash
cd adminview
npm install
npm run dev
```

---

### 4️⃣ Employee Frontend

```bash
cd empview
npm install
npm run dev
```

---

### 5️⃣ Model Server (Python)

```bash
cd modelserver
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
python manage.py
```

---

## 🔗 Key Features

### 👨‍💼 Admin Panel

* Manage employees & departments
* Approve/reject attendance corrections
* Schedule shifts & holidays

### 👨‍💻 Employee Panel

* Mark attendance
* Apply leaves
* View schedules & notifications

### 🧠 Face Recognition

* Detect and encode faces
* Compare with stored embeddings
* Prevent spoofing (future enhancement)

---


## 🏁 Conclusion

This project combines **modern web development + machine learning** to create a scalable and secure attendance system suitable for real-world organizational use.

---
