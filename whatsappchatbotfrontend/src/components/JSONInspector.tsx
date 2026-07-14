import React from 'react';
import { Terminal, ShieldCheck, X } from 'lucide-react';
import type { MessageLog } from '../types';
import { useTheme } from '../context/ThemeContext';

interface JSONInspectorProps {
  message: MessageLog;
  onClose: () => void;
}

export const JSONInspector: React.FC<JSONInspectorProps> = ({ message, onClose }) => {
  const { isDarkMode } = useTheme();
  return (
    <div
      style={{
        width: '380px',
        borderLeft: '1px solid var(--border-color)',
        background: isDarkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(59, 130, 246, 0.02)',
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(59, 130, 246, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={16} color="var(--primary-color)" />
          <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)' }}>
            Meta JSON Inspector
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            marginBottom: '16px',
          }}
        >
          <div>
            Message UID: <strong style={{ color: 'var(--text-primary)' }}>{message.id}</strong>
          </div>
          {message.wamid && (
            <div>
              Wamid: <strong style={{ color: 'var(--text-primary)' }}>{message.wamid}</strong>
            </div>
          )}
          <div>
            Status:{' '}
            <span
              style={{
                color: message.status === 'failed' ? '#ef4444' : '#10b981',
                fontWeight: 'bold',
              }}
            >
              {message.status}
            </span>
          </div>
          <div>
            Type: <strong style={{ color: 'var(--text-primary)' }}>{message.message_type}</strong>
          </div>
        </div>

        <div
          style={{
            fontSize: '11px',
            color: '#34d399',
            fontWeight: '600',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <ShieldCheck size={13} /> RAW API PAYLOAD & WEBHOOK LOGS:
        </div>

        <pre
          style={{
            margin: 0,
            padding: '12px',
            backgroundColor: isDarkMode ? '#111b21' : '#f0f9ff',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: isDarkMode ? '#34d399' : '#10b981',
            fontFamily: 'var(--font-family)',
            fontSize: '11.5px',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            boxShadow: isDarkMode ? 'inset 0 2px 4px rgba(0,0,0,0.5)' : 'inset 0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          {JSON.stringify(message.data || { info: 'No raw payload details stored for this entry' }, null, 2)}
        </pre>
      </div>
    </div>
  );
};
