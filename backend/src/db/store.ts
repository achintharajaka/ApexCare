import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import os from "os";
import { encryptData, decryptData, EncryptedEnvelope } from "./crypto.js";
import { env } from "../config/env.js";

// Master Tenant
export const tenant = {
  id: "tenant-apexcare-01",
  name: "ApexCare Health Network",
  slug: "apexcare-main",
  createdAt: new Date().toISOString(),
};

// TypeScript Interfaces for In-Memory Database Entities
export interface User {
  id: string;
  tenantId: string;
  username: string;
  passwordHash: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  jobTitle: string;
  department: string;
  roomNumber?: string;
  consultationFee?: number;
  specialization?: string;
}

export interface Patient {
  id: string;
  tenantId: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  age: number;
  gender: string;
  bloodGroup: string;
  contactNumber: string;
  email?: string;
  address: string;
  wardBed: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  preAuthNumber: string;
  emergencyContact: string;
  allergies: string[];
  chronicConditions: string[];
  status: string;
  assignedDoctor: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  tenantId: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  doctorId: string;
  doctorName: string;
  department: string;
  roomNumber: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string; // Scheduled, In-Progress, Completed, Cancelled
  reason: string;
  priority: string;
  createdAt?: string;
}

export interface MedicalRecord {
  id: string;
  tenantId: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  visitDate: string;
  diagnosis: string;
  icdCode: string;
  treatmentHistory: string;
  clinicalNotes: string;
}

export interface PrescriptionItem {
  id: string;
  itemId?: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  unitPrice: number;
  status: string;
}

export interface Prescription {
  id: string;
  recordId?: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  prescriptionDate: string;
  status: string; // Pending, Dispensed
  items: PrescriptionItem[];
}

export interface PharmacyItem {
  id: string;
  drugCode: string;
  medicineName: string;
  genericName: string;
  category: string;
  stockQuantity: number;
  reorderLevel: number;
  unitPrice: number;
  expiryDate: string;
  batchNumber: string;
  statusAlert: string;
}

export interface LaboratoryTest {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  doctorId: string;
  doctorName: string;
  testName: string;
  sampleStatus: string; // Requested, Sample Collected, In-Analysis, Completed
  isStatUrgent: boolean;
  charge: number;
  createdAt: string;
  completedAt: string | null;
  resultData: any;
}

export interface BillItem {
  id: string;
  serviceType: string;
  description: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface PaymentRecord {
  id: string;
  idempotencyKey?: string;
  amountPaid: number;
  paymentMethod: string;
  transactionRef: string;
  paidAt: string;
}

export interface Bill {
  id: string;
  tenantId: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  accountantId?: string;
  accountantName?: string;
  invoiceDate: string;
  totalAmount: number;
  discount: number;
  netPayable: number;
  paymentStatus: string; // Unpaid, Paid, Partially_Paid
  items: BillItem[];
  payments: PaymentRecord[];
}

export interface StaffMember {
  id: string;
  employeeId: string;
  fullName: string;
  role: string;
  department: string;
  jobTitle: string;
  phoneNumber: string;
  attendanceStatus: string;
  shift: string;
  email: string;
  joiningDate: string;
  specialization?: string;
  roomNumber?: string;
  consultationFee?: number;
}

export interface LeaveRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  recordId: string;
  ipAddress?: string;
  timestamp: string;
}

