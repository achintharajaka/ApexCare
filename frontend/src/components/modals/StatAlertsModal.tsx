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
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4 t-modal-overlay is-open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="t-modal t-sheet is-open bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden">
        {/* Mobile Drag Indicator Handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-slate-900">
          <div className="w-10 h-1 rounded-full bg-slate-700"></div>
        </div>

        {/* Modal Header */}
        <div
          className={`px-5 py-4 text-white flex items-center justify-between flex-shrink-0 ${
            totalAlerts > 0 ? 'bg-status-critical' : 'bg-slate-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[18px]">
                {totalAlerts > 0 ? 'warning' : 'verified_user'}
              </span>
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-tight">Active STAT Emergency & Diagnostic Alerts</h2>
              <p className="text-xs text-white/80">
                {totalAlerts > 0
                  ? `${totalAlerts} Priority conditions require workstation action`
                  : 'All operational hospital telemetry is within normal parameters'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchAlerts}
              disabled={loading}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 tap-press transition-colors"
              title="Refresh Alerts"
            >
              <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 tap-press transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Alerts Content */}
        <div className="p-4 sm:p-6 space-y-3 overflow-y-auto flex-1">
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
                  className="p-3.5 rounded-xl border border-red-200 bg-red-50/70 flex items-start justify-between gap-3 card-interactive"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-red-600 mt-0.5">monitor_heart</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-red-900">{lab.testName}</span>
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-red-600 text-white uppercase">
                          STAT Urgent
                        </span>
                      </div>
                      <p className="text-xs text-red-800 mt-0.5">
                        Patient: <strong>{lab.patientName}</strong> ({lab.patientMrn}) • Doctor: {lab.doctorName}
                      </p>
                      <p className="text-[11px] text-red-600 mt-1">Status: {lab.sampleStatus}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToLab();
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 tap-press transition-colors whitespace-nowrap shadow-xs"
                  >
                    Process Lab
                  </button>
                </div>
              ))}

              {alerts.pharmacyAlerts.map((med) => (
                <div
                  key={med.id}
                  className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 flex items-start justify-between gap-3 card-interactive"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-amber-600 mt-0.5">medication</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-amber-900">{med.medicineName}</span>
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-600 text-white uppercase">
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
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 tap-press transition-colors whitespace-nowrap shadow-xs"
                  >
                    Restock
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end pb-safe sm:pb-3.5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 tap-press transition-colors"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
