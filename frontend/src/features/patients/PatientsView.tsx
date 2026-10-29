import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Patient } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface PatientsViewProps {
  onOpenEmr: (patientId: string) => void;
  onOpenBooking: (patientId: string) => void;
  onOpenBilling: (mrn: string) => void;
  initialSearchQuery?: string;
}

export const PatientsView: React.FC<PatientsViewProps> = ({
  onOpenEmr,
  onOpenBooking,
  onOpenBilling,
  initialSearchQuery = '',
}) => {
  const { user, activeRole } = useAuth();
  const isSuperAdmin = activeRole === 'ADMIN';
  const canRegisterPatient = ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'].includes(activeRole);
  const canEditPatient = ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'].includes(activeRole);
  const canDeletePatient = ['ADMIN', 'RECEPTIONIST'].includes(activeRole);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearchQuery);
  const [bloodGroup, setBloodGroup] = useState('All');
  const [gender, setGender] = useState('All');
  const [doctor, setDoctor] = useState('All');
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // CRUD Modals State
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [submittingDelete, setSubmittingDelete] = useState(false);
  const [crudFeedback, setCrudFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New patient registration form state
  const [newPatient, setNewPatient] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '1985-06-20',
    gender: 'Female',
    bloodGroup: 'O+',
    contactNumber: '+94 77 ',
    email: '',
    address: '',
    wardBed: 'Outpatient Clinic Area',
    insuranceProvider: 'Standard Self-Pay',
    allergies: '',
    chronicConditions: '',
    assignedDoctor: 'Dr. Kasun Perera, MD',
  });

  // Edit patient form state
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'Female',
    bloodGroup: 'O+',
    contactNumber: '',
    email: '',
    address: '',
    wardBed: '',
    insuranceProvider: '',
    allergies: '',
    chronicConditions: '',
    status: 'Registered - Active',
    assignedDoctor: 'Dr. Kasun Perera, MD',
  });

  const fetchPatients = async () => {
    try {
      const res = await axios.get('/api/patients', {
        params: { search, bloodGroup, gender, doctor },
      });
      setPatients(res.data);
    } catch (e) {
      console.error('Failed to fetch patients', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();

    // Constant background refresh interval (every 6 seconds)
    const interval = setInterval(() => {
      fetchPatients();
    }, 6000);

    // Instant update on realtime data changes from backend
    const handleSync = (e: any) => {
      const detail = e.detail;
      if (!detail?.entity || detail.entity === 'patients' || detail.entity === 'emr') {
        fetchPatients();
      }
    };
    window.addEventListener('apexcare:sync', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('apexcare:sync', handleSync);
    };
  }, [search, bloodGroup, gender, doctor]);

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...newPatient,
        allergies: newPatient.allergies ? [newPatient.allergies] : [],
        chronicConditions: newPatient.chronicConditions ? [newPatient.chronicConditions] : [],
      };
      await axios.post('/api/patients', payload);
      setShowRegisterModal(false);
      setNewPatient({
        firstName: '',
        lastName: '',
        dateOfBirth: '1985-06-20',
        gender: 'Female',
        bloodGroup: 'O+',
        contactNumber: '+94 77 ',
        email: '',
        address: '',
        wardBed: 'Outpatient Clinic Area',
        insuranceProvider: 'Standard Self-Pay',
        allergies: '',
        chronicConditions: '',
        assignedDoctor: 'Dr. Kasun Perera, MD',
      });
      setCrudFeedback({ type: 'success', message: 'Patient registered successfully.' });
      setTimeout(() => setCrudFeedback(null), 4000);
      fetchPatients();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Error registering patient');
    }
  };

  const handleOpenEdit = (p: Patient) => {
    setEditingPatient(p);
    setEditForm({
      firstName: p.firstName,
      lastName: p.lastName,
      dateOfBirth: p.dateOfBirth,
      gender: p.gender,
      bloodGroup: p.bloodGroup,
      contactNumber: p.contactNumber,
      email: p.email || '',
      address: p.address || '',
      wardBed: p.wardBed || 'Outpatient Clinic Area',
      insuranceProvider: p.insuranceProvider || 'Standard Self-Pay',
      allergies: Array.isArray(p.allergies) ? p.allergies.join(', ') : (p.allergies || ''),
      chronicConditions: Array.isArray(p.chronicConditions) ? p.chronicConditions.join(', ') : (p.chronicConditions || ''),
      status: p.status || 'Registered - Active',
      assignedDoctor: p.assignedDoctor || 'Dr. Kasun Perera, MD',
    });
  };

  const handleEditPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;
    setSubmittingEdit(true);
    try {
      const payload = {
        ...editForm,
        allergies: editForm.allergies ? editForm.allergies.split(',').map((s) => s.trim()).filter(Boolean) : [],
        chronicConditions: editForm.chronicConditions ? editForm.chronicConditions.split(',').map((s) => s.trim()).filter(Boolean) : [],
      };
      await axios.put(`/api/patients/${editingPatient.id}`, payload);
      setEditingPatient(null);
      setCrudFeedback({ type: 'success', message: `Patient "${editForm.firstName} ${editForm.lastName}" details updated.` });
      setTimeout(() => setCrudFeedback(null), 4000);
      fetchPatients();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to update patient details');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeletePatientSubmit = async () => {
    if (!deletingPatient) return;
    setSubmittingDelete(true);
    try {
      await axios.delete(`/api/patients/${deletingPatient.id}`);
      setCrudFeedback({ type: 'success', message: `Patient "${deletingPatient.firstName} ${deletingPatient.lastName}" (${deletingPatient.mrn}) was removed from clinical registry.` });
      setTimeout(() => setCrudFeedback(null), 4000);
      setDeletingPatient(null);
      fetchPatients();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to delete patient record');
    } finally {
      setSubmittingDelete(false);
    }
  };

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

      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-bg-surface p-space-md rounded-xl border border-border-subtle shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
              Patient Directory & Registry
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
              {patients.length} Active
            </span>
            {isSuperAdmin && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                Super Admin CRUD Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Full clinical patient lifecycle: demographics, medical record vault, EMR consultation, and billing
          </p>
        </div>

        {/* Action Buttons: Refresh & Register */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetchPatients();
            }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border-subtle bg-bg-surface hover:bg-slate-50 text-slate-700 font-title-sm text-title-sm shadow-xs transition-all active:scale-95"
            title="Refresh Patient Directory & Registry Data"
          >
            <span className={`material-symbols-outlined text-[18px] text-primary-teal ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span className="hidden sm:inline">Sync Patients</span>
          </button>

          {canRegisterPatient && (
            <button
              type="button"
              onClick={() => setShowRegisterModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary-teal hover:bg-primary-teal-hover text-white font-title-sm text-title-sm shadow-sm transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>+ Register Patient</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-bg-surface p-space-md rounded-xl border border-border-subtle shadow-xs">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient MRN, name, phone..."
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-bg-surface-subtle border border-border-strong text-xs sm:text-sm text-on-surface focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal transition-all"
          />
        </div>

        <div>
          <select
            value={bloodGroup}
            onChange={(e) => setBloodGroup(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-bg-surface-subtle border border-border-strong text-xs sm:text-sm text-on-surface focus:outline-none focus:border-primary-teal transition-all"
          >
            <option value="All">All Blood Groups</option>
            <option value="O+">O+ (Universal Donor)</option>
            <option value="O-">O-</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
          </select>
        </div>

        <div>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-bg-surface-subtle border border-border-strong text-xs sm:text-sm text-on-surface focus:outline-none focus:border-primary-teal transition-all"
          >
            <option value="All">All Genders</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <select
            value={doctor}
            onChange={(e) => setDoctor(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-bg-surface-subtle border border-border-strong text-xs sm:text-sm text-on-surface focus:outline-none focus:border-primary-teal transition-all"
          >
            <option value="All">All Attending Doctors</option>
            <option value="Kasun Perera">Dr. Kasun Perera, MD</option>
            <option value="Dilani Wickramasinghe">Dr. Dilani Wickramasinghe</option>
            <option value="Arthur Vance">Dr. Arthur Vance</option>
          </select>
        </div>
      </div>

      {/* Main Patients Table */}
      <div className="bg-bg-surface rounded-xl border border-border-subtle shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-surface-subtle text-outline font-title-sm">
                <th className="py-3 px-4">MRN</th>
                <th className="py-3 px-4">Patient Profile</th>
                <th className="py-3 px-4">Age / Sex</th>
                <th className="py-3 px-4">Contact & Ward</th>
                <th className="py-3 px-4">Blood Group</th>
                <th className="py-3 px-4">Attending Doctor</th>
                <th className="py-3 px-4">Admission Status</th>
                <th className="py-3 px-4 text-right">Actions & Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading && patients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-primary-teal border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-slate-500 font-medium">Loading Patient Registry...</span>
                    </div>
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                        <span className="material-symbols-outlined text-[28px]">personal_injury</span>
                      </div>
                      <p className="text-slate-800 font-semibold text-sm">No Patients Found in Registry</p>
                      <p className="text-xs text-slate-500 mt-1 mb-4">
                        No patient records matched the specified search criteria.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearch('');
                          setBloodGroup('All');
                          setGender('All');
                          setDoctor('All');
                          setLoading(true);
                          fetchPatients();
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-primary-teal text-white text-xs font-semibold hover:bg-primary-teal-hover transition-colors flex items-center gap-1 shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[16px]">refresh</span>
                        <span>Reload All Patients</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-label-tabular font-semibold text-primary-teal">
                      {p.mrn}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setViewingPatient(p)}
                        className="font-semibold text-slate-900 hover:text-primary-teal text-left flex items-center gap-1.5 transition-colors"
                        title="Click to view full patient dossier"
                      >
                        <span>{p.firstName} {p.lastName}</span>
                        {p.allergies?.length > 0 && (
                          <span
                            className="w-2 h-2 rounded-full bg-rose-500"
                            title={`Allergies: ${p.allergies.join(', ')}`}
                          ></span>
                        )}
                      </button>
                      {p.email && <div className="text-xs text-slate-400 font-normal">{p.email}</div>}
                    </td>
                    <td className="py-3 px-4 font-label-tabular text-slate-700">
                      {p.age}y / {p.gender}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div className="font-medium">{p.contactNumber}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[200px]" title={p.wardBed}>
                        {p.wardBed || 'Outpatient'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-label-tabular font-medium text-slate-800">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-xs font-semibold">
                        {p.bloodGroup}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{p.assignedDoctor || 'Kasun Perera'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          p.status?.toLowerCase().includes('icu')
                            ? 'bg-rose-100 text-rose-800 font-bold'
                            : p.status?.toLowerCase().includes('admit')
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {/* Quick View */}
                        <button
                          type="button"
                          onClick={() => setViewingPatient(p)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                          title="View Complete Patient Profile"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                        </button>

                        {/* Edit Patient */}
                        {canEditPatient && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 transition-colors"
                            title="Edit Patient Demographics"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                        )}

                        {/* Delete Patient (Super Admin / Receptionist) */}
                        {canDeletePatient && (
                          <button
                            type="button"
                            onClick={() => setDeletingPatient(p)}
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                            title="Delete Patient Record"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        )}

                        {/* Clinical Actions */}
                        <button
                          onClick={() => onOpenEmr(p.id)}
                          className="px-2 py-1 text-xs font-semibold rounded bg-primary-teal text-white hover:bg-primary-teal-hover transition-colors shadow-2xs"
                          title="Open Clinical EMR Desk"
                        >
                          EMR
                        </button>
                        <button
                          onClick={() => onOpenBooking(p.id)}
                          className="px-2 py-1 text-xs font-medium rounded border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors"
                          title="Book Appointment"
                        >
                          Book
                        </button>
                        <button
                          onClick={() => onOpenBilling(p.mrn)}
                          className="px-2 py-1 text-xs font-medium rounded border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors"
                          title="Open Billing Terminal"
                        >
                          Bill
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

      {/* VIEW PATIENT DETAILS MODAL */}
      {viewingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-700 text-white flex items-center justify-center font-bold text-base ring-2 ring-cyan-200">
                  {viewingPatient.firstName[0]}{viewingPatient.lastName[0]}
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight">
                    {viewingPatient.firstName} {viewingPatient.lastName}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="font-mono text-cyan-300 font-bold">{viewingPatient.mrn}</span>
                    <span>•</span>
                    <span>{viewingPatient.age} yrs ({viewingPatient.gender})</span>
                    <span>•</span>
                    <span className="font-semibold text-amber-300">{viewingPatient.bloodGroup}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewingPatient(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs sm:text-sm">
              {/* Demographics & Care Team Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <span className="block text-[11px] uppercase font-bold text-slate-400">Date of Birth</span>
                  <span className="font-semibold text-slate-900">{viewingPatient.dateOfBirth} ({viewingPatient.age} years)</span>
                </div>
                <div>
                  <span className="block text-[11px] uppercase font-bold text-slate-400">Admission / Clinical Status</span>
                  <span className="font-semibold text-slate-900">{viewingPatient.status}</span>
                </div>
                <div>
                  <span className="block text-[11px] uppercase font-bold text-slate-400">Assigned Room / Bed</span>
                  <span className="font-semibold text-slate-900">{viewingPatient.wardBed || 'Outpatient Clinic Area'}</span>
                </div>
                <div>
                  <span className="block text-[11px] uppercase font-bold text-slate-400">Attending Physician</span>
                  <span className="font-semibold text-slate-900">{viewingPatient.assignedDoctor || 'Dr. Kasun Perera, MD'}</span>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider text-slate-500">Contact & Insurance</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-lg border border-slate-200">
                  <div>
                    <span className="block text-slate-500 text-xs">Primary Phone:</span>
                    <span className="font-semibold font-mono text-slate-900">{viewingPatient.contactNumber}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-xs">Email Address:</span>
                    <span className="font-semibold text-slate-900">{viewingPatient.email || 'N/A'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="block text-slate-500 text-xs">Home Address:</span>
                    <span className="font-medium text-slate-800">{viewingPatient.address || 'Colombo, Sri Lanka'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="block text-slate-500 text-xs">Insurance Provider & Policy:</span>
                    <span className="font-semibold text-slate-900">{viewingPatient.insuranceProvider || 'Standard Self-Pay'}</span>
                  </div>
                </div>
              </div>

              {/* Allergies & Conditions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-lg bg-rose-50/70 border border-rose-200">
                  <span className="block text-[11px] uppercase font-bold text-rose-800 mb-1">Drug Allergies</span>
                  {viewingPatient.allergies?.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {viewingPatient.allergies.map((a, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-semibold text-xs">
                          {a}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-500 italic text-xs">No known drug allergies reported.</span>
                  )}
                </div>

                <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200">
                  <span className="block text-[11px] uppercase font-bold text-amber-800 mb-1">Chronic Conditions</span>
                  {viewingPatient.chronicConditions?.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {viewingPatient.chronicConditions.map((c, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-xs">
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-500 italic text-xs">No chronic conditions recorded.</span>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewingPatient(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 text-xs"
                >
                  Close Dossier
                </button>
                <div className="flex items-center gap-2">
                  {canEditPatient && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = viewingPatient;
                        setViewingPatient(null);
                        handleOpenEdit(target);
                      }}
                      className="px-3.5 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 font-semibold hover:bg-amber-100 text-xs flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      <span>Edit Patient</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const id = viewingPatient.id;
                      setViewingPatient(null);
                      onOpenEmr(id);
                    }}
                    className="px-4 py-2 rounded-lg bg-primary-teal text-white font-semibold hover:bg-primary-teal-hover text-xs shadow-xs flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">clinical_notes</span>
                    <span>Open EMR Desk</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PATIENT MODAL */}
      {editingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-amber-600 text-white flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-base font-bold">Edit Patient Details</h2>
                <p className="text-xs text-amber-100">
                  MRN: <span className="font-mono font-bold text-white">{editingPatient.mrn}</span>
                </p>
              </div>
              <button onClick={() => setEditingPatient(null)} className="text-amber-100 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleEditPatientSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-65px)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full h-9 px-3 text-sm rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full h-9 px-3 text-sm rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={editForm.dateOfBirth}
                    onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                    className="w-full h-9 px-2 text-sm rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Gender</label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                    className="w-full h-9 px-2 text-sm rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Blood Group</label>
                  <select
                    value={editForm.bloodGroup}
                    onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                    className="w-full h-9 px-2 text-sm rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Contact Number *</label>
                  <input
                    type="text"
                    required
                    value={editForm.contactNumber}
                    onChange={(e) => setEditForm({ ...editForm, contactNumber: e.target.value })}
                    className="w-full h-9 px-3 text-sm rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Assigned Doctor</label>
                  <select
                    value={editForm.assignedDoctor}
                    onChange={(e) => setEditForm({ ...editForm, assignedDoctor: e.target.value })}
                    className="w-full h-9 px-2 text-sm rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  >
                    <option value="Dr. Kasun Perera, MD">Dr. Kasun Perera, MD (Consultant Physician)</option>
                    <option value="Dr. Dilani Wickramasinghe">Dr. Dilani Wickramasinghe (Consultant Pathologist)</option>
                    <option value="Namal Kumara">Namal Kumara (Chief Administrator)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full h-9 px-3 text-sm rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Ward / Bed / Clinic</label>
                  <input
                    type="text"
                    value={editForm.wardBed}
                    onChange={(e) => setEditForm({ ...editForm, wardBed: e.target.value })}
                    className="w-full h-9 px-3 text-sm rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Clinical Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full h-9 px-2 text-sm rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  >
                    <option value="Registered - Active">Registered - Active</option>
                    <option value="Admitted - Inpatient">Admitted - Inpatient</option>
                    <option value="Critical - ICU Care">Critical - ICU Care</option>
                    <option value="Emergency Observation">Emergency Observation</option>
                    <option value="Outpatient Active">Outpatient Active</option>
                    <option value="Discharged">Discharged</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Insurance Provider</label>
                  <input
                    type="text"
                    value={editForm.insuranceProvider}
                    onChange={(e) => setEditForm({ ...editForm, insuranceProvider: e.target.value })}
                    className="w-full h-9 px-3 text-sm rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full h-9 px-3 text-sm rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Drug Allergies (comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Penicillin, Aspirin"
                    value={editForm.allergies}
                    onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })}
                    className="w-full h-9 px-3 text-sm rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Chronic Conditions (comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Hypertension, Diabetes"
                    value={editForm.chronicConditions}
                    onChange={(e) => setEditForm({ ...editForm, chronicConditions: e.target.value })}
                    className="w-full h-9 px-3 text-sm rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPatient(null)}
                  className="px-4 py-2 text-sm rounded border border-slate-300 hover:bg-slate-50 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-5 py-2 text-sm rounded bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  {submittingEdit && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE PATIENT MODAL */}
      {deletingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">warning</span>
                <h2 className="text-base font-bold">Delete Patient Record</h2>
              </div>
              <button onClick={() => setDeletingPatient(null)} className="text-rose-100 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700">
                Are you sure you want to permanently delete patient{' '}
                <strong className="text-slate-900">{deletingPatient.firstName} {deletingPatient.lastName}</strong>{' '}
                (<span className="font-mono text-primary-teal font-semibold">{deletingPatient.mrn}</span>)?
              </p>
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                ⚠️ This action will remove this patient from the central demographic index. Note that audit trail records will preserve clinical compliance evidence.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeletingPatient(null)}
                  className="px-4 py-2 text-sm rounded border border-slate-300 hover:bg-slate-50 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeletePatientSubmit}
                  disabled={submittingDelete}
                  className="px-5 py-2 text-sm rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  {submittingDelete && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-primary-navy text-white flex items-center justify-between flex-shrink-0">
              <h2 className="text-base sm:text-lg font-semibold">Register New Hospital Patient</h2>
              <button onClick={() => setShowRegisterModal(false)} className="text-slate-300 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleRegisterPatient} className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-65px)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={newPatient.firstName}
                    onChange={(e) => setNewPatient({ ...newPatient, firstName: e.target.value })}
                    className="w-full h-9 px-3 text-sm rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={newPatient.lastName}
                    onChange={(e) => setNewPatient({ ...newPatient, lastName: e.target.value })}
                    className="w-full h-9 px-3 text-sm rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={newPatient.dateOfBirth}
                    onChange={(e) => setNewPatient({ ...newPatient, dateOfBirth: e.target.value })}
                    className="w-full h-9 px-3 text-sm rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Gender</label>
                  <select
                    value={newPatient.gender}
                    onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                    className="w-full h-9 px-2 text-sm rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Blood Group</label>
                  <select
                    value={newPatient.bloodGroup}
                    onChange={(e) => setNewPatient({ ...newPatient, bloodGroup: e.target.value })}
                    className="w-full h-9 px-2 text-sm rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={newPatient.contactNumber}
                    onChange={(e) => setNewPatient({ ...newPatient, contactNumber: e.target.value })}
                    className="w-full h-9 px-3 text-sm rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Assigned Physician</label>
                  <select
                    value={newPatient.assignedDoctor}
                    onChange={(e) => setNewPatient({ ...newPatient, assignedDoctor: e.target.value })}
                    className="w-full h-9 px-2 text-sm rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  >
                    <option value="Dr. Kasun Perera, MD">Dr. Kasun Perera, MD (Consultant Physician)</option>
                    <option value="Dr. Dilani Wickramasinghe">Dr. Dilani Wickramasinghe (Consultant Pathologist)</option>
                    <option value="Namal Kumara">Namal Kumara (Chief Administrator)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. example1@mail.com"
                    value={newPatient.email}
                    onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                    className="w-full h-9 px-3 text-sm rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Residential Address</label>
                  <input
                    type="text"
                    placeholder="e.g. No. 45/2, Temple Road, Colombo 03"
                    value={newPatient.address}
                    onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                    className="w-full h-9 px-3 text-sm rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Drug Allergies</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Sulfa"
                  value={newPatient.allergies}
                  onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })}
                  className="w-full h-9 px-3 text-sm rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 text-sm rounded border border-slate-300 hover:bg-slate-50 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm rounded bg-primary-teal text-white font-semibold hover:bg-primary-teal-hover transition-colors shadow-xs"
                >
                  Complete Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
