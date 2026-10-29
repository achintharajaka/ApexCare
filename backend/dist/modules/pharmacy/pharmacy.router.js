"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pharmacyRouter = void 0;
const express_1 = require("express");
const uuid_1 = require("uuid");
const store_js_1 = require("../../db/store.js");
const realtime_service_js_1 = require("../realtime/realtime.service.js");
exports.pharmacyRouter = (0, express_1.Router)();
// Get medicine inventory catalog
exports.pharmacyRouter.get("/catalog", (req, res) => {
    const { search, category, alertOnly } = req.query;
    let filtered = [...store_js_1.pharmacyInventory];
    if (search) {
        const q = search.toLowerCase().trim();
        filtered = filtered.filter((m) => m.medicineName.toLowerCase().includes(q) ||
            m.drugCode.toLowerCase().includes(q) ||
            m.genericName?.toLowerCase().includes(q));
    }
    if (category && category !== "All") {
        filtered = filtered.filter((m) => m.category?.toLowerCase() === category.toLowerCase());
    }
    if (alertOnly === "true") {
        filtered = filtered.filter((m) => m.stockQuantity <= m.reorderLevel || new Date(m.expiryDate) < new Date("2026-12-31"));
    }
    return res.json(filtered);
});
// Get dispensing queue
exports.pharmacyRouter.get("/dispensing-queue", (_req, res) => {
    return res.json(store_js_1.prescriptions);
});
// Dispense prescription with automatic inventory deduction
exports.pharmacyRouter.post("/dispense", (req, res) => {
    const { prescriptionId, itemId } = req.body;
    const rx = store_js_1.prescriptions.find((p) => p.id === prescriptionId);
    if (!rx) {
        return res.status(404).json({ error: "Prescription not found" });
    }
    if (itemId) {
        const item = rx.items.find((i) => i.id === itemId);
        if (item) {
            item.status = "Dispensed";
            // Deduct from stock
            const stockItem = store_js_1.pharmacyInventory.find((p) => p.id === item.itemId || p.medicineName.toLowerCase().includes(item.medicineName.toLowerCase().slice(0, 8)));
            if (stockItem) {
                stockItem.stockQuantity = Math.max(0, stockItem.stockQuantity - item.quantity);
                if (stockItem.stockQuantity <= stockItem.reorderLevel) {
                    stockItem.statusAlert = "Low Stock Warning";
                }
            }
        }
    }
    else {
        // Dispense all
        rx.status = "Dispensed";
        rx.items.forEach((item) => {
            item.status = "Dispensed";
            const stockItem = store_js_1.pharmacyInventory.find((p) => p.id === item.itemId || p.medicineName.toLowerCase().includes(item.medicineName.toLowerCase().slice(0, 8)));
            if (stockItem) {
                stockItem.stockQuantity = Math.max(0, stockItem.stockQuantity - item.quantity);
                if (stockItem.stockQuantity <= stockItem.reorderLevel) {
                    stockItem.statusAlert = "Low Stock Warning";
                }
            }
        });
    }
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("pharmacy", "dispense", rx);
    (0, store_js_1.logAudit)("MEDICATION_DISPENSED", "Prescription", rx.id, req.user?.id || "usr-pharm-01", req.ip);
    return res.json({ message: "Medication successfully dispensed and stock adjusted", prescription: rx });
});
// Stock intake / add new medicine
exports.pharmacyRouter.post("/intake", (req, res) => {
    const { medicineName, genericName, category, stockQuantity, reorderLevel, unitPrice, expiryDate, batchNumber } = req.body;
    if (!medicineName || !stockQuantity || !unitPrice || !expiryDate) {
        return res.status(400).json({ error: "Medicine name, quantity, price, and expiry date are required." });
    }
    const randomCode = Math.floor(100 + Math.random() * 900);
    const newMed = {
        id: `med-${(0, uuid_1.v4)().substring(0, 8)}`,
        drugCode: `DRG-NEW-${randomCode}`,
        medicineName,
        genericName: genericName || medicineName,
        category: category || "General Pharmacology",
        stockQuantity: Number(stockQuantity),
        reorderLevel: Number(reorderLevel) || 50,
        unitPrice: Number(unitPrice),
        expiryDate,
        batchNumber: batchNumber || `BAT-${randomCode}-2026`,
        statusAlert: Number(stockQuantity) <= (Number(reorderLevel) || 50) ? "Low Stock Warning" : "Normal",
        createdAt: new Date().toISOString(),
    };
    store_js_1.pharmacyInventory.unshift(newMed);
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("pharmacy", "intake", newMed);
    (0, store_js_1.logAudit)("PHARMACY_STOCK_INTAKE", "PharmacyInventory", newMed.id, req.user?.id || "usr-pharm-01", req.ip);
    return res.status(201).json(newMed);
});
// Update medicine in formulary inventory
exports.pharmacyRouter.put("/catalog/:id", (req, res) => {
    const { id } = req.params;
    const index = store_js_1.pharmacyInventory.findIndex((m) => m.id === id || m.drugCode === id);
    if (index === -1) {
        return res.status(404).json({ error: "Medicine item not found in catalog" });
    }
    const current = store_js_1.pharmacyInventory[index];
    const stock = req.body.stockQuantity !== undefined ? Number(req.body.stockQuantity) : current.stockQuantity;
    const reorder = req.body.reorderLevel !== undefined ? Number(req.body.reorderLevel) : current.reorderLevel;
    const updatedMed = {
        ...current,
        medicineName: req.body.medicineName !== undefined ? req.body.medicineName.trim() : current.medicineName,
        genericName: req.body.genericName !== undefined ? req.body.genericName.trim() : current.genericName,
        category: req.body.category !== undefined ? req.body.category : current.category,
        stockQuantity: stock,
        reorderLevel: reorder,
        unitPrice: req.body.unitPrice !== undefined ? Number(req.body.unitPrice) : current.unitPrice,
        expiryDate: req.body.expiryDate !== undefined ? req.body.expiryDate : current.expiryDate,
        batchNumber: req.body.batchNumber !== undefined ? req.body.batchNumber : current.batchNumber,
        statusAlert: stock <= reorder ? "Low Stock Warning" : "Normal",
    };
    store_js_1.pharmacyInventory[index] = updatedMed;
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("pharmacy", "update", updatedMed);
    (0, store_js_1.logAudit)("PHARMACY_ITEM_UPDATED", "PharmacyInventory", updatedMed.id, req.user?.id || "usr-pharm-01", req.ip);
    return res.json(updatedMed);
});
// Delete medicine from formulary inventory
exports.pharmacyRouter.delete("/catalog/:id", (req, res) => {
    const { id } = req.params;
    const index = store_js_1.pharmacyInventory.findIndex((m) => m.id === id || m.drugCode === id);
    if (index === -1) {
        return res.status(404).json({ error: "Medicine item not found" });
    }
    const deletedMed = store_js_1.pharmacyInventory[index];
    store_js_1.pharmacyInventory.splice(index, 1);
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("pharmacy", "delete", deletedMed);
    (0, store_js_1.logAudit)("PHARMACY_ITEM_DELETED", "PharmacyInventory", deletedMed.id, req.user?.id || "usr-admin-01", req.ip);
    return res.json({
        success: true,
        message: `Medicine "${deletedMed.medicineName}" (${deletedMed.drugCode}) removed from formulary.`,
        deletedId: deletedMed.id,
    });
});
// Cancel or delete prescription from dispensing queue
exports.pharmacyRouter.delete("/dispensing-queue/:id", (req, res) => {
    const { id } = req.params;
    const index = store_js_1.prescriptions.findIndex((p) => p.id === id);
    if (index === -1) {
        return res.status(404).json({ error: "Prescription not found" });
    }
    const deletedRx = store_js_1.prescriptions[index];
    store_js_1.prescriptions.splice(index, 1);
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("pharmacy", "cancel_queue", deletedRx);
    (0, store_js_1.logAudit)("PRESCRIPTION_DELETED", "Prescription", deletedRx.id, req.user?.id || "usr-pharm-01", req.ip);
    return res.json({
        success: true,
        message: `Prescription ${deletedRx.id} for ${deletedRx.patientName} removed from queue.`,
        deletedId: deletedRx.id,
    });
});
