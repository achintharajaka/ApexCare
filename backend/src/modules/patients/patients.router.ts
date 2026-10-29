import { Router, Request, Response } from "express";
import { patients, medicalRecords, prescriptions, laboratoryTests, bills, logAudit, saveStorage } from "../../db/store.js";
import { processMedicalFileUpload } from "../../middleware/fileUpload.js";
import { notifyChange } from "../realtime/realtime.service.js";

export const patientsRouter = Router();

// Get all patients with search & filtering
patientsRouter.get("/", (req: Request, res: Response) => {
  const { search, bloodGroup, gender, doctor } = req.query;

  let filtered = [...patients];

  if (search) {
    const q = (search as string).toLowerCase().trim();
    filtered = filtered.filter(
      (p) =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        p.contactNumber.includes(q) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.address && p.address.toLowerCase().includes(q))
    );
  }

  if (bloodGroup && bloodGroup !== "All") {
    filtered = filtered.filter((p) => p.bloodGroup === bloodGroup);
  }

  if (gender && gender !== "All") {
    filtered = filtered.filter((p) => p.gender.toLowerCase() === (gender as string).toLowerCase());
  }

  if (doctor && doctor !== "All") {
    filtered = filtered.filter((p) => p.assignedDoctor?.toLowerCase().includes((doctor as string).toLowerCase()));
  }

  return res.json(filtered);
});

// Get patient by ID or MRN
patientsRouter.get("/:id", (req: Request, res: Response) => {
  const id = String(req.params.id);
  const patient = patients.find((p) => p.id === id || p.mrn.toLowerCase() === id.toLowerCase());

  if (!patient) {
    return res.status(404).json({ error: "Patient record not found" });
  }

  const patientRecords = medicalRecords.filter((r) => r.patientId === patient.id);
  const patientPrescriptions = prescriptions.filter((rx) => rx.patientId === patient.id);
  const patientLabs = laboratoryTests.filter((lab) => lab.patientId === patient.id);
  const patientBills = bills.filter((b) => b.patientId === patient.id);

  return res.json({
    ...patient,
    medicalRecords: patientRecords,
    prescriptions: patientPrescriptions,
    laboratoryTests: patientLabs,
    bills: patientBills,
  });
});

// Register new patient
patientsRouter.post("/", (req: Request, res: Response) => {
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

  patients.unshift(newPatient);
  saveStorage();
  notifyChange("patients", "create", newPatient);
  logAudit("PATIENT_REGISTERED", "Patient", newPatient.id, (req as any).user?.id || "usr-reception-01", req.ip);

  return res.status(201).json(newPatient);
});

// Update patient details
patientsRouter.put("/:id", (req: Request, res: Response) => {
  const id = String(req.params.id);
  const index = patients.findIndex((p) => p.id === id || p.mrn.toLowerCase() === id.toLowerCase());

  if (index === -1) {
    return res.status(404).json({ error: "Patient not found" });
  }

  const updated = {
    ...patients[index],
    ...req.body,
  };

  patients[index] = updated;
  saveStorage();
  notifyChange("patients", "update", updated);
  logAudit("PATIENT_UPDATED", "Patient", updated.id, (req as any).user?.id || "usr-rec-01", req.ip);

  return res.json(updated);
});

// Delete patient record
patientsRouter.delete("/:id", (req: Request, res: Response) => {
  const id = String(req.params.id);
  const index = patients.findIndex((p) => p.id === id || p.mrn.toLowerCase() === id.toLowerCase());

  if (index === -1) {
    return res.status(404).json({ error: "Patient record not found" });
  }

  const deleted = patients[index];
  patients.splice(index, 1);
  saveStorage();
  notifyChange("patients", "delete", deleted);
  logAudit("PATIENT_DELETED", "Patient", deleted.id, (req as any).user?.id || "usr-admin-01", req.ip);

  return res.json({
    success: true,
    message: `Patient ${deleted.firstName} ${deleted.lastName} (${deleted.mrn}) was successfully deleted.`,
    deletedId: deleted.id,
  });
});

// File upload for patient medical document (with magic-bytes validation)
patientsRouter.post("/:id/upload", processMedicalFileUpload, (req: Request, res: Response) => {
  const id = String(req.params.id);
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  logAudit("FILE_UPLOADED", "MedicalDocument", id, (req as any).user?.id || "usr-admin-01", req.ip);

  return res.status(201).json({
    message: "Medical document authenticated and securely vaulted",
    filename: file.originalname,
    mimetype: file.mimetype,
    sizeBytes: file.size,
    vaultUrl: `https://vault.apexcare.internal/documents/${id}/${encodeURIComponent(file.originalname)}`,
    uploadedAt: new Date().toISOString(),
  });
});
