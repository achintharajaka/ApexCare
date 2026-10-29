# ApexCare Hospital Management System (HMS)

> A mission-critical, enterprise-grade Hospital Management System engineered to orchestrate clinical Electronic Medical Records (EMR), appointment scheduling, diagnostic laboratory testing, pharmacy inventory, and billing operations under strict healthcare data governance and performance standards.

---

## 🏥 Live System Architecture

The application is structured into a modern full-stack architecture matching `Instructions.MD` and `Design.md`:

```
ApexCare/
├── backend/
│   ├── src/
│   │   ├── config/ (Zod-validated environment config)
│   │   ├── middleware/ (Helmet CSP, Origin/Anti-CSRF, Tenant Scoping, Rate Limiting, File Inspection)
│   │   ├── modules/ (auth, dashboard, patients, emr, appointments, laboratory, pharmacy, billing, staff, reports, audit)
│   │   ├── db/ (schema.prisma, seed.ts, migrations/rls.sql, store.ts)
│   │   └── utils/ (DOMPurify anti-XSS, Zod schemas)
│   └── tests/load/k6-test.js
├── frontend/
│   ├── src/
│   │   ├── assets/stitch-export/ (Google Stitch visual prototypes & assets)
│   │   ├── components/
│   │   │   ├── common/ (ApexCareLogo)
│   │   │   ├── layout/ (Sidebar, Header)
│   │   │   ├── modals/ (QuickAdmissionModal, StatAlertsModal)
│   │   │   └── onboarding/ (StaffTour Joyride Walkthrough)
│   │   ├── features/ (Dashboard, Patients, EMR Desk, Appointments, Billing, Laboratory, Pharmacy, Staff, Reports, Audit, Login)
│   │   └── context/ (AuthContext with RBAC across all 7 operational roles)
├── docker-compose.yml (PostgreSQL 16 & Redis 7 stack)
└── .env.example (Master environment template)
```

---

## 🚀 Quick Start Guide

### 1. Launch Backend API Server (Port 5000)
```bash
cd backend
npm install
npm run dev
```

### 2. Launch Frontend Application (Port 5173)
```bash
cd frontend
npm install
npm run dev
```

Open your browser at **`http://localhost:5173/`**.

---

## 👥 Role-Based Access Control (RBAC) Accounts

The system provides dedicated accounts for each of the 7 hospital operational roles. Log in directly with each role's credentials to experience their specific permissions and module access:

| Operational Role | Username | Password | Full Name & Title | Core Activity Role Modules |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | `superadmin` | `Test1234!` | Namal Kumara (Chief Hospital Administrator) | Master Access, Staff & Doctor Provisioning, Audit Trails, Reports |
| **Doctor** | `doctor1` | `Doctor1234!` | Dr. Kasun Perera, MD (Consultant Physician) | Dashboard, Patients & EMR Desk, Prescriptions, Appointments, Lab Review |
| **Nurse** | `nurse1` | `Nurse1234!` | Nurse Nimali Fernando, RN (Head Nursing Officer) | Dashboard, Inpatient Care, Vitals, Shift Roster, Lab & Pharmacy View |
| **Receptionist** | `receptionist1`| `Reception1234!` | Chaminda Silva (Patient Admissions Officer) | Dashboard, Patient Registration, Appointments Matrix, Billing Desk |
| **Laboratory Staff** | `labtech1` | `Lab1234!` | Dr. Dilani Wickramasinghe (Consultant Pathologist) | Dashboard, Laboratory Diagnostic Assays, STAT Urgent Alerts |
| **Pharmacist** | `pharmacist1` | `Pharm1234!` | Nuwan Bandara, BPharm (Chief Pharmacist) | Dashboard, Pharmacy Inventory & Medicine Dispensing Queue |
| **Accountant** | `accountant1` | `Account1234!` | Tharindu Jayawardena, ACA (Finance Controller) | Dashboard, Billing & Cashier Desk, Patient Invoices, Revenue Reports |

