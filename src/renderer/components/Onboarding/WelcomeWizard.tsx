import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ApiKeyGuide from './ApiKeyGuide';

interface WelcomeWizardProps {
  onComplete: (startTour: boolean) => void;
}

type TestStatus = 'idle' | 'testing' | 'valid' | 'invalid';

const TOTAL_STEPS = 4;

// ── Step dot indicator ────────────────────────────────────────────────────────
function StepDots({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '20px 0 8px' }}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: i + 1 === current ? 'var(--color-accent)' : 'var(--color-border)',
            transition: 'background 0.2s',
          }}
        />
      ))}
    </div>
  );
}

// ── Step 1: Welcome ───────────────────────────────────────────────────────────
function Step1({ onNext }: { onNext: () => void }) {
  const { t } = useTranslation();
  return (
    <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
      <div
        style={{
          fontSize: 48,
          marginBottom: 16,
          userSelect: 'none',
        }}
      >
        🏃
      </div>
      <h1
        style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 700,
          color: 'var(--color-accent)',
          marginBottom: 12,
        }}
      >
        {t('onboarding.welcome.title')}
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 32, lineHeight: 1.6 }}>
        {t('onboarding.welcome.subtitle')}
      </p>
      <button onClick={onNext} style={primaryBtnStyle}>
        {t('onboarding.welcome.getStarted')}
      </button>
    </div>
  );
}

// ── Step 2: Feature overview ──────────────────────────────────────────────────
const FEATURE_CARDS = [
  { emoji: '⚡', nameKey: 'sidebar.tool1', descKey: 'onboarding.features.converter' },
  { emoji: '🥗', nameKey: 'sidebar.tool2', descKey: 'onboarding.features.calorie' },
  { emoji: '📅', nameKey: 'sidebar.tool3', descKey: 'onboarding.features.daily' },
  { emoji: '🤖', nameKey: 'sidebar.tool4', descKey: 'onboarding.features.training' },
];

function Step2({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <div>
      <h2
        style={{
          fontSize: 'var(--font-size-lg)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          marginBottom: 20,
          textAlign: 'center',
        }}
      >
        {t('onboarding.features.title')}
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 24,
        }}
      >
        {FEATURE_CARDS.map((card) => (
          <div
            key={card.nameKey}
            style={{
              background: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              padding: '16px 14px',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>{card.emoji}</div>
            <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
              {t(card.nameKey)}
            </div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              {t(card.descKey)}
            </div>
          </div>
        ))}
      </div>
      <div style={footerRowStyle}>
        <button onClick={onBack} style={secondaryBtnStyle}>
          ← Back
        </button>
        <button onClick={onNext} style={primaryBtnStyle}>
          {t('onboarding.welcome.getStarted')} →
        </button>
      </div>
    </div>
  );
}

