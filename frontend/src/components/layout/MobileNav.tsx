import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface MobileNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenMobileMenu: () => void;
  onOpenQuickAdmission: () => void;
  statAlertsCount?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentPath,
  onNavigate,
  onOpenMobileMenu,
  onOpenQuickAdmission,
  statAlertsCount = 0,
}) => {
  const { canAccess } = useAuth();

  const navButtons = [
    { id: 'dashboard', label: 'Overview', icon: 'grid_view' },
    { id: 'patients-and-emr', label: 'Patients', icon: 'personal_injury' },
    { id: 'appointments', label: 'Schedule', icon: 'calendar_clock' },
    { id: 'billing-and-payments', label: 'Billing', icon: 'receipt_long' },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)] select-none"
      aria-label="Mobile Navigation"
    >
      <div className="flex items-center justify-around h-14 px-1 max-w-lg mx-auto">
        {navButtons.map((btn) => {
          const hasAccess = canAccess(btn.id);
          const isActive = currentPath === btn.id || (btn.id === 'patients-and-emr' && currentPath === 'emr-desk');

          return (
            <button
              key={btn.id}
              type="button"
              disabled={!hasAccess}
              onClick={() => onNavigate(btn.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 touch-target tap-press transition-colors relative ${
                isActive
                  ? 'text-primary-teal'
                  : hasAccess
                  ? 'text-slate-500 hover:text-slate-800'
                  : 'text-slate-300 opacity-40 cursor-not-allowed'
              }`}
            >
              <div className="relative">
                <span
                  className={`material-symbols-outlined text-[22px] transition-transform ${
                    isActive ? 'scale-110 font-bold' : ''
                  }`}
                >
                  {btn.icon}
                </span>
                {btn.id === 'dashboard' && statAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-status-critical ring-2 ring-white"></span>
                )}
              </div>
              <span
                className={`text-[10px] tracking-tight mt-0.5 truncate max-w-[64px] ${
                  isActive ? 'font-bold text-primary-teal' : 'font-medium text-slate-500'
                }`}
              >
                {btn.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-5 h-0.5 rounded-full bg-primary-teal"></span>
              )}
            </button>
          );
        })}

        {/* Floating Quick Action Button */}
        <button
          type="button"
          onClick={onOpenQuickAdmission}
          className="flex flex-col items-center justify-center -mt-4 bg-primary-teal text-white w-11 h-11 rounded-full shadow-md hover:bg-primary-teal-hover tap-press focus:outline-none ring-2 ring-white"
          title="Rapid Admission"
          aria-label="Rapid Admission"
        >
          <span className="material-symbols-outlined text-[22px]">person_add</span>
        </button>

        {/* More / All Modules Drawer Button */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="flex flex-col items-center justify-center flex-1 py-1 px-1 touch-target tap-press text-slate-500 hover:text-slate-900 transition-colors"
          title="Open full navigation drawer"
          aria-label="Open full navigation drawer"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Modules</span>
        </button>
      </div>
    </nav>
  );
};

