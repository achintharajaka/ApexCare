import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRealtime } from '../../context/RealtimeContext';

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
  const { isConnected, connectionStatus, lastSyncTime, triggerManualSync, telemetry } = useRealtime();
  const [searchVal, setSearchVal] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [shift, setShift] = useState<ShiftInfo>(getLiveHospitalShift);

  const effectiveStatAlerts = statAlertsCount > 0 
    ? statAlertsCount 
    : (telemetry?.kpis?.laboratory?.urgent || 0) + (telemetry?.kpis?.pharmacy?.alerts || 0);

  useEffect(() => {
    const timer = setInterval(() => {
      setShift(getLiveHospitalShift());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      onSearch(searchVal.trim());
    }
  };

  return (
    <header className="fixed top-0 left-0 lg:left-[260px] right-0 h-16 bg-bg-surface border-b border-border-subtle z-30 flex items-center justify-between px-3 sm:px-6 lg:px-8 shadow-sm transition-all">
      {/* Mobile Hamburger & Global Search */}
      <div className="flex items-center gap-1 sm:gap-space-md flex-1 max-w-xl min-w-0">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 -ml-1 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus:outline-none transition-colors flex-shrink-0"
          title="Open navigation menu"
          aria-label="Open navigation menu"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>

        <form onSubmit={handleSearchSubmit} className="relative w-full global-search-bar">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
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
            className="w-full h-[38px] pl-9 pr-3 rounded-lg bg-bg-surface-subtle border border-border-strong text-body-default font-body-default placeholder:text-outline text-on-surface focus:outline-none focus:border-primary-teal focus:ring-2 focus:ring-primary-teal-subtle transition-all text-xs sm:text-sm"
          />
        </form>
      </div>

      {/* Right Command & Action Center */}
      <div className="flex items-center gap-1.5 sm:gap-space-md flex-shrink-0 ml-2">
        {/* Live Backend Connection Indicator (Always Connected Realtime Stream) */}
        <button
          type="button"
          onClick={triggerManualSync}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
            isConnected
              ? 'bg-emerald-50 border-emerald-200/90 text-emerald-800 hover:bg-emerald-100 shadow-2xs'
              : connectionStatus === 'connecting'
              ? 'bg-amber-50 border-amber-200 text-amber-800 animate-pulse'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
          title={`Backend Realtime Connection: ${
            isConnected ? 'Online & Constant Sync Active (Click to refresh)' : 'Reconnecting to ApexCare Core...'
          }`}
        >
          <span className="relative flex h-2 w-2">
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
            {isConnected ? 'Backend Connected' : connectionStatus === 'connecting' ? 'Connecting...' : 'Offline (Retrying)'}
          </span>
          <span className="xl:hidden font-bold">
            {isConnected ? 'Live' : 'Syncing'}
          </span>
        </button>

        {/* Real-time Hospital Shift Indicator */}
        <div
          className={`hidden lg:flex items-center gap-space-xs px-space-sm py-1 rounded-full ${shift.badgeBg} ${shift.textColor} shadow-2xs transition-all`}
          title={`Active Hospital Shift: ${shift.name} (${shift.hours})`}
        >
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${shift.dotColor} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${shift.dotColor}`}></span>
          </span>
          <span className="font-badge-sm text-badge-sm font-semibold">
            {shift.name} ({shift.hours})
          </span>
        </div>

        {/* Guided Tour Trigger Button */}
        <button
          type="button"
          onClick={onStartTour}
          className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border-subtle bg-bg-surface hover:bg-bg-surface-subtle text-slate-700 font-title-sm text-xs transition-colors"
          title="Start interactive walkthrough"
        >
          <span className="material-symbols-outlined text-[16px] text-primary-teal">help</span>
          <span>Tour Guide</span>
        </button>

        {/* STAT Alerts Button */}
        <button
          type="button"
          onClick={onOpenStatAlerts}
          className="flex items-center gap-1 sm:gap-space-xs px-2 sm:px-space-sm py-1.5 rounded-lg bg-status-critical-bg text-status-critical hover:bg-status-critical hover:text-white transition-all shadow-sm"
          title="STAT Emergency & Laboratory Alerts"
        >
          <span className="material-symbols-outlined text-[18px]">warning</span>
          <span className="hidden sm:inline font-title-sm text-title-sm font-semibold">STAT Alerts</span>
          <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[11px] font-bold rounded-full bg-status-critical text-white">
            {effectiveStatAlerts}
          </span>
        </button>

        {/* Primary Action Button: + Quick Admission */}
        <button
          type="button"
          onClick={onOpenQuickAdmission}
          className="quick-admission-btn flex items-center gap-1 sm:gap-space-xs h-[38px] px-2.5 sm:px-space-md rounded-lg bg-primary-teal hover:bg-primary-teal-hover text-white font-title-sm text-title-sm shadow-sm transition-all transform active:scale-95 flex-shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span className="hidden sm:inline">+ Quick Admission</span>
          <span className="sm:hidden text-xs font-semibold">+ Admit</span>
        </button>

        {/* User Avatar & Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-primary-teal-subtle transition-all focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-primary-navy text-white flex items-center justify-center font-bold text-xs ring-1 ring-border-subtle shadow-sm">
              {user?.fullName.split(' ').map((n) => n[0]).join('').substring(0, 2) || 'NK'}
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-lg bg-white shadow-xl border border-border-subtle py-1 z-50 animate-fadeIn">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900 truncate">{user?.fullName}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-800">
                  {user?.role}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(false);
                  onOpenChangePassword?.();
                }}
                className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-b border-slate-50"
              >
                <span className="material-symbols-outlined text-[16px] text-slate-500">lock_reset</span>
                Change Password
              </button>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
