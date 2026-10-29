import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface DashboardViewProps {
  onNavigateToEmr: (patientId?: string) => void;
  onNavigateToAppointments: () => void;
  onNavigateToLab: () => void;
  onNavigateToPharmacy: () => void;
  onNavigateToBilling: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToEmr,
  onNavigateToAppointments,
  onNavigateToLab,
  onNavigateToPharmacy,
  onNavigateToBilling,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'shift'>('today');

  const fetchDashboardData = async () => {
    try {
      const res = await axios.get('/api/dashboard/summary');
      setData(res.data);
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Constant real-world live sync interval (every 5 seconds)
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 5000);

    // Instant update on realtime data change from backend
    const handleSync = () => {
      fetchDashboardData();
    };
    window.addEventListener('apexcare:sync', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('apexcare:sync', handleSync);
    };
  }, []);

  const handleUpdateAptStatus = async (id: string, newStatus: string) => {
    try {
      await axios.patch(`/api/appointments/${id}/status`, { status: newStatus });
      fetchDashboardData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 border-4 border-primary-teal border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-500">Loading Clinical Operations Overview...</span>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetchDashboardData();
            }}
            className="mt-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary-teal text-white hover:bg-primary-teal-hover transition-colors flex items-center gap-1 shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Reload Overview</span>
          </button>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalPatients: { count: 0, trend: '0.0%', inpatient: 0, outpatient: 0 },
    todayAppointments: { total: 0, clinicsCount: 0, completed: 0, inProgress: 0, upcoming: 0 },
    revenueToday: { amount: 0, breakdown: { consultation: 0, laboratory: 0, pharmacy: 0, admissions: 0 } },
    bedOccupancy: { totalBeds: 160, occupiedBeds: 0, percentage: 0, wards: [] },
  };

  const queue = data?.appointmentQueue || [];
  const urgentLabs = data?.urgentLabOrders || [];
  const pharmacyAlerts = data?.pharmacyAlerts || [];
  const wards = metrics.bedOccupancy.wards || [];
  const availableBeds = Math.max(0, metrics.bedOccupancy.totalBeds - metrics.bedOccupancy.occupiedBeds);

  return (
    <div className="flex flex-col w-full space-y-space-lg">
      {/* Top Command & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="space-y-space-xs">
          <div className="flex items-center gap-space-sm">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
              Hospital Operational Overview
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-caption text-caption uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse"></span>
              Live Sync • Station 04
            </div>
          </div>
          <p className="font-body-default text-body-default text-slate-500">
            Real-time clinical throughput, patient queue & ward census
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-space-sm">
          {/* Operational Capacity Badge */}
          <div className="hidden xl:flex items-center gap-space-xs px-3 py-1.5 rounded-lg bg-status-info-bg text-status-info font-badge-sm text-badge-sm shadow-xs">
            <span className="material-symbols-outlined text-[16px]">local_hospital</span>
            <span>Capacity: Operational</span>
            <span className="text-slate-400">•</span>
            <span className="font-semibold text-emerald-700">Triage: Ready</span>
          </div>

          {/* Date Scope Filter Tabs */}
          <div className="inline-flex p-0.5 rounded-lg bg-surface-container-high shadow-inner text-on-surface-variant">
            <button
              onClick={() => setTimeFilter('today')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                timeFilter === 'today' ? 'bg-bg-surface text-primary font-bold shadow-xs' : 'hover:text-on-surface'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeFilter('shift')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                timeFilter === 'shift' ? 'bg-bg-surface text-primary font-bold shadow-xs' : 'hover:text-on-surface'
              }`}
            >
              Current Shift
            </button>
            <button
              onClick={() => setTimeFilter('week')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                timeFilter === 'week' ? 'bg-bg-surface text-primary font-bold shadow-xs' : 'hover:text-on-surface'
              }`}
            >
              7 Days
            </button>
          </div>

          {/* Refresh Action Button */}
          <button
            type="button"
            onClick={() => {
              setIsRefreshing(true);
              fetchDashboardData();
            }}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle bg-bg-surface hover:bg-slate-50 text-slate-700 font-title-sm text-xs shadow-xs transition-all active:scale-95"
            title="Refresh Hospital Operational Overview & Telemetry"
          >
            <span className={`material-symbols-outlined text-[16px] text-primary-teal ${isRefreshing ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* 4 Primary Top KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-space-md">
        {/* KPI 1: Active Patients */}
        <div className="kpi-card bg-bg-surface p-space-md rounded-xl border border-border-subtle shadow-xs hover:border-primary-teal-subtle transition-all">
          <div className="flex items-center justify-between">
            <span className="font-title-sm text-title-sm text-slate-500">
              Active Registered Patients
            </span>
            <span className="w-8 h-8 rounded-lg bg-primary-teal-subtle text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">groups</span>
            </span>
          </div>
          <div className="my-space-sm flex items-baseline justify-between">
            <span className="font-display-kpi text-display-kpi text-on-surface font-bold tabular-nums">
              {metrics.totalPatients.count}
            </span>
            <span className="inline-flex items-center text-xs font-semibold text-emerald-600">
              {metrics.totalPatients.trend}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-border-subtle">
            <span>Inpatient: <strong>{metrics.totalPatients.inpatient}</strong></span>
            <span>Outpatient: <strong>{metrics.totalPatients.outpatient}</strong></span>
          </div>
        </div>

        {/* KPI 2: Today Appointments */}
        <div className="kpi-card bg-bg-surface p-space-md rounded-xl border border-border-subtle shadow-xs hover:border-primary-teal-subtle transition-all">
          <div className="flex items-center justify-between">
            <span className="font-title-sm text-title-sm text-slate-500">
              Today's Appointments
            </span>
            <span className="w-8 h-8 rounded-lg bg-status-info-bg text-status-info flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">event_available</span>
            </span>
          </div>
          <div className="my-space-sm flex items-baseline justify-between">
            <span className="font-display-kpi text-display-kpi text-on-surface font-bold tabular-nums">
              {metrics.todayAppointments.total}
            </span>
            <span className="text-xs text-slate-500">{metrics.todayAppointments.clinicsCount} Active Clinics</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-border-subtle">
            <span className="text-emerald-600 font-semibold">{metrics.todayAppointments.completed} Done</span>
            <span className="text-amber-600 font-semibold">{metrics.todayAppointments.inProgress} In-Prog</span>
            <span className="text-blue-600 font-semibold">{metrics.todayAppointments.upcoming} Upcoming</span>
          </div>
        </div>

        {/* KPI 3: Revenue Today */}
        <div className="kpi-card bg-bg-surface p-space-md rounded-xl border border-border-subtle shadow-xs hover:border-primary-teal-subtle transition-all">
          <div className="flex items-center justify-between">
            <span className="font-title-sm text-title-sm text-slate-500">
              Settled Revenue Today
            </span>
            <span className="w-8 h-8 rounded-lg bg-status-success-bg text-tertiary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">payments</span>
            </span>
          </div>
          <div className="my-space-sm flex items-baseline justify-between">
            <span className="font-display-kpi text-display-kpi text-on-surface font-bold tabular-nums">
              Rs. {Number(metrics.revenueToday.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-semibold text-emerald-600">{metrics.revenueToday.targetComparison}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-border-subtle">
            <span>Clinic: Rs. {metrics.revenueToday.breakdown?.consultation || 0}</span>
            <span>Rx: Rs. {metrics.revenueToday.breakdown?.pharmacy || 0}</span>
            <span>Lab: Rs. {metrics.revenueToday.breakdown?.laboratory || 0}</span>
          </div>
        </div>

        {/* KPI 4: Ward Bed Occupancy */}
        <div className="kpi-card bg-bg-surface p-space-md rounded-xl border border-border-subtle shadow-xs hover:border-primary-teal-subtle transition-all">
          <div className="flex items-center justify-between">
            <span className="font-title-sm text-title-sm text-slate-500">
              Bed Occupancy
            </span>
            <span className="text-xs font-bold text-slate-700 font-label-tabular">
              {metrics.bedOccupancy.percentage}%
            </span>
          </div>
          <div className="my-space-sm flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="font-display-kpi text-display-kpi text-on-surface font-bold tabular-nums">
                {metrics.bedOccupancy.occupiedBeds}
              </span>
              <span className="text-xs text-slate-500">/ {metrics.bedOccupancy.totalBeds} Beds</span>
            </div>
            <span className="text-xs font-semibold text-primary-teal">{availableBeds} Available</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
            <div className="bg-primary-teal h-full transition-all" style={{ width: `${Math.min(100, metrics.bedOccupancy.percentage)}%` }}></div>
          </div>
        </div>
      </div>

      {/* Main Content Grid (65% / 35% Split) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-space-md items-start">
        {/* LEFT COLUMN (65% - 8 cols on xl) */}
        <div className="xl:col-span-8 flex flex-col gap-space-md">
          {/* Today's Clinical Appointments Queue */}
          <div className="bg-bg-surface rounded-xl shadow-xs border border-border-subtle overflow-hidden">
            <div className="p-space-md flex items-center justify-between border-b border-border-subtle">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-primary-teal text-[20px]">calendar_month</span>
                <h2 className="font-title-sm text-title-sm text-on-surface">
                  Today's Clinical Appointments Queue
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-caption text-caption">
                  {queue.length} Patients
                </span>
              </div>
              <button
                onClick={onNavigateToAppointments}
                className="text-xs text-primary-teal hover:underline font-medium flex items-center gap-1"
              >
                <span>View Full Calendar</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-bg-surface-subtle text-caption font-caption text-slate-500 uppercase border-b border-border-subtle">
                    <th className="py-2.5 px-4 font-semibold">Patient Details</th>
                    <th className="py-2.5 px-4 font-semibold">Attending Doctor</th>
                    <th className="py-2.5 px-4 font-semibold">Department & Room</th>
                    <th className="py-2.5 px-4 font-semibold">Time Slot</th>
                    <th className="py-2.5 px-4 font-semibold">Clinical Status</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle text-sm">
                  {queue.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-[32px] text-slate-300">event_busy</span>
                          <span className="font-medium text-slate-600">No Outpatient Consultations Queued</span>
                          <span className="text-slate-400 text-[11px]">Book an appointment from the Appointments module or register a new patient.</span>
                          <button
                            onClick={onNavigateToAppointments}
                            className="mt-2 px-3 py-1.5 rounded-lg bg-primary-teal text-white font-semibold text-xs hover:bg-primary-teal-hover transition-colors"
                          >
                            + Schedule Appointment
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    queue.map((apt: any) => (
                      <tr key={apt.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <button
                              onClick={() => onNavigateToEmr(apt.patientId)}
                              className="font-medium text-slate-900 hover:text-primary-teal text-left"
                            >
                              {apt.patientName}
                            </button>
                            <span className="text-xs text-slate-500 font-label-tabular">{apt.patientMrn}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{apt.doctorName}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="text-slate-800">{apt.department}</span>
                            <span className="text-xs text-slate-500">{apt.roomNumber}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-label-tabular font-medium text-slate-800">
                          {apt.appointmentTime}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={apt.status}
                            onChange={(e) => handleUpdateAptStatus(apt.id, e.target.value)}
                            className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer ${
                              apt.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : apt.status === 'In-Progress'
                                ? 'bg-amber-100 text-amber-800'
                                : apt.status === 'Cancelled'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            <option value="Scheduled">Scheduled</option>
                            <option value="In-Progress">In-Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => onNavigateToEmr(apt.patientId)}
                            className="px-2.5 py-1 text-xs font-medium rounded border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors"
                          >
                            Open EMR
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* STAT Urgent Laboratory Orders Card */}
          <div className="bg-bg-surface rounded-xl shadow-xs border border-border-subtle p-space-md">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-teal">science</span>
                <h3 className="font-title-sm text-title-sm text-on-surface">
                  STAT Urgent Laboratory Orders
                </h3>
              </div>
              <button
                onClick={onNavigateToLab}
                className="text-xs text-primary-teal hover:underline font-medium"
              >
                Go to Laboratory Desk
              </button>
            </div>

            {urgentLabs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-[24px] text-emerald-500">check_circle</span>
                  <span className="text-slate-700 font-semibold">All Diagnostic Queues Clear</span>
                  <span className="text-[11px] text-slate-400">No urgent STAT laboratory tests awaiting specimen processing</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {urgentLabs.map((lab: any) => (
                  <div
                    key={lab.id}
                    className="p-3 rounded-lg border border-red-200 bg-red-50/50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-900">{lab.testName}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-600 text-white">
                            STAT
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Patient: <strong>{lab.patientName}</strong> ({lab.patientMrn}) • Doctor: {lab.doctorName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                        {lab.sampleStatus}
                      </span>
                      <button
                        onClick={onNavigateToLab}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-primary-teal hover:bg-primary-teal-hover text-white transition-colors"
                      >
                        Process Test
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (35% - 4 cols on xl) */}
        <div className="xl:col-span-4 flex flex-col gap-space-md">
          {/* Pharmacy Expiration & Low Stock Alerts */}
          <div className="pharmacy-alerts-panel bg-bg-surface rounded-xl shadow-xs border border-border-subtle p-space-md">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">medication</span>
                <h3 className="font-title-sm text-title-sm text-on-surface">
                  Pharmacy Shortage & Expiry Alerts
                </h3>
              </div>
              <button
                onClick={onNavigateToPharmacy}
                className="text-xs text-primary-teal hover:underline font-medium"
              >
                Catalog
              </button>
            </div>

            {pharmacyAlerts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-[24px] text-emerald-500">inventory</span>
                  <span className="text-slate-700 font-semibold">Formulary Stock In Control</span>
                  <span className="text-[11px] text-slate-400">No critical stock warnings or near-expiry medicine batches</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pharmacyAlerts.map((alert: any) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border flex flex-col gap-1 ${
                      alert.severity === 'CRITICAL'
                        ? 'border-red-200 bg-red-50/60'
                        : 'border-amber-200 bg-amber-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900 truncate">
                        {alert.medicineName}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          alert.severity === 'CRITICAL'
                            ? 'bg-red-600 text-white'
                            : 'bg-amber-600 text-white'
                        }`}
                      >
                        {alert.alertText}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-600 mt-1">
                      <span>
                        Current Stock: <strong>{alert.stockQuantity}</strong> units (Reorder: {alert.reorderLevel})
                      </span>
                      <span className="font-label-tabular text-[11px] text-slate-500">
                        Exp: {alert.expiryDate}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={onNavigateToPharmacy}
              className="w-full mt-3 py-1.5 text-xs text-center font-medium rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700"
            >
              Open Pharmacy Dispensing Terminal
            </button>
          </div>

          {/* Department Bed Availability Progress Meters */}
          <div className="bg-bg-surface rounded-xl shadow-xs border border-border-subtle p-space-md">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-teal">bed</span>
                <h3 className="font-title-sm text-title-sm text-on-surface">
                  Department Bed Availability
                </h3>
              </div>
            </div>

            <div className="space-y-3.5">
              {wards.map((ward: any) => (
                <div key={ward.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">{ward.name}</span>
                    <span className="font-label-tabular font-semibold text-slate-700">
                      {ward.occupied} / {ward.total} ({ward.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        ward.percentage >= 90
                          ? 'bg-rose-500'
                          : ward.percentage >= 80
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${ward.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
