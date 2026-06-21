# CampusKrafts - BRAC University Admission Preparation Platform

CampusKrafts is a comprehensive, MERN-inspired web application designed exclusively for BRAC University admission prep. It features specialized portals for Students, Instructors, and Administrators, an interactive timed exam player, an architectural drawing pad, bKash payment simulation, and a course-specific Q&A forum.

---

## 🚀 Quick Start Instructions

This platform is structured with a Node.js Express backend and a clean vanilla HTML/CSS/JS frontend.

### 1. Install Dependencies
Open your terminal in the `backend` folder and install NPM packages:
```bash
cd backend
npm install
```

### 2. Configure Environment variables
The backend includes a `.env` file containing configuration keys. By default, it is preconfigured to run with **SQLite** (`database.sqlite`) out of the box so you can start testing immediately without installing any databases.

If you wish to switch to **MySQL**, configure your database connection inside `backend/.env`:
```env
DB_DIALECT=mysql
DB_NAME=campuskrafts
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_HOST=localhost
DB_PORT=3306
```
*(Ensure a database named `campuskrafts` exists in your MySQL instance before starting the server).*

### 3. Run the platform
Start the backend server in development mode:
```bash
npm run dev
```
For production launch, execute:
```bash
npm start
```

Once the server prints `CampusKrafts Server listening on port 5000`, open your web browser and navigate to:
👉 **[http://localhost:5000/](http://localhost:5000/)**

The backend serves the frontend static directory automatically.

---

## 🔑 Pre-Seeded Testing Accounts

Upon its first run, the platform detects an empty database and automatically seeds initial accounts, mock courses, and MCQ questions. Use these details to log in to the various portals:

| Portal | Email | Password | Role Description |
| :--- | :--- | :--- | :--- |
| **Admin Portal** | `admin@campuskrafts.com` | `AdminPass123` | Total control over courses, user lists, homepage content, FAQs, news, and financials. |
| **Instructor Portal** | `instructor@campuskrafts.com` | `InstructorPass123` | Create courses, upload study files/videos, schedule live classes, write exam questions, view student scores. |
| **Student Portal** | `student@campuskrafts.com` | `StudentPass123` | Take free mock tests, purchase courses with bKash, review solutions, see weak topics recommendations, chat with teachers. |

---

## 💎 Features Walkthrough

### 1. Landing Page
- Welcomes user to **CampusKrafts**.
- Explains the BRAC University admission layout: 6 sections (**Section A** to **Section F**).
- Displays active course prep programs (dynamically loaded).
- Hosts admission news updates and FAQ accordions.
- Lets users try **4 free starter tests** (English language, Mathematics, Higher Math & Physics, Biology & Chemistry).

### 2. Email OTP Signups
- New users can register for their account.
- Signups trigger a verification code.
- **For Testing Convenience**: If you have not filled in SMTP credentials in `.env`, the generated 6-digit OTP code is **printed directly to your backend terminal console**. Copy this code to verify the account and log in.

### 3. Timed Exam Player
- Access free mock tests or premium course exams.
- The player locks user on a timed screen with a countdown timer.
- Auto-submits if time hits zero.
- Auto-grades on submission and displays results: score percentage, correct answer key, and detailed solution explanations.
- **Weak-Topic Identification**: If a student scores less than 60% in any specific exam section, that section is flagged. Personalized recommendations are posted on their dashboard overview instructing them which worksheets to review!

### 4. Architecture Drawing Pad
- Located under the student testing center.
- Provides a white interactive HTML5 canvas draw pad where prospective architecture students can sketch perspective sheets, download their designs as PNG files, or reset the board.

### 5. bKash Gateway Simulation
- Premium course tracks cost BDT. Students click "Enroll with bKash" inside their dashboard.
- Opens a branded simulated check-out modal. Selects batch type (Online vs Live) and inputs a transaction ID.
- Verification is processed instantly for testing convenience, activating enrollment and listing it in their history.

### 6. Interactive Forums & Inbox Q&A
- Student and instructor dashboards feature message forums. Create new topics, answer threads, or open comments.
- **Consultation Inbox**: Students click the direct consultation box to message their instructor privately. Instructors see student threads in their Inbox and reply to clear doubts.
