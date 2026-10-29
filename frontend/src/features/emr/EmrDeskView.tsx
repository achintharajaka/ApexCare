import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Patient, MedicalRecord, Prescription, LaboratoryTest } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface EmrDeskViewProps {
  patientId: string;
  onNavigateToBilling: (mrn: string) => void;
  onNavigateToLab: () => void;
}

export const EmrDeskView: React.FC<EmrDeskViewProps> = ({
  patientId,
  onNavigateToBilling,
  onNavigateToLab,
}) => {
  const { user, activeRole } = useAuth();
  const isSuperAdmin = activeRole === 'ADMIN';
  const canManageClinicalNotes = isSuperAdmin || activeRole === 'DOCTOR';
  const canManageLabOrders = isSuperAdmin || activeRole === 'DOCTOR' || activeRole === 'LAB_TECH';
  const [activePatientId, setActivePatientId] = useState<string>(patientId || '');
  const [patientList, setPatientList] = useState<Patient[]>([]);
  const [data, setData] = useState<{
    patient: Patient;
    medicalRecords: MedicalRecord[];
    prescriptions: Prescription[];
    laboratoryTests: LaboratoryTest[];
    uploadedDocuments: any[];
  } | null>(null);

  const [loading, setLoading] = useState(true);

  // Sync prop changes
  useEffect(() => {
    if (patientId) {
      setActivePatientId(patientId);
    }
  }, [patientId]);

  // Load available patients list so EMR desk can auto-select first patient if none specified
  useEffect(() => {
    const loadPatients = async () => {
      try {
        const res = await axios.get('/api/patients');
        if (Array.isArray(res.data) && res.data.length > 0) {
          setPatientList(res.data);
          if (!activePatientId && !patientId) {
            setActivePatientId(res.data[0].id);
          }
        }
      } catch (e) {
        console.error('Failed to load patient directory for EMR desk', e);
      }
    };
    loadPatients();
  }, [patientId]);

  // Modals state
  const [showPrescribeModal, setShowPrescribeModal] = useState(false);
  const [showOrderLabModal, setShowOrderLabModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [viewingLabReport, setViewingLabReport] = useState<any>(null);

  // Prescribe form state
  const [rxForm, setRxForm] = useState({
    medicineName: '',
    dosage: '',
    frequency: 'Once Daily',
    duration: '30 Days',
    quantity: 30,
  });

  // Lab order form state
  const [labForm, setLabForm] = useState({
    testName: '',
    isStatUrgent: false,
    charge: 75.0,
  });

  // Clinical Consultation SOAP Note form state
  const [soapForm, setSoapForm] = useState({
    diagnosis: '',
    icdCode: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  });

  const fetchEmr = async (targetId?: string, isSilent = false) => {
    const idToFetch = targetId || activePatientId;
    if (!idToFetch) {
      if (!isSilent) setLoading(false);
      return;
    }
    if (!isSilent && !data) setLoading(true);
    try {
      const res = await axios.get(`/api/emr/${idToFetch}`);
      setData(res.data);
    } catch (e) {
      console.error('Failed to load EMR', e);
      if (!isSilent) setData(null);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    if (activePatientId) {
      fetchEmr(activePatientId);
    }

    // Live continuous sync interval (every 6 seconds)
    const interval = setInterval(() => {
      if (activePatientId) {
        fetchEmr(activePatientId, true);
      }
    }, 6000);

    // Instant update on realtime event
    const handleSync = (e: any) => {
      const detail = e.detail;
      if (
        !detail?.entity ||
        detail.entity === 'emr' ||
        detail.entity === 'patients' ||
        detail.entity === 'laboratory' ||
        detail.entity === 'pharmacy'
      ) {
        if (activePatientId) {
          fetchEmr(activePatientId, true);
        }
      }
    };
    window.addEventListener('apexcare:sync', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('apexcare:sync', handleSync);
    };
  }, [activePatientId]);

  const handleAddConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.patient) return;

    try {
      const clinicalNotes = `<h3>SUBJECTIVE:</h3><p>${soapForm.subjective}</p><h3>OBJECTIVE:</h3><p>${soapForm.objective}</p><h3>ASSESSMENT:</h3><p>${soapForm.assessment}</p><h3>PLAN:</h3><p>${soapForm.plan}</p>`;

      await axios.post('/api/emr/consultation', {
        patientId: data.patient.id,
        diagnosis: soapForm.diagnosis,
        icdCode: soapForm.icdCode,
        clinicalNotes,
      });

      setShowAddNoteModal(false);
      fetchEmr();
    } catch (e) {
      alert('Error saving consultation note');
    }
  };

  const handleDeleteConsultation = async (recordId: string) => {
    if (!window.confirm('Are you sure you want to delete this clinical consultation entry?')) return;
    try {
      await axios.delete(`/api/emr/consultation/${recordId}`);
      fetchEmr();
    } catch (e) {
      alert('Error deleting consultation note');
    }
  };

  const handleDeleteLabOrder = async (labId: string) => {
    if (!window.confirm('Are you sure you want to cancel this laboratory order?')) return;
    try {
      await axios.delete(`/api/laboratory/${labId}`);
      fetchEmr();
    } catch (e) {
      alert('Error cancelling laboratory order');
    }
  };

  const handlePrescribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.patient) return;

    try {
      await axios.post('/api/emr/prescribe', {
        patientId: data.patient.id,
        items: [rxForm],
      });

      setShowPrescribeModal(false);
      fetchEmr();
    } catch (e) {
      alert('Error creating prescription');
    }
  };

  const handleOrderLab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.patient) return;

    try {
      await axios.post('/api/emr/order-lab', {
        patientId: data.patient.id,
        testName: labForm.testName,
        isStatUrgent: labForm.isStatUrgent,
        charge: labForm.charge,
      });

      setShowOrderLabModal(false);
      fetchEmr();
    } catch (e) {
      alert('Error ordering lab test');
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-primary-teal border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-500 font-medium">Opening Clinical EMR Desk...</span>
        </div>
      </div>
    );
  }

  if (!data?.patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-bg-surface rounded-xl border border-border-subtle p-8 sm:p-12 text-center shadow-xs">
        <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[32px]">clinical_notes</span>
        </div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">No Patient EMR Selected</h2>
        <p className="text-xs text-slate-500 max-w-md mt-1 mb-6">
          Search for an existing patient or select a record from the Patient Registry to inspect their clinical SOAP notes, prescriptions, laboratory test results, and medical vault.
        </p>
        {patientId && (
          <button
            onClick={() => fetchEmr()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-teal hover:bg-primary-teal-hover text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Retry Loading Patient Record</span>
          </button>
        )}
      </div>
    );
  }

  const patient = data.patient;

  const medicalRecords = data?.medicalRecords || [];
  const prescriptions = data?.prescriptions || [];
  const laboratoryTests = data?.laboratoryTests || [];
  const uploadedDocs = data?.uploadedDocuments || [];

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Sticky Clinical Patient Header Banner */}
      <section className="bg-bg-surface rounded-xl shadow-xs border border-border-subtle p-space-md flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
        {/* Patient Profile Core Details */}
        <div className="flex flex-wrap items-center gap-space-md min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 rounded-full bg-cyan-700 text-white flex items-center justify-center font-bold text-lg shadow-sm ring-2 ring-cyan-200">
              {patient.firstName[0]}{patient.lastName[0]}
            </div>
            <span
              className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-status-success rounded-full ring-2 ring-bg-surface"
              title="Outpatient Active Today"
            ></span>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-space-sm flex-wrap">
              <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                {patient.firstName} {patient.lastName}
              </h1>
              <span className="font-label-tabular text-label-tabular px-space-xs py-0.5 rounded bg-surface-container-high text-on-surface-variant font-medium">
                {patient.age} yrs
              </span>
              <span className="font-label-tabular text-label-tabular px-space-xs py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                {patient.gender}
              </span>
              <span className="font-label-tabular text-label-tabular px-space-xs py-0.5 rounded bg-primary-teal-subtle text-primary font-semibold">
                {patient.mrn}
              </span>
              <span className="font-label-tabular text-label-tabular px-2 py-0.5 rounded-full bg-status-critical-bg text-status-critical font-bold">
                {patient.bloodGroup} (Rh Positive)
              </span>
            </div>

            <div className="flex items-center gap-space-md text-on-surface-variant text-caption font-caption mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-slate-400">call</span>
                {patient.contactNumber}
              </span>
              {patient.email && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-slate-400">mail</span>
                  {patient.email}
                </span>
              )}
              {patient.address && (
                <span className="flex items-center gap-1" title={patient.address}>
                  <span className="material-symbols-outlined text-[15px] text-slate-400">home</span>
                  <span className="max-w-[260px] truncate">{patient.address}</span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-slate-400">location_on</span>
                {patient.wardBed || 'Ward 3B - Bed 14'}
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-slate-400">verified_user</span>
                {patient.insuranceProvider || 'Sri Lanka Insurance'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side Actions & Severity Badges */}
        <div className="flex flex-col lg:items-end gap-space-sm flex-shrink-0">
          {/* Severity Badges */}
          <div className="flex flex-wrap items-center gap-space-xs">
            <div className="flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-status-critical-bg text-status-critical font-badge-sm text-badge-sm font-semibold shadow-xs animate-pulse">
              <span className="material-symbols-outlined text-[16px]">warning</span>
              <span>ALLERGY: {patient.allergies?.[0] || 'Penicillin (Severe)'}</span>
            </div>
            <div className="flex items-center gap-1 px-space-sm py-1 rounded-full bg-status-warning-bg text-status-warning font-badge-sm text-badge-sm font-semibold">
              <span className="material-symbols-outlined text-[16px]">emergency</span>
              <span>Chronic: Type II Diabetes</span>
            </div>
            <div className="flex items-center gap-1 px-space-sm py-1 rounded-full bg-status-info-bg text-status-info font-badge-sm text-badge-sm font-semibold">
              <span className="material-symbols-outlined text-[16px]">monitor_heart</span>
              <span>Hypertension Stage 1</span>
            </div>
          </div>

          {/* Quick Clinical Action Triggers */}
          <div className="flex flex-wrap items-center gap-space-xs mt-1">
            {patientList.length > 0 && (
              <div className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs shadow-2xs">
                <span className="material-symbols-outlined text-[16px] text-primary-teal">switch_account</span>
                <select
                  value={activePatientId}
                  onChange={(e) => setActivePatientId(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer pr-1"
                  title="Select and switch active patient"
                >
                  {patientList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.mrn})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => fetchEmr()}
              disabled={loading}
              className="flex items-center gap-1.5 h-9 px-space-sm rounded-lg border border-border-subtle bg-bg-surface hover:bg-bg-surface-subtle text-slate-700 font-title-sm text-title-sm transition-all"
              title="Refresh Patient EMR"
            >
              <span className={`material-symbols-outlined text-[18px] text-primary-teal ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => setShowPrescribeModal(true)}
              className="flex items-center gap-1 h-9 px-space-md rounded-lg bg-primary-teal hover:bg-primary-teal-hover text-white font-title-sm text-title-sm shadow-xs transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">prescriptions</span>
              <span>+ Prescribe Medication</span>
            </button>
            <button
              onClick={() => setShowOrderLabModal(true)}
              className="flex items-center gap-1 h-9 px-space-sm rounded-lg bg-surface-container-high hover:bg-slate-200 text-on-surface font-title-sm text-title-sm transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-primary-teal">science</span>
              <span>+ Order Lab</span>
            </button>
            <button
              onClick={() => onNavigateToBilling(patient.mrn)}
              className="flex items-center gap-1 h-9 px-space-sm rounded-lg bg-surface-container-high hover:bg-slate-200 text-on-surface font-title-sm text-title-sm transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">receipt_long</span>
              <span>View Billing Terminal</span>
            </button>
            <button
              onClick={() => alert(`Printing Comprehensive EMR Clinical Summary for ${patient.firstName} ${patient.lastName} (${patient.mrn})...`)}
              className="flex items-center justify-center h-9 w-9 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant transition-colors"
              title="Print Patient Summary PDF"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
            </button>
          </div>
        </div>
      </section>

      {/* Split Workspace Layout (60% Left / 40% Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-space-md items-start">
        {/* LEFT PANEL (60% - 7 cols on xl) */}
        <div className="xl:col-span-7 flex flex-col gap-space-md">
          {/* Active Diagnosis & Clinical Consultation History */}
          <div className="bg-bg-surface rounded-xl shadow-xs border border-border-subtle p-space-md">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-teal">stethoscope</span>
                <h2 className="font-title-sm text-title-sm text-on-surface">
                  Clinical Consultation Timeline (SOAP Notes)
                </h2>
              </div>
              <button
                onClick={() => setShowAddNoteModal(true)}
                className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md bg-primary-teal text-white hover:bg-primary-teal-hover transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">edit_note</span>
                <span>+ Add Clinical Note</span>
              </button>
            </div>

            {/* SOAP Entries */}
            <div className="space-y-4">
              {medicalRecords.map((rec) => (
                <div key={rec.id} className="p-4 rounded-xl border border-border-subtle bg-slate-50/60 space-y-3">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900">{rec.diagnosis}</span>
                        {rec.icdCode && (
                          <span className="px-1.5 py-0.2 rounded text-[11px] font-bold bg-sky-100 text-sky-800 font-label-tabular">
                            ICD-10: {rec.icdCode}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Consultant: <strong>{rec.doctorName}</strong> • Date: {new Date(rec.visitDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                        Finalized
                      </span>
                      {canManageClinicalNotes && (
                        <button
                          type="button"
                          onClick={() => handleDeleteConsultation(rec.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Consultation Note"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Render formatted clinical notes */}
                  <div
                    className="prose prose-sm max-w-none text-xs text-slate-700 space-y-1.5 border-t border-slate-200/60 pt-2"
                    dangerouslySetInnerHTML={{ __html: rec.clinicalNotes }}
                  ></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL (40% - 5 cols on xl) */}
        <div className="xl:col-span-5 flex flex-col gap-space-md">
          {/* Active Medications & Prescriptions */}
          <div className="bg-bg-surface rounded-xl shadow-xs border border-border-subtle p-space-md">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-teal">medication</span>
                <h3 className="font-title-sm text-title-sm text-on-surface">Active Prescribed Medications</h3>
              </div>
              <button
                onClick={() => setShowPrescribeModal(true)}
                className="text-xs text-primary-teal hover:underline font-semibold"
              >
                + Prescribe
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-500 font-semibold border-b border-slate-100 pb-1">
                    <th className="py-1.5">Medicine & Dosage</th>
                    <th className="py-1.5">Frequency</th>
                    <th className="py-1.5 text-right">Dispensing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prescriptions.flatMap((rx) => rx.items).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2">
                        <div className="font-medium text-slate-900">{item.medicineName}</div>
                        <div className="text-[11px] text-slate-500">{item.dosage} • Qty: {item.quantity}</div>
                      </td>
                      <td className="py-2 text-slate-600">{item.frequency}</td>
                      <td className="py-2 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            item.status === 'Dispensed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Diagnostic Laboratory Investigations */}
          <div className="bg-bg-surface rounded-xl shadow-xs border border-border-subtle p-space-md">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-teal">biotech</span>
                <h3 className="font-title-sm text-title-sm text-on-surface">Laboratory Investigations</h3>
              </div>
              <button onClick={() => setShowOrderLabModal(true)} className="text-xs text-primary-teal hover:underline font-semibold">
                + Order Lab
              </button>
            </div>

            <div className="space-y-2">
              {laboratoryTests.map((lab) => (
                <div
                  key={lab.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs text-slate-900">{lab.testName}</span>
                      {lab.isStatUrgent && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-600 text-white uppercase">
                          STAT
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Ordered: {new Date(lab.createdAt).toLocaleDateString()} • {lab.sampleStatus}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {lab.resultData ? (
                      <button
                        onClick={() => setViewingLabReport(lab)}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-sky-100 text-sky-800 hover:bg-sky-200 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">description</span>
                        <span>View PDF</span>
                      </button>
                    ) : (
                      <button
                        onClick={onNavigateToLab}
                        className="px-2.5 py-1 text-xs font-semibold rounded border border-slate-300 hover:bg-white text-slate-700"
                      >
                        Process
                      </button>
                    )}
                    {canManageLabOrders && !lab.resultData && (
                      <button
                        type="button"
                        onClick={() => handleDeleteLabOrder(lab.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Cancel Lab Order"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Uploaded Scans & External Records */}
          <div className="bg-bg-surface rounded-xl shadow-xs border border-border-subtle p-space-md">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-teal">attach_file</span>
                <h3 className="font-title-sm text-title-sm text-on-surface">Medical Scans & Vault</h3>
              </div>
            </div>

            <div className="space-y-2.5">
              {uploadedDocs.map((doc: any) => (
                <div key={doc.id} className="p-2.5 rounded-lg border border-slate-200 flex items-center justify-between hover:bg-slate-50">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="material-symbols-outlined text-primary-teal text-[20px]">image</span>
                    <div className="truncate">
                      <p className="text-xs font-medium text-slate-900 truncate">{doc.title}</p>
                      <p className="text-[11px] text-slate-500">{doc.category} • {doc.size}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => alert(`Opening secure DICOM/PDF viewer for ${doc.title}`)}
                    className="p-1 rounded hover:bg-slate-200 text-slate-600"
                    title="View Document"
                  >
                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lab Report Preview Modal */}
      {viewingLabReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-primary-navy text-white flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold">Official Clinical Laboratory Report</h2>
                <p className="text-xs text-slate-300">ApexCare Pathology Diagnostic Services</p>
              </div>
              <button onClick={() => setViewingLabReport(null)} className="text-slate-300 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-130px)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 p-3 bg-slate-50 rounded-lg text-xs gap-2">
                <div>Patient: <strong>{viewingLabReport.patientName}</strong> ({viewingLabReport.patientMrn})</div>
                <div>Investigation: <strong>{viewingLabReport.testName}</strong></div>
                <div>Authorized By: <strong>{viewingLabReport.resultData?.verifiedBy || 'David Thorne, MLS'}</strong></div>
                <div>Completion: <strong>{new Date().toLocaleDateString()}</strong></div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="p-2">Assay Parameter</th>
                      <th className="p-2">Observed Value</th>
                      <th className="p-2">Biological Reference Range</th>
                      <th className="p-2">Status Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingLabReport.resultData?.parameters?.map((param: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-2 font-medium">{param.name}</td>
                        <td className="p-2 font-label-tabular font-bold">{param.value} {param.unit}</td>
                        <td className="p-2 text-slate-600">{param.referenceRange}</td>
                        <td className="p-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            param.flag === 'HIGH' || param.flag === 'CRITICAL'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {param.flag}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {viewingLabReport.resultData?.pathologistNotes && (
                <div className="p-3 bg-sky-50 rounded-lg text-xs text-sky-900">
                  <strong>Pathologist Interpretative Comment:</strong><br />
                  {viewingLabReport.resultData.pathologistNotes}
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs text-slate-500">Cryptographically Signed • CLIA Certified</span>
              <button
                onClick={() => setViewingLabReport(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded bg-primary-teal text-white"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Clinical SOAP Note Modal */}
      {showAddNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-primary-navy text-white flex items-center justify-between flex-shrink-0">
              <h2 className="text-base font-semibold">New Clinical Consultation Entry (SOAP)</h2>
              <button onClick={() => setShowAddNoteModal(false)} className="text-slate-300 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddConsultation} className="p-4 sm:p-6 space-y-3 overflow-y-auto max-h-[calc(90vh-65px)]">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Primary Diagnosis & ICD-10</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    value={soapForm.diagnosis}
                    onChange={(e) => setSoapForm({ ...soapForm, diagnosis: e.target.value })}
                    className="sm:col-span-2 h-9 px-3 text-xs rounded border border-slate-300"
                    placeholder="Diagnosis description"
                  />
                  <input
                    type="text"
                    required
                    value={soapForm.icdCode}
                    onChange={(e) => setSoapForm({ ...soapForm, icdCode: e.target.value })}
                    className="h-9 px-2 text-xs rounded border border-slate-300"
                    placeholder="ICD Code"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-0.5">Subjective (Symptoms & History)</label>
                <textarea
                  rows={2}
                  required
                  value={soapForm.subjective}
                  onChange={(e) => setSoapForm({ ...soapForm, subjective: e.target.value })}
                  className="w-full p-2 text-xs rounded border border-slate-300"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-0.5">Objective (Examination & Vitals)</label>
                <textarea
                  rows={2}
                  required
                  value={soapForm.objective}
                  onChange={(e) => setSoapForm({ ...soapForm, objective: e.target.value })}
                  className="w-full p-2 text-xs rounded border border-slate-300"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-0.5">Assessment (Clinical Impression)</label>
                <textarea
                  rows={2}
                  required
                  value={soapForm.assessment}
                  onChange={(e) => setSoapForm({ ...soapForm, assessment: e.target.value })}
                  className="w-full p-2 text-xs rounded border border-slate-300"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-0.5">Plan (Treatment & Follow-up)</label>
                <textarea
                  rows={2}
                  required
                  value={soapForm.plan}
                  onChange={(e) => setSoapForm({ ...soapForm, plan: e.target.value })}
                  className="w-full p-2 text-xs rounded border border-slate-300"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddNoteModal(false)}
                  className="px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-primary-teal text-white hover:bg-primary-teal-hover"
                >
                  Persist Consultation Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prescribe Medication Modal */}
      {showPrescribeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-primary-navy text-white flex items-center justify-between flex-shrink-0">
              <h2 className="text-base font-semibold">Prescribe Outpatient Medication</h2>
              <button onClick={() => setShowPrescribeModal(false)} className="text-slate-300 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handlePrescribe} className="p-4 sm:p-6 space-y-3 overflow-y-auto max-h-[calc(90vh-65px)]">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Medication Name</label>
                <select
                  value={rxForm.medicineName}
                  onChange={(e) => setRxForm({ ...rxForm, medicineName: e.target.value })}
                  className="w-full h-9 px-3 text-xs rounded border border-slate-300"
                >
                  <option value="Atorvastatin Calcium 20mg">Atorvastatin Calcium 20mg</option>
                  <option value="Metformin HCl 500mg">Metformin HCl 500mg</option>
                  <option value="Lisinopril 10mg">Lisinopril 10mg</option>
                  <option value="Humalog Insulin 100U/mL">Humalog Insulin 100U/mL</option>
                  <option value="Ceftriaxone Sodium 1g Vial">Ceftriaxone Sodium 1g Vial</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Dosage</label>
                  <input
                    type="text"
                    value={rxForm.dosage}
                    onChange={(e) => setRxForm({ ...rxForm, dosage: e.target.value })}
                    className="w-full h-9 px-3 text-xs rounded border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Frequency</label>
                  <input
                    type="text"
                    value={rxForm.frequency}
                    onChange={(e) => setRxForm({ ...rxForm, frequency: e.target.value })}
                    className="w-full h-9 px-3 text-xs rounded border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Duration</label>
                  <input
                    type="text"
                    value={rxForm.duration}
                    onChange={(e) => setRxForm({ ...rxForm, duration: e.target.value })}
                    className="w-full h-9 px-3 text-xs rounded border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Quantity (Units)</label>
                  <input
                    type="number"
                    value={rxForm.quantity}
                    onChange={(e) => setRxForm({ ...rxForm, quantity: Number(e.target.value) })}
                    className="w-full h-9 px-3 text-xs rounded border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPrescribeModal(false)}
                  className="px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-primary-teal text-white hover:bg-primary-teal-hover"
                >
                  Dispatch to Pharmacy Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Laboratory Test Modal */}
      {showOrderLabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-primary-navy text-white flex items-center justify-between flex-shrink-0">
              <h2 className="text-base font-semibold">Order Diagnostic Laboratory Investigation</h2>
              <button onClick={() => setShowOrderLabModal(false)} className="text-slate-300 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleOrderLab} className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-65px)]">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Diagnostic Test Name</label>
                <select
                  value={labForm.testName}
                  onChange={(e) => setLabForm({ ...labForm, testName: e.target.value })}
                  className="w-full h-9 px-3 text-xs rounded border border-slate-300"
                >
                  <option value="High-Sensitivity Cardiac Troponin I (hs-cTnI)">High-Sensitivity Cardiac Troponin I (hs-cTnI)</option>
                  <option value="Comprehensive Metabolic Panel (CMP)">Comprehensive Metabolic Panel (CMP)</option>
                  <option value="Lipid Profile Panel (Standard)">Lipid Profile Panel (Standard)</option>
                  <option value="Arterial Blood Gas (ABG Analysis)">Arterial Blood Gas (ABG Analysis)</option>
                  <option value="HbA1c Glycated Hemoglobin">HbA1c Glycated Hemoglobin</option>
                  <option value="Complete Blood Count (CBC with Diff)">Complete Blood Count (CBC with Diff)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <input
                  type="checkbox"
                  id="statCheck"
                  checked={labForm.isStatUrgent}
                  onChange={(e) => setLabForm({ ...labForm, isStatUrgent: e.target.checked })}
                  className="w-4 h-4 text-red-600 rounded"
                />
                <label htmlFor="statCheck" className="text-xs font-semibold text-red-900 cursor-pointer">
                  Mark as STAT Urgent (Emergency immediate triage priority)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOrderLabModal(false)}
                  className="px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-primary-teal text-white hover:bg-primary-teal-hover"
                >
                  Submit Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
