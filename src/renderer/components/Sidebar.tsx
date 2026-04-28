import { useTranslation } from 'react-i18next';

interface SidebarProps {
  activeTool: number;
  onToolChange: (id: number) => void;
}

const TOOL_KEYS = [
  { id: 1, key: 'sidebar.tool1' },
  { id: 2, key: 'sidebar.tool2' },
  { id: 3, key: 'sidebar.tool3' },
  { id: 4, key: 'sidebar.tool4' },
  { id: 5, key: 'sidebar.tool5' },
];

export default function Sidebar({ activeTool, onToolChange }: SidebarProps) {
  const { t, i18n } = useTranslation();

  const toggleLang = () => {
    const next = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(next);
    localStorage.setItem('fithelper-lang', next);
  };

  return (
    <aside
      style={{
        width: 220,
        flexShrink: 0,
        background: 'var(--color-bg-sidebar)',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      <div
        style={{
          padding: '24px 20px 16px',
          fontSize: 'var(--font-size-xl)',
          fontWeight: 700,
          color: 'var(--color-accent)',
          letterSpacing: '-0.5px',
        }}
      >
        {t('app.title')}
      </div>
      <nav style={{ flex: 1 }}>
        {TOOL_KEYS.map((tool) => {
          const isActive = tool.id === activeTool;
          return (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '12px 20px',
                border: 'none',
                borderLeft: isActive ? '3px solid var(--color-accent)' : '3px solid transparent',
                background: isActive ? 'rgba(83, 201, 177, 0.1)' : 'transparent',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-primary)',
                fontSize: 'var(--font-size-base)',
                transition: 'all 0.15s ease',
                cursor: 'pointer',
              }}
            >
              {t(tool.key)}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border)' }}>
        <button
          onClick={toggleLang}
          style={{
            padding: '6px 14px',
            background: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: 4,
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          {t('sidebar.langToggle')}
        </button>
      </div>
    </aside>
  );
}
