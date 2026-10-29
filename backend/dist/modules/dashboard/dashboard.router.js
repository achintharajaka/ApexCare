"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardRouter = void 0;
const express_1 = require("express");
const store_js_1 = require("../../db/store.js");
exports.dashboardRouter = (0, express_1.Router)();
exports.dashboardRouter.get("/summary", (_req, res) => {
    // Aggregate KPIs dynamically from current store
    const completedApts = store_js_1.appointments.filter((a) => a.status === "Completed").length;
    const inProgressApts = store_js_1.appointments.filter((a) => a.status === "In-Progress").length;
    const scheduledApts = store_js_1.appointments.filter((a) => a.status === "Scheduled").length;
    const urgentLabOrders = store_js_1.laboratoryTests.filter((l) => l.isStatUrgent || l.sampleStatus !== "Completed");
    const pharmacyAlerts = store_js_1.pharmacyInventory.filter((m) => m.stockQuantity <= m.reorderLevel || new Date(m.expiryDate) < new Date("2026-12-31"));
    // Inpatients vs Outpatients count
    const inpatientCount = store_js_1.patients.filter((p) => p.status?.toLowerCase().includes("admit") ||
        p.status?.toLowerCase().includes("icu") ||
        p.status?.toLowerCase().includes("inpatient")).length;
    const outpatientCount = Math.max(0, store_js_1.patients.length - inpatientCount);
    // Dynamic Revenue calculation from paid invoices
    const paidBills = store_js_1.bills.filter((b) => b.paymentStatus === "Paid");
    const totalRevenue = paidBills.reduce((acc, b) => acc + (b.netPayable || 0), 0);
    const consultationRev = paidBills.flatMap((b) => b.items).filter((i) => i.serviceType === "Consultation").reduce((acc, i) => acc + i.lineTotal, 0);
    const labRev = paidBills.flatMap((b) => b.items).filter((i) => i.serviceType === "Laboratory").reduce((acc, i) => acc + i.lineTotal, 0);
    const pharmRev = paidBills.flatMap((b) => b.items).filter((i) => i.serviceType === "Pharmacy").reduce((acc, i) => acc + i.lineTotal, 0);
    const admissionRev = paidBills.flatMap((b) => b.items).filter((i) => i.serviceType === "Admission").reduce((acc, i) => acc + i.lineTotal, 0);
    // Occupied beds
    const occupiedBeds = store_js_1.patients.filter((p) => p.wardBed && !p.wardBed.toLowerCase().includes("outpatient") && !p.wardBed.toLowerCase().includes("clinic")).length;
    const totalBeds = store_js_1.wardBedCensus.totalBeds || 160;
    const occupancyPercentage = totalBeds > 0 ? Number(((occupiedBeds / totalBeds) * 100).toFixed(1)) : 0;
    const responseData = {
        shift: {
            name: "Morning Shift (08:00 - 16:00)",
            station: "Station 04",
            triageLevel: "ER Triage: Level 1 (Ready)",
            capacityStatus: "Operational Capacity: Normal",
        },
        metrics: {
            totalPatients: {
                count: store_js_1.patients.length,
                trend: store_js_1.patients.length > 0 ? "+100%" : "0.0%",
                inpatient: inpatientCount,
                outpatient: outpatientCount,
                sparkline: store_js_1.patients.length > 0 ? [store_js_1.patients.length] : [],
            },
            todayAppointments: {
                total: store_js_1.appointments.length,
                clinicsCount: store_js_1.appointments.length > 0 ? 1 : 0,
                completed: completedApts,
                inProgress: inProgressApts,
                upcoming: scheduledApts,
            },
            revenueToday: {
                amount: totalRevenue,
                currency: "LKR",
                targetComparison: totalRevenue > 0 ? "+100% vs target" : "Rs. 0.00 today",
                breakdown: {
                    consultation: consultationRev,
                    laboratory: labRev,
                    pharmacy: pharmRev,
                    admissions: admissionRev,
                },
            },
            bedOccupancy: {
                totalBeds,
                occupiedBeds,
                percentage: occupancyPercentage,
                dischargesPending: 0,
                wards: store_js_1.wardBedCensus.wards.map((w) => ({
                    ...w,
                    occupied: occupiedBeds > 0 ? Math.min(w.total, occupiedBeds) : 0,
                    percentage: occupiedBeds > 0 ? Number(((Math.min(w.total, occupiedBeds) / w.total) * 100).toFixed(1)) : 0,
                })),
            },
        },
        appointmentQueue: store_js_1.appointments.map((apt) => ({
            ...apt,
            badgeColor: apt.status === "Completed"
                ? "status-success"
                : apt.status === "In-Progress"
                    ? "status-warning"
                    : apt.status === "Cancelled"
                        ? "status-critical"
                        : "status-info",
        })),
        urgentLabOrders: urgentLabOrders.slice(0, 5),
        pharmacyAlerts: pharmacyAlerts.map((med) => ({
            id: med.id,
            drugCode: med.drugCode,
            medicineName: med.medicineName,
            stockQuantity: med.stockQuantity,
            reorderLevel: med.reorderLevel,
            expiryDate: med.expiryDate,
            batchNumber: med.batchNumber,
            severity: med.stockQuantity < 20 ? "CRITICAL" : "WARNING",
            alertText: med.stockQuantity < 20 ? "Critical Shortage" : "Approaching Reorder Limit",
        })),
        statAlertsCount: urgentLabOrders.filter((l) => l.isStatUrgent).length,
    };
    return res.json(responseData);
});
