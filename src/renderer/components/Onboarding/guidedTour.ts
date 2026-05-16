import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './driverTheme.css';
import i18next from 'i18next';

export function launchGuidedTour(onToolChange: (id: number) => void): void {
  const tourDriver = driver({
    animate: true,
    showProgress: true,
    steps: [
      {
        element: '#sidebar-tool-1',
        popover: {
          description: i18next.t('onboarding.tour.step1'),
          onPopoverRender: () => onToolChange(1),
        },
      },
      {
        element: '#sidebar-tool-2',
        popover: {
          description: i18next.t('onboarding.tour.step2'),
          onPopoverRender: () => onToolChange(2),
        },
      },
      {
        element: '#sidebar-tool-3',
        popover: {
          description: i18next.t('onboarding.tour.step3'),
          onPopoverRender: () => onToolChange(3),
        },
      },
      {
        element: '#sidebar-tool-4',
        popover: {
          description: i18next.t('onboarding.tour.step4'),
          onPopoverRender: () => onToolChange(4),
        },
      },
      {
        element: '#sidebar-tool-5',
        popover: {
          description: i18next.t('onboarding.tour.step5'),
          onPopoverRender: () => onToolChange(5),
        },
      },
      {
        element: '#sidebar-lang-toggle',
        popover: {
          description: i18next.t('onboarding.tour.step6'),
        },
      },
    ],
    onDestroyed: () => {
      localStorage.setItem('fithelper-tour-done', 'true');
    },
  });

  tourDriver.drive();
}
