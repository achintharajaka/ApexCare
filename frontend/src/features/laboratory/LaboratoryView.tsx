import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LaboratoryTest, LabParameter } from '../../types';
import { useAuth } from '../../context/AuthContext';

// Standard Diagnostic Test Profiles & Presets
const TEST_PRESETS = [
  {
    name: 'Full Blood Count (FBC/CBC)',
    category: 'Hematology',
    charge: 950,
    isStat: false,
    parameters: [
      { name: 'White Blood Cell Count (WBC)', value: '7.2', unit: '10^3/uL', referenceRange: '4.0 - 11.0', flag: 'NORMAL' as const },
      { name: 'Hemoglobin (Hb)', value: '14.2', unit: 'g/dL', referenceRange: '13.0 - 17.0', flag: 'NORMAL' as const },
      { name: 'Hematocrit (HCT)', value: '42.5', unit: '%', referenceRange: '40.0 - 52.0', flag: 'NORMAL' as const },
      { name: 'Platelet Count', value: '250', unit: '10^3/uL', referenceRange: '150 - 450', flag: 'NORMAL' as const },
    ],
  },
  {
    name: 'High Sensitivity Cardiac Troponin I (STAT)',
    category: 'Cardiac Markers',
    charge: 3200,
    isStat: true,
    parameters: [
      { name: 'Cardiac Troponin I (hs-cTnI)', value: '78.4', unit: 'ng/L', referenceRange: '< 14.0', flag: 'CRITICAL' as const },
      { name: 'Creatine Kinase-MB (CK-MB)', value: '6.8', unit: 'ng/mL', referenceRange: '< 5.0', flag: 'HIGH' as const },
    ],
  },
  {
    name: 'Comprehensive Metabolic Panel (CMP)',
    category: 'Clinical Biochemistry',
    charge: 1400,
    isStat: false,
    parameters: [
      { name: 'Fasting Blood Glucose', value: '108', unit: 'mg/dL', referenceRange: '70 - 99', flag: 'HIGH' as const },
      { name: 'Serum Creatinine', value: '0.9', unit: 'mg/dL', referenceRange: '0.6 - 1.2', flag: 'NORMAL' as const },
      { name: 'Blood Urea Nitrogen (BUN)', value: '16', unit: 'mg/dL', referenceRange: '7 - 20', flag: 'NORMAL' as const },
      { name: 'Serum Sodium (Na+)', value: '139', unit: 'mmol/L', referenceRange: '136 - 145', flag: 'NORMAL' as const },
      { name: 'Serum Potassium (K+)', value: '4.3', unit: 'mmol/L', referenceRange: '3.5 - 5.0', flag: 'NORMAL' as const },
    ],
  },
  {
    name: 'Lipid Profile Assay',
    category: 'Cardiovascular Risk',
    charge: 1100,
    isStat: false,
    parameters: [
      { name: 'Total Cholesterol', value: '190', unit: 'mg/dL', referenceRange: '< 200', flag: 'NORMAL' as const },
      { name: 'HDL Cholesterol', value: '48', unit: 'mg/dL', referenceRange: '> 40', flag: 'NORMAL' as const },
      { name: 'LDL Cholesterol', value: '115', unit: 'mg/dL', referenceRange: '< 100', flag: 'HIGH' as const },
      { name: 'Serum Triglycerides', value: '140', unit: 'mg/dL', referenceRange: '< 150', flag: 'NORMAL' as const },
    ],
  },
  {
    name: 'HbA1c Glycated Hemoglobin',
    category: 'Endocrinology',
    charge: 850,
    isStat: false,
    parameters: [
      { name: 'Glycated Hemoglobin (HbA1c)', value: '6.8', unit: '%', referenceRange: '4.0 - 5.6', flag: 'HIGH' as const },
      { name: 'Estimated Average Glucose (eAG)', value: '148', unit: 'mg/dL', referenceRange: '70 - 114', flag: 'HIGH' as const },
    ],
  },
  {
    name: 'Liver Function Panel (LFT)',
    category: 'Hepatic Biochemistry',
    charge: 1250,
    isStat: false,
    parameters: [
      { name: 'Alanine Aminotransferase (ALT)', value: '32', unit: 'U/L', referenceRange: '7 - 56', flag: 'NORMAL' as const },
      { name: 'Aspartate Aminotransferase (AST)', value: '28', unit: 'U/L', referenceRange: '10 - 40', flag: 'NORMAL' as const },
      { name: 'Total Bilirubin', value: '0.8', unit: 'mg/dL', referenceRange: '0.2 - 1.2', flag: 'NORMAL' as const },
      { name: 'Alkaline Phosphatase (ALP)', value: '85', unit: 'U/L', referenceRange: '44 - 147', flag: 'NORMAL' as const },
    ],
  },
  {
    name: 'Urinalysis with Microscopic Examination',
    category: 'Clinical Pathology',
    charge: 650,
    isStat: false,
    parameters: [
      { name: 'Urine pH', value: '6.0', unit: 'pH', referenceRange: '4.5 - 8.0', flag: 'NORMAL' as const },
      { name: 'Specific Gravity', value: '1.020', unit: '-', referenceRange: '1.005 - 1.030', flag: 'NORMAL' as const },
      { name: 'Protein', value: 'Negative', unit: '-', referenceRange: 'Negative', flag: 'NORMAL' as const },
      { name: 'Glucose', value: 'Negative', unit: '-', referenceRange: 'Negative', flag: 'NORMAL' as const },
      { name: 'Leukocyte Esterase', value: 'Negative', unit: '-', referenceRange: 'Negative', flag: 'NORMAL' as const },
    ],
  },
];

