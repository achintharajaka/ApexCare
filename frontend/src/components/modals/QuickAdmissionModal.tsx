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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-primary-navy text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-cyan-400">emergency</span>
            <h2 className="text-base sm:text-lg font-semibold tracking-tight">Rapid Inpatient & Triage Admission</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto max-h-[calc(90vh-65px)]">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="e.g. Kasuni"
                className="w-full h-9 px-3 text-sm rounded-md border border-slate-300 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="e.g. Fernando"
                className="w-full h-9 px-3 text-sm rounded-md border border-slate-300 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full h-9 px-3 text-sm rounded-md border border-slate-300 focus:outline-none focus:border-primary-teal"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full h-9 px-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:border-primary-teal"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Blood Group
              </label>
              <select
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="w-full h-9 px-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:border-primary-teal"
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
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Contact Phone Number
              </label>
              <input
                type="text"
                required
                value={formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                className="w-full h-9 px-3 text-sm rounded-md border border-slate-300 focus:outline-none focus:border-primary-teal"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Ward Bed Allocation
              </label>
              <select
                value={formData.wardBed}
                onChange={(e) => setFormData({ ...formData, wardBed: e.target.value })}
                className="w-full h-9 px-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:border-primary-teal"
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
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Admitting Physician
              </label>
              <select
                value={formData.assignedDoctor}
                onChange={(e) => setFormData({ ...formData, assignedDoctor: e.target.value })}
                className="w-full h-9 px-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:border-primary-teal"
              >
                <option value="Dr. Kasun Perera">Dr. Kasun Perera (Consultant Physician)</option>
                <option value="Dr. Dilani Wickramasinghe">Dr. Dilani Wickramasinghe (Consultant Pathologist)</option>
                <option value="Namal Kumara">Namal Kumara (Chief Administrator)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Severe Drug Allergies
              </label>
              <input
                type="text"
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                placeholder="e.g. Penicillin, Sulfa"
                className="w-full h-9 px-3 text-sm rounded-md border border-slate-300 focus:outline-none focus:border-primary-teal"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Chief Triage Complaint / Admission Note
            </label>
            <textarea
              rows={2}
              value={formData.chiefComplaint}
              onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
              className="w-full p-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:border-primary-teal"
            ></textarea>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm rounded-md bg-primary-teal hover:bg-primary-teal-hover text-white font-semibold shadow-sm transition-all flex items-center gap-1.5"
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
