"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emrRouter = void 0;
const express_1 = require("express");
const uuid_1 = require("uuid");
const store_js_1 = require("../../db/store.js");
const sanitizer_js_1 = require("../../utils/sanitizer.js");
const realtime_service_js_1 = require("../realtime/realtime.service.js");
exports.emrRouter = (0, express_1.Router)();
// Get patient's full EMR profile
exports.emrRouter.get("/:patientId", (req, res) => {
    const patientId = String(req.params.patientId);
    const patient = store_js_1.patients.find((p) => p.id === patientId || p.mrn.toLowerCase() === patientId.toLowerCase());
    if (!patient) {
        return res.status(404).json({ error: "Patient record not found" });
    }
    const patientRecords = store_js_1.medicalRecords.filter((r) => r.patientId === patient.id);
    const patientPrescriptions = store_js_1.prescriptions.filter((rx) => rx.patientId === patient.id);
    const patientLabs = store_js_1.laboratoryTests.filter((lab) => lab.patientId === patient.id);
    return res.json({
        patient,
        medicalRecords: patientRecords,
        prescriptions: patientPrescriptions,
        laboratoryTests: patientLabs,
        uploadedDocuments: [],
    });
});
// Create clinical consultation entry (SOAP notes + ICD classification)
exports.emrRouter.post("/consultation", (req, res) => {
    const parseResult = sanitizer_js_1.CreateConsultationSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: "Validation failed", details: parseResult.error.format() });
    }
    const { patientId, diagnosis, clinicalNotes, icdCode, treatmentHistory } = parseResult.data;
    const patient = store_js_1.patients.find((p) => p.id === patientId || p.mrn.toLowerCase() === patientId.toLowerCase());
    if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
    }
    const user = req.user || { id: "usr-doc-01", fullName: "Dr. Marcus Chen" };
    // Anti-XSS DOMPurify sanitization
    const cleanClinicalNotes = (0, sanitizer_js_1.sanitizeRichText)(clinicalNotes);
    const cleanDiagnosis = (0, sanitizer_js_1.sanitizeRichText)(diagnosis);
    const newRecord = {
        id: `rec-${(0, uuid_1.v4)().substring(0, 8)}`,
        tenantId: "tenant-apexcare-01",
        patientId: patient.id,
        doctorId: user.id,
        doctorName: user.fullName || "Attending Physician",
        visitDate: new Date().toISOString(),
        diagnosis: cleanDiagnosis,
        icdCode: icdCode || "Z00.00",
        treatmentHistory: treatmentHistory ? (0, sanitizer_js_1.sanitizeRichText)(treatmentHistory) : "Standard clinical review and monitoring.",
        clinicalNotes: cleanClinicalNotes,
    };
    store_js_1.medicalRecords.unshift(newRecord);
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("emr", "consultation", newRecord);
    (0, store_js_1.logAudit)("EMR_CONSULTATION_CREATED", "MedicalRecord", newRecord.id, user.id, req.ip);
    return res.status(201).json(newRecord);
});
// Update consultation note
exports.emrRouter.put("/consultation/:id", (req, res) => {
    const id = String(req.params.id);
    const index = store_js_1.medicalRecords.findIndex((r) => r.id === id);
    if (index === -1) {
        return res.status(404).json({ error: "Consultation record not found" });
    }
    const current = store_js_1.medicalRecords[index];
    const { diagnosis, clinicalNotes, icdCode, treatmentHistory } = req.body;
    const updatedRecord = {
        ...current,
        diagnosis: diagnosis ? (0, sanitizer_js_1.sanitizeRichText)(diagnosis) : current.diagnosis,
        clinicalNotes: clinicalNotes ? (0, sanitizer_js_1.sanitizeRichText)(clinicalNotes) : current.clinicalNotes,
        icdCode: icdCode !== undefined ? icdCode : current.icdCode,
        treatmentHistory: treatmentHistory !== undefined ? (0, sanitizer_js_1.sanitizeRichText)(treatmentHistory) : current.treatmentHistory,
    };
    store_js_1.medicalRecords[index] = updatedRecord;
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("emr", "update", updatedRecord);
    (0, store_js_1.logAudit)("EMR_CONSULTATION_UPDATED", "MedicalRecord", updatedRecord.id, req.user?.id || "usr-doc-01", req.ip);
    return res.json(updatedRecord);
});
// Delete consultation note
exports.emrRouter.delete("/consultation/:id", (req, res) => {
    const id = String(req.params.id);
    const index = store_js_1.medicalRecords.findIndex((r) => r.id === id);
    if (index === -1) {
        return res.status(404).json({ error: "Consultation record not found" });
    }
    const deleted = store_js_1.medicalRecords[index];
    store_js_1.medicalRecords.splice(index, 1);
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("emr", "delete", deleted);
    (0, store_js_1.logAudit)("EMR_CONSULTATION_DELETED", "MedicalRecord", deleted.id, req.user?.id || "usr-doc-01", req.ip);
    return res.json({
        success: true,
        message: `Consultation note ${deleted.id} deleted.`,
        deletedId: deleted.id,
    });
});
// Prescribe medications
exports.emrRouter.post("/prescribe", (req, res) => {
    const { patientId, items } = req.body;
    const patient = store_js_1.patients.find((p) => p.id === patientId || p.mrn.toLowerCase() === patientId.toLowerCase());
    if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "At least one prescription item is required" });
    }
    const user = req.user || { id: "usr-doc-01", fullName: "Dr. Marcus Chen" };
    const newRx = {
        id: `rx-${(0, uuid_1.v4)().substring(0, 8)}`,
        recordId: "rec-01",
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        doctorId: user.id,
        doctorName: user.fullName || "Attending Physician",
        prescriptionDate: new Date().toISOString(),
        status: "Pending",
        items: items.map((item, idx) => ({
            id: `rxi-${(0, uuid_1.v4)().substring(0, 8)}-${idx}`,
            itemId: item.itemId || `med-${idx + 1}`,
            medicineName: item.medicineName,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration || "30 Days",
            quantity: item.quantity || 30,
            unitPrice: item.unitPrice || 15.0,
            status: "Pending Pharmacy",
        })),
    };
    store_js_1.prescriptions.unshift(newRx);
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("emr", "prescribe", newRx);
    (0, realtime_service_js_1.notifyChange)("pharmacy", "dispensing_queue", newRx);
    (0, store_js_1.logAudit)("PRESCRIPTION_ISSUED", "Prescription", newRx.id, user.id, req.ip);
    return res.status(201).json(newRx);
});
// Order diagnostic laboratory test
exports.emrRouter.post("/order-lab", (req, res) => {
    const { patientId, testName, isStatUrgent, charge } = req.body;
    const patient = store_js_1.patients.find((p) => p.id === patientId || p.mrn.toLowerCase() === patientId.toLowerCase());
    if (!patient || !testName) {
        return res.status(400).json({ error: "Valid patient and test name are required" });
    }
    const user = req.user || { id: "usr-doc-01", fullName: "Dr. Marcus Chen" };
    const newLabOrder = {
        id: `lab-${(0, uuid_1.v4)().substring(0, 8)}`,
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        patientMrn: patient.mrn,
        doctorId: user.id,
        doctorName: user.fullName || "Attending Physician",
        testName,
        sampleStatus: "Requested",
        isStatUrgent: Boolean(isStatUrgent),
        charge: charge || 85.0,
        createdAt: new Date().toISOString(),
        completedAt: null,
        resultData: null,
    };
    store_js_1.laboratoryTests.unshift(newLabOrder);
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("emr", "order-lab", newLabOrder);
    (0, realtime_service_js_1.notifyChange)("laboratory", "create", newLabOrder);
    (0, store_js_1.logAudit)("LAB_ORDER_SUBMITTED", "LaboratoryTest", newLabOrder.id, user.id, req.ip);
    return res.status(201).json(newLabOrder);
});
