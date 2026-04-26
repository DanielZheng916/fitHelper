import { useState, useEffect, useCallback } from 'react';

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error';
}

let addToastExternal: ((text: string, type: 'success' | 'error') => void) | null = null;

export function showToast(text: string, type: 'success' | 'error' = 'success') {
  addToastExternal?.(text, type);
}

let nextId = 0;

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, type: 'success' | 'error') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    addToastExternal = addToast;
    return () => {
      addToastExternal = null;
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            padding: '10px 20px',
            background: 'var(--color-surface)',
            borderLeft: `3px solid ${toast.type === 'error' ? 'var(--color-danger)' : 'var(--color-success)'}`,
            borderRadius: 6,
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-sm)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
}
