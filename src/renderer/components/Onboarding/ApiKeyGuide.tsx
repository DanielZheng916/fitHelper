import { useTranslation } from 'react-i18next';

interface ApiKeyGuideProps {
  onOpenLink?: () => void;
}

export default function ApiKeyGuide({ onOpenLink }: ApiKeyGuideProps) {
  const { t } = useTranslation();

  const handleLinkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenLink) {
      onOpenLink();
    } else {
      window.electronAPI.settings.openKeyManagement();
    }
  };

  const steps: Array<{ key: string; isLink?: boolean }> = [
    { key: 'onboarding.apiKey.step1', isLink: true },
    { key: 'onboarding.apiKey.step2' },
    { key: 'onboarding.apiKey.step3' },
    { key: 'onboarding.apiKey.step4' },
  ];

  return (
    <ol
      style={{
        listStyle: 'none',
        padding: 0,
        margin: '16px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {steps.map((step, i) => (
        <li
          key={step.key}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            fontSize: 'var(--font-size-base)',
            color: 'var(--color-text-primary)',
          }}
        >
          <span
            style={{
              flexShrink: 0,
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'var(--color-accent)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 700,
            }}
          >
            {i + 1}
          </span>
          {step.isLink ? (
            <a
              href="#"
              onClick={handleLinkClick}
              style={{
                color: 'var(--color-accent)',
                textDecoration: 'underline',
                cursor: 'pointer',
                lineHeight: '24px',
              }}
            >
              {t(step.key)}
            </a>
          ) : (
            <span style={{ lineHeight: '24px' }}>{t(step.key)}</span>
          )}
        </li>
      ))}
    </ol>
  );
}
