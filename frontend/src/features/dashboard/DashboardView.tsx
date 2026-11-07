import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

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
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'shift'>('today');
  const dashboardRef = useRef<HTMLDivElement>(null);

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

  // GSAP micro-stagger on data load (respects prefers-reduced-motion)
  useGSAP(
    () => {
      if (!data) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      gsap.fromTo(
        '.kpi-card',
        { opacity: 0, y: 12, scale: 0.99 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, stagger: 0.05, ease: 'power2.out' }
      );

      gsap.fromTo(
        '.dashboard-section',
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.38, delay: 0.12, stagger: 0.06, ease: 'power2.out' }
      );
    },
    { dependencies: [Boolean(data)], scope: dashboardRef }
  );

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
          <div className="w-9 h-9 border-3 border-primary-teal border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-slate-600">Loading Clinical Operations Overview...</span>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetchDashboardData();
            }}
            className="mt-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-primary-teal text-white hover:bg-primary-teal-hover tap-press transition-colors flex items-center gap-1.5 shadow-xs"
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
    <div ref={dashboardRef} className="flex flex-col w-full space-y-6">
      {/* Top Command & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Hospital Operational Overview
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time clinical throughput, patient queue & ward census
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Operational Capacity Badge */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-100 text-sky-800 text-xs font-semibold shadow-2xs">
            <span className="material-symbols-outlined text-[16px] text-sky-600">local_hospital</span>
            <span>Capacity: Operational</span>
            <span className="text-slate-300">•</span>
            <span className="font-bold text-emerald-700">Triage: Ready</span>
          </div>

          {/* Date Scope Filter Tabs using transitions-dev .t-tabs */}
          <div className="t-tabs">
            <button
              onClick={() => setTimeFilter('today')}
              className={`t-tab tap-press ${
                timeFilter === 'today' ? 'is-active bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeFilter('shift')}
              className={`t-tab tap-press ${
                timeFilter === 'shift' ? 'is-active bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Current Shift
            </button>
            <button
              onClick={() => setTimeFilter('week')}
              className={`t-tab tap-press ${
                timeFilter === 'week' ? 'is-active bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs tap-press transition-all"
            title="Refresh Hospital Operational Overview & Telemetry"
          >
            <span className={`material-symbols-outlined text-[16px] text-primary-teal ${isRefreshing ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* 4 Primary Top KPI Metric Cards (Concentric Radius: outer 16px, padding 20px, inner 12px) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Active Patients */}
        <div className="kpi-card bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs card-interactive">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Registered Patients
            </span>
            <span className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">groups</span>
            </span>
          </div>
          <div className="my-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl text-slate-900 font-extrabold tabular-nums tracking-tight">
              {metrics.totalPatients.count}
            </span>
            <span className="inline-flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
              {metrics.totalPatients.trend}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Inpatient: <strong className="text-slate-800 tabular-nums">{metrics.totalPatients.inpatient}</strong></span>
            <span>Outpatient: <strong className="text-slate-800 tabular-nums">{metrics.totalPatients.outpatient}</strong></span>
          </div>
        </div>

        {/* KPI 2: Today Appointments */}
        <div className="kpi-card bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs card-interactive">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Today's Appointments
            </span>
            <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">event_available</span>
            </span>
          </div>
          <div className="my-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl text-slate-900 font-extrabold tabular-nums tracking-tight">
              {metrics.todayAppointments.total}
            </span>
            <span className="text-xs font-medium text-slate-500">{metrics.todayAppointments.clinicsCount} Active Clinics</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 tabular-nums">
            <span className="text-emerald-700 font-bold">{metrics.todayAppointments.completed} Done</span>
            <span className="text-amber-700 font-bold">{metrics.todayAppointments.inProgress} In-Prog</span>
            <span className="text-blue-700 font-bold">{metrics.todayAppointments.upcoming} Upcoming</span>
          </div>
        </div>

        {/* KPI 3: Revenue Today */}
        <div className="kpi-card bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs card-interactive">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Settled Revenue Today
            </span>
            <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">payments</span>
            </span>
          </div>
          <div className="my-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl text-slate-900 font-extrabold tabular-nums tracking-tight">
              Rs. {Number(metrics.revenueToday.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-bold text-emerald-600">{metrics.revenueToday.targetComparison}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 tabular-nums">
            <span>Clinic: Rs. {metrics.revenueToday.breakdown?.consultation || 0}</span>
            <span>Rx: Rs. {metrics.revenueToday.breakdown?.pharmacy || 0}</span>
            <span>Lab: Rs. {metrics.revenueToday.breakdown?.laboratory || 0}</span>
          </div>
        </div>

        {/* KPI 4: Ward Bed Occupancy */}
        <div className="kpi-card bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs card-interactive">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Bed Occupancy
            </span>
            <span className="text-xs font-bold text-slate-800 tabular-nums bg-slate-100 px-2 py-0.5 rounded-md">
              {metrics.bedOccupancy.percentage}%
            </span>
          </div>
          <div className="my-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl text-slate-900 font-extrabold tabular-nums tracking-tight">
                {metrics.bedOccupancy.occupiedBeds}
              </span>
              <span className="text-xs text-slate-500 font-medium">/ {metrics.bedOccupancy.totalBeds} Beds</span>
            </div>
            <span className="text-xs font-bold text-primary-teal">{availableBeds} Available</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
            <div
              className="bg-primary-teal h-full transition-all duration-300"
              style={{ width: `${Math.min(100, metrics.bedOccupancy.percentage)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Content Grid (65% / 35% Split on Desktop, Stacked on Mobile) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (65% - 8 cols on xl) */}
        <div className="xl:col-span-8 flex flex-col gap-5">
          {/* Today's Clinical Appointments Queue */}
          <div className="dashboard-section bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
            <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-primary-teal text-[20px]">calendar_month</span>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Today's Clinical Appointments Queue
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold tabular-nums">
                  {queue.length} Patients
                </span>
              </div>
              <button
                onClick={onNavigateToAppointments}
                className="text-xs text-primary-teal hover:underline font-bold flex items-center gap-1 tap-press"
              >
                <span>View Full Calendar</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>

            {/* Table with responsive horizontal scroll wrapper */}
            <div className="table-scroll-container">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <th className="py-3 px-4">Patient Details</th>
                    <th className="py-3 px-4">Attending Doctor</th>
                    <th className="py-3 px-4">Department & Room</th>
                    <th className="py-3 px-4">Time Slot</th>
                    <th className="py-3 px-4">Clinical Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {queue.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-[36px] text-slate-300">event_busy</span>
                          <span className="font-bold text-slate-700">No Outpatient Consultations Queued</span>
                          <span className="text-slate-400 text-xs">Book an appointment from the Appointments module or register a new patient.</span>
                          <button
                            onClick={onNavigateToAppointments}
                            className="mt-2 px-3.5 py-2 rounded-xl bg-primary-teal text-white font-semibold text-xs hover:bg-primary-teal-hover tap-press transition-colors shadow-xs"
                          >
                            + Schedule Appointment
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    queue.map((apt: any) => (
                      <tr key={apt.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <button
                              onClick={() => onNavigateToEmr(apt.patientId)}
                              className="font-bold text-slate-900 hover:text-primary-teal text-left tap-press"
                            >
                              {apt.patientName}
                            </button>
                            <span className="text-xs text-slate-500 tabular-nums">{apt.patientMrn}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">{apt.doctorName}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="text-slate-900 font-medium">{apt.department}</span>
                            <span className="text-xs text-slate-500">{apt.roomNumber}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 tabular-nums font-semibold text-slate-800">
                          {apt.appointmentTime}
                        </td>
                        <td className="py-3.5 px-4">
                          <select
                            value={apt.status}
                            onChange={(e) => handleUpdateAptStatus(apt.id, e.target.value)}
                            className={`text-xs font-bold px-2.5 py-1 rounded-lg border outline-none cursor-pointer transition-colors ${
                              apt.status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : apt.status === 'In-Progress'
                                ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                : apt.status === 'Cancelled'
                                ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                                : 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100'
                            }`}
                          >
                            <option value="Scheduled">Scheduled</option>
                            <option value="In-Progress">In-Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => onNavigateToEmr(apt.patientId)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 tap-press transition-colors"
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
          <div className="dashboard-section bg-white rounded-2xl shadow-xs border border-slate-200/90 p-5">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-teal">science</span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  STAT Urgent Laboratory Orders
                </h3>
              </div>
              <button
                onClick={onNavigateToLab}
                className="text-xs text-primary-teal hover:underline font-bold tap-press"
              >
                Go to Laboratory Desk
              </button>
            </div>

            {urgentLabs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-[26px] text-emerald-500">check_circle</span>
                  <span className="text-slate-800 font-bold">All Diagnostic Queues Clear</span>
                  <span className="text-xs text-slate-400">No urgent STAT laboratory tests awaiting specimen processing</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {urgentLabs.map((lab: any) => (
                  <div
                    key={lab.id}
                    className="p-3.5 rounded-xl border border-red-200 bg-red-50/60 flex items-center justify-between gap-3 card-interactive"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping flex-shrink-0"></span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-900">{lab.testName}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white">
                            STAT
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Patient: <strong>{lab.patientName}</strong> ({lab.patientMrn}) • Doctor: {lab.doctorName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200">
                        {lab.sampleStatus}
                      </span>
                      <button
                        onClick={onNavigateToLab}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-primary-teal hover:bg-primary-teal-hover text-white tap-press transition-colors shadow-xs whitespace-nowrap"
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
        <div className="xl:col-span-4 flex flex-col gap-5">
          {/* Pharmacy Expiration & Low Stock Alerts */}
          <div className="dashboard-section pharmacy-alerts-panel bg-white rounded-2xl shadow-xs border border-slate-200/90 p-5">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">medication</span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Pharmacy Shortage & Expiry Alerts
                </h3>
              </div>
              <button
                onClick={onNavigateToPharmacy}
                className="text-xs text-primary-teal hover:underline font-bold tap-press"
              >
                Catalog
              </button>
            </div>

            {pharmacyAlerts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-[26px] text-emerald-500">inventory</span>
                  <span className="text-slate-800 font-bold">Formulary Stock In Control</span>
                  <span className="text-xs text-slate-400">No critical stock warnings or near-expiry medicine batches</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {pharmacyAlerts.map((alert: any) => (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-xl border flex flex-col gap-1.5 card-interactive ${
                      alert.severity === 'CRITICAL'
                        ? 'border-red-200 bg-red-50/60'
                        : 'border-amber-200 bg-amber-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {alert.medicineName}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          alert.severity === 'CRITICAL'
                            ? 'bg-red-600 text-white'
                            : 'bg-amber-600 text-white'
                        }`}
                      >
                        {alert.alertText}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-600 mt-0.5">
                      <span>
                        Current Stock: <strong className="tabular-nums">{alert.stockQuantity}</strong> units (Reorder: {alert.reorderLevel})
                      </span>
                      <span className="text-[11px] text-slate-500 tabular-nums">
                        Exp: {alert.expiryDate}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={onNavigateToPharmacy}
              className="w-full mt-4 py-2 text-xs text-center font-bold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 tap-press transition-colors"
            >
              Open Pharmacy Dispensing Terminal
            </button>
          </div>

          {/* Department Bed Availability Progress Meters */}
          <div className="dashboard-section bg-white rounded-2xl shadow-xs border border-slate-200/90 p-5">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-teal">bed</span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Department Bed Availability
                </h3>
              </div>
            </div>

            <div className="space-y-4">
              {wards.map((ward: any) => (
                <div key={ward.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{ward.name}</span>
                    <span className="font-bold text-slate-700 tabular-nums">
                      {ward.occupied} / {ward.total} ({ward.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
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
