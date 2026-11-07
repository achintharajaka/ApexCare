import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useRealtime } from '../../context/RealtimeContext';
import { useTheme } from '../../context/ThemeContext';

interface ShiftInfo {
  name: string;
  hours: string;
  badgeBg: string;
  textColor: string;
  dotColor: string;
}

const getLiveHospitalShift = (): ShiftInfo => {
  const hour = new Date().getHours();

  if (hour >= 8 && hour < 16) {
    return {
      name: 'Morning Shift',
      hours: '08:00 - 16:00',
      badgeBg: 'bg-emerald-50 border border-emerald-200/80',
      textColor: 'text-emerald-800',
      dotColor: 'bg-emerald-500',
    };
  } else if (hour >= 16 && hour < 24) {
    return {
      name: 'Evening Shift',
      hours: '16:00 - 00:00',
      badgeBg: 'bg-amber-50 border border-amber-200/80',
      textColor: 'text-amber-800',
      dotColor: 'bg-amber-500',
    };
  } else {
    return {
      name: 'Night Shift',
      hours: '00:00 - 08:00',
      badgeBg: 'bg-indigo-50 border border-indigo-200/80',
      textColor: 'text-indigo-800',
      dotColor: 'bg-indigo-500',
    };
  }
};

interface HeaderProps {
  onOpenQuickAdmission: () => void;
  onOpenStatAlerts: () => void;
  onStartTour: () => void;
  onSearch: (query: string) => void;
  onOpenChangePassword?: () => void;
  onToggleMobileSidebar?: () => void;
  statAlertsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenQuickAdmission,
  onOpenStatAlerts,
  onStartTour,
  onSearch,
  onOpenChangePassword,
  onToggleMobileSidebar,
  statAlertsCount = 0,
}) => {
  const { user, logout } = useAuth();
  const isSuperAdmin = user?.role === 'ADMIN';
  const { isConnected, connectionStatus, triggerManualSync, telemetry } = useRealtime();
  const { theme, setTheme, effectiveTheme } = useTheme();
  const [searchVal, setSearchVal] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [shift, setShift] = useState<ShiftInfo>(getLiveHospitalShift);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Shift Configuration State (Admin option to edit shift hours)
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [savingShift, setSavingShift] = useState(false);
  const [shiftFeedback, setShiftFeedback] = useState<string | null>(null);
  const [shiftForm, setShiftForm] = useState({
    morningName: 'Morning Shift',
    morningHours: '08:00 - 16:00',
    eveningName: 'Evening Shift',
    eveningHours: '16:00 - 00:00',
    nightName: 'Night Shift',
    nightHours: '00:00 - 08:00',
    activeOverride: '',
  });

  const computeActiveShift = (cfg?: any): ShiftInfo => {
    const hour = new Date().getHours();
    const c = cfg || shiftForm;

    if (c.activeOverride) {
      if (c.activeOverride === 'Night Shift' || c.activeOverride.includes('Night')) {
        return {
          name: c.nightName || 'Night Shift',
          hours: c.nightHours || '00:00 - 08:00',
          badgeBg: 'bg-indigo-50 border border-indigo-200/80',
          textColor: 'text-indigo-800',
          dotColor: 'bg-indigo-500',
        };
      }
      if (c.activeOverride === 'Evening Shift' || c.activeOverride.includes('Evening')) {
        return {
          name: c.eveningName || 'Evening Shift',
          hours: c.eveningHours || '16:00 - 00:00',
          badgeBg: 'bg-amber-50 border border-amber-200/80',
          textColor: 'text-amber-800',
          dotColor: 'bg-amber-500',
        };
      }
      return {
        name: c.morningName || 'Morning Shift',
        hours: c.morningHours || '08:00 - 16:00',
        badgeBg: 'bg-emerald-50 border border-emerald-200/80',
        textColor: 'text-emerald-800',
        dotColor: 'bg-emerald-500',
      };
    }

    if (hour >= 8 && hour < 16) {
      return {
        name: c.morningName || 'Morning Shift',
        hours: c.morningHours || '08:00 - 16:00',
        badgeBg: 'bg-emerald-50 border border-emerald-200/80',
        textColor: 'text-emerald-800',
        dotColor: 'bg-emerald-500',
      };
    } else if (hour >= 16 && hour < 24) {
      return {
        name: c.eveningName || 'Evening Shift',
        hours: c.eveningHours || '16:00 - 00:00',
        badgeBg: 'bg-amber-50 border border-amber-200/80',
        textColor: 'text-amber-800',
        dotColor: 'bg-amber-500',
      };
    } else {
      return {
        name: c.nightName || 'Night Shift',
        hours: c.nightHours || '00:00 - 08:00',
        badgeBg: 'bg-indigo-50 border border-indigo-200/80',
        textColor: 'text-indigo-800',
        dotColor: 'bg-indigo-500',
      };
    }
  };

  const fetchShiftConfig = async () => {
    try {
      const res = await axios.get('/api/staff/shifts/config');
      if (res.data) {
        const d = res.data;
        const mapped = {
          morningName: d.morning?.name || 'Morning Shift',
          morningHours: d.morning?.hours || '08:00 - 16:00',
          eveningName: d.evening?.name || 'Evening Shift',
          eveningHours: d.evening?.hours || '16:00 - 00:00',
          nightName: d.night?.name || 'Night Shift',
          nightHours: d.night?.hours || '00:00 - 08:00',
          activeOverride: d.activeOverride || '',
        };
        setShiftForm(mapped);
        setShift(computeActiveShift(mapped));
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchShiftConfig();
    const handleSync = () => fetchShiftConfig();
    window.addEventListener('apexcare:sync', handleSync);
    return () => window.removeEventListener('apexcare:sync', handleSync);
  }, []);

  const handleSaveShiftConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingShift(true);
    try {
      await axios.put('/api/staff/shifts/config', {
        morning: { name: shiftForm.morningName, hours: shiftForm.morningHours },
        evening: { name: shiftForm.eveningName, hours: shiftForm.eveningHours },
        night: { name: shiftForm.nightName, hours: shiftForm.nightHours },
        activeOverride: shiftForm.activeOverride || null,
      });
      setShift(computeActiveShift());
      setShowShiftModal(false);
      setShiftFeedback('Hospital operational shift schedule updated successfully.');
      setTimeout(() => setShiftFeedback(null), 3500);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to update shift schedule.');
    } finally {
      setSavingShift(false);
    }
  };

  const effectiveStatAlerts = statAlertsCount > 0 
    ? statAlertsCount 
    : (telemetry?.kpis?.laboratory?.urgent || 0) + (telemetry?.kpis?.pharmacy?.alerts || 0);

  useEffect(() => {
    const timer = setInterval(() => {
      setShift(computeActiveShift());
    }, 60000);
    return () => clearInterval(timer);
  }, [shiftForm]);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      onSearch(searchVal.trim());
    }
  };

  return (
    <header className="fixed top-0 left-0 lg:left-[260px] right-0 h-16 bg-white/95 backdrop-blur-md border-b border-border-subtle z-30 flex items-center justify-between px-3 sm:px-6 lg:px-8 shadow-xs transition-all">
      {/* Mobile Hamburger & Global Search */}
      <div className="flex items-center gap-2.5 flex-1 max-w-xl min-w-[140px] sm:min-w-[240px] md:min-w-[300px]">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 -ml-1 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 touch-target tap-press focus:outline-none transition-colors flex-shrink-0"
          title="Open navigation menu"
          aria-label="Open navigation menu"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>

        <form onSubmit={handleSearchSubmit} className="relative w-full min-w-0 global-search-bar">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400 pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchVal}
            onChange={(e) => {
              setSearchVal(e.target.value);
              onSearch(e.target.value);
            }}
            placeholder="Search patients, doctors, bills... [⌘K]"
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm placeholder:text-slate-400 text-slate-900 focus:outline-none focus:bg-white focus:border-primary-teal focus:ring-2 focus:ring-primary-teal-subtle transition-all"
          />
        </form>
      </div>

      {/* Right Command & Action Center */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0 ml-2">
        {/* Live Backend Connection Indicator */}
        <button
          type="button"
          onClick={triggerManualSync}
          className={`flex items-center justify-center gap-1.5 h-10 px-2.5 sm:px-3 rounded-xl text-xs font-semibold border tap-press transition-all ${
            isConnected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
              : connectionStatus === 'connecting'
              ? 'bg-amber-50 border-amber-200 text-amber-800 animate-pulse'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
          title={`Backend Realtime Connection: ${
            isConnected ? 'Online & Sync Active (Click to refresh)' : 'Reconnecting to ApexCare Core...'
          }`}
        >
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isConnected ? 'animate-ping bg-emerald-400' : 'bg-amber-400'
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isConnected ? 'bg-emerald-500' : connectionStatus === 'connecting' ? 'bg-amber-500' : 'bg-rose-500'
              }`}
            ></span>
          </span>
          <span className="hidden xl:inline">
            {isConnected ? 'Backend Connected' : connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
          </span>
          <span className="hidden md:inline xl:hidden font-bold">
            {isConnected ? 'Live' : 'Sync'}
          </span>
        </button>

        {/* Real-time Hospital Shift Indicator with Admin Edit Schedule Option */}
        <button
          type="button"
          onClick={() => isSuperAdmin && setShowShiftModal(true)}
          className={`hidden xl:flex items-center gap-1.5 h-10 px-3 py-1.5 rounded-xl text-xs font-semibold ${shift.badgeBg} ${shift.textColor} shadow-2xs transition-all ${
            isSuperAdmin ? 'hover:ring-2 hover:ring-primary-teal-subtle cursor-pointer' : 'cursor-default'
          }`}
          title={
            isSuperAdmin
              ? `Active Hospital Shift: ${shift.name} (${shift.hours}) — Click to configure shift schedule (Admin)`
              : `Active Hospital Shift: ${shift.name} (${shift.hours})`
          }
        >
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${shift.dotColor} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${shift.dotColor}`}></span>
          </span>
          <span>{shift.name} ({shift.hours})</span>
          {isSuperAdmin && (
            <span className="material-symbols-outlined text-[13px] opacity-70 hover:opacity-100 ml-0.5">edit_calendar</span>
          )}
        </button>

        {/* Guided Tour Trigger Button */}
        <button
          type="button"
          onClick={onStartTour}
          className="hidden 2xl:flex items-center gap-1.5 h-10 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold tap-press transition-colors"
          title="Start interactive walkthrough"
        >
          <span className="material-symbols-outlined text-[16px] text-primary-teal">help</span>
          <span>Tour</span>
        </button>

        {/* STAT Alerts Button */}
        <button
          type="button"
          onClick={onOpenStatAlerts}
          className="flex items-center gap-1.5 h-10 px-2.5 sm:px-3 rounded-xl bg-status-critical-bg text-status-critical hover:bg-red-100 text-xs font-semibold tap-press transition-all border border-red-200/80"
          title="STAT Emergency & Laboratory Alerts"
        >
          <span className="material-symbols-outlined text-[18px]">warning</span>
          <span className="hidden md:inline">STAT</span>
          <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-status-critical text-white tabular-nums">
            {effectiveStatAlerts}
          </span>
        </button>

        {/* Primary Action Button: + Quick Admission */}
        <button
          type="button"
          onClick={onOpenQuickAdmission}
          className="quick-admission-btn hidden sm:flex items-center gap-1.5 h-10 px-3 sm:px-4 rounded-xl bg-primary-teal hover:bg-primary-teal-hover text-white text-xs sm:text-sm font-semibold shadow-xs tap-press transition-all flex-shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span className="hidden lg:inline">+ Quick Admission</span>
          <span className="lg:hidden">+ Admit</span>
        </button>

        {/* User Avatar & Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-primary-teal-subtle tap-press transition-all focus:outline-none"
            aria-expanded={showUserMenu}
            aria-label="User profile menu"
          >
            <div className="w-9 h-9 rounded-full bg-primary-navy text-white flex items-center justify-center font-bold text-xs ring-1 ring-border-subtle shadow-xs">
              {user?.fullName.split(' ').map((n) => n[0]).join('').substring(0, 2) || 'NK'}
            </div>
          </button>

          {/* Contextual dropdown using transitions.dev .t-dropdown rules */}
          <div
            data-origin="top-right"
            className={`t-dropdown absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-xl border border-slate-200/90 py-1.5 z-50 ${
              showUserMenu ? 'is-open' : ''
            }`}
          >
            <div className="px-4 py-2.5 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-900 truncate">{user?.fullName}</p>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">{user?.email}</p>
              <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200/60">
                {user?.role.replace('_', ' ')}
              </span>
            </div>

            {/* System Theme Configuration - Available for ALL users */}
            <div className="px-3.5 py-2.5 border-b border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-primary-teal">palette</span>
                  System Theme
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-teal bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200/60">
                  {theme === 'system' ? `Auto (${effectiveTheme})` : theme}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-xs font-semibold transition-all ${
                    theme === 'light'
                      ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Daylight Clean"
                >
                  <span className="material-symbols-outlined text-[15px] text-amber-500">light_mode</span>
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-xs font-semibold transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-900 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Midnight Clinical"
                >
                  <span className="material-symbols-outlined text-[15px] text-indigo-400">dark_mode</span>
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-xs font-semibold transition-all ${
                    theme === 'system'
                      ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Sync with OS Device"
                >
                  <span className="material-symbols-outlined text-[15px] text-slate-500">devices</span>
                  <span>Auto</span>
                </button>
              </div>
            </div>

            <div className="py-1">
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowShiftModal(true);
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-teal-700 hover:bg-teal-50 flex items-center gap-2.5 transition-colors border-b border-slate-100"
                >
                  <span className="material-symbols-outlined text-[18px] text-teal-600">edit_calendar</span>
                  Configure Hospital Shifts
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(false);
                  onOpenChangePassword?.();
                }}
                className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-slate-400">lock_reset</span>
                Change Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="w-full text-left px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors border-t border-slate-100 mt-1"
              >
                <span className="material-symbols-outlined text-[18px] text-rose-500">logout</span>
                Sign Out Station
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ADMIN EDIT HOSPITAL OPERATIONAL SHIFT SCHEDULE MODAL */}
      {showShiftModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto t-modal-overlay is-open"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowShiftModal(false);
          }}
        >
          <div className="t-modal t-sheet is-open bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden my-auto">
            {/* Mobile Drag/Pull Indicator Handle */}
            <div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-slate-900">
              <div className="w-10 h-1 rounded-full bg-slate-700"></div>
            </div>

            {/* Modal Header (Pinned at top) */}
            <div className="px-5 sm:px-6 py-4 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-teal-950 text-teal-400 border border-teal-800/60 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">schedule</span>
                </span>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white">Hospital Operational Shift Schedule</h2>
                  <p className="text-[11px] text-slate-300">Admin Control • Configure hospital-wide shift hours & active handover</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShiftModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 tap-press transition-colors touch-target"
                title="Close"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveShiftConfig} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-3">
                {/* Morning Shift */}
                <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Morning Operational Shift
                    </span>
                    <span className="text-[10px] uppercase font-bold text-emerald-700">Daytime Standard</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Shift Label</label>
                      <input
                        type="text"
                        value={shiftForm.morningName}
                        onChange={(e) => setShiftForm({ ...shiftForm, morningName: e.target.value })}
                        className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-primary-teal"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Shift Hours</label>
                      <input
                        type="text"
                        value={shiftForm.morningHours}
                        onChange={(e) => setShiftForm({ ...shiftForm, morningHours: e.target.value })}
                        placeholder="e.g. 08:00 - 16:00"
                        className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-300 bg-white font-mono focus:outline-none focus:border-primary-teal"
                      />
                    </div>
                  </div>
                </div>

                {/* Evening Shift */}
                <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Evening Operational Shift
                    </span>
                    <span className="text-[10px] uppercase font-bold text-amber-700">Twilight Cover</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Shift Label</label>
                      <input
                        type="text"
                        value={shiftForm.eveningName}
                        onChange={(e) => setShiftForm({ ...shiftForm, eveningName: e.target.value })}
                        className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-primary-teal"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Shift Hours</label>
                      <input
                        type="text"
                        value={shiftForm.eveningHours}
                        onChange={(e) => setShiftForm({ ...shiftForm, eveningHours: e.target.value })}
                        placeholder="e.g. 16:00 - 00:00"
                        className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-300 bg-white font-mono focus:outline-none focus:border-primary-teal"
                      />
                    </div>
                  </div>
                </div>

                {/* Night Shift */}
                <div className="p-3.5 rounded-xl border border-indigo-200/80 bg-indigo-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      Night Operational Shift
                    </span>
                    <span className="text-[10px] uppercase font-bold text-indigo-700">Nocturnal Coverage</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Shift Label</label>
                      <input
                        type="text"
                        value={shiftForm.nightName}
                        onChange={(e) => setShiftForm({ ...shiftForm, nightName: e.target.value })}
                        className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-primary-teal"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Shift Hours</label>
                      <input
                        type="text"
                        value={shiftForm.nightHours}
                        onChange={(e) => setShiftForm({ ...shiftForm, nightHours: e.target.value })}
                        placeholder="e.g. 00:00 - 08:00"
                        className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-300 bg-white font-mono focus:outline-none focus:border-primary-teal"
                      />
                    </div>
                  </div>
                </div>

                {/* Active Shift Mode Selection */}
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Hospital Active Shift Mode
                  </label>
                  <select
                    value={shiftForm.activeOverride}
                    onChange={(e) => setShiftForm({ ...shiftForm, activeOverride: e.target.value })}
                    className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-primary-teal cursor-pointer"
                  >
                    <option value="">Auto-Detect by Current Clock Time (Recommended)</option>
                    <option value="Morning Shift">Force Active: Morning Shift</option>
                    <option value="Evening Shift">Force Active: Evening Shift</option>
                    <option value="Night Shift">Force Active: Night Shift</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 flex-shrink-0 bg-white sticky bottom-0">
                <button
                  type="button"
                  onClick={() => setShowShiftModal(false)}
                  className="px-3.5 py-2 text-xs rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium tap-press"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingShift}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary-teal hover:bg-primary-teal-hover text-white flex items-center gap-1.5 shadow-xs tap-press"
                >
                  {savingShift && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>Save Shift Schedule</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Floating feedback toast */}
      {shiftFeedback && typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-20 right-6 z-[100] p-3.5 rounded-xl bg-emerald-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2 border border-emerald-700 animate-in fade-in slide-in-from-bottom-2">
          <span className="material-symbols-outlined text-[18px] text-emerald-400">check_circle</span>
          <span>{shiftFeedback}</span>
        </div>,
        document.body
      )}
    </header>
  );
};
