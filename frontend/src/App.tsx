import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RealtimeProvider, useRealtime } from './context/RealtimeContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './features/dashboard/DashboardView';
import { PatientsView } from './features/patients/PatientsView';
import { EmrDeskView } from './features/emr/EmrDeskView';
import { AppointmentsView } from './features/appointments/AppointmentsView';
import { BillingTerminalView } from './features/billing/BillingTerminalView';
import { LaboratoryView } from './features/laboratory/LaboratoryView';
import { PharmacyView } from './features/pharmacy/PharmacyView';
import { StaffView } from './features/staff/StaffView';
import { ReportsView } from './features/reports/ReportsView';
import { AuditLogsView } from './features/audit/AuditLogsView';
import { LoginView } from './features/auth/LoginView';
import { QuickAdmissionModal } from './components/modals/QuickAdmissionModal';
import { StatAlertsModal } from './components/modals/StatAlertsModal';
import { ChangePasswordModal } from './components/modals/ChangePasswordModal';
import { StaffOnboardingTour } from './components/onboarding/StaffTour';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 1000,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    },
  },
});

const MainLayout: React.FC = () => {
  const { user, canAccess } = useAuth();
  const { telemetry } = useRealtime();
  const [currentPath, setCurrentPath] = useState<string>('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedBillingMrn, setSelectedBillingMrn] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);

  // Modals state
  const [isQuickAdmissionOpen, setIsQuickAdmissionOpen] = useState(false);
  const [isStatAlertsOpen, setIsStatAlertsOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [runTour, setRunTour] = useState(false);

  // Automatically enforce role-based module navigation
  React.useEffect(() => {
    if (user && currentPath !== 'dashboard' && currentPath !== 'emr-desk' && !canAccess(currentPath)) {
      setCurrentPath('dashboard');
    }
  }, [user?.role, currentPath]);

  // If not logged in, render Login View
  if (!user) {
    return <LoginView onLoginSuccess={() => setCurrentPath('dashboard')} />;
  }

  const handleGlobalSearch = (q: string) => {
    setSearchQuery(q);
    if (q.trim()) {
      if (currentPath !== 'patients-and-emr' && currentPath !== 'billing-and-payments') {
        setCurrentPath('patients-and-emr');
      }
    }
  };

  const handleOpenEmr = (patientId?: string) => {
    setSelectedPatientId(patientId || '');
    setCurrentPath('emr-desk');
  };

  const handleOpenBilling = (mrn: string) => {
    setSelectedBillingMrn(mrn || '');
    setCurrentPath('billing-and-payments');
  };

  const handleOpenBooking = (patientId: string) => {
    setSelectedPatientId(patientId || '');
    setCurrentPath('appointments');
  };

  return (
    <div className="min-h-screen bg-bg-canvas font-sans text-on-surface">
      {/* Onboarding Guided Tour (Joyride) */}
      <StaffOnboardingTour manualRun={runTour} onTourComplete={() => setRunTour(false)} />

      {/* 260px Left Sidebar (Off-canvas on mobile, fixed on desktop) */}
      <Sidebar
        currentPath={currentPath === 'emr-desk' ? 'patients-and-emr' : currentPath}
        onNavigate={(path) => {
          setCurrentPath(path);
          setIsMobileNavOpen(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* Main Content Area (Offset by 260px on desktop, 0 on mobile) */}
      <div className="pl-0 lg:pl-[260px] min-h-screen transition-all flex flex-col">
        {/* Fixed 64px Top Header */}
        <Header
          onOpenQuickAdmission={() => setIsQuickAdmissionOpen(true)}
          onOpenStatAlerts={() => setIsStatAlertsOpen(true)}
          onStartTour={() => setRunTour(true)}
          onSearch={handleGlobalSearch}
          onOpenChangePassword={() => setIsChangePasswordOpen(true)}
          onToggleMobileSidebar={() => setIsMobileNavOpen((prev) => !prev)}
          statAlertsCount={(telemetry?.kpis?.laboratory?.urgent || 0) + (telemetry?.kpis?.pharmacy?.alerts || 0)}
        />

        {/* Dynamic Main Workspace Container - responsive mobile gutters */}
        <main className="pt-20 pb-12 px-3 sm:px-6 lg:px-8 min-h-[calc(100vh-64px)] max-w-7xl mx-auto w-full">
          {currentPath === 'dashboard' && (
            <DashboardView
              onNavigateToEmr={handleOpenEmr}
              onNavigateToAppointments={() => setCurrentPath('appointments')}
              onNavigateToLab={() => setCurrentPath('laboratory')}
              onNavigateToPharmacy={() => setCurrentPath('pharmacy')}
              onNavigateToBilling={() => setCurrentPath('billing-and-payments')}
            />
          )}

          {currentPath === 'patients-and-emr' && (
            <PatientsView
              onOpenEmr={handleOpenEmr}
              onOpenBooking={handleOpenBooking}
              onOpenBilling={handleOpenBilling}
              initialSearchQuery={searchQuery}
            />
          )}

          {currentPath === 'emr-desk' && (
            <EmrDeskView
              patientId={selectedPatientId}
              onNavigateToBilling={handleOpenBilling}
              onNavigateToLab={() => setCurrentPath('laboratory')}
            />
          )}

          {currentPath === 'appointments' && (
            <AppointmentsView
              onOpenEmr={handleOpenEmr}
              preselectedPatientId={selectedPatientId}
            />
          )}

          {currentPath === 'billing-and-payments' && (
            <BillingTerminalView
              initialMrn={selectedBillingMrn}
              onOpenEmr={handleOpenEmr}
            />
          )}

          {currentPath === 'laboratory' && <LaboratoryView />}

          {currentPath === 'pharmacy' && <PharmacyView />}

          {currentPath === 'staff-and-doctors' && <StaffView />}

          {currentPath === 'reports-and-analytics' && <ReportsView />}

          {currentPath === 'audit-logs' && <AuditLogsView />}
        </main>
      </div>

      {/* Rapid Triage Admission Modal */}
      <QuickAdmissionModal
        isOpen={isQuickAdmissionOpen}
        onClose={() => setIsQuickAdmissionOpen(false)}
        onPatientAdmitted={(newPat) => {
          setSelectedPatientId(newPat.id);
          setCurrentPath('emr-desk');
        }}
      />

      {/* STAT Emergency Alerts Modal */}
      <StatAlertsModal
        isOpen={isStatAlertsOpen}
        onClose={() => setIsStatAlertsOpen(false)}
        onNavigateToLab={() => {
          setIsStatAlertsOpen(false);
          setCurrentPath('laboratory');
        }}
        onNavigateToPharmacy={() => {
          setIsStatAlertsOpen(false);
          setCurrentPath('pharmacy');
        }}
      />

      {/* Change Password Modal for Authenticated User */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RealtimeProvider>
          <MainLayout />
        </RealtimeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
