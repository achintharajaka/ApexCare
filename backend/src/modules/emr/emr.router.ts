import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { patients, medicalRecords, prescriptions, laboratoryTests, logAudit, saveStorage } from "../../db/store.js";
import { sanitizeRichText, CreateConsultationSchema } from "../../utils/sanitizer.js";
import { notifyChange } from "../realtime/realtime.service.js";

export const emrRouter = Router();

// Get patient's full EMR profile
emrRouter.get("/:patientId", (req: Request, res: Response) => {
  const patientId = String(req.params.patientId);
  const patient = patients.find((p) => p.id === patientId || p.mrn.toLowerCase() === patientId.toLowerCase());

  if (!patient) {
    return res.status(404).json({ error: "Patient record not found" });
  }

  const patientRecords = medicalRecords.filter((r) => r.patientId === patient.id);
  const patientPrescriptions = prescriptions.filter((rx) => rx.patientId === patient.id);
  const patientLabs = laboratoryTests.filter((lab) => lab.patientId === patient.id);

  return res.json({
    patient,
    medicalRecords: patientRecords,
    prescriptions: patientPrescriptions,
    laboratoryTests: patientLabs,
    uploadedDocuments: [],
  });
});

// Create clinical consultation entry (SOAP notes + ICD classification)
emrRouter.post("/consultation", (req: Request, res: Response) => {
  const parseResult = CreateConsultationSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Validation failed", details: parseResult.error.format() });
  }

  const { patientId, diagnosis, clinicalNotes, icdCode, treatmentHistory } = parseResult.data;
  const patient = patients.find((p) => p.id === patientId || p.mrn.toLowerCase() === patientId.toLowerCase());

  if (!patient) {
    return res.status(404).json({ error: "Patient not found" });
  }

  const user = (req as any).user || { id: "usr-doc-01", fullName: "Dr. Marcus Chen" };

  // Anti-XSS DOMPurify sanitization
  const cleanClinicalNotes = sanitizeRichText(clinicalNotes);
  const cleanDiagnosis = sanitizeRichText(diagnosis);

  const newRecord = {
    id: `rec-${uuidv4().substring(0, 8)}`,
    tenantId: "tenant-apexcare-01",
    patientId: patient.id,
    doctorId: user.id,
    doctorName: user.fullName || "Attending Physician",
    visitDate: new Date().toISOString(),
    diagnosis: cleanDiagnosis,
    icdCode: icdCode || "Z00.00",
    treatmentHistory: treatmentHistory ? sanitizeRichText(treatmentHistory) : "Standard clinical review and monitoring.",
    clinicalNotes: cleanClinicalNotes,
  };

  medicalRecords.unshift(newRecord);
  saveStorage();
  notifyChange("emr", "consultation", newRecord);
  logAudit("EMR_CONSULTATION_CREATED", "MedicalRecord", newRecord.id, user.id, req.ip);

  return res.status(201).json(newRecord);
});

// Update consultation note
emrRouter.put("/consultation/:id", (req: Request, res: Response) => {
  const id = String(req.params.id);
  const index = medicalRecords.findIndex((r) => r.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Consultation record not found" });
  }

  const current = medicalRecords[index];
  const { diagnosis, clinicalNotes, icdCode, treatmentHistory } = req.body;

  const updatedRecord = {
    ...current,
    diagnosis: diagnosis ? sanitizeRichText(diagnosis) : current.diagnosis,
    clinicalNotes: clinicalNotes ? sanitizeRichText(clinicalNotes) : current.clinicalNotes,
    icdCode: icdCode !== undefined ? icdCode : current.icdCode,
    treatmentHistory: treatmentHistory !== undefined ? sanitizeRichText(treatmentHistory) : current.treatmentHistory,
  };

  medicalRecords[index] = updatedRecord;
  saveStorage();
  notifyChange("emr", "update", updatedRecord);
  logAudit("EMR_CONSULTATION_UPDATED", "MedicalRecord", updatedRecord.id, (req as any).user?.id || "usr-doc-01", req.ip);

  return res.json(updatedRecord);
});

// Delete consultation note
emrRouter.delete("/consultation/:id", (req: Request, res: Response) => {
  const id = String(req.params.id);
  const index = medicalRecords.findIndex((r) => r.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Consultation record not found" });
  }

  const deleted = medicalRecords[index];
  medicalRecords.splice(index, 1);
  saveStorage();
  notifyChange("emr", "delete", deleted);
  logAudit("EMR_CONSULTATION_DELETED", "MedicalRecord", deleted.id, (req as any).user?.id || "usr-doc-01", req.ip);

  return res.json({
    success: true,
    message: `Consultation note ${deleted.id} deleted.`,
    deletedId: deleted.id,
  });
});

// Prescribe medications
emrRouter.post("/prescribe", (req: Request, res: Response) => {
  const { patientId, items } = req.body;
  const patient = patients.find((p) => p.id === patientId || p.mrn.toLowerCase() === patientId.toLowerCase());

  if (!patient) {
    return res.status(404).json({ error: "Patient not found" });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "At least one prescription item is required" });
  }

  const user = (req as any).user || { id: "usr-doc-01", fullName: "Dr. Marcus Chen" };

  const newRx = {
    id: `rx-${uuidv4().substring(0, 8)}`,
    recordId: "rec-01",
    patientId: patient.id,
    patientName: `${patient.firstName} ${patient.lastName}`,
    doctorId: user.id,
    doctorName: user.fullName || "Attending Physician",
    prescriptionDate: new Date().toISOString(),
    status: "Pending",
    items: items.map((item: any, idx: number) => ({
      id: `rxi-${uuidv4().substring(0, 8)}-${idx}`,
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

  prescriptions.unshift(newRx);
  saveStorage();
  notifyChange("emr", "prescribe", newRx);
  notifyChange("pharmacy", "dispensing_queue", newRx);
  logAudit("PRESCRIPTION_ISSUED", "Prescription", newRx.id, user.id, req.ip);

  return res.status(201).json(newRx);
});

// Order diagnostic laboratory test
emrRouter.post("/order-lab", (req: Request, res: Response) => {
  const { patientId, testName, isStatUrgent, charge } = req.body;
  const patient = patients.find((p) => p.id === patientId || p.mrn.toLowerCase() === patientId.toLowerCase());

  if (!patient || !testName) {
    return res.status(400).json({ error: "Valid patient and test name are required" });
  }

  const user = (req as any).user || { id: "usr-doc-01", fullName: "Dr. Marcus Chen" };

  const newLabOrder = {
    id: `lab-${uuidv4().substring(0, 8)}`,
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

  laboratoryTests.unshift(newLabOrder);
  saveStorage();
  notifyChange("emr", "order-lab", newLabOrder);
  notifyChange("laboratory", "create", newLabOrder);
  logAudit("LAB_ORDER_SUBMITTED", "LaboratoryTest", newLabOrder.id, user.id, req.ip);

  return res.status(201).json(newLabOrder);
});
