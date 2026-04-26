import { useState, useEffect, useCallback, useRef } from 'react';

type Tab = 'records' | 'plan';

export default function TrainingLog() {
  const [activeTab, setActiveTab] = useState<Tab>('records');
  const [content, setContent] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data =
          activeTab === 'records'
            ? await window.electronAPI.training.getRecords()
            : await window.electronAPI.training.getPlan();
        if (!cancelled) {
          setContent(data);
        }
      } catch {
        /* dev fallback */
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await window.electronAPI.training.getCoachSuggestion(false);
        if (!cancelled) setSuggestion(data);
      } catch {
        /* dev fallback */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSave = useCallback(async () => {
    try {
      if (activeTab === 'records') {
        await window.electronAPI.training.saveRecords(content);
      } else {
        await window.electronAPI.training.savePlan(content);
      }
      if (activeTab === 'records') {
        const data = await window.electronAPI.training.getCoachSuggestion(false);
        setSuggestion(data);
      }
    } catch {
      /* dev fallback */
    }
  }, [activeTab, content]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const data = await window.electronAPI.training.getCoachSuggestion(true);
      setSuggestion(data);
    } catch {
      setSuggestion('Failed to get suggestion');
    } finally {
      setLoading(false);
    }
  };

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    padding: '8px 20px',
    background: activeTab === tab ? 'var(--color-surface)' : 'transparent',
    border: '1px solid var(--color-border)',
    borderBottom: activeTab === tab ? 'none' : '1px solid var(--color-border)',
    borderRadius: activeTab === tab ? '6px 6px 0 0' : 6,
    color: activeTab === tab ? 'var(--color-accent)' : 'var(--color-text-secondary)',
    cursor: 'pointer',
    fontWeight: activeTab === tab ? 600 : 400,
  });

  return (
    <div>
      <h1 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 24 }}>
        训练日志 + AI教练{' '}
        <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-lg)' }}>
          Training Log
        </span>
      </h1>

      <div style={{ display: 'flex', gap: 4, marginBottom: -1, position: 'relative', zIndex: 1 }}>
        <button style={tabStyle('records')} onClick={() => setActiveTab('records')}>
          Records
        </button>
        <button style={tabStyle('plan')} onClick={() => setActiveTab('plan')}>
          Plan
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={handleSave}
        spellCheck={false}
        style={{
          width: '100%',
          minHeight: 300,
          padding: 16,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '0 6px 6px 6px',
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--font-size-base)',
          lineHeight: 1.8,
          resize: 'vertical',
          outline: 'none',
        }}
      />

      <div
        style={{
          marginTop: 24,
          padding: 16,
          background: 'var(--color-surface)',
          borderRadius: 8,
          border: '1px solid var(--color-border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>AI Coach</span>
          <button
            onClick={handleRefresh}
            disabled={loading}
            style={{
              padding: '4px 12px',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              color: 'var(--color-text-secondary)',
              cursor: loading ? 'wait' : 'pointer',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            {loading ? '⏳' : '🔄'} Refresh
          </button>
        </div>
        <div
          style={{
            color: 'var(--color-text-primary)',
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          {loading ? 'Loading...' : suggestion || 'Save training data to get AI coaching suggestions.'}
        </div>
      </div>
    </div>
  );
}
