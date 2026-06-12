# VAPT Task Tracker

**VAPT Task Tracker** is a professional web application for managing Vulnerability Assessment and Penetration Testing (VAPT) operations within an organization. It helps security teams track findings, manage projects, assign tasks, generate reports, and monitor security posture — all from a single platform with role-based access control.

---

## Why Use VAPT Task Tracker?

Security assessments generate a lot of data — vulnerabilities, remediation tasks, project timelines, team assignments, and client reports. Managing this manually across spreadsheets and emails is error-prone and slow.

This platform solves those problems by giving you:

- **Centralized finding management** — Log, track, and score vulnerabilities with CVSS, all in one place
- **Role-based team workflows** — Distinct roles for analysts, project managers, developers, and business stakeholders with granular permissions
- **Real-time dashboards** — Live analytics on vulnerability trends, SLA compliance, team performance, and project health
- **Automated report generation** — Generate executive summaries and detailed technical reports from findings data
- **Full audit trail** — Every action is logged for compliance and accountability
- **SLA tracking** — Automatic overdue alerts for tasks and findings that exceed deadlines
- **Mobile-responsive** — Works on desktop, tablet, and phone

---

## Features

- JWT-based authentication with RBAC (5 roles: Admin, VAPT Analyst, Project Manager, Developer, Business Analyst)
- Project management with team assignment
- Vulnerability/Finding tracking with CVSS scoring
- Report generation and file uploads
- Timeline/Milestone tracking
- Real-time analytics dashboard
- User management
- In-app notifications
- Comprehensive audit logging
- SLA tracking and overdue alerts
- Mobile-responsive design

## Tech Stack

- **Backend:** Node.js + Express + MongoDB
- **Frontend:** React 18, Material-UI, Recharts

## Quick Start

```bash
# Backend
cd backend
cp .env.example .env   # Edit .env with your config
npm install
npm start

# Frontend
cd frontend
cp .env.example .env
npm install
npm start
```

Or use the setup script for production deployment:

```bash
sudo ./setup.sh
```

## ⚠️ Important: Sanitization Notice

This repository is a **sanitized public version** of an internal project. Before using, please replace all placeholder values with your own configuration:

### What to change:

| Placeholder | Where | Replace with |
|-------------|-------|-------------|
| `admin@example.com` | `.env.example`, `frontend/src/pages/Users.js`, `frontend/src/components/Layout.js`, `frontend/src/context/AuthContext.js` | Your admin email |
| `support@example.com` | `frontend/src/pages/SupportList.js`, `backend/src/config/swagger.js` | Your support email |
| `noreply@example.com` | `backend/src/config/smtp.js`, `.env.production.example` | Your noreply email |
| `CHANGE_SUPER_ADMIN_PASSWORD` | `.env.example`, `start.sh`, `setup.sh`, `deployment_report.md` | A strong password |
| `CHANGE_MONGO_PASSWORD` | `setup.sh` | A strong MongoDB password |
| `CHANGE_TEST_PASSWORD` | `deployment_report.md` | Test account password |
| `CHANGE_THIS_TO_A_RANDOM_SECRET` | `backend/.env.example` | `openssl rand -hex 64` |
| `CHANGE_THIS_TO_ANOTHER_RANDOM_SECRET` | `backend/.env.example` | `openssl rand -hex 64` |
| `yourcompany` / `youruser` | `backend/src/models/sql.js`, `setup.sh` | Your organization name |
| `your-domain.com` | `.env.example` (FRONTEND_URL) | Your actual domain/IP |
| `Your Name` / `Team Member` | `frontend/src/pages/SupportList.js` | Your support team names |

### Additionally:
- **Storage files:** `storage/` directory contains empty placeholder directories. Delete any existing runtime data before pushing.
- **Logs:** Ensure no `.log` files are committed (already in `.gitignore`)
- **SSL Certs:** Remove any `*.crt` or `*.pem` files — they are excluded by `.gitignore`
- **Secrets:** Generate new `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, and `COOKIE_SECRET` using `openssl rand -hex 64`
- **Report PDFs:** Remove any PDF files in `storage/reports/` (already in `.gitignore` but double-check)

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── app.js              # Express app entry
│   │   ├── config/             # DB, SMTP, Swagger config
│   │   ├── controllers/        # Route handlers
│   │   ├── middleware/         # Auth, validation, error handling
│   │   ├── models/            # Mongoose schemas
│   │   ├── routes/            # API route definitions
│   │   ├── services/          # Business logic
│   │   └── utils/             # JWT, RBAC, helpers
│   ├── templates/             # Report EJS templates
│   └── tests/                 # Unit + integration tests
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page views
│   │   ├── context/           # React context providers
│   │   ├── services/          # API service layer
│   │   └── theme/             # MUI theme customization
│   └── public/                # Static assets
├── setup.sh                   # Automated production setup
├── start.sh                   # Start script
├── stop.sh                    # Stop script
└── backup.sh                  # Backup script
```
