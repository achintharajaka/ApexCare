import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Appointment } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface AppointmentsViewProps {
  onOpenEmr: (patientId: string) => void;
  preselectedPatientId?: string;
}

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  onOpenEmr,
  preselectedPatientId,
}) => {
  const { user, activeRole } = useAuth();
  const isSuperAdmin = activeRole === 'ADMIN';
  const canBook = ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'].includes(activeRole);
  const canEdit = ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'].includes(activeRole);
  const canDelete = ['ADMIN', 'DOCTOR', 'RECEPTIONIST'].includes(activeRole);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedDoctorId, setSelectedDoctorId] = useState('All');
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');
  const [showBookingDrawer, setShowBookingDrawer] = useState(Boolean(preselectedPatientId));

  // CRUD Modals State
  const [viewingApt, setViewingApt] = useState<Appointment | null>(null);
  const [editingApt, setEditingApt] = useState<Appointment | null>(null);
  const [deletingApt, setDeletingApt] = useState<Appointment | null>(null);
  const [hardDeleteMode, setHardDeleteMode] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('Patient requested cancellation');
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [submittingDelete, setSubmittingDelete] = useState(false);
  const [crudFeedback, setCrudFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [bookingForm, setBookingForm] = useState({
    patientId: preselectedPatientId || '',
    patientName: '',
    doctorId: 'usr-doctor-01',
    department: 'Cardiology & Internal Medicine',
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: '10:00 AM',
    reason: '',
    roomNumber: 'Consultation Suite 204',
  });

  const [editForm, setEditForm] = useState({
    patientName: '',
    doctorId: '',
    department: '',
    roomNumber: '',
    appointmentDate: '',
    appointmentTime: '',
    reason: '',
    priority: 'Normal',
    status: 'Scheduled',
  });

  const fetchData = async () => {
    try {
      const [aptRes, rosterRes] = await Promise.all([
        axios.get('/api/appointments', {
          params: { department: selectedDept, doctorId: selectedDoctorId },
        }),
        axios.get('/api/appointments/roster'),
      ]);
      setAppointments(aptRes.data);
      setRoster(rosterRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Constant background refresh interval (every 6 seconds)
    const interval = setInterval(() => {
      fetchData();
    }, 6000);

    // Instant update on realtime data change from backend
    const handleSync = (e: any) => {
      const detail = e.detail;
      if (!detail?.entity || detail.entity === 'appointments' || detail.entity === 'patients') {
        fetchData();
      }
    };
    window.addEventListener('apexcare:sync', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('apexcare:sync', handleSync);
    };
  }, [selectedDept, selectedDoctorId]);

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/appointments', bookingForm);
      setShowBookingDrawer(false);
      setBookingForm({
        patientId: '',
        patientName: '',
        doctorId: 'usr-doctor-01',
        department: 'Cardiology & Internal Medicine',
        appointmentDate: new Date().toISOString().split('T')[0],
        appointmentTime: '10:00 AM',
        reason: '',
        roomNumber: 'Consultation Suite 204',
      });
      setCrudFeedback({ type: 'success', message: 'Appointment slot booked successfully.' });
      setTimeout(() => setCrudFeedback(null), 4000);
      fetchData();
    } catch (e) {
      alert('Error booking appointment');
    }
  };

  const handleOpenEdit = (apt: Appointment) => {
    setEditingApt(apt);
    setEditForm({
      patientName: apt.patientName,
      doctorId: apt.doctorId,
      department: apt.department,
      roomNumber: apt.roomNumber,
      appointmentDate: apt.appointmentDate,
      appointmentTime: apt.appointmentTime,
      reason: apt.reason || '',
      priority: apt.priority || 'Normal',
      status: apt.status || 'Scheduled',
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApt) return;
    setSubmittingEdit(true);
    try {
      await axios.put(`/api/appointments/${editingApt.id}`, editForm);
      setEditingApt(null);
      setCrudFeedback({ type: 'success', message: `Appointment ${editingApt.id} rescheduled & updated.` });
      setTimeout(() => setCrudFeedback(null), 4000);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to update appointment');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingApt) return;
    setSubmittingDelete(true);
    try {
      await axios.delete(`/api/appointments/${deletingApt.id}`, {
        data: {
          hardDelete: hardDeleteMode,
          cancellationReason,
        },
      });
      setCrudFeedback({
        type: 'success',
        message: hardDeleteMode
          ? `Appointment ${deletingApt.id} was permanently deleted.`
          : `Appointment ${deletingApt.id} was cancelled.`,
      });
      setTimeout(() => setCrudFeedback(null), 4000);
      setDeletingApt(null);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to delete/cancel appointment');
    } finally {
      setSubmittingDelete(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await axios.patch(`/api/appointments/${id}/status`, { status });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const timeSlots = [
    '08:00 AM',
    '08:30 AM',
    '09:00 AM',
    '09:30 AM',
    '10:00 AM',
    '10:30 AM',
    '11:00 AM',
    '11:30 AM',
    '01:00 PM',
    '01:30 PM',
    '02:00 PM',
    '02:30 PM',
    '03:00 PM',
    '03:30 PM',
  ];

  const todayStr = new Date().toISOString().split('T')[0];
  const daysOfWeek = [
    { name: 'Mon, Oct 27', date: '2026-10-27', isToday: false },
    { name: 'Tue, Oct 28', date: '2026-10-28', isToday: false },
    { name: 'Wed, Oct 29 (Today)', date: todayStr, isToday: true },
    { name: 'Thu, Oct 30', date: '2026-10-30', isToday: false },
    { name: 'Fri, Oct 31', date: '2026-10-31', isToday: false },
  ];

  return (
    <div className="flex flex-col w-full space-y-space-md">
      {/* Toast Feedback */}
      {crudFeedback && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-lg border text-xs font-semibold shadow-xs animate-fadeIn ${
            crudFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              {crudFeedback.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{crudFeedback.message}</span>
          </div>
          <button onClick={() => setCrudFeedback(null)} className="text-slate-400 hover:text-slate-700">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Top Command Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-md bg-bg-surface p-space-md rounded-xl border border-border-subtle shadow-xs">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-xs text-slate-500 mb-0.5">
            <span className="font-caption text-caption uppercase tracking-wider">Outpatient Operations</span>
            <span className="text-slate-300 text-[10px]">/</span>
            <span className="font-caption text-caption text-primary-teal font-medium">Departmental Appointments</span>
            {isSuperAdmin && (
              <span className="ml-2 px-2 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                Super Admin CRUD
              </span>
            )}
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
            Appointment Scheduling & Outpatient Matrix
          </h1>
        </div>

        {/* Central Controls & Actions */}
        <div className="flex flex-wrap items-center gap-space-sm">
          {/* View Selector (Matrix vs Table) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('matrix')}
              className={`flex items-center gap-1 px-3 py-1 text-xs rounded transition-colors ${
                viewMode === 'matrix' ? 'bg-white shadow-xs text-primary-teal font-bold' : 'text-slate-600'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">grid_view</span>
              <span>Matrix Grid</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-3 py-1 text-xs rounded transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-xs text-primary-teal font-bold' : 'text-slate-600'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>
              <span>Roster List ({appointments.length})</span>
            </button>
          </div>

          {/* Refresh Action */}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 h-[36px] px-3 rounded-lg border border-border-subtle bg-bg-surface hover:bg-bg-surface-subtle text-slate-700 font-title-sm text-xs sm:text-sm shadow-xs transition-colors"
            title="Refresh appointments and physician roster"
          >
            <span className={`material-symbols-outlined text-[18px] text-primary-teal ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Primary Action Button */}
          {canBook && (
            <button
              onClick={() => setShowBookingDrawer(true)}
              className="flex items-center gap-1.5 h-[36px] px-3 sm:px-4 rounded-lg bg-primary-teal hover:bg-primary-teal-hover text-white font-title-sm text-title-sm shadow-xs transition-all transform active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span className="hidden sm:inline">Book New Appointment</span>
              <span className="sm:hidden text-xs">Book</span>
            </button>
          )}
        </div>
      </div>

      {/* Roster & Grid Workspace */}
      <div className="flex flex-col lg:flex-row gap-space-md items-start w-full">
        {/* LEFT COLUMN: ACTIVE CLINICIANS ROSTER */}
        <aside className="w-full lg:w-72 flex-shrink-0 bg-bg-surface rounded-xl shadow-xs border border-border-subtle p-space-md space-y-space-md">
          <div className="flex items-center justify-between border-b border-border-subtle pb-space-sm">
            <h2 className="font-title-sm text-title-sm text-on-surface flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary-teal text-[18px]">badge</span>
              <span>Attending Roster</span>
            </h2>
            <span className="text-[10px] uppercase font-bold text-slate-400">Station Active</span>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Clinical Department</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full text-xs h-9 px-2 rounded-lg bg-bg-surface-subtle border border-border-strong text-on-surface"
            >
              <option value="All">All Departments</option>
              <option value="Cardiology & Internal Medicine">Cardiology & Internal Medicine</option>
              <option value="Clinical Pathology & Diagnostics">Clinical Pathology & Diagnostics</option>
              <option value="Inpatient Care & ICU">Inpatient Care & ICU</option>
              <option value="General Surgery">General Surgery</option>
            </select>
          </div>

          {/* Doctor List */}
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            <div
              onClick={() => setSelectedDoctorId('All')}
              className={`p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                selectedDoctorId === 'All'
                  ? 'border-primary-teal bg-sky-50/70 text-primary-teal font-bold'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Attending Physicians ({roster.length})
            </div>

            {roster.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelectedDoctorId(doc.id)}
                className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  selectedDoctorId === doc.id
                    ? 'border-primary-teal bg-sky-50/50 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                      {doc.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900 truncate">{doc.fullName}</p>
                      <p className="text-[10px] text-slate-500">{doc.department}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {doc.availableSlots} slots
                  </span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* RIGHT AREA: APPOINTMENTS MATRIX OR TABLE */}
        <div className="flex-1 w-full bg-bg-surface rounded-xl shadow-xs border border-border-subtle p-space-md overflow-hidden">
          {viewMode === 'list' ? (
            /* TABULAR ROSTER LIST */
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-teal text-[20px]">calendar_month</span>
                  <span>Appointments Master Ledger ({appointments.length})</span>
                </h2>
                <div className="text-xs text-slate-500">Live operational consultation queue</div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                      <th className="p-3">Ref ID</th>
                      <th className="p-3">Patient</th>
                      <th className="p-3">Doctor / Dept</th>
                      <th className="p-3">Date & Time</th>
                      <th className="p-3">Room</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {appointments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400">
                          No appointments found for the selected department/doctor.
                        </td>
                      </tr>
                    ) : (
                      appointments.map((apt) => (
                        <tr key={apt.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-700">{apt.id}</td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-900">{apt.patientName}</div>
                            <div className="font-mono text-[10px] text-primary-teal">{apt.patientMrn}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-medium text-slate-800">{apt.doctorName}</div>
                            <div className="text-[10px] text-slate-500">{apt.department}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{apt.appointmentDate}</div>
                            <div className="text-[10px] font-mono text-slate-500">{apt.appointmentTime}</div>
                          </td>
                          <td className="p-3 text-slate-700">{apt.roomNumber}</td>
                          <td className="p-3">
                            <select
                              value={apt.status}
                              onChange={(e) => handleUpdateStatus(apt.id, e.target.value)}
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border outline-none cursor-pointer ${
                                apt.status === 'Completed'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : apt.status === 'In-Progress'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                  : apt.status === 'Cancelled'
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : 'bg-sky-100 text-sky-800 border-sky-300'
                              }`}
                            >
                              <option value="Scheduled">Scheduled</option>
                              <option value="In-Progress">In-Progress</option>
                              <option value="Completed">Completed</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setViewingApt(apt)}
                                className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                                title="View Appointment"
                              >
                                <span className="material-symbols-outlined text-[15px]">visibility</span>
                              </button>
                              {canEdit && (
                                <button
                                  onClick={() => handleOpenEdit(apt)}
                                  className="p-1.5 rounded border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 transition-colors"
                                  title="Edit / Reschedule"
                                >
                                  <span className="material-symbols-outlined text-[15px]">edit</span>
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => {
                                    setDeletingApt(apt);
                                    setHardDeleteMode(false);
                                  }}
                                  className="p-1.5 rounded border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                                  title="Cancel or Delete"
                                >
                                  <span className="material-symbols-outlined text-[15px]">delete</span>
                                </button>
                              )}
                              <button
                                onClick={() => onOpenEmr(apt.patientId)}
                                className="px-2 py-1 rounded bg-primary-teal text-white font-semibold text-[11px] hover:bg-primary-teal-hover transition-colors"
                              >
                                EMR
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* WEEKLY GRID MATRIX */
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-subtle">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-teal text-[20px]">calendar_view_week</span>
                  <span>Weekly Outpatient Consultation Grid</span>
                </h2>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span> Confirmed</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-amber-500"></span> In Consultation</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-sky-500"></span> Scheduled</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-rose-500"></span> Cancelled</span>
                </div>
              </div>

              {/* Time increment grid */}
              <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                  {/* Day headers */}
                  <div className="grid grid-cols-6 border-b border-slate-200 pb-2 text-xs font-semibold text-slate-600">
                    <div className="text-slate-400 pl-2">Time Slot</div>
                    {daysOfWeek.map((day) => (
                      <div key={day.date} className={`text-center ${day.isToday ? 'text-primary-teal font-bold' : ''}`}>
                        {day.name}
                      </div>
                    ))}
                  </div>

                  {/* Slot rows */}
                  <div className="divide-y divide-slate-100">
                    {timeSlots.map((slot) => {
                      const matchingApts = appointments.filter((a) => a.appointmentTime === slot);

                      return (
                        <div key={slot} className="grid grid-cols-6 py-2.5 items-center hover:bg-slate-50/50">
                          <div className="text-[11px] font-label-tabular font-medium text-slate-400 pl-2">
                            {slot}
                          </div>

                          {/* Day Columns */}
                          {daysOfWeek.map((day) => {
                            const dayApt = matchingApts.find((a) => a.appointmentDate === day.date) || (day.isToday ? matchingApts[0] : null);

                            return (
                              <div key={day.date} className="px-1 min-h-[44px] flex items-center">
                                {dayApt ? (
                                  <div
                                    onClick={() => setViewingApt(dayApt)}
                                    className={`w-full p-2 rounded-lg text-left text-xs transition-shadow shadow-xs border-l-4 cursor-pointer hover:shadow-md ${
                                      dayApt.status === 'Completed'
                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
                                        : dayApt.status === 'In-Progress'
                                        ? 'bg-amber-50 border-amber-500 text-amber-950'
                                        : dayApt.status === 'Cancelled'
                                        ? 'bg-rose-50 border-rose-500 text-rose-950'
                                        : 'bg-sky-50 border-sky-500 text-sky-950'
                                    }`}
                                  >
                                    <div className="font-semibold truncate">{dayApt.patientName}</div>
                                    <div className="text-[10px] text-slate-600 truncate">{dayApt.doctorName} • {dayApt.roomNumber}</div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setBookingForm({ ...bookingForm, appointmentTime: slot, appointmentDate: day.date });
                                      setShowBookingDrawer(true);
                                    }}
                                    className="w-full h-8 rounded border border-dashed border-slate-200 hover:border-primary-teal hover:bg-sky-50/30 text-[10px] text-slate-400 hover:text-primary-teal flex items-center justify-center opacity-40 hover:opacity-100 transition-all"
                                  >
                                    + Book
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* VIEW APPOINTMENT MODAL */}
      {viewingApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Appointment Dossier</h2>
                <p className="text-xs text-slate-300 font-mono">Reference: {viewingApt.id}</p>
              </div>
              <button onClick={() => setViewingApt(null)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[11px] uppercase font-bold text-slate-400">Patient</span>
                  <span className="font-bold text-slate-900">{viewingApt.patientName}</span>
                  <div className="font-mono text-primary-teal text-xs font-semibold">{viewingApt.patientMrn}</div>
                </div>
                <div>
                  <span className="block text-[11px] uppercase font-bold text-slate-400">Attending Doctor</span>
                  <span className="font-bold text-slate-900">{viewingApt.doctorName}</span>
                  <div className="text-xs text-slate-500">{viewingApt.department}</div>
                </div>
                <div>
                  <span className="block text-[11px] uppercase font-bold text-slate-400">Scheduled Time</span>
                  <span className="font-semibold text-slate-900">{viewingApt.appointmentDate} at {viewingApt.appointmentTime}</span>
                </div>
                <div>
                  <span className="block text-[11px] uppercase font-bold text-slate-400">Consultation Room</span>
                  <span className="font-semibold text-slate-900">{viewingApt.roomNumber}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[11px] uppercase font-bold text-slate-400">Status</span>
                  <span
                    className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      viewingApt.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : viewingApt.status === 'In-Progress'
                        ? 'bg-amber-100 text-amber-800'
                        : viewingApt.status === 'Cancelled'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-sky-100 text-sky-800'
                    }`}
                  >
                    {viewingApt.status}
                  </span>
                </div>
              </div>

              <div>
                <span className="block text-[11px] uppercase font-bold text-slate-400 mb-1">Reason for Consultation</span>
                <p className="p-3 rounded-lg border border-slate-200 bg-white text-slate-800 font-medium">
                  {viewingApt.reason || 'General clinical consultation.'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewingApt(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 text-xs"
                >
                  Close
                </button>
                <div className="flex items-center gap-2">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = viewingApt;
                        setViewingApt(null);
                        handleOpenEdit(target);
                      }}
                      className="px-3.5 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 font-semibold hover:bg-amber-100 text-xs"
                    >
                      Reschedule / Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const pid = viewingApt.patientId;
                      setViewingApt(null);
                      onOpenEmr(pid);
                    }}
                    className="px-4 py-2 rounded-lg bg-primary-teal text-white font-semibold hover:bg-primary-teal-hover text-xs"
                  >
                    Open Patient EMR
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT / RESCHEDULE APPOINTMENT MODAL */}
      {editingApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-amber-600 text-white flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Edit / Reschedule Appointment</h2>
                <p className="text-xs text-amber-100 font-mono">Reference: {editingApt.id}</p>
              </div>
              <button onClick={() => setEditingApt(null)} className="text-amber-100 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Appointment Date</label>
                  <input
                    type="date"
                    required
                    value={editForm.appointmentDate}
                    onChange={(e) => setEditForm({ ...editForm, appointmentDate: e.target.value })}
                    className="w-full h-9 px-3 text-xs rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Time Slot</label>
                  <select
                    value={editForm.appointmentTime}
                    onChange={(e) => setEditForm({ ...editForm, appointmentTime: e.target.value })}
                    className="w-full h-9 px-2 text-xs rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  >
                    {timeSlots.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Attending Doctor</label>
                  <select
                    value={editForm.doctorId}
                    onChange={(e) => setEditForm({ ...editForm, doctorId: e.target.value })}
                    className="w-full h-9 px-2 text-xs rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  >
                    {roster.map((d) => (
                      <option key={d.id} value={d.id}>{d.fullName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Room / Suite</label>
                  <input
                    type="text"
                    value={editForm.roomNumber}
                    onChange={(e) => setEditForm({ ...editForm, roomNumber: e.target.value })}
                    className="w-full h-9 px-3 text-xs rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Department</label>
                  <select
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full h-9 px-2 text-xs rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  >
                    <option value="Cardiology & Internal Medicine">Cardiology & Internal Medicine</option>
                    <option value="Clinical Pathology & Diagnostics">Clinical Pathology & Diagnostics</option>
                    <option value="Inpatient Care & ICU">Inpatient Care & ICU</option>
                    <option value="General Surgery">General Surgery</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full h-9 px-2 text-xs rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="In-Progress">In-Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Reason for Visit</label>
                <textarea
                  rows={2}
                  value={editForm.reason}
                  onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                  className="w-full p-2 text-xs rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingApt(null)}
                  className="px-3.5 py-1.5 text-xs rounded border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5"
                >
                  {submittingEdit && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>Save Appointment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL / DELETE APPOINTMENT MODAL */}
      {deletingApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">event_busy</span>
                <h2 className="text-base font-bold">Cancel / Delete Appointment</h2>
              </div>
              <button onClick={() => setDeletingApt(null)} className="text-rose-100 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700">
                Manage appointment for <strong className="text-slate-900 font-bold">{deletingApt.patientName}</strong> with{' '}
                <span className="font-semibold text-slate-900">{deletingApt.doctorName}</span> on{' '}
                <span className="font-mono text-primary-teal font-semibold">{deletingApt.appointmentDate} at {deletingApt.appointmentTime}</span>.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Reason for Cancellation</label>
                <input
                  type="text"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded border border-slate-300"
                  placeholder="e.g. Patient rescheduled, physician unavailable"
                />
              </div>

              {isSuperAdmin && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-amber-900">
                    <input
                      type="checkbox"
                      checked={hardDeleteMode}
                      onChange={(e) => setHardDeleteMode(e.target.checked)}
                      className="rounded text-rose-600"
                    />
                    <span>Permanent Hard Delete (Super Administrator only)</span>
                  </label>
                  <p className="text-[11px] text-amber-700 mt-1">
                    Checking this completely removes the appointment from database rather than marking it Cancelled.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeletingApt(null)}
                  className="px-4 py-2 text-sm rounded border border-slate-300 hover:bg-slate-50 text-slate-700"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSubmit}
                  disabled={submittingDelete}
                  className="px-5 py-2 text-sm rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  {submittingDelete && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>{hardDeleteMode ? 'Permanently Delete' : 'Confirm Cancellation'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOOKING DRAWER / MODAL */}
      {showBookingDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-primary-navy text-white flex items-center justify-between flex-shrink-0">
              <h2 className="text-base font-semibold">Book Outpatient Consultation Slot</h2>
              <button onClick={() => setShowBookingDrawer(false)} className="text-slate-300 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleBookAppointment} className="p-4 sm:p-6 space-y-3.5 overflow-y-auto max-h-[calc(90vh-65px)]">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Patient</label>
                <input
                  type="text"
                  required
                  value={bookingForm.patientName}
                  onChange={(e) => setBookingForm({ ...bookingForm, patientName: e.target.value })}
                  placeholder="Patient Name or MRN"
                  className="w-full h-9 px-3 text-xs rounded border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Department</label>
                  <select
                    value={bookingForm.department}
                    onChange={(e) => setBookingForm({ ...bookingForm, department: e.target.value })}
                    className="w-full h-9 px-2 text-xs rounded border border-slate-300"
                  >
                    <option value="Cardiology & Internal Medicine">Cardiology & Internal Medicine</option>
                    <option value="Clinical Pathology & Diagnostics">Clinical Pathology & Diagnostics</option>
                    <option value="Inpatient Care & ICU">Inpatient Care & ICU</option>
                    <option value="General Surgery">General Surgery</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Attending Physician</label>
                  <select
                    value={bookingForm.doctorId}
                    onChange={(e) => setBookingForm({ ...bookingForm, doctorId: e.target.value })}
                    className="w-full h-9 px-2 text-xs rounded border border-slate-300"
                  >
                    {roster.map((d) => (
                      <option key={d.id} value={d.id}>{d.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Appointment Date</label>
                  <input
                    type="date"
                    required
                    value={bookingForm.appointmentDate}
                    onChange={(e) => setBookingForm({ ...bookingForm, appointmentDate: e.target.value })}
                    className="w-full h-9 px-3 text-xs rounded border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Time Slot</label>
                  <select
                    value={bookingForm.appointmentTime}
                    onChange={(e) => setBookingForm({ ...bookingForm, appointmentTime: e.target.value })}
                    className="w-full h-9 px-2 text-xs rounded border border-slate-300"
                  >
                    {timeSlots.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Reason for Visit</label>
                <textarea
                  rows={2}
                  required
                  value={bookingForm.reason}
                  onChange={(e) => setBookingForm({ ...bookingForm, reason: e.target.value })}
                  className="w-full p-2 text-xs rounded border border-slate-300"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBookingDrawer(false)}
                  className="px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-primary-teal text-white hover:bg-primary-teal-hover"
                >
                  Confirm Slot Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
