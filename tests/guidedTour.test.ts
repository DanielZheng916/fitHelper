// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock driver.js
const mockDrive = vi.fn();
const mockDestroy = vi.fn();
const mockDriverInstance = {
  drive: mockDrive,
  destroy: mockDestroy,
};

vi.mock('driver.js', () => ({
  driver: vi.fn(() => mockDriverInstance),
}));

// Mock driver.js CSS imports (no-op)
vi.mock('driver.js/dist/driver.css', () => ({}));
vi.mock('../src/renderer/components/Onboarding/driverTheme.css', () => ({}));

// Mock i18next
vi.mock('i18next', () => ({
  default: {
    t: (key: string) => key,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('launchGuidedTour', () => {
  it('creates a driver with 6 steps and calls drive()', async () => {
    const { driver } = await import('driver.js');
    const { launchGuidedTour } = await import(
      '../src/renderer/components/Onboarding/guidedTour'
    );

    const onToolChange = vi.fn();
    launchGuidedTour(onToolChange);

    expect(driver).toHaveBeenCalledTimes(1);
    const config = (driver as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(config.steps).toHaveLength(6);
    expect(mockDrive).toHaveBeenCalled();
  });

  it('tour steps target correct sidebar element IDs', async () => {
    const { driver } = await import('driver.js');
    const { launchGuidedTour } = await import(
      '../src/renderer/components/Onboarding/guidedTour'
    );

    launchGuidedTour(vi.fn());

    const config = (driver as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const steps = config.steps;
    expect(steps[0].element).toBe('#sidebar-tool-1');
    expect(steps[1].element).toBe('#sidebar-tool-2');
    expect(steps[2].element).toBe('#sidebar-tool-3');
    expect(steps[3].element).toBe('#sidebar-tool-4');
    expect(steps[4].element).toBe('#sidebar-tool-5');
    expect(steps[5].element).toBe('#sidebar-lang-toggle');
  });

  it('calls onToolChange when step highlights via onHighlightStarted', async () => {
    const { driver } = await import('driver.js');
    const { launchGuidedTour } = await import(
      '../src/renderer/components/Onboarding/guidedTour'
    );

    const onToolChange = vi.fn();
    launchGuidedTour(onToolChange);

    const config = (driver as ReturnType<typeof vi.fn>).mock.calls[0][0];

    // Simulate onHighlightStarted for steps 1-5 (they have onToolChange side effects)
    for (let i = 0; i < 5; i++) {
      if (config.steps[i].popover?.onPopoverRender) {
        config.steps[i].popover.onPopoverRender();
      }
    }

    expect(onToolChange).toHaveBeenCalledWith(1);
    expect(onToolChange).toHaveBeenCalledWith(2);
    expect(onToolChange).toHaveBeenCalledWith(3);
    expect(onToolChange).toHaveBeenCalledWith(4);
    expect(onToolChange).toHaveBeenCalledWith(5);
  });

  it('sets fithelper-tour-done on destroy', async () => {
    const { driver } = await import('driver.js');
    const { launchGuidedTour } = await import(
      '../src/renderer/components/Onboarding/guidedTour'
    );

    launchGuidedTour(vi.fn());

    const config = (driver as ReturnType<typeof vi.fn>).mock.calls[0][0];
    // Simulate the onDestroyed callback
    expect(config.onDestroyed).toBeDefined();
    config.onDestroyed();

    expect(localStorage.getItem('fithelper-tour-done')).toBe('true');
  });

  it('uses i18n keys for step descriptions', async () => {
    const { driver } = await import('driver.js');
    const { launchGuidedTour } = await import(
      '../src/renderer/components/Onboarding/guidedTour'
    );

    launchGuidedTour(vi.fn());

    const config = (driver as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(config.steps[0].popover.description).toBe('onboarding.tour.step1');
    expect(config.steps[5].popover.description).toBe('onboarding.tour.step6');
  });
});
