# Hospital Management System (HMS) — Comprehensive System & UI Design Specification

## 1. Project Overview & System Scope

### 1.1 Purpose

The Hospital Management System (HMS) automates and centralizes daily healthcare and administrative operations[cite: 1]. It centralizes patient registration, appointment scheduling, electronic medical records, laboratory investigations, pharmacy inventory, billing, inpatient/outpatient tracking, and staff management[cite: 1, 2].

### 1.2 User Roles & Access Control

The system enforces Role-Based Access Control (RBAC) across seven operational user roles[cite: 2, 3, 5]:

- **Administrator**: System user management, role assignments, employee onboarding, access control, audit trail monitoring, and executive reports[cite: 2, 3, 5].
- **Doctor**: Appointment schedule management, clinical diagnosis, electronic medical records, test order requests, and prescription generation[cite: 2, 3, 4].
- **Nurse**: Inpatient care monitoring, bed assignments, sample collection support, and vitals administration[cite: 2, 4].
- **Receptionist**: Patient registration, patient record updates, appointment booking, rescheduling, and status tracking[cite: 2, 3].
- **Laboratory Staff**: Diagnostic test order intake, sample collection tracking, result entry, and laboratory report generation[cite: 2, 4].
- **Pharmacist**: Prescription validation, medicine inventory management, stock level control, and expiration tracking[cite: 2, 4].
- **Accountant**: Departmental charge calculation, invoice generation, payment recording, and revenue reporting[cite: 2, 4, 5].

---

## 2. Design System Tokens & Style Guide

### 2.1 Color Palette

Canvas & Surfaces:--bg-canvas: #F8FAFC /_ Slate 50 - Primary application background /
--bg-surface: #FFFFFF / White - Cards, modal overlays, drawers /
--bg-surface-subtle: #F1F5F9 / Slate 100 - Table headers, tag backgrounds /
--border-subtle: #E2E8F0 / Slate 200 - Gridlines, card outlines /
--border-strong: #CBD5E1 / Slate 300 - Input borders, focus states _/Brand & Action Colors:--primary-navy: #0F172A /_ Slate 900 - Sidebar background, primary typography /
--primary-teal: #0284C7 / Sky 600 - Primary CTAs, active highlights /
--primary-teal-hover: #0369A1 / Sky 700 - Interactive hover states /
--primary-teal-subtle: #E0F2FE / Sky 100 - Row selections, tag fills _/Semantic & Status Indicators:--status-critical: #EF4444 /_ Red 500 - Stock expiry, abnormal lab flags, emergency triage /
--status-critical-bg: #FEE2E2 / Red 100 - Danger tag background /
--status-warning: #F59E0B / Amber 500 - Pending tests, low stock alerts /
--status-warning-bg: #FEF3C7 / Amber 100 - Warning tag background /
--status-success: #10B981 / Emerald 500 - Settled invoices, completed visits /
--status-success-bg: #D1FAE5 / Emerald 100 - Success tag background /
--status-info: #3B82F6 / Blue 500 - Booked appointments, general notes /
--status-info-bg: #DBEAFE / Blue 100 - Informational container fill _/

### 2.2 Typography & Sizing

- **Base Family**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, sans-serif.
- **Heading 1 / Page Title**: `24px` (`1.5rem`), Weight 600, Line Height `32px`.
- **Heading 2 / Section Header**: `18px` (`1.125rem`), Weight 600, Line Height `24px`.
- **Card Titles & Subheadings**: `14px` (`0.875rem`), Weight 500, Line Height `20px`.
- **Body Text**: `14px` (`0.875rem`), Weight 400, Line Height `20px`.
- **Badges & Metadata**: `12px` (`0.75rem`), Weight 500, Line Height `16px`.
- **Tabular Figures**: `font-variant-numeric: tabular-nums;` applied across all numerical identifiers, currency amounts, and dates.

### 2.3 Component Geometry & Elevation

- **Border Radii**:
  - Badges & Status Pills: `9999px` (Full Pill)
  - Form Inputs & Action Buttons: `6px` (`rounded-md`)
  - Surface Cards & Modal Dialogs: `10px` (`rounded-lg`)
