import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bill } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface BillingTerminalViewProps {
  initialMrn?: string;
  onOpenEmr: (patientId: string) => void;
}

export const BillingTerminalView: React.FC<BillingTerminalViewProps> = ({
  initialMrn = '',
  onOpenEmr,
}) => {
  const { user, activeRole } = useAuth();
  const isSuperAdmin = activeRole === 'ADMIN';
  const canManageBilling = isSuperAdmin || activeRole === 'RECEPTIONIST' || activeRole === 'ACCOUNTANT';

  const [mrnInput, setMrnInput] = useState(initialMrn);
  const [billData, setBillData] = useState<{ patient: any; bill: Bill } | null>(null);
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);

  // Settlement Form State
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Credit Card' | 'Insurance' | 'Bank Transfer'>('Credit Card');
  const [tenderedAmount, setTenderedAmount] = useState<number>(0);
  const [officialReceipt, setOfficialReceipt] = useState<any>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  // CRUD State for Billing
  const [deletingBill, setDeletingBill] = useState<Bill | null>(null);
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [patientsList, setPatientsList] = useState<{ id: string; mrn: string; firstName: string; lastName: string }[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Export State for Invoice
  const [invoiceExportTarget, setInvoiceExportTarget] = useState<{ bill: Bill; patient: any } | null>(null);
  const [showInvoicePdfModal, setShowInvoicePdfModal] = useState(false);

  // New Invoice Form State
  const [newInvoicePatientId, setNewInvoicePatientId] = useState('');
  const [newInvoiceDiscount, setNewInvoiceDiscount] = useState<number>(0);
  const [newInvoiceItems, setNewInvoiceItems] = useState([
    { serviceType: 'Consultation', description: 'Attending Physician Clinical Examination', unitPrice: 1500, quantity: 1 },
  ]);

  // Auto-clear feedback notification
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Helper: Trigger browser file download
  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Fetch single patient bill (with silent refresh support to prevent DOM collapse and scroll jump)
  const fetchPatientBill = async (mrn: string, isSilent = false) => {
    if (!mrn) {
      if (!isSilent) setLoading(false);
      return;
    }
    // Only show full loader if not a silent background refresh and no bill is loaded yet
    if (!isSilent && !billData) setLoading(true);

    try {
      const res = await axios.get(`/api/billing/patient/${mrn}`);
      setBillData(res.data);
      // Only set initial tendered amount if user hasn't changed it or if not set yet
      if (res.data?.bill) {
        setTenderedAmount((prev) => (prev > 0 ? prev : res.data.bill.netPayable));
      }
    } catch (e) {
      console.error('Failed to load bill', e);
      if (!isSilent) setBillData(null);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await axios.get('/api/patients');
      setPatientsList(res.data);
      if (res.data.length > 0 && !newInvoicePatientId) {
        setNewInvoicePatientId(res.data[0].id);
      }
    } catch (e) {
      console.error('Failed to load patients for billing', e);
    }
  };

  const loadAllBills = async () => {
    try {
      const res = await axios.get('/api/billing');
      if (Array.isArray(res.data)) {
        setAllBills(res.data);
        // If no bill is currently loaded and no initial MRN was provided, auto-load first bill
        if (!mrnInput && !initialMrn && res.data.length > 0 && !billData) {
          const first = res.data[0];
          setMrnInput(first.patientMrn);
          fetchPatientBill(first.patientMrn, false);
        }
      }
    } catch (e) {
      console.error('Failed to load billing registry', e);
    }
  };

  const handleDeleteBill = async () => {
    if (!deletingBill) return;
    setSubmittingInvoice(true);
    try {
      await axios.delete(`/api/billing/invoices/${deletingBill.id}`);
      setFeedback({ type: 'success', message: `Invoice #${deletingBill.id} for ${deletingBill.patientName} was voided and deleted.` });
      setDeletingBill(null);
      if (billData?.bill.id === deletingBill.id) {
        setBillData(null);
      }
      loadAllBills();
    } catch (e: any) {
      setFeedback({ type: 'error', message: e?.response?.data?.error || 'Failed to void invoice.' });
    } finally {
      setSubmittingInvoice(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoicePatientId) {
      setFeedback({ type: 'error', message: 'Please select a patient.' });
      return;
    }
    setSubmittingInvoice(true);
    try {
      const res = await axios.post('/api/billing/invoices', {
        patientId: newInvoicePatientId,
        discount: newInvoiceDiscount,
        items: newInvoiceItems,
      });
      setFeedback({ type: 'success', message: `Invoice #${res.data.id} created for ${res.data.patientName}.` });
      setShowNewInvoiceModal(false);
      setMrnInput(res.data.patientMrn);
      fetchPatientBill(res.data.patientMrn, false);
      loadAllBills();
    } catch (e: any) {
      setFeedback({ type: 'error', message: e?.response?.data?.error || 'Failed to create invoice.' });
    } finally {
      setSubmittingInvoice(false);
    }
  };

  useEffect(() => {
    loadAllBills();
    fetchPatients();
    if (initialMrn) {
      setMrnInput(initialMrn);
      fetchPatientBill(initialMrn, false);
    }

    // Live continuous sync interval (every 6 seconds - SILENT to prevent scroll jumping)
    const interval = setInterval(() => {
      loadAllBills();
      if (mrnInput) {
        fetchPatientBill(mrnInput, true);
      }
    }, 6000);

    // Instant update on realtime event (SILENT to preserve scroll position)
    const handleSync = (e: any) => {
      const detail = e.detail;
      if (!detail?.entity || detail.entity === 'billing' || detail.entity === 'patients') {
        loadAllBills();
        if (mrnInput) {
          fetchPatientBill(mrnInput, true);
        }
      }
    };
    window.addEventListener('apexcare:sync', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('apexcare:sync', handleSync);
    };
  }, [initialMrn, mrnInput]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mrnInput.trim()) {
      fetchPatientBill(mrnInput.trim(), false);
    }
  };

  const handleProcessPayment = async () => {
    if (!billData?.bill) return;
    setProcessingPayment(true);

    try {
      const res = await axios.post('/api/billing/payments', {
        billId: billData.bill.id,
        amountPaid: tenderedAmount,
        paymentMethod,
        transactionRef: `TXN-${paymentMethod.toUpperCase().slice(0, 4)}-${Math.floor(100000 + Math.random() * 900000)}`,
      });

      setOfficialReceipt(res.data.officialReceipt);
      fetchPatientBill(billData.patient.mrn, true);
      setFeedback({ type: 'success', message: `Payment settled successfully. Official Receipt generated.` });
    } catch (e) {
      setFeedback({ type: 'error', message: 'Error processing payment settlement.' });
    } finally {
      setProcessingPayment(false);
    }
  };

  // --------------------------------------------------------------------------
  // INVOICE EXPORT LOGIC (PDF / PRINT, EXCEL, CSV)
  // --------------------------------------------------------------------------
  const handleOpenInvoiceExport = (targetBill: Bill, targetPatient?: any) => {
    let p = targetPatient;
    if (!p) {
      const matched = patientsList.find((pt) => pt.id === targetBill.patientId || pt.mrn === targetBill.patientMrn);
      p = matched || {
        firstName: targetBill.patientName.split(' ')[0] || targetBill.patientName,
        lastName: targetBill.patientName.split(' ').slice(1).join(' ') || '',
        mrn: targetBill.patientMrn,
        gender: 'Patient',
        age: '-',
        insuranceProvider: 'Standard Self-Pay',
        insurancePolicyNumber: 'N/A',
        wardBed: 'Clinical Outpatient Area',
      };
    }
    setInvoiceExportTarget({ bill: targetBill, patient: p });
    setShowInvoicePdfModal(true);
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleExportInvoiceExcel = (targetBill?: Bill, targetPatient?: any) => {
    const b = targetBill || invoiceExportTarget?.bill || billData?.bill;
    const p = targetPatient || invoiceExportTarget?.patient || billData?.patient || {
      firstName: b?.patientName || 'Patient',
      lastName: '',
      mrn: b?.patientMrn || 'MRN-N/A',
    };

    if (!b) return;

    try {
      const totalPaid = (b.payments || []).reduce((acc: number, curr: any) => acc + curr.amountPaid, 0);
      const balanceDue = Math.max(0, b.netPayable - totalPaid);

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
  <div class="subtitle">Tax Invoice #${b.id} | Generated: ${new Date().toLocaleString()}</div>

  <table>
    <tr><th colspan="4" class="section-title">PATIENT & INVOICE DETAILS</th></tr>
    <tr>
      <td style="font-weight: bold; background-color: #f8fafc;">Patient Name</td>
      <td>${b.patientName}</td>
      <td style="font-weight: bold; background-color: #f8fafc;">MRN</td>
      <td>${b.patientMrn}</td>
    </tr>
    <tr>
      <td style="font-weight: bold; background-color: #f8fafc;">Invoice Date</td>
      <td>${new Date(b.invoiceDate).toLocaleString()}</td>
      <td style="font-weight: bold; background-color: #f8fafc;">Payment Status</td>
      <td style="font-weight: bold; color: ${b.paymentStatus === 'Paid' ? '#047857' : '#b45309'};">${b.paymentStatus}</td>
    </tr>
    <tr>
      <td style="font-weight: bold; background-color: #f8fafc;">Billing Officer</td>
      <td>${b.accountantName || 'Super Administrator'}</td>
      <td style="font-weight: bold; background-color: #f8fafc;">Net Patient Responsibility</td>
      <td class="currency bold" style="color: #0f766e;">Rs. ${Number(b.netPayable).toLocaleString()}</td>
    </tr>
  </table>

  <table>
    <tr><th colspan="5" class="section-title">ITEMIZED CLINICAL CHARGES & SERVICES</th></tr>
    <tr style="background-color: #0f766e; color: white;">
      <th>Service Category</th>
      <th>Description</th>
      <th style="text-align: right;">Unit Price (Rs.)</th>
      <th style="text-align: center;">Qty</th>
      <th style="text-align: right;">Line Total (Rs.)</th>
    </tr>
    ${(b.items || []).map((it: any) => `
    <tr>
      <td style="font-weight: bold;">${it.serviceType}</td>
      <td>${it.description}</td>
      <td class="currency">Rs. ${Number(it.unitPrice).toLocaleString()}</td>
      <td style="text-align: center;">${it.quantity}</td>
      <td class="currency bold">Rs. ${Number(it.lineTotal).toLocaleString()}</td>
    </tr>`).join('')}
    <tr>
      <td colspan="4" style="text-align: right; font-weight: bold;">Gross Hospital Charges:</td>
      <td class="currency bold">Rs. ${Number(b.totalAmount).toLocaleString()}</td>
    </tr>
    <tr>
      <td colspan="4" style="text-align: right; color: #047857; font-weight: bold;">Insurance Benefit / Deduction:</td>
      <td class="currency bold" style="color: #047857;">-Rs. ${Number(b.discount).toLocaleString()}</td>
    </tr>
    <tr style="background-color: #f0fdfa;">
      <td colspan="4" style="text-align: right; font-weight: bold; font-size: 12pt;">Net Patient Responsibility:</td>
      <td class="currency bold" style="font-size: 12pt; color: #0f766e;">Rs. ${Number(b.netPayable).toLocaleString()}</td>
    </tr>
    <tr>
      <td colspan="4" style="text-align: right; font-weight: bold;">Total Amount Settled:</td>
      <td class="currency bold">Rs. ${Number(totalPaid).toLocaleString()}</td>
    </tr>
    <tr style="background-color: #fff1f2;">
      <td colspan="4" style="text-align: right; font-weight: bold; color: #9f1239;">Remaining Outstanding Balance:</td>
      <td class="currency bold" style="color: #9f1239;">Rs. ${Number(balanceDue).toLocaleString()}</td>
    </tr>
  </table>
</body>
</html>
      `;

      triggerDownload(
        excelHtml,
        `ApexCare_Invoice_${b.id}_${b.patientMrn}.xls`,
        'application/vnd.ms-excel;charset=utf-8'
      );
      setFeedback({ type: 'success', message: `Invoice #${b.id} successfully exported as Excel workbook.` });
    } catch (e) {
      console.error(e);
      setFeedback({ type: 'error', message: 'Failed to generate Excel export.' });
    }
  };

  const handleExportInvoiceCsv = (targetBill?: Bill, targetPatient?: any) => {
    const b = targetBill || invoiceExportTarget?.bill || billData?.bill;
    if (!b) return;

    try {
      const totalPaid = (b.payments || []).reduce((acc: number, curr: any) => acc + curr.amountPaid, 0);
      const balanceDue = Math.max(0, b.netPayable - totalPaid);

      let csv = '\uFEFF'; // UTF-8 BOM
      csv += 'ApexCare Health Network - Official Clinical Billing Statement\r\n';
      csv += `Invoice Number,${b.id}\r\n`;
      csv += `Invoice Date,${new Date(b.invoiceDate).toLocaleString()}\r\n`;
      csv += `Patient Name,"${b.patientName}"\r\n`;
      csv += `Patient MRN,${b.patientMrn}\r\n`;
      csv += `Payment Status,${b.paymentStatus}\r\n`;
      csv += `Billing Cashier,"${b.accountantName || 'Super Administrator'}"\r\n\r\n`;

      csv += 'ITEMIZED CLINICAL CHARGES\r\n';
      csv += 'Service Category,Description,Unit Price (Rs.),Quantity,Line Total (Rs.)\r\n';
      (b.items || []).forEach((it: any) => {
        csv += `"${it.serviceType}","${it.description}",${it.unitPrice},${it.quantity},${it.lineTotal}\r\n`;
      });
      csv += '\r\n';

      csv += 'FINANCIAL RECONCILIATION\r\n';
      csv += 'Metric,Amount (Rs.)\r\n';
      csv += `Gross Total,${b.totalAmount}\r\n`;
      csv += `Insurance Subsidy / Deduction,-${b.discount}\r\n`;
      csv += `Net Patient Responsibility,${b.netPayable}\r\n`;
      csv += `Total Amount Settled,${totalPaid}\r\n`;
      csv += `Remaining Balance Due,${balanceDue}\r\n\r\n`;

      if (b.payments && b.payments.length > 0) {
        csv += 'SETTLEMENT TRANSACTION HISTORY\r\n';
        csv += 'Payment ID,Date,Method,Transaction Ref,Amount (Rs.)\r\n';
        b.payments.forEach((p: any) => {
          csv += `${p.id},"${new Date(p.paidAt).toLocaleString()}","${p.paymentMethod}","${p.transactionRef}",${p.amountPaid}\r\n`;
        });
      }

      triggerDownload(
        csv,
        `ApexCare_Invoice_${b.id}_${b.patientMrn}.csv`,
        'text/csv;charset=utf-8'
      );
      setFeedback({ type: 'success', message: `Invoice #${b.id} successfully exported as CSV.` });
    } catch (e) {
      console.error(e);
      setFeedback({ type: 'error', message: 'Failed to generate CSV export.' });
    }
  };

  const bill = billData?.bill;
  const patient = billData?.patient;
  const changeDue = Math.max(0, tenderedAmount - (bill?.netPayable || 0));

  return (
    <div className="flex flex-col w-full space-y-space-md">
      {/* Scoped Print Stylesheet for Invoices */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #apexcare-invoice-print-area, #apexcare-invoice-print-area * {
            visibility: visible !important;
          }
          #apexcare-invoice-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            background: #ffffff !important;
            color: #0f172a !important;
            display: block !important;
            z-index: 999999 !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
        }
      `}</style>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`px-4 py-3 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-xs transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              {feedback.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Omni Search and Quick Switcher Header */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md bg-bg-surface p-space-md rounded-xl border border-border-subtle shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">
            search
          </span>
          <input
            type="text"
            value={mrnInput}
            onChange={(e) => setMrnInput(e.target.value)}
            placeholder="Search patient by MRN, National ID, or Invoice #..."
            className="w-full h-10 pl-11 pr-24 rounded-lg bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-primary-teal transition-all"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-primary-teal text-white text-xs font-semibold rounded hover:bg-primary-teal-hover transition-colors"
          >
            Lookup
          </button>
        </form>

        {/* Quick Session Badges & Actions */}
        <div className="flex items-center gap-space-sm flex-wrap">
          <button
            type="button"
            onClick={() => mrnInput && fetchPatientBill(mrnInput, false)}
            disabled={loading || !mrnInput}
            className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border-subtle bg-bg-surface hover:bg-bg-surface-subtle text-slate-700 font-title-sm text-xs sm:text-sm shadow-xs transition-colors"
            title="Refresh Patient Bill"
          >
            <span className={`material-symbols-outlined text-[18px] text-primary-teal ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {canManageBilling && (
            <button
              type="button"
              onClick={() => {
                fetchPatients();
                setShowNewInvoiceModal(true);
              }}
              className="flex items-center gap-1.5 h-10 px-3.5 rounded-lg bg-primary-teal text-white hover:bg-primary-teal-hover font-title-sm text-xs sm:text-sm shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>New Invoice</span>
            </button>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-800 border border-sky-200">
            <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            <span className="text-xs font-medium">Shift Cash Drawer: <strong>Rs. 0.00</strong></span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
            <span className="material-symbols-outlined text-[18px]">point_of_sale</span>
            <span className="text-xs font-semibold">Terminal 01 (Cashier Desk)</span>
          </div>
        </div>
      </div>

      {/* Dynamic Content: Spinner ONLY if loading and no billData loaded yet */}
      {loading && !billData ? (
        <div className="flex items-center justify-center min-h-[40vh] bg-bg-surface rounded-xl border border-border-subtle p-8">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-primary-teal border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-slate-500 font-medium">Retrieving Patient Billing Ledger...</span>
          </div>
        </div>
      ) : patient && bill ? (
        <>
          {/* Patient Profile & Insurance State Banner */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-md bg-bg-surface p-space-md rounded-xl border border-border-subtle shadow-xs">
            <div className="xl:col-span-8 flex flex-col md:flex-row md:items-center justify-between gap-space-md bg-slate-50 p-space-md rounded-lg border border-slate-200">
              <div className="flex items-center gap-space-md min-w-0">
                <div className="w-12 h-12 rounded-full bg-cyan-700 text-white flex items-center justify-center font-bold text-base shadow-xs">
                  {patient.firstName[0]}{patient.lastName[0]}
                </div>
                <div>
                  <div className="flex items-center gap-space-sm flex-wrap">
                    <span className="text-base font-semibold text-slate-900">
                      {patient.firstName} {patient.lastName}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-label-tabular">
                      {patient.gender[0]}, {patient.age}y
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-sky-100 text-primary-teal text-xs font-semibold font-label-tabular">
                      {patient.mrn}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">verified</span> Verified Patient
                    </span>
                  </div>
                  <div className="flex items-center gap-space-md mt-1 text-slate-600 text-xs flex-wrap">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-primary-teal">health_and_safety</span>
                      <strong>{patient.insuranceProvider || 'Self-Pay Standard'}</strong>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="font-label-tabular">Policy #{patient.insurancePolicyNumber || 'N/A'}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-emerald-700 font-semibold">Payment Status: {bill.paymentStatus}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenInvoiceExport(bill, patient)}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-teal-50 hover:bg-teal-100 border border-teal-200 text-primary-teal flex items-center gap-1 whitespace-nowrap"
                  title="Export / Print Statement (PDF)"
                >
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                  <span>Export Statement</span>
                </button>
                <button
                  onClick={() => onOpenEmr(patient.id)}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 flex items-center gap-1 whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[16px]">clinical_notes</span>
                  <span>Open EMR</span>
                </button>
              </div>
            </div>

            {/* Invoice Total Callout */}
            <div className="xl:col-span-4 bg-primary-navy text-white p-space-md rounded-lg flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span>INVOICE #{bill.id}</span>
                  <button
                    type="button"
                    onClick={() => handleOpenInvoiceExport(bill, patient)}
                    className="text-teal-300 hover:text-white p-0.5 rounded transition-colors"
                    title="Export / Print Invoice Statement"
                  >
                    <span className="material-symbols-outlined text-[16px]">print</span>
                  </button>
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => setDeletingBill(bill)}
                      className="text-rose-300 hover:text-white p-0.5 rounded transition-colors"
                      title="Void / Delete This Invoice"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  )}
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    bill.paymentStatus === 'Paid'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-amber-400 text-slate-900'
                  }`}
                >
                  {bill.paymentStatus}
                </span>
              </div>
              <div className="my-2">
                <span className="text-xs text-slate-300 block">Total Net Balance Due</span>
                <span className="text-3xl font-bold font-label-tabular text-cyan-300">
                  Rs. {bill.netPayable.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-300 pt-2 border-t border-slate-700">
                <span>Gross: Rs. {bill.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-emerald-400">Discount: -Rs. {bill.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Main Work Area: 2 Columns */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-md items-start">
            {/* LEFT: Itemized Billing Ledger (7 Cols) */}
            <div className="xl:col-span-7 bg-bg-surface rounded-xl border border-border-subtle shadow-xs overflow-hidden">
              <div className="p-space-md border-b border-border-subtle flex items-center justify-between">
                <h2 className="font-title-sm text-title-sm text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-teal">list_alt</span>
                  Itemized Service Line Items ({bill.items.length})
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-label-tabular">
                    Date: {new Date(bill.invoiceDate).toLocaleDateString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleExportInvoiceExcel(bill, patient)}
                    className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                    title="Export items to Excel"
                  >
                    <span className="material-symbols-outlined text-[16px]">table_chart</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[550px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-4">Service Category</th>
                      <th className="py-2.5 px-4">Description</th>
                      <th className="py-2.5 px-4 text-right">Unit Price (Rs.)</th>
                      <th className="py-2.5 px-4 text-center">Qty</th>
                      <th className="py-2.5 px-4 text-right">Total (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bill.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-700">
                            {item.serviceType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-900">{item.description}</td>
                        <td className="py-3 px-4 text-right font-label-tabular text-slate-600">
                          Rs. {item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center font-label-tabular text-slate-600">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-4 text-right font-label-tabular font-bold text-slate-900">
                          Rs. {item.lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50 text-slate-700 font-medium">
                      <td colSpan={4} className="py-2 px-4 text-right">Gross Subtotal:</td>
                      <td className="py-2 px-4 text-right font-label-tabular font-bold">Rs. {bill.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="bg-slate-50 text-emerald-700 font-medium">
                      <td colSpan={4} className="py-1 px-4 text-right">Insurance Deduction / Subsidy:</td>
                      <td className="py-1 px-4 text-right font-label-tabular font-bold">-Rs. {bill.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="bg-sky-50 text-primary-navy font-bold text-sm border-t border-sky-200">
                      <td colSpan={4} className="py-2.5 px-4 text-right">Net Patient Responsibility:</td>
                      <td className="py-2.5 px-4 text-right font-label-tabular font-extrabold text-primary-teal">
                        Rs. {bill.netPayable.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* RIGHT: Point-of-Sale Payment Settlement Terminal (5 Cols) */}
            <div className="xl:col-span-5 bg-bg-surface rounded-xl border border-border-subtle shadow-xs p-space-md space-y-space-md">
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <h3 className="font-title-sm text-title-sm text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-teal">credit_card</span>
                  Payment Settlement Terminal
                </h3>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  PCI-DSS Encrypted
                </span>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                  Select Settlement Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Credit Card', 'Cash', 'Insurance', 'Bank Transfer'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`p-2.5 rounded-lg border text-xs font-medium flex items-center gap-2 transition-all ${
                        paymentMethod === method
                          ? 'border-primary-teal bg-sky-50/60 text-primary-navy font-bold shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {method === 'Credit Card'
                          ? 'credit_card'
                          : method === 'Cash'
                          ? 'payments'
                          : method === 'Insurance'
                          ? 'health_and_safety'
                          : 'account_balance'}
                      </span>
                      <span>{method}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tender Amount Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Amount Received / Tendered (Rs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={tenderedAmount}
                  onChange={(e) => setTenderedAmount(parseFloat(e.target.value) || 0)}
                  className="w-full h-10 px-3 text-sm font-label-tabular font-bold rounded-lg border border-slate-300 focus:outline-none focus:border-primary-teal"
                />
              </div>

              {/* Live Change Due calculation */}
              <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Customer Change Due:</span>
                <span className="font-label-tabular font-bold text-slate-900 text-sm">
                  Rs. {changeDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Action Buttons */}
              <button
                type="button"
                onClick={handleProcessPayment}
                disabled={processingPayment || bill.paymentStatus === 'Paid'}
                className="w-full h-11 rounded-lg bg-primary-teal hover:bg-primary-teal-hover disabled:bg-slate-300 text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">point_of_sale</span>
                <span>
                  {bill.paymentStatus === 'Paid'
                    ? 'Invoice Already Settled'
                    : processingPayment
                    ? 'Recording Transaction...'
                    : 'Process Payment & Issue Official Receipt'}
                </span>
              </button>

              {/* Export Suite for Active Invoice */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => handleOpenInvoiceExport(bill, patient)}
                  className="w-full py-2.5 text-xs text-center font-semibold rounded-lg bg-teal-50 hover:bg-teal-100 text-primary-teal border border-teal-200 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                  <span>Export Itemized Statement (PDF)</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportInvoiceExcel(bill, patient)}
                    className="py-1.5 px-2 text-[11px] text-center font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px] text-emerald-600">table_chart</span>
                    <span>Export Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportInvoiceCsv(bill, patient)}
                    className="py-1.5 px-2 text-[11px] text-center font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px] text-sky-600">grid_on</span>
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Fallback: Invoices Table if no active bill is selected */
        <div className="flex flex-col gap-4">
          <div className="bg-bg-surface rounded-xl border border-border-subtle p-6 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Recent Hospital Billing Invoices</h2>
                <p className="text-xs text-slate-500">
                  Select any active patient invoice below or enter an MRN to inspect billing details
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                {allBills.length} Invoices On Record
              </span>
            </div>

            {allBills.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50">
                      <th className="p-3">Invoice ID</th>
                      <th className="p-3">Patient Name</th>
                      <th className="p-3">MRN</th>
                      <th className="p-3">Items Count</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Net Payable</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allBills.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-medium text-slate-800">{b.id}</td>
                        <td className="p-3 font-semibold text-slate-900">{b.patientName}</td>
                        <td className="p-3 font-mono text-primary-teal font-semibold">{b.patientMrn}</td>
                        <td className="p-3 text-slate-600">{b.items?.length || 0} services</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              b.paymentStatus === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {b.paymentStatus}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          Rs. {Number(b.netPayable || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setMrnInput(b.patientMrn);
                                fetchPatientBill(b.patientMrn, false);
                              }}
                              className="px-3 py-1 rounded bg-primary-teal text-white font-semibold text-xs hover:bg-primary-teal-hover transition-colors shadow-2xs"
                            >
                              Load Invoice
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenInvoiceExport(b)}
                              className="p-1 text-slate-400 hover:text-primary-teal hover:bg-slate-100 rounded transition-colors"
                              title="Export / Print Statement (PDF)"
                            >
                              <span className="material-symbols-outlined text-[17px]">print</span>
                            </button>
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => setDeletingBill(b)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="Void / Delete Invoice"
                              >
                                <span className="material-symbols-outlined text-[17px]">delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <span className="material-symbols-outlined text-[32px] text-slate-300 mb-2">receipt_long</span>
                <p className="text-xs text-slate-500">No invoices generated yet in this billing session.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* FORMAL ITEMIZED INVOICE STATEMENT MODAL (PRINT / PDF) */}
      {/* ---------------------------------------------------- */}
      {showInvoicePdfModal && invoiceExportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-5 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden">
            {/* Modal Top Bar (Hidden during print) */}
            <div className="no-print px-5 py-4 bg-primary-navy text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-teal-400">receipt_long</span>
                <div>
                  <h2 className="text-base font-semibold">Official Clinical Billing Statement</h2>
                  <p className="text-xs text-slate-300">Invoice #{invoiceExportTarget.bill.id} • {invoiceExportTarget.bill.patientName}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportInvoiceExcel(invoiceExportTarget.bill, invoiceExportTarget.patient)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[15px]">table_chart</span>
                  <span>Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportInvoiceCsv(invoiceExportTarget.bill, invoiceExportTarget.patient)}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[15px]">grid_on</span>
                  <span>CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintInvoice}
                  className="px-3.5 py-1.5 rounded-lg bg-primary-teal hover:bg-primary-teal-hover text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>Save as PDF / Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvoicePdfModal(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Printable Document Container */}
            <div className="p-6 sm:p-8 overflow-y-auto max-h-[calc(94vh-75px)] bg-slate-50">
              <div
                id="apexcare-invoice-print-area"
                className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6 text-slate-900 font-sans"
              >
                {/* Hospital Header */}
                <div className="border-b-2 border-primary-teal pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold text-xl shadow-xs">
                      <span className="material-symbols-outlined text-[28px]">local_hospital</span>
                    </div>
                    <div>
                      <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">ApexCare Health Network</h1>
                      <p className="text-xs text-slate-500 font-medium">Tertiary Clinical Care & Hospital Revenue Cycle</p>
                      <p className="text-[10px] text-slate-400">45 Hospital Avenue, Colombo 05 • Tax/VAT: LK-MED-9941204</p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right text-xs">
                    <div className="text-lg font-bold text-primary-navy">TAX INVOICE & STATEMENT</div>
                    <div className="font-mono text-xs font-bold text-primary-teal">#{invoiceExportTarget.bill.id}</div>
                    <div className="text-[11px] text-slate-500">Date: {new Date(invoiceExportTarget.bill.invoiceDate).toLocaleString()}</div>
                    <div className="mt-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        invoiceExportTarget.bill.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        STATUS: {invoiceExportTarget.bill.paymentStatus.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Patient Information & Account Card */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Patient Name</span>
                    <strong className="text-sm text-slate-900 block mt-0.5">{invoiceExportTarget.patient.firstName} {invoiceExportTarget.patient.lastName}</strong>
                    <span className="font-mono text-[11px] text-primary-teal font-semibold">MRN: {invoiceExportTarget.patient.mrn}</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Demographics</span>
                    <strong className="text-slate-800 block mt-0.5">{invoiceExportTarget.patient.gender}, {invoiceExportTarget.patient.age || '-'}y</strong>
                    <span className="text-[11px] text-slate-500">{invoiceExportTarget.patient.wardBed || 'Outpatient Clinic'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Insurance / Provider</span>
                    <strong className="text-slate-800 block mt-0.5">{invoiceExportTarget.patient.insuranceProvider || 'Self-Pay Standard'}</strong>
                    <span className="text-[11px] text-slate-500">Policy: {invoiceExportTarget.patient.insurancePolicyNumber || 'N/A'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Billing Station</span>
                    <strong className="text-slate-800 block mt-0.5">{invoiceExportTarget.bill.accountantName || 'Cashier Terminal 01'}</strong>
                    <span className="text-[11px] text-slate-500">ApexCare Hospital Desk</span>
                  </div>
                </div>

                {/* Itemized Services Ledger Table */}
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 pb-1 border-b border-slate-200">
                    Itemized Clinical Services, Diagnostics & Medications
                  </h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase border-b border-slate-200">
                          <th className="py-2.5 px-3">Service Category</th>
                          <th className="py-2.5 px-3">Clinical Description</th>
                          <th className="py-2.5 px-3 text-right">Unit Price (Rs.)</th>
                          <th className="py-2.5 px-3 text-center">Qty</th>
                          <th className="py-2.5 px-3 text-right">Line Total (Rs.)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {invoiceExportTarget.bill.items.map((it: any) => (
                          <tr key={it.id}>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">{it.serviceType}</td>
                            <td className="py-2.5 px-3 text-slate-700">{it.description}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                              Rs. {Number(it.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">{it.quantity}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              Rs. {Number(it.lineTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-slate-200 bg-slate-50 text-slate-700 font-medium">
                          <td colSpan={4} className="py-2 px-3 text-right">Gross Hospital Subtotal:</td>
                          <td className="py-2 px-3 text-right font-mono font-bold">
                            Rs. {invoiceExportTarget.bill.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr className="bg-slate-50 text-emerald-700 font-medium">
                          <td colSpan={4} className="py-1.5 px-3 text-right">Insurance Deduction / Subsidy Benefit:</td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold">
                            -Rs. {invoiceExportTarget.bill.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr className="bg-teal-50 text-primary-navy font-bold text-sm border-t-2 border-teal-300">
                          <td colSpan={4} className="py-2.5 px-3 text-right">Net Patient Responsibility:</td>
                          <td className="py-2.5 px-3 text-right font-mono font-extrabold text-primary-teal text-base">
                            Rs. {invoiceExportTarget.bill.netPayable.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Settlement Transactions (if any) */}
                {invoiceExportTarget.bill.payments && invoiceExportTarget.bill.payments.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 pb-1 border-b border-slate-200">
                      Payment Settlement History
                    </h3>
                    <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase border-b border-slate-200">
                            <th className="py-2 px-3">Payment Ref</th>
                            <th className="py-2 px-3">Date & Time</th>
                            <th className="py-2 px-3">Settlement Method</th>
                            <th className="py-2 px-3 text-right">Amount Settled</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {invoiceExportTarget.bill.payments.map((p: any) => (
                            <tr key={p.id}>
                              <td className="py-2 px-3 font-mono font-bold text-slate-800">{p.transactionRef}</td>
                              <td className="py-2 px-3 text-slate-600">{new Date(p.paidAt).toLocaleString()}</td>
                              <td className="py-2 px-3 font-medium text-slate-700">{p.paymentMethod}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                                Rs. {Number(p.amountPaid).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Sign-off & Stamp Section */}
                <div className="pt-6 border-t-2 border-slate-200">
                  <div className="grid grid-cols-3 gap-6 text-center text-xs text-slate-700">
                    <div className="border-t border-slate-300 pt-2">
                      <div className="font-bold text-slate-900">{invoiceExportTarget.bill.accountantName || 'Cashier Terminal 01'}</div>
                      <div className="text-[10px] text-slate-500">Authorized Billing Officer</div>
                    </div>
                    <div className="border-t border-slate-300 pt-2">
                      <div className="font-bold text-slate-900">{invoiceExportTarget.patient.firstName} {invoiceExportTarget.patient.lastName}</div>
                      <div className="text-[10px] text-slate-500">Patient / Guarantor Acknowledgment</div>
                    </div>
                    <div className="border-t border-slate-300 pt-2 flex flex-col items-center">
                      <div className="w-20 h-8 border border-dashed border-teal-400 rounded text-[9px] text-teal-700 flex items-center justify-center font-bold">
                        AC-SEAL
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">Official Accounts Seal</div>
                    </div>
                  </div>
                </div>

                {/* Footer terms */}
                <div className="text-[9px] text-slate-400 pt-3 border-t border-slate-100 flex justify-between items-center">
                  <span>This is a computer-generated tax and clinical hospital invoice. Official payment receipts are validated electronically.</span>
                  <span>ApexCare HMS v1.0 • Sri Lanka Network</span>
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="no-print mt-4 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  Select <strong>"Save as PDF"</strong> in your browser print destination dialog.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInvoicePdfModal(false)}
                    className="px-4 py-2 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-white font-medium"
                  >
                    Close Preview
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintInvoice}
                    className="px-5 py-2 text-xs font-semibold rounded-lg bg-primary-teal text-white hover:bg-primary-teal-hover shadow-xs flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">print</span>
                    <span>Save as PDF / Print</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete / Void Invoice Confirmation Dialog */}
      {deletingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">warning</span>
                <h2 className="text-base font-semibold">Void Hospital Invoice</h2>
              </div>
              <button
                onClick={() => setDeletingBill(null)}
                className="text-rose-100 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-rose-50 p-3.5 rounded-lg border border-rose-200 text-xs">
                <p className="font-semibold text-rose-900 mb-1">
                  Are you sure you want to void and delete this patient invoice?
                </p>
                <p className="text-rose-700">
                  This action will permanently purge Invoice #{deletingBill.id} and all its itemized charges from the ledger.
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice ID:</span>
                  <span className="font-mono font-bold text-slate-800">{deletingBill.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient:</span>
                  <span className="font-semibold text-slate-800">{deletingBill.patientName} ({deletingBill.patientMrn})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-semibold text-slate-800">{deletingBill.paymentStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Net Payable:</span>
                  <span className="font-mono font-bold text-slate-900">Rs. {Number(deletingBill.netPayable).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeletingBill(null)}
                  className="px-4 py-2 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Keep Invoice
                </button>
                <button
                  type="button"
                  onClick={handleDeleteBill}
                  disabled={submittingInvoice}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow-xs flex items-center gap-1.5"
                >
                  {submittingInvoice ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Voiding...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      <span>Confirm Void & Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Invoice Modal */}
      {showNewInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-primary-navy text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-teal-400">receipt_long</span>
                <div>
                  <h2 className="text-base font-semibold">Generate Clinical Invoice</h2>
                  <p className="text-xs text-slate-300">Create itemized hospital charges and register in billing ledger</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewInvoiceModal(false)}
                className="text-slate-300 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-5 space-y-4 overflow-y-auto max-h-[calc(92vh-70px)]">
              {/* Patient Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Target Patient <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newInvoicePatientId}
                  onChange={(e) => setNewInvoicePatientId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-primary-teal font-medium"
                  required
                >
                  <option value="">-- Select Patient --</option>
                  {patientsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.mrn})
                    </option>
                  ))}
                </select>
              </div>

              {/* Line Items Builder */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Itemized Service Charges
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setNewInvoiceItems([
                        ...newInvoiceItems,
                        { serviceType: 'Laboratory', description: 'Diagnostic Panel', unitPrice: 850, quantity: 1 },
                      ])
                    }
                    className="text-xs text-primary-teal hover:underline font-semibold flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    Add Service Item
                  </button>
                </div>

                <div className="space-y-2 border border-slate-200 rounded-lg p-2.5 bg-slate-50/50">
                  {newInvoiceItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded border border-slate-200 text-xs">
                      <select
                        value={item.serviceType}
                        onChange={(e) => {
                          const copy = [...newInvoiceItems];
                          copy[idx].serviceType = e.target.value;
                          setNewInvoiceItems(copy);
                        }}
                        className="col-span-3 h-8 px-2 rounded border border-slate-300 text-xs font-medium focus:ring-1 focus:ring-primary-teal"
                      >
                        <option value="Consultation">Consultation</option>
                        <option value="Laboratory">Laboratory</option>
                        <option value="Pharmacy">Pharmacy</option>
                        <option value="Ward / Bed Charge">Ward / Bed</option>
                        <option value="Nursing Care">Nursing</option>
                        <option value="Surgical Procedures">Surgical</option>
                        <option value="General Service">General</option>
                      </select>

                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          const copy = [...newInvoiceItems];
                          copy[idx].description = e.target.value;
                          setNewInvoiceItems(copy);
                        }}
                        className="col-span-4 h-8 px-2 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-primary-teal"
                        placeholder="Description"
                        required
                      />

                      <input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const copy = [...newInvoiceItems];
                          copy[idx].unitPrice = parseFloat(e.target.value) || 0;
                          setNewInvoiceItems(copy);
                        }}
                        className="col-span-2 h-8 px-2 rounded border border-slate-300 text-xs font-mono font-bold focus:ring-1 focus:ring-primary-teal"
                        placeholder="Unit Price"
                        required
                      />

                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const copy = [...newInvoiceItems];
                          copy[idx].quantity = parseInt(e.target.value) || 1;
                          setNewInvoiceItems(copy);
                        }}
                        className="col-span-2 h-8 px-2 rounded border border-slate-300 text-xs font-mono text-center focus:ring-1 focus:ring-primary-teal"
                        placeholder="Qty"
                        required
                      />

                      <div className="col-span-1 text-right">
                        {newInvoiceItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const copy = newInvoiceItems.filter((_, i) => i !== idx);
                              setNewInvoiceItems(copy);
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount / Subsidy */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Insurance / Discount Subsidy (Rs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newInvoiceDiscount}
                  onChange={(e) => setNewInvoiceDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary-teal"
                />
              </div>

              {/* Real-time Summary Box */}
              {(() => {
                const gross = newInvoiceItems.reduce((acc, it) => acc + (it.unitPrice * it.quantity), 0);
                const net = Math.max(0, gross - (newInvoiceDiscount || 0));
                return (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
                    <div>
                      <span className="text-slate-500">Gross: Rs. {gross.toLocaleString()}</span>
                      <span className="mx-2 text-slate-300">|</span>
                      <span className="text-emerald-700">Discount: Rs. {newInvoiceDiscount.toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500">Net Payable: </span>
                      <span className="text-base font-bold text-primary-teal font-mono">Rs. {net.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewInvoiceModal(false)}
                  className="px-4 py-2 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInvoice}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-primary-teal text-white hover:bg-primary-teal-hover shadow-xs flex items-center gap-1.5"
                >
                  {submittingInvoice ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">receipt</span>
                      <span>Generate & Queue Invoice</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Receipt Dialog */}
      {officialReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <span className="material-symbols-outlined text-4xl text-emerald-600">check_circle</span>
              <h2 className="text-base font-bold text-slate-900 mt-1">ApexCare Health Network - Sri Lanka</h2>
              <p className="text-xs text-slate-500">Official Clinical Billing Receipt (LKR)</p>
            </div>

            <div className="text-xs space-y-2 text-slate-700">
              <div className="flex justify-between">
                <span>Receipt Number:</span>
                <strong className="font-label-tabular">{officialReceipt.receiptNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span>Patient:</span>
                <strong>{officialReceipt.patientName} ({officialReceipt.patientMrn})</strong>
              </div>
              <div className="flex justify-between">
                <span>Date & Time:</span>
                <span>{new Date(officialReceipt.issuedDate).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <strong>{officialReceipt.method}</strong>
              </div>
              <div className="flex justify-between">
                <span>Cashier Station:</span>
                <span>{officialReceipt.cashier}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
                <span>Total Settled:</span>
                <span className="font-label-tabular">Rs. {Number(officialReceipt.amountSettled).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 text-xs font-semibold rounded bg-slate-800 text-white flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                Print Receipt
              </button>
              <button
                onClick={() => setOfficialReceipt(null)}
                className="flex-1 py-2 text-xs font-semibold rounded border border-slate-300 hover:bg-slate-50 text-slate-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
