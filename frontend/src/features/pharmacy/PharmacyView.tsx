import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PharmacyItem, Prescription } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const PharmacyView: React.FC = () => {
  const { user, activeRole } = useAuth();
  const isSuperAdmin = activeRole === 'ADMIN';
  const canManagePharmacy = isSuperAdmin || activeRole === 'PHARMACIST';

  const [catalog, setCatalog] = useState<PharmacyItem[]>([]);
  const [dispensingQueue, setDispensingQueue] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'dispensing'>('inventory');
  const [search, setSearch] = useState('');
  const [showIntakeModal, setShowIntakeModal] = useState(false);

  // CRUD Modals State
  const [viewingMed, setViewingMed] = useState<PharmacyItem | null>(null);
  const [editingMed, setEditingMed] = useState<PharmacyItem | null>(null);
  const [deletingMed, setDeletingMed] = useState<PharmacyItem | null>(null);
  const [deletingRx, setDeletingRx] = useState<Prescription | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [submittingDelete, setSubmittingDelete] = useState(false);
  const [crudFeedback, setCrudFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New stock intake form state
  const [intakeForm, setIntakeForm] = useState({
    medicineName: '',
    genericName: '',
    category: 'Antibiotics',
    stockQuantity: 100,
    reorderLevel: 50,
    unitPrice: 20.0,
    expiryDate: '2027-06-30',
    batchNumber: 'BAT-2026-901',
  });

  // Edit medicine form state
  const [editMedForm, setEditMedForm] = useState({
    medicineName: '',
    genericName: '',
    category: '',
    stockQuantity: 0,
    reorderLevel: 0,
    unitPrice: 0,
    expiryDate: '',
    batchNumber: '',
  });

  const fetchData = async () => {
    try {
      const [catRes, queueRes] = await Promise.all([
        axios.get('/api/pharmacy/catalog', { params: { search } }),
        axios.get('/api/pharmacy/dispensing-queue'),
      ]);
      setCatalog(catRes.data);
      setDispensingQueue(queueRes.data);
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
      if (!detail?.entity || detail.entity === 'pharmacy' || detail.entity === 'emr') {
        fetchData();
      }
    };
    window.addEventListener('apexcare:sync', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('apexcare:sync', handleSync);
    };
  }, [search]);

  const handleDispense = async (prescriptionId: string, itemId?: string) => {
    try {
      await axios.post('/api/pharmacy/dispense', { prescriptionId, itemId });
      setCrudFeedback({ type: 'success', message: 'Medication dispensed and inventory stock updated.' });
      setTimeout(() => setCrudFeedback(null), 4000);
      fetchData();
    } catch (e) {
      alert('Error dispensing medication');
    }
  };

  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/pharmacy/intake', intakeForm);
      setShowIntakeModal(false);
      setIntakeForm({
        medicineName: '',
        genericName: '',
        category: 'Antibiotics',
        stockQuantity: 100,
        reorderLevel: 50,
        unitPrice: 20.0,
        expiryDate: '2027-06-30',
        batchNumber: 'BAT-2026-901',
      });
      setCrudFeedback({ type: 'success', message: `Medicine "${intakeForm.medicineName}" added to formulary.` });
      setTimeout(() => setCrudFeedback(null), 4000);
      fetchData();
    } catch (e) {
      alert('Error registering stock intake');
    }
  };

  const handleOpenEditMed = (med: PharmacyItem) => {
    setEditingMed(med);
    setEditMedForm({
      medicineName: med.medicineName,
      genericName: med.genericName || '',
      category: med.category || 'General Pharmacology',
      stockQuantity: med.stockQuantity,
      reorderLevel: med.reorderLevel,
      unitPrice: med.unitPrice,
      expiryDate: med.expiryDate,
      batchNumber: med.batchNumber,
    });
  };

  const handleEditMedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMed) return;
    setSubmittingEdit(true);
    try {
      await axios.put(`/api/pharmacy/catalog/${editingMed.id}`, editMedForm);
      setEditingMed(null);
      setCrudFeedback({ type: 'success', message: `Medicine "${editMedForm.medicineName}" inventory details updated.` });
      setTimeout(() => setCrudFeedback(null), 4000);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to update medicine details');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteMedSubmit = async () => {
    if (!deletingMed) return;
    setSubmittingDelete(true);
    try {
      await axios.delete(`/api/pharmacy/catalog/${deletingMed.id}`);
      setCrudFeedback({ type: 'success', message: `Medicine "${deletingMed.medicineName}" removed from formulary catalog.` });
      setTimeout(() => setCrudFeedback(null), 4000);
      setDeletingMed(null);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to delete medicine item');
    } finally {
      setSubmittingDelete(false);
    }
  };

  const handleDeleteRxSubmit = async () => {
    if (!deletingRx) return;
    setSubmittingDelete(true);
    try {
      await axios.delete(`/api/pharmacy/dispensing-queue/${deletingRx.id}`);
      setCrudFeedback({ type: 'success', message: `Prescription #${deletingRx.id} removed from dispensing queue.` });
      setTimeout(() => setCrudFeedback(null), 4000);
      setDeletingRx(null);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to cancel prescription order');
    } finally {
      setSubmittingDelete(false);
    }
  };

  const criticalStockItems = catalog.filter((m) => m.stockQuantity === 0);
  const lowStockItems = catalog.filter((m) => m.stockQuantity > 0 && m.stockQuantity <= m.reorderLevel);

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

      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-bg-surface p-space-md rounded-xl border border-border-subtle shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
              Pharmacy & Formulary Inventory
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
              {catalog.length} SKUs Cataloged
            </span>
            {isSuperAdmin && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                Super Admin CRUD
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated stock ledger, dispensing verification queue, and formulary SKU lifecycle
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                activeTab === 'inventory' ? 'bg-white text-primary-teal font-semibold shadow-xs' : 'text-slate-600'
              }`}
            >
              Formulary Catalog ({catalog.length})
            </button>
            <button
              onClick={() => setActiveTab('dispensing')}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'dispensing' ? 'bg-white text-primary-teal font-semibold shadow-xs' : 'text-slate-600'
              }`}
            >
              <span>Dispensing Queue</span>
              {dispensingQueue.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {dispensingQueue.length}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border-subtle bg-bg-surface hover:bg-bg-surface-subtle text-slate-700 font-title-sm text-xs shadow-xs transition-colors"
            title="Refresh Pharmacy Data"
          >
            <span className={`material-symbols-outlined text-[16px] text-primary-teal ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {canManagePharmacy && (
            <button
              onClick={() => setShowIntakeModal(true)}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary-teal hover:bg-primary-teal-hover text-white font-title-sm text-xs shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">add_box</span>
              <span>+ Stock Intake</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Alert Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-bg-surface rounded-xl border border-border-subtle shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold text-slate-400">Total Formulations</span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">{catalog.length}</div>
          </div>
          <span className="material-symbols-outlined text-primary-teal text-[26px]">medication</span>
        </div>

        <div className="p-3.5 bg-bg-surface rounded-xl border border-border-subtle shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold text-rose-500">Stock Out Shortages</span>
            <div className="text-xl font-bold font-mono text-rose-600 mt-0.5">{criticalStockItems.length}</div>
          </div>
          <span className="material-symbols-outlined text-rose-500 text-[26px]">production_quantity_limits</span>
        </div>

        <div className="p-3.5 bg-bg-surface rounded-xl border border-border-subtle shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold text-amber-500">Low Stock Reorders</span>
            <div className="text-xl font-bold font-mono text-amber-600 mt-0.5">{lowStockItems.length}</div>
          </div>
          <span className="material-symbols-outlined text-amber-500 text-[26px]">warning</span>
        </div>

        <div className="p-3.5 bg-bg-surface rounded-xl border border-border-subtle shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold text-sky-600">Dispensing Queue</span>
            <div className="text-xl font-bold font-mono text-sky-700 mt-0.5">{dispensingQueue.length} Orders</div>
          </div>
          <span className="material-symbols-outlined text-sky-600 text-[26px]">receipt_long</span>
        </div>
      </div>

      {/* Content Tabs */}
      {activeTab === 'inventory' ? (
        <div className="space-y-3">
          {/* Search bar */}
          <div className="bg-bg-surface p-space-md rounded-xl border border-border-subtle shadow-xs">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search drug code, trade name, generic chemical component..."
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-bg-surface-subtle border border-border-strong text-xs sm:text-sm text-on-surface focus:outline-none focus:border-primary-teal transition-all"
              />
            </div>
          </div>

          {/* Catalog Table */}
          <div className="bg-bg-surface rounded-xl border border-border-subtle shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-bg-surface-subtle text-slate-500 font-title-sm">
                    <th className="py-3 px-4">Drug Code</th>
                    <th className="py-3 px-4">Medication Name & Generic</th>
                    <th className="py-3 px-4">Formulary Category</th>
                    <th className="py-3 px-4 text-right">Available Stock</th>
                    <th className="py-3 px-4 text-right">Unit Price</th>
                    <th className="py-3 px-4">Batch & Expiry</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Management</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {catalog.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                        No pharmacy medications found in inventory matching query.
                      </td>
                    </tr>
                  ) : (
                    catalog.map((med) => {
                      const isCritical = med.stockQuantity === 0;
                      const isLow = med.stockQuantity > 0 && med.stockQuantity <= med.reorderLevel;

                      return (
                        <tr key={med.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-label-tabular font-semibold text-slate-800">
                            {med.drugCode}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => setViewingMed(med)}
                              className="font-semibold text-slate-900 hover:text-primary-teal text-left transition-colors"
                              title="Click to view details"
                            >
                              {med.medicineName}
                            </button>
                            <div className="text-[11px] text-slate-500">{med.genericName}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{med.category}</td>
                          <td className="py-3 px-4 text-right font-label-tabular font-bold">
                            <span className={isCritical ? 'text-rose-600 font-extrabold' : isLow ? 'text-amber-600 font-bold' : 'text-slate-900'}>
                              {med.stockQuantity} units
                            </span>
                            <span className="block text-[10px] text-slate-400 font-normal">Reorder: {med.reorderLevel}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-label-tabular font-semibold text-slate-900">
                            Rs. {Number(med.unitPrice || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-label-tabular text-slate-800">{med.batchNumber}</div>
                            <div className="text-[10px] text-slate-500 font-label-tabular">Exp: {med.expiryDate}</div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isCritical ? 'bg-rose-100 text-rose-800' : isLow ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {isCritical ? 'STOCK OUT' : isLow ? 'LOW STOCK' : 'IN STOCK'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setViewingMed(med)}
                                className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                                title="View Details"
                              >
                                <span className="material-symbols-outlined text-[15px]">visibility</span>
                              </button>

                              {canManagePharmacy && (
                                <>
                                  <button
                                    onClick={() => handleOpenEditMed(med)}
                                    className="p-1.5 rounded border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 transition-colors"
                                    title="Edit Formulary Medicine"
                                  >
                                    <span className="material-symbols-outlined text-[15px]">edit</span>
                                  </button>
                                  <button
                                    onClick={() => setDeletingMed(med)}
                                    className="p-1.5 rounded border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                                    title="Delete Medicine from Inventory"
                                  >
                                    <span className="material-symbols-outlined text-[15px]">delete</span>
                                  </button>
                                </>
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
        </div>
      ) : (
        /* Dispensing Queue Tab */
        <div className="space-y-4">
          {dispensingQueue.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-bg-surface rounded-xl border border-border-subtle shadow-xs">
              <div className="flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[32px] text-slate-300">prescriptions</span>
                <span className="font-medium text-slate-600">No Prescriptions in Dispensing Queue</span>
                <span className="text-[11px] text-slate-400">
                  When doctors e-prescribe medications from the EMR Desk, prescription fulfillment requests appear here.
                </span>
              </div>
            </div>
          ) : (
            dispensingQueue.map((rx) => (
              <div key={rx.id} className="bg-bg-surface rounded-xl border border-border-subtle p-space-md shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-border-subtle gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Prescription #{rx.id} — Patient: <span className="text-primary-teal font-bold">{rx.patientName}</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Physician: {rx.doctorName} • Issued: {new Date(rx.prescriptionDate).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {canManagePharmacy && rx.status !== 'Dispensed' && (
                      <button
                        onClick={() => setDeletingRx(rx)}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                        title="Cancel Prescription Request"
                      >
                        Cancel Order
                      </button>
                    )}

                    {canManagePharmacy && (
                      <button
                        onClick={() => handleDispense(rx.id)}
                        disabled={rx.status === 'Dispensed'}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                          rx.status === 'Dispensed'
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-primary-teal hover:bg-primary-teal-hover text-white shadow-xs'
                        }`}
                      >
                        {rx.status === 'Dispensed' ? 'All Items Dispensed' : 'Dispense All & Deduct Inventory'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  {rx.items.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-900">{item.medicineName}</span>
                        <span className="text-slate-500 ml-2">
                          Dosage: {item.dosage} • {item.frequency} • Qty: {item.quantity}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.status === 'Dispensed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status || 'Pending'}
                        </span>
                        {item.status !== 'Dispensed' && canManagePharmacy && (
                          <button
                            onClick={() => handleDispense(rx.id, item.id)}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                          >
                            Dispense Item
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VIEW MEDICINE MODAL */}
      {viewingMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">{viewingMed.medicineName}</h2>
                <p className="text-xs text-cyan-300 font-mono">Drug Code: {viewingMed.drugCode}</p>
              </div>
              <button onClick={() => setViewingMed(null)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[11px] uppercase font-bold text-slate-400">Generic Formula</span>
                  <span className="font-semibold text-slate-900">{viewingMed.genericName || viewingMed.medicineName}</span>
                </div>
                <div>
                  <span className="block text-[11px] uppercase font-bold text-slate-400">Category</span>
                  <span className="font-semibold text-slate-900">{viewingMed.category}</span>
                </div>
                <div>
                  <span className="block text-[11px] uppercase font-bold text-slate-400">Stock on Hand</span>
                  <span className="font-bold font-mono text-base text-slate-900">{viewingMed.stockQuantity} units</span>
                  <span className="block text-[10px] text-slate-400">Reorder Threshold: {viewingMed.reorderLevel}</span>
                </div>
                <div>
                  <span className="block text-[11px] uppercase font-bold text-slate-400">Unit Retail Price</span>
                  <span className="font-bold font-mono text-base text-slate-900">Rs. {Number(viewingMed.unitPrice || 0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="block text-[11px] uppercase font-bold text-slate-400">Batch Number</span>
                  <span className="font-mono font-semibold text-slate-800">{viewingMed.batchNumber}</span>
                </div>
                <div>
                  <span className="block text-[11px] uppercase font-bold text-slate-400">Expiration Date</span>
                  <span className="font-mono font-semibold text-slate-800">{viewingMed.expiryDate}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewingMed(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 text-xs"
                >
                  Close
                </button>
                {canManagePharmacy && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = viewingMed;
                      setViewingMed(null);
                      handleOpenEditMed(target);
                    }}
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-1 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    <span>Edit Formulary Details</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MEDICINE MODAL */}
      {editingMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-amber-600 text-white flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Edit Medicine Inventory SKU</h2>
                <p className="text-xs text-amber-100 font-mono">Drug Code: {editingMed.drugCode}</p>
              </div>
              <button onClick={() => setEditingMed(null)} className="text-amber-100 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleEditMedSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Trade Name *</label>
                  <input
                    type="text"
                    required
                    value={editMedForm.medicineName}
                    onChange={(e) => setEditMedForm({ ...editMedForm, medicineName: e.target.value })}
                    className="w-full h-9 px-3 text-xs rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Generic Name</label>
                  <input
                    type="text"
                    value={editMedForm.genericName}
                    onChange={(e) => setEditMedForm({ ...editMedForm, genericName: e.target.value })}
                    className="w-full h-9 px-3 text-xs rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Category</label>
                  <select
                    value={editMedForm.category}
                    onChange={(e) => setEditMedForm({ ...editMedForm, category: e.target.value })}
                    className="w-full h-9 px-2 text-xs rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  >
                    <option value="Antibiotics">Antibiotics</option>
                    <option value="Cardiovascular">Cardiovascular</option>
                    <option value="Analgesics">Analgesics</option>
                    <option value="Antidiabetic">Antidiabetic</option>
                    <option value="Respiratory">Respiratory</option>
                    <option value="General Pharmacology">General Pharmacology</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Unit Price (LKR) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={editMedForm.unitPrice}
                    onChange={(e) => setEditMedForm({ ...editMedForm, unitPrice: Number(e.target.value) })}
                    className="w-full h-9 px-3 text-xs rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    required
                    value={editMedForm.stockQuantity}
                    onChange={(e) => setEditMedForm({ ...editMedForm, stockQuantity: Number(e.target.value) })}
                    className="w-full h-9 px-3 text-xs rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Reorder Level *</label>
                  <input
                    type="number"
                    required
                    value={editMedForm.reorderLevel}
                    onChange={(e) => setEditMedForm({ ...editMedForm, reorderLevel: Number(e.target.value) })}
                    className="w-full h-9 px-3 text-xs rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Batch Number</label>
                  <input
                    type="text"
                    value={editMedForm.batchNumber}
                    onChange={(e) => setEditMedForm({ ...editMedForm, batchNumber: e.target.value })}
                    className="w-full h-9 px-3 text-xs rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={editMedForm.expiryDate}
                    onChange={(e) => setEditMedForm({ ...editMedForm, expiryDate: e.target.value })}
                    className="w-full h-9 px-3 text-xs rounded border border-slate-300 focus:border-primary-teal focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMed(null)}
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
                  <span>Save Formulary SKU</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MEDICINE MODAL */}
      {deletingMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">warning</span>
                <h2 className="text-base font-bold">Delete Medicine SKU</h2>
              </div>
              <button onClick={() => setDeletingMed(null)} className="text-rose-100 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700">
                Are you sure you want to permanently delete{' '}
                <strong className="text-slate-900 font-bold">{deletingMed.medicineName}</strong> (
                <span className="font-mono text-primary-teal font-semibold">{deletingMed.drugCode}</span>) from the hospital formulary?
              </p>
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                ⚠️ Removing this item will eliminate it from clinical EMR prescription pickers.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeletingMed(null)}
                  className="px-4 py-2 text-sm rounded border border-slate-300 hover:bg-slate-50 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteMedSubmit}
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

      {/* CANCEL PRESCRIPTION MODAL */}
      {deletingRx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">cancel</span>
                <h2 className="text-base font-bold">Cancel Prescription Order</h2>
              </div>
              <button onClick={() => setDeletingRx(null)} className="text-rose-100 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700">
                Are you sure you want to cancel and remove prescription order{' '}
                <strong className="text-slate-900 font-bold">#{deletingRx.id}</strong> for patient{' '}
                <span className="font-semibold text-slate-900">{deletingRx.patientName}</span>?
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeletingRx(null)}
                  className="px-4 py-2 text-sm rounded border border-slate-300 hover:bg-slate-50 text-slate-700"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleDeleteRxSubmit}
                  disabled={submittingDelete}
                  className="px-5 py-2 text-sm rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  {submittingDelete && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>Cancel Prescription</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INTAKE MODAL */}
      {showIntakeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-primary-navy text-white flex items-center justify-between">
              <h2 className="text-base font-semibold">Formulary Medication Intake</h2>
              <button onClick={() => setShowIntakeModal(false)} className="text-slate-300 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleIntakeSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Trade Name *</label>
                  <input
                    type="text"
                    required
                    value={intakeForm.medicineName}
                    onChange={(e) => setIntakeForm({ ...intakeForm, medicineName: e.target.value })}
                    placeholder="e.g. Amoxicillin 500mg"
                    className="w-full h-9 px-3 text-xs rounded border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Generic Name</label>
                  <input
                    type="text"
                    value={intakeForm.genericName}
                    onChange={(e) => setIntakeForm({ ...intakeForm, genericName: e.target.value })}
                    placeholder="e.g. Amoxicillin Trihydrate"
                    className="w-full h-9 px-3 text-xs rounded border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Category</label>
                  <select
                    value={intakeForm.category}
                    onChange={(e) => setIntakeForm({ ...intakeForm, category: e.target.value })}
                    className="w-full h-9 px-2 text-xs rounded border border-slate-300"
                  >
                    <option value="Antibiotics">Antibiotics</option>
                    <option value="Cardiovascular">Cardiovascular</option>
                    <option value="Analgesics">Analgesics</option>
                    <option value="Antidiabetic">Antidiabetic</option>
                    <option value="Respiratory">Respiratory</option>
                    <option value="General Pharmacology">General Pharmacology</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Unit Price (LKR) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={intakeForm.unitPrice}
                    onChange={(e) => setIntakeForm({ ...intakeForm, unitPrice: Number(e.target.value) })}
                    className="w-full h-9 px-3 text-xs rounded border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Intake Quantity *</label>
                  <input
                    type="number"
                    required
                    value={intakeForm.stockQuantity}
                    onChange={(e) => setIntakeForm({ ...intakeForm, stockQuantity: Number(e.target.value) })}
                    className="w-full h-9 px-3 text-xs rounded border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Reorder Level *</label>
                  <input
                    type="number"
                    required
                    value={intakeForm.reorderLevel}
                    onChange={(e) => setIntakeForm({ ...intakeForm, reorderLevel: Number(e.target.value) })}
                    className="w-full h-9 px-3 text-xs rounded border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Batch Number</label>
                  <input
                    type="text"
                    value={intakeForm.batchNumber}
                    onChange={(e) => setIntakeForm({ ...intakeForm, batchNumber: e.target.value })}
                    className="w-full h-9 px-3 text-xs rounded border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={intakeForm.expiryDate}
                    onChange={(e) => setIntakeForm({ ...intakeForm, expiryDate: e.target.value })}
                    className="w-full h-9 px-3 text-xs rounded border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowIntakeModal(false)}
                  className="px-3.5 py-1.5 text-xs rounded border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-primary-teal text-white hover:bg-primary-teal-hover"
                >
                  Confirm Intake
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
