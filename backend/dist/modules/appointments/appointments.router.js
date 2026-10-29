"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentsRouter = void 0;
const express_1 = require("express");
const uuid_1 = require("uuid");
const store_js_1 = require("../../db/store.js");
const realtime_service_js_1 = require("../realtime/realtime.service.js");
exports.appointmentsRouter = (0, express_1.Router)();
// List appointments with date, doctor, and department filtering
exports.appointmentsRouter.get("/", (req, res) => {
    const { date, doctorId, department, status } = req.query;
    let filtered = [...store_js_1.appointments];
    if (date) {
        filtered = filtered.filter((a) => a.appointmentDate === date);
    }
    if (doctorId && doctorId !== "All") {
        filtered = filtered.filter((a) => a.doctorId === doctorId);
    }
    if (department && department !== "All") {
        filtered = filtered.filter((a) => a.department.toLowerCase() === department.toLowerCase());
    }
    if (status && status !== "All") {
        filtered = filtered.filter((a) => a.status.toLowerCase() === status.toLowerCase());
    }
    return res.json(filtered);
});
// Doctor roster list with availability badges
exports.appointmentsRouter.get("/roster", (_req, res) => {
    const doctors = store_js_1.users
        .filter((u) => u.role === "DOCTOR" || u.role === "ADMIN")
        .map((doc) => {
        const activeCount = store_js_1.appointments.filter((a) => a.doctorId === doc.id && a.status !== "Cancelled").length;
        return {
            id: doc.id,
            fullName: doc.fullName,
            department: doc.department || "Internal Medicine",
            specialization: doc.specialization || "Clinical Physician",
            roomNumber: doc.roomNumber || "Room 101",
            consultationFee: doc.consultationFee || 150.0,
            availableSlots: Math.max(0, 8 - activeCount),
            isOnline: true,
        };
    });
    return res.json(doctors);
});
// Book new appointment
exports.appointmentsRouter.post("/", (req, res) => {
    const { patientId, doctorId, appointmentDate, appointmentTime, reason, department, roomNumber } = req.body;
    if (!patientId || !doctorId || !appointmentDate) {
        return res.status(400).json({ error: "Patient, Doctor, and Appointment Date are required." });
    }
    const patient = store_js_1.patients.find((p) => p.id === patientId || p.mrn.toLowerCase() === patientId.toLowerCase());
    const doctor = store_js_1.users.find((u) => u.id === doctorId);
    if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
    }
    const newApt = {
        id: `apt-${(0, uuid_1.v4)().substring(0, 8)}`,
        tenantId: "tenant-apexcare-01",
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        patientMrn: patient.mrn,
        doctorId: doctor?.id || doctorId,
        doctorName: doctor?.fullName || "Attending Physician",
        department: department || doctor?.department || "General Medicine",
        roomNumber: roomNumber || doctor?.roomNumber || "Room 201",
        appointmentDate: appointmentDate || new Date().toISOString().split("T")[0],
        appointmentTime: appointmentTime || "10:00 AM",
        status: "Scheduled",
        reason: reason || "Routine Consultation",
        priority: "Normal",
        createdAt: new Date().toISOString(),
    };
    store_js_1.appointments.push(newApt);
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("appointments", "create", newApt);
    (0, store_js_1.logAudit)("APPOINTMENT_BOOKED", "Appointment", newApt.id, req.user?.id || "usr-rec-01", req.ip);
    return res.status(201).json(newApt);
});
// Full edit of appointment details
exports.appointmentsRouter.put("/:id", (req, res) => {
    const { id } = req.params;
    const index = store_js_1.appointments.findIndex((a) => a.id === id);
    if (index === -1) {
        return res.status(404).json({ error: "Appointment not found" });
    }
    const existing = store_js_1.appointments[index];
    const { doctorId, doctorName, department, roomNumber, appointmentDate, appointmentTime, reason, priority, status, } = req.body;
    const updatedDoctor = doctorId ? store_js_1.users.find((u) => u.id === doctorId) : null;
    store_js_1.appointments[index] = {
        ...existing,
        doctorId: doctorId || existing.doctorId,
        doctorName: updatedDoctor?.fullName || doctorName || existing.doctorName,
        department: department || updatedDoctor?.department || existing.department,
        roomNumber: roomNumber || updatedDoctor?.roomNumber || existing.roomNumber,
        appointmentDate: appointmentDate || existing.appointmentDate,
        appointmentTime: appointmentTime || existing.appointmentTime,
        reason: reason !== undefined ? reason : existing.reason,
        priority: priority || existing.priority,
        status: status || existing.status,
    };
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("appointments", "update", store_js_1.appointments[index]);
    (0, store_js_1.logAudit)("APPOINTMENT_UPDATED", "Appointment", existing.id, req.user?.id || "usr-rec-01", req.ip);
    return res.json(store_js_1.appointments[index]);
});
// Update appointment status (Scheduled -> In-Progress -> Completed -> Cancelled)
exports.appointmentsRouter.patch("/:id/status", (req, res) => {
    const { id } = req.params;
    const { status, reason } = req.body;
    const apt = store_js_1.appointments.find((a) => a.id === id);
    if (!apt) {
        return res.status(404).json({ error: "Appointment not found" });
    }
    apt.status = status;
    if (reason) {
        apt.reason = `${apt.reason || ""} (Note: ${reason})`;
    }
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("appointments", "status_change", apt);
    (0, store_js_1.logAudit)(`APPOINTMENT_STATUS_${status.toUpperCase()}`, "Appointment", apt.id, req.user?.id || "usr-doc-01", req.ip);
    return res.json(apt);
});
// Cancel or remove appointment
exports.appointmentsRouter.delete("/:id", (req, res) => {
    const { id } = req.params;
    const { hardDelete, cancellationReason } = req.body || {};
    const index = store_js_1.appointments.findIndex((a) => a.id === id);
    if (index === -1) {
        return res.status(404).json({ error: "Appointment not found" });
    }
    const apt = store_js_1.appointments[index];
    if (hardDelete) {
        store_js_1.appointments.splice(index, 1);
        (0, store_js_1.saveStorage)();
        (0, realtime_service_js_1.notifyChange)("appointments", "delete", apt);
        (0, store_js_1.logAudit)("APPOINTMENT_DELETED", "Appointment", apt.id, req.user?.id || "usr-admin-01", req.ip);
        return res.json({ success: true, message: `Appointment ${apt.id} deleted successfully.`, deletedId: apt.id });
    }
    else {
        apt.status = "Cancelled";
        if (cancellationReason) {
            apt.reason = `${apt.reason || ""} (Cancelled: ${cancellationReason})`;
        }
        (0, store_js_1.saveStorage)();
        (0, realtime_service_js_1.notifyChange)("appointments", "cancel", apt);
        (0, store_js_1.logAudit)("APPOINTMENT_CANCELLED", "Appointment", apt.id, req.user?.id || "usr-rec-01", req.ip);
        return res.json({ success: true, message: "Appointment cancelled successfully", cancellationReason, appointment: apt });
    }
});
