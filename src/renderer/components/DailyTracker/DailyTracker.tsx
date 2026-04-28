import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DailyItem {
  id: number;
  date: string;
  name: string;
  calories: number;
  isEaten: boolean;
  sortOrder: number;
  calorieItemId: number | null;
  createdAt: string;
}

interface CalorieItem {
  id: number;
  name: string;
  calories: string;
  category: string;
}

interface DailyTarget {
  id: number;
  date: string;
  targetCalories: number;
}

function getToday(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function SortableItem({
  item,
  onToggle,
  onDelete,
}: {
  item: DailyItem;
  onToggle: (item: DailyItem) => void;
  onDelete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        background: 'var(--color-surface)',
        borderRadius: 6,
        gap: 12,
        marginBottom: 4,
        opacity: item.isEaten ? 1 : 0.7,
      }}
    >
      <span {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--color-text-secondary)' }}>☰</span>
      <button
        onClick={() => onToggle(item)}
        title={item.isEaten ? 'Mark as planned' : 'Mark as eaten'}
        style={{
          width: 22,
          height: 22,
          borderRadius: 4,
          border: `2px solid ${item.isEaten ? 'var(--color-success)' : 'var(--color-warning)'}`,
          background: item.isEaten ? 'var(--color-success)' : 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          flexShrink: 0,
          transition: 'all 0.15s ease',
        }}
      >
        {item.isEaten && (
          <span style={{ color: '#fff', fontSize: 14, lineHeight: 1, fontWeight: 700 }}>✓</span>
        )}
      </button>
      <span style={{ flex: 1, color: item.isEaten ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
        {!item.isEaten && '+ '}{item.name}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', minWidth: 70, textAlign: 'right' }}>
        {item.calories} kcal
      </span>
      <button onClick={() => onDelete(item.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>✕</button>
    </div>
  );
}

export default function DailyTracker() {
  const { t } = useTranslation();
  const [date] = useState(getToday());
  const [target, setTarget] = useState<DailyTarget | null>(null);
  const [targetInput, setTargetInput] = useState('1800');
  const [items, setItems] = useState<DailyItem[]>([]);
  const [suggestion, setSuggestion] = useState<CalorieItem | null>(null);
  const [libraryItems, setLibraryItems] = useState<CalorieItem[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualCal, setManualCal] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = useCallback(async () => {
    try {
      const [tgt, di, lib, sug] = await Promise.all([
        window.electronAPI.daily.getTarget(date),
        window.electronAPI.daily.getItems(date),
        window.electronAPI.calorie.getAll(),
        window.electronAPI.daily.suggest(date),
      ]);
      setTarget(tgt);
      if (tgt) setTargetInput(String(tgt.targetCalories));
      setItems(di);
      setLibraryItems(lib);
      setSuggestion(sug);
    } catch {
      /* dev fallback */
    }
  }, [date]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tgt, di, lib] = await Promise.all([
          window.electronAPI.daily.getTarget(date),
          window.electronAPI.daily.getItems(date),
          window.electronAPI.calorie.getAll(),
        ]);
        if (cancelled) return;

        if (!tgt) {
          await window.electronAPI.daily.setTarget(date, 1800);
          if (cancelled) return;
          await load();
          return;
        }

        setTarget(tgt);
        setTargetInput(String(tgt.targetCalories));
        setItems(di);
        setLibraryItems(lib);

        const sug = await window.electronAPI.daily.suggest(date);
        if (cancelled) return;
        setSuggestion(sug);
      } catch {
        /* dev fallback */
      }
    })();
    return () => { cancelled = true; };
  }, [date, load]);

  const eatenSum = items.filter((i) => i.isEaten).reduce((s, i) => s + i.calories, 0);
  const uneatenSum = items.filter((i) => !i.isEaten).reduce((s, i) => s + i.calories, 0);
  const totalPlanned = eatenSum + uneatenSum;
  const targetCal = target?.targetCalories ?? 0;
  const freeRemaining = targetCal - totalPlanned;
  const eatenRatio = targetCal > 0 ? eatenSum / targetCal : 0;
  const uneatenRatio = targetCal > 0 ? uneatenSum / targetCal : 0;
  const totalRatio = targetCal > 0 ? totalPlanned / targetCal : 0;
  const barColor = totalRatio > 1 ? 'var(--color-danger)' : eatenRatio >= 0.8 ? 'var(--color-warning)' : 'var(--color-success)';

  const handleSetTarget = async () => {
    const val = parseInt(targetInput, 10);
    if (isNaN(val) || val <= 0) return;
    await window.electronAPI.daily.setTarget(date, val);
    load();
  };

  const handleToggle = async (item: DailyItem) => {
    await window.electronAPI.daily.updateItem({ ...item, isEaten: !item.isEaten });
    load();
  };

  const handleDelete = async (id: number) => {
    await window.electronAPI.daily.deleteItem(id);
    load();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const newItems = arrayMove(items, oldIndex, newIndex);
    setItems(newItems);
    await window.electronAPI.daily.reorder(newItems.map((i) => i.id));
    load();
  };

  const handleAddFromLibrary = async (libItem: CalorieItem) => {
    const cal = libItem.calories.includes('/')
      ? Math.max(...libItem.calories.split('/').map((s) => parseInt(s.trim(), 10)))
      : parseInt(libItem.calories, 10);
    await window.electronAPI.daily.addItem({
      date, name: libItem.name, calories: cal, isEaten: false, sortOrder: 0, calorieItemId: libItem.id,
    });
    setShowLibrary(false);
    load();
  };

  const handleManualAdd = async () => {
    const cal = parseInt(manualCal, 10);
    if (!manualName.trim() || isNaN(cal)) return;
    await window.electronAPI.daily.addItem({
      date, name: manualName.trim(), calories: cal, isEaten: false, sortOrder: 0, calorieItemId: null,
    });
    setManualName('');
    setManualCal('');
    setShowManual(false);
    load();
  };

  const handleAddSuggestion = async () => {
    if (!suggestion) return;
    await handleAddFromLibrary(suggestion);
  };

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 4,
    color: 'var(--color-text-primary)',
    outline: 'none',
  };

  return (
    <div>
      <h1 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 24 }}>
        {t('daily.title')}{' '}
        <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-lg)' }}>{t('daily.subtitle')}</span>
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>{t('daily.date')}: {date}</span>
        <span style={{ color: 'var(--color-text-secondary)' }}>{t('daily.target')}:</span>
        <input
          value={targetInput}
          onChange={(e) => setTargetInput(e.target.value)}
          onBlur={handleSetTarget}
          onKeyDown={(e) => e.key === 'Enter' && handleSetTarget()}
          style={{ ...inputStyle, width: 80, fontFamily: 'var(--font-mono)', textAlign: 'center' }}
        />
        <span style={{ color: 'var(--color-text-secondary)' }}>{t('daily.kcal')}</span>
      </div>

      {targetCal > 0 && (
        <div style={{ marginBottom: 24, padding: 16, background: 'var(--color-surface)', borderRadius: 8 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-lg)', marginBottom: 8, textAlign: 'center' }}>
            <span style={{ color: barColor, fontWeight: 700 }}>{totalPlanned}</span>
            <span style={{ color: 'var(--color-text-secondary)' }}> / {targetCal} {t('daily.kcal')}</span>
          </div>
          <div style={{ background: 'var(--color-border)', borderRadius: 4, height: 8, overflow: 'hidden', display: 'flex' }}>
            <div style={{
              width: `${Math.min(eatenRatio * 100, 100)}%`,
              height: '100%',
              background: barColor,
              transition: 'width 0.3s ease',
              flexShrink: 0,
            }} />
            {uneatenSum > 0 && (
              <div style={{
                width: `${Math.min(uneatenRatio * 100, 100 - Math.min(eatenRatio * 100, 100))}%`,
                height: '100%',
                background: 'var(--color-warning)',
                opacity: 0.5,
                transition: 'width 0.3s ease',
                flexShrink: 0,
              }} />
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: 'var(--color-success)' }}>
              ✅ {t('daily.eaten')}: {eatenSum} {t('daily.kcal')}
            </span>
            <span style={{ color: 'var(--color-warning)' }}>
              📋 {t('daily.planned')}: {totalPlanned} {t('daily.kcal')}
            </span>
            <span style={{ color: freeRemaining > 0 ? 'var(--color-accent)' : 'var(--color-danger)' }}>
              {freeRemaining > 0 ? '💡' : '🚫'} {t('daily.free')}: {freeRemaining} {t('daily.kcal')}
            </span>
          </div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortableItem key={item.id} item={item} onToggle={handleToggle} onDelete={handleDelete} />
          ))}
        </SortableContext>
      </DndContext>

      <div style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 16 }}>
        <button
          onClick={() => { setShowLibrary(!showLibrary); setShowManual(false); }}
          style={{ padding: '8px 16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-accent)', cursor: 'pointer' }}
        >
          {t('daily.addFromLib')}
        </button>
        <button
          onClick={() => { setShowManual(!showManual); setShowLibrary(false); }}
          style={{ padding: '8px 16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-primary)', cursor: 'pointer' }}
        >
          {t('daily.addManual')}
        </button>
      </div>

      {showLibrary && (
        <div style={{ padding: 12, background: 'var(--color-surface)', borderRadius: 8, marginBottom: 16, maxHeight: 240, overflowY: 'auto' }}>
          {['主食', '小食', '酒'].map((cat) => (
            <div key={cat}>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', padding: '4px 0', fontWeight: 600 }}>{cat}</div>
              {libraryItems.filter((i) => i.category === cat).map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAddFromLibrary(item)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px', background: 'transparent', border: 'none', color: 'var(--color-text-primary)', cursor: 'pointer', borderRadius: 4, fontSize: 'var(--font-size-sm)' }}
                >
                  {item.name} — {item.calories} kcal
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {showManual && (
        <div style={{ display: 'flex', gap: 8, padding: 12, background: 'var(--color-surface)', borderRadius: 8, marginBottom: 16, alignItems: 'flex-end' }}>
          <input placeholder={t('daily.namePlaceholder')} value={manualName} onChange={(e) => setManualName(e.target.value)} style={inputStyle} />
          <input placeholder={t('daily.calPlaceholder')} value={manualCal} onChange={(e) => setManualCal(e.target.value)} style={{ ...inputStyle, width: 80 }} />
          <button onClick={handleManualAdd} style={{ padding: '6px 12px', background: 'var(--color-accent)', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer' }}>{t('daily.addBtn')}</button>
        </div>
      )}

      {suggestion && targetCal > 0 && freeRemaining > 0 && (
        <div style={{ padding: 16, background: 'var(--color-surface)', borderRadius: 8, border: '1px solid var(--color-border)', marginTop: 16 }}>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 8 }}>
            {t('daily.remaining', { count: freeRemaining })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>🍽 {suggestion.name}</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>{suggestion.calories} kcal</span>
            <button
              onClick={handleAddSuggestion}
              style={{ marginLeft: 'auto', padding: '6px 12px', background: 'var(--color-accent)', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer' }}
            >
              {t('daily.addToList')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
