import React from 'react';

interface ComingSoonProps {
  title?: string;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({
  title = 'Coming Soon',
}) => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '600px',
        width: '100%',
        background: 'var(--surface-color)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        padding: '80px 40px',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '3.5rem',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: '0 0 16px 0',
          letterSpacing: '-1px'
        }}>
          {title}
        </h1>

        <p style={{
          fontSize: '16px',
          color: 'var(--text-secondary)',
          margin: '0',
          fontWeight: '500'
        }}>
          Coming Soon
        </p>
      </div>
    </div>
  );
};

