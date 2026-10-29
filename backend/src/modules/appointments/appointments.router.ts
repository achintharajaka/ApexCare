import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { appointments, patients, users, logAudit, saveStorage } from "../../db/store.js";
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
    filtered = filtered.filter((a) => a.doctorId === doctorId);
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
appointmentsRouter.get("/roster", (_req: Request, res: Response) => {
  const doctors = users
    .filter((u) => u.role === "DOCTOR" || u.role === "ADMIN")
    .map((doc) => {
      const activeCount = appointments.filter((a) => a.doctorId === doc.id && a.status !== "Cancelled").length;
      return {
        id: doc.id,
        fullName: doc.fullName,
        department: doc.department || "Internal Medicine",
        specialization: (doc as any).specialization || "Clinical Physician",
        roomNumber: (doc as any).roomNumber || "Room 101",
        consultationFee: (doc as any).consultationFee || 150.0,
        availableSlots: Math.max(0, 8 - activeCount),
        isOnline: true,
      };
    });

  return res.json(doctors);
});

// Book new appointment
appointmentsRouter.post("/", (req: Request, res: Response) => {
  const { patientId, doctorId, appointmentDate, appointmentTime, reason, department, roomNumber } = req.body;

  if (!patientId || !doctorId || !appointmentDate) {
    return res.status(400).json({ error: "Patient, Doctor, and Appointment Date are required." });
  }

  const patient = patients.find((p) => p.id === patientId || p.mrn.toLowerCase() === patientId.toLowerCase());
  const doctor = users.find((u) => u.id === doctorId);

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
