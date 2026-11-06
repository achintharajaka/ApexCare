import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { appointments, patients, users, staffMembers, logAudit, saveStorage } from "../../db/store.js";
import { notifyChange } from "../realtime/realtime.service.js";

export const appointmentsRouter = Router();

// List appointments with date, doctor, and department filtering
appointmentsRouter.get("/", (req: Request, res: Response) => {
  const { date, doctorId, department, status } = req.query;

  let filtered = [...appointments];

  if (date) {
    filtered = filtered.filter((a) => a.appointmentDate === date);
  }

  if (doctorId && doctorId !== "All") {
    const docObj = users.find((u) => u.id === doctorId) || staffMembers.find((s) => s.id === doctorId);
    const docName = docObj?.fullName?.toLowerCase();
    filtered = filtered.filter(
      (a) => a.doctorId === doctorId || (docName && a.doctorName?.toLowerCase() === docName)
    );
  }

  if (department && department !== "All") {
    filtered = filtered.filter((a) => a.department.toLowerCase() === (department as string).toLowerCase());
  }

  if (status && status !== "All") {
    filtered = filtered.filter((a) => a.status.toLowerCase() === (status as string).toLowerCase());
  }

  return res.json(filtered);
});

// Doctor roster list with availability badges
appointmentsRouter.get("/roster", (req: Request, res: Response) => {
  const { department } = req.query;

  const normalizeDocName = (name: string): string => {
    if (!name) return "";
    return name
      .toLowerCase()
      .replace(/,\s*(md|mbbs|ms|frcs|frcp|frcpath|bpharm|rn|aca|facc).*/gi, "")
      .replace(/^dr\.\s*|^dr\s*/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  // STRICT RULE: Only include clinical DOCTOR roles (never administrators)
  const doctorsMap = new Map<string, any>();
  const seenNormNames = new Set<string>();

  // 1. Doctors from users
  for (const u of users) {
    if (u.role === "DOCTOR") {
      const norm = normalizeDocName(u.fullName);
      if (!seenNormNames.has(norm)) {
        seenNormNames.add(norm);
        doctorsMap.set(u.id, {
          id: u.id,
          fullName: u.fullName,
          department: u.department || "Cardiology & Internal Medicine",
          specialization: (u as any).specialization || "Clinical Physician",
          roomNumber: (u as any).roomNumber || "Consultation Room",
          consultationFee: (u as any).consultationFee || 2500,
        });
      }
    }
  }

  // 2. Doctors from staffMembers
  for (const sm of staffMembers) {
    if (sm.role === "DOCTOR") {
      const norm = normalizeDocName(sm.fullName);
      if (!seenNormNames.has(norm)) {
        seenNormNames.add(norm);
        doctorsMap.set(sm.id, {
          id: sm.id,
          fullName: sm.fullName,
          department: sm.department || "General Surgery",
          specialization: sm.specialization || "Consultant Specialist",
          roomNumber: sm.roomNumber || "Consultation Room",
          consultationFee: sm.consultationFee || 2500,
        });
      }
    }
  }

  // 3. Ensure any doctors referenced in historical appointments remain tracked
  for (const a of appointments) {
    if (a.doctorName) {
      const norm = normalizeDocName(a.doctorName);
      if (!seenNormNames.has(norm)) {
        seenNormNames.add(norm);
        const docId = a.doctorId || `doc-${norm.replace(/[^a-z0-9]/g, "")}`;
        doctorsMap.set(docId, {
          id: docId,
          fullName: a.doctorName,
          department: a.department || "Cardiology & Internal Medicine",
          specialization: "Attending Physician",
          roomNumber: a.roomNumber || "Consultation Room",
          consultationFee: 2500,
        });
      }
    }
  }

  let doctorsList = Array.from(doctorsMap.values()).map((doc) => {
    const docNorm = normalizeDocName(doc.fullName);
    const activeCount = appointments.filter(
      (a) =>
        (a.doctorId === doc.id || (a.doctorName && normalizeDocName(a.doctorName) === docNorm)) &&
        a.status !== "Cancelled"
    ).length;

    return {
      ...doc,
      availableSlots: Math.max(0, 8 - activeCount),
      isOnline: true,
    };
  });

  if (department && department !== "All") {
    doctorsList = doctorsList.filter((d) =>
      d.department.toLowerCase().includes((department as string).toLowerCase())
    );
  }

  return res.json(doctorsList);
});

// Book new appointment
appointmentsRouter.post("/", (req: Request, res: Response) => {
  const { patientId, doctorId, appointmentDate, appointmentTime, reason, department, roomNumber } = req.body;

  if (!patientId || !doctorId || !appointmentDate) {
    return res.status(400).json({ error: "Patient, Doctor, and Appointment Date are required." });
  }

  const patient = patients.find((p) => p.id === patientId || p.mrn.toLowerCase() === patientId.toLowerCase());
  const doctor = users.find((u) => u.id === doctorId) || staffMembers.find((s) => s.id === doctorId);

  if (!patient) {
    return res.status(404).json({ error: "Patient not found" });
  }

  const newApt = {
    id: `apt-${uuidv4().substring(0, 8)}`,
    tenantId: "tenant-apexcare-01",
    patientId: patient.id,
    patientName: `${patient.firstName} ${patient.lastName}`,
    patientMrn: patient.mrn,
    doctorId: doctor?.id || doctorId,
    doctorName: doctor?.fullName || "Attending Physician",
    department: department || doctor?.department || "General Medicine",
    roomNumber: roomNumber || (doctor as any)?.roomNumber || "Room 201",
    appointmentDate: appointmentDate || new Date().toISOString().split("T")[0],
    appointmentTime: appointmentTime || "10:00 AM",
    status: "Scheduled",
    reason: reason || "Routine Consultation",
    priority: "Normal",
    createdAt: new Date().toISOString(),
  };

  appointments.push(newApt);
  saveStorage();
  notifyChange("appointments", "create", newApt);
  logAudit("APPOINTMENT_BOOKED", "Appointment", newApt.id, (req as any).user?.id || "usr-rec-01", req.ip);

  return res.status(201).json(newApt);
});

// Full edit of appointment details
appointmentsRouter.put("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const index = appointments.findIndex((a) => a.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Appointment not found" });
  }

  const existing = appointments[index];
  const {
    doctorId,
    doctorName,
    department,
    roomNumber,
    appointmentDate,
    appointmentTime,
    reason,
    priority,
    status,
  } = req.body;

  const updatedDoctor = doctorId ? users.find((u) => u.id === doctorId) : null;

  appointments[index] = {
    ...existing,
    doctorId: doctorId || existing.doctorId,
    doctorName: updatedDoctor?.fullName || doctorName || existing.doctorName,
    department: department || updatedDoctor?.department || existing.department,
    roomNumber: roomNumber || (updatedDoctor as any)?.roomNumber || existing.roomNumber,
    appointmentDate: appointmentDate || existing.appointmentDate,
    appointmentTime: appointmentTime || existing.appointmentTime,
    reason: reason !== undefined ? reason : existing.reason,
    priority: priority || existing.priority,
    status: status || existing.status,
  };

  saveStorage();
  notifyChange("appointments", "update", appointments[index]);
  logAudit("APPOINTMENT_UPDATED", "Appointment", existing.id, (req as any).user?.id || "usr-rec-01", req.ip);

  return res.json(appointments[index]);
});

