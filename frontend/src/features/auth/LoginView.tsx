import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { RoleType } from '../../types';
import { ApexCareLogo } from '../../components/common/ApexCareLogo';
import { ForgotPasswordModal } from '../../components/modals/ForgotPasswordModal';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

interface RolePreset {
  role: RoleType;
  title: string;
  name: string;
  username: string;
  pass: string;
  icon: string;
  description: string;
  badgeClass: string;
}

const ROLE_ACCOUNTS: RolePreset[] = [
  {
    role: 'ADMIN',
    title: 'Super Administrator',
    name: 'Namal Kumara',
    username: 'superadmin',
    pass: 'Test1234!',
    icon: 'admin_panel_settings',
    description: 'Full hospital control • Add staff & doctors • Manage users • Audit governance',
    badgeClass: 'bg-slate-900 text-cyan-300 border-slate-700',
  },
  {
    role: 'DOCTOR',
    title: 'Consultant Physician',
    name: 'Dr. Kasun Perera, MD',
    username: 'doctor1',
    pass: 'Doctor1234!',
    icon: 'stethoscope',
    description: 'Consultations & EMR • Prescriptions • Diagnostic review • OPD Appointments',
    badgeClass: 'bg-cyan-950 text-cyan-300 border-cyan-800',
  },
  {
    role: 'NURSE',
    title: 'Clinical Nursing Officer',
    name: 'Nurse Nimali Fernando, RN',
    username: 'nurse1',
    pass: 'Nurse1234!',
    icon: 'health_and_safety',
    description: 'Inpatient triage • Patient vitals • Duty roster • Shift administration',
    badgeClass: 'bg-emerald-950 text-emerald-300 border-emerald-800',
  },
  {
    role: 'RECEPTIONIST',
    title: 'Front Desk Receptionist',
    name: 'Chaminda Silva',
    username: 'receptionist1',
    pass: 'Reception1234!',
    icon: 'desk',
    description: 'Patient registration • Rapid triage check-in • Appointment scheduling',
    badgeClass: 'bg-amber-950 text-amber-300 border-amber-800',
  },
  {
    role: 'LAB_TECH',
    title: 'Diagnostic Lab Specialist',
    name: 'Dr. Dilani Wickramasinghe',
    username: 'labtech1',
    pass: 'Lab1234!',
    icon: 'science',
    description: 'Specimen processing • Pathology tests • STAT urgent alerts • Lab validation',
    badgeClass: 'bg-purple-950 text-purple-300 border-purple-800',
  },
  {
    role: 'PHARMACIST',
    title: 'Chief Clinical Pharmacist',
    name: 'Nuwan Bandara, BPharm',
    username: 'pharmacist1',
    pass: 'Pharm1234!',
    icon: 'medication',
    description: 'Pharmacy inventory • Medicine dispensing • Batch tracking • Drug stock',
    badgeClass: 'bg-teal-950 text-teal-300 border-teal-800',
  },
  {
    role: 'ACCOUNTANT',
    title: 'Hospital Billing Accountant',
    name: 'Tharindu Jayawardena, ACA',
    username: 'accountant1',
    pass: 'Account1234!',
    icon: 'receipt_long',
    description: 'Cashier desk • Patient invoices (Rs.) • Payment recording • Revenue analytics',
    badgeClass: 'bg-rose-950 text-rose-300 border-rose-800',
  },
];

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('superadmin');
  const [password, setPassword] = useState('Test1234!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetBanner, setResetBanner] = useState('');

  const executeLogin = async (u: string, p: string) => {
    setLoading(true);
    setError('');

    try {
      const ok = await login(u, p);
      if (ok) {
        onLoginSuccess();
      } else {
        setError('Invalid clinical credentials. Please verify username and password.');
      }
    } catch {
      setError('Login authentication service unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeLogin(username, password);
  };

  const handleSelectRole = (acc: RolePreset, autoSubmit = false) => {
    setUsername(acc.username);
    setPassword(acc.pass);
    if (autoSubmit) {
      executeLogin(acc.username, acc.pass);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 lg:p-8 relative overflow-hidden">
      {/* Background Subtle Gradient & Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-6xl z-10 animate-fadeIn">
        {/* Header Branding */}
        <div className="flex flex-col items-center mb-8 text-center">
          <ApexCareLogo variant="dark" className="h-10 w-auto mb-2" />
          <h1 className="text-2xl font-bold text-white tracking-tight">
            ApexCare Enterprise Hospital Management System
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            Multi-Tenant Clinical Governance • Role-Based Authentication & Activity Segregation
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Sign In Form (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl shadow-2xl border border-slate-100 p-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-teal text-[22px]">lock</span>
                Workstation Authentication
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Sign in with your role-specific user ID and encrypted credentials
              </p>
            </div>

            {resetBanner && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                  <span>{resetBanner}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setResetBanner('')}
                  className="text-emerald-700 hover:text-emerald-900"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-600 text-[18px]">error</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  User ID / Personnel Account
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    badge
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. superadmin, doctor1, nurse1"
                    className="w-full h-10 pl-9 pr-3 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Station Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    key
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-10 pl-9 pr-10 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-primary-teal" />
                  <span>Remember station</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-primary-teal hover:underline font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">lock_reset</span>
                  <span>Forgot password?</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-primary-teal hover:bg-primary-teal-hover text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 transform active:scale-95 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">login</span>
                <span>{loading ? 'Authenticating...' : 'Sign In to Station'}</span>
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-500 text-center">
              Selected account determines your clinical module access and operational privileges.
            </div>
          </div>

          {/* Right Column: Pre-Configured Role Accounts for Quick Evaluation (7 cols) */}
          <div className="lg:col-span-7 bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700/80 p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-cyan-400 text-[20px]">contacts</span>
                  Example Role Accounts
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Click any role card to auto-fill credentials, or click <strong>Sign In</strong> for instant 1-click access
                </p>
              </div>
              <span className="text-[11px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/60 px-2.5 py-1 rounded-full">
                7 Active Roles
              </span>
            </div>

            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {ROLE_ACCOUNTS.map((acc) => {
                const isSelected = username === acc.username;

                return (
                  <div
                    key={acc.role}
                    onClick={() => handleSelectRole(acc, false)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-slate-700/90 border-cyan-400 shadow-md ring-1 ring-cyan-400/50'
                        : 'bg-slate-900/60 border-slate-700/60 hover:bg-slate-750 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 text-cyan-400 border border-slate-700">
                        <span className="material-symbols-outlined text-[20px]">{acc.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-white truncate">{acc.title}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${acc.badgeClass}`}>
                            {acc.role}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 truncate font-medium">{acc.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{acc.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:self-center flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-700/50 justify-between">
                      <div className="text-right font-mono text-[11px] bg-slate-950/60 px-2.5 py-1.5 rounded-md border border-slate-800">
                        <div className="text-cyan-300 font-semibold">{acc.username}</div>
                        <div className="text-slate-400">{acc.pass}</div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectRole(acc, true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1 active:scale-95"
                        title={`Sign in immediately as ${acc.title}`}
                      >
                        <span>Sign In</span>
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Security & Audit Compliance Footer */}
        <div className="mt-8 text-center text-xs text-slate-500">
          ApexCare System v2.6.4 • Activity roles adhere to strict healthcare access segregation. All logins audit logged.
        </div>
      </div>

      {/* Self-Service Password Recovery Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        onPasswordResetSuccess={(updatedUsername, newPass) => {
          if (updatedUsername) setUsername(updatedUsername);
          setPassword(newPass);
          setResetBanner(`Password successfully reset for "${updatedUsername}". You can now sign in!`);
        }}
      />
    </div>
  );
};