- **Shadow Tokens**:
  - Standard Surface Card: `0 1px 3px 0 rgb(0 0 0 / 0.05)`
  - Floating Popovers & Dropdowns: `0 4px 6px -1px rgb(0 0 0 / 0.1)`
  - Modals & Slide-over Drawers: `0 20px 25px -5px rgb(0 0 0 / 0.1)`

---

## 3. System Architecture & Information Architecture

### 3.1 4-Tier Architectural Hierarchy

The system is structured into four distinct architectural layers[cite: 6]:

1. **Presentation Layer**: Responsive desktop web clients accessed via Windows 10/11 through Google Chrome, Microsoft Edge, or Mozilla Firefox[cite: 6, 8].
2. **Application Layer**: Session management, automated timeouts, user authentication, and role routing[cite: 3, 5, 6].
3. **Business Logic Layer**: Core domain services handling appointments, clinical records, inventory tracking, and billing computation[cite: 3, 4, 6].
4. **Database Layer**: Relational database storage powered by PostgreSQL, MySQL, SQL Server, or Oracle[cite: 6, 8].

### 3.2 Global Application Sitemap

- `/login` — Secure staff authentication portal[cite: 3, 7].
- `/dashboard` — Master operational metric center[cite: 7].
- `/patients` — Patient registration, search, and directory management[cite: 3, 7].
- `/patients/:id/emr` — Electronic Medical Records, diagnosis, and medical history[cite: 3, 4, 7].
- `/doctors` — Doctor directory, schedule management, and department allocations[cite: 3, 7].
- `/appointments` — Calendar scheduler and appointment tracking[cite: 3, 7].
- `/laboratory` — Test requests, sample intake, result entry, and reporting[cite: 4, 7].
- `/pharmacy` — Medicine inventory, stock monitor, expiration alerts, and dispensing[cite: 4, 7].
- `/billing` — Departmental charge consolidation, invoices, payments, and receipts[cite: 4, 7].
- `/staff` — Employee records, attendance tracking, and leave management[cite: 4, 5].
- `/reports` — Revenue, patient, lab, pharmacy, and staff analytics.

---

## 4. UI Screen Specifications & Wireframe Blueprints

### 4.1 Login Interface (`/login`)

- **Header & Identity**: Institutional logo ("ApexCare Hospital Management System") and encrypted sign-in header[cite: 1, 5].
- **Input Elements**:
  - Username text field with icon[cite: 7].
  - Password text field with mask toggle[cite: 7].
  - Role / Department verification selector[cite: 3].
- **Actions**:
  - "Sign In" primary submit trigger[cite: 7].
  - "Forgot Password?" credential recovery flow[cite: 3].
- **Security Notice**: Audit logging disclaimer and session timeout advisory.

### 4.2 Operations Dashboard (`/dashboard`)

- **Top Header**: Date range filter, active hospital shift display, global search bar, and user profile drawer[cite: 5, 7].
- **KPI Metrics Band (4 Cards)**:
  - **Total Patients Card**: Active patient count and trend metric[cite: 7].
  - **Today's Appointments Card**: Scheduled visits, split by completed and waiting statuses[cite: 3, 7].
  - **Revenue Summary Card**: Aggregated billing figures broken down by consultation, lab, pharmacy, and admissions[cite: 4, 7].
  - **Laboratory Requests Card**: Pending orders alongside urgent STAT test highlights[cite: 4, 7].
- **Main Data Display (2 Columns - 65% / 35%)**:
  - **Left Column**:
    - Queue table showing today's appointments: Patient Name, MRN, Assigned Doctor, Department, Appointment Slot, and Status Pill[cite: 3, 7].
    - Urgent laboratory requests requiring result entry[cite: 4, 7].
  - **Right Column**:
    - Pharmacy alert widget showing low-stock medicines and expiring batches[cite: 4, 7].
    - Ward bed occupancy progress meters (General, ICU, Surgical)[cite: 2, 4].

### 4.3 Patient Management Screen (`/patients`)

- **Control Bar**:
  - Search input filtering by name, national ID, phone number, or MRN[cite: 3, 7].
  - Filter dropdowns: Blood group, gender, attending physician[cite: 3].
  - Action: "+ Register New Patient" button[cite: 3, 7].
- **Patient Data Table**:
  - Columns: MRN, Patient Name, Age/Gender, Contact Number, Blood Group, Assigned Doctor, Record Date, and Row Action Menu[cite: 3, 7].
