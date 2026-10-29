import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { StaffMember, LeaveRecord, RoleType } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const StaffView: React.FC = () => {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'directory' | 'attendance' | 'leave'>('directory');
  const [selectedDept, setSelectedDept] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [submittingStaff, setSubmittingStaff] = useState(false);
  const [addStaffError, setAddStaffError] = useState('');
  const [addStaffSuccess, setAddStaffSuccess] = useState('');

  // Edit Staff State (Superadmin Update)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    role: 'DOCTOR' as RoleType,
    department: '',
    jobTitle: '',
    phoneNumber: '',
    email: '',
    shift: '',
    specialization: '',
    roomNumber: '',
    consultationFee: 2500,
    newPassword: '',
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Staff State (Superadmin Delete)
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // View Staff Profile Modal State
  const [viewingStaff, setViewingStaff] = useState<StaffMember | null>(null);

  // Add staff & doctor form state (Superadmin Create)
  const initialStaffForm = {
    fullName: '',
    role: 'DOCTOR' as RoleType,
    department: '',
    jobTitle: '',
    phoneNumber: '',
    email: '',
    shift: 'Day Clinical Shift (08:00 - 16:00)',
    username: '',
    password: '',
    specialization: '',
    roomNumber: '',
    consultationFee: 2500,
  };

  const [staffForm, setStaffForm] = useState(initialStaffForm);

  // Leave form
  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    leaveType: 'Annual Leave',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    reason: 'Personal Leave',
  });

  const fetchData = async () => {
    try {
      try {
        const staffRes = await axios.get('/api/staff', { params: { department: selectedDept } });
        if (Array.isArray(staffRes.data)) {
          setStaff(staffRes.data);
          if (staffRes.data.length > 0) {
            setLeaveForm((prev) => ({
              ...prev,
              employeeId: prev.employeeId || staffRes.data[0].id,
            }));
          }
        }
      } catch (staffErr) {
        console.error('Error fetching staff directory:', staffErr);
      }

      try {
        const leaveRes = await axios.get('/api/staff/leave');
        if (Array.isArray(leaveRes.data)) {
          setLeaveRecords(leaveRes.data);
        }
      } catch (leaveErr) {
        console.error('Error fetching leave records:', leaveErr);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Constant background refresh interval (every 8 seconds)
    const interval = setInterval(() => {
      fetchData();
    }, 8000);

    // Instant update on realtime data change from backend
    const handleSync = (e: any) => {
      const detail = e.detail;
      if (!detail?.entity || detail.entity === 'staff') {
        fetchData();
      }
    };
    window.addEventListener('apexcare:sync', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('apexcare:sync', handleSync);
    };
  }, [selectedDept]);

  const handleRoleChange = (newRole: RoleType) => {
    const shiftDefaults: Record<RoleType, { shift: string; fee?: number }> = {
      DOCTOR: { shift: 'Day Clinical Shift (08:00 - 16:00)', fee: 2500 },
      NURSE: { shift: 'Day Nursing Shift (07:00 - 15:30)', fee: 0 },
      RECEPTIONIST: { shift: 'Morning Shift (08:00 - 16:30)', fee: 0 },
      LAB_TECH: { shift: 'Diagnostic Laboratory Shift (08:30 - 17:00)', fee: 0 },
      PHARMACIST: { shift: 'Dispensary Day Shift (08:00 - 16:30)', fee: 0 },
      ACCOUNTANT: { shift: 'Finance Shift (09:00 - 17:30)', fee: 0 },
      ADMIN: { shift: 'General Administrative (08:00 - 17:00)', fee: 0 },
    };

    const d = shiftDefaults[newRole] || shiftDefaults.DOCTOR;
    setStaffForm((prev) => ({
      ...prev,
      role: newRole,
      shift: d.shift,
      consultationFee: d.fee || 0,
    }));
  };

  // CREATE: Superadmin registers new staff/doctor
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingStaff(true);
    setAddStaffError('');

    try {
      const res = await axios.post('/api/staff', staffForm);
      setAddStaffSuccess(
        `Successfully registered ${staffForm.fullName} (${staffForm.role})! Station Login ID: "${staffForm.username}"`
      );
      setShowAddStaffModal(false);
      setStaffForm(initialStaffForm);
      await fetchData();
    } catch (err: any) {
      setAddStaffError(err?.response?.data?.error || 'Failed to register personnel.');
    } finally {
      setSubmittingStaff(false);
    }
  };

  // UPDATE: Open Edit Modal with pre-filled details
  const handleOpenEditModal = (emp: StaffMember) => {
    setEditingStaff(emp);
    setEditForm({
      fullName: emp.fullName,
      role: emp.role,
      department: emp.department,
      jobTitle: emp.jobTitle,
      phoneNumber: emp.phoneNumber,
      email: emp.email,
      shift: emp.shift,
      specialization: emp.specialization || '',
      roomNumber: emp.roomNumber || '',
      consultationFee: emp.consultationFee || (emp.role === 'DOCTOR' ? 2500 : 0),
      newPassword: '',
    });
    setEditError('');
  };

  // UPDATE: Submit staff updates
  const handleEditStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setSubmittingEdit(true);
    setEditError('');

    try {
      const payload: any = { ...editForm };
      if (!payload.newPassword?.trim()) {
        delete payload.newPassword;
      }
      const res = await axios.put(`/api/staff/${editingStaff.id}`, payload);
      setAddStaffSuccess(res.data?.message || `Updated details for ${editForm.fullName} successfully!`);
      setEditingStaff(null);
      await fetchData();
    } catch (err: any) {
      setEditError(err?.response?.data?.error || 'Failed to update staff member details.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // DELETE: Delete staff member & credentials
  const handleDeleteStaffSubmit = async () => {
    if (!deletingStaff) return;
    setDeletingLoading(true);
    setDeleteError('');

    try {
      const res = await axios.delete(`/api/staff/${deletingStaff.id}`);
      setAddStaffSuccess(res.data?.message || `Staff member "${deletingStaff.fullName}" was successfully removed.`);
      setDeletingStaff(null);
      await fetchData();
    } catch (err: any) {
      setDeleteError(err?.response?.data?.error || 'Failed to delete staff member.');
    } finally {
      setDeletingLoading(false);
    }
  };

  const handleToggleAttendance = async (employeeId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Present' ? 'Absent' : 'Present';
    try {
      await axios.post('/api/staff/attendance', { employeeId, status: nextStatus });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLeaveDecision = async (leaveId: string, decision: 'Approved' | 'Rejected') => {
    try {
      await axios.patch(`/api/staff/leave/${leaveId}`, { status: decision });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/staff/leave', leaveForm);
      setShowLeaveModal(false);
      fetchData();
    } catch (e) {
      alert('Error requesting leave');
    }
  };

  const isSuperAdmin = user?.role === 'ADMIN';

  // Filtered staff list by search query and department
  const filteredStaff = staff.filter((emp) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const username = (emp as any).username || '';
    return (
      emp.fullName.toLowerCase().includes(q) ||
      emp.employeeId.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q) ||
      emp.jobTitle.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q) ||
      emp.role.toLowerCase().includes(q) ||
      username.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col w-full space-y-space-md">
      {/* Header & Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-bg-surface p-space-md rounded-xl border border-border-subtle shadow-xs">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
            Staff & Clinical Roster Administration
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Personnel Directory • Daily Duty Shift Clock-in • Leave Authorization
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'directory' ? 'bg-white text-primary-teal shadow-xs' : 'text-slate-600'
              }`}
            >
              Personnel Directory ({staff.length})
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'attendance' ? 'bg-white text-primary-teal shadow-xs' : 'text-slate-600'
              }`}
            >
              Duty Attendance Register
            </button>
            <button
              onClick={() => setActiveTab('leave')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'leave' ? 'bg-white text-primary-teal shadow-xs' : 'text-slate-600'
              }`}
            >
              Leave Ledger ({leaveRecords.length})
            </button>
          </div>

          {/* Superadmin Add Staff & Doctor Action Button */}
          {isSuperAdmin && (
            <button
              onClick={() => {
                setAddStaffError('');
                setShowAddStaffModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary-teal hover:bg-primary-teal-hover text-white font-semibold text-xs shadow-xs transition-all transform active:scale-95"
              title="Add a new doctor or staff member with login credentials"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>+ Add Staff / Doctor</span>
            </button>
          )}

          {/* Refresh Action */}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 h-[34px] px-3 rounded-lg border border-border-subtle bg-bg-surface hover:bg-bg-surface-subtle text-slate-700 font-title-sm text-xs shadow-xs transition-colors"
            title="Refresh Staff & Roster"
          >
            <span className={`material-symbols-outlined text-[16px] text-primary-teal ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {activeTab === 'leave' && (
            <button
              onClick={() => setShowLeaveModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-white font-title-sm text-xs hover:bg-slate-700"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Request Leave</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Alert */}
      {addStaffSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
            <span className="font-medium">{addStaffSuccess}</span>
          </div>
          <button
            onClick={() => setAddStaffSuccess('')}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Directory Tab */}
      {activeTab === 'directory' && (
        <div className="bg-bg-surface rounded-xl border border-border-subtle shadow-xs overflow-hidden">
          {/* Controls: Department filter & instant search */}
          <div className="p-4 border-b border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Filter Department:
                </span>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="h-8 px-2.5 text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:border-primary-teal cursor-pointer"
                >
                  <option value="All">All Departments ({staff.length})</option>
                  <option value="Cardiology">Cardiology & Internal Medicine</option>
                  <option value="Inpatient">Inpatient Care & ICU</option>
                  <option value="Reception">Outpatient Reception</option>
                  <option value="Pathology">Clinical Pathology & Diagnostics</option>
                  <option value="Dispensary">Central Dispensary</option>
                  <option value="Finance">Finance & Billing</option>
                  <option value="Administration">Hospital Administration</option>
                </select>
              </div>

              {/* Instant Search Bar */}
              <div className="relative min-w-[220px]">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, ID, role, login ID..."
                  className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:border-primary-teal"
                />
              </div>
            </div>

            {isSuperAdmin && (
              <span className="text-[11px] text-primary-teal font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
                Super Admin CRUD Active — Add, View, Edit, or Remove staff accounts
              </span>
            )}
          </div>

          {/* Staff Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm min-w-[750px]">
              <thead>
                <tr className="bg-bg-surface-subtle text-caption font-caption text-slate-500 uppercase border-b border-border-subtle">
                  <th className="py-2.5 px-4 font-semibold">Employee ID</th>
                  <th className="py-2.5 px-4 font-semibold">Staff Member</th>
                  <th className="py-2.5 px-4 font-semibold">Operational Role</th>
                  <th className="py-2.5 px-4 font-semibold">Department & Room</th>
                  <th className="py-2.5 px-4 font-semibold">Phone Contact</th>
                  <th className="py-2.5 px-4 font-semibold">Duty Shift</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-xs">
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500 space-y-3">
                        <span className="material-symbols-outlined text-4xl text-slate-300">badge</span>
                        <p className="font-semibold text-sm text-slate-700">No staff members enrolled in directory</p>
                        <p className="text-xs text-slate-400 max-w-md">
                          The personnel directory is clean. Super Admin can enroll doctors, nurses, and administrative personnel using "+ Add Staff / Doctor".
                        </p>
                        <button
                          onClick={fetchData}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium"
                        >
                          <span className="material-symbols-outlined text-[15px]">refresh</span>
                          Reload Directory
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No staff members match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((emp) => {
                    const roleBadgeClass =
                      emp.role === 'ADMIN'
                        ? 'bg-slate-900 text-cyan-300 border border-slate-700'
                        : emp.role === 'DOCTOR'
                        ? 'bg-cyan-100 text-cyan-900 border border-cyan-200'
                        : emp.role === 'NURSE'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        : emp.role === 'RECEPTIONIST'
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : emp.role === 'LAB_TECH'
                        ? 'bg-purple-100 text-purple-900 border border-purple-200'
                        : emp.role === 'PHARMACIST'
                        ? 'bg-teal-100 text-teal-900 border border-teal-200'
                        : 'bg-rose-100 text-rose-900 border border-rose-200';

                    const username = (emp as any).username;
                    const isPrimaryAdmin =
                      emp.role === 'ADMIN' &&
                      ((emp as any).username === 'superadmin' ||
                        emp.email.toLowerCase() === 'namal.kumara@apexcare.lk');

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-label-tabular font-semibold text-primary-teal">
                          {emp.employeeId}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{emp.fullName}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                            <span>{emp.email}</span>
                            {username && (
                              <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                                user: {username}
                              </span>
                            )}
                          </div>
                          {emp.specialization && (
                            <div className="text-[10px] text-primary-teal font-medium mt-0.5">
                              Specialty: {emp.specialization}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${roleBadgeClass}`}>
                            {emp.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-900 font-medium">{emp.department}</div>
                          <div className="text-[11px] text-slate-500">
                            {emp.jobTitle}
                            {emp.roomNumber && ` • ${emp.roomNumber}`}
                            {emp.consultationFee ? ` • Fee: Rs. ${emp.consultationFee.toLocaleString()}` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-mono">{emp.phoneNumber}</td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-800">
                            {emp.shift}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Profile Details Button */}
                            <button
                              type="button"
                              onClick={() => setViewingStaff(emp)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-primary-teal hover:bg-sky-50 transition-colors"
                              title="View Staff Profile & Credentials"
                            >
                              <span className="material-symbols-outlined text-[18px]">visibility</span>
                            </button>

                            {/* Superadmin Edit Button */}
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(emp)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                title="Edit Staff Member Details & Role"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                            )}

                            {/* Superadmin Delete Button */}
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteError('');
                                  setDeletingStaff(emp);
                                }}
                                disabled={isPrimaryAdmin}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isPrimaryAdmin
                                    ? 'text-slate-300 cursor-not-allowed opacity-40'
                                    : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                                }`}
                                title={
                                  isPrimaryAdmin
                                    ? 'Primary Super Administrator account cannot be deleted'
                                    : 'Delete Staff Member & Revoke Credentials'
                                }
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="bg-bg-surface rounded-xl border border-border-subtle shadow-xs overflow-hidden">
          <div className="p-space-md border-b border-border-subtle flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-teal">badge</span>
              <span>Today's Shift Attendance Log — {new Date().toLocaleDateString()}</span>
            </h2>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Active Shift Personnel: {staff.filter((s) => s.attendanceStatus === 'Present').length} / {staff.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-bg-surface-subtle text-caption font-caption text-slate-500 uppercase border-b border-border-subtle">
                  <th className="py-2.5 px-4 font-semibold">Employee</th>
                  <th className="py-2.5 px-4 font-semibold">Department</th>
                  <th className="py-2.5 px-4 font-semibold">Clock-In Duty Shift</th>
                  <th className="py-2.5 px-4 font-semibold">Attendance State</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-xs">
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No staff records available for duty attendance tracking.
                    </td>
                  </tr>
                ) : (
                  staff.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{emp.fullName}</div>
                      <div className="text-[11px] text-slate-500">{emp.employeeId}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{emp.department}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{emp.shift}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          emp.attendanceStatus === 'Present'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {emp.attendanceStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleAttendance(emp.id, emp.attendanceStatus)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold ${
                          emp.attendanceStatus === 'Present'
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        {emp.attendanceStatus === 'Present' ? 'Mark Absent' : 'Clock In'}
                      </button>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leave Ledger Tab */}
      {activeTab === 'leave' && (
        <div className="bg-bg-surface rounded-xl border border-border-subtle shadow-xs overflow-hidden">
          <div className="p-space-md border-b border-border-subtle">
            <h2 className="text-sm font-semibold text-slate-900">Hospital Staff Leave Requests & Approvals</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-bg-surface-subtle text-caption font-caption text-slate-500 uppercase border-b border-border-subtle">
                  <th className="py-2.5 px-4 font-semibold">Staff Member</th>
                  <th className="py-2.5 px-4 font-semibold">Leave Type</th>
                  <th className="py-2.5 px-4 font-semibold">Duration Dates</th>
                  <th className="py-2.5 px-4 font-semibold">Clinical Reason</th>
                  <th className="py-2.5 px-4 font-semibold">Approval Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Administrative Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-xs">
                {leaveRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No active leave applications on file.
                    </td>
                  </tr>
                ) : (
                  leaveRecords.map((lve) => (
                    <tr key={lve.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-900">{lve.employeeName}</td>
                      <td className="py-3 px-4 font-medium text-slate-700">{lve.leaveType}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {lve.startDate} to {lve.endDate}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{lve.reason}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            lve.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : lve.status === 'Rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {lve.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {lve.status === 'Pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleLeaveDecision(lve.id, 'Approved')}
                              className="px-2 py-0.5 rounded bg-emerald-600 text-white font-semibold text-[11px] hover:bg-emerald-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleLeaveDecision(lve.id, 'Rejected')}
                              className="px-2 py-0.5 rounded bg-rose-600 text-white font-semibold text-[11px] hover:bg-rose-700"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Decided</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. CREATE MODAL: Add New Staff Member / Doctor (Superadmin)               */}
      {/* ========================================================================= */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-primary-navy text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400 text-[22px]">person_add</span>
                <h2 className="text-base font-semibold tracking-tight">Enroll New Staff Member or Doctor</h2>
              </div>
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="text-slate-300 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddStaffSubmit} className="p-6 space-y-4 overflow-y-auto">
              {addStaffError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-600 text-[18px]">error</span>
                  <span>{addStaffError}</span>
                </div>
              )}

              {/* Role & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Operational Role *
                  </label>
                  <select
                    value={staffForm.role}
                    onChange={(e) => handleRoleChange(e.target.value as RoleType)}
                    className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-primary-teal font-semibold cursor-pointer"
                  >
                    <option value="DOCTOR">Doctor / Physician (Clinical EMR & Rx)</option>
                    <option value="NURSE">Nurse (Inpatient Care & Vitals)</option>
                    <option value="RECEPTIONIST">Receptionist (Admissions & OPD)</option>
                    <option value="LAB_TECH">Laboratory Staff (Diagnostic Assays)</option>
                    <option value="PHARMACIST">Pharmacist (Formulary & Dispensary)</option>
                    <option value="ACCOUNTANT">Accountant (Billing & Cashier)</option>
                    <option value="ADMIN">Administrator (System Supervisor)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Full Legal / Professional Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={staffForm.fullName}
                    onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })}
                    placeholder={staffForm.role === 'DOCTOR' ? 'e.g. Dr. Kasun Perera, MD' : 'e.g. Namal Kumara'}
                    className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-primary-teal"
                  />
                </div>
              </div>

              {/* Department & Job Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Department & Unit *
                  </label>
                  <input
                    type="text"
                    required
                    value={staffForm.department}
                    onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })}
                    placeholder="e.g. Cardiology & Internal Medicine, Inpatient Care"
                    className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-primary-teal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Official Job Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={staffForm.jobTitle}
                    onChange={(e) => setStaffForm({ ...staffForm, jobTitle: e.target.value })}
                    placeholder={staffForm.role === 'DOCTOR' ? 'e.g. Consultant Physician' : 'e.g. Clinical Nursing Officer'}
                    className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-primary-teal"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Institutional Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    placeholder="e.g. kasun.p@apexcare.lk"
                    className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-primary-teal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Phone Contact Number
                  </label>
                  <input
                    type="tel"
                    value={staffForm.phoneNumber}
                    onChange={(e) => setStaffForm({ ...staffForm, phoneNumber: e.target.value })}
                    placeholder="e.g. +94 77 123 4567"
                    className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-primary-teal font-mono"
                  />
                </div>
              </div>

              {/* Duty Shift Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Assigned Duty Shift
                </label>
                <select
                  value={staffForm.shift}
                  onChange={(e) => setStaffForm({ ...staffForm, shift: e.target.value })}
                  className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-primary-teal cursor-pointer"
                >
                  <option value="Day Clinical Shift (08:00 - 16:00)">Day Clinical Shift (08:00 - 16:00)</option>
                  <option value="Morning Shift (08:00 - 16:30)">Morning Shift (08:00 - 16:30)</option>
                  <option value="Day Nursing Shift (07:00 - 15:30)">Day Nursing Shift (07:00 - 15:30)</option>
                  <option value="Diagnostic Laboratory Shift (08:30 - 17:00)">Diagnostic Laboratory Shift (08:30 - 17:00)</option>
                  <option value="Dispensary Day Shift (08:00 - 16:30)">Dispensary Day Shift (08:00 - 16:30)</option>
                  <option value="Finance Shift (09:00 - 17:30)">Finance Shift (09:00 - 17:30)</option>
                  <option value="Evening Shift (14:00 - 22:00)">Evening Shift (14:00 - 22:00)</option>
                  <option value="Night Emergency Shift (22:00 - 06:00)">Night Emergency Shift (22:00 - 06:00)</option>
                </select>
              </div>

              {/* Doctor Specific Details */}
              {staffForm.role === 'DOCTOR' && (
                <div className="p-4 rounded-xl bg-cyan-50/70 border border-cyan-200/80 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-900">
                    <span className="material-symbols-outlined text-[18px]">stethoscope</span>
                    <span>Doctor Clinical Profile Details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-cyan-800 mb-1">
                        Clinical Specialization
                      </label>
                      <input
                        type="text"
                        value={staffForm.specialization}
                        onChange={(e) => setStaffForm({ ...staffForm, specialization: e.target.value })}
                        placeholder="e.g. Interventional Cardiology, Pediatrics"
                        className="w-full h-9 px-2.5 text-xs rounded-md border border-cyan-300 bg-white focus:outline-none focus:border-cyan-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-cyan-800 mb-1">
                        Consultation Fee (Rs.)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={staffForm.consultationFee}
                        onChange={(e) => setStaffForm({ ...staffForm, consultationFee: Number(e.target.value) })}
                        className="w-full h-9 px-2.5 text-xs rounded-md border border-cyan-300 bg-white focus:outline-none focus:border-cyan-600 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-cyan-800 mb-1">
                      Consultation Room / Clinic Location
                    </label>
                    <input
                      type="text"
                      value={staffForm.roomNumber}
                      onChange={(e) => setStaffForm({ ...staffForm, roomNumber: e.target.value })}
                      placeholder="e.g. Consultation Suite 304, OPD Wing B"
                      className="w-full h-9 px-2.5 text-xs rounded-md border border-cyan-300 bg-white focus:outline-none focus:border-cyan-600"
                    />
                  </div>
                </div>
              )}

              {/* Login Account Credentials Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <span className="material-symbols-outlined text-[18px] text-primary-teal">key</span>
                  <span>Workstation Login Credentials (Account Access)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Login Username *
                    </label>
                    <input
                      type="text"
                      required
                      value={staffForm.username}
                      onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value.toLowerCase().trim() })}
                      placeholder="e.g. doctor2, nurse2"
                      className="w-full h-9 px-2.5 text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:border-primary-teal font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Initial Password *
                    </label>
                    <input
                      type="text"
                      required
                      value={staffForm.password}
                      onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                      placeholder="e.g. SecurePass1234!"
                      className="w-full h-9 px-2.5 text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:border-primary-teal font-mono"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  Password will be securely encrypted with bcrypt. The user can immediately sign in with these credentials.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStaff}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-primary-teal text-white hover:bg-primary-teal-hover shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                  <span>{submittingStaff ? 'Registering...' : 'Register & Create Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. UPDATE MODAL: Edit Staff Member Details (Superadmin)                   */}
      {/* ========================================================================= */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-primary-navy text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-[22px]">edit_note</span>
                <div>
                  <h2 className="text-base font-semibold tracking-tight">Edit Staff Member Profile</h2>
                  <p className="text-[11px] text-slate-300">
                    Employee ID: <span className="font-mono font-bold text-amber-300">{editingStaff.employeeId}</span> • Current Role: {editingStaff.role}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="text-slate-300 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleEditStaffSubmit} className="p-6 space-y-4 overflow-y-auto">
              {editError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-600 text-[18px]">error</span>
                  <span>{editError}</span>
                </div>
              )}

              {/* Role & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Operational Role *
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as RoleType })}
                    className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-primary-teal font-semibold cursor-pointer"
                  >
                    <option value="DOCTOR">Doctor / Physician (Clinical EMR & Rx)</option>
                    <option value="NURSE">Nurse (Inpatient Care & Vitals)</option>
                    <option value="RECEPTIONIST">Receptionist (Admissions & OPD)</option>
                    <option value="LAB_TECH">Laboratory Staff (Diagnostic Assays)</option>
                    <option value="PHARMACIST">Pharmacist (Formulary & Dispensary)</option>
                    <option value="ACCOUNTANT">Accountant (Billing & Cashier)</option>
                    <option value="ADMIN">Administrator (System Supervisor)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Full Legal / Professional Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-primary-teal"
                  />
                </div>
              </div>

              {/* Department & Job Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Department & Unit *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-primary-teal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Official Job Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.jobTitle}
                    onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })}
                    className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-primary-teal"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Institutional Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-primary-teal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Phone Contact Number
                  </label>
                  <input
                    type="tel"
                    value={editForm.phoneNumber}
                    onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                    className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-primary-teal font-mono"
                  />
                </div>
              </div>

              {/* Duty Shift Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Assigned Duty Shift
                </label>
                <select
                  value={editForm.shift}
                  onChange={(e) => setEditForm({ ...editForm, shift: e.target.value })}
                  className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-primary-teal cursor-pointer"
                >
                  <option value="Day Clinical Shift (08:00 - 16:00)">Day Clinical Shift (08:00 - 16:00)</option>
                  <option value="Morning Shift (08:00 - 16:30)">Morning Shift (08:00 - 16:30)</option>
                  <option value="Day Nursing Shift (07:00 - 15:30)">Day Nursing Shift (07:00 - 15:30)</option>
                  <option value="Diagnostic Laboratory Shift (08:30 - 17:00)">Diagnostic Laboratory Shift (08:30 - 17:00)</option>
                  <option value="Dispensary Day Shift (08:00 - 16:30)">Dispensary Day Shift (08:00 - 16:30)</option>
                  <option value="Finance Shift (09:00 - 17:30)">Finance Shift (09:00 - 17:30)</option>
                  <option value="Evening Shift (14:00 - 22:00)">Evening Shift (14:00 - 22:00)</option>
                  <option value="Night Emergency Shift (22:00 - 06:00)">Night Emergency Shift (22:00 - 06:00)</option>
                </select>
              </div>

              {/* Doctor Specific Details */}
              {editForm.role === 'DOCTOR' && (
                <div className="p-4 rounded-xl bg-cyan-50/70 border border-cyan-200/80 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-900">
                    <span className="material-symbols-outlined text-[18px]">stethoscope</span>
                    <span>Doctor Clinical Profile Details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-cyan-800 mb-1">
                        Clinical Specialization
                      </label>
                      <input
                        type="text"
                        value={editForm.specialization}
                        onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                        placeholder="e.g. Interventional Cardiology, Critical Care"
                        className="w-full h-9 px-2.5 text-xs rounded-md border border-cyan-300 bg-white focus:outline-none focus:border-cyan-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-cyan-800 mb-1">
                        Consultation Fee (Rs.)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editForm.consultationFee}
                        onChange={(e) => setEditForm({ ...editForm, consultationFee: Number(e.target.value) })}
                        className="w-full h-9 px-2.5 text-xs rounded-md border border-cyan-300 bg-white focus:outline-none focus:border-cyan-600 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-cyan-800 mb-1">
                      Consultation Room / Location
                    </label>
                    <input
                      type="text"
                      value={editForm.roomNumber}
                      onChange={(e) => setEditForm({ ...editForm, roomNumber: e.target.value })}
                      placeholder="e.g. Consultation Suite 204"
                      className="w-full h-9 px-2.5 text-xs rounded-md border border-cyan-300 bg-white focus:outline-none focus:border-cyan-600"
                    />
                  </div>
                </div>
              )}

              {/* Password Reset Section (Superadmin) */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <span className="material-symbols-outlined text-[18px] text-amber-600">lock_reset</span>
                  <span>Reset Station Account Password (Optional)</span>
                </div>
                <input
                  type="password"
                  value={editForm.newPassword}
                  onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                  placeholder="Leave empty to keep existing password"
                  className="w-full h-9 px-3 text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:border-primary-teal font-mono"
                />
                <p className="text-[10px] text-slate-500">
                  Enter a new password (min. 6 chars) only if you wish to reset this employee's login credentials.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>{submittingEdit ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DELETE MODAL: Delete Staff Member Confirmation (Superadmin)            */}
      {/* ========================================================================= */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-rose-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[24px]">warning</span>
                <h2 className="text-base font-semibold tracking-tight">Revoke Staff Account & Access</h2>
              </div>
              <button
                onClick={() => setDeletingStaff(null)}
                className="text-rose-200 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {deleteError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-600 text-[18px]">error</span>
                  <span>{deleteError}</span>
                </div>
              )}

              <p className="text-sm text-slate-800">
                Are you sure you want to delete staff member{' '}
                <strong className="text-slate-900 font-bold">{deletingStaff.fullName}</strong> (
                <span className="font-mono text-primary-teal font-semibold">{deletingStaff.employeeId}</span>)?
              </p>

              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                <div className="font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  <span>This irreversible action will:</span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-rose-800 space-y-0.5 pl-1">
                  <li>Permanently remove their employee record from hospital systems.</li>
                  <li>Revoke station login credentials for <span className="font-mono font-bold">{deletingStaff.email}</span>.</li>
                  <li>Purge pending leave requests and duty shift entries.</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeletingStaff(null)}
                  disabled={deletingLoading}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteStaffSubmit}
                  disabled={deletingLoading}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                  <span>{deletingLoading ? 'Deleting...' : 'Confirm Delete & Revoke'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. READ MODAL: View Comprehensive Staff Profile Details                   */}
      {/* ========================================================================= */}
      {viewingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-primary-navy text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-700 text-white flex items-center justify-center font-bold text-sm ring-2 ring-cyan-400/30">
                  {viewingStaff.fullName.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                </div>
                <div>
                  <h2 className="text-base font-semibold tracking-tight">{viewingStaff.fullName}</h2>
                  <p className="text-[11px] text-cyan-300 flex items-center gap-1.5">
                    <span className="font-mono font-bold">{viewingStaff.employeeId}</span>
                    <span>•</span>
                    <span>{viewingStaff.jobTitle}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingStaff(null)}
                className="text-slate-300 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Profile Grid */}
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Operational Role</span>
                  <span className="text-sm font-bold text-slate-900 mt-0.5 inline-block">
                    {viewingStaff.role}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Duty Status</span>
                  <span className={`text-sm font-bold mt-0.5 inline-block ${
                    viewingStaff.attendanceStatus === 'Present' ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {viewingStaff.attendanceStatus}
                  </span>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Department & Unit:</span>
                  <span className="text-slate-900 font-semibold">{viewingStaff.department}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Official Title:</span>
                  <span className="text-slate-900 font-semibold">{viewingStaff.jobTitle}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Institutional Email:</span>
                  <span className="text-slate-900 font-mono">{viewingStaff.email}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Phone Contact:</span>
                  <span className="text-slate-900 font-mono">{viewingStaff.phoneNumber}</span>
                </div>

                {(viewingStaff as any).username && (
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Station Login User ID:</span>
                    <span className="text-primary-teal font-mono font-bold">{(viewingStaff as any).username}</span>
                  </div>
                )}

                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Assigned Duty Shift:</span>
                  <span className="text-slate-900 font-semibold">{viewingStaff.shift}</span>
                </div>

                {viewingStaff.roomNumber && (
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Location / Clinic Room:</span>
                    <span className="text-slate-900 font-semibold">{viewingStaff.roomNumber}</span>
                  </div>
                )}

                {viewingStaff.specialization && (
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Clinical Specialization:</span>
                    <span className="text-slate-900 font-semibold">{viewingStaff.specialization}</span>
                  </div>
                )}

                {viewingStaff.consultationFee && (
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Consultation Fee:</span>
                    <span className="text-slate-900 font-bold font-label-tabular">
                      Rs. {viewingStaff.consultationFee.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-medium">Service Joined Date:</span>
                  <span className="text-slate-900 font-mono">{viewingStaff.joiningDate}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setViewingStaff(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = viewingStaff;
                      setViewingStaff(null);
                      handleOpenEditModal(target);
                    }}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Request Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-primary-navy text-white flex items-center justify-between flex-shrink-0">
              <h2 className="text-base font-semibold">Submit Staff Leave Request</h2>
              <button onClick={() => setShowLeaveModal(false)} className="text-slate-300 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleLeaveSubmit} className="p-4 sm:p-6 space-y-3 overflow-y-auto max-h-[calc(90vh-65px)]">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Employee</label>
                {staff.length === 0 ? (
                  <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200">
                    No staff members registered in directory yet. Please enroll staff members before logging leave.
                  </p>
                ) : (
                  <select
                    value={leaveForm.employeeId}
                    onChange={(e) => setLeaveForm({ ...leaveForm, employeeId: e.target.value })}
                    className="w-full h-9 px-2 text-xs rounded border border-slate-300"
                  >
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.department})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Leave Type</label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                  className="w-full h-9 px-2 text-xs rounded border border-slate-300"
                >
                  <option value="Annual Leave">Annual Leave</option>
                  <option value="Medical / Sick Leave">Medical / Sick Leave</option>
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="CME Training Leave">CME Training Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    className="w-full h-9 px-2 text-xs rounded border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    className="w-full h-9 px-2 text-xs rounded border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Reason for Leave</label>
                <textarea
                  rows={2}
                  required
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full p-2 text-xs rounded border border-slate-300"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={staff.length === 0}
                  className={`px-4 py-1.5 text-xs font-semibold rounded ${
                    staff.length === 0
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-primary-teal text-white hover:bg-primary-teal-hover'
                  }`}
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
