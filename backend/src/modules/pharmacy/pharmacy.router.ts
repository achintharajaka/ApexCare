import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { pharmacyInventory, prescriptions, logAudit, saveStorage } from "../../db/store.js";
import { notifyChange } from "../realtime/realtime.service.js";

export const pharmacyRouter = Router();

// Get medicine inventory catalog
pharmacyRouter.get("/catalog", (req: Request, res: Response) => {
  const { search, category, alertOnly } = req.query;

  let filtered = [...pharmacyInventory];

  if (search) {
    const q = (search as string).toLowerCase().trim();
    filtered = filtered.filter(
      (m) =>
        m.medicineName.toLowerCase().includes(q) ||
        m.drugCode.toLowerCase().includes(q) ||
        m.genericName?.toLowerCase().includes(q)
    );
  }

  if (category && category !== "All") {
    filtered = filtered.filter((m) => m.category?.toLowerCase() === (category as string).toLowerCase());
  }

  if (alertOnly === "true") {
    filtered = filtered.filter((m) => m.stockQuantity <= m.reorderLevel || new Date(m.expiryDate) < new Date("2026-12-31"));
  }

  return res.json(filtered);
});

// Get dispensing queue
pharmacyRouter.get("/dispensing-queue", (_req: Request, res: Response) => {
  return res.json(prescriptions);
});

// Dispense prescription with automatic inventory deduction
pharmacyRouter.post("/dispense", (req: Request, res: Response) => {
  const { prescriptionId, itemId } = req.body;

  const rx = prescriptions.find((p) => p.id === prescriptionId);
  if (!rx) {
    return res.status(404).json({ error: "Prescription not found" });
  }

  if (itemId) {
    const item = rx.items.find((i) => i.id === itemId);
    if (item) {
      item.status = "Dispensed";

      // Deduct from stock
      const stockItem = pharmacyInventory.find((p) => p.id === item.itemId || p.medicineName.toLowerCase().includes(item.medicineName.toLowerCase().slice(0, 8)));
      if (stockItem) {
        stockItem.stockQuantity = Math.max(0, stockItem.stockQuantity - item.quantity);
        if (stockItem.stockQuantity <= stockItem.reorderLevel) {
          stockItem.statusAlert = "Low Stock Warning";
        }
      }
    }
  } else {
    // Dispense all
    rx.status = "Dispensed";
    rx.items.forEach((item) => {
      item.status = "Dispensed";
      const stockItem = pharmacyInventory.find((p) => p.id === item.itemId || p.medicineName.toLowerCase().includes(item.medicineName.toLowerCase().slice(0, 8)));
      if (stockItem) {
        stockItem.stockQuantity = Math.max(0, stockItem.stockQuantity - item.quantity);
        if (stockItem.stockQuantity <= stockItem.reorderLevel) {
          stockItem.statusAlert = "Low Stock Warning";
        }
      }
    });
  }

  saveStorage();
  notifyChange("pharmacy", "dispense", rx);
  logAudit("MEDICATION_DISPENSED", "Prescription", rx.id, (req as any).user?.id || "usr-pharm-01", req.ip);

  return res.json({ message: "Medication successfully dispensed and stock adjusted", prescription: rx });
});

// Stock intake / add new medicine
pharmacyRouter.post("/intake", (req: Request, res: Response) => {
  const { medicineName, genericName, category, stockQuantity, reorderLevel, unitPrice, expiryDate, batchNumber } = req.body;

  if (!medicineName || !stockQuantity || !unitPrice || !expiryDate) {
    return res.status(400).json({ error: "Medicine name, quantity, price, and expiry date are required." });
  }

  const randomCode = Math.floor(100 + Math.random() * 900);
  const newMed = {
    id: `med-${uuidv4().substring(0, 8)}`,
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

  pharmacyInventory.unshift(newMed);
  saveStorage();
  notifyChange("pharmacy", "intake", newMed);
  logAudit("PHARMACY_STOCK_INTAKE", "PharmacyInventory", newMed.id, (req as any).user?.id || "usr-pharm-01", req.ip);

  return res.status(201).json(newMed);
});

// Update medicine in formulary inventory
pharmacyRouter.put("/catalog/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const index = pharmacyInventory.findIndex((m) => m.id === id || m.drugCode === id);

  if (index === -1) {
    return res.status(404).json({ error: "Medicine item not found in catalog" });
  }

  const current = pharmacyInventory[index];
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

  pharmacyInventory[index] = updatedMed;
  saveStorage();
  notifyChange("pharmacy", "update", updatedMed);
  logAudit("PHARMACY_ITEM_UPDATED", "PharmacyInventory", updatedMed.id, (req as any).user?.id || "usr-pharm-01", req.ip);

  return res.json(updatedMed);
});

// Delete medicine from formulary inventory
pharmacyRouter.delete("/catalog/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const index = pharmacyInventory.findIndex((m) => m.id === id || m.drugCode === id);

  if (index === -1) {
    return res.status(404).json({ error: "Medicine item not found" });
  }

  const deletedMed = pharmacyInventory[index];
  pharmacyInventory.splice(index, 1);
  saveStorage();
  notifyChange("pharmacy", "delete", deletedMed);
  logAudit("PHARMACY_ITEM_DELETED", "PharmacyInventory", deletedMed.id, (req as any).user?.id || "usr-admin-01", req.ip);

  return res.json({
    success: true,
    message: `Medicine "${deletedMed.medicineName}" (${deletedMed.drugCode}) removed from formulary.`,
    deletedId: deletedMed.id,
  });
});

// Cancel or delete prescription from dispensing queue
pharmacyRouter.delete("/dispensing-queue/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const index = prescriptions.findIndex((p) => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Prescription not found" });
  }

  const deletedRx = prescriptions[index];
  prescriptions.splice(index, 1);
  saveStorage();
  notifyChange("pharmacy", "cancel_queue", deletedRx);
  logAudit("PRESCRIPTION_DELETED", "Prescription", deletedRx.id, (req as any).user?.id || "usr-pharm-01", req.ip);

  return res.json({
    success: true,
    message: `Prescription ${deletedRx.id} for ${deletedRx.patientName} removed from queue.`,
    deletedId: deletedRx.id,
  });
});
