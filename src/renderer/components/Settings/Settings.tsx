import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function Settings() {
  const { t } = useTranslation();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    let cancelled = false;
    window.electronAPI.settings.getApiKeyStatus().then(({ configured: c }) => {
      if (!cancelled) setConfigured(c);
    });
    return () => { cancelled = true; };
  }, []);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSave = async () => {
    if (!keyInput.trim()) return;
    setSaving(true);
    try {
      await window.electronAPI.settings.setApiKey(keyInput.trim());
      setKeyInput('');
      setConfigured(true);
      showMessage(t('settings.saveSuccess'), 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      showMessage(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    try {
      await window.electronAPI.settings.clearApiKey();
      setConfigured(false);
      showMessage(t('settings.clearSuccess'), 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      showMessage(msg, 'error');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && keyInput.trim()) {
      handleSave();
    }
  };

  return (
    <div style={{ maxWidth: 520 }}>
      <h1 style={{ fontSize: 'var(--font-size-xl)', color: 'var(--color-text-primary)', margin: 0 }}>
        {t('settings.title')}
      </h1>
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
        {t('settings.subtitle')}
      </p>

      <div
        style={{
          marginTop: 28,
          padding: '20px 24px',
          background: 'var(--color-surface)',
          borderRadius: 8,
          border: '1px solid var(--color-border)',
        }}
      >
        <label
          style={{
            display: 'block',
            fontSize: 'var(--font-size-base)',
            color: 'var(--color-text-primary)',
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          {t('settings.apiKeyLabel')}
        </label>

        {configured !== null && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 6,
              marginBottom: 16,
              fontSize: 'var(--font-size-sm)',
              background: configured ? 'rgba(74, 222, 128, 0.1)' : 'rgba(251, 191, 36, 0.1)',
              color: configured ? 'var(--color-success)' : 'var(--color-warning)',
              border: `1px solid ${configured ? 'rgba(74, 222, 128, 0.2)' : 'rgba(251, 191, 36, 0.2)'}`,
            }}
          >
            {configured ? t('settings.statusConfigured') : t('settings.statusNotConfigured')}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('settings.apiKeyPlaceholder')}
            style={{
              flex: 1,
              padding: '10px 14px',
              background: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-base)',
              fontFamily: '"SF Mono", "Menlo", monospace',
              outline: 'none',
            }}
          />
          <button
            onClick={handleSave}
            disabled={saving || !keyInput.trim()}
            style={{
              padding: '10px 20px',
              background: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 'var(--font-size-base)',
              cursor: saving || !keyInput.trim() ? 'not-allowed' : 'pointer',
              opacity: saving || !keyInput.trim() ? 0.5 : 1,
              transition: 'opacity 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {t('settings.save')}
          </button>
        </div>

        {configured && (
          <button
            onClick={handleClear}
            style={{
              marginTop: 12,
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid var(--color-danger)',
              borderRadius: 6,
              color: 'var(--color-danger)',
              fontSize: 'var(--font-size-sm)',
              cursor: 'pointer',
            }}
          >
            {t('settings.clear')}
          </button>
        )}

        {message && (
          <div
            style={{
              marginTop: 12,
              padding: '8px 12px',
              borderRadius: 6,
              fontSize: 'var(--font-size-sm)',
              color: message.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
            }}
          >
            {message.text}
          </div>
        )}
      </div>

      <p
        style={{
          marginTop: 16,
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.6,
        }}
      >
        {t('settings.securityNote')}
      </p>
    </div>
  );
}
