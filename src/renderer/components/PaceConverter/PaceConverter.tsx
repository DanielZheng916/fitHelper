import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import FirstUseHint from '../Onboarding/FirstUseHint';

interface HistoryRecord {
  id: number;
  inputValue: string;
  inputUnit: string;
  outputValue: string;
  outputUnit: string;
  createdAt: string;
}

function formatUnit(unit: string): string {
  return unit === 'mph' ? 'mph' : 'min/km';
}

export default function PaceConverter() {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [fromUnit, setFromUnit] = useState<'mph' | 'min_km'>('mph');
  const [result, setResult] = useState('');
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const data = await window.electronAPI.converter.getHistory();
      setHistory(data);
    } catch {
      /* electronAPI unavailable in dev */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await window.electronAPI.converter.getHistory();
        if (!cancelled) setHistory(data);
      } catch {
        /* electronAPI unavailable in dev */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const doConvert = useCallback(
    async (value: string, unit: 'mph' | 'min_km') => {
      if (!value.trim()) {
        setResult('');
        setError('');
        return;
      }
      try {
        const res = await window.electronAPI.converter.convert(value, unit);
        if (res.result) {
          setResult(res.result);
          setError('');
          loadHistory();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : t('converter.invalidInput'));
        setResult('');
      }
    },
    [loadHistory, t]
  );

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doConvert(value, fromUnit), 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      doConvert(inputValue, fromUnit);
    }
  };

  const handleSwap = () => {
    const newUnit = fromUnit === 'mph' ? 'min_km' : 'mph';
    setFromUnit(newUnit);
    setInputValue('');
    setResult('');
    setError('');
  };

  const toUnit = fromUnit === 'mph' ? 'min_km' : 'mph';

  return (
    <div>
      <FirstUseHint toolId={1}>{t('onboarding.hint.tool1')}</FirstUseHint>
      <h1 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 24 }}>
        {t('converter.title')}{' '}
        <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-lg)' }}>
          {t('converter.subtitle')}
        </span>
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 4 }}>
            {formatUnit(fromUnit)}
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={fromUnit === 'mph' ? '5.2' : '6:46'}
            style={{
              width: 160,
              padding: '10px 12px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-lg)',
              outline: 'none',
            }}
          />
        </div>

        <button
          onClick={handleSwap}
          title="Swap direction"
          style={{
            marginTop: 18,
            padding: '8px 14px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            color: 'var(--color-accent)',
            fontSize: 'var(--font-size-lg)',
          }}
        >
          {t('converter.swap')}
        </button>

        <div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 4 }}>
            {formatUnit(toUnit)}
          </div>
          <div
            style={{
              width: 160,
              padding: '10px 12px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-lg)',
              minHeight: 44,
              color: result ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            }}
          >
            {result || '—'}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)', marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <h3 style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-secondary)', marginBottom: 12 }}>
          {t('converter.recentTitle')}
        </h3>
        {history.length === 0 ? (
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            {t('converter.noHistory')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {history.map((h) => (
              <div
                key={h.id}
                style={{
                  padding: '8px 12px',
                  background: 'var(--color-surface)',
                  borderRadius: 6,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--font-size-sm)',
                }}
              >
                {h.inputValue} {formatUnit(h.inputUnit)} → {h.outputValue} {formatUnit(h.outputUnit)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
