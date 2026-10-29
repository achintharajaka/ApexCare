import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface StatAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToLab: () => void;
  onNavigateToPharmacy: () => void;
}

export const StatAlertsModal: React.FC<StatAlertsModalProps> = ({
  isOpen,
  onClose,
  onNavigateToLab,
  onNavigateToPharmacy,
}) => {
  const [alerts, setAlerts] = useState<{ urgentLabs: any[]; pharmacyAlerts: any[] }>({
    urgentLabs: [],
    pharmacyAlerts: [],
  });
  const [loading, setLoading] = useState(false);

  const fetchAlerts = () => {
    setLoading(true);
    axios
      .get('/api/dashboard/summary')
      .then((res) => {
        setAlerts({
          urgentLabs: res.data?.urgentLabOrders || [],
          pharmacyAlerts: res.data?.pharmacyAlerts || [],
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      fetchAlerts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalAlerts = alerts.urgentLabs.length + alerts.pharmacyAlerts.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div
          className={`px-5 py-4 text-white flex items-center justify-between flex-shrink-0 ${
            totalAlerts > 0 ? 'bg-status-critical' : 'bg-primary-navy'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-white">
              {totalAlerts > 0 ? 'warning' : 'verified_user'}
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-semibold tracking-tight">Active STAT Emergency & Diagnostic Alerts</h2>
              <p className="text-xs text-slate-200">
                {totalAlerts > 0
                  ? `${totalAlerts} Priority conditions require workstation action`
                  : 'All operational hospital telemetry is within normal parameters'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAlerts}
              disabled={loading}
              className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Refresh Alerts"
            >
              <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
            </button>
            <button onClick={onClose} className="text-slate-200 hover:text-white transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Alerts Content */}
        <div className="p-4 sm:p-6 space-y-3 overflow-y-auto max-h-[calc(90vh-130px)]">
          {totalAlerts === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <div className="flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-4xl text-emerald-500">check_circle</span>
                <h3 className="text-sm font-bold text-slate-800">All Clinical Queues Normal</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  No STAT emergency laboratory test orders or critical pharmaceutical supply shortages detected.
                </p>
              </div>
            </div>
          ) : (
            <>
              {alerts.urgentLabs.map((lab) => (
                <div
                  key={lab.id}
                  className="p-3.5 rounded-lg border border-red-200 bg-red-50 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-red-600 mt-0.5">monitor_heart</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-red-900">{lab.testName}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white uppercase">
                          STAT Urgent
                        </span>
                      </div>
                      <p className="text-xs text-red-800 mt-0.5">
                        Patient: {lab.patientName} ({lab.patientMrn}) • Doctor: {lab.doctorName}
                      </p>
                      <p className="text-[11px] text-red-600 mt-1">Status: {lab.sampleStatus}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToLab();
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded bg-red-600 text-white hover:bg-red-700 transition-colors whitespace-nowrap"
                  >
                    Process Lab
                  </button>
                </div>
              ))}

              {alerts.pharmacyAlerts.map((med) => (
                <div
                  key={med.id}
                  className="p-3.5 rounded-lg border border-amber-200 bg-amber-50 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-amber-600 mt-0.5">medication</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-amber-900">{med.medicineName}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-600 text-white uppercase">
                          {med.severity}
                        </span>
                      </div>
                      <p className="text-xs text-amber-800 mt-0.5">
                        Inventory: {med.stockQuantity} Remaining (Reorder Level: {med.reorderLevel})
                      </p>
                      <p className="text-[11px] text-amber-700 mt-1">
                        Batch {med.batchNumber} • Expiry: {med.expiryDate}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToPharmacy();
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-600 text-white hover:bg-amber-700 transition-colors whitespace-nowrap"
                  >
                    Restock
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
