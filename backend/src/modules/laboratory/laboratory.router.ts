import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { laboratoryTests, patients, logAudit, saveStorage } from "../../db/store.js";
import { notifyChange } from "../realtime/realtime.service.js";

export const laboratoryRouter = Router();

// List laboratory orders
laboratoryRouter.get("/", (req: Request, res: Response) => {
  const { status, statOnly } = req.query;

  let filtered = [...laboratoryTests];

  if (status && status !== "All") {
    filtered = filtered.filter((l) => l.sampleStatus.toLowerCase() === (status as string).toLowerCase());
  }

  if (statOnly === "true") {
    filtered = filtered.filter((l) => l.isStatUrgent);
  }

  return res.json(filtered);
});

// Submit new lab test order
laboratoryRouter.post("/orders", (req: Request, res: Response) => {
  const { patientId, testName, isStatUrgent, charge, doctorName } = req.body;
  const patient = patients.find((p) => p.id === patientId || p.mrn.toLowerCase() === patientId.toLowerCase());

  if (!patient || !testName) {
    return res.status(400).json({ error: "Patient and test name are required" });
  }

  const newTest = {
    id: `lab-${uuidv4().substring(0, 8)}`,
    patientId: patient.id,
    patientName: `${patient.firstName} ${patient.lastName}`,
    patientMrn: patient.mrn,
    doctorId: (req as any).user?.id || "usr-doc-01",
    doctorName: doctorName || (req as any).user?.fullName || "Dr. Marcus Chen",
    testName,
    sampleStatus: "Requested",
    isStatUrgent: Boolean(isStatUrgent),
    charge: Number(charge) || 85.0,
    createdAt: new Date().toISOString(),
    completedAt: null,
    resultData: null,
  };

  laboratoryTests.unshift(newTest);
  saveStorage();
  notifyChange("laboratory", "create", newTest);
  logAudit("LAB_ORDER_CREATED", "LaboratoryTest", newTest.id, (req as any).user?.id || "usr-lab-01", req.ip);

  return res.status(201).json(newTest);
});

// Update sample status (e.g., Requested -> Sample Collected -> In-Analysis -> Completed)
laboratoryRouter.patch("/:id/status", (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { status } = req.body;

  const test = laboratoryTests.find((l) => l.id === id);
  if (!test) {
    return res.status(404).json({ error: "Lab test not found" });
  }

  test.sampleStatus = status;
  if (status === "Completed") {
    test.completedAt = new Date().toISOString();
  }

  saveStorage();
  notifyChange("laboratory", "status_change", test);
  logAudit(`LAB_STATUS_${status.toUpperCase().replace(/\s+/g, "_")}`, "LaboratoryTest", test.id, (req as any).user?.id || "usr-lab-01", req.ip);

  return res.json(test);
});

// Full update of laboratory test details
laboratoryRouter.put("/:id", (req: Request, res: Response) => {
  const id = String(req.params.id);
  const index = laboratoryTests.findIndex((l) => l.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Lab test order not found" });
  }

  const current = laboratoryTests[index];
  const { testName, isStatUrgent, charge, sampleStatus, doctorName } = req.body;

  const updatedTest = {
    ...current,
    testName: testName !== undefined ? testName.trim() : current.testName,
    isStatUrgent: isStatUrgent !== undefined ? Boolean(isStatUrgent) : current.isStatUrgent,
    charge: charge !== undefined ? Number(charge) : current.charge,
    sampleStatus: sampleStatus !== undefined ? sampleStatus : current.sampleStatus,
    doctorName: doctorName !== undefined ? doctorName.trim() : current.doctorName,
  };

  if (sampleStatus === "Completed" && !updatedTest.completedAt) {
    updatedTest.completedAt = new Date().toISOString();
  }

  laboratoryTests[index] = updatedTest;
  saveStorage();
  notifyChange("laboratory", "update", updatedTest);
  logAudit("LAB_ORDER_UPDATED", "LaboratoryTest", updatedTest.id, (req as any).user?.id || "usr-lab-01", req.ip);

  return res.json(updatedTest);
});

// Delete laboratory test order
laboratoryRouter.delete("/:id", (req: Request, res: Response) => {
  const id = String(req.params.id);
  const index = laboratoryTests.findIndex((l) => l.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Lab test not found" });
  }

  const deletedTest = laboratoryTests[index];
  laboratoryTests.splice(index, 1);
  saveStorage();
  notifyChange("laboratory", "delete", deletedTest);
  logAudit("LAB_ORDER_DELETED", "LaboratoryTest", deletedTest.id, (req as any).user?.id || "usr-admin-01", req.ip);

  return res.json({
    success: true,
    message: `Laboratory test order "${deletedTest.testName}" (${deletedTest.id}) was cancelled and removed.`,
    deletedId: deletedTest.id,
  });
});

// Enter laboratory test results with abnormal flags and digital sign-off
laboratoryRouter.post("/:id/results", (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { parameters, pathologistNotes, verifiedBy } = req.body;

  const test = laboratoryTests.find((l) => l.id === id);
  if (!test) {
    return res.status(404).json({ error: "Lab test not found" });
  }

  test.sampleStatus = "Completed";
  test.completedAt = new Date().toISOString();
  test.resultData = {
    parameters: parameters || [
      { name: "Result Value", value: "Normal", unit: "-", referenceRange: "Standard", flag: "NORMAL" }
    ],
    pathologistNotes: pathologistNotes || "Laboratory investigation executed following clinical QA protocols.",
    verifiedBy: verifiedBy || (req as any).user?.fullName || "David Thorne, MLS (Chief Laboratory Scientist)",
  } as any;

  saveStorage();
  notifyChange("laboratory", "results_saved", test);
  logAudit("LAB_RESULTS_RECORDED", "LaboratoryTest", test.id, (req as any).user?.id || "usr-lab-01", req.ip);

  return res.json(test);
});