- **Patient Details & Action Slide-over**:
  - Demographics view and update form[cite: 3, 7].
  - Medical history overview[cite: 3, 7].
  - File uploader for external medical documents and identification scans[cite: 3].

### 4.4 Electronic Medical Records (EMR) Desk (`/patients/:id/emr`)

- **Patient Header Banner**: Full Name, MRN, Age, Blood Type, and prominent Allergy warning pills[cite: 3, 4].
- **EMR Workspace Tabs**:
  - **Diagnosis & Notes**: Chronological treatment entries, diagnosis text editor, and ICD classification selector[cite: 4].
  - **Prescriptions**: List of active prescribed medicines, dosages, instructions, and pharmacy dispensing state[cite: 4].
  - **Medical Reports**: Document library containing test summaries, physician notes, and downloadable PDF reports[cite: 4].
  - **History Timeline**: Consolidated log of prior hospital admissions, consultations, and discharge notes[cite: 2, 4].

### 4.5 Appointment Scheduling Screen (`/appointments`)

- **Dual-Pane Layout**:
  - **Left Panel**: Interactive mini calendar date picker, department filter, and doctor availability list[cite: 3, 7].
  - **Right Panel**: Full calendar matrix with Day, Week, and Month view toggles[cite: 7].
- **Slot Matrix Details**:
  - 30-minute block increments displaying patient name, doctor, and status badge (`Scheduled`, `In-Progress`, `Completed`, `Cancelled`)[cite: 3, 7].
- **Booking Modal ("Schedule Appointment")**:
  - Patient search/selection field[cite: 3, 7].
  - Department dropdown and Doctor selection menu[cite: 3, 7].
  - Appointment date and time slot selector[cite: 3, 7].
  - Reschedule and cancellation actions with audit trail reason fields.

### 4.6 Laboratory Management Screen (`/laboratory`)

- **Workflow Stages**:
  - **Test Requests**: List of diagnostic orders submitted by doctors[cite: 4].
  - **Sample Collection**: Specimen registration, barcoding, and collection timestamp confirmation[cite: 4].
  - **Result Entry**: Test parameter data table with entered values, reference ranges, and abnormal result flags[cite: 4].
  - **Report Generation**: Digital sign-off and instant generation of printable lab report documents[cite: 4].

### 4.7 Pharmacy Management Screen (`/pharmacy`)

- **Dispensing Queue**:
  - Incoming verified prescriptions awaiting dispensing[cite: 4].
  - Prescription item confirmation with automatic inventory deduction[cite: 4].
- **Medicine Inventory Grid**:
  - Columns: Drug Code, Trade Name, Generic Name, Category, Stock Level, Reorder Threshold, Expiry Date, Unit Price[cite: 4].
  - Automated visual alert tags for stock shortages and approaching expiration dates[cite: 4, 7].

### 4.8 Billing & Payment Terminal (`/billing`)

- **Bill Assembly View (Left Side)**:
  - Patient selection pulling all outstanding department charges[cite: 3, 4].
  - Charge breakdown categories:
    - Doctor consultation charges[cite: 4].
    - Diagnostic laboratory test fees[cite: 4].
    - Pharmacy medicine costs[cite: 4].
    - Ward admission and bed charges[cite: 4].
  - Itemized line-item ledger with item deletions and adjustments[cite: 4].
- **Settlement Panel (Right Side)**:
  - Total Gross Amount, Disallowed/Discount Amount, and Net Payable calculation[cite: 4, 7].
  - Payment intake method selection (Cash, Card, Bank Transfer)[cite: 4, 7].
  - Amount tendered input with automated change calculation[cite: 4].
  - Primary Actions: "Generate Invoice & Record Payment" and "Print Official Receipt"[cite: 4, 7].

### 4.9 Staff Management Screen (`/staff`)

- **Staff Directory**: List of hospital personnel, employee IDs, job titles, and assigned departments[cite: 4].
- **Attendance Register**: Daily log tracking clock-in timestamps, duty shifts, and active floor assignments[cite: 4].
- **Leave Records Module**: Submission, approval tracking, and balance ledger for staff leave requests.

### 4.10 Reports & Analytics Hub (`/reports`)

