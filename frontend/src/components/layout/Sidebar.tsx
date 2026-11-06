import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ApexCareLogo } from '../common/ApexCareLogo';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenChangePassword?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  onOpenChangePassword,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { user, activeRole, logout, canAccess } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid_view' },
    { id: 'patients-and-emr', label: 'Patients & EMR', icon: 'personal_injury' },
    { id: 'appointments', label: 'Appointments', icon: 'calendar_clock' },
    { id: 'billing-and-payments', label: 'Billing & Payments', icon: 'receipt_long' },
    { id: 'laboratory', label: 'Laboratory', icon: 'science' },
    { id: 'pharmacy', label: 'Pharmacy', icon: 'medication' },
    { id: 'staff-and-doctors', label: 'Staff & Doctors', icon: 'badge' },
    { id: 'reports-and-analytics', label: 'Reports & Analytics', icon: 'insights' },
    { id: 'audit-logs', label: 'Audit Logs', icon: 'security' },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen w-[260px] bg-slate-900 text-slate-100 z-50 flex flex-col justify-between select-none shadow-xl border-r border-slate-800 transition-transform duration-300 ease-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* Hospital Branding Header with Mobile Close Action */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800 bg-slate-950/70">
            <ApexCareLogo variant="dark" />
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 tap-press transition-colors touch-target"
              title="Close Navigation Drawer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Authenticated Role Status Badge */}
          <div className="px-4 pt-3.5 pb-2">
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold truncate">
                  Role Access
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/60 tracking-wide">
                {activeRole.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Primary Navigation Menu */}
          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
            {navItems.map((item) => {
              const hasAccess = canAccess(item.id);
              const isActive = currentPath === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    onCloseMobile?.();
                  }}
                  disabled={!hasAccess}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all tap-press ${
                    isActive
                      ? 'bg-primary-teal text-white font-semibold shadow-xs'
                      : hasAccess
                      ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      : 'text-slate-500 opacity-30 cursor-not-allowed hover:bg-transparent'
                  }`}
                  title={!hasAccess ? `Access restricted (${item.label})` : undefined}
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  <span className="text-sm font-medium truncate">{item.label}</span>
                  {!hasAccess && (
                    <span className="material-symbols-outlined text-[15px] ml-auto text-slate-500" title="Restricted">
                      lock
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile Card at Sidebar Base with Quick Actions */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-cyan-700 text-white flex items-center justify-center font-bold text-xs ring-1 ring-cyan-400/30">
                  {user?.fullName.split(' ').map((n) => n[0]).join('').substring(0, 2) || 'NK'}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-status-success rounded-full ring-2 ring-slate-900" title="Online Clinical Session"></span>
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-white truncate">
                  {user?.fullName || 'Active User'}
                </span>
                <span className="text-[10px] text-cyan-300/80 truncate">
                  {user?.jobTitle || user?.role}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={onOpenChangePassword}
                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 tap-press transition-colors"
                title="Change Password"
              >
                <span className="material-symbols-outlined text-[18px]">lock_reset</span>
              </button>
              <button
                type="button"
                onClick={logout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 tap-press transition-colors"
                title="Sign Out"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