> **Currency & Locale**: All financial transactions, doctor consultation charges, pharmacy items, cashier receipts, and revenue reports are denominated in **Sri Lankan Rupees (Rs. / LKR)**.
>
> **Password Management & Recovery**: Any logged-in user can change their station password via the user profile menu or sidebar. If a user forgets their password, they can reset it on the login screen using self-service email verification.

---

## ✨ System Features & Screen Specifications

1. **Operations Dashboard (`/dashboard`)**:
   - 4 Real-time KPI Cards: Total Active Patients (1,248, +8.4%), Today's Consultations (86 scheduled, 34 done, 12 in-consult, 40 next), Revenue Settlement (Rs. 28,450.00), Bed Occupancy (142/160 beds, 88%).
   - Today's Clinical Appointments Queue with interactive clinical status toggle.
   - STAT Urgent Laboratory Orders card with quick result entry action.
   - Pharmacy Shortage & Expiration Alerts feed with severity tags.
   - Ward Capacity Progress Meters (ICU, Emergency, General Ward).

2. **Patient Directory & Registration (`/patients`)**:
   - Omni-filter by MRN, Name, Phone, Blood Group, Gender, and Physician.
   - Rapid patient admission modal with ward bed allocation.

3. **Clinical EMR Desk (`/patients/:id/emr`)**:
   - Sticky Patient Header Banner (Nimali Gunasekera, MRN #MRN-84920, O+, Penicillin severe allergy chip, Type II Diabetes, Hypertension).
   - SOAP Notes Consultation Timeline (Subjective, Objective, Assessment, Plan) with ICD-10 classification and rich text sanitization.
   - Active Prescriptions with live dispensing state.
   - Diagnostic Laboratory Investigations with PDF report viewer modal.
   - Secure Medical Documents Vault (X-Rays, ECGs).

4. **Appointment Scheduling Matrix (`/appointments`)**:
   - Dual-pane layout: 300px Left Panel (Mini calendar date picker, department filter, doctor roster list with online status & available slots badge).
   - Right Panel: Weekly 30-minute block timetable grid (08:00 to 18:00) with status-colored cards (Emerald: Confirmed, Amber: In Consultation, Blue: Scheduled, Red: Cancelled).
   - Slot Booking Drawer.

5. **Billing & Cashier Terminal (`/billing`)**:
   - Patient search with instant charge builder accordion (Consultation, Laboratory, Pharmacy, Ward stay).
   - Itemized line-item ledger with quantity adjustment and removal.
   - Financial Summary Card with large 32px Net Due tabular figure.
   - Payment method selection (Cash, Credit Card, Insurance, Bank Transfer) with real-time "Change Due" calculation.
   - Official printable receipt generator.

6. **Diagnostic Laboratory (`/laboratory`)**:
   - 4-Stage Workflow: Test Requests → Specimen Collection → Assay Analytics & Result Entry → Finalized Digital Sign-off.

7. **Pharmacy & Formulary Inventory (`/pharmacy`)**:
   - Formulary Catalog with stock levels, reorder thresholds, and expiration alerts.
   - Dispensing Queue with 1-click dispensing and automatic stock deduction.
   - Stock Intake Modal for registering new medicine batches.

8. **Staff & Attendance Administration (`/staff`)**:
   - **Clean Directory State**: The Staff Directory starts clean with 0 records (example role accounts are reserved exclusively for system role testing on the login screen and do not appear as staff members).
   - **Super Admin Full CRUD**:
     - **Create**: Enroll new clinical doctors or staff members with auto-generated Employee IDs (`EMP-001`, `EMP-002`, etc.) and encrypted station credentials.
     - **Read**: Omni-search directory by Name, Employee ID, Role, Department, or Login ID, plus detailed modal profile viewer.
     - **Update**: Edit personal details, department, official title, operational role, duty shifts, consultation fees (Rs.), room locations, and optionally reset/assign station passwords.
     - **Delete**: Safely delete staff members and revoke station login credentials (with governance safeguards preventing primary Super Admin deletion).
   - Daily shift clock-in/clock-out attendance toggle with real-time active personnel counter.
   - Leave requests ledger with approval/rejection decision workflows.

9. **Hospital Executive Analytics (`/reports`)**:
   - Revenue distribution by department, admission trends, appointment fulfillment ratios, formulary consumption, and lab turnaround metrics.

10. **Security & Audit Logs (`/audit-logs`)**:
    - Immutable trace of all record accesses, consultation modifications, and cashier transactions.

11. **Interactive Guided Tour (React Joyride)**:
    - Built-in step-by-step onboarding walkthrough accessible via the "Tour Guide" button in the top navigation bar.

---

## 🔒 International Standard Security & Cryptography

ApexCare is engineered in compliance with international healthcare cybersecurity standards:
- **HIPAA Security Rule (45 CFR § 164.312(a)(2)(iv))** — Cryptographic Encryption of Electronic Protected Health Information (ePHI) at rest.
- **ISO/IEC 27001 & ISO 27799** — Information Security Management in Health Informatics.
- **NIST SP 800-38D** — Authenticated Galois/Counter Mode (AES-256-GCM) with 128-bit authentication tag verification.
- **GDPR Article 32** — Technical measures for pseudonymisation and cryptographic at-rest storage.

### Authenticated AES-256-GCM Storage Engine
- **Cipher**: `aes-256-gcm` (256-bit encryption key with authenticated integrity).
- **Key Derivation (KDF)**: PBKDF2 with HMAC-SHA-512 and 100,000 iterations using a cryptographically random 32-byte salt.
- **Unique IV**: A fresh 12-byte (96-bit) initialization vector is generated for every write operation.
- **Tamper Evident**: If an attacker attempts to modify ciphertext on disk or in transit, decryption immediately rejects with an authentication failure.
- **Zero Plaintext on Disk**: In production, patient names, contact details, diagnoses, EMR notes, prescriptions, and financial statements are saved as high-entropy ciphertext in `store.enc`.

---

## 🧩 Modular Architecture & Fault Isolation Engine

ApexCare utilizes a **Fault-Isolated Modular Microkernel Architecture**. Each hospital domain operates as an autonomous, self-contained module wrapped by an **Isolated Module Error Boundary & Circuit Breaker**:

```
                              ┌────────────────────────────────────────┐
                              │           API Gateway / CORS           │
                              └───────────────────┬────────────────────┘
                                                  │
            ┌──────────────────┬──────────────────┼──────────────────┬──────────────────┐
            ▼                  ▼                  ▼                  ▼                  ▼
    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
    │   Billing    │   │   Patients   │   │     EMR      │   │ Appointments │   │  Laboratory  │
    │  & Payments  │   │   Registry   │   │  Consulting  │   │  Scheduling  │   │  Pathology   │
    ├──────────────┤   ├──────────────┤   ├──────────────┤   ├──────────────┤   ├──────────────┤
    │ Error Bound. │   │ Error Bound. │   │ Error Bound. │   │ Error Bound. │   │ Error Bound. │
    │ Circ.Breaker │   │ Circ.Breaker │   │ Circ.Breaker │   │ Circ.Breaker │   │ Circ.Breaker │
    └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
```

### Key Capabilities:
1. **Quarantine / Fault Isolation**:
   If an unexpected issue or third-party outage occurs inside the **Billing & Payments** module, the fault is trapped within the Billing boundary. The Billing module returns an isolated diagnostic HTTP 503 (`MODULE_DEGRADED`), while **all other hospital functions (EMR Desk, Patients Registry, Outpatient Scheduling, Diagnostic Laboratory, Pharmacy) continue operating normally with 200 OK responses**.
2. **Circuit Breaker Pattern**:
   If a module experiences 5 consecutive uncaught errors, its circuit trips to `OPEN` to prevent resource exhaustion, fast-failing with incident identifiers (`INC-<MODULE>-<ID>`) and attempting automatic self-healing recovery after a 30-second cooldown (`HALF_OPEN`).
3. **Module Telemetry & Diagnostic Endpoints**:
   - `GET /api/health` — Platform health, uptime, and AES-256-GCM encryption verification.
   - `GET /api/health/modules` — Detailed per-module status (`HEALTHY`, `DEGRADED`, `OFFLINE`), request counts, and error telemetry.
   - `POST /api/health/modules/:key/reset` — Manually reset a degraded module back to `HEALTHY`.
   - `POST /api/health/modules/:key/simulate-failure` — Test module fault isolation to prove the rest of the HMS runs unaffected.

---

## 🌐 Production Deployment Guide: GitHub Pages + Render.com

ApexCare is fully configured and optimized for hosting: **Frontend on GitHub Pages** and **Backend on Render.com** (as well as Vercel/Docker).

### Step 1: Deploy Backend to Render.com
You can deploy to Render with **1-Click Blueprint** or manually as a **Web Service**:

#### Option A: 1-Click Render Blueprint (Recommended)
1. Push your code to GitHub.
2. In [Render Dashboard](https://dashboard.render.com), click **New +** → **Blueprint**.
3. Select your repository. Render will automatically detect [`render.yaml`](file:///render.yaml) and configure:
   - **Service Name**: `apexcare-backend`
   - **Environment**: Node.js
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
4. Render automatically generates secure cryptographically random keys for `ENCRYPTION_SECRET` and `JWT_SECRET`.
5. Under environment variables, set `FRONTEND_URL` and `APP_TRUSTED_ORIGIN` to your GitHub Pages URL (e.g. `https://<your-username>.github.io`).
6. Click **Apply**. Render will build and deploy your containerized web service.

#### Option B: Manual Web Service Setup
1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure settings:
   - **Root Directory**: `backend` (or leave empty if using root commands)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
4. Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `ENCRYPTION_SECRET`: (Generate a secure 32+ character key)
   - `JWT_SECRET`: (Generate a secure 32+ character key)
   - `FRONTEND_URL`: `https://<your-github-username>.github.io`
   - `APP_TRUSTED_ORIGIN`: `https://<your-github-username>.github.io`
   - `CORS_ALLOWED_ORIGINS`: `https://<your-github-username>.github.io`
5. Click **Create Web Service**. Your backend will be assigned a live URL, e.g.: `https://apexcare-backend.onrender.com`.
6. Verify by opening `https://apexcare-backend.onrender.com/api/health`. You will see:
   ```json
   {
     "status": "HEALTHY",
     "service": "ApexCare HMS Precision Healthcare Core API",
     "architecture": "Modular Fault-Isolated Microkernel",
     "infrastructure": {
       "renderDetected": true,
       "runtime": "Render.com Container Web Service"
     }
   }
   ```

---

### Step 2: Deploy Frontend to GitHub Pages & Connect to Render
1. In your GitHub repository, go to **Settings** → **Secrets and variables** → **Actions**.
2. Click **New repository secret**:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://<your-service-name>.onrender.com` *(your Render backend URL, without a trailing slash)*
3. Go to **Settings** → **Pages**:
   - Under **Build and deployment** → **Source**, select **GitHub Actions**.
4. Push your code to the `main` branch. The pre-configured GitHub Actions workflow ([`.github/workflows/deploy-frontend.yml`](file:///.github/workflows/deploy-frontend.yml)) will build and publish your frontend to `https://<username>.github.io/<repo-name>/`.
5. Open your GitHub Pages URL — your frontend is now connected to your Render backend with full AES-256-GCM encryption and modular fault isolation!

---

## 🔒 Security Hardening Implemented

- **Anti-IDOR Scoping**: AsyncLocalStorage tenant boundary context isolating records per hospital tenant.
- **Strict Content Security Policy (CSP)**: Zero inline execution scripts, strict same-origin cookies with 15-minute timeout.
- **Input Sanitization**: DOMPurify rich text cleansing stripping malicious tags and attributes.
- **File Upload Protection**: Multer in-memory inspection with true magic-bytes detection (JPEG, PNG, PDF) and 5MB size limit.
- **Payment Webhook Hardening**: HMAC-SHA256 signature verification, IP whitelist verification, and Redis/Memory idempotency key locking.
- **Rate Limiting**: IP-based rate limiting on authentication and API routes.
