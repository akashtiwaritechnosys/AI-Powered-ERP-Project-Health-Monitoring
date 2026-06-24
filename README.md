# AI-Powered ERP Project Health Monitoring Platform

An intelligent middleware and Next.js dashboard built to sync project and task schedules from ERPNext, evaluate health statuses based on custom rule weights, generate AI explanations/recommendations (Gemini & OpenAI), and dispatch warning/critical notifications to stakeholders.

---

## 🚀 Quick Start (Local Setup)

To run the complete platform (backend + frontend) concurrently, follow these steps:

### 1. Install Dependencies
Open your terminal in the project root folder and run:
```bash
npm install
npm run install:all
```
*This installs the root dev runner (`concurrently`), then automatically installs all backend node dependencies (Express, Prisma, Nodemailer) and frontend dependencies (Next.js, React).*

### 2. Configure Environment Variables
* **Backend**: Open `backend/.env` and verify the ERP credentials are set:
  ```env
  PORT=5000
  DATABASE_URL="file:./dev.db"
  AI_PROVIDER="gemini" # or "openai"
  GEMINI_API_KEY="your-gemini-api-key-here"
  ERPNEXT_API_KEY="d296ff153c0517b"
  ERPNEXT_API_SECRET="59a2b3e39ff8ebd"
  ERPNEXT_BASE_URL="https://bizcentraldemo.biztechnosys.in"
  ```
  *(If Gemini API key is left blank, a fallback simulated AI engine runs so the POC works immediately).*

### 3. Initialize the SQLite Database
Run the following in the project root:
```bash
cd backend
npx prisma db push
cd ..
```
*This generates the Prisma Client and initializes the local SQLite database file `backend/prisma/dev.db`.*

### 4. Run Both Servers Concurrently
Run this single command in the project root:
```bash
npm run dev
```
*This starts the **Express Backend** on port `5000` and the **Next.js Frontend** on port `3001` (or `3000` if available) at the same time.*

---

## 📈 Verification
1. Open **[http://localhost:3001](http://localhost:3001)** (or check the terminal output for the exact frontend port) in your browser.
2. The projects grid will load your 4 live ERPNext projects.
3. Click the **"AI Insights"** button on any card to view detailed task timelines, critical path indicators, and AI suggestions.
4. Go to **Settings** to customize threshold margins, SMTP emails, or modify the health weights to re-calculate project scores.