export const LaboratoryView: React.FC = () => {
  const { user, activeRole } = useAuth();
  const isSuperAdmin = activeRole === 'ADMIN';
  const canManageLab = isSuperAdmin || activeRole === 'LAB_TECH' || activeRole === 'DOCTOR';
  const canDeleteLab = isSuperAdmin || activeRole === 'LAB_TECH';

  const [tests, setTests] = useState<LaboratoryTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'All' | 'Requested' | 'Sample Collected' | 'In-Analysis' | 'Completed'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [statOnly, setStatOnly] = useState(false);

  // Patient directory cache for new requisition modal
  const [patientsList, setPatientsList] = useState<{ id: string; mrn: string; firstName: string; lastName: string }[]>([]);

  // CRUD Modals State
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [viewingTest, setViewingTest] = useState<LaboratoryTest | null>(null);
  const [editingTest, setEditingTest] = useState<LaboratoryTest | null>(null);
  const [deletingTest, setDeletingTest] = useState<LaboratoryTest | null>(null);
  const [recordingResultsTest, setRecordingResultsTest] = useState<LaboratoryTest | null>(null);

  // Form submission loading and feedback state
  const [submitting, setSubmitting] = useState(false);
  const [crudFeedback, setCrudFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Requisition Form State
  const [newOrderForm, setNewOrderForm] = useState({
    patientId: '',
    testName: 'Full Blood Count (FBC/CBC)',
    isStatUrgent: false,
    charge: 950,
    doctorName: 'Dr. Kasun Perera, MD',
  });

  // Edit Test Form State
  const [editForm, setEditForm] = useState({
    testName: '',
    isStatUrgent: false,
    charge: 0,
    sampleStatus: 'Requested' as LaboratoryTest['sampleStatus'],
    doctorName: '',
  });

  // Result Entry Form State
  const [resultParams, setResultParams] = useState<LabParameter[]>([
    { name: 'White Blood Cell Count (WBC)', value: '7.5', unit: '10^3/uL', referenceRange: '4.0 - 11.0', flag: 'NORMAL' },
    { name: 'Hemoglobin (Hb)', value: '14.0', unit: 'g/dL', referenceRange: '13.0 - 17.0', flag: 'NORMAL' },
    { name: 'Platelet Count', value: '240', unit: '10^3/uL', referenceRange: '150 - 450', flag: 'NORMAL' },
  ]);
  const [pathologistNotes, setPathologistNotes] = useState('Specimen evaluated according to clinical pathology guidelines. All analytical parameters verified.');
  const [verifiedBy, setVerifiedBy] = useState('David Thorne, MLS (Chief Laboratory Scientist)');

  // Auto-clear feedback
  useEffect(() => {
    if (crudFeedback) {
      const timer = setTimeout(() => setCrudFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [crudFeedback]);

  // Fetch laboratory orders
  const fetchLabs = async () => {
    try {
      const res = await axios.get('/api/laboratory', {
        params: {
          status: activeTab !== 'All' ? activeTab : undefined,
          statOnly: statOnly ? 'true' : undefined,
        },
      });
      setTests(res.data);
    } catch (e) {
      console.error('Error fetching laboratory tests:', e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch patients for order intake
  const fetchPatients = async () => {
    try {
      const res = await axios.get('/api/patients');
      setPatientsList(res.data);
      if (res.data.length > 0 && !newOrderForm.patientId) {
        setNewOrderForm((prev) => ({ ...prev, patientId: res.data[0].id }));
      }
    } catch (e) {
      console.error('Error fetching patient list:', e);
    }
  };

  useEffect(() => {
    fetchLabs();
    fetchPatients();

    // Constant background refresh interval (every 6 seconds)
    const interval = setInterval(() => {
      fetchLabs();
    }, 6000);

    // Instant update on realtime data change from backend
    const handleSync = (e: any) => {
      const detail = e.detail;
      if (!detail?.entity || detail.entity === 'laboratory' || detail.entity === 'emr') {
        fetchLabs();
      }
    };
    window.addEventListener('apexcare:sync', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('apexcare:sync', handleSync);
    };
  }, [activeTab, statOnly]);

  // Filter tests locally by search query
  const filteredTests = tests.filter((test) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      test.testName.toLowerCase().includes(q) ||
      test.patientName.toLowerCase().includes(q) ||
      test.patientMrn.toLowerCase().includes(q) ||
      test.id.toLowerCase().includes(q) ||
      test.doctorName.toLowerCase().includes(q)
    );
  });

  // Advance sample status
  const handleAdvanceStatus = async (id: string, currentStatus: string) => {
    const nextStatusMap: Record<string, string> = {
      Requested: 'Sample Collected',
      'Sample Collected': 'In-Analysis',
      'In-Analysis': 'Completed',
    };
    const nextStatus = nextStatusMap[currentStatus] || 'Completed';

    try {
      await axios.patch(`/api/laboratory/${id}/status`, { status: nextStatus });
      setCrudFeedback({
        type: 'success',
        message: `Order #${id} status successfully advanced to "${nextStatus}".`,
      });
      fetchLabs();
    } catch (e: any) {
      setCrudFeedback({
        type: 'error',
        message: e?.response?.data?.error || 'Failed to update sample stage.',
      });
    }
  };

  // Open Results Entry Modal with test-specific preset
  const handleOpenResultsEntry = (test: LaboratoryTest) => {
    setRecordingResultsTest(test);
    // Find matching preset or use existing results if present
    if (test.resultData?.parameters && test.resultData.parameters.length > 0) {
      setResultParams(test.resultData.parameters);
      setPathologistNotes(test.resultData.pathologistNotes || '');
      setVerifiedBy(test.resultData.verifiedBy || user?.fullName || 'David Thorne, MLS (Chief Laboratory Scientist)');
    } else {
      const matchedPreset = TEST_PRESETS.find((p) =>
        test.testName.toLowerCase().includes(p.name.toLowerCase().split('(')[0].trim())
      );
      if (matchedPreset) {
        setResultParams(matchedPreset.parameters);
      } else {
        setResultParams([
          { name: 'Quantitative Parameter 1', value: 'Normal', unit: 'Standard', referenceRange: 'Normal', flag: 'NORMAL' },
          { name: 'Quantitative Parameter 2', value: '12.4', unit: 'mg/dL', referenceRange: '10 - 20', flag: 'NORMAL' },
        ]);
      }
      setPathologistNotes('Specimen evaluated according to clinical pathology guidelines. All analytical parameters verified.');
      setVerifiedBy(user?.fullName || 'David Thorne, MLS (Chief Laboratory Scientist)');
    }
  };

  // Submit Results Entry
  const handleSaveResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordingResultsTest) return;

    setSubmitting(true);
    try {
      await axios.post(`/api/laboratory/${recordingResultsTest.id}/results`, {
        parameters: resultParams,
        pathologistNotes,
        verifiedBy,
      });
      setCrudFeedback({
        type: 'success',
        message: `Laboratory assay results verified and finalized for Order #${recordingResultsTest.id}.`,
      });
      setRecordingResultsTest(null);
      fetchLabs();
    } catch (e: any) {
      setCrudFeedback({
        type: 'error',
        message: e?.response?.data?.error || 'Error recording laboratory results.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (test: LaboratoryTest) => {
    setEditingTest(test);
    setEditForm({
      testName: test.testName,
      isStatUrgent: test.isStatUrgent,
      charge: test.charge,
      sampleStatus: test.sampleStatus,
      doctorName: test.doctorName,
    });
  };

  // Submit Edit Test
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTest) return;

    setSubmitting(true);
    try {
      const res = await axios.put(`/api/laboratory/${editingTest.id}`, editForm);
      setCrudFeedback({
        type: 'success',
        message: `Laboratory test #${editingTest.id} ("${res.data.testName}") updated successfully.`,
      });
      setEditingTest(null);
      fetchLabs();
    } catch (e: any) {
      setCrudFeedback({
        type: 'error',
        message: e?.response?.data?.error || 'Failed to update test order.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Submit New Order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderForm.patientId) {
      setCrudFeedback({ type: 'error', message: 'Please select a patient for this laboratory test.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post('/api/laboratory/orders', newOrderForm);
      setCrudFeedback({
        type: 'success',
        message: `New lab order #${res.data.id} ("${res.data.testName}") successfully queued for ${res.data.patientName}.`,
      });
      setShowNewOrderModal(false);
      // Reset form
      setNewOrderForm({
        patientId: patientsList[0]?.id || '',
        testName: 'Full Blood Count (FBC/CBC)',
        isStatUrgent: false,
        charge: 950,
        doctorName: user?.fullName || 'Dr. Kasun Perera, MD',
      });
      fetchLabs();
    } catch (e: any) {
      setCrudFeedback({
        type: 'error',
        message: e?.response?.data?.error || 'Failed to submit laboratory order.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Delete / Cancel Order
  const handleConfirmDelete = async () => {
    if (!deletingTest) return;

    setSubmitting(true);
    try {
      await axios.delete(`/api/laboratory/${deletingTest.id}`);
      setCrudFeedback({
        type: 'success',
        message: `Diagnostic test order #${deletingTest.id} ("${deletingTest.testName}") was cancelled and purged.`,
      });
      setDeletingTest(null);
      fetchLabs();
    } catch (e: any) {
      setCrudFeedback({
        type: 'error',
        message: e?.response?.data?.error || 'Failed to cancel lab order.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate Metrics
  const totalCount = tests.length;
  const statCount = tests.filter((t) => t.isStatUrgent).length;
  const inAnalysisCount = tests.filter((t) => t.sampleStatus === 'In-Analysis').length;
  const completedCount = tests.filter((t) => t.sampleStatus === 'Completed').length;

  return (
    <div className="flex flex-col w-full space-y-space-md">
      {/* Feedback Toast */}
      {crudFeedback && (
        <div
          className={`px-4 py-3 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-xs transition-all ${
            crudFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
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

      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-bg-surface p-space-md rounded-xl border border-border-subtle shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
              Diagnostic Laboratory Management
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-primary-teal border border-teal-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Analytical Stream
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            4-Stage Workflow: Test Requisition Intake • Specimen Barcoding • Assay Analytics • Digital Sign-off
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchLabs}
            disabled={loading}
            className="flex items-center gap-1.5 h-[34px] px-3 rounded-lg border border-border-subtle bg-bg-surface hover:bg-bg-surface-subtle text-slate-700 font-title-sm text-xs shadow-xs transition-colors"
            title="Refresh Laboratory Orders"
          >
            <span className={`material-symbols-outlined text-[16px] text-primary-teal ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {canManageLab && (
            <button
              onClick={() => {
                fetchPatients();
                setShowNewOrderModal(true);
              }}
              className="flex items-center gap-1.5 h-[34px] px-3.5 rounded-lg bg-primary-teal text-white hover:bg-primary-teal-hover font-title-sm text-xs shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Order Lab Test</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-bg-surface p-3.5 rounded-xl border border-border-subtle shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Requisitions</div>
            <div className="text-xl font-bold text-slate-800 font-label-tabular mt-0.5">{totalCount}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <span className="material-symbols-outlined text-[20px]">science</span>
          </div>
        </div>

        <div
          onClick={() => setStatOnly(!statOnly)}
          className={`bg-bg-surface p-3.5 rounded-xl border shadow-xs flex items-center justify-between cursor-pointer transition-all ${
            statOnly ? 'border-rose-400 bg-rose-50/40 ring-1 ring-rose-400' : 'border-border-subtle hover:border-slate-300'
          }`}
        >
          <div>
            <div className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider flex items-center gap-1">
              <span>STAT Urgent</span>
              {statOnly && <span className="text-[9px] bg-rose-600 text-white px-1 rounded font-bold">Active</span>}
            </div>
            <div className="text-xl font-bold text-rose-700 font-label-tabular mt-0.5">{statCount}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 animate-pulse">
            <span className="material-symbols-outlined text-[20px]">priority_high</span>
          </div>
        </div>

        <div className="bg-bg-surface p-3.5 rounded-xl border border-border-subtle shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">In-Analysis</div>
            <div className="text-xl font-bold text-amber-700 font-label-tabular mt-0.5">{inAnalysisCount}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
            <span className="material-symbols-outlined text-[20px]">biotech</span>
          </div>
        </div>

        <div className="bg-bg-surface p-3.5 rounded-xl border border-border-subtle shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Verified & Completed</div>
            <div className="text-xl font-bold text-emerald-700 font-label-tabular mt-0.5">{completedCount}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
            <span className="material-symbols-outlined text-[20px]">task_alt</span>
          </div>
        </div>
      </div>

      {/* Filter and Stage Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-bg-surface p-3 rounded-xl border border-border-subtle shadow-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search by test, patient name, MRN, ref ID or physician..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border-subtle bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-teal focus:border-primary-teal transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <span className="material-symbols-outlined text-[14px]">cancel</span>
            </button>
          )}
        </div>

        {/* Workflow Stage Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto flex-nowrap">
          {(['All', 'Requested', 'Sample Collected', 'In-Analysis', 'Completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-white text-primary-teal shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-bg-surface rounded-xl border border-border-subtle shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm min-w-[850px]">
            <thead>
              <tr className="bg-bg-surface-subtle text-caption font-caption text-slate-500 uppercase border-b border-border-subtle">
                <th className="py-2.5 px-4 font-semibold">Test Assay & Urgency</th>
                <th className="py-2.5 px-4 font-semibold">Patient Demographics</th>
                <th className="py-2.5 px-4 font-semibold">Ordering Physician</th>
                <th className="py-2.5 px-4 font-semibold">Order Date</th>
                <th className="py-2.5 px-4 font-semibold">Diagnostic Fee</th>
                <th className="py-2.5 px-4 font-semibold">Sample Stage</th>
                <th className="py-2.5 px-4 font-semibold text-right">Workflow & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-xs">
              {loading && tests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary-teal border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading analytical laboratory queue...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-[32px] text-slate-300">biotech</span>
                      <p className="font-medium text-slate-600">No laboratory test orders match current filters.</p>
                      <div className="flex gap-2 mt-1">
                        {canManageLab && (
                          <button
                            onClick={() => setShowNewOrderModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-teal text-white text-xs font-medium hover:bg-primary-teal-hover shadow-xs"
                          >
                            <span className="material-symbols-outlined text-[15px]">add</span>
                            Order New Lab Test
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setActiveTab('All');
                            setStatOnly(false);
                            fetchLabs();
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium"
                        >
                          <span className="material-symbols-outlined text-[15px]">refresh</span>
                          Reset Filters
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTests.map((test) => (
                  <tr key={test.id} className="hover:bg-slate-50 transition-colors">
                    {/* Test Assay & Urgency */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{test.testName}</span>
                        {test.isStatUrgent && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white uppercase tracking-wider animate-pulse flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[11px]">bolt</span>
                            STAT
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 font-label-tabular">Ref: #{test.id}</span>
                    </td>

                    {/* Patient Information */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{test.patientName}</div>
                      <span className="text-[11px] text-slate-500 font-label-tabular">{test.patientMrn}</span>
                    </td>

                    {/* Ordering Physician */}
                    <td className="py-3 px-4 text-slate-700">
                      <div className="font-medium text-slate-800">{test.doctorName}</div>
                      <span className="text-[10px] text-slate-400">Attending Clinician</span>
                    </td>

                    {/* Order Date */}
                    <td className="py-3 px-4 font-label-tabular text-slate-600">
                      {new Date(test.createdAt).toLocaleDateString()}{' '}
                      <span className="text-slate-400 text-[10px]">{new Date(test.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>

                    {/* Diagnostic Fee */}
                    <td className="py-3 px-4 font-label-tabular font-semibold text-slate-800">
                      ${test.charge.toFixed(2)}
                    </td>

                    {/* Sample Stage */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          test.sampleStatus === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : test.sampleStatus === 'In-Analysis'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : test.sampleStatus === 'Sample Collected'
                            ? 'bg-sky-100 text-sky-800 border border-sky-200'
                            : 'bg-purple-100 text-purple-800 border border-purple-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            test.sampleStatus === 'Completed'
                              ? 'bg-emerald-500'
                              : test.sampleStatus === 'In-Analysis'
                              ? 'bg-amber-500 animate-pulse'
                              : test.sampleStatus === 'Sample Collected'
                              ? 'bg-sky-500'
                              : 'bg-purple-500'
                          }`}
                        ></span>
                        {test.sampleStatus}
                      </span>
                    </td>

                    {/* Workflow & CRUD Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Primary Workflow Advance / View Button */}
                        {test.sampleStatus === 'Completed' ? (
                          <button
                            onClick={() => setViewingTest(test)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 shadow-2xs"
                            title="View Verified Diagnostic Report"
                          >
                            <span className="material-symbols-outlined text-[14px]">description</span>
                            <span>Report</span>
                          </button>
                        ) : test.sampleStatus === 'In-Analysis' ? (
                          <button
                            onClick={() => handleOpenResultsEntry(test)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-primary-teal text-white hover:bg-primary-teal-hover shadow-xs flex items-center gap-1"
                            title="Record Assay Parameters"
                          >
                            <span className="material-symbols-outlined text-[14px]">biotech</span>
                            <span>Enter Results</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAdvanceStatus(test.id, test.sampleStatus)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-300 hover:bg-slate-100 text-slate-700 flex items-center gap-1"
                            title={test.sampleStatus === 'Requested' ? 'Specimen Barcoding & Intake' : 'Begin Assay Analytics'}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {test.sampleStatus === 'Requested' ? 'qr_code_scanner' : 'play_arrow'}
                            </span>
                            <span>{test.sampleStatus === 'Requested' ? 'Intake' : 'Analyze'}</span>
                          </button>
                        )}

                        {/* View Dossier Icon */}
                        <button
                          onClick={() => setViewingTest(test)}
                          className="p-1 text-slate-500 hover:text-primary-teal hover:bg-slate-100 rounded transition-colors"
                          title="View Requisition Details"
                        >
                          <span className="material-symbols-outlined text-[17px]">visibility</span>
                        </button>

                        {/* Edit Test Icon */}
                        {canManageLab && (
                          <button
                            onClick={() => handleOpenEdit(test)}
                            className="p-1 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors"
                            title="Edit Requisition Details"
                          >
                            <span className="material-symbols-outlined text-[17px]">edit</span>
                          </button>
                        )}

                        {/* Delete / Cancel Icon */}
                        {canDeleteLab && (
                          <button
                            onClick={() => setDeletingTest(test)}
                            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Cancel / Delete Lab Order"
                          >
                            <span className="material-symbols-outlined text-[17px]">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* MODAL 1: ORDER NEW LAB TEST MODAL                     */}
      {/* ---------------------------------------------------- */}
      {showNewOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-primary-navy text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-teal-400">science</span>
                <div>
                  <h2 className="text-base font-semibold">Laboratory Test Requisition</h2>
                  <p className="text-xs text-slate-300">Submit an assay order for specimen collection and laboratory analysis</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewOrderModal(false)}
                className="text-slate-300 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleCreateOrder} className="p-5 space-y-4 overflow-y-auto max-h-[calc(92vh-70px)]">
              {/* Patient Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Target Patient <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newOrderForm.patientId}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, patientId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-primary-teal focus:border-primary-teal font-medium"
                  required
                >
                  <option value="">-- Select Patient --</option>
                  {patientsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.mrn})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">Requisition will automatically link to the patient medical record and billing ledger.</p>
              </div>

              {/* Quick Preset Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Standard Diagnostic Profiles (1-Click Fill)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {TEST_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() =>
                        setNewOrderForm({
                          ...newOrderForm,
                          testName: p.name,
                          charge: p.charge,
                          isStatUrgent: p.isStat,
                        })
                      }
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all ${
                        newOrderForm.testName === p.name
                          ? 'bg-teal-50 text-primary-teal border-teal-300 font-semibold shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {p.name.split('(')[0].trim()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Test Name & Charge */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Test Assay Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newOrderForm.testName}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, testName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-teal font-medium"
                    placeholder="e.g. Complete Blood Count (CBC)"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Diagnostic Fee ($) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newOrderForm.charge}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, charge: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-teal font-label-tabular font-bold"
                    required
                  />
                </div>
              </div>

              {/* Ordering Physician */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Ordering Attending Physician
                </label>
                <input
                  type="text"
                  value={newOrderForm.doctorName}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, doctorName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-teal font-medium"
                  placeholder="e.g. Dr. Kasun Perera, MD"
                />
              </div>

              {/* STAT Urgency Requisition Toggle */}
              <div
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  newOrderForm.isStatUrgent
                    ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
                onClick={() => setNewOrderForm({ ...newOrderForm, isStatUrgent: !newOrderForm.isStatUrgent })}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-[20px] ${newOrderForm.isStatUrgent ? 'text-rose-600' : 'text-slate-400'}`}>
                      bolt
                    </span>
                    <div>
                      <div className={`text-xs font-bold uppercase tracking-wider ${newOrderForm.isStatUrgent ? 'text-rose-700' : 'text-slate-700'}`}>
                        Flag as STAT Urgent Requisition
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Prioritizes sample at the front of laboratory analyzer queue with automated critical alert broadcasts.
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={newOrderForm.isStatUrgent}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, isStatUrgent: e.target.checked })}
                    className="h-4 w-4 text-rose-600 rounded focus:ring-rose-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewOrderModal(false)}
                  className="px-4 py-2 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-primary-teal text-white hover:bg-primary-teal-hover shadow-xs flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">send</span>
                      <span>Queue Laboratory Requisition</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 2: VIEW DIAGNOSTIC DOSSIER & VERIFIED REPORT   */}
      {/* ---------------------------------------------------- */}
      {viewingTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-primary-navy text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-teal-400">biotech</span>
                <div>
                  <h2 className="text-base font-semibold">{viewingTest.testName}</h2>
                  <p className="text-xs text-slate-300">
                    Requisition Ref: #{viewingTest.id} • Patient: {viewingTest.patientName} ({viewingTest.patientMrn})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingTest(null)}
                className="text-slate-300 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(92vh-70px)]">
              {/* Stepper Status Bar */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Analytical Specimen Lifecycle
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  {[
                    { key: 'Requested', label: '1. Requisition Intake', icon: 'description' },
                    { key: 'Sample Collected', label: '2. Specimen Collected', icon: 'vaccines' },
                    { key: 'In-Analysis', label: '3. Assay Analytics', icon: 'biotech' },
                    { key: 'Completed', label: '4. Signed & Released', icon: 'verified' },
                  ].map((step, idx) => {
                    const statusOrder = ['Requested', 'Sample Collected', 'In-Analysis', 'Completed'];
                    const currentIdx = statusOrder.indexOf(viewingTest.sampleStatus);
                    const isDone = currentIdx >= idx;
                    const isCurrent = viewingTest.sampleStatus === step.key;

                    return (
                      <div
                        key={step.key}
                        className={`p-2 rounded-lg border text-center transition-all ${
                          isCurrent
                            ? 'bg-teal-50 border-teal-400 text-primary-teal font-bold ring-1 ring-teal-400'
                            : isDone
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-medium'
                            : 'bg-white border-slate-200 text-slate-400'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px] block mx-auto mb-0.5">
                          {isDone && !isCurrent ? 'check_circle' : step.icon}
                        </span>
                        <div className="text-[10px] sm:text-[11px] leading-tight">{step.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Demographics & Clinical Order Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Patient Name</div>
                  <div className="font-bold text-slate-900 mt-0.5">{viewingTest.patientName}</div>
                  <div className="text-[11px] text-slate-500 font-label-tabular">{viewingTest.patientMrn}</div>
                </div>

                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Ordering Doctor</div>
                  <div className="font-bold text-slate-800 mt-0.5">{viewingTest.doctorName}</div>
                  <div className="text-[11px] text-slate-500">Attending Physician</div>
                </div>

                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Order Created</div>
                  <div className="font-semibold text-slate-800 mt-0.5 font-label-tabular">
                    {new Date(viewingTest.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-[11px] text-slate-500 font-label-tabular">
                    {new Date(viewingTest.createdAt).toLocaleTimeString()}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Diagnostic Fee</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5 font-label-tabular">
                    ${viewingTest.charge.toFixed(2)}
                  </div>
                  {viewingTest.isStatUrgent && (
                    <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-600 text-white uppercase">
                      STAT Critical
                    </span>
                  )}
                </div>
              </div>

              {/* Analytical Results Section */}
              {viewingTest.resultData && viewingTest.resultData.parameters?.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
                      Quantitative Analytical Assay Results
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Completed: {viewingTest.completedAt ? new Date(viewingTest.completedAt).toLocaleString() : 'Recent'}
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 font-semibold uppercase text-[10px] border-b border-slate-200">
                          <th className="py-2 px-3">Analyte / Parameter</th>
                          <th className="py-2 px-3">Measured Value</th>
                          <th className="py-2 px-3">Unit</th>
                          <th className="py-2 px-3">Reference Interval</th>
                          <th className="py-2 px-3 text-right">Clinical Flag</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viewingTest.resultData.parameters.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-semibold text-slate-800">{p.name}</td>
                            <td className="py-2 px-3 font-bold text-slate-900 font-label-tabular">{p.value}</td>
                            <td className="py-2 px-3 text-slate-600">{p.unit}</td>
                            <td className="py-2 px-3 text-slate-500 font-label-tabular">{p.referenceRange}</td>
                            <td className="py-2 px-3 text-right">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  p.flag === 'CRITICAL'
                                    ? 'bg-rose-600 text-white animate-pulse'
                                    : p.flag === 'HIGH'
                                    ? 'bg-rose-100 text-rose-800'
                                    : p.flag === 'LOW'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {p.flag}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pathologist Notes */}
                  {viewingTest.resultData.pathologistNotes && (
                    <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200 text-xs">
                      <div className="font-semibold text-amber-900 uppercase text-[10px] tracking-wider mb-0.5">
                        Pathologist Clinical Interpretative Note
                      </div>
                      <p className="text-slate-700 leading-relaxed">{viewingTest.resultData.pathologistNotes}</p>
                    </div>
                  )}

                  {/* Verification Sign-off */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <div>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase">Verified & Released By</div>
                      <div className="font-bold text-slate-800 mt-0.5">
                        {viewingTest.resultData.verifiedBy || 'David Thorne, MLS (Chief Laboratory Scientist)'}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Digitally Verified
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <span className="material-symbols-outlined text-[32px] text-slate-400 mb-2">biotech</span>
                  <p className="text-xs font-semibold text-slate-700">Analytical Assay Results Pending</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
                    Sample is currently in stage: <strong className="text-slate-700">{viewingTest.sampleStatus}</strong>. Results will be displayed once recorded by the laboratory technician.
                  </p>
                  {canManageLab && viewingTest.sampleStatus === 'In-Analysis' && (
                    <button
                      onClick={() => {
                        const target = viewingTest;
                        setViewingTest(null);
                        handleOpenResultsEntry(target);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-primary-teal text-white hover:bg-primary-teal-hover text-xs font-semibold shadow-xs"
                    >
                      Enter Assay Results Now
                    </button>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>Print Report</span>
                </button>

                <div className="flex items-center gap-2">
                  {canManageLab && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = viewingTest;
                        setViewingTest(null);
                        handleOpenEdit(target);
                      }}
                      className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">edit</span>
                      <span>Edit Order</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setViewingTest(null)}
                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-white hover:bg-slate-900"
                  >
                    Close Dossier
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 3: EDIT LABORATORY REQUISITION MODAL            */}
      {/* ---------------------------------------------------- */}
      {editingTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-primary-navy text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-teal-400">edit</span>
                <div>
                  <h2 className="text-base font-semibold">Edit Diagnostic Requisition</h2>
                  <p className="text-xs text-slate-300">Update assay name, urgency, charge, or status for #{editingTest.id}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingTest(null)}
                className="text-slate-300 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 overflow-y-auto max-h-[calc(92vh-70px)]">
              {/* Patient Banner */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Patient</div>
                  <div className="font-bold text-slate-900">{editingTest.patientName}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">MRN</div>
                  <div className="font-label-tabular font-medium text-slate-700">{editingTest.patientMrn}</div>
                </div>
              </div>

              {/* Test Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Test Assay Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.testName}
                  onChange={(e) => setEditForm({ ...editForm, testName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-teal font-medium"
                  required
                />
              </div>

              {/* Stage & Charge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Sample Stage Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editForm.sampleStatus}
                    onChange={(e) => setEditForm({ ...editForm, sampleStatus: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-teal font-medium"
                  >
                    <option value="Requested">Requested</option>
                    <option value="Sample Collected">Sample Collected</option>
                    <option value="In-Analysis">In-Analysis</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Diagnostic Charge ($) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.charge}
                    onChange={(e) => setEditForm({ ...editForm, charge: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-teal font-label-tabular font-bold"
                    required
                  />
                </div>
              </div>

              {/* Attending Doctor */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Ordering Attending Physician
                </label>
                <input
                  type="text"
                  value={editForm.doctorName}
                  onChange={(e) => setEditForm({ ...editForm, doctorName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-teal font-medium"
                />
              </div>

              {/* STAT Urgency Toggle */}
              <div
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  editForm.isStatUrgent ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'
                }`}
                onClick={() => setEditForm({ ...editForm, isStatUrgent: !editForm.isStatUrgent })}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-[18px] ${editForm.isStatUrgent ? 'text-rose-600' : 'text-slate-400'}`}>
                      bolt
                    </span>
                    <span className={`text-xs font-bold uppercase ${editForm.isStatUrgent ? 'text-rose-700' : 'text-slate-700'}`}>
                      STAT Urgent Requisition Priority
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editForm.isStatUrgent}
                    onChange={(e) => setEditForm({ ...editForm, isStatUrgent: e.target.checked })}
                    className="h-4 w-4 text-rose-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTest(null)}
                  className="px-4 py-2 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-primary-teal text-white hover:bg-primary-teal-hover shadow-xs flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      <span>Update Requisition</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 4: DELETE / CANCEL REQUISITION CONFIRMATION     */}
      {/* ---------------------------------------------------- */}
      {deletingTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">warning</span>
                <h2 className="text-base font-semibold">Cancel Laboratory Order</h2>
              </div>
              <button
                onClick={() => setDeletingTest(null)}
                className="text-rose-100 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-rose-50 p-3.5 rounded-lg border border-rose-200 text-xs">
                <p className="font-semibold text-rose-900 mb-1">
                  Are you sure you want to cancel and remove this diagnostic test requisition?
                </p>
                <p className="text-rose-700">
                  This action will purge the order from the laboratory analyzer queue and remove any unbilled diagnostic charges.
                </p>
              </div>

              {/* Order Info Card */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Test Assay:</span>
                  <span className="font-bold text-slate-800">{deletingTest.testName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient:</span>
                  <span className="font-semibold text-slate-800">{deletingTest.patientName} ({deletingTest.patientMrn})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Order Ref:</span>
                  <span className="font-label-tabular text-slate-700">#{deletingTest.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Stage:</span>
                  <span className="font-medium text-slate-700">{deletingTest.sampleStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Diagnostic Fee:</span>
                  <span className="font-bold font-label-tabular text-slate-900">${deletingTest.charge.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeletingTest(null)}
                  className="px-4 py-2 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow-xs flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      <span>Confirm Cancel & Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 5: ENTER ASSAY RESULTS & DIGITAL SIGN-OFF      */}
      {/* ---------------------------------------------------- */}
      {recordingResultsTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 bg-primary-navy text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-teal-400">biotech</span>
                <div>
                  <h2 className="text-base font-semibold">Laboratory Assay Results & Verification</h2>
                  <p className="text-xs text-slate-300">
                    {recordingResultsTest.testName} • {recordingResultsTest.patientName} ({recordingResultsTest.patientMrn})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRecordingResultsTest(null)}
                className="text-slate-300 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveResults} className="p-5 space-y-4 overflow-y-auto max-h-[calc(92vh-70px)]">
              {/* Parameter Rows Header */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Assay Parameters & Quantitative Values
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setResultParams([
                      ...resultParams,
                      { name: 'New Parameter', value: '0', unit: 'mg/dL', referenceRange: '0 - 100', flag: 'NORMAL' },
                    ])
                  }
                  className="px-2.5 py-1 text-[11px] font-semibold text-primary-teal hover:bg-teal-50 rounded border border-teal-200 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  <span>Add Parameter</span>
                </button>
              </div>

              {/* Parameter Rows */}
              <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase px-1">
                  <div className="col-span-4">Analyte / Name</div>
                  <div className="col-span-2">Value</div>
                  <div className="col-span-2">Unit</div>
                  <div className="col-span-2">Reference</div>
                  <div className="col-span-2 text-right">Flag / Remove</div>
                </div>

                {resultParams.map((p, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded border border-slate-200 text-xs">
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => {
                        const copy = [...resultParams];
                        copy[idx].name = e.target.value;
                        setResultParams(copy);
                      }}
                      className="col-span-4 h-8 px-2 rounded border border-slate-300 font-medium text-xs focus:ring-1 focus:ring-primary-teal focus:outline-none"
                      placeholder="Analyte Name"
                      required
                    />
                    <input
                      type="text"
                      value={p.value}
                      onChange={(e) => {
                        const copy = [...resultParams];
                        copy[idx].value = e.target.value;
                        setResultParams(copy);
                      }}
                      className="col-span-2 h-8 px-2 rounded border border-slate-300 font-label-tabular font-bold text-xs focus:ring-1 focus:ring-primary-teal focus:outline-none"
                      placeholder="Value"
                      required
                    />
                    <input
                      type="text"
                      value={p.unit}
                      onChange={(e) => {
                        const copy = [...resultParams];
                        copy[idx].unit = e.target.value;
                        setResultParams(copy);
                      }}
                      className="col-span-2 h-8 px-2 rounded border border-slate-300 text-slate-600 text-xs focus:ring-1 focus:ring-primary-teal focus:outline-none"
                      placeholder="Unit"
                    />
                    <input
                      type="text"
                      value={p.referenceRange}
                      onChange={(e) => {
                        const copy = [...resultParams];
                        copy[idx].referenceRange = e.target.value;
                        setResultParams(copy);
                      }}
                      className="col-span-2 h-8 px-2 rounded border border-slate-300 text-slate-500 text-xs font-label-tabular focus:ring-1 focus:ring-primary-teal focus:outline-none"
                      placeholder="Ref Range"
                    />
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <select
                        value={p.flag}
                        onChange={(e) => {
                          const copy = [...resultParams];
                          copy[idx].flag = e.target.value as any;
                          setResultParams(copy);
                        }}
                        className={`h-8 px-1.5 rounded border text-[10px] font-bold ${
                          p.flag === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : p.flag === 'HIGH'
                            ? 'bg-red-50 text-red-700 border-red-300'
                            : p.flag === 'LOW'
                            ? 'bg-blue-50 text-blue-700 border-blue-300'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        }`}
                      >
                        <option value="NORMAL">NORM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="LOW">LOW</option>
                        <option value="CRITICAL">CRIT</option>
                      </select>
                      {resultParams.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const copy = resultParams.filter((_, i) => i !== idx);
                            setResultParams(copy);
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pathologist Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Pathologist Clinical Interpretative Note
                </label>
                <textarea
                  rows={2}
                  value={pathologistNotes}
                  onChange={(e) => setPathologistNotes(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-teal"
                  placeholder="Enter clinical observations, specimen conditions, or clinical recommendations..."
                ></textarea>
              </div>

              {/* Sign-off Identity */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Digital Verification Sign-off (MLS / Pathologist)
                </label>
                <input
                  type="text"
                  value={verifiedBy}
                  onChange={(e) => setVerifiedBy(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-teal font-medium"
                  required
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRecordingResultsTest(null)}
                  className="px-4 py-2 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-primary-teal text-white hover:bg-primary-teal-hover shadow-xs flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      <span>Sign & Finalize Laboratory Report</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
