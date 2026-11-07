import React, { useState } from 'react';
import axios from 'axios';

interface QuickAdmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientAdmitted: (patient: any) => void;
}

export const QuickAdmissionModal: React.FC<QuickAdmissionModalProps> = ({
  isOpen,
  onClose,
  onPatientAdmitted,
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: 'Female',
    dateOfBirth: '1990-05-15',
    contactNumber: '+94 77 ',
    bloodGroup: 'O+',
    wardBed: 'Emergency Triage - Bed 01',
    assignedDoctor: 'Dr. Kasun Perera',
    allergies: 'None',
    chiefComplaint: 'Acute Chest Discomfort and Shortness of Breath',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        contactNumber: formData.contactNumber,
        bloodGroup: formData.bloodGroup,
        wardBed: formData.wardBed,
        assignedDoctor: formData.assignedDoctor,
        allergies: formData.allergies !== 'None' ? [formData.allergies] : [],
        chronicConditions: [formData.chiefComplaint],
      };

      const res = await axios.post('/api/patients', payload);
      onPatientAdmitted(res.data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to admit patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4 t-modal-overlay is-open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="t-modal t-sheet is-open bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden">
        {/* Mobile Drag/Pull Indicator Handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-slate-900">
          <div className="w-10 h-1 rounded-full bg-slate-700"></div>
        </div>

        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/60 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">emergency</span>
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-tight">Rapid Inpatient & Triage Admission</h2>
              <p className="text-[11px] text-slate-400">Emergency patient intake and ward allocation</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 tap-press transition-colors touch-target"
            title="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium t-shake">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                First Name *
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="e.g. Kasuni"
                className="w-full h-10 px-3.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-primary-teal focus:ring-2 focus:ring-primary-teal-subtle transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="e.g. Fernando"
                className="w-full h-10 px-3.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-primary-teal focus:ring-2 focus:ring-primary-teal-subtle transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Date of Birth
              </label>
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full h-10 px-3 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-primary-teal focus:ring-2 focus:ring-primary-teal-subtle transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full h-10 px-3 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-primary-teal focus:ring-2 focus:ring-primary-teal-subtle transition-all bg-white"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Blood Group
              </label>
              <select
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="w-full h-10 px-3 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-primary-teal focus:ring-2 focus:ring-primary-teal-subtle transition-all bg-white"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Contact Phone Number
              </label>
              <input
                type="text"
                required
                value={formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                className="w-full h-10 px-3.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-primary-teal focus:ring-2 focus:ring-primary-teal-subtle transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Ward Bed Allocation
              </label>
              <select
                value={formData.wardBed}
                onChange={(e) => setFormData({ ...formData, wardBed: e.target.value })}
                className="w-full h-10 px-3 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-primary-teal focus:ring-2 focus:ring-primary-teal-subtle transition-all bg-white"
              >
                <option value="Emergency Triage - Bed 04">Emergency Triage - Bed 04</option>
                <option value="ICU Unit - Bed 02">ICU Unit - Bed 02 (Critical)</option>
                <option value="Ward 3B - Bed 16">Ward 3B - Bed 16 (Observation)</option>
                <option value="General Surgical - Bed 22">General Surgical - Bed 22</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Admitting Physician
              </label>
              <select
                value={formData.assignedDoctor}
                onChange={(e) => setFormData({ ...formData, assignedDoctor: e.target.value })}
                className="w-full h-10 px-3 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-primary-teal focus:ring-2 focus:ring-primary-teal-subtle transition-all bg-white"
              >
                <option value="Dr. Kasun Perera">Dr. Kasun Perera (Consultant Physician)</option>
                <option value="Dr. Dilani Wickramasinghe">Dr. Dilani Wickramasinghe (Consultant Pathologist)</option>
                <option value="Namal Kumara">Namal Kumara (Chief Administrator)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Severe Drug Allergies
              </label>
              <input
                type="text"
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                placeholder="e.g. Penicillin, Sulfa"
                className="w-full h-10 px-3.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-primary-teal focus:ring-2 focus:ring-primary-teal-subtle transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Chief Triage Complaint / Admission Note
            </label>
            <textarea
              rows={2}
              value={formData.chiefComplaint}
              onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
              className="w-full p-3 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-primary-teal focus:ring-2 focus:ring-primary-teal-subtle transition-all"
            ></textarea>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 pb-safe sm:pb-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold tap-press transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-sm rounded-xl bg-primary-teal hover:bg-primary-teal-hover text-white font-semibold shadow-xs tap-press transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>{loading ? 'Admitting...' : 'Confirm Admission'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
