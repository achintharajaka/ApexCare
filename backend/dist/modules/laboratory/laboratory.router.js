"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.laboratoryRouter = void 0;
const express_1 = require("express");
const uuid_1 = require("uuid");
const store_js_1 = require("../../db/store.js");
const realtime_service_js_1 = require("../realtime/realtime.service.js");
exports.laboratoryRouter = (0, express_1.Router)();
// List laboratory orders
exports.laboratoryRouter.get("/", (req, res) => {
    const { status, statOnly } = req.query;
    let filtered = [...store_js_1.laboratoryTests];
    if (status && status !== "All") {
        filtered = filtered.filter((l) => l.sampleStatus.toLowerCase() === status.toLowerCase());
    }
    if (statOnly === "true") {
        filtered = filtered.filter((l) => l.isStatUrgent);
    }
    return res.json(filtered);
});
// Submit new lab test order
exports.laboratoryRouter.post("/orders", (req, res) => {
    const { patientId, testName, isStatUrgent, charge, doctorName } = req.body;
    const patient = store_js_1.patients.find((p) => p.id === patientId || p.mrn.toLowerCase() === patientId.toLowerCase());
    if (!patient || !testName) {
        return res.status(400).json({ error: "Patient and test name are required" });
    }
    const newTest = {
        id: `lab-${(0, uuid_1.v4)().substring(0, 8)}`,
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        patientMrn: patient.mrn,
        doctorId: req.user?.id || "usr-doc-01",
        doctorName: doctorName || req.user?.fullName || "Dr. Marcus Chen",
        testName,
        sampleStatus: "Requested",
        isStatUrgent: Boolean(isStatUrgent),
        charge: Number(charge) || 85.0,
        createdAt: new Date().toISOString(),
        completedAt: null,
        resultData: null,
    };
    store_js_1.laboratoryTests.unshift(newTest);
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("laboratory", "create", newTest);
    (0, store_js_1.logAudit)("LAB_ORDER_CREATED", "LaboratoryTest", newTest.id, req.user?.id || "usr-lab-01", req.ip);
    return res.status(201).json(newTest);
});
// Update sample status (e.g., Requested -> Sample Collected -> In-Analysis -> Completed)
exports.laboratoryRouter.patch("/:id/status", (req, res) => {
    const id = String(req.params.id);
    const { status } = req.body;
    const test = store_js_1.laboratoryTests.find((l) => l.id === id);
    if (!test) {
        return res.status(404).json({ error: "Lab test not found" });
    }
    test.sampleStatus = status;
    if (status === "Completed") {
        test.completedAt = new Date().toISOString();
    }
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("laboratory", "status_change", test);
    (0, store_js_1.logAudit)(`LAB_STATUS_${status.toUpperCase().replace(/\s+/g, "_")}`, "LaboratoryTest", test.id, req.user?.id || "usr-lab-01", req.ip);
    return res.json(test);
});
// Full update of laboratory test details
exports.laboratoryRouter.put("/:id", (req, res) => {
    const id = String(req.params.id);
    const index = store_js_1.laboratoryTests.findIndex((l) => l.id === id);
    if (index === -1) {
        return res.status(404).json({ error: "Lab test order not found" });
    }
    const current = store_js_1.laboratoryTests[index];
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
    store_js_1.laboratoryTests[index] = updatedTest;
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("laboratory", "update", updatedTest);
    (0, store_js_1.logAudit)("LAB_ORDER_UPDATED", "LaboratoryTest", updatedTest.id, req.user?.id || "usr-lab-01", req.ip);
    return res.json(updatedTest);
});
// Delete laboratory test order
exports.laboratoryRouter.delete("/:id", (req, res) => {
    const id = String(req.params.id);
    const index = store_js_1.laboratoryTests.findIndex((l) => l.id === id);
    if (index === -1) {
        return res.status(404).json({ error: "Lab test not found" });
    }
    const deletedTest = store_js_1.laboratoryTests[index];
    store_js_1.laboratoryTests.splice(index, 1);
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("laboratory", "delete", deletedTest);
    (0, store_js_1.logAudit)("LAB_ORDER_DELETED", "LaboratoryTest", deletedTest.id, req.user?.id || "usr-admin-01", req.ip);
    return res.json({
        success: true,
        message: `Laboratory test order "${deletedTest.testName}" (${deletedTest.id}) was cancelled and removed.`,
        deletedId: deletedTest.id,
    });
});
// Enter laboratory test results with abnormal flags and digital sign-off
exports.laboratoryRouter.post("/:id/results", (req, res) => {
    const id = String(req.params.id);
    const { parameters, pathologistNotes, verifiedBy } = req.body;
    const test = store_js_1.laboratoryTests.find((l) => l.id === id);
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
        verifiedBy: verifiedBy || req.user?.fullName || "David Thorne, MLS (Chief Laboratory Scientist)",
    };
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("laboratory", "results_saved", test);
    (0, store_js_1.logAudit)("LAB_RESULTS_RECORDED", "LaboratoryTest", test.id, req.user?.id || "usr-lab-01", req.ip);
    return res.json(test);
});
