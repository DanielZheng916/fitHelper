// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WelcomeWizard from '../src/renderer/components/Onboarding/WelcomeWizard';

// ── i18n mock ─────────────────────────────────────────────────────────────────
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts?.error) return `${key}:${opts.error}`;
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

// ── electronAPI mock ──────────────────────────────────────────────────────────
const mockTestApiKey = vi.fn();
const mockSetApiKey = vi.fn();
const mockOpenKeyManagement = vi.fn();

beforeEach(() => {
  mockTestApiKey.mockReset();
  mockSetApiKey.mockReset();
  mockOpenKeyManagement.mockReset();

  Object.defineProperty(window, 'electronAPI', {
    value: {
      settings: {
        testApiKey: mockTestApiKey,
        setApiKey: mockSetApiKey,
        openKeyManagement: mockOpenKeyManagement,
      },
    },
    configurable: true,
    writable: true,
  });

  localStorage.clear();
});

// ── Navigation helpers ────────────────────────────────────────────────────────
function clickGetStarted() {
  fireEvent.click(screen.getByText('onboarding.welcome.getStarted'));
}

/** On step 2 the last button in the footer is the "Next" button */
function clickNextOnStep2() {
  const btns = screen.getAllByRole('button');
  fireEvent.click(btns[btns.length - 1]);
}

function clickSkip() {
  fireEvent.click(screen.getByText('onboarding.apiKey.skip'));
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('WelcomeWizard step navigation', () => {
  it('starts on step 1 and shows welcome content', () => {
    render(<WelcomeWizard onComplete={vi.fn()} />);
    expect(screen.getByText('onboarding.welcome.title')).toBeInTheDocument();
    expect(screen.getByText('onboarding.welcome.getStarted')).toBeInTheDocument();
  });

  it('advances from step 1 to step 2 on Get Started click', () => {
    render(<WelcomeWizard onComplete={vi.fn()} />);
    clickGetStarted();
    expect(screen.getByText('onboarding.features.title')).toBeInTheDocument();
  });

  it('advances from step 2 to step 3 on Next click', () => {
    render(<WelcomeWizard onComplete={vi.fn()} />);
    clickGetStarted();
    clickNextOnStep2();
    expect(screen.getByText('onboarding.apiKey.title')).toBeInTheDocument();
  });

  it('can go back from step 2 to step 1', () => {
    render(<WelcomeWizard onComplete={vi.fn()} />);
    clickGetStarted();
    expect(screen.getByText('onboarding.features.title')).toBeInTheDocument();

    // The first button in step 2 footer is "Back"
    const btns = screen.getAllByRole('button');
    fireEvent.click(btns[0]);
    expect(screen.getByText('onboarding.welcome.title')).toBeInTheDocument();
  });
});

describe('WelcomeWizard — API key setup (step 3)', () => {
  function goToStep3() {
    render(<WelcomeWizard onComplete={vi.fn()} />);
    clickGetStarted();      // 1 → 2
    clickNextOnStep2();     // 2 → 3
  }

  it('shows API key setup heading on step 3', () => {
    goToStep3();
    expect(screen.getByText('onboarding.apiKey.title')).toBeInTheDocument();
  });

  it('"Skip for now" advances to step 4', () => {
    goToStep3();
    clickSkip();
    expect(screen.getByText('onboarding.done.title')).toBeInTheDocument();
  });

  it('"Test & Save" shows valid state and calls setApiKey on success', async () => {
    mockTestApiKey.mockResolvedValueOnce({ valid: true });
    mockSetApiKey.mockResolvedValueOnce(undefined);

    goToStep3();

    const input = screen.getByPlaceholderText('settings.apiKeyPlaceholder');
    fireEvent.change(input, { target: { value: 'sk-test-123' } });

    fireEvent.click(screen.getByText('onboarding.apiKey.testAndSave'));

    await waitFor(() =>
      expect(screen.getByText(/onboarding\.apiKey\.valid/)).toBeInTheDocument()
    );

    expect(mockTestApiKey).toHaveBeenCalledWith('sk-test-123');
    expect(mockSetApiKey).toHaveBeenCalledWith('sk-test-123');
  });

  it('"Test & Save" shows invalid state and does NOT call setApiKey on failure', async () => {
    mockTestApiKey.mockResolvedValueOnce({ valid: false, error: 'Bad key' });

    goToStep3();

    const input = screen.getByPlaceholderText('settings.apiKeyPlaceholder');
    fireEvent.change(input, { target: { value: 'sk-bad' } });

    fireEvent.click(screen.getByText('onboarding.apiKey.testAndSave'));

    await waitFor(() =>
      expect(screen.getByText(/onboarding\.apiKey\.invalid/)).toBeInTheDocument()
    );

    expect(mockSetApiKey).not.toHaveBeenCalled();
  });
});

describe('WelcomeWizard — step 4 and completion', () => {
  function goToStep4() {
    const onComplete = vi.fn();
    render(<WelcomeWizard onComplete={onComplete} />);
    clickGetStarted();      // 1 → 2
    clickNextOnStep2();     // 2 → 3
    clickSkip();            // 3 → 4 (skip API key)
    return onComplete;
  }

  it('shows done heading on step 4', () => {
    goToStep4();
    expect(screen.getByText('onboarding.done.title')).toBeInTheDocument();
  });

  it('"Start Using FitHelper" calls onComplete(false)', () => {
    const onComplete = goToStep4();
    fireEvent.click(screen.getByText('onboarding.done.startApp'));
    expect(onComplete).toHaveBeenCalledWith(false);
  });

  it('"Take a Quick Tour" calls onComplete(true)', () => {
    const onComplete = goToStep4();
    fireEvent.click(screen.getByText('onboarding.done.takeTour'));
    expect(onComplete).toHaveBeenCalledWith(true);
  });
});
