// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import FirstUseHint from '../src/renderer/components/Onboarding/FirstUseHint';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

describe('FirstUseHint', () => {
  it('renders hint when localStorage key is absent', () => {
    render(<FirstUseHint toolId={1}>Hello hint</FirstUseHint>);
    expect(screen.getByText('Hello hint')).toBeInTheDocument();
  });

  it('does NOT render when localStorage key is present', () => {
    localStorage.setItem('fithelper-hint-seen-2', 'true');
    render(<FirstUseHint toolId={2}>Should not appear</FirstUseHint>);
    expect(screen.queryByText('Should not appear')).not.toBeInTheDocument();
  });

  it('sets localStorage and hides on dismiss click', () => {
    render(<FirstUseHint toolId={3}>Dismissable hint</FirstUseHint>);
    expect(screen.getByText('Dismissable hint')).toBeInTheDocument();

    const dismissBtn = screen.getByTitle('Dismiss');
    fireEvent.click(dismissBtn);

    // After clicking, the fade-out animation starts (200ms)
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(localStorage.getItem('fithelper-hint-seen-3')).toBe('true');
    expect(screen.queryByText('Dismissable hint')).not.toBeInTheDocument();
  });

  it('renders children content correctly', () => {
    render(
      <FirstUseHint toolId={5}>
        <span data-testid="child">Custom child</span>
      </FirstUseHint>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