// ── Step 3: API key setup ─────────────────────────────────────────────────────
function Step3({
  onNext,
  onBack,
  onKeyConfigured,
}: {
  onNext: () => void;
  onBack: () => void;
  onKeyConfigured: (configured: boolean) => void;
}) {
  const { t } = useTranslation();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [status, setStatus] = useState<TestStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleTestAndSave = async () => {
    if (!apiKeyInput.trim()) return;
    setStatus('testing');
    setErrorMsg('');
    try {
      const result = await window.electronAPI.settings.testApiKey(apiKeyInput.trim());
      if (result.valid) {
        await window.electronAPI.settings.setApiKey(apiKeyInput.trim());
        setStatus('valid');
        onKeyConfigured(true);
      } else {
        setStatus('invalid');
        setErrorMsg(result.error ?? 'Unknown error');
      }
    } catch (err) {
      setStatus('invalid');
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleSkip = () => {
    onKeyConfigured(false);
    onNext();
  };

  const isValidated = status === 'valid';

  return (
    <div>
      <h2
        style={{
          fontSize: 'var(--font-size-lg)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          marginBottom: 8,
        }}
      >
        {t('onboarding.apiKey.title')}
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 4, lineHeight: 1.6 }}>
        {t('onboarding.apiKey.description')}
      </p>

      <ApiKeyGuide />

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          type="password"
          value={apiKeyInput}
          onChange={(e) => {
            setApiKeyInput(e.target.value);
            if (status !== 'idle') setStatus('idle');
          }}
          placeholder={t('settings.apiKeyPlaceholder')}
          disabled={status === 'testing' || isValidated}
          style={{
            flex: 1,
            padding: '8px 12px',
            background: 'var(--color-bg-primary)',
            border: `1px solid ${
              status === 'valid'
                ? 'var(--color-success)'
                : status === 'invalid'
                  ? 'var(--color-danger)'
                  : 'var(--color-border)'
            }`,
            borderRadius: 4,
            color: 'var(--color-text-primary)',
            outline: 'none',
          }}
        />
        <button
          onClick={isValidated ? onNext : handleTestAndSave}
          disabled={status === 'testing' || (!isValidated && !apiKeyInput.trim())}
          style={{
            ...primaryBtnStyle,
            opacity: status === 'testing' || (!isValidated && !apiKeyInput.trim()) ? 0.6 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {status === 'testing'
            ? t('onboarding.apiKey.testing')
            : isValidated
              ? 'Next →'
              : t('onboarding.apiKey.testAndSave')}
        </button>
      </div>

      {status === 'valid' && (
        <p style={{ color: 'var(--color-success)', fontSize: 'var(--font-size-sm)', marginBottom: 4 }}>
          ✓ {t('onboarding.apiKey.valid')}
        </p>
      )}
      {status === 'invalid' && (
        <p style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)', marginBottom: 4 }}>
          ✗ {t('onboarding.apiKey.invalid', { error: errorMsg })}
        </p>
      )}

      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onBack} style={secondaryBtnStyle}>
          ← Back
        </button>
        {!isValidated && (
          <button onClick={handleSkip} style={linkBtnStyle}>
            {t('onboarding.apiKey.skip')}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Step 4: Done ──────────────────────────────────────────────────────────────
function Step4({
  keyConfigured,
  onComplete,
}: {
  keyConfigured: boolean;
  onComplete: (startTour: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
      <div style={{ fontSize: 48, marginBottom: 16, userSelect: 'none' }}>🎉</div>
      <h2
        style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 700,
          color: 'var(--color-accent)',
          marginBottom: 12,
        }}
      >
        {t('onboarding.done.title')}
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 32, lineHeight: 1.6 }}>
        {keyConfigured ? t('onboarding.done.keyConfigured') : t('onboarding.done.keySkipped')}
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => onComplete(true)} style={secondaryBtnStyle}>
          {t('onboarding.done.takeTour')}
        </button>
        <button onClick={() => onComplete(false)} style={primaryBtnStyle}>
          {t('onboarding.done.startApp')}
        </button>
      </div>
    </div>
  );
}

// ── Main WelcomeWizard ────────────────────────────────────────────────────────
export default function WelcomeWizard({ onComplete }: WelcomeWizardProps) {
  const [step, setStep] = useState(1);
  const [keyConfigured, setKeyConfigured] = useState(false);

  const goNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 580,
          background: 'var(--color-bg-primary)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          padding: '32px 36px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          animation: 'fadeIn 0.25s ease',
        }}
      >
        {step === 1 && <Step1 onNext={goNext} />}
        {step === 2 && <Step2 onNext={goNext} onBack={goBack} />}
        {step === 3 && (
          <Step3
            onNext={goNext}
            onBack={goBack}
            onKeyConfigured={(configured) => {
              setKeyConfigured(configured);
            }}
          />
        )}
        {step === 4 && <Step4 keyConfigured={keyConfigured} onComplete={onComplete} />}

        <StepDots current={step} />
      </div>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  background: 'var(--color-accent)',
  border: 'none',
  borderRadius: 6,
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: 'var(--font-size-base)',
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  background: 'transparent',
  border: '1px solid var(--color-border)',
  borderRadius: 6,
  color: 'var(--color-text-primary)',
  cursor: 'pointer',
  fontSize: 'var(--font-size-base)',
};

const linkBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
  textDecoration: 'underline',
  fontSize: 'var(--font-size-sm)',
  padding: '4px 0',
};

const footerRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};
