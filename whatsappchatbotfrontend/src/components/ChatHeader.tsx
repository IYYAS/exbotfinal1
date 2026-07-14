import React from 'react';
import { Trash2 } from 'lucide-react';
import type { ContactInfo } from '../types';
import { useTheme } from '../context/ThemeContext';

interface ChatHeaderProps {
  activeContact: ContactInfo | null;
  onDeleteChat: () => void;
  onBlockToggle: () => void;
  isBlocked: boolean;
  isBlocking?: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ activeContact, onDeleteChat, onBlockToggle, isBlocked, isBlocking = false }) => {
  const { isDarkMode } = useTheme();
  if (!activeContact) return null;

  return (
    <div
      style={{
        padding: '10px 20px',
        background: 'var(--surface-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-color)',
        fontFamily: 'var(--font-family)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(59, 130, 246, 0.1)',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
          }}
        >
          {activeContact.first_name[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '15px', color: 'var(--text-primary)' }}>
            {activeContact.first_name} {activeContact.last_name || ''}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Online · +{activeContact.wa_id}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={onBlockToggle}
          disabled={isBlocking}
          style={{
            backgroundColor: isBlocked ? 'rgba(239, 68, 68, 0.16)' : 'rgba(59, 130, 246, 0.12)',
            border: isBlocked ? '1px solid rgba(239, 68, 68, 0.24)' : '1px solid rgba(59, 130, 246, 0.25)',
            color: isBlocked ? '#ef4444' : '#2563eb',
            padding: '8px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600',
            fontFamily: 'var(--font-family)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: isBlocking ? 'not-allowed' : 'pointer',
            opacity: isBlocking ? 0.7 : 1,
            transition: '0.2s',
          }}
          onMouseOver={(e) => {
            if (!isBlocking) {
              e.currentTarget.style.backgroundColor = isBlocked ? 'rgba(239, 68, 68, 0.24)' : 'rgba(59, 130, 246, 0.18)';
            }
          }}
          onMouseOut={(e) => {
            if (!isBlocking) {
              e.currentTarget.style.backgroundColor = isBlocked ? 'rgba(239, 68, 68, 0.16)' : 'rgba(59, 130, 246, 0.12)';
            }
          }}
        >
          <span>{isBlocking ? (isBlocked ? 'Unblocking...' : 'Blocking...') : isBlocked ? 'Unblock' : 'Block'}</span>
        </button>

        <button
          onClick={onDeleteChat}
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#f87171',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '600',
            fontFamily: 'var(--font-family)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            transition: '0.2s',
          }}
          onMouseOver={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(239, 68, 68, 0.2)')}
          onMouseOut={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(239, 68, 68, 0.1)')}
        >
          <Trash2 size={14} /> Delete Chat
        </button>
      </div>
    </div>
  );
};
