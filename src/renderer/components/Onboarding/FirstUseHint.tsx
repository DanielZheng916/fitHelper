import { useState } from 'react';

interface FirstUseHintProps {
  toolId: number;
  children: React.ReactNode;
}

export default function FirstUseHint({ toolId, children }: FirstUseHintProps) {
  const key = `fithelper-hint-seen-${toolId}`;
  const [visible, setVisible] = useState(() => !localStorage.getItem(key));
  const [fading, setFading] = useState(false);

  if (!visible) return null;

  const handleDismiss = () => {
    localStorage.setItem(key, 'true');
    setFading(true);
    setTimeout(() => setVisible(false), 200);
  };

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderLeft: '3px solid var(--color-accent)',
        borderTop: '1px solid var(--color-border)',
        borderRight: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        borderRadius: 6,
        padding: '12px 16px',
        marginBottom: 16,
        position: 'relative',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.2s ease',
      }}
    >
      <div
        style={{
          paddingRight: 24,
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-primary)',
          lineHeight: 1.6,
        }}
      >
        {children}
      </div>
      <button
        onClick={handleDismiss}
        title="Dismiss"
        style={{
          position: 'absolute',
          top: 10,
          right: 12,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-secondary)',
          fontSize: 16,
          lineHeight: 1,
          padding: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
