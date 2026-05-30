import React from 'react';
import { Sparkles, Trash2 } from 'lucide-react';
import type { ContactInfo } from '../types';

interface ChatHeaderProps {
  activeContact: ContactInfo | null;
  onShowTemplates: () => void;
  onDeleteChat: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ activeContact, onShowTemplates, onDeleteChat }) => {
  if (!activeContact) return null;

  return (
    <div
      style={{
        padding: '10px 20px',
        background: '#202c33',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: '#ffffff',
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
          <div style={{ fontSize: '12px', color: '#8696a0' }}>Online · +{activeContact.wa_id}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={onShowTemplates}
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <Sparkles size={14} color="#e3a008" /> Send Template
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