// Configured accounts for each hospital role with verified bcrypt password hashes (Sri Lankan Healthcare Context)
export const users: User[] = [
  {
    id: "usr-admin-01",
    tenantId: tenant.id,
    username: "superadmin",
    passwordHash: "$2a$10$5HeX7bbAkR4OqXqA4NjEseDF0B9840X8jhFqypzGbvd4gjk8opMAi", // Test1234!
    fullName: "Namal Kumara",
    email: "namal.kumara@apexcare.lk",
    role: "ADMIN",
    isActive: true,
    jobTitle: "Chief Hospital Administrator",
    department: "Hospital Administration",
    roomNumber: "Admin Suite 101",
    consultationFee: 0,
    specialization: "Hospital Operations & Healthcare Governance",
  },
  {
    id: "usr-doctor-01",
    tenantId: tenant.id,
    username: "doctor1",
    passwordHash: "$2a$10$LOyhQ7OQTxoaL.nVS6NTV.PWDtboIxmVgmELvtAwDzwuewe1MzB/S", // Doctor1234!
    fullName: "Dr. Kasun Perera, MD",
    email: "dr.kasun@apexcare.lk",
    role: "DOCTOR",
    isActive: true,
    jobTitle: "Consultant Physician & Clinical Director",
    department: "Cardiology & Internal Medicine",
    roomNumber: "Consultation Suite 204",
    consultationFee: 2500,
    specialization: "Interventional Cardiology & Critical Care",
  },
  {
    id: "usr-nurse-01",
    tenantId: tenant.id,
    username: "nurse1",
    passwordHash: "$2a$10$PYG0M//fHOjuBYsL4Ih0auTI/jN31fnIfchZdF1m50/AbWuZNFQpq", // Nurse1234!
    fullName: "Nurse Nimali Fernando, RN",
    email: "nimali.f@apexcare.lk",
    role: "NURSE",
    isActive: true,
    jobTitle: "Head Clinical Nursing Officer",
    department: "Inpatient Care & ICU",
    roomNumber: "Nursing Station 3B",
    consultationFee: 0,
    specialization: "Emergency & Intensive Care Nursing",
  },
  {
    id: "usr-reception-01",
    tenantId: tenant.id,
    username: "receptionist1",
    passwordHash: "$2a$10$.Z/E4gEdugdcQH9ua0JEG.KoCfF2HbJ9qoC6Dz.dvRhyLjbQD.4.6", // Reception1234!
    fullName: "Chaminda Silva",
    email: "chaminda.s@apexcare.lk",
    role: "RECEPTIONIST",
    isActive: true,
    jobTitle: "Patient Access & Admissions Officer",
    department: "Outpatient Reception",
    roomNumber: "Front Desk Counter 1",
    consultationFee: 0,
    specialization: "Patient Registration & OPD Scheduling",
  },
  {
    id: "usr-lab-01",
    tenantId: tenant.id,
    username: "labtech1",
    passwordHash: "$2a$10$3whOM4IcxhjFyb3wwRdyfuAgb6OrmJc2H/j5oGrmt6sDHtFpjV1ua", // Lab1234!
    fullName: "Dr. Dilani Wickramasinghe",
    email: "dilani.w@apexcare.lk",
    role: "LAB_TECH",
    isActive: true,
    jobTitle: "Consultant Diagnostic Pathologist",
    department: "Clinical Pathology & Diagnostics",
    roomNumber: "Diagnostic Lab 102",
    consultationFee: 0,
    specialization: "Clinical Biochemistry & Hematology",
  },
  {
    id: "usr-pharmacy-01",
    tenantId: tenant.id,
    username: "pharmacist1",
    passwordHash: "$2a$10$yoP7QmN2MNfjhWDv/xr4ROmKwWOP0INfrnp8X3gC2Vlq0MwbS8v1S", // Pharm1234!
    fullName: "Nuwan Bandara, BPharm",
    email: "nuwan.b@apexcare.lk",
    role: "PHARMACIST",
    isActive: true,
    jobTitle: "Chief Pharmacist & Dispensary In-Charge",
    department: "Central Dispensary",
    roomNumber: "Central Dispensary 104",
    consultationFee: 0,
    specialization: "Clinical Pharmacology & Medication Safety",
  },
  {
    id: "usr-account-01",
    tenantId: tenant.id,
    username: "accountant1",
    passwordHash: "$2a$10$zg7kAG8M3WNyTH6cHG9GLuNXTJTJfrh8v7kdWpzAXLaE9AxKzIfOe", // Account1234!
    fullName: "Tharindu Jayawardena, ACA",
    email: "tharindu.j@apexcare.lk",
    role: "ACCOUNTANT",
    isActive: true,
    jobTitle: "Hospital Revenue & Finance Controller",
    department: "Finance & Billing",
    roomNumber: "Cashier Office 103",
    consultationFee: 0,
    specialization: "Healthcare Revenue Cycle & Claims Processing",
  },
];

