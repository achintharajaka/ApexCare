"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wardBedCensus = exports.auditLogs = exports.storageEncryptionStatus = exports.leaveRecords = exports.staffMembers = exports.bills = exports.laboratoryTests = exports.pharmacyInventory = exports.prescriptions = exports.medicalRecords = exports.appointments = exports.patients = exports.users = exports.defaultDoctors = exports.hospitalShiftConfig = exports.tenant = void 0;
exports.saveStorage = saveStorage;
exports.normalizeDoctorName = normalizeDoctorName;
exports.logAudit = logAudit;
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const crypto_js_1 = require("./crypto.js");
const env_js_1 = require("../config/env.js");
// Master Tenant
exports.tenant = {
    id: "tenant-apexcare-01",
    name: "ApexCare Health Network",
    slug: "apexcare-main",
    createdAt: new Date().toISOString(),
};
exports.hospitalShiftConfig = {
    morning: { name: "Morning Shift", hours: "08:00 - 16:00", startHour: 8, endHour: 16 },
    evening: { name: "Evening Shift", hours: "16:00 - 00:00", startHour: 16, endHour: 24 },
    night: { name: "Night Shift", hours: "00:00 - 08:00", startHour: 0, endHour: 8 },
    activeOverride: null,
};
// Core hospital attending physicians guaranteed across departments
exports.defaultDoctors = [
    {
        user: {
            id: "usr-doctor-01",
            tenantId: exports.tenant.id,
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
        staff: {
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
    },
    {
        user: {
            id: "usr-doctor-02",
            tenantId: exports.tenant.id,
            username: "doctor2",
            passwordHash: "$2a$10$LOyhQ7OQTxoaL.nVS6NTV.PWDtboIxmVgmELvtAwDzwuewe1MzB/S",
            fullName: "Dr. Ruwan Gunawardena, MD",
            email: "dr.ruwan@apexcare.lk",
            role: "DOCTOR",
            isActive: true,
            jobTitle: "Consultant Cardiologist",
            department: "Cardiology & Internal Medicine",
            roomNumber: "Consultation Suite 205",
            consultationFee: 2500,
            specialization: "Cardiology & Preventive Medicine",
        },
        staff: {
            id: "usr-doctor-02",
            employeeId: "EMP-008",
            fullName: "Dr. Ruwan Gunawardena, MD",
            role: "DOCTOR",
            department: "Cardiology & Internal Medicine",
            jobTitle: "Consultant Cardiologist",
            phoneNumber: "+94 77 234 5678",
            attendanceStatus: "Present",
            shift: "Day Clinical Shift (08:00 - 16:00)",
            email: "dr.ruwan@apexcare.lk",
            joiningDate: "2024-02-10",
            specialization: "Cardiology & Preventive Medicine",
            roomNumber: "Consultation Suite 205",
            consultationFee: 2500,
        },
    },
    {
        user: {
            id: "usr-doctor-03",
            tenantId: exports.tenant.id,
            username: "doctor3",
            passwordHash: "$2a$10$LOyhQ7OQTxoaL.nVS6NTV.PWDtboIxmVgmELvtAwDzwuewe1MzB/S",
            fullName: "Dr. Arthur Vance, MS, FRCS",
            email: "dr.arthur@apexcare.lk",
            role: "DOCTOR",
            isActive: true,
            jobTitle: "Consultant General & Laparoscopic Surgeon",
            department: "General Surgery",
            roomNumber: "Surgical Suite 301",
            consultationFee: 3000,
            specialization: "General & Minimally Invasive Surgery",
        },
        staff: {
            id: "usr-doctor-03",
            employeeId: "EMP-009",
            fullName: "Dr. Arthur Vance, MS, FRCS",
            role: "DOCTOR",
            department: "General Surgery",
            jobTitle: "Consultant General & Laparoscopic Surgeon",
            phoneNumber: "+94 77 345 6789",
            attendanceStatus: "Present",
            shift: "Day Clinical Shift (08:00 - 16:00)",
            email: "dr.arthur@apexcare.lk",
            joiningDate: "2024-03-01",
            specialization: "General & Minimally Invasive Surgery",
            roomNumber: "Surgical Suite 301",
            consultationFee: 3000,
        },
    },
    {
        user: {
            id: "usr-doctor-04",
            tenantId: exports.tenant.id,
            username: "doctor4",
            passwordHash: "$2a$10$LOyhQ7OQTxoaL.nVS6NTV.PWDtboIxmVgmELvtAwDzwuewe1MzB/S",
            fullName: "Dr. Anura Senanayake, MD, FRCP",
            email: "dr.anura@apexcare.lk",
            role: "DOCTOR",
            isActive: true,
            jobTitle: "Consultant Intensivist & Critical Care Specialist",
            department: "Inpatient Care & ICU",
            roomNumber: "ICU Consultation Suite 202",
            consultationFee: 3500,
            specialization: "Critical Care Medicine & Intensive Care",
        },
        staff: {
            id: "usr-doctor-04",
            employeeId: "EMP-010",
            fullName: "Dr. Anura Senanayake, MD, FRCP",
            role: "DOCTOR",
            department: "Inpatient Care & ICU",
            jobTitle: "Consultant Intensivist & Critical Care Specialist",
            phoneNumber: "+94 77 456 7890",
            attendanceStatus: "Present",
            shift: "Day Clinical Shift (08:00 - 16:00)",
            email: "dr.anura@apexcare.lk",
            joiningDate: "2024-03-15",
            specialization: "Critical Care Medicine & Intensive Care",
            roomNumber: "ICU Consultation Suite 202",
            consultationFee: 3500,
        },
    },
    {
        user: {
            id: "usr-doctor-05",
            tenantId: exports.tenant.id,
            username: "doctor5",
            passwordHash: "$2a$10$LOyhQ7OQTxoaL.nVS6NTV.PWDtboIxmVgmELvtAwDzwuewe1MzB/S",
            fullName: "Dr. Malini Jayasundara, MD",
            email: "dr.malini@apexcare.lk",
            role: "DOCTOR",
            isActive: true,
            jobTitle: "Consultant Pediatrician",
            department: "Pediatrics & Child Health",
            roomNumber: "Pediatric Clinic 105",
            consultationFee: 2500,
            specialization: "Pediatric Medicine & Child Development",
        },
        staff: {
            id: "usr-doctor-05",
            employeeId: "EMP-011",
            fullName: "Dr. Malini Jayasundara, MD",
            role: "DOCTOR",
            department: "Pediatrics & Child Health",
            jobTitle: "Consultant Pediatrician",
            phoneNumber: "+94 77 567 8901",
            attendanceStatus: "Present",
            shift: "Day Clinical Shift (08:00 - 16:00)",
            email: "dr.malini@apexcare.lk",
            joiningDate: "2024-04-01",
            specialization: "Pediatric Medicine & Child Development",
            roomNumber: "Pediatric Clinic 105",
            consultationFee: 2500,
        },
    },
];
// Configured accounts for each hospital role with verified bcrypt password hashes (Sri Lankan Healthcare Context)
exports.users = [
    {
        id: "usr-admin-01",
        tenantId: exports.tenant.id,
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
    ...exports.defaultDoctors.map((d) => d.user),
    {
        id: "usr-nurse-01",
        tenantId: exports.tenant.id,
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
        tenantId: exports.tenant.id,
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
        tenantId: exports.tenant.id,
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
        tenantId: exports.tenant.id,
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
        tenantId: exports.tenant.id,
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
exports.patients = [];
exports.appointments = [];
exports.medicalRecords = [];
exports.prescriptions = [];
exports.pharmacyInventory = [];
exports.laboratoryTests = [];
exports.bills = [];
// Configured staff members corresponding to each hospital operational account
exports.staffMembers = [
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
exports.leaveRecords = [];
// Persistent AES-256-GCM Encrypted Storage Mechanism (HIPAA & ISO 27001 Compliant)
// On Render.com, supports persistent disk mounts (via DATA_DIR) or local/container storage.
// In serverless environments (Vercel, AWS Lambda), uses writable /tmp directory or falls back gracefully to in-memory state.
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
const isRender = Boolean(process.env.RENDER);
function resolveDataDir() {
    // 1. Explicit custom data directory (e.g. Render Persistent Disk: /var/data)
    if (process.env.DATA_DIR) {
        return path_1.default.resolve(process.env.DATA_DIR);
    }
    // 2. Serverless ephemeral environments (Vercel, AWS Lambda)
    if (isServerless) {
        return path_1.default.join(os_1.default.tmpdir(), "apexcare_hms_data");
    }
    // 3. Render / Container / Local execution
    const backendData = path_1.default.resolve(process.cwd(), "backend", "data");
    if (fs_1.default.existsSync(backendData)) {
        return backendData;
    }
    const rootData = path_1.default.resolve(process.cwd(), "data");
    if (fs_1.default.existsSync(rootData)) {
        return rootData;
    }
    return path_1.default.resolve(process.cwd(), "data");
}
const BASE_DATA_DIR = resolveDataDir();
const ENCRYPTED_FILE = path_1.default.join(BASE_DATA_DIR, "store.enc");
const LEGACY_PLAINTEXT_FILE = path_1.default.join(BASE_DATA_DIR, "store.json");
exports.storageEncryptionStatus = {
    standard: "HIPAA-45CFR164.312-ISO27001-NIST-SP800-38D",
    cipher: "aes-256-gcm",
    authenticated: true,
    lastEncryptedAt: new Date().toISOString(),
    environment: isRender ? "Render.com Web Service" : isServerless ? "Vercel / Serverless" : "Standard Host",
};
function saveStorage() {
    try {
        if (!fs_1.default.existsSync(BASE_DATA_DIR)) {
            try {
                fs_1.default.mkdirSync(BASE_DATA_DIR, { recursive: true });
            }
            catch (dirErr) {
                console.warn("Storage warning: Could not create persistent directory in serverless environment:", dirErr);
                return;
            }
        }
        const payload = {
            users: exports.users,
            staffMembers: exports.staffMembers,
            leaveRecords: exports.leaveRecords,
            patients: exports.patients,
            appointments: exports.appointments,
            medicalRecords: exports.medicalRecords,
            prescriptions: exports.prescriptions,
            laboratoryTests: exports.laboratoryTests,
            bills: exports.bills,
            auditLogs: exports.auditLogs,
            hospitalShiftConfig: exports.hospitalShiftConfig,
        };
        // Encrypt using international standard AES-256-GCM
        const encryptedEnvelope = (0, crypto_js_1.encryptData)(payload, env_js_1.env.ENCRYPTION_SECRET);
        fs_1.default.writeFileSync(ENCRYPTED_FILE, JSON.stringify(encryptedEnvelope, null, 2), "utf-8");
        exports.storageEncryptionStatus.lastEncryptedAt = encryptedEnvelope.metadata.encryptedAt;
        // In production or if legacy plaintext exists, remove plaintext file to prevent unauthorized disk snooping
        if (fs_1.default.existsSync(LEGACY_PLAINTEXT_FILE) && env_js_1.env.NODE_ENV === "production") {
            try {
                fs_1.default.unlinkSync(LEGACY_PLAINTEXT_FILE);
            }
            catch (_) { }
        }
    }
    catch (err) {
        console.error("Failed to persist encrypted storage:", err);
    }
}
function initStorage() {
    try {
        if (!fs_1.default.existsSync(BASE_DATA_DIR)) {
            try {
                fs_1.default.mkdirSync(BASE_DATA_DIR, { recursive: true });
            }
            catch (_) { }
        }
        const DEFAULT_FALLBACK_KEY = "apexcare-aes-256-gcm-master-encryption-key-32-chars-2026";
        // 1. Try reading standard AES-256-GCM encrypted envelope
        if (fs_1.default.existsSync(ENCRYPTED_FILE)) {
            try {
                const raw = fs_1.default.readFileSync(ENCRYPTED_FILE, "utf-8");
                const envelope = JSON.parse(raw);
                let parsed = null;
                try {
                    // Attempt decrypt with current instance key
                    parsed = (0, crypto_js_1.decryptData)(envelope, env_js_1.env.ENCRYPTION_SECRET);
                }
                catch (decryptErr) {
                    // If instance key differs (e.g. Render generated a random key), try fallback seed key
                    if (env_js_1.env.ENCRYPTION_SECRET !== DEFAULT_FALLBACK_KEY) {
                        console.log("🔄 Re-keying encrypted storage with current instance ENCRYPTION_SECRET...");
                        parsed = (0, crypto_js_1.decryptData)(envelope, DEFAULT_FALLBACK_KEY);
                        hydrateInMemoryStore(parsed);
                        saveStorage();
                        console.log("🔒 Storage successfully re-encrypted and authenticated with instance master key.");
                        return;
                    }
                    throw decryptErr;
                }
                if (parsed) {
                    hydrateInMemoryStore(parsed);
                    exports.storageEncryptionStatus.lastEncryptedAt = envelope.metadata?.encryptedAt || new Date().toISOString();
                    console.log("🔒 ApexCare Encrypted Storage Engine: Successfully loaded and authenticated AES-256-GCM ciphertext.");
                    return;
                }
            }
            catch (err) {
                console.warn("Notice: Encrypted envelope could not be decrypted with active keys, checking fallback store.json:", err);
            }
        }
        // 2. Fallback / Migration: If legacy store.json exists, load it and immediately encrypt it
        if (fs_1.default.existsSync(LEGACY_PLAINTEXT_FILE)) {
            const raw = fs_1.default.readFileSync(LEGACY_PLAINTEXT_FILE, "utf-8");
            const parsed = JSON.parse(raw);
            hydrateInMemoryStore(parsed);
            console.log("🔄 ApexCare Migration: Migrating legacy plaintext storage to HIPAA AES-256-GCM encrypted format...");
            saveStorage();
            return;
        }
        // 3. Otherwise save default seed data in encrypted form
        saveStorage();
    }
    catch (err) {
        console.error("Failed to initialize encrypted storage:", err);
    }
}
function normalizeDoctorName(name) {
    if (!name)
        return "";
    return name
        .toLowerCase()
        .replace(/,\s*(md|mbbs|ms|frcs|frcp|frcpath|bpharm|rn|aca|facc).*/gi, "")
        .replace(/^dr\.\s*|^dr\s*/gi, "")
        .replace(/\s+/g, " ")
        .trim();
}
function hydrateInMemoryStore(parsed) {
    if (Array.isArray(parsed.users) && parsed.users.length > 0) {
        exports.users.length = 0;
        exports.users.push(...parsed.users);
    }
    if (Array.isArray(parsed.staffMembers) && parsed.staffMembers.length > 0) {
        exports.staffMembers.length = 0;
        exports.staffMembers.push(...parsed.staffMembers);
    }
    if (Array.isArray(parsed.leaveRecords)) {
        exports.leaveRecords.length = 0;
        exports.leaveRecords.push(...parsed.leaveRecords);
    }
    if (Array.isArray(parsed.patients)) {
        exports.patients.length = 0;
        exports.patients.push(...parsed.patients);
    }
    if (Array.isArray(parsed.appointments)) {
        exports.appointments.length = 0;
        exports.appointments.push(...parsed.appointments);
    }
    if (Array.isArray(parsed.medicalRecords)) {
        exports.medicalRecords.length = 0;
        exports.medicalRecords.push(...parsed.medicalRecords);
    }
    if (Array.isArray(parsed.prescriptions)) {
        exports.prescriptions.length = 0;
        exports.prescriptions.push(...parsed.prescriptions);
    }
    if (Array.isArray(parsed.laboratoryTests)) {
        exports.laboratoryTests.length = 0;
        exports.laboratoryTests.push(...parsed.laboratoryTests);
    }
    if (Array.isArray(parsed.bills)) {
        exports.bills.length = 0;
        exports.bills.push(...parsed.bills);
    }
    if (Array.isArray(parsed.auditLogs) && parsed.auditLogs.length > 0) {
        exports.auditLogs.length = 0;
        exports.auditLogs.push(...parsed.auditLogs);
    }
    if (parsed.hospitalShiftConfig) {
        Object.assign(exports.hospitalShiftConfig, parsed.hospitalShiftConfig);
    }
    // Ensure all hospital attending physicians are consistently present in users & staffMembers without duplicates
    for (const docEntry of exports.defaultDoctors) {
        const normTarget = normalizeDoctorName(docEntry.user.fullName);
        const existingUserIdx = exports.users.findIndex((u) => normalizeDoctorName(u.fullName) === normTarget ||
            (u.username && u.username === docEntry.user.username));
        if (existingUserIdx === -1) {
            exports.users.push(docEntry.user);
        }
        else {
            // Standardize title and info while retaining existing account id
            exports.users[existingUserIdx] = {
                ...docEntry.user,
                id: exports.users[existingUserIdx].id,
            };
        }
        const existingStaffIdx = exports.staffMembers.findIndex((s) => normalizeDoctorName(s.fullName) === normTarget ||
            (s.employeeId && s.employeeId === docEntry.staff.employeeId));
        if (existingStaffIdx === -1) {
            exports.staffMembers.push(docEntry.staff);
        }
        else {
            exports.staffMembers[existingStaffIdx] = {
                ...docEntry.staff,
                id: exports.staffMembers[existingStaffIdx].id,
            };
        }
    }
    // Deduplicate users by normalized doctor name and username
    const seenUserKeys = new Set();
    const dedupedUsers = [];
    for (const u of exports.users) {
        const key = u.role === "DOCTOR" ? `doc:${normalizeDoctorName(u.fullName)}` : `user:${u.username.toLowerCase()}`;
        if (!seenUserKeys.has(key)) {
            seenUserKeys.add(key);
            dedupedUsers.push(u);
        }
    }
    exports.users.length = 0;
    exports.users.push(...dedupedUsers);
    // Deduplicate staffMembers by normalized doctor name and employeeId
    const seenStaffKeys = new Set();
    const dedupedStaff = [];
    for (const s of exports.staffMembers) {
        const key = s.role === "DOCTOR" ? `doc:${normalizeDoctorName(s.fullName)}` : `staff:${s.employeeId}`;
        if (!seenStaffKeys.has(key)) {
            seenStaffKeys.add(key);
            dedupedStaff.push(s);
        }
    }
    exports.staffMembers.length = 0;
    exports.staffMembers.push(...dedupedStaff);
}
exports.auditLogs = [
    {
        id: "aud-001",
        tenantId: exports.tenant.id,
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
exports.wardBedCensus = {
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
function logAudit(action, resource, recordId, userId = "usr-admin-01", ipAddress = "127.0.0.1") {
    const user = exports.users.find((u) => u.id === userId);
    exports.auditLogs.unshift({
        id: `aud-${(0, uuid_1.v4)().substring(0, 8)}`,
        tenantId: exports.tenant.id,
        userId,
        userName: user ? user.fullName : "Super Administrator",
        action,
        resource,
        recordId,
        ipAddress,
        timestamp: new Date().toISOString(),
    });
}
