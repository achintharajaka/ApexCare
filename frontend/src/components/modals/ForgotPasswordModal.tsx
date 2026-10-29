import React, { useState } from 'react';
import axios from 'axios';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPasswordResetSuccess: (username: string, newPass: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onPasswordResetSuccess,
}) => {
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [receivedCode, setReceivedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleReset = () => {
    setStep('request');
    setEmail('');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setReceivedCode('');
    setError('');
    setSuccess('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await axios.post('/api/auth/forgot-password', { email: email.trim() });
      if (res.data.success) {
        setReceivedCode(res.data.code || '');
        setCode(res.data.code || ''); // Auto-populate for seamless demo/testing
        setSuccess(`Verification code has been dispatched to ${email}.`);
        setStep('verify');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to dispatch password reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!code.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post('/api/auth/reset-password', {
        email: email.trim(),
        code: code.trim(),
        newPassword,
      });

      if (res.data.success) {
        setSuccess('Password has been successfully updated! Redirecting to login...');
        setTimeout(() => {
          onPasswordResetSuccess(res.data.username || '', newPassword);
          handleClose();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password. Please check your verification code.');
    } finally {
      setLoading(false);
    }
  };

  const sampleAccounts = [
    { label: 'Admin (Namal Kumara)', email: 'namal.kumara@apexcare.lk' },
    { label: 'Doctor (Dr. Kasun Perera)', email: 'dr.kasun@apexcare.lk' },
    { label: 'Nurse (Nurse Nimali Fernando)', email: 'nimali.f@apexcare.lk' },
    { label: 'Reception (Chaminda Silva)', email: 'chaminda.s@apexcare.lk' },
    { label: 'Lab (Dr. Dilani Wickramasinghe)', email: 'dilani.w@apexcare.lk' },
    { label: 'Pharmacy (Nuwan Bandara)', email: 'nuwan.b@apexcare.lk' },
    { label: 'Accounts (Tharindu Jayawardena)', email: 'tharindu.j@apexcare.lk' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl border border-border-subtle w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-primary-navy text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">mark_email_read</span>
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight">Self-Service Password Recovery</h2>
              <p className="text-[11px] text-slate-300">
                {step === 'request'
                  ? 'Request an email verification code to reset your account credentials'
                  : 'Enter the verification code dispatched to your email'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-300 hover:text-white transition-colors p-1 rounded-md"
            title="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-rose-600">error</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
              <span>{success}</span>
            </div>
          )}

          {step === 'request' ? (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Registered Personnel Email *
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    mail
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. dr.kasun@apexcare.lk"
                    className="w-full h-10 pl-9 pr-3 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal"
                  />
                </div>
              </div>

              {/* Quick Preset Selector for Testing */}
              <div>
                <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Or select a registered staff station account:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {sampleAccounts.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => setEmail(acc.email)}
                      className={`px-2 py-1 text-[11px] rounded border transition-colors ${
                        email === acc.email
                          ? 'bg-primary-teal text-white border-primary-teal font-medium'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {acc.label.split(' ')[0]}: {acc.email.split('@')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-sky-50 border border-sky-100 rounded-lg p-3 text-[11px] text-sky-800 flex items-start gap-2">
                <span className="material-symbols-outlined text-sky-600 text-[16px] mt-0.5">info</span>
                <span>
                  A 6-digit security code will be dispatched to this email address. The code remains valid for 15 minutes.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-primary-teal hover:bg-primary-teal-hover text-white shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>{loading ? 'Dispatching Email...' : 'Send Verification Code'}</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyAndReset} className="space-y-4">
              {/* Verification Code Notice */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">Email Dispatched To:</span>
                  <span className="font-mono text-emerald-800">{email}</span>
                </div>
                {receivedCode && (
                  <div className="flex items-center justify-between pt-1 border-t border-emerald-200 text-[11px]">
                    <span>Security Verification Code:</span>
                    <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-700">
                      {receivedCode}
                    </span>
                  </div>
                )}
              </div>

              {/* Code Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  6-Digit Verification Code *
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    pin
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit code"
                    className="w-full h-10 pl-9 pr-3 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal font-mono tracking-widest text-center text-base"
                  />
                </div>
              </div>

              {/* New Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full h-10 pl-3 pr-9 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {showNew ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type password"
                      className="w-full h-10 pl-3 pr-9 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {showConfirm ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  <span>Change Email</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    <span>{loading ? 'Updating...' : 'Set New Password'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