// Clean Production-Ready Initial Stores (All dummy clinical data removed)
export const patients: Patient[] = [];

export const appointments: Appointment[] = [];

export const medicalRecords: MedicalRecord[] = [];

export const prescriptions: Prescription[] = [];

export const pharmacyInventory: PharmacyItem[] = [];

export const laboratoryTests: LaboratoryTest[] = [];

export const bills: Bill[] = [];

// Configured staff members corresponding to each hospital operational account
export const staffMembers: StaffMember[] = [
  {
    id: "usr-admin-01",
    employeeId: "EMP-001",
    fullName: "Namal Kumara",
    role: "ADMIN",
    department: "Hospital Administration",
    jobTitle: "Chief Hospital Administrator",
    phoneNumber: "+94 11 269 1111",
    attendanceStatus: "Present",
    shift: "General Administrative (08:00 - 17:00)",
    email: "namal.kumara@apexcare.lk",
    joiningDate: "2024-01-15",
    roomNumber: "Admin Suite 101",
  },
  {
    id: "usr-doctor-01",
    employeeId: "EMP-002",
    fullName: "Dr. Kasun Perera, MD",
    role: "DOCTOR",
    department: "Cardiology & Internal Medicine",
    jobTitle: "Consultant Physician & Clinical Director",
    phoneNumber: "+94 77 123 4567",
    attendanceStatus: "Present",
    shift: "Day Clinical Shift (08:00 - 16:00)",
    email: "dr.kasun@apexcare.lk",
    joiningDate: "2024-02-01",
    specialization: "Interventional Cardiology & Critical Care",
    roomNumber: "Consultation Suite 204",
    consultationFee: 2500,
  },
  {
    id: "usr-nurse-01",
    employeeId: "EMP-003",
    fullName: "Nurse Nimali Fernando, RN",
    role: "NURSE",
    department: "Inpatient Care & ICU",
    jobTitle: "Head Clinical Nursing Officer",
    phoneNumber: "+94 71 234 5678",
    attendanceStatus: "Present",
    shift: "Day Nursing Shift (07:00 - 15:30)",
    email: "nimali.f@apexcare.lk",
    joiningDate: "2024-02-15",
    specialization: "Emergency & Intensive Care Nursing",
    roomNumber: "Nursing Station 3B",
  },
  {
    id: "usr-reception-01",
    employeeId: "EMP-004",
    fullName: "Chaminda Silva",
    role: "RECEPTIONIST",
    department: "Outpatient Reception",
    jobTitle: "Patient Access & Admissions Officer",
    phoneNumber: "+94 76 345 6789",
    attendanceStatus: "Present",
    shift: "Morning Shift (08:00 - 16:30)",
    email: "chaminda.s@apexcare.lk",
    joiningDate: "2024-03-01",
    roomNumber: "Front Desk Counter 1",
  },
  {
    id: "usr-lab-01",
    employeeId: "EMP-005",
    fullName: "Dr. Dilani Wickramasinghe",
    role: "LAB_TECH",
    department: "Clinical Pathology & Diagnostics",
    jobTitle: "Consultant Diagnostic Pathologist",
    phoneNumber: "+94 70 456 7890",
    attendanceStatus: "Present",
    shift: "Diagnostic Laboratory Shift (08:30 - 17:00)",
    email: "dilani.w@apexcare.lk",
    joiningDate: "2024-03-10",
    specialization: "Clinical Biochemistry & Hematology",
    roomNumber: "Diagnostic Lab 102",
  },
  {
    id: "usr-pharmacy-01",
    employeeId: "EMP-006",
    fullName: "Nuwan Bandara, BPharm",
    role: "PHARMACIST",
    department: "Central Dispensary",
    jobTitle: "Chief Pharmacist & Dispensary In-Charge",
    phoneNumber: "+94 75 567 8901",
    attendanceStatus: "Present",
    shift: "Dispensary Day Shift (08:00 - 16:30)",
    email: "nuwan.b@apexcare.lk",
    joiningDate: "2024-03-15",
    specialization: "Clinical Pharmacology & Medication Safety",
    roomNumber: "Central Dispensary 104",
  },
  {
    id: "usr-account-01",
    employeeId: "EMP-007",
    fullName: "Tharindu Jayawardena, ACA",
    role: "ACCOUNTANT",
    department: "Finance & Billing",
    jobTitle: "Hospital Revenue & Finance Controller",
    phoneNumber: "+94 78 678 9012",
    attendanceStatus: "Present",
    shift: "Finance Shift (09:00 - 17:30)",
    email: "tharindu.j@apexcare.lk",
    joiningDate: "2024-04-01",
    specialization: "Healthcare Revenue Cycle & Claims Processing",
    roomNumber: "Cashier Office 103",
  },
];

