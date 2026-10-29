import React, { useState, useEffect } from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';

interface StaffTourProps {
  manualRun?: boolean;
  onTourComplete?: () => void;
}

export const StaffOnboardingTour: React.FC<StaffTourProps> = ({ manualRun = false, onTourComplete }) => {
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    if (manualRun) {
      setRunTour(true);
    } else {
      const isCompleted = localStorage.getItem('hms_tour_completed');
      if (!isCompleted) {
        setRunTour(true);
      }
    }
  }, [manualRun]);

  const steps: Step[] = [
    {
      target: '.global-search-bar',
      content: 'Locate any patient by entering their Medical Record Number (MRN), National ID, or Name.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.kpi-appointments-card',
      content: 'Monitor active appointments, ongoing clinical examinations, and patient wait times.',
      placement: 'bottom',
    },
    {
      target: '.quick-admission-btn',
      content: 'Quickly admit emergency outpatients and allocate hospital ward beds.',
      placement: 'bottom',
    },
    {
      target: '.pharmacy-alerts-panel',
      content: 'Review inventory shortages and batches nearing expiry in real time.',
      placement: 'left',
    },
    {
      target: '.role-switch-selector',
      content: 'ApexCare HMS includes 7 specialized operational roles with Sri Lankan clinical staff accounts and LKR currency settlement.',
      placement: 'top',
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRunTour(false);
      localStorage.setItem('hms_tour_completed', 'true');
      if (onTourComplete) onTourComplete();
    }
  };

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      run={runTour}
      showProgress
      showSkipButton
      steps={steps}
      styles={{
        options: {
          primaryColor: '#0284C7', // Matches --primary-teal
          textColor: '#0F172A', // Matches --primary-navy
          zIndex: 10000,
          backgroundColor: '#FFFFFF',
          overlayColor: 'rgba(15, 23, 42, 0.5)',
          arrowColor: '#FFFFFF',
        },
        buttonNext: {
          backgroundColor: '#0284C7',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          padding: '8px 16px',
        },
        buttonBack: {
          color: '#64748B',
          marginRight: 10,
          fontSize: 13,
        },
        buttonSkip: {
          color: '#64748B',
          fontSize: 13,
        },
      }}
    />
  );
};
