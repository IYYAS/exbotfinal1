import React from 'react';
import { X, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { FONT_OPTIONS, FONT_FAMILY } from '../font';
import { setAccentColorVariables } from '../utils/color';

interface AppearanceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ACCENT_COLORS = [
  { name: 'Blue', value: '#3b82f6', rgb: 'rgb(59, 130, 246)' },
  { name: 'Purple', value: '#8b5cf6', rgb: 'rgb(139, 92, 246)' },
  { name: 'Pink', value: '#ec4899', rgb: 'rgb(236, 72, 153)' },
  { name: 'Green', value: '#10b981', rgb: 'rgb(16, 185, 129)' },
  { name: 'Orange', value: '#f97316', rgb: 'rgb(249, 115, 22)' },
  { name: 'Red', value: '#ef4444', rgb: 'rgb(239, 68, 68)' },
];

export const AppearanceDrawer: React.FC<AppearanceDrawerProps> = ({ isOpen, onClose }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [fontFamily, setFontFamily] = React.useState(() => {
    return localStorage.getItem('font-family') || FONT_FAMILY;
  });
  const [accentColor, setAccentColor] = React.useState(() => {
    const saved = localStorage.getItem('accent-color');
    return saved || '#3b82f6';
  });

  React.useEffect(() => {
    if (accentColor) {
      localStorage.setItem('accent-color', accentColor);
      setAccentColorVariables(accentColor);
    }
  }, [accentColor]);

  React.useEffect(() => {
    if (fontFamily) {
      localStorage.setItem('font-family', fontFamily);
      document.documentElement.style.setProperty('--font-family', fontFamily);
    }
  }, [fontFamily]);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--overlay-bg)',
            zIndex: 996,
            backdropFilter: 'blur(4px)',
          }}
          onClick={onClose}
        />
      )}

      {/* Drawer - LEFT SIDE */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          width: '380px',
          background: 'var(--surface-color)',
          borderRight: '1px solid var(--border-color)',
          zIndex: 997,
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease-out',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isOpen ? '4px 0 16px rgba(0, 0, 0, 0.15)' : 'none',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            background: 'var(--surface-color)',
            zIndex: 10,
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
            Appearance
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: '6px',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'var(--border-color)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* Theme Section */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Theme
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  if (isDarkMode) toggleTheme();
                }}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: !isDarkMode ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                  background: !isDarkMode ? 'var(--accent-bg-light)' : 'var(--bg-color)',
                  color: !isDarkMode ? 'var(--accent-color)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  if (isDarkMode) {
                    e.currentTarget.style.borderColor = 'var(--text-secondary)';
                  }
                }}
                onMouseOut={(e) => {
                  if (isDarkMode) {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                  }
                }}
              >
                <Sun size={16} />
                Light
              </button>
              <button
                onClick={() => {
                  if (!isDarkMode) toggleTheme();
                }}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: isDarkMode ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                  background: isDarkMode ? 'var(--accent-bg-light)' : 'var(--bg-color)',
                  color: isDarkMode ? 'var(--accent-color)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  if (!isDarkMode) {
                    e.currentTarget.style.borderColor = 'var(--text-secondary)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isDarkMode) {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                  }
                }}
              >
                <Moon size={16} />
                Dark
              </button>
            </div>
          </div>

          {/* Accent Color Section */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Font
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
              {FONT_OPTIONS.map((font) => (
                <button
                  key={font.name}
                  type="button"
                  onClick={() => setFontFamily(font.family)}
                  style={{
                    width: '100%',
                    minHeight: '72px',
                    borderRadius: '14px',
                    border: fontFamily === font.family ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                    background: 'var(--surface-color)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    gap: '6px',
                    padding: '14px',
                    fontFamily: font.family,
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>Aa</div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{font.name}</div>
                </button>
              ))}
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Selected: <strong style={{ color: 'var(--text-primary)' }}>{FONT_OPTIONS.find((option) => option.family === fontFamily)?.name || 'Custom'}</strong>
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Accent Color
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setAccentColor(color.value)}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: '8px',
                    background: color.value,
                    border: accentColor === color.value ? '3px solid var(--text-primary)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: accentColor === color.value ? `0 0 0 2px var(--surface-color), 0 0 0 4px ${color.value}` : 'none',
                    position: 'relative',
                  }}
                  title={color.name}
                  onMouseOver={(e) => {
                    if (accentColor !== color.value) {
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (accentColor !== color.value) {
                      e.currentTarget.style.transform = 'scale(1)';
                    }
                  }}
                >
                  {accentColor === color.value && (
                    <div style={{ fontSize: '20px', color: '#ffffff' }}>✓</div>
                  )}
                </button>
              ))}
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Selected: <strong style={{ color: 'var(--text-primary)' }}>{ACCENT_COLORS.find(c => c.value === accentColor)?.name || 'Custom'}</strong>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