export const leaveRecords: LeaveRecord[] = [];

// Persistent AES-256-GCM Encrypted Storage Mechanism (HIPAA & ISO 27001 Compliant)
// On Render.com, supports persistent disk mounts (via DATA_DIR) or local/container storage.
// In serverless environments (Vercel, AWS Lambda), uses writable /tmp directory or falls back gracefully to in-memory state.
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
const isRender = Boolean(process.env.RENDER);

function resolveDataDir(): string {
  // 1. Explicit custom data directory (e.g. Render Persistent Disk: /var/data)
  if (process.env.DATA_DIR) {
    return path.resolve(process.env.DATA_DIR);
  }
  // 2. Serverless ephemeral environments (Vercel, AWS Lambda)
  if (isServerless) {
    return path.join(os.tmpdir(), "apexcare_hms_data");
  }
  // 3. Render / Container / Local execution
  const backendData = path.resolve(process.cwd(), "backend", "data");
  if (fs.existsSync(backendData)) {
    return backendData;
  }
  const rootData = path.resolve(process.cwd(), "data");
  if (fs.existsSync(rootData)) {
    return rootData;
  }
  return path.resolve(process.cwd(), "data");
}

const BASE_DATA_DIR = resolveDataDir();
const ENCRYPTED_FILE = path.join(BASE_DATA_DIR, "store.enc");
const LEGACY_PLAINTEXT_FILE = path.join(BASE_DATA_DIR, "store.json");

export let storageEncryptionStatus = {
  standard: "HIPAA-45CFR164.312-ISO27001-NIST-SP800-38D",
  cipher: "aes-256-gcm",
  authenticated: true,
  lastEncryptedAt: new Date().toISOString(),
  environment: isRender ? "Render.com Web Service" : isServerless ? "Vercel / Serverless" : "Standard Host",
};

export function saveStorage() {
  try {
    if (!fs.existsSync(BASE_DATA_DIR)) {
      try {
        fs.mkdirSync(BASE_DATA_DIR, { recursive: true });
      } catch (dirErr) {
        console.warn("Storage warning: Could not create persistent directory in serverless environment:", dirErr);
        return;
      }
    }

    const payload = {
      users,
      staffMembers,
      leaveRecords,
      patients,
      appointments,
      medicalRecords,
      prescriptions,
      laboratoryTests,
      bills,
      auditLogs,
    };

    // Encrypt using international standard AES-256-GCM
    const encryptedEnvelope = encryptData(payload, env.ENCRYPTION_SECRET);
    fs.writeFileSync(ENCRYPTED_FILE, JSON.stringify(encryptedEnvelope, null, 2), "utf-8");
    storageEncryptionStatus.lastEncryptedAt = encryptedEnvelope.metadata.encryptedAt;

    // In production or if legacy plaintext exists, remove plaintext file to prevent unauthorized disk snooping
    if (fs.existsSync(LEGACY_PLAINTEXT_FILE) && env.NODE_ENV === "production") {
      try {
        fs.unlinkSync(LEGACY_PLAINTEXT_FILE);
      } catch (_) {}
    }
  } catch (err) {
    console.error("Failed to persist encrypted storage:", err);
  }
}