- **Report Modules**:
  - **Patient Reports**: Patient registration statistics and admission/discharge trends[cite: 2, 5].
  - **Appointment Reports**: Volume distribution, completion ratios, and cancellation logs[cite: 5].
  - **Revenue Reports**: Daily billing receipts, departmental earnings, and pending accounts[cite: 4, 5].
  - **Pharmacy Reports**: Stock consumption volume and expired inventory write-offs[cite: 4, 5].
  - **Laboratory Reports**: Test order throughput and diagnostic category metrics[cite: 4, 5].
  - **Staff Reports**: Departmental attendance summaries and duty shift audits[cite: 4, 5].

---

## 5. Database Schema & Data Models

The relational schema implements all 13 modules specified in Section 6[cite: 6]:

```sql
-- MODULE 1: ROLES & USER MANAGEMENT
CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL, -- Administrator, Doctor, Nurse, Receptionist, Laboratory Staff, Pharmacist, Accountant
    permissions JSONB NOT NULL
);

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    role_id INT REFERENCES roles(role_id),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MODULE 2: DEPARTMENTS & EMPLOYEES
CREATE TABLE departments (
    department_id SERIAL PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE employees (
    employee_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    department_id INT REFERENCES departments(department_id),
    job_title VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    joining_date DATE NOT NULL,
    attendance_status VARCHAR(20) DEFAULT 'Present'
);

CREATE TABLE leave_records (
    leave_id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES employees(employee_id),
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending' -- Pending, Approved, Rejected
);

-- MODULE 3: DOCTORS & SCHEDULES
CREATE TABLE doctors (
    doctor_id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES employees(employee_id),
    department_id INT REFERENCES departments(department_id),
    specialization VARCHAR(100) NOT NULL,
    consultation_fee NUMERIC(10, 2) NOT NULL,
    room_number VARCHAR(20),
    schedule_config JSONB NOT NULL -- Shift hours, day rosters, slot durations
);

-- MODULE 4: PATIENTS
CREATE TABLE patients (
    patient_id SERIAL PRIMARY KEY,
    mrn VARCHAR(20) UNIQUE NOT NULL, -- Medical Record Number
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) NOT NULL,
    blood_group VARCHAR(5),
    contact_number VARCHAR(20) NOT NULL,
    address TEXT,
    emergency_contact VARCHAR(100),
    allergies TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MODULE 5: APPOINTMENTS
CREATE TABLE appointments (
    appointment_id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(patient_id),
    doctor_id INT REFERENCES doctors(doctor_id),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'Scheduled', -- Scheduled, Completed, Cancelled, Rescheduled
    reason_for_visit TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MODULE 6: ADMISSIONS (INPATIENT TRACKING)
CREATE TABLE admissions (
    admission_id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(patient_id),
    doctor_id INT REFERENCES doctors(doctor_id),
    room_number VARCHAR(20) NOT NULL,
    bed_number VARCHAR(20) NOT NULL,
    admission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    discharge_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Admitted' -- Admitted, Discharged
);

-- MODULE 7: ELECTRONIC MEDICAL RECORDS (EMR)
CREATE TABLE medical_records (
    record_id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(patient_id),
    doctor_id INT REFERENCES doctors(doctor_id),
    visit_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diagnosis TEXT NOT NULL,
    treatment_history TEXT,
    clinical_notes TEXT
);

-- MODULE 8: PHARMACY & INVENTORY
CREATE TABLE pharmacy_inventory (
    item_id SERIAL PRIMARY KEY,
    medicine_name VARCHAR(100) NOT NULL,
    generic_name VARCHAR(100),
    category VARCHAR(50),
    stock_quantity INT NOT NULL,
    reorder_level INT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    expiry_date DATE NOT NULL,
    batch_number VARCHAR(50) NOT NULL
);

CREATE TABLE prescriptions (
    prescription_id SERIAL PRIMARY KEY,
    record_id INT REFERENCES medical_records(record_id),
    patient_id INT REFERENCES patients(patient_id),
    doctor_id INT REFERENCES doctors(doctor_id),
    prescription_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Pending' -- Pending, Dispensed
);

CREATE TABLE prescription_items (
    prescription_item_id SERIAL PRIMARY KEY,
    prescription_id INT REFERENCES prescriptions(prescription_id),
    item_id INT REFERENCES pharmacy_inventory(item_id),
    dosage VARCHAR(50) NOT NULL,
    frequency VARCHAR(50) NOT NULL,
    duration VARCHAR(50) NOT NULL,
    quantity INT NOT NULL
);

-- MODULE 9: LABORATORY TESTS
CREATE TABLE laboratory_tests (
    test_id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(patient_id),
    doctor_id INT REFERENCES doctors(doctor_id),
    test_name VARCHAR(100) NOT NULL,
    sample_status VARCHAR(50) DEFAULT 'Requested', -- Requested, Sample Collected, In-Analysis, Completed
    result_data JSONB,
    report_file_url VARCHAR(255),
    charge NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- MODULE 10: BILLING & PAYMENTS
CREATE TABLE bills (
    bill_id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(patient_id),
    total_amount NUMERIC(10, 2) NOT NULL,
    discount NUMERIC(10, 2) DEFAULT 0.00,
    net_payable NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'Unpaid', -- Unpaid, Partially Paid, Paid
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bill_items (
    bill_item_id SERIAL PRIMARY KEY,
    bill_id INT REFERENCES bills(bill_id),
    service_type VARCHAR(50) NOT NULL, -- Consultation, Laboratory, Pharmacy, Admission
    reference_id INT,
    description VARCHAR(200) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL
);

CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    bill_id INT REFERENCES bills(bill_id),
    amount_paid NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL, -- Cash, Card, Bank Transfer
    transaction_reference VARCHAR(100),
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accountant_id INT REFERENCES users(user_id)
);
6. Non-Functional, Security & System Requirements6.1 Performance & UsabilitySupport for multiple concurrent users across clinical and administrative workstations with sub-second response times[cite: 5].High usability through responsive, intuitive navigation and standardized layout geometry.   6.2 Security & Data ProtectionMandatory role-based access control protecting all routes and API endpoints[cite: 3, 5].Industry-standard password hashing and secure login authentication[cite: 5].Automated session timeout for idle user workstations[cite: 5].Comprehensive audit logging tracking all record modifications, clinical entries, and financial collections.   6.3 Backup, Recovery & Hardware StandardsAutomatic daily backups and weekly full backups with a verified disaster recovery plan.   Minimum Server Hardware: Intel Core i5 processor, 8 GB RAM, 256 GB SSD, LAN connectivity, dedicated printer.   Recommended Server Hardware: Intel Core i7 processor, 16 GB RAM, expandable SSD storage, and redundant backup server.   7. Master Google Stitch Prompt SuitePrompt 1: Operational Dashboard & ShellPlaintextCreate a high-density, accessible desktop web dashboard UI for a Hospital Management System (HMS) at 1440x900 resolution.

Design Language:
- Palette: Dark Navy sidebar (#0F172A), light gray workspace canvas (#F8FAFC), pure white card surfaces (#FFFFFF), and medical sky teal (#0284C7) for primary actions.
- Semantic Tags: Red (#EF4444) for inventory alerts and critical flags, Amber (#F59E0B) for pending tests, Emerald (#10B981) for settled bills and confirmed visits.
- Typography: Inter with clean font-variant-numeric: tabular-nums for medical record IDs, dates, and amounts.

Layout Hierarchy:
1. Left Navigation Sidebar (260px):
   - Hospital Insignia: "ApexCare HMS"
   - Navigation Items: Dashboard (Active), Patients, Doctors, Appointments, EMR, Laboratory, Pharmacy, Billing, Staff, Reports.
   - User Profile Card at base: Dr. Arthur Vance (Chief Medical Officer).
2. Top Application Bar (64px):
   - Global Search Field: "Search patients by MRN, name, doctor, or bill ID..."
   - Current Shift Pill: "Morning Shift (08:00 - 16:00)"
   - Notification bell with red alert counter.
   - Primary Action Button: "+ Quick Admission".
3. Metric KPI Row (4 Cards with sparkline graphs):
   - Total Patients: "1,248" (+8% trend)
   - Today's Appointments: "86 scheduled" (34 completed, 12 in-progress, 40 upcoming)
   - Revenue Summary: "$28,450.00"
   - Bed Occupancy: "142 / 160 Beds (88% Occupied)"
4. Main Content Grid (65% / 35% Split):
   - Left Column: "Today's Clinical Appointments Queue" table (Patient Name, MRN, Doctor, Room, Time, Status Pill, Action Menu) and "STAT Urgent Laboratory Orders" card.
   - Right Column: "Pharmacy Expiration & Low Stock Alerts" feed with severity tags, and "Department Bed Availability" progress meters for ICU, Emergency, and General Ward.
Prompt 2: Patient Registration & EMR DeskPlaintextCreate a clinical Electronic Medical Records (EMR) and Patient Management screen for a Hospital Management System on desktop (1440px).

Layout Structure:
1. Sticky Patient Banner:
   - Patient Profile: Eleanor Vance, 42 yrs, Female, MRN: #84920, Blood Group: O+.
   - Prominent Severity Badges: "Allergy: Penicillin (Severe)", "Chronic: Type II Diabetes".
   - Quick Action Triggers: "Prescribe Medication", "Order Diagnostic Test", "Transfer / Admit".
2. Split Workspace Layout:
   - Left Panel (60%):
     * Chronological clinical consultation timeline with SOAP structure (Subjective, Objective, Assessment, Plan).
     * ICD diagnosis picker with search input, active diagnosis card, and physician clinical notes editor.
   - Right Panel (40%):
     * Active Medications Table: Drug name, dosage, frequency, dispensing status badge ("Pending Pharmacy", "Dispensed").
     * Laboratory Investigation History: Test name, order date, status pill, and clickable "View Lab Report (PDF)" badge.
     * Uploaded Medical Documents: Thumbnail list of uploaded X-Ray scans and historical physician referral letters.

Aesthetic:
- Crisp white surface cards over #F8FAFC canvas, sharp borders (#E2E8F0), 8px border radius, high-contrast readable medical typography.
Prompt 3: Appointment Scheduling & Doctor CalendarPlaintextCreate a desktop appointment scheduling and doctor roster interface for a Hospital Management System.

Layout Structure:
1. Left Calendar Control Panel (300px):
   - Mini monthly date picker calendar with today highlight.
   - Department selector: Cardiology, Pediatrics, General Medicine, Orthopedics, Neurology.
   - Doctor Roster List: Doctor avatar, specialty, available slot count badge, and active status toggle.
   - Primary Action Button: "+ Book New Appointment".
2. Right Timetable Matrix:
   - View Switcher: Day, Week, Month, and Doctor Matrix view buttons.
   - Weekly time grid (08:00 to 18:00 in 30-minute intervals).
   - Appointment Cards: Patient name, MRN, reason for visit, and status-colored border (Emerald: Confirmed, Amber: In Consultation, Blue: Scheduled, Red: Cancelled).
3. Schedule Appointment Modal Dialog:
   - Patient search autocomplete field.
   - Department and Doctor selection dropdowns.
   - Available time slot selector buttons.
   - Reason for visit input area and confirmation CTAs.

Aesthetic:
- Clean gridlines (#E2E8F0), modern scheduling cards, subtle shadows, clear drag-and-drop visual indicators.
Prompt 4: Billing Terminal & Cashier DeskPlaintextCreate a desktop billing, payment intake, and receipt generation screen for a Hospital Management System cashier terminal.

Layout Structure:
1. Patient Search Header:
   - MRN input with instant search to pull patient profile, insurance information, and unbilled service charges.
2. Left Charge Builder Panel (60%):
   - Consolidated charge accordion:
     * Consultation Charges: Attending doctor examination fee.
     * Laboratory Charges: Itemized lab tests performed (e.g., CBC, Lipid Panel).
     * Pharmacy Charges: Dispensed drugs with unit price, quantity, and batch number.
     * Admission Charges: Room stay computation (Room 204, 3 nights).
   - Line-Item Ledger: Description, Category, Qty, Price, Total, and row removal button.
3. Right Payment Settlement Panel (40%):
   - Financial Summary Card:
     * Subtotal: $1,250.00
     * Insurance Deduction: -$800.00
     * Net Amount Due: $450.00 (Rendered in large, bold 32px tabular text)
   - Payment Method Selector: Tab buttons for Cash, Credit Card, Insurance Direct, and Bank Transfer.
   - Amount Received input field with real-time "Change Due" calculation.
   - Primary CTA: "Process Payment & Print Official Receipt" (High-visibility Teal).
   - Secondary CTAs: "Save as Draft", "Export Itemized Statement (PDF)".

Aesthetic:
- Financial grade tabular layout, high contrast figures, clear transaction receipts, and clean borders.
```
