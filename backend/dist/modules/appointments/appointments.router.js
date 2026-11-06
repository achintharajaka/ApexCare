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
        const docObj = store_js_1.users.find((u) => u.id === doctorId) || store_js_1.staffMembers.find((s) => s.id === doctorId);
        const docName = docObj?.fullName?.toLowerCase();
        filtered = filtered.filter((a) => a.doctorId === doctorId || (docName && a.doctorName?.toLowerCase() === docName));
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
exports.appointmentsRouter.get("/roster", (req, res) => {
    const { department } = req.query;
    const normalizeDocName = (name) => {
        if (!name)
            return "";
        return name
            .toLowerCase()
            .replace(/,\s*(md|mbbs|ms|frcs|frcp|frcpath|bpharm|rn|aca|facc).*/gi, "")
            .replace(/^dr\.\s*|^dr\s*/gi, "")
            .replace(/\s+/g, " ")
            .trim();
    };
    // STRICT RULE: Only include clinical DOCTOR roles (never administrators)
    const doctorsMap = new Map();
    const seenNormNames = new Set();
    // 1. Doctors from users
    for (const u of store_js_1.users) {
        if (u.role === "DOCTOR") {
            const norm = normalizeDocName(u.fullName);
            if (!seenNormNames.has(norm)) {
                seenNormNames.add(norm);
                doctorsMap.set(u.id, {
                    id: u.id,
                    fullName: u.fullName,
                    department: u.department || "Cardiology & Internal Medicine",
                    specialization: u.specialization || "Clinical Physician",
                    roomNumber: u.roomNumber || "Consultation Room",
                    consultationFee: u.consultationFee || 2500,
                });
            }
        }
    }
    // 2. Doctors from staffMembers
    for (const sm of store_js_1.staffMembers) {
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
    for (const a of store_js_1.appointments) {
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
        const activeCount = store_js_1.appointments.filter((a) => (a.doctorId === doc.id || (a.doctorName && normalizeDocName(a.doctorName) === docNorm)) &&
            a.status !== "Cancelled").length;
        return {
            ...doc,
            availableSlots: Math.max(0, 8 - activeCount),
            isOnline: true,
        };
    });
    if (department && department !== "All") {
        doctorsList = doctorsList.filter((d) => d.department.toLowerCase().includes(department.toLowerCase()));
    }
    return res.json(doctorsList);
});
// Book new appointment
exports.appointmentsRouter.post("/", (req, res) => {
    const { patientId, doctorId, appointmentDate, appointmentTime, reason, department, roomNumber } = req.body;
    if (!patientId || !doctorId || !appointmentDate) {
        return res.status(400).json({ error: "Patient, Doctor, and Appointment Date are required." });
    }
    const patient = store_js_1.patients.find((p) => p.id === patientId || p.mrn.toLowerCase() === patientId.toLowerCase());
    const doctor = store_js_1.users.find((u) => u.id === doctorId) || store_js_1.staffMembers.find((s) => s.id === doctorId);
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
