interface Tool {
  id: number;
  name: string;
  nameEn: string;
}

interface SidebarProps {
  tools: Tool[];
  activeTool: number;
  onToolChange: (id: number) => void;
}

export default function Sidebar({ tools, activeTool, onToolChange }: SidebarProps) {
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
        FitHelper
      </div>
      <nav style={{ flex: 1 }}>
        {tools.map((tool) => {
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
              {tool.name}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