function initStorage() {
  try {
    if (!fs.existsSync(BASE_DATA_DIR)) {
      try {
        fs.mkdirSync(BASE_DATA_DIR, { recursive: true });
      } catch (_) {}
    }

    // 1. Try reading standard AES-256-GCM encrypted envelope
    if (fs.existsSync(ENCRYPTED_FILE)) {
      const raw = fs.readFileSync(ENCRYPTED_FILE, "utf-8");
      const envelope: EncryptedEnvelope = JSON.parse(raw);
      const parsed = decryptData(envelope, env.ENCRYPTION_SECRET);
      hydrateInMemoryStore(parsed);
      storageEncryptionStatus.lastEncryptedAt = envelope.metadata?.encryptedAt || new Date().toISOString();
      console.log("🔒 ApexCare Encrypted Storage Engine: Successfully loaded and authenticated AES-256-GCM ciphertext.");
      return;
    }

    // 2. Fallback / Migration: If legacy store.json exists, load it and immediately encrypt it
    if (fs.existsSync(LEGACY_PLAINTEXT_FILE)) {
      const raw = fs.readFileSync(LEGACY_PLAINTEXT_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      hydrateInMemoryStore(parsed);
      console.log("🔄 ApexCare Migration: Migrating legacy plaintext storage to HIPAA AES-256-GCM encrypted format...");
      saveStorage();
      return;
    }

    // 3. Otherwise save default seed data in encrypted form
    saveStorage();
  } catch (err) {
    console.error("Failed to initialize encrypted storage:", err);
  }
}

function hydrateInMemoryStore(parsed: any) {
  if (Array.isArray(parsed.users) && parsed.users.length > 0) {
    users.length = 0;
    users.push(...parsed.users);
  }
  if (Array.isArray(parsed.staffMembers) && parsed.staffMembers.length > 0) {
    staffMembers.length = 0;
    staffMembers.push(...parsed.staffMembers);
  }
  if (Array.isArray(parsed.leaveRecords)) {
    leaveRecords.length = 0;
    leaveRecords.push(...parsed.leaveRecords);
  }
  if (Array.isArray(parsed.patients)) {
    patients.length = 0;
    patients.push(...parsed.patients);
  }
  if (Array.isArray(parsed.appointments)) {
    appointments.length = 0;
    appointments.push(...parsed.appointments);
  }
  if (Array.isArray(parsed.medicalRecords)) {
    medicalRecords.length = 0;
    medicalRecords.push(...parsed.medicalRecords);
  }
  if (Array.isArray(parsed.prescriptions)) {
    prescriptions.length = 0;
    prescriptions.push(...parsed.prescriptions);
  }
  if (Array.isArray(parsed.laboratoryTests)) {
    laboratoryTests.length = 0;
    laboratoryTests.push(...parsed.laboratoryTests);
  }
  if (Array.isArray(parsed.bills)) {
    bills.length = 0;
    bills.push(...parsed.bills);
  }
  if (Array.isArray(parsed.auditLogs) && parsed.auditLogs.length > 0) {
    auditLogs.length = 0;
    auditLogs.push(...parsed.auditLogs);
  }
}

export const auditLogs: AuditLog[] = [
  {
    id: "aud-001",
    tenantId: tenant.id,
    userId: "usr-admin-01",
    userName: "Namal Kumara",
    action: "SYSTEM_INITIALIZED",
    resource: "SystemCore",
    recordId: "tenant-apexcare-01",
    ipAddress: "127.0.0.1",
    timestamp: new Date().toISOString(),
  },
];

// Ward Bed Occupancy Data (Initial state: 0 occupied beds)
export const wardBedCensus = {
  totalBeds: 160,
  occupiedBeds: 0,
  occupancyRate: 0,
  wards: [
    { name: "ICU Unit", total: 20, occupied: 0, percentage: 0, status: "Available" },
    { name: "Emergency Triage", total: 28, occupied: 0, percentage: 0, status: "Available" },
    { name: "General Surgical Ward", total: 112, occupied: 0, percentage: 0, status: "Available" },
  ],
};

initStorage();

// Database helper functions
export function logAudit(action: string, resource: string, recordId: string, userId = "usr-admin-01", ipAddress = "127.0.0.1") {
  const user = users.find((u) => u.id === userId);
  auditLogs.unshift({
    id: `aud-${uuidv4().substring(0, 8)}`,
    tenantId: tenant.id,
    userId,
    userName: user ? user.fullName : "Super Administrator",
    action,
    resource,
    recordId,
    ipAddress,
    timestamp: new Date().toISOString(),
  });
}
