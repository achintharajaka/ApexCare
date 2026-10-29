"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingRouter = void 0;
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const uuid_1 = require("uuid");
const store_js_1 = require("../../db/store.js");
const env_js_1 = require("../../config/env.js");
const realtime_service_js_1 = require("../realtime/realtime.service.js");
exports.billingRouter = (0, express_1.Router)();
// In-memory idempotency cache for webhooks and payments
const idempotencyStore = new Set();
// Get all bills
exports.billingRouter.get("/", (req, res) => {
    const { status, mrn } = req.query;
    let filtered = [...store_js_1.bills];
    if (status && status !== "All") {
        filtered = filtered.filter((b) => b.paymentStatus.toLowerCase() === status.toLowerCase());
    }
    if (mrn) {
        filtered = filtered.filter((b) => b.patientMrn.toLowerCase().includes(mrn.toLowerCase()));
    }
    return res.json(filtered);
});
// Pull unbilled charges and account ledger for a patient
exports.billingRouter.get("/patient/:mrn", (req, res) => {
    const mrn = String(req.params.mrn);
    const patient = store_js_1.patients.find((p) => p.mrn.toLowerCase() === mrn.toLowerCase() || p.id === mrn);
    if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
    }
    const existingBill = store_js_1.bills.find((b) => b.patientId === patient.id || b.patientMrn.toLowerCase() === mrn.toLowerCase());
    if (existingBill) {
        return res.json({
            patient,
            bill: existingBill,
        });
    }
    // Generate dynamic unbilled charge builder for new patient visit
    const dynamicBill = {
        id: `bill-${patient.mrn}-01`,
        tenantId: "tenant-apexcare-01",
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        patientMrn: patient.mrn,
        accountantId: "usr-admin-01",
        accountantName: "Super Administrator",
        invoiceDate: new Date().toISOString(),
        totalAmount: 335.0,
        discount: 150.0,
        netPayable: 185.0,
        paymentStatus: "Unpaid",
        items: [
            { id: "bi-dyn-01", serviceType: "Consultation", description: "Attending Physician Examination", unitPrice: 150.0, quantity: 1, lineTotal: 150.0 },
            { id: "bi-dyn-02", serviceType: "Laboratory", description: "Standard Blood Chemistry & Vitals Panel", unitPrice: 85.0, quantity: 1, lineTotal: 85.0 },
            { id: "bi-dyn-03", serviceType: "Pharmacy", description: "Prescription Dispensing & Medical Supplies", unitPrice: 100.0, quantity: 1, lineTotal: 100.0 },
        ],
        payments: [],
    };
    store_js_1.bills.push(dynamicBill);
    return res.json({
        patient,
        bill: dynamicBill,
    });
});
// Create new invoice
exports.billingRouter.post("/invoices", (req, res) => {
    const { patientId, items, discount } = req.body;
    const patient = store_js_1.patients.find((p) => p.id === patientId || p.mrn.toLowerCase() === patientId.toLowerCase());
    if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
    }
    const lineItems = (items || []).map((it, idx) => ({
        id: `bi-${(0, uuid_1.v4)().substring(0, 8)}-${idx}`,
        serviceType: it.serviceType || "General Service",
        description: it.description || "Medical Service Item",
        unitPrice: Number(it.unitPrice) || 0,
        quantity: Number(it.quantity) || 1,
        lineTotal: (Number(it.unitPrice) || 0) * (Number(it.quantity) || 1),
    }));
    const totalAmount = lineItems.reduce((acc, curr) => acc + curr.lineTotal, 0);
    const discountAmount = Number(discount) || 0;
    const netPayable = Math.max(0, totalAmount - discountAmount);
    const newBill = {
        id: `bill-${(0, uuid_1.v4)().substring(0, 8)}`,
        tenantId: "tenant-apexcare-01",
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        patientMrn: patient.mrn,
        accountantId: req.user?.id || "usr-admin-01",
        accountantName: req.user?.fullName || "Super Administrator",
        invoiceDate: new Date().toISOString(),
        totalAmount,
        discount: discountAmount,
        netPayable,
        paymentStatus: "Unpaid",
        items: lineItems,
        payments: [],
    };
    store_js_1.bills.unshift(newBill);
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("billing", "create", newBill);
    (0, store_js_1.logAudit)("INVOICE_GENERATED", "Bill", newBill.id, req.user?.id || "usr-acct-01", req.ip);
    return res.status(201).json(newBill);
});
// Update invoice / bill details
exports.billingRouter.put("/invoices/:id", (req, res) => {
    const id = String(req.params.id);
    const index = store_js_1.bills.findIndex((b) => b.id === id);
    if (index === -1) {
        return res.status(404).json({ error: "Invoice not found" });
    }
    const current = store_js_1.bills[index];
    const { paymentStatus, discount, items } = req.body;
    let totalAmount = current.totalAmount;
    let lineItems = current.items;
    if (items && Array.isArray(items)) {
        lineItems = items.map((it, idx) => ({
            id: it.id || `bi-${(0, uuid_1.v4)().substring(0, 8)}-${idx}`,
            serviceType: it.serviceType || "Medical Service",
            description: it.description || "Service Item",
            unitPrice: Number(it.unitPrice) || 0,
            quantity: Number(it.quantity) || 1,
            lineTotal: (Number(it.unitPrice) || 0) * (Number(it.quantity) || 1),
        }));
        totalAmount = lineItems.reduce((acc, curr) => acc + curr.lineTotal, 0);
    }
    const discountAmount = discount !== undefined ? Number(discount) : current.discount;
    const netPayable = Math.max(0, totalAmount - discountAmount);
    const updatedBill = {
        ...current,
        items: lineItems,
        totalAmount,
        discount: discountAmount,
        netPayable,
        paymentStatus: paymentStatus || current.paymentStatus,
    };
    store_js_1.bills[index] = updatedBill;
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("billing", "update", updatedBill);
    (0, store_js_1.logAudit)("INVOICE_UPDATED", "Bill", updatedBill.id, req.user?.id || "usr-admin-01", req.ip);
    return res.json(updatedBill);
});
// Cancel or delete invoice / bill (Super Admin)
exports.billingRouter.delete("/invoices/:id", (req, res) => {
    const id = String(req.params.id);
    const index = store_js_1.bills.findIndex((b) => b.id === id);
    if (index === -1) {
        return res.status(404).json({ error: "Invoice not found" });
    }
    const deletedBill = store_js_1.bills[index];
    store_js_1.bills.splice(index, 1);
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("billing", "delete", deletedBill);
    (0, store_js_1.logAudit)("INVOICE_VOIDED", "Bill", deletedBill.id, req.user?.id || "usr-admin-01", req.ip);
    return res.json({
        success: true,
        message: `Invoice ${deletedBill.id} for ${deletedBill.patientName} was voided and deleted.`,
        deletedId: deletedBill.id,
    });
});
// Export Invoice as CSV
exports.billingRouter.get("/invoices/:id/csv", (req, res) => {
    const id = String(req.params.id);
    const bill = store_js_1.bills.find((b) => b.id === id);
    if (!bill) {
        return res.status(404).json({ error: "Invoice not found" });
    }
    let csv = "\uFEFF"; // UTF-8 BOM
    csv += `ApexCare Health Network - Official Clinical Billing Statement\r\n`;
    csv += `Invoice Number,${bill.id}\r\n`;
    csv += `Invoice Date,${new Date(bill.invoiceDate).toLocaleString()}\r\n`;
    csv += `Patient Name,${bill.patientName}\r\n`;
    csv += `Patient MRN,${bill.patientMrn}\r\n`;
    csv += `Billing Officer,${bill.accountantName}\r\n`;
    csv += `Payment Status,${bill.paymentStatus}\r\n\r\n`;
    csv += "ITEMIZED SERVICES & CLINICAL CHARGES\r\n";
    csv += "Service Type,Description,Unit Price (Rs.),Quantity,Line Total (Rs.)\r\n";
    bill.items.forEach((item) => {
        csv += `"${item.serviceType}","${item.description}",${item.unitPrice},${item.quantity},${item.lineTotal}\r\n`;
    });
    csv += "\r\n";
    csv += "FINANCIAL TOTALS\r\n";
    csv += `Gross Total,Rs. ${bill.totalAmount}\r\n`;
    csv += `Insurance Subsidy / Discount,-Rs. ${bill.discount}\r\n`;
    csv += `Net Patient Responsibility,Rs. ${bill.netPayable}\r\n`;
    const totalPaid = bill.payments.reduce((acc, p) => acc + p.amountPaid, 0);
    csv += `Total Amount Settled,Rs. ${totalPaid}\r\n`;
    csv += `Outstanding Balance,Rs. ${Math.max(0, bill.netPayable - totalPaid)}\r\n\r\n`;
    if (bill.payments.length > 0) {
        csv += "PAYMENT SETTLEMENT HISTORY\r\n";
        csv += "Payment ID,Date,Method,Reference,Amount Settled (Rs.)\r\n";
        bill.payments.forEach((p) => {
            csv += `${p.id},${new Date(p.paidAt).toLocaleString()},"${p.paymentMethod}","${p.transactionRef}",${p.amountPaid}\r\n`;
        });
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="ApexCare_Invoice_${bill.id}.csv"`);
    return res.send(csv);
});
// Export Invoice as Excel (.xls / SpreadsheetML)
exports.billingRouter.get("/invoices/:id/excel", (req, res) => {
    const id = String(req.params.id);
    const bill = store_js_1.bills.find((b) => b.id === id);
    if (!bill) {
        return res.status(404).json({ error: "Invoice not found" });
    }
    const totalPaid = bill.payments.reduce((acc, p) => acc + p.amountPaid, 0);
    const balanceDue = Math.max(0, bill.netPayable - totalPaid);
    const excelHtml = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Hospital Invoice</x:Name>
          <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1e293b; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 24px; }
    th { background-color: #0f766e; color: #ffffff; font-weight: bold; padding: 10px 14px; border: 1px solid #94a3b8; text-align: left; }
    td { padding: 8px 14px; border: 1px solid #cbd5e1; }
    .title { font-size: 16pt; font-weight: bold; color: #0f172a; margin-bottom: 4px; }
    .subtitle { font-size: 10pt; color: #64748b; margin-bottom: 16px; }
    .section-title { font-size: 12pt; font-weight: bold; background-color: #f1f5f9; color: #0f766e; padding: 8px 12px; }
    .currency { text-align: right; font-family: Consolas, monospace; }
    .bold { font-weight: bold; }
  </style>
</head>
<body>
  <div class="title">ApexCare Health Network - Official Clinical Billing Statement</div>
  <div class="subtitle">Tax Invoice #${bill.id} | Generated: ${new Date().toLocaleString()}</div>

  <table>
    <tr><th colspan="4" class="section-title">PATIENT & INVOICE DETAILS</th></tr>
    <tr>
      <td style="font-weight: bold; background-color: #f8fafc;">Patient Name</td>
      <td>${bill.patientName}</td>
      <td style="font-weight: bold; background-color: #f8fafc;">MRN</td>
      <td>${bill.patientMrn}</td>
    </tr>
    <tr>
      <td style="font-weight: bold; background-color: #f8fafc;">Invoice Date</td>
      <td>${new Date(bill.invoiceDate).toLocaleString()}</td>
      <td style="font-weight: bold; background-color: #f8fafc;">Payment Status</td>
      <td style="font-weight: bold; color: ${bill.paymentStatus === 'Paid' ? '#047857' : '#b45309'};">${bill.paymentStatus}</td>
    </tr>
    <tr>
      <td style="font-weight: bold; background-color: #f8fafc;">Billing Officer</td>
      <td>${bill.accountantName}</td>
      <td style="font-weight: bold; background-color: #f8fafc;">Net Balance Due</td>
      <td class="currency bold" style="color: #0f766e;">Rs. ${bill.netPayable.toLocaleString()}</td>
    </tr>
  </table>

  <table>
    <tr><th colspan="5" class="section-title">ITEMIZED SERVICES & PROCEDURES</th></tr>
    <tr style="background-color: #0f766e; color: white;">
      <th>Service Category</th>
      <th>Description</th>
      <th style="text-align: right;">Unit Price (Rs.)</th>
      <th style="text-align: center;">Qty</th>
      <th style="text-align: right;">Line Total (Rs.)</th>
    </tr>
    ${bill.items.map((it) => `
    <tr>
      <td style="font-weight: bold;">${it.serviceType}</td>
      <td>${it.description}</td>
      <td class="currency">Rs. ${Number(it.unitPrice).toLocaleString()}</td>
      <td style="text-align: center;">${it.quantity}</td>
      <td class="currency bold">Rs. ${Number(it.lineTotal).toLocaleString()}</td>
    </tr>`).join("")}
    <tr>
      <td colspan="4" style="text-align: right; font-weight: bold;">Gross Hospital Charges:</td>
      <td class="currency bold">Rs. ${bill.totalAmount.toLocaleString()}</td>
    </tr>
    <tr>
      <td colspan="4" style="text-align: right; color: #047857; font-weight: bold;">Insurance Subsidy / Deduction:</td>
      <td class="currency bold" style="color: #047857;">-Rs. ${bill.discount.toLocaleString()}</td>
    </tr>
    <tr style="background-color: #f0fdfa;">
      <td colspan="4" style="text-align: right; font-weight: bold; font-size: 12pt;">Net Patient Responsibility:</td>
      <td class="currency bold" style="font-size: 12pt; color: #0f766e;">Rs. ${bill.netPayable.toLocaleString()}</td>
    </tr>
    <tr>
      <td colspan="4" style="text-align: right; font-weight: bold;">Total Amount Settled:</td>
      <td class="currency bold">Rs. ${totalPaid.toLocaleString()}</td>
    </tr>
    <tr style="background-color: #fff1f2;">
      <td colspan="4" style="text-align: right; font-weight: bold; color: #9f1239;">Remaining Outstanding Balance:</td>
      <td class="currency bold" style="color: #9f1239;">Rs. ${balanceDue.toLocaleString()}</td>
    </tr>
  </table>
</body>
</html>
  `;
    res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="ApexCare_Invoice_${bill.id}.xls"`);
    return res.send(excelHtml);
});
// Process settlement payment with idempotency protection
exports.billingRouter.post("/payments", (req, res) => {
    const { billId, amountPaid, paymentMethod, transactionRef, idempotencyKey } = req.body;
    const bill = store_js_1.bills.find((b) => b.id === billId);
    if (!bill) {
        return res.status(404).json({ error: "Bill not found" });
    }
    // Idempotency check: prevent duplicate charges
    const key = idempotencyKey || `idemp-${(0, uuid_1.v4)()}`;
    if (idempotencyStore.has(key)) {
        return res.status(200).json({ message: "Transaction already processed", bill });
    }
    idempotencyStore.add(key);
    const paymentRecord = {
        id: `pay-${(0, uuid_1.v4)().substring(0, 8)}`,
        idempotencyKey: key,
        amountPaid: Number(amountPaid) || bill.netPayable,
        paymentMethod: paymentMethod || "Cash",
        transactionRef: transactionRef || `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        paidAt: new Date().toISOString(),
    };
    bill.payments.push(paymentRecord);
    // Check if fully paid
    const totalPaid = bill.payments.reduce((acc, p) => acc + p.amountPaid, 0);
    if (totalPaid >= bill.netPayable) {
        bill.paymentStatus = "Paid";
    }
    else if (totalPaid > 0) {
        bill.paymentStatus = "Partially_Paid";
    }
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("billing", "payment", { bill, paymentRecord });
    (0, store_js_1.logAudit)("PAYMENT_RECORDED", "Payment", paymentRecord.id, req.user?.id || "usr-acct-01", req.ip);
    return res.status(201).json({
        message: "Payment processed successfully",
        payment: paymentRecord,
        bill,
        officialReceipt: {
            receiptNumber: `REC-${paymentRecord.transactionRef}`,
            issuedDate: paymentRecord.paidAt,
            patientName: bill.patientName,
            patientMrn: bill.patientMrn,
            amountSettled: paymentRecord.amountPaid,
            method: paymentRecord.paymentMethod,
            cashier: (req.user?.fullName || "Super Administrator") + " (Terminal 01)",
            hospitalName: "ApexCare Health Network",
        },
    });
});
// Payment Gateway Webhook Hardening (Section 5.4)
exports.billingRouter.post("/webhook", (req, res) => {
    // 1. IP Range Restriction / Whitelist
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const normalizedIp = clientIp.split(",")[0].trim();
    // In development, allow localhost/loopback
    const allowed = env_js_1.env.PAYMENT_GATEWAY_ALLOWED_IPS.includes(normalizedIp) || normalizedIp.includes("127.0.0.1") || normalizedIp.includes("::1");
    if (!allowed && env_js_1.env.NODE_ENV === "production") {
        return res.status(403).json({ error: "Forbidden: Untrusted Payment Gateway Origin" });
    }
    // 2. Cryptographic Signature Verification
    const signature = req.headers["x-payment-signature"];
    const rawBody = JSON.stringify(req.body);
    if (signature) {
        const expectedSignature = crypto_1.default
            .createHmac("sha256", env_js_1.env.PAYMENT_GATEWAY_WEBHOOK_SECRET)
            .update(rawBody)
            .digest("hex");
        if (signature !== expectedSignature) {
            return res.status(401).json({ error: "Unauthorized: Invalid Webhook HMAC Signature" });
        }
    }
    // 3. Idempotency Tracking
    const { eventId, billId, amount, transactionRef } = req.body;
    const idempotencyKey = `idempotency:payment:${eventId || (0, uuid_1.v4)()}`;
    if (idempotencyStore.has(idempotencyKey)) {
        return res.status(200).json({ status: "Already Processed or In Flight" });
    }
    idempotencyStore.add(idempotencyKey);
    const bill = store_js_1.bills.find((b) => b.id === billId);
    if (bill) {
        bill.paymentStatus = "Paid";
        bill.payments.push({
            id: `pay-webhook-${(0, uuid_1.v4)().substring(0, 6)}`,
            idempotencyKey,
            amountPaid: Number(amount) || bill.netPayable,
            paymentMethod: "Gateway Card",
            transactionRef: transactionRef || `WEBHOOK-${Date.now()}`,
            paidAt: new Date().toISOString(),
        });
        (0, store_js_1.saveStorage)();
        (0, realtime_service_js_1.notifyChange)("billing", "webhook_payment", bill);
    }
    return res.status(200).json({ status: "Payment Confirmed via Webhook" });
});
