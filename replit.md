# Workspace

## Overview

SaaS HR Workforce Management Platform — multi-tenant architecture supporting 1000+ companies simultaneously. Built with React + Vite frontend and Express backend.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: express-session (HTTP-only cookies)
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── hr-platform/        # React HR Platform frontend (/)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package
```

## HR Platform Features

- **Multi-tenant**: Each company has its own isolated data workspace
- **QR Attendance + Face Recognition**: Camera-based QR scanning + selfie/DeepFace for check-in/check-out
- **Real-time Dashboard**: Live attendance stats, today's check-ins
- **Employee Management**: Add/edit/delete with QR code generation + employment types (informal/official/contract)
- **Branches**: Multi-branch/office management with employee assignment
- **Schedules**: Per-employee weekly shift scheduling with branch and time
- **Payroll Calculation**: Hourly/monthly/daily/piecerate salary types + bonus, penalty, sales bonus
- **POS Sales Integration**: Import sales records from POS systems, track per employee/branch
- **Attendance Reports**: Monthly summaries per employee
- **Device Management**: Register and manage QR scanner devices
- **AI Analytics**: HR Risk Detector, AI hiring recommendations, Business KPIs (Sales/Employee, Labor Cost %, Revenue/Hour, Attendance Rate)
- **Telegram Bot**: Employee attendance via Telegram, /myid command, Telegram QR setup
- **Government Integration**: SOLIQ/INPS XML export, JSHSHIR management
- **CV Monitor**: Real-time camera monitoring with employee presence dashboard
- **Multi-language**: Uzbek (UZ), Russian (RU), English (EN)
- **Authentication**: Session-based auth with HTTP-only cookies, role-based access (admin/accountant/hr/viewer/observer)
- **Super Admin**: Platform admin at /platform-admin/login with company management, tariff plans

## Database Schema

Tables: `companies`, `admins`, `employees`, `devices`, `attendance`, `payroll`, `departments`, `branches`, `schedules`, `sales`, `leave_requests`, `advance_requests`, `audit_log`, `employee_activity`, `company_shifts`

## Key Routes (all under /api)

- `GET/POST/PUT/DELETE /branches` — Branch management
- `GET/POST/DELETE /schedules` — Employee shift scheduling; POST /schedules/bulk replaces all schedules for an employee
- `GET /sales` — List sales records; `POST /sales/import` — Import single sale; `POST /sales/bulk-import` — Import batch; `GET /sales/kpi` — Monthly KPIs (revenuePerEmployee, byBranch, byEmployee)

- `POST /auth/login` — Company admin login
- `POST /auth/register` — Register new company
- `GET /auth/me` — Get current session
- `POST /auth/logout` — Logout
- `GET /companies/me` — Get company info
- `GET /companies/stats` — Dashboard statistics
- `GET/POST /employees` — List/create employees
- `GET/PUT/DELETE /employees/:id` — Single employee CRUD
- `GET /employees/:id/qr` — Get employee QR code
- `POST /attendance/scan` — Process QR scan (check-in/out)
- `GET /attendance` — List attendance records
- `GET /attendance/today` — Today's attendance
- `GET/POST /devices` — List/create scanner devices
- `GET /payroll` — List payroll records (includes netSalary, bonusAmount, deductions, totalPieces)
- `POST /payroll/calculate` — Calculate payroll for month (supports daily/piecerate salary types)
- `PATCH /payroll/:id/pieces` — Update piece count, bonus, deductions for piecerate employees
- `GET /export/payroll?format=1c|bitrix|uzasbo|excel` — Export payroll in various formats
- `GET /export/attendance` — Export attendance as CSV
- `PATCH /settings/salary-visibility` — Toggle salary visibility for employees
- `GET /reports/attendance-summary` — Monthly attendance report

## Development

- `pnpm --filter @workspace/api-server run dev` — Run API server
- `pnpm --filter @workspace/hr-platform run dev` — Run frontend
- `pnpm --filter @workspace/db run push` — Push DB migrations
- `pnpm --filter @workspace/api-spec run codegen` — Regenerate API client

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — Express session secret
- `PORT` — Server port (auto-assigned)
