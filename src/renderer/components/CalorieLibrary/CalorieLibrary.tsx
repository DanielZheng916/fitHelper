import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import FirstUseHint from '../Onboarding/FirstUseHint';

interface CalorieItem {
  id: number;
  name: string;
  calories: string;
  category: '主食' | '小食' | '酒';
  sortOrder: number;
  isPreset: boolean;
  createdAt: string;
  updatedAt: string;
}

type Category = '主食' | '小食' | '酒';
const CATEGORIES: Category[] = ['主食', '小食', '酒'];

export default function CalorieLibrary() {
  const { t } = useTranslation();
  const [items, setItems] = useState<CalorieItem[]>([]);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editCalories, setEditCalories] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCalories, setNewCalories] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('主食');

  const loadItems = useCallback(async () => {
    try {
      const data = await window.electronAPI.calorie.getAll();
      setItems(data);
    } catch {
      /* dev fallback */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await window.electronAPI.calorie.getAll();
        if (!cancelled) setItems(data);
      } catch {
        /* dev fallback */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleEscape = () => {
      setEditingId(null);
      setShowAdd(false);
    };
    document.addEventListener('fithelper:escape', handleEscape);
    return () => document.removeEventListener('fithelper:escape', handleEscape);
  }, []);

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = CATEGORIES.map((cat) => ({
    category: cat,
    items: filtered.filter((i) => i.category === cat),
  }));

  const handleAdd = async () => {
    if (!newName.trim() || !newCalories.trim()) return;
    const maxOrder = items
      .filter((i) => i.category === newCategory)
      .reduce((max, i) => Math.max(max, i.sortOrder), 0);
    await window.electronAPI.calorie.create({
      name: newName.trim(),
      calories: newCalories.trim(),
      category: newCategory,
      sortOrder: maxOrder + 1,
      isPreset: false,
    });
    setNewName('');
    setNewCalories('');
    setShowAdd(false);
    loadItems();
  };

  const handleEdit = (item: CalorieItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditCalories(item.calories);
  };

  const handleSaveEdit = async (item: CalorieItem) => {
    await window.electronAPI.calorie.update({
      ...item,
      name: editName.trim(),
      calories: editCalories.trim(),
    });
    setEditingId(null);
    loadItems();
  };

  const handleDelete = async (id: number) => {
    await window.electronAPI.calorie.delete(id);
    loadItems();
  };

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 4,
    color: 'var(--color-text-primary)',
    outline: 'none',
  };

  const btnStyle: React.CSSProperties = {
    padding: '4px 10px',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: 4,
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    fontSize: 'var(--font-size-sm)',
  };

  return (
    <div>
      <FirstUseHint toolId={2}>{t('onboarding.hint.tool2')}</FirstUseHint>
      <h1 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 24 }}>
        {t('calorie.title')}{' '}
        <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-lg)' }}>
          {t('calorie.subtitle')}
        </span>
      </h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <input
          type="text"
          placeholder={t('calorie.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{
            padding: '8px 16px',
            background: 'var(--color-accent)',
            border: 'none',
            borderRadius: 6,
            color: '#fff',
            fontWeight: 600,
          }}
        >
          {t('calorie.add')}
        </button>
      </div>

      {showAdd && (
        <div
          style={{
            padding: 16,
            background: 'var(--color-surface)',
            borderRadius: 8,
            marginBottom: 24,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-end',
          }}
        >
          <div>
            <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>{t('calorie.name')}</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>{t('calorie.calories')}</label>
            <input value={newCalories} onChange={(e) => setNewCalories(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>{t('calorie.category')}</label>
            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as Category)} style={inputStyle}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={handleAdd} style={{ ...btnStyle, color: 'var(--color-accent)', borderColor: 'var(--color-accent)' }}>{t('calorie.confirm')}</button>
          <button onClick={() => setShowAdd(false)} style={btnStyle}>{t('calorie.cancel')}</button>
        </div>
      )}

      {grouped.map((group) => (
        <div key={group.category} style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 'var(--font-size-base)',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              borderBottom: '1px solid var(--color-border)',
              paddingBottom: 8,
              marginBottom: 8,
            }}
          >
            {group.category}
          </div>
          {group.items.length === 0 && (
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', padding: '4px 0' }}>
              —
            </div>
          )}
          {group.items.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                borderRadius: 6,
                gap: 12,
              }}
            >
              {editingId === item.id ? (
                <>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                  <input value={editCalories} onChange={(e) => setEditCalories(e.target.value)} style={{ ...inputStyle, width: 80 }} />
                  <button onClick={() => handleSaveEdit(item)} style={{ ...btnStyle, color: 'var(--color-accent)' }}>✓</button>
                  <button onClick={() => setEditingId(null)} style={btnStyle}>✕</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1 }}>{item.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', width: 80, textAlign: 'right' }}>
                    {item.calories} kcal
                  </span>
                  <button onClick={() => handleEdit(item)} style={btnStyle}>✎</button>
                  <button onClick={() => handleDelete(item.id)} style={{ ...btnStyle, color: 'var(--color-danger)' }}>✕</button>
                </>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
