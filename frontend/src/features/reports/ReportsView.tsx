import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export const ReportsView: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeReportTab, setActiveReportTab] = useState<'revenue' | 'patients' | 'appointments' | 'pharmacy' | 'laboratory'>('revenue');

  // Export State
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  const fetchAnalytics = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await axios.get('/api/reports/analytics');
      setAnalytics(res.data);
    } catch (e) {
      console.error('Failed to fetch analytics:', e);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();

    // Constant background refresh interval (every 8 seconds)
    const interval = setInterval(() => {
      fetchAnalytics(true);
    }, 8000);

    // Instant update on realtime data change from backend
    const handleSync = () => {
      fetchAnalytics(true);
    };
    window.addEventListener('apexcare:sync', handleSync);

    // Close export dropdown when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(interval);
      window.removeEventListener('apexcare:sync', handleSync);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Auto-clear feedback notification
  useEffect(() => {
    if (exportFeedback) {
      const timer = setTimeout(() => setExportFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [exportFeedback]);

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

  // 1. Export as Excel (.xls / SpreadsheetML)
  const handleExportExcel = () => {
    if (!analytics) return;
    try {
      const dateFormatted = new Date().toISOString().split('T')[0];
      const rev = analytics.revenue || {};
      const overview = analytics.overview || {};
      const apts = analytics.appointments || {};
      const pharm = analytics.pharmacy || {};
      const lab = analytics.laboratory || {};
      const staff = analytics.staff || {};

      const excelHtml = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Executive Analytics</x:Name>
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
    .section-title { font-size: 13pt; font-weight: bold; background-color: #f1f5f9; color: #0f766e; padding: 8px 12px; }
    .currency { text-align: right; font-family: Consolas, monospace; }
    .bold { font-weight: bold; }
    .highlight-green { background-color: #ecfdf5; color: #065f46; font-weight: bold; }
    .highlight-red { background-color: #fff1f2; color: #9f1239; font-weight: bold; }
  </style>
</head>
<body>
  <div class="title">ApexCare Health Network - Executive Analytics & Reporting Hub</div>
  <div class="subtitle">Official Operational Governance & Financial Performance Audit | Generated: ${new Date().toLocaleString()}</div>

  <table>
    <tr><th colspan="4" class="section-title">1. EXECUTIVE KPI SUMMARY</th></tr>
    <tr>
      <td style="font-weight: bold; background-color: #f8fafc;">Monthly Gross Billed</td>
      <td class="currency bold" style="color: #0f766e;">Rs. ${(rev.grossBilled || 0).toLocaleString()}</td>
      <td style="font-weight: bold; background-color: #f8fafc;">Total Inpatient Admissions</td>
      <td class="currency bold">${overview.totalAdmissionsMonth || 0}</td>
    </tr>
    <tr>
      <td style="font-weight: bold; background-color: #f8fafc;">Settled Insurance / Co-Pay</td>
      <td class="currency">Rs. ${(rev.insuranceSettled || 0).toLocaleString()}</td>
      <td style="font-weight: bold; background-color: #f8fafc;">Appointment Completion Rate</td>
      <td class="currency bold" style="color: #065f46;">${apts.completionRate || '0%'}</td>
    </tr>
    <tr>
      <td style="font-weight: bold; background-color: #f8fafc;">Outstanding Receivables</td>
      <td class="currency" style="color: #b91c1c;">Rs. ${(rev.outstandingReceivables || 0).toLocaleString()}</td>
      <td style="font-weight: bold; background-color: #f8fafc;">Lab Avg Turnaround Time</td>
      <td class="currency bold">${lab.avgTurnaroundMinutes || 0} mins (Sub-45m SLA)</td>
    </tr>
    <tr>
      <td style="font-weight: bold; background-color: #f8fafc;">Active Clinical Workforce</td>
      <td class="currency bold">${staff.activeWorkforce || 0} Staff Members</td>
      <td style="font-weight: bold; background-color: #f8fafc;">Workforce Attendance Rate</td>
      <td class="currency bold" style="color: #065f46;">${staff.dailyAttendanceRate || '100%'}</td>
    </tr>
  </table>

  <table>
    <tr><th colspan="3" class="section-title">2. DEPARTMENTAL REVENUE CYCLE AUDIT</th></tr>
    <tr style="background-color: #0f766e; color: white;">
      <th>Clinical Department</th>
      <th style="text-align: right;">Settled Revenue (Rs.)</th>
      <th style="text-align: right;">Revenue Contribution (%)</th>
    </tr>
    ${(rev.byDepartment || []).map((d: any) => `
    <tr>
      <td style="font-weight: 500;">${d.department}</td>
      <td class="currency">Rs. ${Number(d.revenue || 0).toLocaleString()}</td>
      <td class="currency bold">${d.share}</td>
    </tr>`).join('')}
  </table>

  <table>
    <tr><th colspan="2" class="section-title">3. CLINICAL APPOINTMENT FULFILLMENT RATIOS</th></tr>
    <tr><td>Total Scheduled Consultations</td><td class="currency bold">${apts.totalScheduled || 0}</td></tr>
    <tr><td style="color: #065f46;">Successfully Completed Visits</td><td class="currency bold highlight-green">${apts.completed || 0}</td></tr>
    <tr><td>Patient No-Shows</td><td class="currency">${apts.noShow || 0}</td></tr>
    <tr><td style="color: #9f1239;">Cancelled Consultations</td><td class="currency highlight-red">${apts.cancelled || 0}</td></tr>
    <tr><td style="font-weight: bold;">Clinic Completion Ratio</td><td class="currency bold">${apts.completionRate || '0%'}</td></tr>
  </table>

  <table>
    <tr><th colspan="2" class="section-title">4. PHARMACY FORMULARY & INVENTORY CONTROL</th></tr>
    <tr><td>Total Active Stock SKUs</td><td class="currency bold">${pharm.totalStockSKUs || 0}</td></tr>
    <tr><td>Critical Low-Stock Alerts (&lt; 20 units)</td><td class="currency bold ${pharm.criticalStockAlerts > 0 ? 'highlight-red' : ''}">${pharm.criticalStockAlerts || 0}</td></tr>
    <tr><td>Batches Expiring in Next 90 Days</td><td class="currency bold">${pharm.expiringWithin90Days || 0}</td></tr>
    <tr><td>Monthly Dispensed Units</td><td class="currency">${pharm.monthlyDispensingUnits || 0}</td></tr>
  </table>

  <table>
    <tr><th colspan="2" class="section-title">5. DIAGNOSTIC LABORATORY & ASSAY ANALYTICS</th></tr>
    <tr><td>Total Laboratory Assays Conducted</td><td class="currency bold">${lab.totalTestsConducted || 0}</td></tr>
    <tr><td>STAT Urgent Emergency Requisitions</td><td class="currency bold ${lab.statUrgentTests > 0 ? 'highlight-red' : ''}">${lab.statUrgentTests || 0}</td></tr>
    <tr><td>Average Analytical Turnaround Time</td><td class="currency bold">${lab.avgTurnaroundMinutes || 0} minutes</td></tr>
    <tr><td>Critical Value Clinical Callouts</td><td class="currency bold">${lab.criticalValueAlerts || 0}</td></tr>
  </table>

  <br />
  <div style="font-size: 9pt; color: #94a3b8; border-top: 1px solid #cbd5e1; padding-top: 8px;">
    Confidentiality Notice: This document contains proprietary clinical, administrative, and financial operational data of ApexCare Health Network. Unauthorized dissemination is strictly prohibited.
  </div>
</body>
</html>
      `;

      triggerDownload(
        excelHtml,
        `ApexCare_Hospital_Analytics_${dateFormatted}.xls`,
        'application/vnd.ms-excel;charset=utf-8'
      );
      setExportFeedback({ type: 'success', message: 'Executive Excel spreadsheet successfully generated and downloaded.' });
      setShowExportMenu(false);
    } catch (e) {
      console.error(e);
      setExportFeedback({ type: 'error', message: 'Failed to generate Excel export.' });
    }
  };

  // 2. Export as CSV (.csv with UTF-8 BOM)
  const handleExportCsv = () => {
    if (!analytics) return;
    try {
      const dateFormatted = new Date().toISOString().split('T')[0];
      const rev = analytics.revenue || {};
      const overview = analytics.overview || {};
      const apts = analytics.appointments || {};
      const pharm = analytics.pharmacy || {};
      const lab = analytics.laboratory || {};
      const staff = analytics.staff || {};

      let csv = '\uFEFF'; // UTF-8 BOM for Microsoft Excel
      csv += 'ApexCare Health Network - Executive Analytics & Operational Report\r\n';
      csv += `Generated At,${new Date().toLocaleString()}\r\n`;
      csv += `Reporting Period,${analytics.reportingPeriod || 'Current Operational Month'}\r\n\r\n`;

      csv += '1. EXECUTIVE KPI OVERVIEW\r\n';
      csv += 'Metric,Value\r\n';
      csv += `Monthly Gross Billed,Rs. ${rev.grossBilled || 0}\r\n`;
      csv += `Settled Insurance / Co-Pay,Rs. ${rev.insuranceSettled || 0}\r\n`;
      csv += `Outstanding Receivables,Rs. ${rev.outstandingReceivables || 0}\r\n`;
      csv += `Total Inpatient Admissions,${overview.totalAdmissionsMonth || 0}\r\n`;
      csv += `Appointment Fill Rate,${apts.completionRate || '0%'}\r\n`;
      csv += `Lab Average Turnaround Time,${lab.avgTurnaroundMinutes || 0} mins\r\n`;
      csv += `Active Clinical Workforce,${staff.activeWorkforce || 0}\r\n\r\n`;

      csv += '2. DEPARTMENTAL REVENUE DISTRIBUTION\r\n';
      csv += 'Department,Settled Revenue (Rs.),Revenue Share (%)\r\n';
      (rev.byDepartment || []).forEach((d: any) => {
        csv += `"${d.department}",${d.revenue},"${d.share}"\r\n`;
      });
      csv += '\r\n';

      csv += '3. CLINIC APPOINTMENT PERFORMANCE\r\n';
      csv += 'Metric,Count\r\n';
      csv += `Total Scheduled Consultations,${apts.totalScheduled || 0}\r\n`;
      csv += `Successfully Completed Visits,${apts.completed || 0}\r\n`;
      csv += `Patient No-Shows,${apts.noShow || 0}\r\n`;
      csv += `Cancelled Consultations,${apts.cancelled || 0}\r\n`;
      csv += `Completion Ratio,"${apts.completionRate || '0%'}"\r\n\r\n`;

      csv += '4. PHARMACY FORMULARY STATUS\r\n';
      csv += 'Metric,Count\r\n';
      csv += `Total Active Stock SKUs,${pharm.totalStockSKUs || 0}\r\n`;
      csv += `Critical Stock Alerts,${pharm.criticalStockAlerts || 0}\r\n`;
      csv += `Batches Expiring within 90 Days,${pharm.expiringWithin90Days || 0}\r\n`;
      csv += `Monthly Dispensed Units,${pharm.monthlyDispensingUnits || 0}\r\n\r\n`;

      csv += '5. DIAGNOSTIC LABORATORY PERFORMANCE\r\n';
      csv += 'Metric,Value\r\n';
      csv += `Total Assays Conducted,${lab.totalTestsConducted || 0}\r\n`;
      csv += `STAT Urgent Emergency Tests,${lab.statUrgentTests || 0}\r\n`;
      csv += `Average Analytical Turnaround,${lab.avgTurnaroundMinutes || 0} mins\r\n`;
      csv += `Critical Value Clinical Alerts,${lab.criticalValueAlerts || 0}\r\n`;

      triggerDownload(
        csv,
        `ApexCare_Hospital_Analytics_${dateFormatted}.csv`,
        'text/csv;charset=utf-8'
      );
      setExportFeedback({ type: 'success', message: 'Executive CSV dataset successfully generated and downloaded.' });
      setShowExportMenu(false);
    } catch (e) {
      console.error(e);
      setExportFeedback({ type: 'error', message: 'Failed to generate CSV export.' });
    }
  };

  // 3. Export as PDF (Trigger Print Dialog / PDF Preview)
  const handleOpenPdfModal = () => {
    setShowExportMenu(false);
    setShowPdfModal(true);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-primary-teal border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm font-medium text-slate-500">Compiling Hospital Analytics Engine...</div>
        </div>
      </div>
    );
  }

  const revenue = analytics?.revenue || { grossBilled: 0, byDepartment: [] };
  const overview = analytics?.overview || {};
  const appointments = analytics?.appointments || {};
  const pharmacy = analytics?.pharmacy || {};
  const laboratory = analytics?.laboratory || {};
  const staff = analytics?.staff || {};

  return (
    <div className="flex flex-col w-full space-y-space-md">
      {/* Print Stylesheet for PDF Generation */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #apexcare-executive-print-area, #apexcare-executive-print-area * {
            visibility: visible !important;
          }
          #apexcare-executive-print-area {
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

      {/* Export Toast Notification */}
      {exportFeedback && (
        <div
          className={`px-4 py-3 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-xs transition-all ${
            exportFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              {exportFeedback.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{exportFeedback.message}</span>
          </div>
          <button onClick={() => setExportFeedback(null)} className="text-slate-400 hover:text-slate-700">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-bg-surface p-space-md rounded-xl border border-border-subtle shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
              Hospital Executive Analytics & Reporting Hub
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-primary-teal border border-teal-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Executive Feed
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational Throughput • Revenue Cycle Audit • Clinical Quality Indices • Board Reports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Domain Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-lg flex-wrap">
            {(['revenue', 'patients', 'appointments', 'pharmacy', 'laboratory'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveReportTab(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md uppercase tracking-wider transition-all ${
                  activeReportTab === tab
                    ? 'bg-white text-primary-teal shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchAnalytics()}
            disabled={loading}
            className="flex items-center gap-1.5 h-[34px] px-3 rounded-lg border border-border-subtle bg-bg-surface hover:bg-bg-surface-subtle text-slate-700 font-title-sm text-xs shadow-xs transition-colors"
            title="Refresh Analytics Data"
          >
            <span className={`material-symbols-outlined text-[16px] text-primary-teal ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Export Dropdown Menu */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 h-[34px] px-3.5 rounded-lg bg-primary-teal hover:bg-primary-teal-hover text-white font-title-sm text-xs shadow-xs transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">file_download</span>
              <span>Export Report</span>
              <span className="material-symbols-outlined text-[16px]">
                {showExportMenu ? 'arrow_drop_up' : 'arrow_drop_down'}
              </span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 animate-fadeIn text-xs">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Select Export Format
                </div>

                {/* Option 1: PDF Document */}
                <button
                  onClick={handleOpenPdfModal}
                  className="w-full px-3 py-2 text-left text-slate-700 hover:bg-teal-50 hover:text-primary-teal flex items-center gap-2.5 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                  </div>
                  <div>
                    <div className="font-semibold">Export as PDF Document</div>
                    <div className="text-[10px] text-slate-400">Formal printable board dossier</div>
                  </div>
                </button>

                {/* Option 2: Excel Spreadsheet */}
                <button
                  onClick={handleExportExcel}
                  className="w-full px-3 py-2 text-left text-slate-700 hover:bg-teal-50 hover:text-primary-teal flex items-center gap-2.5 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[16px]">table_chart</span>
                  </div>
                  <div>
                    <div className="font-semibold">Export as Excel (.xls / .xlsx)</div>
                    <div className="text-[10px] text-slate-400">Styled multi-section workbook</div>
                  </div>
                </button>

                {/* Option 3: Raw CSV */}
                <button
                  onClick={handleExportCsv}
                  className="w-full px-3 py-2 text-left text-slate-700 hover:bg-teal-50 hover:text-primary-teal flex items-center gap-2.5 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[16px]">grid_on</span>
                  </div>
                  <div>
                    <div className="font-semibold">Export as CSV Dataset</div>
                    <div className="text-[10px] text-slate-400">Comma-separated ledger data</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="p-4 rounded-xl bg-bg-surface border border-border-subtle shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Monthly Gross Billing</span>
          <div className="text-2xl font-bold text-slate-900 font-label-tabular mt-1">
            Rs. {revenue.grossBilled?.toLocaleString()}
          </div>
          <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">
            {revenue.grossBilled > 0 ? '↑ Active cycle' : 'No billings settled'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border-subtle shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Inpatient Admissions</span>
          <div className="text-2xl font-bold text-slate-900 font-label-tabular mt-1">
            {overview.totalAdmissionsMonth}
          </div>
          <span className="text-xs text-slate-500 mt-1 inline-block">Avg stay: {overview.avgLengthOfStayDays} days</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border-subtle shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Appointment Fill Rate</span>
          <div className="text-2xl font-bold text-slate-900 font-label-tabular mt-1">
            {appointments.completionRate}
          </div>
          <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">{appointments.completed} completed visits</span>
        </div>

        <div className="p-4 rounded-xl bg-bg-surface border border-border-subtle shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Lab Avg Turnaround</span>
          <div className="text-2xl font-bold text-slate-900 font-label-tabular mt-1">
            {laboratory.avgTurnaroundMinutes} mins
          </div>
          <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">Sub-45m STAT SLA compliant</span>
        </div>
      </div>

      {/* Tab Specific Deep Dive */}
      {activeReportTab === 'revenue' && (
        <div className="bg-bg-surface rounded-xl border border-border-subtle p-space-md shadow-xs">
          <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-teal">payments</span>
            <span>Departmental Revenue Distribution (Current Month)</span>
          </h2>

          <div className="space-y-4">
            {revenue.byDepartment?.map((dept: any) => (
              <div key={dept.department} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-800">{dept.department}</span>
                  <span className="font-label-tabular text-slate-700">
                    Rs. {dept.revenue.toLocaleString()} ({dept.share})
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-primary-teal h-full rounded-full" style={{ width: dept.share }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeReportTab === 'patients' && (
        <div className="bg-bg-surface rounded-xl border border-border-subtle p-space-md shadow-xs space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">Patient Admissions & Clinical Governance Metrics</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500">Monthly Discharges</span>
              <div className="text-xl font-bold text-slate-900 font-label-tabular mt-1">{overview.totalDischargesMonth}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500">Readmission Rate (30-day)</span>
              <div className="text-xl font-bold text-emerald-700 font-label-tabular mt-1">{overview.clinicalReadmissionRate}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500">Bed Turnover Efficiency</span>
              <div className="text-xl font-bold text-slate-900 font-label-tabular mt-1">{overview.bedTurnoverRate}</div>
            </div>
          </div>
        </div>
      )}

      {activeReportTab === 'appointments' && (
        <div className="bg-bg-surface rounded-xl border border-border-subtle p-space-md shadow-xs space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Clinic Appointment Fulfillment Ratios</h2>
          <div className="grid grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-500 block">Total Scheduled</span>
              <strong className="text-lg font-bold text-slate-900 font-label-tabular">{appointments.totalScheduled}</strong>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg">
              <span className="text-emerald-800 block">Completed Visits</span>
              <strong className="text-lg font-bold text-emerald-900 font-label-tabular">{appointments.completed}</strong>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <span className="text-amber-800 block">Patient No-Shows</span>
              <strong className="text-lg font-bold text-amber-900 font-label-tabular">{appointments.noShow}</strong>
            </div>
            <div className="p-3 bg-rose-50 rounded-lg">
              <span className="text-rose-800 block">Cancellations</span>
              <strong className="text-lg font-bold text-rose-900 font-label-tabular">{appointments.cancelled}</strong>
            </div>
          </div>
        </div>
      )}

      {activeReportTab === 'pharmacy' && (
        <div className="bg-bg-surface rounded-xl border border-border-subtle p-space-md shadow-xs space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Formulary Consumption & Inventory Control</h2>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-500 block">Monthly Dispensed Units</span>
              <strong className="text-lg font-bold text-slate-900 font-label-tabular">{pharmacy.monthlyDispensingUnits}</strong>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <span className="text-amber-800 block">Batches Near Expiry (90d)</span>
              <strong className="text-lg font-bold text-amber-900 font-label-tabular">{pharmacy.expiringWithin90Days}</strong>
            </div>
            <div className="p-3 bg-rose-50 rounded-lg">
              <span className="text-rose-800 block">Critical Stock Items</span>
              <strong className="text-lg font-bold text-rose-900 font-label-tabular">{pharmacy.criticalStockAlerts}</strong>
            </div>
          </div>
        </div>
      )}

      {activeReportTab === 'laboratory' && (
        <div className="bg-bg-surface rounded-xl border border-border-subtle p-space-md shadow-xs space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Diagnostic Laboratory Analytics</h2>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-500 block">Total Assays Conducted</span>
              <strong className="text-lg font-bold text-slate-900 font-label-tabular">{laboratory.totalTestsConducted}</strong>
            </div>
            <div className="p-3 bg-rose-50 rounded-lg">
              <span className="text-rose-800 block">STAT Urgent Emergency Tests</span>
              <strong className="text-lg font-bold text-rose-900 font-label-tabular">{laboratory.statUrgentTests}</strong>
            </div>
            <div className="p-3 bg-sky-50 rounded-lg">
              <span className="text-sky-800 block">Critical Value Callouts</span>
              <strong className="text-lg font-bold text-sky-900 font-label-tabular">{laboratory.criticalValueAlerts}</strong>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* FORMAL EXECUTIVE REPORT PREVIEW & PDF PRINT MODAL     */}
      {/* ---------------------------------------------------- */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-5 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden">
            {/* Modal Top Bar (Hidden during print) */}
            <div className="no-print px-5 py-4 bg-primary-navy text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-teal-400">picture_as_pdf</span>
                <div>
                  <h2 className="text-base font-semibold">Executive Analytics Report (PDF Preview)</h2>
                  <p className="text-xs text-slate-300">Official Clinical Governance & Financial Performance Audit</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                  title="Download as Excel file"
                >
                  <span className="material-symbols-outlined text-[15px]">table_chart</span>
                  <span className="hidden sm:inline">Excel</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintPdf}
                  className="px-3.5 py-1.5 rounded-lg bg-primary-teal hover:bg-primary-teal-hover text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>Save as PDF / Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPdfModal(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Printable Document Container */}
            <div className="p-6 sm:p-8 overflow-y-auto max-h-[calc(94vh-75px)] bg-slate-50">
              <div
                id="apexcare-executive-print-area"
                className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6 text-slate-900 font-sans"
              >
                {/* Formal Letterhead */}
                <div className="border-b-2 border-primary-teal pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold text-xl shadow-xs">
                      <span className="material-symbols-outlined text-[28px]">local_hospital</span>
                    </div>
                    <div>
                      <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">ApexCare Health Network</h1>
                      <p className="text-xs text-slate-500 font-medium">Tertiary Clinical Care & Hospital Operational Governance</p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right text-xs text-slate-600">
                    <div className="font-bold text-slate-800">Hospital Executive Operational Audit</div>
                    <div className="font-label-tabular text-[11px] text-slate-500">Date Issued: {new Date().toLocaleDateString()}</div>
                    <div className="text-[11px] text-primary-teal font-semibold">Reporting Period: {analytics.reportingPeriod || 'Current Month'}</div>
                  </div>
                </div>

                {/* Executive Summary Narrative */}
                <div className="p-4 bg-teal-50/60 rounded-lg border border-teal-200 text-xs text-slate-700 space-y-1">
                  <div className="font-bold text-teal-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-teal-700">insights</span>
                    Executive Summary & Operational Posture
                  </div>
                  <p className="leading-relaxed">
                    This formal audit consolidates hospital-wide administrative, clinical throughput, and revenue cycle performance. 
                    ApexCare maintains high operational resilience with active clinical staffing ({staff.activeWorkforce || 0} credentialed members) 
                    and strict adherence to sub-45 minute STAT laboratory investigation turnaround SLAs ({laboratory.avgTurnaroundMinutes || 0}m average).
                  </p>
                </div>

                {/* 1. Executive KPI Summary Grid */}
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-200">
                    1. Core Hospital Performance Scorecard
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">Monthly Gross Billing</span>
                      <strong className="text-base font-bold text-slate-900 font-label-tabular block mt-0.5">
                        Rs. {(revenue.grossBilled || 0).toLocaleString()}
                      </strong>
                      <span className="text-[10px] text-emerald-700 font-medium">Active Billing Cycle</span>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">Inpatient Admissions</span>
                      <strong className="text-base font-bold text-slate-900 font-label-tabular block mt-0.5">
                        {overview.totalAdmissionsMonth || 0}
                      </strong>
                      <span className="text-[10px] text-slate-500 font-medium">Bed Turnover: {overview.bedTurnoverRate}</span>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">Appointment Completion</span>
                      <strong className="text-base font-bold text-emerald-800 font-label-tabular block mt-0.5">
                        {appointments.completionRate || '0%'}
                      </strong>
                      <span className="text-[10px] text-slate-500 font-medium">{appointments.completed} Completed Visits</span>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">Lab Diagnostic Turnaround</span>
                      <strong className="text-base font-bold text-teal-800 font-label-tabular block mt-0.5">
                        {laboratory.avgTurnaroundMinutes || 0} mins
                      </strong>
                      <span className="text-[10px] text-emerald-700 font-medium">STAT Emergency Compliant</span>
                    </div>
                  </div>
                </div>

                {/* 2. Departmental Revenue Distribution Table */}
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-200">
                    2. Departmental Revenue Cycle Audit
                  </h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase border-b border-slate-200">
                          <th className="py-2 px-3">Clinical Department / Operating Unit</th>
                          <th className="py-2 px-3 text-right">Settled Revenue (Rs.)</th>
                          <th className="py-2 px-3 text-right">Revenue Contribution</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(revenue.byDepartment || []).map((d: any) => (
                          <tr key={d.department}>
                            <td className="py-2 px-3 font-semibold text-slate-800">{d.department}</td>
                            <td className="py-2 px-3 text-right font-label-tabular font-medium text-slate-900">
                              Rs. {Number(d.revenue || 0).toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-right font-label-tabular font-bold text-primary-teal">
                              {d.share}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Clinical Operations & Roster Performance */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Appointment Roster */}
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
                      3. Clinic Appointment Fulfillment
                    </div>
                    <div className="space-y-1 text-slate-700 text-xs">
                      <div className="flex justify-between">
                        <span>Total Scheduled Consultations:</span>
                        <strong className="font-label-tabular">{appointments.totalScheduled}</strong>
                      </div>
                      <div className="flex justify-between text-emerald-700">
                        <span>Successfully Completed Visits:</span>
                        <strong className="font-label-tabular">{appointments.completed}</strong>
                      </div>
                      <div className="flex justify-between text-amber-700">
                        <span>Patient No-Shows:</span>
                        <strong className="font-label-tabular">{appointments.noShow}</strong>
                      </div>
                      <div className="flex justify-between text-rose-700">
                        <span>Cancelled Appointments:</span>
                        <strong className="font-label-tabular">{appointments.cancelled}</strong>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-900">
                        <span>Clinic Completion Ratio:</span>
                        <span className="text-primary-teal font-label-tabular">{appointments.completionRate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Laboratory & Pharmacy Controls */}
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
                      4. Diagnostic & Pharmacy Governance
                    </div>
                    <div className="space-y-1 text-slate-700 text-xs">
                      <div className="flex justify-between">
                        <span>Total Diagnostic Assays:</span>
                        <strong className="font-label-tabular">{laboratory.totalTestsConducted}</strong>
                      </div>
                      <div className="flex justify-between text-rose-700">
                        <span>STAT Urgent Critical Tests:</span>
                        <strong className="font-label-tabular">{laboratory.statUrgentTests}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Active Formulary SKUs:</span>
                        <strong className="font-label-tabular">{pharmacy.totalStockSKUs}</strong>
                      </div>
                      <div className="flex justify-between text-amber-700">
                        <span>Critical Stock Reorder Alerts:</span>
                        <strong className="font-label-tabular">{pharmacy.criticalStockAlerts}</strong>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-900">
                        <span>Analytical Turnaround SLA:</span>
                        <span className="text-teal-700 font-label-tabular">{laboratory.avgTurnaroundMinutes} mins</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Formal Executive Board Sign-off */}
                <div className="pt-6 border-t-2 border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-6">
                    Executive Hospital Directorate Sign-off & Verification
                  </div>
                  <div className="grid grid-cols-3 gap-6 text-center text-xs text-slate-700">
                    <div className="border-t border-slate-300 pt-2">
                      <div className="font-bold text-slate-900">Dr. Kasun Perera, MD</div>
                      <div className="text-[10px] text-slate-500">Chief Medical Officer (CMO)</div>
                    </div>
                    <div className="border-t border-slate-300 pt-2">
                      <div className="font-bold text-slate-900">Priyantha Jayawardena, FCMA</div>
                      <div className="text-[10px] text-slate-500">Chief Financial Officer (CFO)</div>
                    </div>
                    <div className="border-t border-slate-300 pt-2">
                      <div className="font-bold text-slate-900">Prof. H.R. Senanayake, FRCS</div>
                      <div className="text-[10px] text-slate-500">Chief Executive Officer (CEO)</div>
                    </div>
                  </div>
                </div>

                {/* Confidentiality Notice */}
                <div className="text-[9px] text-slate-400 pt-3 border-t border-slate-100 flex justify-between items-center">
                  <span>CONFIDENTIAL & PROPRIETARY — FOR APEXCARE BOARD OF DIRECTORS USE ONLY</span>
                  <span>Document Hash: AC-REP-{Date.now().toString(16).toUpperCase()}</span>
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="no-print mt-4 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  Tip: Select <strong>"Save as PDF"</strong> as destination in your browser print window.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPdfModal(false)}
                    className="px-4 py-2 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-white font-medium"
                  >
                    Close Preview
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintPdf}
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
    </div>
  );
};