// Update appointment status (Scheduled -> In-Progress -> Completed -> Cancelled)
appointmentsRouter.patch("/:id/status", (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  const apt = appointments.find((a) => a.id === id);
  if (!apt) {
    return res.status(404).json({ error: "Appointment not found" });
  }

  apt.status = status;
  if (reason) {
    apt.reason = `${apt.reason || ""} (Note: ${reason})`;
  }

  saveStorage();
  notifyChange("appointments", "status_change", apt);
  logAudit(`APPOINTMENT_STATUS_${status.toUpperCase()}`, "Appointment", apt.id, (req as any).user?.id || "usr-doc-01", req.ip);

  return res.json(apt);
});

// Cancel or remove appointment
appointmentsRouter.delete("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const { hardDelete, cancellationReason } = req.body || {};

  const index = appointments.findIndex((a) => a.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Appointment not found" });
  }

  const apt = appointments[index];

  if (hardDelete) {
    appointments.splice(index, 1);
    saveStorage();
    notifyChange("appointments", "delete", apt);
    logAudit("APPOINTMENT_DELETED", "Appointment", apt.id, (req as any).user?.id || "usr-admin-01", req.ip);
    return res.json({ success: true, message: `Appointment ${apt.id} deleted successfully.`, deletedId: apt.id });
  } else {
    apt.status = "Cancelled";
    if (cancellationReason) {
      apt.reason = `${apt.reason || ""} (Cancelled: ${cancellationReason})`;
    }
    saveStorage();
    notifyChange("appointments", "cancel", apt);
    logAudit("APPOINTMENT_CANCELLED", "Appointment", apt.id, (req as any).user?.id || "usr-rec-01", req.ip);
    return res.json({ success: true, message: "Appointment cancelled successfully", cancellationReason, appointment: apt });
  }
});
