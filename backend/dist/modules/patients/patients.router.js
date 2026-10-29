"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patientsRouter = void 0;
const express_1 = require("express");
const store_js_1 = require("../../db/store.js");
const fileUpload_js_1 = require("../../middleware/fileUpload.js");
const realtime_service_js_1 = require("../realtime/realtime.service.js");
exports.patientsRouter = (0, express_1.Router)();
// Get all patients with search & filtering
exports.patientsRouter.get("/", (req, res) => {
    const { search, bloodGroup, gender, doctor } = req.query;
    let filtered = [...store_js_1.patients];
    if (search) {
        const q = search.toLowerCase().trim();
        filtered = filtered.filter((p) => p.firstName.toLowerCase().includes(q) ||
            p.lastName.toLowerCase().includes(q) ||
            p.mrn.toLowerCase().includes(q) ||
            p.contactNumber.includes(q) ||
            (p.email && p.email.toLowerCase().includes(q)) ||
            (p.address && p.address.toLowerCase().includes(q)));
    }
    if (bloodGroup && bloodGroup !== "All") {
        filtered = filtered.filter((p) => p.bloodGroup === bloodGroup);
    }
    if (gender && gender !== "All") {
        filtered = filtered.filter((p) => p.gender.toLowerCase() === gender.toLowerCase());
    }
    if (doctor && doctor !== "All") {
        filtered = filtered.filter((p) => p.assignedDoctor?.toLowerCase().includes(doctor.toLowerCase()));
    }
    return res.json(filtered);
});
// Get patient by ID or MRN
exports.patientsRouter.get("/:id", (req, res) => {
    const id = String(req.params.id);
    const patient = store_js_1.patients.find((p) => p.id === id || p.mrn.toLowerCase() === id.toLowerCase());
    if (!patient) {
        return res.status(404).json({ error: "Patient record not found" });
    }
    const patientRecords = store_js_1.medicalRecords.filter((r) => r.patientId === patient.id);
    const patientPrescriptions = store_js_1.prescriptions.filter((rx) => rx.patientId === patient.id);
    const patientLabs = store_js_1.laboratoryTests.filter((lab) => lab.patientId === patient.id);
    const patientBills = store_js_1.bills.filter((b) => b.patientId === patient.id);
    return res.json({
        ...patient,
        medicalRecords: patientRecords,
        prescriptions: patientPrescriptions,
        laboratoryTests: patientLabs,
        bills: patientBills,
    });
});
// Register new patient
exports.patientsRouter.post("/", (req, res) => {
    const { firstName, lastName, dateOfBirth, gender, bloodGroup, contactNumber, email, address, wardBed, insuranceProvider, emergencyContact, allergies, chronicConditions, assignedDoctor } = req.body;
    if (!firstName || !lastName || !dateOfBirth || !contactNumber) {
        return res.status(400).json({ error: "First name, last name, date of birth, and contact number are required." });
    }
    // Generate unique Medical Record Number (MRN)
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const mrn = `MRN-${randomSuffix}`;
    const birthDate = new Date(dateOfBirth);
    const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    const newPatient = {
        id: `pat-${randomSuffix}`,
        tenantId: "tenant-apexcare-01",
        mrn,
        firstName,
        lastName,
        dateOfBirth,
        age: isNaN(age) ? 30 : age,
        gender: gender || "Unspecified",
        bloodGroup: bloodGroup || "O+",
        contactNumber,
        email: email || "",
        address: address || "Hospital Outpatient Registration",
        wardBed: wardBed || "Outpatient Clinic Area",
        insuranceProvider: insuranceProvider || "Standard Self-Pay",
        insurancePolicyNumber: "N/A",
        preAuthNumber: "N/A",
        emergencyContact: emergencyContact || "Not Provided",
        allergies: Array.isArray(allergies) ? allergies : allergies ? [allergies] : [],
        chronicConditions: Array.isArray(chronicConditions) ? chronicConditions : chronicConditions ? [chronicConditions] : [],
        status: "Registered - Active",
        assignedDoctor: assignedDoctor || "Dr. Kasun Perera, MD",
        createdAt: new Date().toISOString(),
    };
    store_js_1.patients.unshift(newPatient);
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("patients", "create", newPatient);
    (0, store_js_1.logAudit)("PATIENT_REGISTERED", "Patient", newPatient.id, req.user?.id || "usr-reception-01", req.ip);
    return res.status(201).json(newPatient);
});
// Update patient details
exports.patientsRouter.put("/:id", (req, res) => {
    const id = String(req.params.id);
    const index = store_js_1.patients.findIndex((p) => p.id === id || p.mrn.toLowerCase() === id.toLowerCase());
    if (index === -1) {
        return res.status(404).json({ error: "Patient not found" });
    }
    const updated = {
        ...store_js_1.patients[index],
        ...req.body,
    };
    store_js_1.patients[index] = updated;
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("patients", "update", updated);
    (0, store_js_1.logAudit)("PATIENT_UPDATED", "Patient", updated.id, req.user?.id || "usr-rec-01", req.ip);
    return res.json(updated);
});
// Delete patient record
exports.patientsRouter.delete("/:id", (req, res) => {
    const id = String(req.params.id);
    const index = store_js_1.patients.findIndex((p) => p.id === id || p.mrn.toLowerCase() === id.toLowerCase());
    if (index === -1) {
        return res.status(404).json({ error: "Patient record not found" });
    }
    const deleted = store_js_1.patients[index];
    store_js_1.patients.splice(index, 1);
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("patients", "delete", deleted);
    (0, store_js_1.logAudit)("PATIENT_DELETED", "Patient", deleted.id, req.user?.id || "usr-admin-01", req.ip);
    return res.json({
        success: true,
        message: `Patient ${deleted.firstName} ${deleted.lastName} (${deleted.mrn}) was successfully deleted.`,
        deletedId: deleted.id,
    });
});
// File upload for patient medical document (with magic-bytes validation)
exports.patientsRouter.post("/:id/upload", fileUpload_js_1.processMedicalFileUpload, (req, res) => {
    const id = String(req.params.id);
    const file = req.file;
    if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
    }
    (0, store_js_1.logAudit)("FILE_UPLOADED", "MedicalDocument", id, req.user?.id || "usr-admin-01", req.ip);
    return res.status(201).json({
        message: "Medical document authenticated and securely vaulted",
        filename: file.originalname,
        mimetype: file.mimetype,
        sizeBytes: file.size,
        vaultUrl: `https://vault.apexcare.internal/documents/${id}/${encodeURIComponent(file.originalname)}`,
        uploadedAt: new Date().toISOString(),
    });
});
