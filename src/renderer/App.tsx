import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import PaceConverter from './components/PaceConverter/PaceConverter';
import CalorieLibrary from './components/CalorieLibrary/CalorieLibrary';
import DailyTracker from './components/DailyTracker/DailyTracker';
import TrainingLog from './components/TrainingLog/TrainingLog';
import Settings from './components/Settings/Settings';
import ToastContainer from './components/Toast';
import WelcomeWizard from './components/Onboarding/WelcomeWizard';
import { launchGuidedTour } from './components/Onboarding/guidedTour';

export default function App() {
  const [activeTool, setActiveTool] = useState(1);
  const [showWizard, setShowWizard] = useState(
    () => !localStorage.getItem('fithelper-onboarding-done')
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 5) {
          e.preventDefault();
          setActiveTool(num);
        }
      }
      if (e.key === 'Escape') {
        document.dispatchEvent(new CustomEvent('fithelper:escape'));
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const renderContent = () => {
    switch (activeTool) {
      case 1:
        return <PaceConverter />;
      case 2:
        return <CalorieLibrary />;
      case 3:
        return <DailyTracker />;
      case 4:
        return <TrainingLog />;
      case 5:
        return <Settings />;
      default:
        return null;
    }
  };

  const handleWizardComplete = useCallback(
    (startTour: boolean) => {
      localStorage.setItem('fithelper-onboarding-done', 'true');
      setShowWizard(false);
      if (startTour) launchGuidedTour(setActiveTool);
    },
    []
  );

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar activeTool={activeTool} onToolChange={setActiveTool} />
      <main style={{ flex: 1, overflow: 'auto', padding: 32 }}>{renderContent()}</main>
      <ToastContainer />
      {showWizard && <WelcomeWizard onComplete={handleWizardComplete} />}
    </div>
  );
}
