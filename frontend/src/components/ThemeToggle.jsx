import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-primary)',
        borderRadius: 8,
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: 16,
        width: 36,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
      }}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
